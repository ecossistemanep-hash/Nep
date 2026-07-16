/**
 * Relatório diário de uso — envia por e-mail para Coordenador+ (COORDENADOR,
 * GERENTE, SUPERINTENDENTE, DIRETOR, ADMIN) uma tabela com taxa de uso e
 * último acesso de cada usuário ativo.
 *
 * Rodado via GitHub Actions (agendado), não pelo app. Usa a Admin SDK do
 * Firebase (acesso total, ignora as regras de segurança do cliente) e o
 * SMTP do Gmail (conta existente do projeto) para envio de e-mail — sem
 * precisar verificar domínio nem cadastrar serviço externo novo.
 *
 * Variáveis de ambiente esperadas:
 *   FIREBASE_SERVICE_ACCOUNT - JSON da chave de conta de serviço (string)
 *   GMAIL_USER               - conta Gmail remetente (ex: ecossistemanep@gmail.com)
 *   GMAIL_APP_PASSWORD       - senha de app gerada na conta Google (16 caracteres)
 */

import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

const MANAGER_ROLES = ['COORDENADOR', 'GERENTE', 'SUPERINTENDENTE', 'DIRETOR', 'ADMIN'];
const ANALYTICS_WINDOW_DAYS = 30;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[UsageReport] Variável de ambiente ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const serviceAccount = JSON.parse(requireEnv('FIREBASE_SERVICE_ACCOUNT'));
  const gmailUser = requireEnv('GMAIL_USER');
  const gmailAppPassword = requireEnv('GMAIL_APP_PASSWORD');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailAppPassword }
  });

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  console.log('[UsageReport] Carregando usuários...');
  const usersSnap = await db.collection('users').get();
  const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

  console.log('[UsageReport] Carregando eventos de uso dos últimos', ANALYTICS_WINDOW_DAYS, 'dias...');
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - ANALYTICS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const analyticsSnap = await db.collection('user_analytics').where('timestamp', '>', cutoff).get();

  const eventCountByUid = {};
  analyticsSnap.forEach(doc => {
    const uid = doc.data().uid;
    if (!uid) return;
    eventCountByUid[uid] = (eventCountByUid[uid] || 0) + 1;
  });

  const activeUsers = users
    .filter(u => u.status === 'ATIVO')
    .map(u => ({
      nome: u.nome || 'Sem nome',
      cargo: u.cargo || 'N/A',
      ultimoLogin: formatTimestamp(u.ultimo_login),
      eventos30d: eventCountByUid[u.uid] || 0
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const recipients = users.filter(u =>
    u.status === 'ATIVO' &&
    MANAGER_ROLES.includes((u.cargo || '').toUpperCase()) &&
    isValidEmail(u.email)
  );

  if (recipients.length === 0) {
    console.log('[UsageReport] Nenhum destinatário (Coordenador+) encontrado. Encerrando sem enviar.');
    return;
  }

  const html = buildReportHtml(activeUsers);
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  console.log(`[UsageReport] Enviando para ${recipients.length} destinatário(s)...`);
  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    try {
      await transporter.sendMail({
        from: `"NEP Delivery Control" <${gmailUser}>`,
        to: recipient.email,
        subject: `[NEP] Relatório diário de uso — ${today}`,
        html
      });
      console.log(`[UsageReport] Enviado para ${recipient.email}`);
      sent++;
    } catch (err) {
      // Uma falha pontual (ex: e-mail inválido) não pode impedir o envio
      // para os demais destinatários.
      console.error(`[UsageReport] Falha ao enviar para ${recipient.email}:`, err.message);
      failed++;
    }
  }

  console.log(`[UsageReport] Concluído. Enviados: ${sent}. Falhas: ${failed}.`);
  if (sent === 0 && failed > 0) {
    process.exitCode = 1;
  }
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatTimestamp(ts) {
  if (!ts || typeof ts.toDate !== 'function') return 'Nunca';
  return ts.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildReportHtml(activeUsers) {
  const rows = activeUsers.map(u => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(u.nome)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(u.cargo)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(u.ultimoLogin)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${u.eventos30d}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#111827;">
      <h2 style="margin-bottom:4px;">Relatório Diário de Uso — NEP Delivery Control</h2>
      <p style="color:#6b7280;font-size:13px;margin-top:0;">Taxa de uso (eventos nos últimos ${ANALYTICS_WINDOW_DAYS} dias) e último acesso de cada usuário ativo.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f3f4f6;text-align:left;">
            <th style="padding:8px 12px;">Nome</th>
            <th style="padding:8px 12px;">Cargo</th>
            <th style="padding:8px 12px;">Último Acesso</th>
            <th style="padding:8px 12px;text-align:center;">Eventos (${ANALYTICS_WINDOW_DAYS}d)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#9ca3af;font-size:11px;margin-top:16px;">Enviado automaticamente todo dia pelo Ecossistema NEP.</p>
    </div>
  `;
}

main().catch(err => {
  console.error('[UsageReport] Erro fatal:', err);
  process.exit(1);
});
