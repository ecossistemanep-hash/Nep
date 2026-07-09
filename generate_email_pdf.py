# -*- coding: utf-8 -*-
"""Gera PDF do email de publicação do NEP na Intranet."""

from fpdf import FPDF
import os

class EmailPDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, 'NEP Delivery Control - Documentação Técnica', align='R')
        self.ln(3)
        self.set_draw_color(59, 130, 246)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'Página {self.page_no()}/{{nb}}', align='C')

    def section_title(self, icon, title):
        self.set_font('Helvetica', 'B', 13)
        self.set_text_color(30, 41, 59)
        self.set_fill_color(241, 245, 249)
        self.cell(0, 10, f'  {icon}  {title}', fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

    def key_value_row(self, key, value, stripe=False):
        if stripe:
            self.set_fill_color(248, 250, 252)
        else:
            self.set_fill_color(255, 255, 255)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(71, 85, 105)
        self.cell(55, 7, f'  {key}', fill=True)
        self.set_font('Helvetica', '', 9)
        self.set_text_color(30, 41, 59)
        self.cell(0, 7, value, fill=True, new_x="LMARGIN", new_y="NEXT")

    def body_text(self, text, bold=False):
        self.set_font('Helvetica', 'B' if bold else '', 10)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def bullet(self, text, indent=10):
        x = self.get_x()
        self.set_x(x + indent)
        self.set_font('Helvetica', '', 9)
        self.set_text_color(51, 65, 85)
        self.cell(4, 5, chr(8226))
        self.multi_cell(0, 5, text)
        self.ln(0.5)

    def sub_bullet(self, text, indent=18):
        x = self.get_x()
        self.set_x(x + indent)
        self.set_font('Helvetica', '', 8.5)
        self.set_text_color(100, 116, 139)
        self.cell(4, 5, '-')
        self.multi_cell(0, 5, text)
        self.ln(0.5)

    def subsection(self, num, title):
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(59, 130, 246)
        self.cell(0, 7, f'{num}. {title}', new_x="LMARGIN", new_y="NEXT")


pdf = EmailPDF()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.add_page()

# === ASSUNTO ===
pdf.set_font('Helvetica', 'B', 16)
pdf.set_text_color(30, 41, 59)
pdf.multi_cell(0, 9, 'Solicitação de Publicação do Sistema\nNEP Delivery Control na Intranet Corporativa')
pdf.ln(2)

pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(100, 116, 139)
pdf.cell(0, 5, 'Data: 13 de Fevereiro de 2026  |  De: Fernando Pereira Evangelista  |  Para: Equipe de TI', new_x="LMARGIN", new_y="NEXT")
pdf.ln(2)

pdf.set_draw_color(200, 200, 200)
pdf.line(10, pdf.get_y(), 200, pdf.get_y())
pdf.ln(5)

# === INTRO ===
pdf.body_text('Prezados da equipe de TI,')
pdf.ln(1)
pdf.body_text('Solicito a publicação do NEP Delivery Control — plataforma de gestão operacional e gamificação da nossa área — na intranet corporativa. Segue abaixo o detalhamento técnico para viabilizar o acesso.')
pdf.ln(3)

# === INFORMAÇÕES DE ACESSO ===
pdf.section_title('🔗', 'Informações de Acesso')

rows = [
    ('URL de Produção', 'https://ecossistema-nep.web.app'),
    ('Domínio de Autenticação', 'ecossistema-nep.firebaseapp.com'),
    ('Projeto Firebase', 'ecossistema-nep'),
    ('Hosting', 'Firebase Hosting (Google Cloud)'),
    ('Certificado SSL', 'TLS 1.2+ gerenciado automaticamente pelo Google'),
    ('CDN', 'Firebase Global CDN'),
]
for i, (k, v) in enumerate(rows):
    pdf.key_value_row(k, v, stripe=(i % 2 == 0))
pdf.ln(5)

# === SEGURANÇA ===
pdf.section_title('🔒', 'Segurança — Camadas Implementadas')

pdf.subsection(1, 'Autenticação')
pdf.bullet('Login via Firebase Authentication (email/senha)')
pdf.bullet('Credenciais nunca trafegam em texto plano — toda comunicação é HTTPS')
pdf.bullet('Tokens JWT com expiração automática (1 hora, renovação transparente)')
pdf.bullet('Custom Claims para controle de perfil de acesso (admin/colaborador)')
pdf.ln(2)

pdf.subsection(2, 'Autorização por Dados (Firestore Security Rules)')
pdf.bullet('Modelo default-deny: toda collection não declarada é bloqueada')
pdf.bullet('Cada collection possui regras granulares:')
pdf.sub_bullet('users/{userId}: somente o próprio usuário ou admin pode escrever')
pdf.sub_bullet('points_transactions: qualquer autenticado cria, somente admin edita/deleta')
pdf.sub_bullet('achievements: somente admin pode criar/modificar conquistas')
pdf.bullet('Todas as demais operações exigem token autenticado válido')
pdf.ln(2)

pdf.subsection(3, 'Infraestrutura Google Cloud')
pdf.bullet('Dados armazenados no Cloud Firestore (us-central1), backups automáticos')
pdf.bullet('Arquivos no Cloud Storage com regras de acesso por autenticação')
pdf.bullet('Hosting servido via CDN global com proteção DDoS integrada')
pdf.bullet('Sem servidor próprio exposto — arquitetura 100% serverless')
pdf.ln(2)

pdf.subsection(4, 'Aplicação (Client-Side)')
pdf.bullet('Progressive Web App (PWA) — funciona offline com Service Worker')
pdf.bullet('Sem dados sensíveis armazenados no client (apenas tokens de sessão)')
pdf.bullet('Content Security Policy aplicada')
pdf.ln(5)

# === REQUISITOS FIREWALL ===
pdf.section_title('📋', 'Requisitos para Publicação na Intranet')

pdf.body_text('Para o acesso via intranet, é necessário liberar os seguintes domínios no firewall/proxy corporativo:')
pdf.ln(2)

# Table header
pdf.set_fill_color(30, 41, 59)
pdf.set_text_color(255, 255, 255)
pdf.set_font('Helvetica', 'B', 9)
pdf.cell(75, 7, '  Domínio', fill=True)
pdf.cell(25, 7, '  Porta', fill=True)
pdf.cell(0, 7, '  Finalidade', fill=True, new_x="LMARGIN", new_y="NEXT")

firewall_rows = [
    ('ecossistema-nep.web.app', '443 (HTTPS)', 'Aplicação principal'),
    ('ecossistema-nep.firebaseapp.com', '443', 'Autenticação'),
    ('firestore.googleapis.com', '443', 'Banco de dados'),
    ('ecossistema-nep.firebasestorage.app', '443', 'Upload de arquivos'),
    ('fcm.googleapis.com', '443', 'Notificações Push'),
    ('identitytoolkit.googleapis.com', '443', 'API de autenticação'),
]
for i, (dom, port, purpose) in enumerate(firewall_rows):
    if i % 2 == 0:
        pdf.set_fill_color(248, 250, 252)
    else:
        pdf.set_fill_color(255, 255, 255)
    pdf.set_text_color(51, 65, 85)
    pdf.set_font('Helvetica', '', 8.5)
    pdf.cell(75, 7, f'  {dom}', fill=True)
    pdf.cell(25, 7, f'  {port}', fill=True)
    pdf.cell(0, 7, f'  {purpose}', fill=True, new_x="LMARGIN", new_y="NEXT")
pdf.ln(5)

# === COMPATIBILIDADE ===
pdf.section_title('🖥️', 'Compatibilidade')
pdf.bullet('Navegadores suportados: Chrome 90+, Edge 90+, Firefox 90+, Safari 15+')
pdf.bullet('Responsivo: Desktop, tablet e mobile')
pdf.bullet('Instalável: Pode ser instalado como app (PWA) diretamente do navegador')
pdf.ln(5)

# === OBSERVAÇÕES ===
pdf.section_title('📌', 'Observações Finais')
pdf.bullet('O sistema não requer instalação local — é 100% web')
pdf.bullet('Não há banco de dados local ou dependência de servidor on-premise')
pdf.bullet('Todos os dados estão na infraestrutura Google Cloud Platform, em conformidade com as práticas de segurança do Google')
pdf.bullet('O acesso é controlado por cadastro prévio — apenas usuários pré-cadastrados pelo administrador conseguem autenticar')
pdf.ln(5)

# === FECHAMENTO ===
pdf.set_draw_color(200, 200, 200)
pdf.line(10, pdf.get_y(), 200, pdf.get_y())
pdf.ln(4)
pdf.body_text('Fico à disposição para esclarecer quaisquer dúvidas ou agendar uma reunião para demonstração do sistema.')
pdf.ln(3)
pdf.body_text('Atenciosamente,', bold=True)
pdf.body_text('Fernando Pereira Evangelista')
pdf.body_text('Coordenador — NEP Delivery Control')

# === OUTPUT ===
output_path = os.path.join(os.path.dirname(__file__), 'NEP_Publicacao_Intranet.pdf')
pdf.output(output_path)
print(f'PDF gerado com sucesso: {output_path}')
