/**
 * NEP DELIVERY CONTROL — PORTAL CORPORATIVO DE PAINÉIS HTML
 * Módulo nativo (portado do protótipo Atlas para o padrão do sistema).
 *
 * Integrações reutilizadas (nada duplicado):
 * - Identidade: NexusAuthService / localStorage do login existente
 * - Permissões: cargos do sistema + ModulePermissionService
 * - Auditoria: AuditService (audit_logs)
 * - Notificações: NexusNotifications
 * - Design system: css/design-system.css + css/panels-portal.css
 * - Dados: Firestore (compat SDK via window.db) — coleções panels,
 *   panels/{id}/versions, panel_favorites, panel_reports
 *
 * Segurança:
 * - Scanner client-side (bloqueia eval, cookies, keylogger, redirect,
 *   script/iframe/form externos, ofuscação) + validação de ZIP
 * - Autorização REAL nas Firestore rules (aprovador ≠ dono, publicação
 *   restrita a gestão, versões imutáveis após publicação)
 * - Execução isolada: iframe sandbox="allow-scripts" via srcdoc
 *   (origem opaca — sem acesso a cookies/sessão do NEP) + CSP injetada
 */

const NexusPanels = {
  // ============ ESTADO ============
  view: 'catalogo',           // catalogo | meus | publicar | aprovacoes | governanca | detalhe
  detailPanelId: null,
  detailTab: 'visao',
  deepLink: null,             // slug vindo de link permanente #paineis/{slug}
  panels: [],
  favorites: new Set(),
  container: null,
  _wizard: null,              // estado do wizard de publicação

  CATEGORIES: ['Qualidade', 'Operações', 'Monitoria', 'Estratégia', 'Experiência', 'Inteligência'],
  MAX_CONTENT: 900 * 1024,

  STATUS_LABELS: {
    RASCUNHO: 'Rascunho', EM_ANALISE: 'Em análise', AJUSTES: 'Ajustes solicitados',
    APROVADA: 'Aprovada', PUBLICADO: 'Publicado', PUBLICADA: 'Publicada',
    REPROVADO: 'Reprovado', REPROVADA: 'Reprovada', SUSPENSO: 'Suspenso',
    ARQUIVADO: 'Arquivado', ARQUIVADA: 'Arquivada', PENDENTE: 'Pendente'
  },

  APPROVAL_TYPES: [
    { key: 'tecnica', label: 'Análise técnica', icon: 'fa-gears' },
    { key: 'visual', label: 'Análise visual', icon: 'fa-palette' },
    { key: 'seguranca', label: 'Análise de segurança', icon: 'fa-shield-halved' }
  ],

  // ============ IDENTIDADE (reutiliza o login existente) ============
  me() {
    return {
      uid: localStorage.getItem('nep_user_uid') || '',
      nome: localStorage.getItem('nep_user_name') || 'Usuário',
      email: localStorage.getItem('nep_user_email') || '',
      cargo: (localStorage.getItem('nep_user_role_key') || 'monitor').toUpperCase(),
      isAdmin: localStorage.getItem('nep_is_admin') === 'true'
    };
  },

  roleLevel(cargo) {
    const levels = { ADMIN: 99, DIRETOR: 95, SUPERINTENDENTE: 5, GERENTE: 4, CONSULTOR: 3, COORDENADOR: 2, ANALISTA: 1, MONITOR: 0 };
    return levels[cargo] ?? 0;
  },

  // Permissões (a garantia real está nas Firestore rules)
  canCreate() { return true; },                                     // todo usuário ativo publica p/ análise
  canApprove() { const m = this.me(); return m.isAdmin || this.roleLevel(m.cargo) >= 2; },   // COORDENADOR+
  canManage() { const m = this.me(); return m.isAdmin || this.roleLevel(m.cargo) >= 4; },    // GERENTE+/DIRETOR/ADMIN

  esc(v) {
    if (window.escapeHtml) return window.escapeHtml(v);
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  toast(msg, type = 'success') {
    if (window.NepApp?.showToast) window.NepApp.showToast(msg, type);
    else alert(msg);
  },

  // ============ SCANNER DE SEGURANÇA (portado do Atlas) ============
  FORBIDDEN: [
    { name: 'Uso de eval', re: /\beval\s*\(/i, critical: true },
    { name: 'Uso de new Function', re: /new\s+Function\s*\(/i, critical: true },
    { name: 'Acesso a cookies', re: /document\.cookie/i, critical: true },
    { name: 'Captura de teclado global', re: /addEventListener\s*\(\s*["']key(?:down|up|press)/i, critical: true },
    { name: 'Redirecionamento automático', re: /(?:location\.(?:replace|assign)|window\.location\s*=|top\.location)/i, critical: true },
    { name: 'Iframe externo', re: /<iframe[^>]+src\s*=\s*["']https?:/i, critical: true },
    { name: 'Formulário externo', re: /<form[^>]+action\s*=\s*["']https?:/i, critical: true },
    { name: 'Script externo não autorizado', re: /<script[^>]+src\s*=\s*["']https?:\/\/(?!cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com)/i, critical: true },
    { name: 'Conteúdo ofuscado', re: /(?:atob\s*\(|fromCharCode\s*\()[\s\S]{120,}/i, critical: true },
    { name: 'Janela automática (pop-up)', re: /window\.open\s*\(/i, critical: false },
    { name: 'Armazenamento do navegador', re: /(?:localStorage|sessionStorage)/i, critical: false },
    { name: 'Requisições de rede (fetch/XHR)', re: /(?:\bfetch\s*\(|XMLHttpRequest)/i, critical: false }
  ],

  scanHtml(html) {
    const findings = [], warnings = [];
    for (const rule of this.FORBIDDEN) {
      if (rule.re.test(html)) (rule.critical ? findings : warnings).push(rule.name);
    }
    const score = Math.max(0, 100 - findings.length * 25 - warnings.length * 8);
    return { findings, warnings, score };
  },

  // CSP injetada na publicação — defesa em profundidade dentro do sandbox
  injectCsp(html) {
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; font-src data: https://cdnjs.cloudflare.com; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'">`;
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => `${m}\n${csp}`);
    return `${csp}\n${html}`;
  },

  /**
   * Valida e prepara o arquivo enviado (HTML autocontido ou ZIP).
   * ZIP: descompactado NO NAVEGADOR (fflate via CDN) e ativos locais
   * embutidos no HTML (CSS→<style>, JS→<script>, imagens/fontes→data URI),
   * resultando em um único HTML autocontido ≤ 900KB (limite do doc Firestore).
   */
  async processFile(file) {
    const MAX_UPLOAD = 25 * 1024 * 1024;
    if (!file || file.size < 1 || file.size > MAX_UPLOAD) throw new Error('O arquivo deve ter entre 1 byte e 25 MB.');
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.html') && !lower.endsWith('.htm') && !lower.endsWith('.zip')) {
      throw new Error('Envie um arquivo HTML ou ZIP.');
    }

    let html;
    if (lower.endsWith('.zip')) {
      const { unzipSync } = await import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js');
      const bytes = new Uint8Array(await file.arrayBuffer());
      let files;
      try { files = unzipSync(bytes); } catch { throw new Error('ZIP inválido ou corrompido.'); }

      const names = Object.keys(files).filter(n => !n.endsWith('/'));
      if (!names.length || names.length > 300) throw new Error('O pacote deve conter de 1 a 300 arquivos.');
      if (names.some(n => n.startsWith('/') || n.includes('../') || n.includes('..\\') || n.includes('\0'))) {
        throw new Error('O pacote contém um caminho de arquivo inseguro (path traversal).');
      }
      const total = names.reduce((s, n) => s + files[n].byteLength, 0);
      if (total > 100 * 1024 * 1024) throw new Error('O pacote descompactado excede 100 MB (proteção anti ZIP-bomb).');
      const badExt = names.find(n => /\.(exe|dll|bat|cmd|sh|ps1|msi|scr|jar|php|py)$/i.test(n));
      if (badExt) throw new Error(`Arquivo executável não permitido no pacote: ${badExt}`);

      const mainFile = names.find(n => n.toLowerCase() === 'index.html')
        || names.find(n => n.toLowerCase().endsWith('/index.html'))
        || names.find(n => /\.html?$/i.test(n));
      if (!mainFile) throw new Error('Nenhum index.html foi encontrado no pacote.');

      html = this._inlineAssets(files, mainFile);
    } else {
      html = new TextDecoder().decode(new Uint8Array(await file.arrayBuffer()));
    }

    if (!/<html|<!doctype/i.test(html)) throw new Error('O arquivo principal não possui uma estrutura HTML válida.');

    const report = this.scanHtml(html);
    if (report.findings.length) {
      throw new Error(`Bloqueado pela análise de segurança: ${report.findings.join(', ')}.`);
    }
    if (html.length > this.MAX_CONTENT) {
      throw new Error(`Após preparar o pacote, o painel ficou com ${(html.length / 1024).toFixed(0)} KB — o limite é 900 KB. Otimize imagens ou divida o conteúdo.`);
    }

    return { html, report, originalName: file.name, size: file.size };
  },

  _inlineAssets(files, mainFile) {
    const dir = mainFile.includes('/') ? mainFile.slice(0, mainFile.lastIndexOf('/') + 1) : '';
    const dec = new TextDecoder();
    let html = dec.decode(files[mainFile]);

    const resolve = (ref) => {
      const clean = ref.replace(/^\.\//, '').split('?')[0].split('#')[0];
      return files[dir + clean] ? dir + clean : (files[clean] ? clean : null);
    };
    const mime = (p) => ({
      css: 'text/css', js: 'text/javascript', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon',
      woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', json: 'application/json',
      mp3: 'audio/mpeg', mp4: 'video/mp4'
    })[p.split('.').pop().toLowerCase()] || 'application/octet-stream';
    const toDataUri = (path) => {
      const data = files[path];
      let bin = '';
      for (let i = 0; i < data.length; i += 0x8000) bin += String.fromCharCode.apply(null, data.subarray(i, i + 0x8000));
      return `data:${mime(path)};base64,${btoa(bin)}`;
    };

    // <link rel="stylesheet" href="local.css"> → <style>
    html = html.replace(/<link[^>]+href\s*=\s*["']([^"']+)["'][^>]*>/gi, (tag, href) => {
      if (/^https?:|^\/\//i.test(href) || !/stylesheet/i.test(tag)) return tag;
      const path = resolve(href);
      return path ? `<style>\n${dec.decode(files[path])}\n</style>` : tag;
    });
    // <script src="local.js"> → <script inline>
    html = html.replace(/<script([^>]*)src\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (tag, pre, src, post) => {
      if (/^https?:|^\/\//i.test(src)) return tag;
      const path = resolve(src);
      return path ? `<script${pre}${post}>\n${dec.decode(files[path])}\n</script>` : tag;
    });
    // src/href de imagens, fontes e mídia locais → data URI
    html = html.replace(/(src|href)\s*=\s*["']([^"']+)["']/gi, (tag, attr, ref) => {
      if (/^(https?:|\/\/|data:|#|mailto:|javascript:)/i.test(ref)) return tag;
      const path = resolve(ref);
      if (!path || /\.(html?|css|js)$/i.test(path)) return tag;
      return `${attr}="${toDataUri(path)}"`;
    });
    // url(...) dentro de CSS inline
    html = html.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (tag, ref) => {
      if (/^(https?:|\/\/|data:|#)/i.test(ref)) return tag;
      const path = resolve(ref);
      return path ? `url("${toDataUri(path)}")` : tag;
    });

    return html;
  },

  // ============ SERVIÇO (Firestore) ============
  slugify(value) {
    return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'painel';
  },

  async uniqueSlug(name) {
    const base = this.slugify(name);
    const snap = await window.db.collection('panels').where('slug', '==', base).limit(1).get();
    return snap.empty ? base : `${base}-${Date.now().toString(36).slice(-4)}`;
  },

  async loadPanels() {
    const snap = await window.db.collection('panels').orderBy('updatedAt', 'desc').limit(200).get();
    this.panels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async loadFavorites() {
    const me = this.me();
    if (!me.uid) return;
    const snap = await window.db.collection('panel_favorites').where('uid', '==', me.uid).get();
    this.favorites = new Set(snap.docs.map(d => d.data().panelId));
  },

  _emptyApprovals() {
    const a = {};
    this.APPROVAL_TYPES.forEach(t => { a[t.key] = { status: 'PENDENTE', approverUid: '', approverNome: '', parecer: '', decidedAt: null }; });
    return a;
  },

  async createPanel(meta, pack) {
    const me = this.me();
    const slug = await this.uniqueSlug(meta.name);
    const now = firebase.firestore.FieldValue.serverTimestamp();

    const panelRef = await window.db.collection('panels').add({
      name: meta.name, slug,
      shortDescription: meta.shortDescription, description: meta.description || '',
      category: meta.category, area: meta.area, audience: meta.audience || 'Corporativo',
      keywords: meta.keywords || [], frequency: meta.frequency || 'MENSAL',
      dataDate: meta.dataDate || '', accessLevel: meta.accessLevel || 'PUBLICO_INTERNO',
      ownerUid: me.uid, ownerNome: me.nome, ownerEmail: me.email,
      status: 'EM_ANALISE', publishedVersionId: '', publishedVersionNumber: '',
      views: 0, createdAt: now, updatedAt: now, publishedAt: null
    });

    await panelRef.collection('versions').add({
      versionNumber: '1.0', content: pack.html,
      originalName: pack.originalName, fileSize: pack.size,
      changeSummary: meta.changeSummary || 'Versão inicial',
      reviewNotes: meta.reviewNotes || '',
      submittedByUid: me.uid, submittedByNome: me.nome,
      status: 'EM_ANALISE', scanScore: pack.report.score, scanWarnings: pack.report.warnings,
      approvals: this._emptyApprovals(),
      submittedAt: now, publishedAt: null
    });

    window.AuditService?.log('PAINEL_ENVIADO', panelRef.id, `Painel "${meta.name}" v1.0 enviado para análise`);
    return panelRef.id;
  },

  async submitNewVersion(panel, pack, changeSummary) {
    const me = this.me();
    const versions = await this.loadVersions(panel.id);
    const lastNum = versions.reduce((m, v) => Math.max(m, parseFloat(v.versionNumber) || 1), 1);
    const versionNumber = (Math.floor(lastNum) + 0.1 * Math.round((lastNum % 1) * 10 + 1)).toFixed(1);

    await window.db.collection('panels').doc(panel.id).collection('versions').add({
      versionNumber, content: pack.html,
      originalName: pack.originalName, fileSize: pack.size,
      changeSummary: changeSummary || 'Nova versão', reviewNotes: '',
      submittedByUid: me.uid, submittedByNome: me.nome,
      status: 'EM_ANALISE', scanScore: pack.report.score, scanWarnings: pack.report.warnings,
      approvals: this._emptyApprovals(),
      submittedAt: firebase.firestore.FieldValue.serverTimestamp(), publishedAt: null
    });
    // A versão publicada permanece ativa; painel sinaliza análise em curso
    await window.db.collection('panels').doc(panel.id).update({
      status: panel.publishedVersionId ? 'PUBLICADO' : 'EM_ANALISE',
      hasPendingVersion: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    window.AuditService?.log('PAINEL_NOVA_VERSAO', panel.id, `"${panel.name}" v${versionNumber} enviada (link permanece /${panel.slug})`);
  },

  async loadVersions(panelId) {
    const snap = await window.db.collection('panels').doc(panelId).collection('versions')
      .orderBy('submittedAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  /**
   * Registra parecer de uma das três análises. Quando as três aprovarem,
   * publica automaticamente (máquina de estados centralizada aqui;
   * as rules garantem quem PODE escrever).
   */
  async decide(panel, version, type, decision, parecer) {
    const me = this.me();
    if (!this.canApprove()) throw new Error('Seu cargo não permite registrar pareceres.');
    if (panel.ownerUid === me.uid && !me.isAdmin) throw new Error('O proprietário não pode aprovar o próprio painel.');

    const approvals = { ...version.approvals };
    approvals[type] = {
      status: decision, approverUid: me.uid, approverNome: me.nome,
      parecer: parecer || '', decidedAt: new Date().toISOString()
    };

    const versionRef = window.db.collection('panels').doc(panel.id).collection('versions').doc(version.id);
    const allApproved = this.APPROVAL_TYPES.every(t => approvals[t.key].status === 'APROVADA');
    const anyRejected = Object.values(approvals).some(a => a.status === 'REPROVADA');
    const anyChanges = Object.values(approvals).some(a => a.status === 'AJUSTES');

    let newVersionStatus = 'EM_ANALISE';
    if (anyRejected) newVersionStatus = 'REPROVADA';
    else if (anyChanges) newVersionStatus = 'AJUSTES';
    else if (allApproved) newVersionStatus = 'PUBLICADA';

    const updates = { approvals, status: newVersionStatus };
    if (allApproved) {
      updates.content = this.injectCsp(version.content);
      updates.publishedAt = firebase.firestore.FieldValue.serverTimestamp();
    }
    await versionRef.update(updates);

    if (allApproved) {
      // Publica: arquiva a versão publicada anterior e troca o ponteiro (link não muda)
      if (panel.publishedVersionId && panel.publishedVersionId !== version.id) {
        await window.db.collection('panels').doc(panel.id).collection('versions')
          .doc(panel.publishedVersionId).update({ status: 'ARQUIVADA' }).catch(() => { });
      }
      await window.db.collection('panels').doc(panel.id).update({
        status: 'PUBLICADO', publishedVersionId: version.id,
        publishedVersionNumber: version.versionNumber, hasPendingVersion: false,
        publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      window.AuditService?.log('PAINEL_PUBLICADO', panel.id, `"${panel.name}" v${version.versionNumber} publicado após 3 aprovações`);
      window.NexusNotifications?.add({
        tipo: 'sistema', titulo: '🛰️ Painel publicado!',
        mensagem: `Seu painel "${panel.name}" v${version.versionNumber} foi aprovado e está no catálogo.`,
        destinatario_uid: panel.ownerUid, referencia_tipo: 'paineis', referencia_id: panel.id
      }).catch(() => { });
    } else {
      const panelStatus = anyRejected ? (panel.publishedVersionId ? 'PUBLICADO' : 'REPROVADO')
        : anyChanges ? (panel.publishedVersionId ? 'PUBLICADO' : 'AJUSTES') : panel.status;
      await window.db.collection('panels').doc(panel.id).update({
        status: panelStatus, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      if (anyRejected || anyChanges) {
        window.NexusNotifications?.add({
          tipo: 'validacao',
          titulo: anyRejected ? '❌ Painel reprovado' : '✏️ Ajustes solicitados',
          mensagem: `${me.nome} registrou parecer na ${this.APPROVAL_TYPES.find(t => t.key === type).label} de "${panel.name}": ${parecer || 'sem observações'}`,
          destinatario_uid: panel.ownerUid, referencia_tipo: 'paineis', referencia_id: panel.id
        }).catch(() => { });
      }
    }

    window.AuditService?.log('PAINEL_PARECER', panel.id,
      `${this.APPROVAL_TYPES.find(t => t.key === type).label} de "${panel.name}" v${version.versionNumber}: ${decision}${parecer ? ` — ${parecer}` : ''}`);
  },

  async setPanelStatus(panel, status, motivo) {
    if (!this.canManage()) throw new Error('Apenas gestão/governança pode executar esta ação.');
    await window.db.collection('panels').doc(panel.id).update({
      status, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    window.AuditService?.log(`PAINEL_${status}`, panel.id, `"${panel.name}" → ${status}${motivo ? ` (${motivo})` : ''}`);
    window.NexusNotifications?.add({
      tipo: 'sistema', titulo: `Painel ${this.STATUS_LABELS[status]?.toLowerCase() || status}`,
      mensagem: `"${panel.name}" foi ${this.STATUS_LABELS[status]?.toLowerCase()} pela governança.${motivo ? ` Motivo: ${motivo}` : ''}`,
      destinatario_uid: panel.ownerUid, referencia_tipo: 'paineis', referencia_id: panel.id
    }).catch(() => { });
  },

  async rollback(panel, version) {
    if (!this.canManage()) throw new Error('Rollback é restrito à gestão/governança.');
    const batchUpdates = [];
    if (panel.publishedVersionId) {
      batchUpdates.push(window.db.collection('panels').doc(panel.id).collection('versions')
        .doc(panel.publishedVersionId).update({ status: 'ARQUIVADA' }));
    }
    batchUpdates.push(window.db.collection('panels').doc(panel.id).collection('versions')
      .doc(version.id).update({ status: 'PUBLICADA' }));
    batchUpdates.push(window.db.collection('panels').doc(panel.id).update({
      publishedVersionId: version.id, publishedVersionNumber: version.versionNumber,
      status: 'PUBLICADO', updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }));
    await Promise.all(batchUpdates);
    window.AuditService?.log('PAINEL_ROLLBACK', panel.id, `"${panel.name}" restaurado para v${version.versionNumber}`);
  },

  async toggleFavorite(panelId) {
    const me = this.me();
    const favId = `${me.uid}_${panelId}`;
    const ref = window.db.collection('panel_favorites').doc(favId);
    if (this.favorites.has(panelId)) {
      await ref.delete();
      this.favorites.delete(panelId);
      this.toast('Removido dos favoritos');
    } else {
      await ref.set({ uid: me.uid, panelId, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      this.favorites.add(panelId);
      this.toast('Adicionado aos favoritos ⭐');
    }
  },

  async reportProblem(panel, tipo, descricao) {
    const me = this.me();
    await window.db.collection('panel_reports').add({
      panelId: panel.id, panelName: panel.name, uid: me.uid, nome: me.nome,
      tipo, descricao, status: 'ABERTO',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    window.AuditService?.log('PAINEL_PROBLEMA', panel.id, `Problema reportado em "${panel.name}": ${tipo}`);
    window.NexusNotifications?.add({
      tipo: 'sistema', titulo: '⚠️ Problema reportado',
      mensagem: `${me.nome} reportou um problema em "${panel.name}": ${descricao.slice(0, 120)}`,
      destinatario_uid: panel.ownerUid, referencia_tipo: 'paineis', referencia_id: panel.id
    }).catch(() => { });
  },

  // ============ VISUALIZAÇÃO ISOLADA ============
  async openViewer(panel) {
    if (!panel.publishedVersionId) { this.toast('Este painel ainda não possui versão publicada.', 'warning'); return; }
    const doc = await window.db.collection('panels').doc(panel.id)
      .collection('versions').doc(panel.publishedVersionId).get();
    if (!doc.exists) { this.toast('Versão publicada não encontrada.', 'error'); return; }
    const version = doc.data();

    // Contador de acessos (rules permitem só o incremento deste campo)
    window.db.collection('panels').doc(panel.id)
      .update({ views: firebase.firestore.FieldValue.increment(1) }).catch(() => { });
    window.AuditService?.log('PAINEL_ACESSO', panel.id, `"${panel.name}" v${panel.publishedVersionNumber} aberto`);

    document.getElementById('pnl-viewer')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'pnl-viewer';
    overlay.className = 'pnl-viewer-overlay';
    overlay.innerHTML = `
      <div class="pnl-viewer-bar">
        <div>
          <i class="fa-solid fa-satellite-dish"></i>
          <b>${this.esc(panel.name)}</b>
          <span class="pnl-chip">v${this.esc(panel.publishedVersionNumber)}</span>
          <span class="pnl-chip safe"><i class="fa-solid fa-shield-halved"></i> Sandbox isolado</span>
        </div>
        <div>
          <button class="btn btn-secondary btn-sm" id="pnl-viewer-copy"><i class="fa-solid fa-copy"></i> Copiar link</button>
          <button class="btn btn-secondary btn-sm" id="pnl-viewer-close"><i class="fa-solid fa-xmark"></i> Fechar</button>
        </div>
      </div>
      <iframe class="pnl-viewer-frame" sandbox="allow-scripts" title="${this.esc(panel.name)}"></iframe>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.pnl-viewer-frame').srcdoc = version.content;
    overlay.querySelector('#pnl-viewer-close').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#pnl-viewer-copy').addEventListener('click', () => this.copyLink(panel));
  },

  copyLink(panel) {
    const url = `${location.origin}${location.pathname}#paineis/${panel.slug}`;
    navigator.clipboard?.writeText(url).then(() => this.toast('Link permanente copiado 🔗'));
  },

  // ============ RENDER PRINCIPAL ============
  async render(container) {
    this.container = container;
    container.innerHTML = `
      <div class="pnl-loading"><i class="fa-solid fa-satellite fa-beat"></i><span>Abrindo o portal de painéis...</span></div>`;

    try {
      await Promise.all([this.loadPanels(), this.loadFavorites()]);
    } catch (e) {
      console.error('[Paineis] Erro ao carregar:', e);
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📡</div>
        <div class="empty-state-title">Não foi possível carregar o portal</div>
        <div class="empty-state-description">${this.esc(e.message)}</div></div>`;
      return;
    }

    // Link permanente (#paineis/slug)
    if (this.deepLink) {
      const target = this.panels.find(p => p.slug === this.deepLink);
      this.deepLink = null;
      if (target) { this.view = 'detalhe'; this.detailPanelId = target.id; }
    }

    this.renderView();
  },

  renderView() {
    const tabs = [
      { key: 'catalogo', label: 'Catálogo', icon: 'fa-table-cells-large' },
      { key: 'meus', label: 'Meus painéis', icon: 'fa-folder-open' },
      { key: 'publicar', label: 'Publicar novo', icon: 'fa-cloud-arrow-up' },
      ...(this.canApprove() ? [{ key: 'aprovacoes', label: 'Fila de aprovação', icon: 'fa-clipboard-check' }] : []),
      ...(this.canManage() ? [{ key: 'governanca', label: 'Governança', icon: 'fa-gauge-high' }] : [])
    ];

    this.container.innerHTML = `
      <div class="pnl-page animate-fade-in">
        <div class="pnl-header">
          <div>
            <span class="pnl-kicker"><i class="fa-solid fa-satellite-dish"></i> PORTAL CORPORATIVO</span>
            <h1>Painéis <em>HTML</em></h1>
            <p>Publique, aprove e compartilhe painéis com governança em cada versão.</p>
          </div>
          <div class="pnl-header-stats">
            <div><b>${this.panels.filter(p => p.status === 'PUBLICADO').length}</b><span>publicados</span></div>
            <div><b>${this.panels.filter(p => p.status === 'EM_ANALISE' || p.hasPendingVersion).length}</b><span>em análise</span></div>
            <div><b>${this.panels.reduce((s, p) => s + (p.views || 0), 0).toLocaleString('pt-BR')}</b><span>acessos</span></div>
          </div>
        </div>
        <div class="pnl-tabs">
          ${tabs.map(t => `<button class="pnl-tab ${this.view === t.key || (this.view === 'detalhe' && t.key === 'catalogo') ? 'active' : ''}" data-view="${t.key}">
            <i class="fa-solid ${t.icon}"></i> ${t.label}</button>`).join('')}
        </div>
        <div class="pnl-content" id="pnl-content"></div>
      </div>`;

    this.container.querySelectorAll('.pnl-tab').forEach(tab => {
      tab.addEventListener('click', () => { this.view = tab.dataset.view; this.renderView(); });
    });

    const content = document.getElementById('pnl-content');
    switch (this.view) {
      case 'catalogo': this.renderCatalog(content); break;
      case 'meus': this.renderMyPanels(content); break;
      case 'publicar': this.renderPublish(content); break;
      case 'aprovacoes': this.renderApprovalQueue(content); break;
      case 'governanca': this.renderGovernance(content); break;
      case 'detalhe': this.renderDetail(content); break;
      default: this.renderCatalog(content);
    }
  },

  // ============ CATÁLOGO ============
  renderCatalog(el, filters = {}) {
    const query = (filters.query || '').toLowerCase();
    const category = filters.category || 'Todos';
    const onlyFav = filters.onlyFav || false;

    const visible = this.panels.filter(p =>
      p.status === 'PUBLICADO'
      && (!onlyFav || this.favorites.has(p.id))
      && (category === 'Todos' || p.category === category)
      && `${p.name} ${p.shortDescription} ${p.area} ${(p.keywords || []).join(' ')}`.toLowerCase().includes(query)
    );

    el.innerHTML = `
      <div class="pnl-tools">
        <div class="pnl-search"><i class="fa-solid fa-magnifying-glass"></i>
          <input id="pnl-search" placeholder="Busque por nome, área, categoria ou palavra-chave..." value="${this.esc(filters.query || '')}"></div>
        <label class="pnl-fav-toggle"><input type="checkbox" id="pnl-only-fav" ${onlyFav ? 'checked' : ''}> <i class="fa-solid fa-heart"></i> Favoritos</label>
      </div>
      <div class="pnl-chips">
        ${['Todos', ...this.CATEGORIES].map(c => `<button class="pnl-chip-btn ${category === c ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('')}
      </div>
      ${visible.length ? `<div class="pnl-grid">${visible.map(p => this.cardHtml(p)).join('')}</div>`
        : `<div class="empty-state"><div class="empty-state-icon">🛰️</div>
           <div class="empty-state-title">${onlyFav ? 'Nenhum favorito ainda' : 'Nenhum painel publicado'}</div>
           <div class="empty-state-description">${onlyFav ? 'Favorite painéis do catálogo para vê-los aqui.' : 'Seja o primeiro: publique um painel e ele aparecerá aqui após a governança aprovar.'}</div></div>`}`;

    el.querySelector('#pnl-search').addEventListener('input', (e) =>
      this.renderCatalog(el, { ...filters, query: e.target.value }));
    el.querySelector('#pnl-only-fav').addEventListener('change', (e) =>
      this.renderCatalog(el, { ...filters, onlyFav: e.target.checked }));
    el.querySelectorAll('.pnl-chip-btn').forEach(b =>
      b.addEventListener('click', () => this.renderCatalog(el, { ...filters, category: b.dataset.cat })));
    this.attachCardEvents(el);
  },

  cardHtml(p) {
    const fav = this.favorites.has(p.id);
    const accents = ['violet', 'cyan', 'magenta', 'amber', 'green'];
    const accent = accents[(p.name || '').length % accents.length];
    return `
      <article class="pnl-card accent-${accent}" data-id="${p.id}">
        <div class="pnl-card-visual">
          <i class="fa-solid fa-chart-column"></i>
          <button class="pnl-heart ${fav ? 'on' : ''}" data-fav="${p.id}" title="Favoritar">
            <i class="fa-${fav ? 'solid' : 'regular'} fa-heart"></i></button>
        </div>
        <div class="pnl-card-body">
          <div class="pnl-card-meta"><span>${this.esc(p.category)}</span><b>v${this.esc(p.publishedVersionNumber || '—')}</b></div>
          <h3>${this.esc(p.name)}</h3>
          <p>${this.esc(p.shortDescription)}</p>
          <div class="pnl-owner"><span class="pnl-mini-avatar">${this.esc((p.ownerNome || '?').split(' ').map(x => x[0]).slice(0, 2).join(''))}</span>
            <div><b>${this.esc(p.area)}</b><small>${this.esc(p.ownerNome)}</small></div></div>
        </div>
        <div class="pnl-card-footer">
          <span><i class="fa-solid fa-eye"></i> ${(p.views || 0).toLocaleString('pt-BR')}</span>
          <button class="pnl-icon-btn" data-copy="${p.id}" title="Copiar link permanente"><i class="fa-solid fa-copy"></i></button>
          <button class="pnl-open" data-open="${p.id}">Abrir <i class="fa-solid fa-arrow-right"></i></button>
        </div>
      </article>`;
  },

  attachCardEvents(el) {
    el.querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.toggleFavorite(b.dataset.fav);
      this.renderView();
    }));
    el.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = this.panels.find(x => x.id === b.dataset.copy);
      if (p) this.copyLink(p);
    }));
    el.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      this.view = 'detalhe'; this.detailPanelId = b.dataset.open; this.detailTab = 'visao';
      this.renderView();
    }));
  },

  // ============ MEUS PAINÉIS ============
  renderMyPanels(el) {
    const me = this.me();
    const mine = this.panels.filter(p => p.ownerUid === me.uid);
    el.innerHTML = mine.length ? `
      <div class="table-container"><table class="table">
        <thead><tr><th>Painel</th><th>Status</th><th>Versão publicada</th><th>Acessos</th><th></th></tr></thead>
        <tbody>${mine.map(p => `
          <tr>
            <td><b>${this.esc(p.name)}</b><br><small class="text-secondary">${this.esc(p.category)} · ${this.esc(p.area)}</small></td>
            <td>${this.statusBadge(p.status)}${p.hasPendingVersion ? ' <span class="pnl-chip">nova versão em análise</span>' : ''}</td>
            <td><code>${p.publishedVersionNumber ? 'v' + this.esc(p.publishedVersionNumber) : '—'}</code></td>
            <td>${(p.views || 0).toLocaleString('pt-BR')}</td>
            <td><button class="btn btn-secondary btn-sm" data-open="${p.id}">Gerenciar <i class="fa-solid fa-chevron-right"></i></button></td>
          </tr>`).join('')}</tbody>
      </table></div>`
      : `<div class="empty-state"><div class="empty-state-icon">📂</div>
         <div class="empty-state-title">Você ainda não publicou painéis</div>
         <div class="empty-state-description">Use a aba "Publicar novo" para enviar seu primeiro painel HTML.</div></div>`;
    this.attachCardEvents(el);
  },

  statusBadge(status) {
    const tones = {
      PUBLICADO: 'success', PUBLICADA: 'success', APROVADA: 'success',
      EM_ANALISE: 'warning', AJUSTES: 'warning', PENDENTE: 'neutral',
      REPROVADO: 'error', REPROVADA: 'error', SUSPENSO: 'error',
      ARQUIVADO: 'neutral', ARQUIVADA: 'neutral', RASCUNHO: 'neutral'
    };
    return `<span class="badge badge-${tones[status] || 'neutral'}">${this.STATUS_LABELS[status] || status}</span>`;
  },

  // ============ PUBLICAR (WIZARD 3 ETAPAS) ============
  renderPublish(el) {
    if (!this._wizard) this._wizard = { step: 1, meta: {}, pack: null, targetPanel: null };
    const w = this._wizard;
    const steps = [[1, 'Informações'], [2, 'Arquivo e prévia'], [3, 'Revisão e envio']];

    el.innerHTML = `
      <div class="pnl-wizard-steps">
        ${steps.map(([n, l]) => `<div class="${w.step === n ? 'active' : w.step > n ? 'done' : ''}"><span>${w.step > n ? '<i class="fa-solid fa-check"></i>' : n}</span><b>${l}</b></div>`).join('<i class="pnl-step-line"></i>')}
      </div>
      <div class="card pnl-wizard-card"><div class="card-body" id="pnl-wizard-body"></div>
        <div class="card-footer pnl-wizard-footer">
          <button class="btn btn-ghost" id="pnl-wz-back"><i class="fa-solid fa-arrow-left"></i> ${w.step === 1 ? 'Cancelar' : 'Voltar'}</button>
          <button class="btn btn-primary" id="pnl-wz-next">${w.step === 3 ? '<i class="fa-solid fa-shield-halved"></i> Enviar para análise' : 'Continuar <i class="fa-solid fa-arrow-right"></i>'}</button>
        </div>
      </div>`;

    const body = el.querySelector('#pnl-wizard-body');
    if (w.step === 1) this.renderWizardStep1(body);
    if (w.step === 2) this.renderWizardStep2(body);
    if (w.step === 3) this.renderWizardStep3(body);

    el.querySelector('#pnl-wz-back').addEventListener('click', () => {
      if (w.step === 1) { this._wizard = null; this.view = 'catalogo'; this.renderView(); }
      else { w.step--; this.renderPublish(el); }
    });
    el.querySelector('#pnl-wz-next').addEventListener('click', async () => {
      if (w.step === 1) {
        const get = id => body.querySelector('#' + id)?.value?.trim() || '';
        w.meta = {
          name: get('pnl-f-name'), shortDescription: get('pnl-f-short'), description: get('pnl-f-desc'),
          category: get('pnl-f-cat'), area: get('pnl-f-area'), audience: get('pnl-f-aud'),
          frequency: get('pnl-f-freq'), dataDate: get('pnl-f-date'), accessLevel: get('pnl-f-access'),
          keywords: get('pnl-f-keys').split(',').map(s => s.trim()).filter(Boolean)
        };
        if (!w.meta.name || !w.meta.shortDescription || !w.meta.area) { this.toast('Preencha nome, descrição resumida e área.', 'error'); return; }
        w.step = 2; this.renderPublish(el);
      } else if (w.step === 2) {
        if (!w.pack) { this.toast('Envie um arquivo HTML ou ZIP antes de continuar.', 'error'); return; }
        w.step = 3; this.renderPublish(el);
      } else {
        const consent = body.querySelector('#pnl-consent');
        if (!consent?.checked) { this.toast('Confirme a declaração de autorização de conteúdo.', 'error'); return; }
        w.meta.changeSummary = body.querySelector('#pnl-f-changes')?.value?.trim() || 'Versão inicial';
        w.meta.reviewNotes = body.querySelector('#pnl-f-notes')?.value?.trim() || '';
        const btn = el.querySelector('#pnl-wz-next');
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
        try {
          await this.createPanel(w.meta, w.pack);
          this.toast('Painel enviado para análise da governança! 🛰️');
          this._wizard = null;
          await this.loadPanels();
          this.view = 'meus'; this.renderView();
        } catch (e) {
          this.toast(e.message, 'error');
          btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Enviar para análise';
        }
      }
    });
  },

  renderWizardStep1(body) {
    const m = this._wizard.meta;
    body.innerHTML = `
      <div class="pnl-stage-title"><i class="fa-solid fa-book-open"></i><div><h3>Conte-nos sobre o painel</h3><span>Essas informações ajudam as pessoas a encontrar e entender o conteúdo.</span></div></div>
      <div class="pnl-form-grid">
        <label class="form-group"><span class="form-label">Nome do painel *</span><input class="form-input" id="pnl-f-name" value="${this.esc(m.name || '')}" placeholder="Ex.: Cockpit de Falha Operacional"></label>
        <label class="form-group"><span class="form-label">Área responsável *</span><input class="form-input" id="pnl-f-area" value="${this.esc(m.area || '')}" placeholder="Ex.: Qualidade Vivo"></label>
        <label class="form-group wide"><span class="form-label">Descrição resumida * (máx. 160)</span><input class="form-input" id="pnl-f-short" maxlength="160" value="${this.esc(m.shortDescription || '')}" placeholder="Explique o valor do painel em uma frase"></label>
        <label class="form-group wide"><span class="form-label">Descrição completa</span><textarea class="form-input form-textarea" id="pnl-f-desc" rows="3" placeholder="Contexto, indicadores, público e forma de uso...">${this.esc(m.description || '')}</textarea></label>
        <label class="form-group"><span class="form-label">Categoria *</span><select class="form-input form-select" id="pnl-f-cat">${this.CATEGORIES.map(c => `<option ${m.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label class="form-group"><span class="form-label">Público-alvo</span><input class="form-input" id="pnl-f-aud" value="${this.esc(m.audience || '')}" placeholder="Ex.: Coordenadores e gerentes"></label>
        <label class="form-group"><span class="form-label">Frequência de atualização</span><select class="form-input form-select" id="pnl-f-freq">${['DIARIA', 'SEMANAL', 'MENSAL', 'SOB_DEMANDA'].map(f => `<option value="${f}" ${m.frequency === f ? 'selected' : ''}>${f.replace('_', ' ').toLowerCase()}</option>`).join('')}</select></label>
        <label class="form-group"><span class="form-label">Data dos dados</span><input class="form-input" type="date" id="pnl-f-date" value="${this.esc(m.dataDate || '')}"></label>
        <label class="form-group"><span class="form-label">Nível de acesso</span><select class="form-input form-select" id="pnl-f-access"><option value="PUBLICO_INTERNO" ${m.accessLevel === 'PUBLICO_INTERNO' ? 'selected' : ''}>Público interno</option><option value="AREA" ${m.accessLevel === 'AREA' ? 'selected' : ''}>Restrito à área</option></select></label>
        <label class="form-group"><span class="form-label">Palavras-chave (vírgula)</span><input class="form-input" id="pnl-f-keys" value="${this.esc((m.keywords || []).join(', '))}" placeholder="falha, qualidade, vivo"></label>
      </div>`;
  },

  renderWizardStep2(body) {
    const w = this._wizard;
    body.innerHTML = `
      <div class="pnl-stage-title"><i class="fa-solid fa-cloud-arrow-up"></i><div><h3>Envie o pacote do painel</h3><span>HTML autocontido ou ZIP com index.html e recursos locais (embutidos automaticamente).</span></div></div>
      <label class="pnl-dropzone ${w.pack ? 'has-file' : ''}" id="pnl-drop">
        <input type="file" id="pnl-file" accept=".html,.htm,.zip" hidden>
        ${w.pack
        ? `<i class="fa-solid fa-file-circle-check"></i><h3>${this.esc(w.pack.originalName)}</h3>
           <p>${(w.pack.html.length / 1024).toFixed(0)} KB preparados · score de segurança ${w.pack.report.score}/100</p>
           ${w.pack.report.warnings.length ? `<div class="pnl-warnings"><i class="fa-solid fa-triangle-exclamation"></i> Atenção: ${w.pack.report.warnings.map(x => this.esc(x)).join(' · ')}</div>` : ''}
           <button type="button" class="btn btn-secondary btn-sm" id="pnl-file-clear">Trocar arquivo</button>`
        : `<i class="fa-solid fa-cloud-arrow-up"></i><h3>Arraste o HTML ou ZIP para cá</h3>
           <p>ou clique para selecionar · máximo 25 MB · resultado final até 900 KB</p><span>HTML · ZIP</span>`}
      </label>
      <div class="pnl-security-note"><i class="fa-solid fa-shield-halved"></i><div><b>Validação automática antes do envio</b>
        <p>Extensão, estrutura, path traversal, executáveis, eval, cookies, captura de teclado, redirecionamentos, scripts/iframes/formulários externos e ofuscação.</p></div></div>
      ${w.pack ? `<div class="pnl-preview"><div><b>Pré-visualização isolada</b><span>Sandbox ativo · rede externa bloqueada</span></div>
        <iframe sandbox="allow-scripts" id="pnl-preview-frame" title="Prévia segura"></iframe></div>` : ''}`;

    if (w.pack) body.querySelector('#pnl-preview-frame').srcdoc = w.pack.html;

    const drop = body.querySelector('#pnl-drop');
    const input = body.querySelector('#pnl-file');
    const handle = async (file) => {
      if (!file) return;
      drop.classList.add('processing');
      drop.querySelector('h3') && (drop.querySelector('h3').textContent = 'Validando pacote...');
      try {
        w.pack = await this.processFile(file);
        this.renderWizardStep2(body);
      } catch (e) {
        w.pack = null;
        this.toast(e.message, 'error');
        this.renderWizardStep2(body);
      }
    };
    drop.addEventListener('click', (e) => { if (e.target.id !== 'pnl-file-clear') input.click(); });
    input.addEventListener('change', () => handle(input.files?.[0]));
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragging'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('dragging'); handle(e.dataTransfer.files?.[0]); });
    body.querySelector('#pnl-file-clear')?.addEventListener('click', (e) => { e.stopPropagation(); w.pack = null; this.renderWizardStep2(body); });
  },

  renderWizardStep3(body) {
    const w = this._wizard;
    body.innerHTML = `
      <div class="pnl-stage-title"><i class="fa-solid fa-clipboard-check"></i><div><h3>Revise e envie para governança</h3><span>Nenhum conteúdo é publicado automaticamente.</span></div></div>
      <div class="pnl-review-grid">
        <div>
          <div class="pnl-review-item"><i class="fa-solid fa-file-code"></i><div><span>Painel</span><b>${this.esc(w.meta.name)}</b></div>${this.statusBadge('EM_ANALISE')}</div>
          <div class="pnl-review-item"><i class="fa-solid fa-box-archive"></i><div><span>Arquivo</span><b>${this.esc(w.pack.originalName)} · ${(w.pack.html.length / 1024).toFixed(0)} KB</b></div><span class="pnl-chip safe">score ${w.pack.report.score}</span></div>
          <label class="form-group"><span class="form-label">Alterações / objetivo desta versão</span><textarea class="form-input form-textarea" id="pnl-f-changes" rows="3" placeholder="Descreva o que foi criado..."></textarea></label>
          <label class="form-group"><span class="form-label">Observações para o aprovador</span><textarea class="form-input form-textarea" id="pnl-f-notes" rows="3" placeholder="Orientações para a análise..."></textarea></label>
        </div>
        <aside class="pnl-flow">
          <h4>Próximas etapas</h4>
          ${['Triagem automática', 'Análise técnica', 'Análise visual', 'Análise de segurança', 'Publicação'].map((x, i) => `<div><span>${i + 1}</span><p><b>${x}</b><small>${i === 0 ? 'Concluída no envio' : 'Após a etapa anterior'}</small></p></div>`).join('')}
        </aside>
      </div>
      <label class="pnl-consent"><input type="checkbox" id="pnl-consent"> Confirmo que tenho autorização para publicar este conteúdo e que ele não contém dados pessoais ou confidenciais fora da política corporativa.</label>`;
  },

  // ============ FILA DE APROVAÇÃO ============
  async renderApprovalQueue(el) {
    el.innerHTML = '<div class="pnl-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando fila...</div>';
    const me = this.me();

    // Painéis com versão em análise
    const pending = [];
    for (const panel of this.panels) {
      if (panel.status === 'EM_ANALISE' || panel.hasPendingVersion || panel.status === 'AJUSTES') {
        const versions = await this.loadVersions(panel.id);
        const v = versions.find(x => x.status === 'EM_ANALISE' || x.status === 'AJUSTES');
        if (v) pending.push({ panel, version: v });
      }
    }

    el.innerHTML = pending.length ? `
      <div class="table-container"><table class="table">
        <thead><tr><th>Painel</th><th>Versão</th><th>Proprietário</th><th>Score</th><th>Técnica</th><th>Visual</th><th>Segurança</th><th></th></tr></thead>
        <tbody>${pending.map((x, i) => `
          <tr>
            <td><b>${this.esc(x.panel.name)}</b><br><small class="text-secondary">${this.esc(x.panel.area)}</small></td>
            <td><code>v${this.esc(x.version.versionNumber)}</code></td>
            <td>${this.esc(x.panel.ownerNome)}${x.panel.ownerUid === me.uid ? ' <span class="pnl-chip">seu — não pode aprovar</span>' : ''}</td>
            <td><b class="${x.version.scanScore >= 80 ? 'text-success' : 'text-warning'}">${x.version.scanScore}</b></td>
            ${this.APPROVAL_TYPES.map(t => `<td>${this.statusBadge(x.version.approvals?.[t.key]?.status || 'PENDENTE')}</td>`).join('')}
            <td><button class="btn btn-primary btn-sm" data-analyze="${i}" ${x.panel.ownerUid === me.uid && !me.isAdmin ? 'disabled title="Proprietário não aprova o próprio painel"' : ''}>Analisar</button></td>
          </tr>`).join('')}</tbody>
      </table></div>`
      : `<div class="empty-state"><div class="empty-state-icon">✅</div>
         <div class="empty-state-title">Fila limpa</div>
         <div class="empty-state-description">Nenhuma versão aguardando análise no momento.</div></div>`;

    el.querySelectorAll('[data-analyze]').forEach(b => b.addEventListener('click', () =>
      this.openAnalysisDrawer(pending[parseInt(b.dataset.analyze)])));
  },

  openAnalysisDrawer({ panel, version }) {
    document.getElementById('pnl-drawer')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'pnl-drawer';
    overlay.className = 'pnl-drawer-backdrop';
    overlay.innerHTML = `
      <aside class="pnl-drawer">
        <div class="pnl-drawer-head">
          <div><span>ANÁLISE DE GOVERNANÇA</span><h2>${this.esc(panel.name)}</h2>
            <p>v${this.esc(version.versionNumber)} · enviado por ${this.esc(version.submittedByNome)}</p></div>
          <button class="pnl-icon-btn" id="pnl-drawer-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="pnl-scan-score">
          <div class="pnl-score-ring ${version.scanScore >= 80 ? 'good' : 'warn'}"><b>${version.scanScore}</b><span>/100</span></div>
          <div><h3>${version.scanScore >= 80 ? 'Risco controlado' : 'Requer atenção'}</h3>
            <p>${version.scanWarnings?.length ? `Avisos do scanner: ${version.scanWarnings.map(x => this.esc(x)).join(' · ')}` : 'Nenhum aviso do scanner automático.'}</p></div>
        </div>
        <button class="btn btn-secondary" id="pnl-drawer-preview" style="width:100%"><i class="fa-solid fa-eye"></i> Pré-visualizar em sandbox</button>
        <div class="pnl-approval-blocks">
          ${this.APPROVAL_TYPES.map(t => {
      const a = version.approvals?.[t.key] || { status: 'PENDENTE' };
      const done = a.status !== 'PENDENTE';
      return `<div class="pnl-approval-block ${done ? 'done' : ''}">
              <div class="pnl-approval-head"><i class="fa-solid ${t.icon}"></i><b>${t.label}</b>${this.statusBadge(a.status)}</div>
              ${done
          ? `<p class="pnl-parecer"><b>${this.esc(a.approverNome)}</b>: ${this.esc(a.parecer) || 'sem observações'}</p>`
          : `<textarea class="form-input form-textarea" rows="2" id="pnl-parecer-${t.key}" placeholder="Parecer da ${t.label.toLowerCase()}..."></textarea>
                 <div class="pnl-approval-actions">
                   <button class="btn btn-danger btn-sm" data-decide="${t.key}:REPROVADA"><i class="fa-solid fa-ban"></i> Reprovar</button>
                   <button class="btn btn-secondary btn-sm" data-decide="${t.key}:AJUSTES"><i class="fa-solid fa-pen"></i> Solicitar ajustes</button>
                   <button class="btn btn-success btn-sm" data-decide="${t.key}:APROVADA"><i class="fa-solid fa-check"></i> Aprovar</button>
                 </div>`}
            </div>`;
    }).join('')}
        </div>
      </aside>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#pnl-drawer-close').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#pnl-drawer-preview').addEventListener('click', () => {
      document.getElementById('pnl-viewer')?.remove();
      const v = document.createElement('div');
      v.id = 'pnl-viewer'; v.className = 'pnl-viewer-overlay';
      v.innerHTML = `<div class="pnl-viewer-bar"><div><i class="fa-solid fa-flask"></i><b>Prévia em quarentena — ${this.esc(panel.name)} v${this.esc(version.versionNumber)}</b></div>
        <div><button class="btn btn-secondary btn-sm" id="pnl-qv-close"><i class="fa-solid fa-xmark"></i> Fechar</button></div></div>
        <iframe class="pnl-viewer-frame" sandbox="allow-scripts"></iframe>`;
      document.body.appendChild(v);
      v.querySelector('.pnl-viewer-frame').srcdoc = version.content;
      v.querySelector('#pnl-qv-close').addEventListener('click', () => v.remove());
    });
    overlay.querySelectorAll('[data-decide]').forEach(b => b.addEventListener('click', async () => {
      const [type, decision] = b.dataset.decide.split(':');
      const parecer = overlay.querySelector(`#pnl-parecer-${type}`)?.value?.trim() || '';
      if ((decision === 'REPROVADA' || decision === 'AJUSTES') && !parecer) {
        this.toast('Registre o parecer explicando a decisão.', 'error'); return;
      }
      b.disabled = true;
      try {
        await this.decide(panel, version, type, decision, parecer);
        this.toast(`${this.APPROVAL_TYPES.find(t => t.key === type).label}: ${this.STATUS_LABELS[decision].toLowerCase()} ✓`);
        overlay.remove();
        await this.loadPanels();
        this.renderView();
      } catch (e) {
        this.toast(e.message, 'error');
        b.disabled = false;
      }
    }));
  },

  // ============ DETALHE ============
  async renderDetail(el) {
    const panel = this.panels.find(p => p.id === this.detailPanelId);
    if (!panel) { this.view = 'catalogo'; this.renderView(); return; }
    const me = this.me();
    const isOwner = panel.ownerUid === me.uid;
    const fav = this.favorites.has(panel.id);

    el.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="pnl-back"><i class="fa-solid fa-arrow-left"></i> Voltar ao catálogo</button>
      <div class="pnl-detail-hero">
        <div class="pnl-detail-icon"><i class="fa-solid fa-chart-column"></i></div>
        <div class="pnl-detail-copy">
          <div>${this.statusBadge(panel.status)}<span class="pnl-chip">${this.esc(panel.category)}</span>${panel.publishedVersionNumber ? `<span class="pnl-chip">v${this.esc(panel.publishedVersionNumber)}</span>` : ''}</div>
          <h2>${this.esc(panel.name)}</h2>
          <p>${this.esc(panel.shortDescription)}</p>
          <small class="text-secondary">${this.esc(panel.area)} · proprietário: ${this.esc(panel.ownerNome)} · <i class="fa-solid fa-eye"></i> ${(panel.views || 0).toLocaleString('pt-BR')} acessos</small>
        </div>
        <div class="pnl-detail-actions">
          <button class="btn btn-secondary" id="pnl-d-fav"><i class="fa-${fav ? 'solid' : 'regular'} fa-heart"></i> ${fav ? 'Favoritado' : 'Favoritar'}</button>
          <button class="btn btn-secondary" id="pnl-d-copy"><i class="fa-solid fa-copy"></i> Copiar link</button>
          <button class="btn btn-primary" id="pnl-d-open" ${panel.publishedVersionId ? '' : 'disabled'}><i class="fa-solid fa-eye"></i> Abrir painel</button>
        </div>
      </div>
      <div class="tabs">
        ${['visao:Visão geral', 'versoes:Histórico de versões', 'problemas:Problemas'].map(t => {
      const [k, l] = t.split(':');
      return `<button class="tab ${this.detailTab === k ? 'active' : ''}" data-dtab="${k}">${l}</button>`;
    }).join('')}
      </div>
      <div id="pnl-detail-body"></div>`;

    el.querySelector('#pnl-back').addEventListener('click', () => { this.view = 'catalogo'; this.renderView(); });
    el.querySelector('#pnl-d-fav').addEventListener('click', async () => { await this.toggleFavorite(panel.id); this.renderView(); });
    el.querySelector('#pnl-d-copy').addEventListener('click', () => this.copyLink(panel));
    el.querySelector('#pnl-d-open').addEventListener('click', () => this.openViewer(panel));
    el.querySelectorAll('[data-dtab]').forEach(b => b.addEventListener('click', () => { this.detailTab = b.dataset.dtab; this.renderView(); }));

    const body = el.querySelector('#pnl-detail-body');
    if (this.detailTab === 'visao') {
      body.innerHTML = `
        <div class="card"><div class="card-body">
          <h3 style="margin-bottom:12px">Sobre este painel</h3>
          <p class="text-secondary">${this.esc(panel.description || panel.shortDescription)}</p>
          <div class="pnl-info-grid">
            ${[['Categoria', panel.category], ['Área responsável', panel.area], ['Público-alvo', panel.audience || '—'],
        ['Frequência', (panel.frequency || '').replace('_', ' ').toLowerCase() || '—'], ['Dados atualizados até', panel.dataDate || '—'],
        ['Link permanente', `#paineis/${panel.slug}`]].map(([l, v]) => `<div class="pnl-info"><span>${l}</span><b>${this.esc(v)}</b></div>`).join('')}
          </div>
          ${isOwner || this.canManage() ? `
          <div class="pnl-owner-actions">
            ${isOwner ? `<button class="btn btn-secondary" id="pnl-new-version"><i class="fa-solid fa-cloud-arrow-up"></i> Enviar nova versão</button>` : ''}
            ${this.canManage() && panel.status === 'PUBLICADO' ? `<button class="btn btn-danger" id="pnl-suspend"><i class="fa-solid fa-pause"></i> Suspender</button>` : ''}
            ${this.canManage() && panel.status === 'SUSPENSO' ? `<button class="btn btn-success" id="pnl-unsuspend"><i class="fa-solid fa-play"></i> Reativar</button>` : ''}
            ${this.canManage() && panel.status !== 'ARQUIVADO' ? `<button class="btn btn-ghost" id="pnl-archive"><i class="fa-solid fa-box-archive"></i> Arquivar</button>` : ''}
          </div>` : ''}
        </div></div>
        <div class="card" style="margin-top:16px"><div class="card-body">
          <h3 style="margin-bottom:12px">Reportar problema</h3>
          <div class="pnl-report-row">
            <select class="form-input form-select" id="pnl-report-type" style="max-width:220px">
              <option>Dados incorretos</option><option>Painel não abre</option><option>Layout quebrado</option><option>Conteúdo desatualizado</option><option>Outro</option>
            </select>
            <input class="form-input" id="pnl-report-desc" placeholder="Descreva o problema...">
            <button class="btn btn-secondary" id="pnl-report-send"><i class="fa-solid fa-flag"></i> Reportar</button>
          </div>
        </div></div>`;

      body.querySelector('#pnl-new-version')?.addEventListener('click', () => this.openNewVersionModal(panel));
      body.querySelector('#pnl-suspend')?.addEventListener('click', async () => {
        const motivo = prompt('Motivo da suspensão:'); if (motivo === null) return;
        await this.setPanelStatus(panel, 'SUSPENSO', motivo); await this.loadPanels(); this.renderView();
      });
      body.querySelector('#pnl-unsuspend')?.addEventListener('click', async () => {
        await this.setPanelStatus(panel, 'PUBLICADO', 'reativação'); await this.loadPanels(); this.renderView();
      });
      body.querySelector('#pnl-archive')?.addEventListener('click', async () => {
        if (!confirm(`Arquivar "${panel.name}"? Ele sai do catálogo mas o histórico é preservado.`)) return;
        await this.setPanelStatus(panel, 'ARQUIVADO', ''); await this.loadPanels(); this.renderView();
      });
      body.querySelector('#pnl-report-send')?.addEventListener('click', async () => {
        const desc = body.querySelector('#pnl-report-desc').value.trim();
        if (!desc) { this.toast('Descreva o problema.', 'error'); return; }
        await this.reportProblem(panel, body.querySelector('#pnl-report-type').value, desc);
        body.querySelector('#pnl-report-desc').value = '';
        this.toast('Problema reportado ao proprietário. Obrigado!');
      });
    } else if (this.detailTab === 'versoes') {
      body.innerHTML = '<div class="pnl-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando versões...</div>';
      const versions = await this.loadVersions(panel.id);
      body.innerHTML = `<div class="card"><div class="card-body">
        ${versions.map(v => `
          <div class="pnl-version-row">
            <span class="pnl-vnum ${v.id === panel.publishedVersionId ? 'current' : ''}">v${this.esc(v.versionNumber)}</span>
            <div><b>${this.esc(v.changeSummary)}</b>
              <small>${this.esc(v.submittedByNome)} · ${v.submittedAt?.toDate?.()?.toLocaleString('pt-BR') || ''} · scanner ${v.scanScore}/100</small></div>
            ${this.statusBadge(v.status)}
            ${this.canManage() && v.status === 'ARQUIVADA' ? `<button class="btn btn-secondary btn-sm" data-rollback="${v.id}"><i class="fa-solid fa-rotate-left"></i> Restaurar</button>`
          : v.id === panel.publishedVersionId ? '<span class="pnl-chip safe">Atual</span>' : ''}
          </div>`).join('') || '<p class="text-secondary">Nenhuma versão.</p>'}
      </div></div>`;
      body.querySelectorAll('[data-rollback]').forEach(b => b.addEventListener('click', async () => {
        const v = versions.find(x => x.id === b.dataset.rollback);
        if (!confirm(`Restaurar a versão v${v.versionNumber}? A versão atual será arquivada.`)) return;
        try {
          await this.rollback(panel, v);
          this.toast(`Rollback para v${v.versionNumber} concluído`);
          await this.loadPanels(); this.renderView();
        } catch (e) { this.toast(e.message, 'error'); }
      }));
    } else {
      body.innerHTML = '<div class="pnl-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando...</div>';
      const snap = await window.db.collection('panel_reports').where('panelId', '==', panel.id).get();
      const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      body.innerHTML = reports.length ? `<div class="card"><div class="card-body">
        ${reports.map(r => `<div class="pnl-version-row">
          <i class="fa-solid fa-flag ${r.status === 'ABERTO' ? 'text-warning' : 'text-success'}"></i>
          <div><b>${this.esc(r.tipo)}</b><small>${this.esc(r.nome)} · ${r.createdAt?.toDate?.()?.toLocaleString('pt-BR') || ''}</small>
            <p class="text-secondary" style="margin:4px 0 0">${this.esc(r.descricao)}</p></div>
          ${this.statusBadge(r.status === 'ABERTO' ? 'PENDENTE' : 'APROVADA')}
          ${(isOwner || this.canManage()) && r.status === 'ABERTO' ? `<button class="btn btn-secondary btn-sm" data-resolve="${r.id}">Resolver</button>` : ''}
        </div>`).join('')}
      </div></div>`
        : `<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-title">Nenhum problema em aberto</div></div>`;
      body.querySelectorAll('[data-resolve]').forEach(b => b.addEventListener('click', async () => {
        await window.db.collection('panel_reports').doc(b.dataset.resolve).update({ status: 'RESOLVIDO' });
        this.toast('Problema marcado como resolvido'); this.renderView();
      }));
    }
  },

  openNewVersionModal(panel) {
    document.getElementById('pnl-nv-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'pnl-nv-modal';
    modal.className = 'pnl-drawer-backdrop';
    modal.innerHTML = `
      <aside class="pnl-drawer">
        <div class="pnl-drawer-head">
          <div><span>NOVA VERSÃO</span><h2>${this.esc(panel.name)}</h2>
            <p>A versão publicada continua ativa até a nova ser aprovada. O link não muda.</p></div>
          <button class="pnl-icon-btn" id="pnl-nv-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <label class="pnl-dropzone" id="pnl-nv-drop"><input type="file" id="pnl-nv-file" accept=".html,.htm,.zip" hidden>
          <i class="fa-solid fa-cloud-arrow-up"></i><h3 id="pnl-nv-label">Selecione o HTML ou ZIP</h3><p>máximo 25 MB</p></label>
        <label class="form-group"><span class="form-label">O que mudou nesta versão? *</span>
          <textarea class="form-input form-textarea" id="pnl-nv-changes" rows="3" placeholder="Descreva as alterações..."></textarea></label>
        <button class="btn btn-primary" id="pnl-nv-send" disabled style="width:100%"><i class="fa-solid fa-shield-halved"></i> Enviar para análise</button>
      </aside>`;
    document.body.appendChild(modal);

    let pack = null;
    const drop = modal.querySelector('#pnl-nv-drop');
    const input = modal.querySelector('#pnl-nv-file');
    drop.addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      modal.querySelector('#pnl-nv-label').textContent = 'Validando...';
      try {
        pack = await this.processFile(file);
        modal.querySelector('#pnl-nv-label').textContent = `${pack.originalName} · score ${pack.report.score}/100 ✓`;
        modal.querySelector('#pnl-nv-send').disabled = false;
        drop.classList.add('has-file');
      } catch (e) {
        pack = null;
        modal.querySelector('#pnl-nv-label').textContent = 'Selecione o HTML ou ZIP';
        modal.querySelector('#pnl-nv-send').disabled = true;
        this.toast(e.message, 'error');
      }
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    modal.querySelector('#pnl-nv-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#pnl-nv-send').addEventListener('click', async () => {
      const changes = modal.querySelector('#pnl-nv-changes').value.trim();
      if (!changes) { this.toast('Descreva o que mudou nesta versão.', 'error'); return; }
      const btn = modal.querySelector('#pnl-nv-send');
      btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
      try {
        await this.submitNewVersion(panel, pack, changes);
        this.toast('Nova versão enviada para análise 🛰️');
        modal.remove();
        await this.loadPanels(); this.renderView();
      } catch (e) {
        this.toast(e.message, 'error');
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Enviar para análise';
      }
    });
  },

  // ============ GOVERNANÇA ============
  async renderGovernance(el) {
    const published = this.panels.filter(p => p.status === 'PUBLICADO');
    const inReview = this.panels.filter(p => p.status === 'EM_ANALISE' || p.hasPendingVersion);
    const adjusting = this.panels.filter(p => p.status === 'AJUSTES');
    const suspended = this.panels.filter(p => p.status === 'SUSPENSO');
    const reportsSnap = await window.db.collection('panel_reports').where('status', '==', 'ABERTO').get().catch(() => ({ docs: [] }));

    el.innerHTML = `
      <div class="pnl-gov-grid">
        ${[['fa-satellite-dish', published.length, 'Publicados', 'violet'],
      ['fa-hourglass-half', inReview.length, 'Em análise', 'amber'],
      ['fa-pen-ruler', adjusting.length, 'Aguardando ajustes', 'magenta'],
      ['fa-flag', reportsSnap.docs.length, 'Problemas abertos', 'cyan']]
        .map(([icon, v, l, tone]) => `<article class="pnl-metric tone-${tone}"><i class="fa-solid ${icon}"></i><p><b>${v}</b><span>${l}</span></p></article>`).join('')}
      </div>
      ${suspended.length ? `<div class="card" style="margin-top:16px"><div class="card-body">
        <h3 style="margin-bottom:12px"><i class="fa-solid fa-pause"></i> Painéis suspensos</h3>
        ${suspended.map(p => `<div class="pnl-version-row"><b>${this.esc(p.name)}</b><span class="text-secondary">${this.esc(p.area)}</span>
          <button class="btn btn-secondary btn-sm" data-open="${p.id}">Revisar</button></div>`).join('')}
      </div></div>` : ''}
      <div class="card" style="margin-top:16px"><div class="card-body">
        <h3 style="margin-bottom:12px"><i class="fa-solid fa-list-check"></i> Todos os painéis (governança)</h3>
        <div class="table-container"><table class="table">
          <thead><tr><th>Painel</th><th>Área</th><th>Proprietário</th><th>Status</th><th>Versão</th><th>Acessos</th><th></th></tr></thead>
          <tbody>${this.panels.map(p => `<tr>
            <td><b>${this.esc(p.name)}</b></td><td>${this.esc(p.area)}</td><td>${this.esc(p.ownerNome)}</td>
            <td>${this.statusBadge(p.status)}</td><td><code>${p.publishedVersionNumber ? 'v' + this.esc(p.publishedVersionNumber) : '—'}</code></td>
            <td>${(p.views || 0).toLocaleString('pt-BR')}</td>
            <td><button class="btn btn-ghost btn-sm" data-open="${p.id}"><i class="fa-solid fa-chevron-right"></i></button></td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div></div>`;
    this.attachCardEvents(el);
  }
};

window.NexusPanels = NexusPanels;
