/* =========================================
   NEP REPORT EXECUTIVO
   Módulo integrado (portado do app irmão Report-Executivo) que roda
   sobre a arquitetura nativa do NEP: Firebase Auth + Firestore, papéis
   e gestor_uid do próprio NEP. Nenhuma dependência de Supabase/Next.js.

   Coleção central: "items" (equivalente a `items` do Report Executivo).
   Cada aba abaixo é uma visão diferente sobre a mesma coleção + coleções
   satélite (events, process_improvements, ...).
   ========================================= */

const NexusReportExecutivo = {
  db: null,
  activeTab: 'archived',
  items: [],
  events: [],
  improvements: [],
  unsubItems: null,
  unsubEvents: null,
  unsubImprovements: null,

  ROLE_LABEL: {
    admin: 'ADMIN',
    diretor: 'DIRETOR',
    superintendente: 'SUPERINTENDENTE',
    gerente: 'GERENTE',
    consultor: 'CONSULTOR',
    coordenador: 'COORDENADOR',
    lider: 'LÍDER',
    analista: 'ANALISTA',
    monitor: 'MONITOR',
    viewer: 'VIEWER',
    convidado: 'CONVIDADO'
  },

  // Papéis que não editam, só consultam (equivalente ao "viewer"/"convidado"
  // do Report Executivo — MANAGEMENT_ONLY_VIEWS e afins).
  READ_ONLY_ROLES: ['viewer', 'convidado'],

  getMyRoleKey() {
    const stored = localStorage.getItem('nep_user_role_key');
    if (stored) return stored.toLowerCase();
    const legacy = (localStorage.getItem('nep_cargo') || 'monitor').toLowerCase();
    return legacy;
  },

  canEdit() {
    return !this.READ_ONLY_ROLES.includes(this.getMyRoleKey());
  },

  init() {
    if (window.db) {
      this.db = window.db;
    } else if (typeof firebase !== 'undefined' && firebase.firestore) {
      this.db = firebase.firestore();
    }
    this.myUid = localStorage.getItem('nep_user_uid') || '';
    this.myName = (localStorage.getItem('nep_user_name') || '').trim();
    this.myRoleKey = this.getMyRoleKey();
  },

  async render(container) {
    this.init();
    this.container = container;

    if (!this.db) {
      container.innerHTML = `<div class="p-4 text-red-500">Erro: Firestore não disponível.</div>`;
      return;
    }

    const allTabs = [
      { id: 'archived', icon: 'fa-box-archive', label: 'Arquivados' },
      { id: 'agenda', icon: 'fa-calendar-days', label: 'Agenda' },
      { id: 'board', icon: 'fa-table-columns', label: 'Board' },
      { id: 'risks', icon: 'fa-triangle-exclamation', label: 'Riscos' },
      { id: 'improvements', icon: 'fa-arrow-trend-up', label: 'Melhorias' },
      { id: 'portfolio', icon: 'fa-layer-group', label: 'Carteira' },
      { id: 'exec-dashboard', icon: 'fa-gauge-high', label: 'Dashboard' },
      { id: 'scorecard', icon: 'fa-clipboard-check', label: 'Meu Scorecard' },
      { id: 'materials', icon: 'fa-photo-film', label: 'Materiais' },
      { id: 'capacity', icon: 'fa-users-gear', label: 'Capacidade' },
      { id: 'director-summary', icon: 'fa-sitemap', label: 'Resumo Estrutura', restricted: true },
      { id: 'routines', icon: 'fa-list-check', label: 'Rotinas' },
      { id: 'okrs', icon: 'fa-bullseye', label: 'OKRs Gerentes' },
      { id: 'executive', icon: 'fa-briefcase', label: 'Executivo' },
      { id: 'development', icon: 'fa-seedling', label: 'Desenvolvimento' }
    ].filter(t => !t.restricted || ['admin', 'diretor', 'superintendente'].includes(this.getMyRoleKey()));

    container.innerHTML = `
      <div class="admin-page animate-fade-in">
        <div class="admin-header">
          <div>
            <h1 class="page-title">Report Executivo</h1>
            <p class="page-description">Gestão de carteira, riscos, melhorias e agenda — integrado ao NEP.</p>
          </div>
        </div>
        <div class="admin-tabs">
          ${allTabs.map(t => `
            <button class="admin-tab ${this.activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">
              <i class="fa-solid ${t.icon}"></i> ${t.label}${t.soon ? ' <span style="opacity:.55;font-size:11px;">(em breve)</span>' : ''}
            </button>
          `).join('')}
        </div>
        <div class="admin-content" id="report-executivo-tab-content">
          <div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando...</div>
        </div>
      </div>`;

    this.attachTabEvents();
    await this.loadItems();
    await this.loadTabContent();
  },

  attachTabEvents() {
    document.querySelectorAll('#report-executivo-tab-content, .admin-tabs .admin-tab').forEach(() => {});
    document.querySelectorAll('.admin-tabs .admin-tab').forEach(tab => {
      tab.addEventListener('click', async () => {
        this.activeTab = tab.dataset.tab;
        document.querySelectorAll('.admin-tabs .admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        await this.loadTabContent();
      });
    });
  },

  async loadTabContent() {
    const container = document.getElementById('report-executivo-tab-content');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando...</div>';

    try {
      switch (this.activeTab) {
        case 'archived': await this.renderArchived(container); break;
        case 'agenda': await this.renderAgenda(container); break;
        case 'board': await this.renderBoard(container); break;
        case 'risks': await this.renderRisks(container); break;
        case 'improvements': await this.renderImprovements(container); break;
        case 'portfolio': await this.renderPortfolio(container); break;
        case 'exec-dashboard': await this.renderExecDashboard(container); break;
        case 'scorecard': await this.renderScorecard(container); break;
        case 'materials': await this.renderMaterials(container); break;
        case 'capacity': await this.renderCapacity(container); break;
        case 'director-summary': await this.renderDirectorSummary(container); break;
        case 'routines': await this.renderRoutines(container); break;
        case 'okrs': await this.renderOkrs(container); break;
        case 'executive': await this.renderExecutive(container); break;
        case 'development': await this.renderDevelopment(container); break;
        default: this.renderSoon(container);
      }
    } catch (error) {
      console.error('[ReportExecutivo] Erro ao carregar aba:', error);
      container.innerHTML = `<div class="alert alert-error" style="padding:20px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:12px;color:#ef4444;"><strong>Erro ao carregar:</strong> ${error.message}</div>`;
    }
  },

  renderSoon(container) {
    container.innerHTML = `
      <div class="empty-state" style="text-align:center;padding:60px;">
        <div style="font-size:64px;margin-bottom:16px;">🚧</div>
        <h3 style="margin-bottom:8px;">Em construção</h3>
        <p style="color:var(--text-secondary);">Esta aba faz parte da próxima fase do porte do Report Executivo.</p>
      </div>`;
  },

  // ============ DADOS (coleção "items") ============

  async loadItems() {
    try {
      const snap = await this.db.collection('items').orderBy('updatedAt', 'desc').limit(500).get();
      this.items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[ReportExecutivo] items ainda vazio/sem índice:', e.message);
      this.items = [];
    }
  },

  async saveItem(data, id = null) {
    const payload = {
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (id) {
      await this.db.collection('items').doc(id).update(payload);
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      payload.createdBy = this.myUid;
      payload.archived = false;
      await this.db.collection('items').add(payload);
    }
    await this.loadItems();
  },

  fmtDate(v) {
    if (!v) return '—';
    const d = v.toDate ? v.toDate() : new Date(v);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('pt-BR');
  },

  escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  // ============ 1. ARQUIVADOS ============

  async renderArchived(container) {
    const archived = this.items.filter(i => i.archived === true);
    const canEdit = this.canEdit();

    container.innerHTML = `
      <div class="admin-section">
        <p class="page-description" style="margin-bottom:16px;">${archived.length} frente(s) arquivada(s).</p>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Título</th><th>Responsável</th><th>Status</th><th>Atualizado</th><th></th></tr></thead>
            <tbody>
              ${archived.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:24px;">Nenhum item arquivado.</td></tr>` : archived.map(i => `
                <tr>
                  <td>${this.escapeHtml(i.title || '(sem título)')}</td>
                  <td>${this.escapeHtml(i.ownerName || '—')}</td>
                  <td>${this.escapeHtml(i.status || '—')}</td>
                  <td>${this.fmtDate(i.updatedAt)}</td>
                  <td>${canEdit ? `<button class="btn btn-sm btn-secondary" data-restore="${i.id}"><i class="fa-solid fa-rotate-left"></i> Restaurar</button>` : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    container.querySelectorAll('[data-restore]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await this.saveItem({ archived: false }, btn.dataset.restore);
        window.NexusApp?.showToast('Item restaurado.', 'success');
        await this.loadTabContent();
      });
    });
  },

  // ============ 2. AGENDA ============

  async loadEvents() {
    try {
      const snap = await this.db.collection('events').orderBy('date', 'asc').limit(500).get();
      this.events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[ReportExecutivo] events ainda vazio/sem acesso:', e.message);
      this.events = [];
    }
  },

  EVENT_TYPES: {
    okr_abertura: 'Abertura de OKR',
    okr_fechamento: 'Fechamento de OKR',
    okr_revisao: 'Revisão de OKR',
    one_on_one: '1:1',
    reuniao: 'Reunião',
    outro: 'Outro'
  },

  async renderAgenda(container) {
    await this.loadEvents();
    const canEdit = this.canEdit();
    const upcoming = this.events.filter(e => !e.date || new Date(e.date) >= new Date(new Date().toDateString()));

    container.innerHTML = `
      <div class="admin-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <p class="page-description">${upcoming.length} evento(s) futuro(s) de ${this.events.length} total.</p>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-sm btn-secondary" id="btn-export-ics"><i class="fa-solid fa-file-export"></i> Exportar ICS</button>
            ${canEdit ? `<button class="btn btn-sm btn-primary" id="btn-new-event"><i class="fa-solid fa-plus"></i> Novo Evento</button>` : ''}
          </div>
        </div>
        <div id="event-form-slot"></div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Data</th><th>Título</th><th>Tipo</th><th>Vínculo</th><th></th></tr></thead>
            <tbody>
              ${this.events.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:24px;">Nenhum evento cadastrado.</td></tr>` : this.events.map(e => `
                <tr>
                  <td>${this.fmtDate(e.date)}</td>
                  <td>${this.escapeHtml(e.title || '(sem título)')}</td>
                  <td>${this.escapeHtml(this.EVENT_TYPES[e.type] || e.type || '—')}</td>
                  <td>${this.escapeHtml(e.linkedName || '—')}</td>
                  <td>${canEdit ? `<button class="btn btn-sm btn-ghost" data-del-event="${e.id}"><i class="fa-solid fa-trash"></i></button>` : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('btn-export-ics')?.addEventListener('click', () => this.exportEventsIcs());
    document.getElementById('btn-new-event')?.addEventListener('click', () => this.showEventForm());
    container.querySelectorAll('[data-del-event]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir este evento?')) return;
        await this.db.collection('events').doc(btn.dataset.delEvent).delete();
        window.NexusApp?.showToast('Evento excluído.', 'success');
        await this.loadTabContent();
      });
    });
  },

  showEventForm() {
    const slot = document.getElementById('event-form-slot');
    if (!slot) return;
    slot.innerHTML = `
      <div class="card" style="padding:16px;margin-bottom:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
          <input type="text" class="form-input" id="ev-title" placeholder="Título do evento">
          <input type="date" class="form-input" id="ev-date">
          <select class="form-input" id="ev-type">
            ${Object.entries(this.EVENT_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary btn-sm" id="ev-save">Salvar</button>
        <button class="btn btn-ghost btn-sm" id="ev-cancel">Cancelar</button>
      </div>`;
    document.getElementById('ev-cancel').addEventListener('click', () => { slot.innerHTML = ''; });
    document.getElementById('ev-save').addEventListener('click', async () => {
      const title = document.getElementById('ev-title').value.trim();
      const date = document.getElementById('ev-date').value;
      const type = document.getElementById('ev-type').value;
      if (!title || !date) {
        window.NexusApp?.showToast('Preencha título e data.', 'warning');
        return;
      }
      await this.db.collection('events').add({
        title, date, type,
        createdBy: this.myUid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      window.NexusApp?.showToast('Evento criado.', 'success');
      slot.innerHTML = '';
      await this.loadTabContent();
    });
  },

  exportEventsIcs() {
    const pad = n => String(n).padStart(2, '0');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NEP//Report Executivo//PT-BR'];
    this.events.forEach(e => {
      if (!e.date) return;
      const d = new Date(e.date);
      const dt = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${e.id}@nep`);
      lines.push(`DTSTART;VALUE=DATE:${dt}`);
      lines.push(`SUMMARY:${(e.title || '').replace(/\n/g, ' ')}`);
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agenda-nep.ics';
    a.click();
    URL.revokeObjectURL(url);
  },

  // ============ 3. BOARD (Kanban sobre "items") ============

  BOARD_STATUSES: ['Backlog', 'Em andamento', 'Em revisão', 'Concluído'],

  async renderBoard(container) {
    const canEdit = this.canEdit();
    const active = this.items.filter(i => !i.archived);

    container.innerHTML = `
      <div class="admin-section">
        <div class="report-board" style="display:grid;grid-template-columns:repeat(${this.BOARD_STATUSES.length},1fr);gap:16px;">
          ${this.BOARD_STATUSES.map(status => {
            const cards = active.filter(i => (i.status || 'Backlog') === status);
            return `
              <div class="report-board-col" data-status="${this.escapeHtml(status)}" style="background:var(--bg-secondary);border-radius:12px;padding:12px;min-height:200px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                  <strong>${status}</strong><span style="opacity:.6;">${cards.length}</span>
                </div>
                <div class="report-board-cards" style="display:flex;flex-direction:column;gap:8px;">
                  ${cards.map(i => `
                    <div class="card report-board-card" draggable="${canEdit}" data-item-id="${i.id}" style="padding:10px;cursor:${canEdit ? 'grab' : 'default'};">
                      <div style="font-weight:600;font-size:13px;">${this.escapeHtml(i.title || '(sem título)')}</div>
                      <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${this.escapeHtml(i.ownerName || 'Sem responsável')} · ${this.escapeHtml(i.priority || 'Normal')}</div>
                      ${i.deadline ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;"><i class="fa-solid fa-calendar"></i> ${this.fmtDate(i.deadline)}</div>` : ''}
                    </div>
                  `).join('')}
                  ${canEdit ? `<button class="btn btn-sm btn-ghost" data-add-card="${this.escapeHtml(status)}" style="margin-top:4px;">+ Adicionar cartão</button>` : ''}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;

    if (canEdit) this.attachBoardDnd(container);

    container.querySelectorAll('[data-add-card]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const title = prompt('Título do novo cartão:');
        if (!title) return;
        await this.saveItem({ title, status: btn.dataset.addCard, ownerName: this.myName, priority: 'Normal' });
        window.NexusApp?.showToast('Cartão criado.', 'success');
        await this.loadTabContent();
      });
    });
  },

  attachBoardDnd(container) {
    let draggedId = null;
    container.querySelectorAll('.report-board-card').forEach(card => {
      card.addEventListener('dragstart', () => { draggedId = card.dataset.itemId; card.style.opacity = '0.5'; });
      card.addEventListener('dragend', () => { card.style.opacity = '1'; });
    });
    container.querySelectorAll('.report-board-col').forEach(col => {
      col.addEventListener('dragover', e => e.preventDefault());
      col.addEventListener('drop', async e => {
        e.preventDefault();
        if (!draggedId) return;
        await this.saveItem({ status: col.dataset.status }, draggedId);
        await this.loadTabContent();
      });
    });
  },

  // ============ 4. RISCOS ============

  // Espelha o riskScore do Report Executivo: composto ponderado de 5 fatores,
  // cada um normalizado 0-1. Sem dado suficiente, o fator conta como 0 (não
  // penaliza nem beneficia) — mesma convenção usada lá para "gap de dado".
  computeRiskScore(item) {
    const now = new Date();
    const deadline = item.deadline ? new Date(item.deadline) : null;
    const daysLeft = deadline ? (deadline - now) / 86400000 : null;

    const overdueFactor = daysLeft !== null && daysLeft < 0 ? 1 : (daysLeft !== null && daysLeft < 3 ? 0.6 : 0);
    const priorityFactor = { alta: 1, média: 0.5, media: 0.5, baixa: 0.1 }[(item.priority || '').toLowerCase()] || 0.3;
    const noOwnerFactor = item.ownerName ? 0 : 0.7;
    const stalledFactor = (item.status || 'Backlog') === 'Backlog' && daysLeft !== null && daysLeft < 7 ? 0.5 : 0;
    const dataGapFactor = item.title && item.status ? 0 : 0.4;

    const weights = { overdueFactor: 0.35, priorityFactor: 0.2, noOwnerFactor: 0.2, stalledFactor: 0.15, dataGapFactor: 0.1 };
    const factors = { overdueFactor, priorityFactor, noOwnerFactor, stalledFactor, dataGapFactor };
    const score = Object.keys(weights).reduce((acc, k) => acc + factors[k] * weights[k], 0);

    let mainFactor = 'priorityFactor';
    let mainVal = -1;
    Object.entries(factors).forEach(([k, v]) => { const w = v * weights[k]; if (w > mainVal) { mainVal = w; mainFactor = k; } });

    return { score: Math.round(score * 100), mainFactor };
  },

  RISK_LABELS: {
    overdueFactor: 'Atraso',
    priorityFactor: 'Prioridade',
    noOwnerFactor: 'Sem responsável',
    stalledFactor: 'Parado',
    dataGapFactor: 'Dado incompleto'
  },

  riskBand(score) {
    if (score >= 70) return { label: 'Crítico', color: '#ef4444' };
    if (score >= 45) return { label: 'Alto', color: '#f59e0b' };
    if (score >= 20) return { label: 'Médio', color: '#eab308' };
    return { label: 'Baixo', color: '#22c55e' };
  },

  async renderRisks(container) {
    const active = this.items.filter(i => !i.archived);
    const scored = active
      .map(i => ({ ...i, risk: this.computeRiskScore(i) }))
      .sort((a, b) => b.risk.score - a.risk.score);

    container.innerHTML = `
      <div class="admin-section">
        <p class="page-description" style="margin-bottom:16px;">Fila ordenada por risco composto (atraso, prioridade, responsável, estagnação, dado incompleto).</p>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Score</th><th>Banda</th><th>Título</th><th>Fator principal</th><th>Responsável</th></tr></thead>
            <tbody>
              ${scored.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:24px;">Nenhuma frente ativa para avaliar.</td></tr>` : scored.map(i => {
                const band = this.riskBand(i.risk.score);
                return `
                <tr>
                  <td><strong>${i.risk.score}</strong></td>
                  <td><span style="color:${band.color};font-weight:600;">${band.label}</span></td>
                  <td>${this.escapeHtml(i.title || '(sem título)')}</td>
                  <td>${this.RISK_LABELS[i.risk.mainFactor]}</td>
                  <td>${this.escapeHtml(i.ownerName || '—')}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  // ============ 5. MELHORIAS ============

  IMPROVEMENT_STAGES: ['Solicitação', 'Triagem', 'Em execução', 'Implementado'],

  async loadImprovements() {
    try {
      const snap = await this.db.collection('process_improvements').orderBy('createdAt', 'desc').limit(300).get();
      this.improvements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[ReportExecutivo] process_improvements ainda vazio/sem acesso:', e.message);
      this.improvements = [];
    }
  },

  async renderImprovements(container) {
    await this.loadImprovements();
    const canEdit = this.canEdit();
    const funnel = this.IMPROVEMENT_STAGES.map(stage => ({
      stage,
      count: this.improvements.filter(m => (m.stage || 'Solicitação') === stage).length
    }));

    container.innerHTML = `
      <div class="admin-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <p class="page-description">Funil de melhoria de processo.</p>
          ${canEdit ? `<button class="btn btn-sm btn-primary" id="btn-new-improvement"><i class="fa-solid fa-plus"></i> Nova solicitação</button>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
          ${funnel.map(f => `
            <div class="card" style="padding:16px;text-align:center;">
              <div style="font-size:28px;font-weight:700;">${f.count}</div>
              <div style="color:var(--text-secondary);font-size:13px;">${f.stage}</div>
            </div>`).join('')}
        </div>
        <div id="improvement-form-slot"></div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Título</th><th>Estágio</th><th>Criticidade</th><th>Criado em</th>${canEdit ? '<th></th>' : ''}</tr></thead>
            <tbody>
              ${this.improvements.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:24px;">Nenhuma melhoria registrada.</td></tr>` : this.improvements.map(m => `
                <tr>
                  <td>${this.escapeHtml(m.title || '(sem título)')}</td>
                  <td>${this.escapeHtml(m.stage || 'Solicitação')}</td>
                  <td>${this.escapeHtml(m.criticality || '—')}</td>
                  <td>${this.fmtDate(m.createdAt)}</td>
                  ${canEdit ? `<td>
                    <select class="form-input" style="padding:4px;font-size:12px;" data-advance="${m.id}">
                      ${this.IMPROVEMENT_STAGES.map(s => `<option value="${s}" ${s === (m.stage || 'Solicitação') ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                  </td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('btn-new-improvement')?.addEventListener('click', () => this.showImprovementForm());
    container.querySelectorAll('[data-advance]').forEach(sel => {
      sel.addEventListener('change', async () => {
        const id = sel.dataset.advance;
        const newStage = sel.value;
        const before = this.improvements.find(m => m.id === id);
        await this.db.collection('process_improvements').doc(id).update({
          stage: newStage,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await this.db.collection('improvement_movements').add({
          improvementId: id,
          fromStage: before?.stage || 'Solicitação',
          toStage: newStage,
          movedBy: this.myUid,
          movedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        window.NexusApp?.showToast('Estágio atualizado.', 'success');
        await this.loadTabContent();
      });
    });
  },

  showImprovementForm() {
    const slot = document.getElementById('improvement-form-slot');
    if (!slot) return;
    slot.innerHTML = `
      <div class="card" style="padding:16px;margin-bottom:16px;">
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px;">
          <input type="text" class="form-input" id="imp-title" placeholder="Descrição da melhoria">
          <select class="form-input" id="imp-criticality">
            <option value="Baixa">Baixa</option>
            <option value="Média">Média</option>
            <option value="Alta">Alta</option>
          </select>
        </div>
        <button class="btn btn-primary btn-sm" id="imp-save">Salvar</button>
        <button class="btn btn-ghost btn-sm" id="imp-cancel">Cancelar</button>
      </div>`;
    document.getElementById('imp-cancel').addEventListener('click', () => { slot.innerHTML = ''; });
    document.getElementById('imp-save').addEventListener('click', async () => {
      const title = document.getElementById('imp-title').value.trim();
      const criticality = document.getElementById('imp-criticality').value;
      if (!title) {
        window.NexusApp?.showToast('Descreva a melhoria.', 'warning');
        return;
      }
      await this.db.collection('process_improvements').add({
        title, criticality, stage: 'Solicitação',
        requestedBy: this.myUid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      window.NexusApp?.showToast('Solicitação registrada.', 'success');
      slot.innerHTML = '';
      await this.loadTabContent();
    });
  },

  // ============ 6. CARTEIRA (Portfolio) ============

  portfolioSort: { key: 'updatedAt', dir: 'desc' },

  async renderPortfolio(container) {
    const canEdit = this.canEdit();
    const active = this.items.filter(i => !i.archived);
    const { key, dir } = this.portfolioSort;
    const sorted = [...active].sort((a, b) => {
      let av = a[key], bv = b[key];
      if (av?.toDate) av = av.toDate();
      if (bv?.toDate) bv = bv.toDate();
      if (av == null) av = '';
      if (bv == null) bv = '';
      const cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return dir === 'asc' ? cmp : -cmp;
    });

    // Agrupa por tag (equivalente simplificado ao rollup por subitem do
    // Report — sem uma hierarquia de subitens própria ainda, o agrupamento
    // usado aqui é por tag/categoria).
    const groups = {};
    sorted.forEach(i => {
      const g = i.tag || 'Sem categoria';
      (groups[g] = groups[g] || []).push(i);
    });

    const cols = [
      { key: 'title', label: 'Título' },
      { key: 'ownerName', label: 'Responsável' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Prioridade' },
      { key: 'deadline', label: 'Prazo' },
      { key: 'updatedAt', label: 'Atualizado' }
    ];

    container.innerHTML = `
      <div class="admin-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <p class="page-description">${active.length} frente(s) ativa(s), agrupadas por categoria.</p>
          <button class="btn btn-sm btn-secondary" id="btn-export-csv"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
        </div>
        ${Object.entries(groups).map(([group, rows]) => `
          <div style="margin-bottom:20px;">
            <div style="font-weight:600;margin-bottom:6px;">${this.escapeHtml(group)} <span style="opacity:.6;font-weight:400;">(${rows.length})</span></div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead><tr>${cols.map(c => `<th data-sort="${c.key}" style="cursor:pointer;">${c.label} ${key === c.key ? (dir === 'asc' ? '▲' : '▼') : ''}</th>`).join('')}</tr></thead>
                <tbody>
                  ${rows.map(i => `
                    <tr>
                      <td>${this.escapeHtml(i.title || '(sem título)')}</td>
                      <td>${this.escapeHtml(i.ownerName || '—')}</td>
                      <td>${this.escapeHtml(i.status || 'Backlog')}</td>
                      <td>${this.escapeHtml(i.priority || 'Normal')}</td>
                      <td>${this.fmtDate(i.deadline)}</td>
                      <td>${this.fmtDate(i.updatedAt)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('') || `<p style="text-align:center;color:var(--text-secondary);padding:24px;">Nenhuma frente ativa.</p>`}
      </div>`;

    container.querySelectorAll('[data-sort]').forEach(th => {
      th.addEventListener('click', async () => {
        const k = th.dataset.sort;
        this.portfolioSort = { key: k, dir: this.portfolioSort.key === k && this.portfolioSort.dir === 'asc' ? 'desc' : 'asc' };
        await this.loadTabContent();
      });
    });
    document.getElementById('btn-export-csv')?.addEventListener('click', () => this.exportPortfolioCsv(active));
  },

  exportPortfolioCsv(rows) {
    const header = ['Título', 'Responsável', 'Status', 'Prioridade', 'Prazo', 'Categoria'];
    const escapeCsv = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [header.join(',')];
    rows.forEach(i => {
      lines.push([i.title, i.ownerName, i.status, i.priority, this.fmtDate(i.deadline), i.tag].map(escapeCsv).join(','));
    });
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carteira-nep.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  // ============ 7. DASHBOARD ============

  async renderExecDashboard(container) {
    const active = this.items.filter(i => !i.archived);
    const now = new Date();

    const atrasados = active.filter(i => i.deadline && new Date(i.deadline) < now && (i.status || '') !== 'Concluído');
    const quaseVencendo = active.filter(i => {
      if (!i.deadline || (i.status || '') === 'Concluído') return false;
      const days = (new Date(i.deadline) - now) / 86400000;
      return days >= 0 && days <= 3;
    });
    const gapsDado = active.filter(i => !i.title || !i.status || !i.ownerName);
    const concluidos = active.filter(i => (i.status || '') === 'Concluído');

    const byOwner = {};
    active.forEach(i => {
      const o = i.ownerName || 'Sem responsável';
      byOwner[o] = (byOwner[o] || 0) + 1;
    });
    const ownerLoadSorted = Object.entries(byOwner).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxLoad = Math.max(1, ...ownerLoadSorted.map(([, n]) => n));

    container.innerHTML = `
      <div class="admin-section">
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px;">
          ${[
            { label: 'Ativos', value: active.length, color: 'var(--primary-500)' },
            { label: 'Atrasados', value: atrasados.length, color: '#ef4444' },
            { label: 'Quase vencendo', value: quaseVencendo.length, color: '#f59e0b' },
            { label: 'Gaps de dado', value: gapsDado.length, color: '#eab308' },
            { label: 'Concluídos', value: concluidos.length, color: '#22c55e' }
          ].map(k => `
            <div class="card" style="padding:16px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:${k.color};">${k.value}</div>
              <div style="color:var(--text-secondary);font-size:13px;">${k.label}</div>
            </div>`).join('')}
        </div>
        <div class="card" style="padding:16px;">
          <div style="font-weight:600;margin-bottom:12px;">Carga por responsável</div>
          ${ownerLoadSorted.length === 0 ? `<p style="color:var(--text-secondary);">Sem dados.</p>` : ownerLoadSorted.map(([owner, n]) => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:140px;font-size:13px;">${this.escapeHtml(owner)}</div>
              <div style="flex:1;background:var(--bg-secondary);border-radius:6px;overflow:hidden;height:16px;">
                <div style="width:${(n / maxLoad) * 100}%;background:var(--primary-500);height:100%;"></div>
              </div>
              <div style="width:24px;text-align:right;font-size:13px;">${n}</div>
            </div>`).join('')}
        </div>
      </div>`;
  },

  // ============ 8. MATERIAIS ============
  // Sem avaliação por IA (fallback determinístico): a nota composta é
  // calculada por uma média simples dos critérios da rubrica preenchidos
  // manualmente por quem avalia — mesmo cálculo 0-100 do Report, só sem
  // chamada a OpenAI/Ollama por trás.

  MATERIAL_CRITERIA: ['clareza', 'profundidade', 'aplicabilidade', 'atualidade'],

  async loadMaterials() {
    try {
      const snap = await this.db.collection('materials').orderBy('createdAt', 'desc').limit(300).get();
      this.materials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[ReportExecutivo] materials ainda vazio/sem acesso:', e.message);
      this.materials = [];
    }
  },

  materialComposite(m) {
    const vals = this.MATERIAL_CRITERIA.map(c => Number(m[c]) || 0).filter(v => v > 0);
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 20); // escala 1-5 -> 0-100
  },

  async renderMaterials(container) {
    await this.loadMaterials();
    const canManage = ['admin', 'diretor', 'superintendente', 'gerente', 'coordenador'].includes(this.myRoleKey);

    container.innerHTML = `
      <div class="admin-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <p class="page-description">Repositório de materiais com avaliação por rubrica (sem IA — nota calculada por critério manual).</p>
          ${canManage ? `<button class="btn btn-sm btn-primary" id="btn-new-material"><i class="fa-solid fa-plus"></i> Novo Material</button>` : ''}
        </div>
        <div id="material-form-slot"></div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Título</th><th>Link</th><th>Nota composta</th><th>Avaliado em</th></tr></thead>
            <tbody>
              ${this.materials.length === 0 ? `<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);padding:24px;">Nenhum material cadastrado.</td></tr>` : this.materials.map(m => {
                const score = this.materialComposite(m);
                return `
                <tr>
                  <td>${this.escapeHtml(m.title || '(sem título)')}</td>
                  <td>${m.url ? `<a href="${this.escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer">abrir</a>` : '—'}</td>
                  <td>${score === null ? '<span style="opacity:.6;">sem avaliação</span>' : `<strong>${score}</strong>/100`}</td>
                  <td>${this.fmtDate(m.createdAt)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('btn-new-material')?.addEventListener('click', () => this.showMaterialForm());
  },

  showMaterialForm() {
    const slot = document.getElementById('material-form-slot');
    if (!slot) return;
    slot.innerHTML = `
      <div class="card" style="padding:16px;margin-bottom:16px;">
        <div style="display:grid;grid-template-columns:2fr 2fr;gap:12px;margin-bottom:12px;">
          <input type="text" class="form-input" id="mat-title" placeholder="Título do material">
          <input type="url" class="form-input" id="mat-url" placeholder="Link (opcional)">
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px;">
          ${this.MATERIAL_CRITERIA.map(c => `
            <label style="font-size:12px;">${c[0].toUpperCase() + c.slice(1)} (1-5)
              <input type="number" class="form-input" id="mat-${c}" min="1" max="5" value="3">
            </label>`).join('')}
        </div>
        <button class="btn btn-primary btn-sm" id="mat-save">Salvar</button>
        <button class="btn btn-ghost btn-sm" id="mat-cancel">Cancelar</button>
      </div>`;
    document.getElementById('mat-cancel').addEventListener('click', () => { slot.innerHTML = ''; });
    document.getElementById('mat-save').addEventListener('click', async () => {
      const title = document.getElementById('mat-title').value.trim();
      if (!title) {
        window.NexusApp?.showToast('Dê um título ao material.', 'warning');
        return;
      }
      const data = { title, url: document.getElementById('mat-url').value.trim(), createdBy: this.myUid, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
      this.MATERIAL_CRITERIA.forEach(c => { data[c] = Number(document.getElementById(`mat-${c}`).value) || 0; });
      await this.db.collection('materials').add(data);
      window.NexusApp?.showToast('Material cadastrado.', 'success');
      slot.innerHTML = '';
      await this.loadTabContent();
    });
  },

  // ============ 9. MEU SCORECARD ============
  // Mediana do composto de materiais avaliados por mim + % de atingimento
  // da meta semanal de melhorias (equivalente simplificado ao Report, sem
  // scorecard_snapshots semanal ainda — calculado ao vivo sobre os dados
  // já carregados).

  IMPROVEMENT_WEEKLY_GOAL: 1,

  median(nums) {
    if (nums.length === 0) return null;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  },

  async renderScorecard(container) {
    await this.loadMaterials();
    await this.loadImprovements();

    const myMaterials = this.materials.filter(m => m.createdBy === this.myUid);
    const scores = myMaterials.map(m => this.materialComposite(m)).filter(s => s !== null);
    const medianScore = this.median(scores);

    const now = new Date();
    const weekAgo = new Date(now - 7 * 86400000);
    const myImprovementsThisWeek = this.improvements.filter(m => {
      if (m.requestedBy !== this.myUid) return false;
      const created = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
      return created >= weekAgo && (m.stage || '') === 'Implementado';
    });
    const goalPct = Math.min(100, Math.round((myImprovementsThisWeek.length / this.IMPROVEMENT_WEEKLY_GOAL) * 100));

    container.innerHTML = `
      <div class="admin-section">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
          <div class="card" style="padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:700;">${medianScore === null ? '—' : medianScore}</div>
            <div style="color:var(--text-secondary);font-size:13px;">Mediana de avaliação de materiais</div>
          </div>
          <div class="card" style="padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:700;">${goalPct}%</div>
            <div style="color:var(--text-secondary);font-size:13px;">Meta semanal de melhorias implementadas</div>
          </div>
          <div class="card" style="padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:700;">${myMaterials.length}</div>
            <div style="color:var(--text-secondary);font-size:13px;">Materiais cadastrados por mim</div>
          </div>
        </div>
        <p style="color:var(--text-secondary);font-size:13px;">
          Rollup de equipe (piso N≥5 contra reidentificação) chega na Fase 3, junto com a
          cadeia de gestores desnormalizada — hoje este scorecard mostra só o seu recorte individual.
        </p>
      </div>`;
  },

  // ============ 10. CAPACIDADE ============
  // Carga real por pessoa: soma horas de items ativos atribuídos + desconta
  // ausências da capacidade semanal cadastrada. Sem rotinas com horas/semana
  // ainda migradas para cá (o Rotina ADM do NEP é um módulo à parte), a
  // carga de rotina entra quando a aba Rotinas (abaixo) tiver adoção real.

  DEFAULT_WEEKLY_CAPACITY: 40,

  async loadAbsences() {
    try {
      const snap = await this.db.collection('absences').orderBy('startDate', 'desc').limit(200).get();
      this.absences = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[ReportExecutivo] absences ainda vazio/sem acesso:', e.message);
      this.absences = [];
    }
  },

  async loadActiveUsers() {
    try {
      const snap = await this.db.collection('users').where('status', '==', 'ATIVO').get();
      this.activeUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[ReportExecutivo] users ainda sem acesso:', e.message);
      this.activeUsers = [];
    }
  },

  isOnAbsenceToday(uid) {
    const today = new Date().toDateString();
    return (this.absences || []).some(a => a.personUid === uid
      && new Date(a.startDate) <= new Date(today)
      && new Date(a.endDate) >= new Date(today));
  },

  async renderCapacity(container) {
    await this.loadAbsences();
    await this.loadActiveUsers();
    const canManage = ['admin', 'superintendente'].includes(this.myRoleKey);
    const active = this.items.filter(i => !i.archived && (i.status || '') !== 'Concluído');

    const byOwner = {};
    active.forEach(i => {
      const o = i.ownerName || 'Sem responsável';
      byOwner[o] = (byOwner[o] || 0) + (Number(i.effortHours) || 4); // 4h é o "custo" padrão de uma frente sem estimativa própria
    });

    const rows = (this.activeUsers.length ? this.activeUsers.map(u => u.nome) : Object.keys(byOwner))
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map(name => {
        const user = this.activeUsers.find(u => u.nome === name);
        const capacity = user?.capacidade_semanal_horas || this.DEFAULT_WEEKLY_CAPACITY;
        const load = byOwner[name] || 0;
        const onLeave = user && this.isOnAbsenceToday(user.uid);
        const utilization = onLeave ? null : Math.round((load / capacity) * 100);
        return { name, load, capacity, utilization, onLeave };
      })
      .sort((a, b) => (b.utilization ?? -1) - (a.utilization ?? -1));

    const classify = u => u === null ? { label: 'Ausente', color: '#94a3b8' }
      : u >= 100 ? { label: 'Sobrecarregado', color: '#ef4444' }
      : u >= 70 ? { label: 'Saudável', color: '#22c55e' }
      : { label: 'Ocioso', color: '#eab308' };

    container.innerHTML = `
      <div class="admin-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <p class="page-description">Utilização real por pessoa (horas de frentes ativas ÷ capacidade semanal).</p>
          ${canManage ? `<button class="btn btn-sm btn-secondary" id="btn-new-absence"><i class="fa-solid fa-umbrella-beach"></i> Registrar ausência</button>` : ''}
        </div>
        <div id="absence-form-slot"></div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Pessoa</th><th>Carga (h/sem)</th><th>Capacidade</th><th>Utilização</th><th>Status</th></tr></thead>
            <tbody>
              ${rows.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:24px;">Sem dados de carga ainda.</td></tr>` : rows.map(r => {
                const band = classify(r.utilization);
                return `
                <tr>
                  <td>${this.escapeHtml(r.name)}</td>
                  <td>${r.load}h</td>
                  <td>${r.capacity}h</td>
                  <td>${r.utilization === null ? '—' : r.utilization + '%'}</td>
                  <td><span style="color:${band.color};font-weight:600;">${band.label}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('btn-new-absence')?.addEventListener('click', () => this.showAbsenceForm());
  },

  showAbsenceForm() {
    const slot = document.getElementById('absence-form-slot');
    if (!slot) return;
    slot.innerHTML = `
      <div class="card" style="padding:16px;margin-bottom:16px;">
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin-bottom:12px;">
          <select class="form-input" id="abs-person">
            ${(this.activeUsers || []).map(u => `<option value="${u.uid}" data-nome="${this.escapeHtml(u.nome)}">${this.escapeHtml(u.nome)}</option>`).join('')}
          </select>
          <input type="date" class="form-input" id="abs-start">
          <input type="date" class="form-input" id="abs-end">
        </div>
        <button class="btn btn-primary btn-sm" id="abs-save">Salvar</button>
        <button class="btn btn-ghost btn-sm" id="abs-cancel">Cancelar</button>
      </div>`;
    document.getElementById('abs-cancel').addEventListener('click', () => { slot.innerHTML = ''; });
    document.getElementById('abs-save').addEventListener('click', async () => {
      const sel = document.getElementById('abs-person');
      const personUid = sel.value;
      const personName = sel.selectedOptions[0]?.dataset.nome || '';
      const startDate = document.getElementById('abs-start').value;
      const endDate = document.getElementById('abs-end').value;
      if (!personUid || !startDate || !endDate) {
        window.NexusApp?.showToast('Preencha pessoa, início e fim.', 'warning');
        return;
      }
      await this.db.collection('absences').add({
        personUid, personName, startDate, endDate,
        createdBy: this.myUid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      window.NexusApp?.showToast('Ausência registrada.', 'success');
      slot.innerHTML = '';
      await this.loadTabContent();
    });
  },

  // ============ 11. RESUMO ESTRUTURA (admin/diretor/superintendente) ============
  // Rollup por unidade organizacional (gestor direto), usando gestor_uid —
  // cadeia_gestores permite estender para "toda a árvore" quando necessário,
  // mas o corte por unidade (gestor + subtime direto) já cobre o caso de uso
  // principal do Resumo Estrutura do Report.

  async renderDirectorSummary(container) {
    await this.loadActiveUsers();
    const active = this.items.filter(i => !i.archived);
    const now = new Date();

    const managers = this.activeUsers.filter(u => this.activeUsers.some(sub => sub.gestor_uid === u.uid));
    const units = managers.map(mgr => {
      const subNames = this.activeUsers.filter(u => u.gestor_uid === mgr.uid).map(u => u.nome);
      const unitItems = active.filter(i => subNames.includes(i.ownerName));
      const atrasados = unitItems.filter(i => i.deadline && new Date(i.deadline) < now && (i.status || '') !== 'Concluído');
      const emRisco = unitItems.filter(i => this.computeRiskScore(i).score >= 45);
      const critico = unitItems.filter(i => (i.priority || '').toLowerCase() === 'alta');
      return {
        gestor: mgr.nome, total: unitItems.length,
        abertos: unitItems.filter(i => (i.status || '') !== 'Concluído').length,
        atrasados: atrasados.length, emRisco: emRisco.length, critico: critico.length
      };
    }).sort((a, b) => b.atrasados - a.atrasados);

    container.innerHTML = `
      <div class="admin-section">
        <p class="page-description" style="margin-bottom:16px;">Foco por unidade organizacional, ranqueado por atenção necessária.</p>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Gestor</th><th>Total</th><th>Abertos</th><th>Atrasados</th><th>Em risco</th><th>Prioridade crítica</th></tr></thead>
            <tbody>
              ${units.length === 0 ? `<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:24px;">Nenhuma unidade com subordinados diretos e frentes atribuídas.</td></tr>` : units.map(u => `
                <tr>
                  <td>${this.escapeHtml(u.gestor)}</td>
                  <td>${u.total}</td>
                  <td>${u.abertos}</td>
                  <td style="${u.atrasados > 0 ? 'color:#ef4444;font-weight:600;' : ''}">${u.atrasados}</td>
                  <td style="${u.emRisco > 0 ? 'color:#f59e0b;font-weight:600;' : ''}">${u.emRisco}</td>
                  <td>${u.critico}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  // ============ 12. ROTINAS + LISTA PESSOAL ============

  async loadRoutines() {
    try {
      const snap = await this.db.collection('routines').where('active', '==', true).get();
      this.routines = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[ReportExecutivo] routines ainda vazio/sem acesso:', e.message);
      this.routines = [];
    }
  },

  async loadPersonalTasks() {
    try {
      // Sem orderBy composto de propósito (evita depender de um índice
      // composto userId+order só pra isso) — ordena no cliente, a lista é
      // sempre pequena (afazeres de um dia).
      const snap = await this.db.collection('personal_tasks')
        .where('userId', '==', this.myUid).limit(50).get();
      this.personalTasks = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (e) {
      console.warn('[ReportExecutivo] personal_tasks ainda vazio/sem acesso:', e.message);
      this.personalTasks = [];
    }
  },

  async renderRoutines(container) {
    await this.loadRoutines();
    await this.loadPersonalTasks();
    const canManage = ['admin', 'diretor', 'superintendente', 'gerente', 'coordenador'].includes(this.myRoleKey);
    const mine = this.routines.filter(r => r.assigneeUid === this.myUid);

    container.innerHTML = `
      <div class="admin-section" style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <p class="page-description">Rotinas de processo atribuídas por gestão (${canManage ? 'todas' : 'suas'}).</p>
            ${canManage ? `<button class="btn btn-sm btn-primary" id="btn-new-routine"><i class="fa-solid fa-plus"></i> Nova Rotina</button>` : ''}
          </div>
          <div id="routine-form-slot"></div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Rotina</th><th>Responsável</th><th>Recorrência</th></tr></thead>
              <tbody>
                ${(canManage ? this.routines : mine).length === 0 ? `<tr><td colspan="3" style="text-align:center;color:var(--text-secondary);padding:24px;">Nenhuma rotina cadastrada.</td></tr>` : (canManage ? this.routines : mine).map(r => `
                  <tr><td>${this.escapeHtml(r.title)}</td><td>${this.escapeHtml(r.assigneeName || '—')}</td><td>${this.escapeHtml(r.recurrence || '—')}</td></tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <p class="page-description" style="margin-bottom:16px;">
            Minha lista pessoal do dia — <strong>estritamente privada</strong>: nem gestor, nem diretor,
            nem admin veem esta lista (mesma regra do Report Executivo).
          </p>
          <div id="personal-list">
            ${this.personalTasks.length === 0 ? `<p style="color:var(--text-secondary);">Sem itens hoje.</p>` : this.personalTasks.map(t => `
              <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-color);">
                <input type="checkbox" data-toggle-task="${t.id}" ${t.done ? 'checked' : ''}>
                <span style="${t.done ? 'text-decoration:line-through;opacity:.6;' : ''}">${this.escapeHtml(t.text)}</span>
              </div>
            `).join('')}
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <input type="text" class="form-input" id="new-personal-task" placeholder="Novo item da lista de hoje">
            <button class="btn btn-sm btn-primary" id="btn-add-personal-task">+</button>
          </div>
        </div>
      </div>`;

    if (canManage) document.getElementById('btn-new-routine')?.addEventListener('click', () => this.showRoutineForm());
    container.querySelectorAll('[data-toggle-task]').forEach(cb => {
      cb.addEventListener('change', async () => {
        await this.db.collection('personal_tasks').doc(cb.dataset.toggleTask).update({
          done: cb.checked,
          concluida_em: cb.checked ? firebase.firestore.FieldValue.serverTimestamp() : null
        });
        await this.loadTabContent();
      });
    });
    document.getElementById('btn-add-personal-task')?.addEventListener('click', async () => {
      const input = document.getElementById('new-personal-task');
      const text = input.value.trim();
      if (!text) return;
      await this.db.collection('personal_tasks').add({
        userId: this.myUid, text, done: false,
        order: this.personalTasks.length,
        dia: new Date().toISOString().slice(0, 10),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await this.loadTabContent();
    });
  },

  showRoutineForm() {
    const slot = document.getElementById('routine-form-slot');
    if (!slot) return;
    slot.innerHTML = `
      <div class="card" style="padding:16px;margin-bottom:16px;">
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin-bottom:12px;">
          <input type="text" class="form-input" id="rt-title" placeholder="Título da rotina">
          <select class="form-input" id="rt-assignee">
            ${(this.activeUsers || []).map(u => `<option value="${u.uid}" data-nome="${this.escapeHtml(u.nome)}">${this.escapeHtml(u.nome)}</option>`).join('')}
          </select>
          <select class="form-input" id="rt-recurrence">
            <option value="Diário">Diário</option>
            <option value="Semanal">Semanal</option>
            <option value="Quinzenal">Quinzenal</option>
            <option value="Mensal">Mensal</option>
          </select>
        </div>
        <button class="btn btn-primary btn-sm" id="rt-save">Salvar</button>
        <button class="btn btn-ghost btn-sm" id="rt-cancel">Cancelar</button>
      </div>`;
    document.getElementById('rt-cancel').addEventListener('click', () => { slot.innerHTML = ''; });
    document.getElementById('rt-save').addEventListener('click', async () => {
      const title = document.getElementById('rt-title').value.trim();
      const sel = document.getElementById('rt-assignee');
      if (!title || !sel.value) {
        window.NexusApp?.showToast('Preencha título e responsável.', 'warning');
        return;
      }
      await this.db.collection('routines').add({
        title, assigneeUid: sel.value, assigneeName: sel.selectedOptions[0]?.dataset.nome || '',
        recurrence: document.getElementById('rt-recurrence').value,
        active: true, createdBy: this.myUid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      window.NexusApp?.showToast('Rotina criada.', 'success');
      slot.innerHTML = '';
      await this.loadTabContent();
    });
  },

  // ============ 13. OKRs GERENTES ============
  // Sem IA (sugestão de FCA é fallback determinístico: texto-modelo a
  // partir do maior gap entre meta e realizado, sem chamar OpenAI/Ollama).

  OKR_CYCLE_FCA_THRESHOLD: 0.85,

  async loadOkrs() {
    try {
      const [obj, tgt, meas] = await Promise.all([
        this.db.collection('okr_objectives').get(),
        this.db.collection('okr_targets').get(),
        this.db.collection('okr_measurements').orderBy('date', 'desc').limit(500).get()
      ]);
      this.okrObjectives = obj.docs.map(d => ({ id: d.id, ...d.data() }));
      this.okrTargets = tgt.docs.map(d => ({ id: d.id, ...d.data() }));
      this.okrMeasurements = meas.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[ReportExecutivo] okr_* ainda vazio/sem acesso:', e.message);
      this.okrObjectives = []; this.okrTargets = []; this.okrMeasurements = [];
    }
  },

  okrAchievement(target) {
    const measurements = this.okrMeasurements.filter(m => m.targetId === target.id);
    if (measurements.length === 0 || !target.targetValue) return null;
    const latest = measurements[0].value;
    return Math.round((latest / target.targetValue) * 100);
  },

  fcaSuggestion(objective, targets) {
    // Fallback determinístico: aponta o KR com maior gap e sugere uma ação
    // genérica orientada ao tipo de gap — sem IA por trás.
    const withAch = targets.map(t => ({ t, ach: this.okrAchievement(t) })).filter(x => x.ach !== null);
    if (withAch.length === 0) return 'Sem medições suficientes para sugerir causa/ação.';
    const worst = withAch.sort((a, b) => a.ach - b.ach)[0];
    return `Maior gap: "${worst.t.title}" em ${worst.ach}% da meta. Causa provável: ritmo de execução abaixo do necessário para o trimestre. Ação sugerida: revisar em 1:1 semanal até recuperar ≥85%.`;
  },

  async renderOkrs(container) {
    await this.loadOkrs();
    const canManage = ['admin', 'diretor', 'superintendente', 'gerente'].includes(this.myRoleKey);
    const label = canManage ? 'OKRs Gerentes' : 'Meu OKR';
    const myObjectives = canManage ? this.okrObjectives : this.okrObjectives.filter(o => o.ownerUid === this.myUid);

    container.innerHTML = `
      <div class="admin-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <p class="page-description">${label} — ciclo de objetivos e resultados-chave.</p>
          ${canManage ? `<button class="btn btn-sm btn-primary" id="btn-new-objective"><i class="fa-solid fa-plus"></i> Novo Objetivo</button>` : ''}
        </div>
        <div id="okr-form-slot"></div>
        ${myObjectives.length === 0 ? `<p style="text-align:center;color:var(--text-secondary);padding:24px;">Nenhum objetivo cadastrado.</p>` : myObjectives.map(o => {
          const targets = this.okrTargets.filter(t => t.objectiveId === o.id);
          const achievements = targets.map(t => this.okrAchievement(t)).filter(a => a !== null);
          const avgAch = achievements.length ? Math.round(achievements.reduce((a, b) => a + b, 0) / achievements.length) : null;
          const needsFca = avgAch !== null && avgAch / 100 < this.OKR_CYCLE_FCA_THRESHOLD;
          return `
          <div class="card" style="padding:16px;margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong>${this.escapeHtml(o.title)}</strong>
              <span style="color:${avgAch === null ? 'var(--text-secondary)' : avgAch >= 85 ? '#22c55e' : avgAch >= 60 ? '#f59e0b' : '#ef4444'};font-weight:700;">${avgAch === null ? '—' : avgAch + '%'}</span>
            </div>
            <div style="font-size:12px;color:var(--text-secondary);margin:4px 0 10px;">${this.escapeHtml(o.ownerName || '')} · ${this.escapeHtml(o.quarter || '')}</div>
            <table class="data-table" style="margin-bottom:8px;">
              <thead><tr><th>Resultado-chave</th><th>Meta</th><th>Atingimento</th></tr></thead>
              <tbody>
                ${targets.map(t => `<tr><td>${this.escapeHtml(t.title)}</td><td>${t.targetValue ?? '—'} ${this.escapeHtml(t.unit || '')}</td><td>${this.okrAchievement(t) ?? '—'}${this.okrAchievement(t) !== null ? '%' : ''}</td></tr>`).join('') || '<tr><td colspan="3" style="color:var(--text-secondary);">Sem resultados-chave.</td></tr>'}
              </tbody>
            </table>
            ${needsFca ? `<div class="alert" style="padding:10px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:8px;font-size:13px;"><strong>FCA sugerido (sem IA):</strong> ${this.fcaSuggestion(o, targets)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>`;

    document.getElementById('btn-new-objective')?.addEventListener('click', () => this.showObjectiveForm());
  },

  showObjectiveForm() {
    const slot = document.getElementById('okr-form-slot');
    if (!slot) return;
    slot.innerHTML = `
      <div class="card" style="padding:16px;margin-bottom:16px;">
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px;">
          <input type="text" class="form-input" id="okr-title" placeholder="Objetivo">
          <input type="text" class="form-input" id="okr-quarter" placeholder="Trimestre (ex: Q3 2026)">
        </div>
        <button class="btn btn-primary btn-sm" id="okr-save">Salvar</button>
        <button class="btn btn-ghost btn-sm" id="okr-cancel">Cancelar</button>
      </div>`;
    document.getElementById('okr-cancel').addEventListener('click', () => { slot.innerHTML = ''; });
    document.getElementById('okr-save').addEventListener('click', async () => {
      const title = document.getElementById('okr-title').value.trim();
      if (!title) {
        window.NexusApp?.showToast('Descreva o objetivo.', 'warning');
        return;
      }
      await this.db.collection('okr_objectives').add({
        title, quarter: document.getElementById('okr-quarter').value.trim(),
        ownerUid: this.myUid, ownerName: this.myName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      window.NexusApp?.showToast('Objetivo criado.', 'success');
      slot.innerHTML = '';
      await this.loadTabContent();
    });
  },

  // ============ 14. EXECUTIVO ============
  // Boletim semanal: fallback determinístico (texto gerado por template a
  // partir dos números da carteira), sem chamar IA — mesma convenção usada
  // em Materiais/OKRs.

  async loadExecutiveDecisions() {
    try {
      const snap = await this.db.collection('executive_decisions').orderBy('createdAt', 'desc').limit(100).get();
      this.executiveDecisions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[ReportExecutivo] executive_decisions ainda vazio/sem acesso:', e.message);
      this.executiveDecisions = [];
    }
  },

  generateWeeklyBulletinFallback() {
    const active = this.items.filter(i => !i.archived);
    const now = new Date();
    const atrasados = active.filter(i => i.deadline && new Date(i.deadline) < now && (i.status || '') !== 'Concluído').length;
    const concluidos = active.filter(i => (i.status || '') === 'Concluído').length;
    const criticos = active.filter(i => this.computeRiskScore(i).score >= 70).length;
    return `Carteira com ${active.length} frente(s) ativa(s): ${concluidos} concluída(s) na janela, `
      + `${atrasados} atrasada(s) e ${criticos} em risco crítico. `
      + (criticos > 0 ? 'Recomenda-se priorizar as frentes críticas antes de abrir novas.' : 'Carteira sob controle, sem foco crítico pendente.');
  },

  async renderExecutive(container) {
    await this.loadExecutiveDecisions();
    const canManage = ['admin', 'diretor', 'superintendente', 'gerente'].includes(this.myRoleKey);
    const active = this.items.filter(i => !i.archived);
    const scoredCritical = active.map(i => ({ ...i, risk: this.computeRiskScore(i) })).filter(i => i.risk.score >= 70);

    container.innerHTML = `
      <div class="admin-section">
        <div class="card" style="padding:16px;margin-bottom:20px;">
          <div style="font-weight:600;margin-bottom:8px;">Boletim semanal (sem IA — gerado por template)</div>
          <p style="color:var(--text-secondary);">${this.generateWeeklyBulletinFallback()}</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div>
            <div style="font-weight:600;margin-bottom:8px;">Frentes críticas (score de risco ≥ 70)</div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead><tr><th>Título</th><th>Responsável</th><th>Score</th></tr></thead>
                <tbody>
                  ${scoredCritical.length === 0 ? `<tr><td colspan="3" style="text-align:center;color:var(--text-secondary);padding:16px;">Nenhuma no momento.</td></tr>` : scoredCritical.map(i => `
                    <tr><td>${this.escapeHtml(i.title)}</td><td>${this.escapeHtml(i.ownerName || '—')}</td><td>${i.risk.score}</td></tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div style="font-weight:600;">Decisões executivas</div>
              ${canManage ? `<button class="btn btn-sm btn-primary" id="btn-new-decision">+ Nova</button>` : ''}
            </div>
            <div id="decision-form-slot"></div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead><tr><th>Decisão</th><th>Status</th><th>Prazo</th></tr></thead>
                <tbody>
                  ${(this.executiveDecisions || []).length === 0 ? `<tr><td colspan="3" style="text-align:center;color:var(--text-secondary);padding:16px;">Nenhuma decisão registrada.</td></tr>` : this.executiveDecisions.map(d => `
                    <tr><td>${this.escapeHtml(d.title)}</td><td>${this.escapeHtml(d.status || 'aberta')}</td><td>${this.fmtDate(d.deadline)}</td></tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('btn-new-decision')?.addEventListener('click', () => this.showDecisionForm());
  },

  showDecisionForm() {
    const slot = document.getElementById('decision-form-slot');
    if (!slot) return;
    slot.innerHTML = `
      <div class="card" style="padding:12px;margin-bottom:12px;">
        <input type="text" class="form-input" id="dec-title" placeholder="Descrição da decisão" style="margin-bottom:8px;">
        <input type="date" class="form-input" id="dec-deadline" style="margin-bottom:8px;">
        <button class="btn btn-primary btn-sm" id="dec-save">Salvar</button>
        <button class="btn btn-ghost btn-sm" id="dec-cancel">Cancelar</button>
      </div>`;
    document.getElementById('dec-cancel').addEventListener('click', () => { slot.innerHTML = ''; });
    document.getElementById('dec-save').addEventListener('click', async () => {
      const title = document.getElementById('dec-title').value.trim();
      if (!title) {
        window.NexusApp?.showToast('Descreva a decisão.', 'warning');
        return;
      }
      await this.db.collection('executive_decisions').add({
        title, status: 'aberta',
        deadline: document.getElementById('dec-deadline').value || null,
        createdBy: this.myUid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      window.NexusApp?.showToast('Decisão registrada.', 'success');
      slot.innerHTML = '';
      await this.loadTabContent();
    });
  },

  // ============ 15. DESENVOLVIMENTO ============
  // PDI + 1:1 com ações de acompanhamento (aderência) completos. Perfil
  // Vértice (avaliação situacional de 108 itens do Report) ainda NÃO tem
  // conteúdo portado aqui: a exploração da arquitetura não achou as tabelas
  // de persistência do banco de itens no Supabase do Report (provável fonte
  // Drizzle separada, fora do que foi investigado) — precisa confirmar com
  // quem mantém o Report Executivo antes de portar as 108 perguntas e o
  // motor de scoring com fidelidade. O restante da aba (PDI, atas de 1:1)
  // está completo e funcional.

  async loadPdis() {
    try {
      const snap = await this.db.collection('user_pdis').where('userId', '==', this.myUid).limit(1).get();
      this.myPdi = snap.docs[0] ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null;
    } catch (e) {
      console.warn('[ReportExecutivo] user_pdis ainda vazio/sem acesso:', e.message);
      this.myPdi = null;
    }
  },

  async loadOneOnOnes() {
    try {
      // Sem orderBy composto (evita índice composto collaboratorUid+date) —
      // ordena no cliente, volume por pessoa é sempre pequeno.
      const snap = await this.db.collection('one_on_ones')
        .where('collaboratorUid', '==', this.myUid).limit(20).get();
      this.myOneOnOnes = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    } catch (e) {
      console.warn('[ReportExecutivo] one_on_ones ainda vazio/sem acesso:', e.message);
      this.myOneOnOnes = [];
    }
  },

  oneOnOneAdherence(oneOnOne) {
    const actions = oneOnOne.actions || [];
    if (actions.length === 0) return null;
    return Math.round((actions.filter(a => a.done).length / actions.length) * 100);
  },

  async renderDevelopment(container) {
    await this.loadPdis();
    await this.loadOneOnOnes();
    const goals = this.myPdi?.goals || [];

    container.innerHTML = `
      <div class="admin-section" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div style="font-weight:600;">Meu PDI</div>
            <button class="btn btn-sm btn-primary" id="btn-add-goal">+ Meta</button>
          </div>
          ${goals.length === 0 ? `<p style="color:var(--text-secondary);">Nenhuma meta cadastrada ainda.</p>` : goals.map((g, idx) => `
            <div class="card" style="padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
              <span>${this.escapeHtml(g.text)}</span>
              <input type="checkbox" data-goal-idx="${idx}" ${g.done ? 'checked' : ''}>
            </div>`).join('')}
        </div>
        <div>
          <div style="font-weight:600;margin-bottom:12px;">Minhas atas de 1:1</div>
          ${this.myOneOnOnes.length === 0 ? `<p style="color:var(--text-secondary);">Nenhuma ata registrada.</p>` : this.myOneOnOnes.map(o => {
            const adh = this.oneOnOneAdherence(o);
            return `
            <div class="card" style="padding:12px;margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;">
                <strong>${this.fmtDate(o.date)}</strong>
                ${adh !== null ? `<span style="color:${adh >= 70 ? '#22c55e' : '#f59e0b'};">${adh}% aderência</span>` : ''}
              </div>
              <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">${this.escapeHtml(o.notes || '')}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="grid-column:1/-1;">
          <div class="alert" style="padding:12px;background:rgba(148,163,184,.1);border:1px solid rgba(148,163,184,.3);border-radius:8px;font-size:13px;color:var(--text-secondary);">
            <strong>Perfil Vértice:</strong> avaliação situacional de 108 itens do Report Executivo ainda não portada —
            depende do banco de perguntas original, não localizado na exploração da arquitetura. PDI e atas de 1:1 acima já
            funcionam de ponta a ponta.
          </div>
        </div>
      </div>`;

    document.getElementById('btn-add-goal')?.addEventListener('click', async () => {
      const text = prompt('Descreva a meta de desenvolvimento:');
      if (!text) return;
      const newGoals = [...goals, { text, done: false }];
      if (this.myPdi) {
        await this.db.collection('user_pdis').doc(this.myPdi.id).update({ goals: newGoals, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      } else {
        await this.db.collection('user_pdis').add({ userId: this.myUid, goals: newGoals, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      }
      window.NexusApp?.showToast('Meta adicionada.', 'success');
      await this.loadTabContent();
    });

    container.querySelectorAll('[data-goal-idx]').forEach(cb => {
      cb.addEventListener('change', async () => {
        const idx = Number(cb.dataset.goalIdx);
        const newGoals = [...goals];
        newGoals[idx] = { ...newGoals[idx], done: cb.checked };
        await this.db.collection('user_pdis').doc(this.myPdi.id).update({ goals: newGoals, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        await this.loadTabContent();
      });
    });
  }
};

window.NexusReportExecutivo = NexusReportExecutivo;
