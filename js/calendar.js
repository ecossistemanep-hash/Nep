/**
 * NEXUS PLATFORM - AGENDAS EXECUTIVAS
 * Sistema de Agendas Executivas com Geração de Ata por IA (Perplexity)
 * Migrado para Supabase
 */

const NexusCalendar = {
  agendas: [],
  view: 'dashboard',
  step: 1,
  agendaId: null,
  tab: 'participantes',
  generating: false,
  showArchived: false,

  formData: { title: '', date: '', type: 'Operacional', responsible: '', participants: [] },

  TYPES: ['Financeira', 'Batimento de Material', 'R&R', 'Monitoramento de Qualidade', 'Treinamento', 'Operacional', 'Cliente'],
  ROLES: ['Gestor', 'Analista', 'Cliente', 'Treinamento', 'Outro'],
  // Chave configurada pelo admin (ver window.getPplxApiKey em js/app.js). Nunca hardcode aqui.
  get PERPLEXITY_API_KEY() { return window.getPplxApiKey ? window.getPplxApiKey() : ''; },

  async init() {
    console.log('[Agendas] Inicializando módulo (Supabase)...');

    // Carregar CSS dedicado
    if (!document.getElementById('css-executive-agenda')) {
      const link = document.createElement('link');
      link.id = 'css-executive-agenda';
      link.rel = 'stylesheet';
      link.href = 'css/executive-agenda.css';
      document.head.appendChild(link);
    }

    await this.loadAgendas();
  },

  async loadAgendas() {
    try {
      const { data, error } = await window.supabaseClient
        .from('agendas')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      this.agendas = data || [];
      console.log('[Agendas] Dados carregados:', this.agendas.length);
      this.renderView();
    } catch (error) {
      console.error('[Agendas] Erro ao carregar:', error);
      NexusApp?.showToast?.('Erro ao carregar agendas: ' + error.message, 'error');
    }
  },

  render(container) {
    this.container = container || document.getElementById('page-content');
    if (!this.container) return;
    this.init();
    this.renderView();
  },

  renderView() {
    if (!this.container) this.container = document.getElementById('page-content');
    if (!this.container) return;
    this.container.innerHTML = `<div class="exec-agenda">${this.getView()}</div>`;
    this.bind();
  },

  reRender() {
    this.renderView();
  },

  async save(agendaData) {
    try {
      if (agendaData) {
        // Create new (INSERT)
        // Remover campos undefined ou funções antes de enviar
        const payload = JSON.parse(JSON.stringify(agendaData));

        const { data, error } = await window.supabaseClient
          .from('agendas')
          .insert([payload])
          .select();

        if (error) throw error;

        NexusApp?.showToast?.('Agenda criada com sucesso!', 'success');
        await this.loadAgendas(); // Recarrega para ter o ID correto
      } else {
        // Update current (UPDATE)
        const a = this.agendas.find(x => x.id === this.agendaId);
        if (a) {
          const payload = {
            title: a.title,
            date: a.date,
            responsible: a.responsible,
            type: a.type,
            status: a.status,
            archived: a.archived,
            minute: a.minute,
            participants: a.participants,
            execution: a.execution,
            decisions: a.decisions,
            pendencies: a.pendencies,
            updated_at: new Date().toISOString()
          };

          const { error } = await window.supabaseClient
            .from('agendas')
            .update(payload)
            .eq('id', a.id);

          if (error) throw error;
          // Não precisa recarregar tudo, pois o objeto local 'a' já foi atualizado por referência nos métodos de manipulação,
          // mas é bom confirmar o save.
          console.log('Agenda salva com sucesso');
        }
      }
    } catch (e) {
      console.error('Erro ao salvar agenda:', e);
      NexusApp?.showToast?.('Erro ao salvar: ' + e.message, 'error');
    }
  },

  getView() {
    switch (this.view) {
      case 'new': return this.viewNew();
      case 'execution': return this.viewExecution();
      default: return this.viewDashboard();
    }
  },

  // ========== DASHBOARD ==========
  viewDashboard() {
    const active = this.agendas.filter(a => !a.archived);
    const archived = this.agendas.filter(a => a.archived);
    const list = this.showArchived ? archived : active;

    const realized = active.filter(a => a.status === 'Realizada').length;
    const planned = active.filter(a => a.status === 'Planejada').length;
    const pending = active.reduce((s, a) => s + (a.pendencies?.length || 0), 0);

    return `
      <header class="ea-header">
        <div>
          <h2 class="ea-title">📅 Agendas Executivas</h2>
          <p class="ea-subtitle">Gerencie reuniões e gere atas profissionais com IA.</p>
        </div>
        <div class="ea-header-actions">
          <button class="ea-btn-export" id="btn-export"><i class="fa-solid fa-download"></i> Exportar Tudo</button>
          <button class="ea-btn-archive-toggle" id="btn-toggle-archived">
            <i class="fa-solid fa-${this.showArchived ? 'folder-open' : 'box-archive'}"></i> 
            ${this.showArchived ? 'Ver Ativas' : 'Ver Arquivadas'} (${archived.length})
          </button>
        </div>
      </header>

      <div class="ea-kpis">
        <div class="ea-kpi"><span class="ea-kpi-label">REALIZADAS</span><div class="ea-kpi-value">${realized}</div></div>
        <div class="ea-kpi primary"><span class="ea-kpi-label">PLANEJADAS</span><div class="ea-kpi-value">${planned}</div></div>
        <div class="ea-kpi success"><span class="ea-kpi-label">EFICIÊNCIA</span><div class="ea-kpi-value">${realized > 0 ? Math.round((realized / (realized + planned)) * 100) : 0}%</div></div>
        <div class="ea-kpi warning"><span class="ea-kpi-label">PENDÊNCIAS</span><div class="ea-kpi-value">${pending}</div></div>
      </div>

      <div class="ea-card">
        <div class="ea-card-header">
          <h3>${this.showArchived ? 'Agendas Arquivadas' : 'Próximas Agendas'}</h3>
          ${!this.showArchived ? '<button class="btn-new-agenda" id="btn-new"><i class="fa-solid fa-plus"></i> Nova Agenda</button>' : ''}
        </div>
        ${list.length === 0 ? `
          <div class="ea-empty">
            <span class="ea-empty-icon">${this.showArchived ? '📦' : '📅'}</span>
            <p>${this.showArchived ? 'Nenhuma agenda arquivada.' : 'Nenhuma agenda encontrada. Comece planejando sua semana.'}</p>
          </div>
        ` : `
          <div class="ea-list">
            ${list.map(a => `
              <div class="ea-item" data-id="${a.id}">
                <div class="ea-item-date">
                  <span class="ea-month">${new Date(a.date).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                  <span class="ea-day">${new Date(a.date).getDate()}</span>
                </div>
                <div class="ea-item-info">
                  <h4>${a.title}</h4>
                  <div class="ea-item-meta">
                    <span><i class="fa-regular fa-clock"></i> ${new Date(a.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span><i class="fa-regular fa-user"></i> ${a.responsible}</span>
                    <span>${a.type}</span>
                    ${a.minute ? '<span class="ea-has-ata"><i class="fa-solid fa-file-lines"></i> Ata</span>' : ''}
                  </div>
                </div>
                <div class="ea-item-right">
                  <span class="ea-status ea-status-${(a.status || 'planejada').toLowerCase()}">${a.status || 'Planejada'}</span>
                   <button class="ea-btn-icon ea-btn-archive" data-archive="${a.id}" title="${a.archived ? 'Desarquivar' : 'Arquivar'}">
                    <i class="fa-solid fa-${a.archived ? 'folder-open' : 'box-archive'}"></i>
                  </button>
                  <button class="ea-arrow" data-exec="${a.id}"><i class="fa-solid fa-arrow-right"></i></button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  },

  // ========== NEW AGENDA ==========
  viewNew() {
    return `
      <header class="ea-header">
        <div>
          <h2 class="ea-title">📝 Nova Agenda</h2>
          <p class="ea-subtitle">Configure sua reunião para gerar atas profissionais com IA.</p>
        </div>
      </header>

      <div class="ea-progress">
        ${[1, 2, 3].map(s => `<div class="ea-progress-bar ${s <= this.step ? 'active' : ''}"></div>`).join('')}
      </div>

      <div class="ea-form-card">
        <div class="ea-form-body">${this.step === 1 ? this.step1() : this.step === 2 ? this.step2() : this.step3()}</div>
        <div class="ea-form-footer">
          ${this.step > 1 ? `<button class="ea-btn-ghost" id="btn-back"><i class="fa-solid fa-arrow-left"></i> Voltar</button>` : `<button class="ea-btn-ghost" id="btn-cancel">Cancelar</button>`}
          ${this.step < 3 ? `<button class="ea-btn-primary" id="btn-next">Próximo <i class="fa-solid fa-chevron-right"></i></button>` : `<button class="ea-btn-success" id="btn-confirm"><i class="fa-solid fa-check"></i> Confirmar Agenda</button>`}
        </div>
      </div>
    `;
  },

  step1() {
    return `
      <h3><i class="fa-regular fa-calendar"></i> Dados da Agenda</h3>
      <div class="ea-field">
        <label>Título da Reunião</label>
        <input type="text" id="f-title" value="${this.formData.title}" placeholder="Ex: Batimento de Metas Q1">
      </div>
      <div class="ea-row">
        <div class="ea-field"><label>Data e Hora</label><input type="datetime-local" id="f-date" value="${this.formData.date}"></div>
        <div class="ea-field"><label>Responsável</label><input type="text" id="f-resp" value="${this.formData.responsible}" placeholder="Nome do owner"></div>
      </div>
      <div class="ea-field">
        <label>Tipo de Agenda</label>
        <select id="f-type">${this.TYPES.map(t => `<option value="${t}" ${this.formData.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </div>
    `;
  },

  step2() {
    return `
      <h3><i class="fa-solid fa-users"></i> Participantes</h3>
      <div class="ea-add-row">
        <input type="text" id="p-name" placeholder="Nome do participante">
        <select id="p-role">${this.ROLES.map(r => `<option value="${r}">${r}</option>`).join('')}</select>
        <button class="ea-btn-primary" id="btn-add-p">Adicionar</button>
      </div>
      <div class="ea-participants">
        ${this.formData.participants.length === 0 ? '<p class="ea-no-p">Nenhum participante adicionado.</p>' : this.formData.participants.map(p => `
          <div class="ea-p-item">
            <div class="ea-p-avatar">${p.name.charAt(0)}</div>
            <div class="ea-p-info"><strong>${p.name}</strong><span>${p.role}</span></div>
            <button class="ea-p-remove" data-pid="${p.id}">Remover</button>
          </div>
        `).join('')}
      </div>
    `;
  },

  step3() {
    return `
      <h3><i class="fa-solid fa-check-circle"></i> Revisão</h3>
      <div class="ea-review">
        <div class="ea-review-item"><span>AGENDA</span><strong>${this.formData.title || 'Sem título'}</strong></div>
        <div class="ea-review-row">
          <div class="ea-review-item"><span>DATA</span><strong>${this.formData.date ? new Date(this.formData.date).toLocaleString('pt-BR') : '-'}</strong></div>
          <div class="ea-review-item"><span>TIPO</span><strong>${this.formData.type}</strong></div>
        </div>
        <div class="ea-review-item"><span>PARTICIPANTES</span><strong>${this.formData.participants.length} convidados</strong></div>
      </div>
    `;
  },

  // ========== EXECUTION ==========
  viewExecution() {
    const a = this.agendas.find(x => x.id === this.agendaId);
    if (!a) return '<p>Agenda não encontrada.</p>';

    const tabs = [
      { id: 'participantes', icon: 'fa-user', label: 'Participantes' },
      { id: 'escopo', icon: 'fa-list', label: 'Escopo' },
      { id: 'discussao', icon: 'fa-comments', label: 'Discussão' },
      { id: 'decisoes', icon: 'fa-check', label: 'Decisões' },
      { id: 'ata', icon: 'fa-file-lines', label: 'Ata Final' }
    ];

    return `
      <header class="ea-exec-header">
        <div>
          <h2 class="ea-title">${a.title} <span class="ea-status ea-status-${(a.status || 'planejada').toLowerCase()}">${a.status || 'Planejada'}</span></h2>
          <p class="ea-subtitle">${new Date(a.date).toLocaleString('pt-BR')} • ${a.responsible}</p>
        </div>
        <div class="ea-exec-actions">
           <button class="ea-btn-danger-light" id="btn-delete-agenda" style="margin-right:8px; width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:8px; border:1px solid rgba(255,50,50,0.3); background:rgba(255,50,50,0.1); color:#ff4444;"><i class="fa-solid fa-trash"></i></button>
          ${a.minute ? '<button class="ea-btn-download" id="btn-download-ata"><i class="fa-solid fa-download"></i> Baixar Ata</button>' : ''}
          <button class="ea-btn-ai" id="btn-ai" ${this.generating ? 'disabled' : ''}>
            ${this.generating ? '<span class="ea-spinner"></span> Gerando...' : '<i class="fa-solid fa-sparkles"></i> Gerar Ata Executiva'}
          </button>
        </div>
      </header>

      <div class="ea-tabs">
        ${tabs.map(t => `<button class="ea-tab ${this.tab === t.id ? 'active' : ''}" data-tab="${t.id}"><i class="fa-solid ${t.icon}"></i> ${t.label}</button>`).join('')}
      </div>

      <div class="ea-tab-content">${this.tabContent(a)}</div>

      <div class="ea-exec-footer">
        <button class="ea-btn-ghost" id="btn-back-dash"><i class="fa-solid fa-arrow-left"></i> Voltar ao Dashboard</button>
      </div>
    `;
  },

  tabContent(a) {
    switch (this.tab) {
      case 'participantes': return this.tabParticipants(a);
      case 'escopo': return this.tabScope(a);
      case 'discussao': return this.tabDiscussion(a);
      case 'decisoes': return this.tabDecisions(a);
      case 'ata': return this.tabMinute(a);
    }
  },

  tabParticipants(a) {
    if (!a.participants || a.participants.length === 0) {
      return '<div class="ea-empty-tab">Nenhum participante cadastrado.</div>';
    }
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h3>Check-in de Participantes</h3>
        <button class="ea-btn-primary ea-btn-sm" id="btn-check-all" style="padding:0.4rem 0.8rem; font-size:0.8rem;">
          <i class="fa-solid fa-check-double"></i> Todos Presentes
        </button>
      </div>
      <div class="ea-checkin-grid">
        ${a.participants.map(p => `
          <div class="ea-checkin ${p.checkIn ? 'checked' : ''}" data-pid="${p.id}">
            <div class="ea-checkin-avatar ${p.checkIn ? 'checked' : ''}">${p.name.charAt(0)}</div>
            <div class="ea-checkin-info"><strong>${p.name}</strong><span>${p.role}</span></div>
            ${p.checkIn ? '<i class="fa-solid fa-check ea-check-icon"></i>' : ''}
          </div>
        `).join('')}
      </div>
    `;
  },

  tabScope(a) {
    return `
      <h3>Execução e Escopo</h3>
      <div class="ea-scope-card">
        <div class="ea-toggle-row">
          <span>Houve batimento de material?</span>
          <label class="ea-switch"><input type="checkbox" id="chk-material" ${a.execution?.materialChecked ? 'checked' : ''}><span class="ea-slider"></span></label>
        </div>
        ${a.execution?.materialChecked ? `
          <div class="ea-field" style="margin-top:16px">
            <label>Validação do Material</label>
            <select id="sel-validation">
              <option value="Sim" ${a.execution.materialValidated === 'Sim' ? 'selected' : ''}>Validado (Sim)</option>
              <option value="Parcial" ${a.execution.materialValidated === 'Parcial' ? 'selected' : ''}>Parcial</option>
              <option value="Não" ${a.execution.materialValidated === 'Não' ? 'selected' : ''}>Não Validado</option>
            </select>
          </div>
        ` : ''}
      </div>
      <div class="ea-field" style="margin-top:16px">
        <label>Riscos e Escorrelatas</label>
        <div class="ea-add-row"><input type="text" id="in-risk" placeholder="Adicionar risco..."><button class="ea-btn-primary ea-btn-sm" id="btn-risk"><i class="fa-solid fa-plus"></i> Adicionar</button></div>
        <ul class="ea-risk-list">${(a.execution?.risks || []).map((r, i) => `<li class="ea-risk-item"><span>${r}</span><button class="ea-rm-risk" data-i="${i}"><i class="fa-solid fa-trash"></i></button></li>`).join('')}</ul>
      </div>
    `;
  },

  tabDiscussion(a) {
    return `
      <h3>Pontos Discutidos</h3>
      <div class="ea-add-row"><input type="text" id="in-disc" placeholder="Adicionar ponto de discussão..."><button class="ea-btn-primary ea-btn-sm" id="btn-disc"><i class="fa-solid fa-plus"></i> Adicionar</button></div>
      <ul class="ea-disc-list">${(a.execution?.discussionPoints || []).map((d, i) => `<li class="ea-disc-item"><span>• ${d}</span><button class="ea-rm-disc" data-i="${i}"><i class="fa-solid fa-trash"></i></button></li>`).join('')}</ul>
    `;
  },

  tabDecisions(a) {
    return `
      <h3>Decisões Tomadas</h3>
      <div class="ea-add-row"><input type="text" id="in-dec" placeholder="Nova decisão..."><button class="ea-btn-primary ea-btn-sm" id="btn-dec"><i class="fa-solid fa-plus"></i> Adicionar</button></div>
      <ul class="ea-dec-list">${(a.decisions || []).map(d => `<li class="ea-dec-item"><span>${d.description}</span><button class="ea-rm-dec" data-id="${d.id}"><i class="fa-solid fa-trash"></i></button></li>`).join('')}</ul>

      <h3 style="margin-top:24px">Pendências</h3>
      <div class="ea-add-row ea-pend-row">
        <input type="text" id="in-pend-desc" placeholder="O que fazer?">
        <input type="text" id="in-pend-resp" placeholder="Responsável">
        <button class="ea-btn-primary ea-btn-sm" id="btn-pend"><i class="fa-solid fa-plus"></i> Adicionar</button>
      </div>
      <ul class="ea-pend-list">${(a.pendencies || []).map(p => `<li class="ea-pend-item"><div><strong>${p.description}</strong><span>Resp: ${p.responsible}</span></div><button class="ea-rm-pend" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button></li>`).join('')}</ul>
    `;
  },

  tabMinute(a) {
    if (a.minute) {
      return `
        <div class="ea-minute-box ea-has-minute">
          <div class="ea-minute-actions">
            <button class="ea-btn-copy" id="btn-copy-ata"><i class="fa-solid fa-copy"></i> Copiar</button>
            <button class="ea-btn-download" id="btn-download-ata2"><i class="fa-solid fa-download"></i> Baixar TXT</button>
          </div>
          <pre class="ea-minute-text">${a.minute}</pre>
        </div>
      `;
    }
    return `
      <div class="ea-minute-box">
        <div class="ea-minute-empty">
          <i class="fa-solid fa-sparkles"></i>
          <p>A ata ainda não foi gerada.</p>
          <span>Preencha os módulos anteriores e clique em "Gerar Ata Executiva".</span>
        </div>
      </div>
    `;
  },

  // ========== BINDINGS ==========
  bind() {
    const $ = id => document.getElementById(id);

    // Dashboard
    $('btn-new')?.addEventListener('click', () => { this.view = 'new'; this.step = 1; this.formData = { title: '', date: '', type: 'Operacional', responsible: '', participants: [] }; this.reRender(); });
    $('btn-toggle-archived')?.addEventListener('click', () => { this.showArchived = !this.showArchived; this.reRender(); });
    $('btn-export')?.addEventListener('click', () => this.exportAll());

    document.querySelectorAll('.ea-item').forEach(el => el.addEventListener('click', (e) => {
      if (e.target.closest('.ea-btn-archive') || e.target.closest('.ea-arrow')) return;
      this.agendaId = el.dataset.id; this.view = 'execution'; this.tab = 'participantes'; this.reRender();
    }));
    document.querySelectorAll('[data-exec]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); this.agendaId = el.dataset.exec; this.view = 'execution'; this.tab = 'participantes'; this.reRender(); }));
    document.querySelectorAll('[data-archive]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); this.toggleArchive(el.dataset.archive); }));

    // New Agenda
    $('btn-cancel')?.addEventListener('click', () => { this.view = 'dashboard'; this.reRender(); });
    $('btn-back')?.addEventListener('click', () => { this.step--; this.reRender(); });
    $('btn-next')?.addEventListener('click', () => { this.saveFields(); this.step++; this.reRender(); });
    $('btn-confirm')?.addEventListener('click', () => this.createAgenda());
    $('btn-add-p')?.addEventListener('click', () => this.addParticipant());
    document.querySelectorAll('.ea-p-remove').forEach(el => el.addEventListener('click', () => { this.formData.participants = this.formData.participants.filter(p => p.id !== el.dataset.pid); this.reRender(); }));

    // Execution
    $('btn-back-dash')?.addEventListener('click', () => { this.view = 'dashboard'; this.reRender(); });
    $('btn-delete-agenda')?.addEventListener('click', () => this.deleteAgenda(this.agendaId));
    $('btn-ai')?.addEventListener('click', () => this.generateMinute());
    $('btn-download-ata')?.addEventListener('click', () => this.downloadCurrentAta());
    $('btn-download-ata2')?.addEventListener('click', () => this.downloadCurrentAta());
    $('btn-copy-ata')?.addEventListener('click', () => this.copyAta());
    document.querySelectorAll('.ea-tab').forEach(el => el.addEventListener('click', () => { this.tab = el.dataset.tab; this.reRender(); }));
    document.querySelectorAll('.ea-checkin').forEach(el => el.addEventListener('click', () => this.toggleCheckin(el.dataset.pid)));
    $('btn-check-all')?.addEventListener('click', () => this.checkAllParticipants());

    // Scope
    $('chk-material')?.addEventListener('change', e => this.updateExec('materialChecked', e.target.checked));
    $('sel-validation')?.addEventListener('change', e => this.updateExec('materialValidated', e.target.value));
    $('btn-risk')?.addEventListener('click', () => this.addToList('risks', $('in-risk')?.value));
    document.querySelectorAll('.ea-rm-risk').forEach(el => el.addEventListener('click', () => this.removeFromList('risks', parseInt(el.dataset.i))));

    // Discussion
    $('btn-disc')?.addEventListener('click', () => this.addToList('discussionPoints', $('in-disc')?.value));
    document.querySelectorAll('.ea-rm-disc').forEach(el => el.addEventListener('click', () => this.removeFromList('discussionPoints', parseInt(el.dataset.i))));

    // Decisions
    $('btn-dec')?.addEventListener('click', () => this.addDecision($('in-dec')?.value));
    document.querySelectorAll('.ea-rm-dec').forEach(el => el.addEventListener('click', () => this.removeDecision(el.dataset.id)));
    $('btn-pend')?.addEventListener('click', () => this.addPendency($('in-pend-desc')?.value, $('in-pend-resp')?.value));
    document.querySelectorAll('.ea-rm-pend').forEach(el => el.addEventListener('click', () => this.removePendency(el.dataset.id)));
  },

  saveFields() {
    this.formData.title = document.getElementById('f-title')?.value || this.formData.title;
    this.formData.date = document.getElementById('f-date')?.value || this.formData.date;
    this.formData.responsible = document.getElementById('f-resp')?.value || this.formData.responsible;
    this.formData.type = document.getElementById('f-type')?.value || this.formData.type;
  },

  addParticipant() {
    const name = document.getElementById('p-name')?.value?.trim();
    const role = document.getElementById('p-role')?.value;
    if (name) {
      this.formData.participants.push({ id: Date.now().toString(), name, role, checkIn: false });
      this.reRender();
    }
  },

  async createAgenda() {
    // Validação
    if (!this.formData.title?.trim()) {
      NexusApp?.showToast?.('Por favor, informe o título da reunião.', 'warning');
      return;
    }
    if (!this.formData.date) {
      NexusApp?.showToast?.('Por favor, selecione a data e hora da reunião.', 'warning');
      return;
    }

    const agenda = {
      ...this.formData,
      // Garantir formato ISO para o Supabase
      date: new Date(this.formData.date).toISOString(),
      status: 'Planejada',
      archived: false,
      execution: { materialChecked: false, materialValidated: 'Não', risks: [], discussionPoints: [] },
      decisions: [],
      pendencies: [],
      minute: null,
      created_at: new Date().toISOString()
    };

    await this.save(agenda);
    this.view = 'dashboard';
    this.renderView();
  },

  async toggleArchive(id) {
    const a = this.agendas.find(x => x.id === id);
    if (a) {
      const newState = !a.archived;
      a.archived = newState; // Optimistic update

      try {
        const { error } = await window.supabaseClient
          .from('agendas')
          .update({ archived: newState })
          .eq('id', id);

        if (error) throw error;

        NexusApp?.showToast?.(newState ? 'Agenda arquivada!' : 'Agenda restaurada!', 'success');
        this.renderView();
      } catch (e) {
        console.error(e);
        NexusApp?.showToast?.('Erro ao atualizar arquivo.', 'error');
        a.archived = !newState; // Revert
        this.renderView();
      }
    }
  },

  toggleCheckin(pid) {
    const a = this.agendas.find(x => x.id === this.agendaId);
    const p = a?.participants?.find(x => x.id === pid);
    if (p) { p.checkIn = !p.checkIn; this.save(); this.reRender(); }
  },

  checkAllParticipants() {
    const a = this.agendas.find(x => x.id === this.agendaId);
    if (a && a.participants) {
      const allChecked = a.participants.every(p => p.checkIn);
      // Se todos marcados, desmarca todos. Se não, marca todos.
      a.participants.forEach(p => p.checkIn = !allChecked);
      this.save();
      this.reRender();
    }
  },

  updateExec(key, val) {
    const a = this.agendas.find(x => x.id === this.agendaId);
    if (a) { a.execution = a.execution || {}; a.execution[key] = val; this.save(); this.reRender(); }
  },

  addToList(key, val) {
    if (!val?.trim()) return;
    const a = this.agendas.find(x => x.id === this.agendaId);
    if (a) { a.execution = a.execution || {}; a.execution[key] = a.execution[key] || []; a.execution[key].push(val.trim()); this.save(); this.reRender(); }
  },

  removeFromList(key, idx) {
    const a = this.agendas.find(x => x.id === this.agendaId);
    if (a?.execution?.[key]) { a.execution[key].splice(idx, 1); this.save(); this.reRender(); }
  },

  addDecision(desc) {
    if (!desc?.trim()) return;
    const a = this.agendas.find(x => x.id === this.agendaId);
    if (a) { a.decisions = a.decisions || []; a.decisions.push({ id: Date.now().toString(), description: desc.trim() }); this.save(); this.reRender(); }
  },

  removeDecision(id) {
    const a = this.agendas.find(x => x.id === this.agendaId);
    if (a) { a.decisions = a.decisions.filter(d => d.id !== id); this.save(); this.reRender(); }
  },

  addPendency(desc, resp) {
    if (!desc?.trim() || !resp?.trim()) return;
    const a = this.agendas.find(x => x.id === this.agendaId);
    if (a) { a.pendencies = a.pendencies || []; a.pendencies.push({ id: Date.now().toString(), description: desc.trim(), responsible: resp.trim() }); this.save(); this.reRender(); }
  },

  removePendency(id) {
    const a = this.agendas.find(x => x.id === this.agendaId);
    if (a) { a.pendencies = a.pendencies.filter(p => p.id !== id); this.save(); this.reRender(); }
  },

  async deleteAgenda(id) {
    if (!confirm('Tem certeza que deseja excluir esta agenda?')) return;
    try {
      const { error } = await window.supabaseClient
        .from('agendas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      NexusApp?.showToast?.('Agenda excluída!', 'success');
      await this.loadAgendas();
      if (this.agendaId === id) this.view = 'dashboard';
      this.renderView();
    } catch (e) {
      NexusApp?.showToast?.('Erro ao excluir: ' + e.message, 'error');
    }
  },

  async generateMinute() {
    const a = this.agendas.find(x => x.id === this.agendaId);
    if (!a) return;

    this.generating = true;
    this.tab = 'ata';
    this.renderView();

    try {
      // Tentar gerar com IA Perplexity
      const ata = await this.generateAtaWithAI(a);

      // Atualizar localmente
      a.minute = ata;
      a.status = 'Realizada';

      // Salvar no Supabase
      await this.save();

      NexusApp?.showToast?.('✨ Ata gerada com IA!', 'success');
    } catch (e) {
      console.error('Erro com IA, usando template local:', e);
      // Fallback para template local
      const ata = this.buildAtaTemplate(a);
      a.minute = ata;
      a.status = 'Realizada';
      await this.save();
      NexusApp?.showToast?.('Ata gerada localmente!', 'success');
    } finally {
      this.generating = false;
      this.renderView();
    }
  },

  async generateAtaWithAI(a) {
    const dataReuniao = new Date(a.date);
    const presentes = (a.participants || []).filter(p => p.checkIn);
    const ausentes = (a.participants || []).filter(p => !p.checkIn);

    const context = `
Dados da Reunião:
- Título: ${a.title}
- Tipo: ${a.type}
- Data: ${dataReuniao.toLocaleDateString('pt-BR')}
- Horário: ${dataReuniao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
- Responsável: ${a.responsible}

Participantes Presentes (${presentes.length}):
${presentes.map(p => `- ${p.name} (${p.role})`).join('\n') || '- Nenhum'}

Participantes Ausentes (${ausentes.length}):
${ausentes.map(p => `- ${p.name} (${p.role})`).join('\n') || '- Nenhum'}

Batimento de Material: ${a.execution?.materialChecked ? 'SIM - ' + (a.execution?.materialValidated || 'Não informado') : 'NÃO'}

Pontos Discutidos:
${(a.execution?.discussionPoints || []).map((p, i) => `${i + 1}. ${p}`).join('\n') || '- Nenhum ponto registrado'}

Decisões Tomadas:
${(a.decisions || []).map((d, i) => `${i + 1}. ${d.description}`).join('\n') || '- Nenhuma decisão registrada'}

Pendências:
${(a.pendencies || []).map((p, i) => `${i + 1}. ${p.description} (Resp: ${p.responsible})`).join('\n') || '- Nenhuma pendência'}

Riscos Identificados:
${(a.execution?.risks || []).map(r => `- ${r}`).join('\n') || '- Nenhum risco identificado'}
`;

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: `Você é um assistente executivo especializado em atas de reunião corporativas.
Gere uma ATA EXECUTIVA profissional e detalhada com base nos dados fornecidos.
Use linguagem formal, clara e objetiva.
Estruture a ata com seções bem definidas: Identificação, Participantes, Pauta/Escopo, Discussões, Decisões, Pendências, Riscos e Encerramento.
Seja conciso mas completo. Formate a ata de forma visualmente clara.`
            },
            {
              role: 'user',
              content: `Gere uma ata executiva profissional para a seguinte reunião:\n${context}`
            }
          ],
          max_tokens: 2000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const ataContent = data.choices?.[0]?.message?.content;

      if (!ataContent) {
        throw new Error('Resposta vazia da API');
      }

      const footer = `\n\n════════════════════════════════════════════════════════════════════════════════\n                            DOCUMENTO GERADO COM IA\n                     Nexus Platform - Agendas Executivas\n                     Gerado em: ${new Date().toLocaleString('pt-BR')}\n════════════════════════════════════════════════════════════════════════════════`;

      return ataContent + footer;

    } catch (error) {
      console.warn('API Error, falling back to local template:', error);
      throw error;
    }
  },

  buildAtaTemplate(a) {
    const dataReuniao = new Date(a.date);
    const dataGeracao = new Date();

    const presentes = (a.participants || []).filter(p => p.checkIn);
    const ausentes = (a.participants || []).filter(p => !p.checkIn);

    let ata = `
════════════════════════════════════════════════════════════════════════════════
                              ATA DE REUNIÃO EXECUTIVA
════════════════════════════════════════════════════════════════════════════════

1. IDENTIFICAÇÃO
────────────────────────────────────────────────────────────────────────────────
   Título:        ${a.title}
   Tipo:          ${a.type}
   Data:          ${dataReuniao.toLocaleDateString('pt-BR')}
   Horário:       ${dataReuniao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
   Responsável:   ${a.responsible}
   Status:        REALIZADA

2. PARTICIPANTES
────────────────────────────────────────────────────────────────────────────────`;

    if (presentes.length > 0) {
      ata += `\n   PRESENTES (${presentes.length}):`;
      presentes.forEach(p => {
        ata += `\n      ✓ ${p.name} (${p.role})`;
      });
    }

    if (ausentes.length > 0) {
      ata += `\n\n   AUSENTES (${ausentes.length}):`;
      ausentes.forEach(p => {
        ata += `\n      ✗ ${p.name} (${p.role})`;
      });
    }

    if ((a.participants || []).length === 0) {
      ata += `\n   Nenhum participante registrado.`;
    }

    ata += `

3. EXECUÇÃO E ESCOPO
────────────────────────────────────────────────────────────────────────────────
   Houve batimento de material: ${a.execution?.materialChecked ? 'SIM' : 'NÃO'}`;

    if (a.execution?.materialChecked) {
      ata += `\n   Material validado: ${a.execution?.materialValidated || 'Não informado'}`;
    }

    ata += `

4. PONTOS DISCUTIDOS
────────────────────────────────────────────────────────────────────────────────`;

    if ((a.execution?.discussionPoints || []).length > 0) {
      a.execution.discussionPoints.forEach((p, i) => {
        ata += `\n   ${i + 1}. ${p}`;
      });
    } else {
      ata += `\n   Nenhum ponto de discussão registrado.`;
    }

    ata += `

5. DECISÕES TOMADAS
────────────────────────────────────────────────────────────────────────────────`;

    if ((a.decisions || []).length > 0) {
      a.decisions.forEach((d, i) => {
        ata += `\n   ${i + 1}. ${d.description}`;
      });
    } else {
      ata += `\n   Nenhuma decisão registrada.`;
    }

    ata += `

6. PENDÊNCIAS E PRÓXIMOS PASSOS
────────────────────────────────────────────────────────────────────────────────`;

    if ((a.pendencies || []).length > 0) {
      a.pendencies.forEach((p, i) => {
        ata += `\n   ${i + 1}. ${p.description}`;
        ata += `\n      Responsável: ${p.responsible}`;
        ata += `\n`;
      });
    } else {
      ata += `\n   Nenhuma pendência registrada.`;
    }

    ata += `

7. RISCOS E ESCORRELATAS
────────────────────────────────────────────────────────────────────────────────`;

    if ((a.execution?.risks || []).length > 0) {
      a.execution.risks.forEach((r, i) => {
        ata += `\n   ⚠ ${r}`;
      });
    } else {
      ata += `\n   Nenhum risco identificado.`;
    }

    ata += `

8. OBSERVAÇÕES FINAIS
────────────────────────────────────────────────────────────────────────────────
   Reunião conduzida por ${a.responsible}.
   ${presentes.length} participante(s) presente(s).
   ${(a.decisions || []).length} decisão(ões) tomada(s).
   ${(a.pendencies || []).length} pendência(s) registrada(s).

════════════════════════════════════════════════════════════════════════════════
                           DOCUMENTO GERADO AUTOMATICAMENTE
                    Nexus Platform - Sistema de Agendas Executivas
                    Data de Geração: ${dataGeracao.toLocaleString('pt-BR')}
════════════════════════════════════════════════════════════════════════════════
`;

    return ata.trim();
  },

  copyAta() {
    const a = this.agendas.find(x => x.id === this.agendaId);
    if (a?.minute) {
      navigator.clipboard.writeText(a.minute);
      NexusApp?.showToast?.('Ata copiada!', 'success');
    }
  },

  downloadCurrentAta() {
    const a = this.agendas.find(x => x.id === this.agendaId);
    if (a?.minute) {
      const blob = new Blob([a.minute], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ATA_${a.title.replace(/[^a-z0-9]/gi, '_')}_${new Date(a.date).toLocaleDateString()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  exportAll() {
    if (!this.agendas || this.agendas.length === 0) {
      NexusApp?.showToast?.('Sem dados para exportar', 'info');
      return;
    }
    const csv = [
      'Titulo;Data;Responsavel;Tipo;Status;Decisoes',
      ...this.agendas.map(a => `${a.title};${a.date};${a.responsible};${a.type};${a.status};${(a.decisions || []).length}`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'agendas_executivas.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

window.NexusCalendar = NexusCalendar;
