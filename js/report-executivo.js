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
      { id: 'portfolio', icon: 'fa-layer-group', label: 'Carteira', soon: true },
      { id: 'exec-dashboard', icon: 'fa-gauge-high', label: 'Dashboard', soon: true },
      { id: 'scorecard', icon: 'fa-clipboard-check', label: 'Meu Scorecard', soon: true },
      { id: 'materials', icon: 'fa-photo-film', label: 'Materiais', soon: true },
      { id: 'capacity', icon: 'fa-users-gear', label: 'Capacidade', soon: true },
      { id: 'director-summary', icon: 'fa-sitemap', label: 'Resumo Estrutura', soon: true },
      { id: 'routines', icon: 'fa-list-check', label: 'Rotinas', soon: true },
      { id: 'okrs', icon: 'fa-bullseye', label: 'OKRs Gerentes', soon: true },
      { id: 'executive', icon: 'fa-briefcase', label: 'Executivo', soon: true },
      { id: 'development', icon: 'fa-seedling', label: 'Desenvolvimento', soon: true }
    ];

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
  }
};

window.NexusReportExecutivo = NexusReportExecutivo;
