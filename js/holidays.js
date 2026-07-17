/**
 * NEP DELIVERY CONTROL - CALENDÁRIO DE FERIADOS
 * Calendário mensal com feriados nacionais, estaduais, municipais e da
 * empresa. Coordenador+ pode cadastrar/editar/remover; todo mundo vê.
 */

const NexusHolidays = {
  MANAGER_ROLES: ['COORDENADOR', 'GERENTE', 'SUPERINTENDENTE', 'DIRETOR', 'ADMIN'],
  TYPE_LABELS: {
    nacional: { label: 'Nacional', color: '#ef4444' },
    estadual: { label: 'Estadual', color: '#f59e0b' },
    municipal: { label: 'Municipal', color: '#8b5cf6' },
    empresa: { label: 'Empresa', color: '#2f6fed' }
  },

  currentDate: new Date(),
  holidays: [],
  container: null,

  isManager() {
    const roleKey = (localStorage.getItem('nep_user_role_key') || '').toUpperCase();
    return this.MANAGER_ROLES.includes(roleKey);
  },

  getCurrentUser() {
    return {
      uid: localStorage.getItem('nep_user_uid') || null,
      nome: localStorage.getItem('nep_user_name') || 'Usuário'
    };
  },

  // ============ FERIADOS NACIONAIS (cálculo automático) ============
  // Domingo de Páscoa pelo algoritmo gregoriano (Meeus/Jones/Butcher)
  getEasterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  },

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  getNationalHolidays(year) {
    const easter = this.getEasterDate(year);
    const addDays = (date, days) => {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    };

    const fixed = [
      { date: `${year}-01-01`, name: 'Confraternização Universal' },
      { date: `${year}-04-21`, name: 'Tiradentes' },
      { date: `${year}-05-01`, name: 'Dia do Trabalho' },
      { date: `${year}-09-07`, name: 'Independência do Brasil' },
      { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida' },
      { date: `${year}-11-02`, name: 'Finados' },
      { date: `${year}-11-15`, name: 'Proclamação da República' },
      { date: `${year}-11-20`, name: 'Consciência Negra' },
      { date: `${year}-12-25`, name: 'Natal' }
    ];

    const movable = [
      { date: this.formatDate(addDays(easter, -48)), name: 'Carnaval (Segunda)' },
      { date: this.formatDate(addDays(easter, -47)), name: 'Carnaval (Terça)' },
      { date: this.formatDate(addDays(easter, -2)), name: 'Sexta-feira Santa' },
      { date: this.formatDate(addDays(easter, 60)), name: 'Corpus Christi' }
    ];

    return [...fixed, ...movable].map(h => ({ ...h, type: 'nacional' }));
  },

  // ============ FIRESTORE ============
  async fetchHolidays() {
    if (!window.db) { this.holidays = []; return; }
    try {
      const snap = await window.db.collection('holidays').get();
      this.holidays = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[Holidays] Erro ao carregar feriados:', e);
      this.holidays = [];
    }
  },

  // Semeia os feriados nacionais do ano corrente e do próximo, uma única
  // vez (só roda se ainda não houver nenhum feriado nacional para o ano)
  async seedNationalHolidaysIfNeeded() {
    if (!window.db) return;
    const user = this.getCurrentUser();
    const years = [this.currentDate.getFullYear(), this.currentDate.getFullYear() + 1];

    for (const year of years) {
      const alreadySeeded = this.holidays.some(h => h.type === 'nacional' && h.date?.startsWith(String(year)));
      if (alreadySeeded) continue;

      try {
        const batch = window.db.batch();
        this.getNationalHolidays(year).forEach(h => {
          const ref = window.db.collection('holidays').doc();
          batch.set(ref, {
            ...h,
            created_by: user.uid || 'SISTEMA',
            created_at: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        await batch.commit();
      } catch (e) {
        console.warn(`[Holidays] Erro ao semear feriados de ${year}:`, e);
      }
    }
  },

  // ============ RENDER ============
  async render(container) {
    this.container = container;
    container.innerHTML = `
      <div class="holidays-page animate-fade-in">
        <div class="holidays-header">
          <div>
            <h1 class="page-title">📅 Calendário de Feriados</h1>
            <p class="page-description">Feriados nacionais, estaduais, municipais e da empresa</p>
          </div>
          ${this.isManager() ? `
            <button class="btn btn-primary" id="btn-new-holiday">
              <i class="fa-solid fa-plus"></i> Novo Feriado
            </button>
          ` : ''}
        </div>

        <div class="holidays-cal-card">
          <div class="holidays-cal-nav">
            <button class="btn-icon" id="hol-prev"><i class="fa-solid fa-chevron-left"></i></button>
            <span id="hol-current-label"></span>
            <button class="btn-icon" id="hol-next"><i class="fa-solid fa-chevron-right"></i></button>
            <button class="btn btn-ghost btn-sm" id="hol-today" style="margin-left:auto;">Hoje</button>
          </div>
          <div id="hol-grid">
            <div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando...</div>
          </div>
        </div>

        <div class="holidays-legend">
          ${Object.entries(this.TYPE_LABELS).map(([key, t]) => `
            <span class="holidays-legend-item"><span class="dot" style="background:${t.color}"></span>${t.label}</span>
          `).join('')}
        </div>
      </div>
      ${this.renderModal()}
    `;

    this.injectStyles();
    await this.fetchHolidays();
    if (this.isManager()) await this.seedNationalHolidaysIfNeeded();
    await this.fetchHolidays();
    this.renderCalendar();
    this.attachEvents();
  },

  renderCalendar() {
    const grid = document.getElementById('hol-grid');
    if (!grid) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const monthName = this.currentDate.toLocaleString('pt-BR', { month: 'long' });
    const label = document.getElementById('hol-current-label');
    if (label) label.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let html = `<div class="hol-week-header">${weekDays.map(d => `<div>${d}</div>`).join('')}</div>`;
    html += '<div class="hol-days-grid">';

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    for (let i = 0; i < startingDay; i++) html += `<div class="hol-day empty"></div>`;

    const today = new Date();
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = this.formatDate(new Date(year, month, i));
      const isToday = new Date(year, month, i).toDateString() === today.toDateString();
      const dayHolidays = this.holidays.filter(h => h.date === dateStr);

      html += `
        <div class="hol-day ${isToday ? 'today' : ''} ${dayHolidays.length ? 'has-holiday' : ''}" data-date="${dateStr}">
          <div class="hol-day-number">${i}</div>
          <div class="hol-events-list">
            ${dayHolidays.map(h => `
              <div class="hol-pill" data-id="${h.id}" style="background:${(this.TYPE_LABELS[h.type] || this.TYPE_LABELS.empresa).color}22; color:${(this.TYPE_LABELS[h.type] || this.TYPE_LABELS.empresa).color}; border-color:${(this.TYPE_LABELS[h.type] || this.TYPE_LABELS.empresa).color}44;" title="${window.escapeHtml(h.name)}">
                ${window.escapeHtml(h.name)}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    html += '</div>';
    grid.innerHTML = html;
    this.attachGridEvents();
  },

  attachEvents() {
    document.getElementById('hol-prev')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.renderCalendar();
    });
    document.getElementById('hol-next')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.renderCalendar();
    });
    document.getElementById('hol-today')?.addEventListener('click', () => {
      this.currentDate = new Date();
      this.renderCalendar();
    });
    document.getElementById('btn-new-holiday')?.addEventListener('click', () => this.openModal());
  },

  attachGridEvents() {
    document.querySelectorAll('.hol-pill').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const holiday = this.holidays.find(h => h.id === el.dataset.id);
        if (!holiday) return;
        if (this.isManager()) {
          if (confirm(`Remover o feriado "${holiday.name}"?`)) this.deleteHoliday(holiday.id);
        } else {
          NexusApp?.showToast?.(`${holiday.name} (${this.TYPE_LABELS[holiday.type]?.label || holiday.type})`, 'info');
        }
      });
    });
  },

  // ============ MODAL (Novo Feriado) ============
  renderModal() {
    if (!this.isManager()) return '';
    return `
      <div class="modal-backdrop" id="holiday-modal">
        <div class="modal" style="max-width:420px;">
          <div class="modal-header">
            <h3 class="modal-title"><i class="fa-solid fa-calendar-plus"></i> Novo Feriado</h3>
            <button class="modal-close" id="holiday-modal-close"><i class="fa-solid fa-times"></i></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Data *</label>
              <input type="date" class="form-input" id="holiday-date">
            </div>
            <div class="form-group">
              <label class="form-label">Nome *</label>
              <input type="text" class="form-input" id="holiday-name" placeholder="Ex: Aniversário da cidade">
            </div>
            <div class="form-group">
              <label class="form-label">Tipo</label>
              <select class="form-input" id="holiday-type">
                ${Object.entries(this.TYPE_LABELS).map(([key, t]) => `<option value="${key}" ${key === 'empresa' ? 'selected' : ''}>${t.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="holiday-modal-cancel">Cancelar</button>
            <button class="btn btn-primary" id="holiday-modal-save">Salvar</button>
          </div>
        </div>
      </div>
    `;
  },

  openModal() {
    document.getElementById('holiday-modal')?.classList.add('active');
    document.getElementById('holiday-modal-close')?.addEventListener('click', () => this.closeModal());
    document.getElementById('holiday-modal-cancel')?.addEventListener('click', () => this.closeModal());
    document.getElementById('holiday-modal-save')?.addEventListener('click', () => this.saveHoliday());
  },

  closeModal() {
    document.getElementById('holiday-modal')?.classList.remove('active');
  },

  async saveHoliday() {
    const date = document.getElementById('holiday-date')?.value;
    const name = document.getElementById('holiday-name')?.value.trim();
    const type = document.getElementById('holiday-type')?.value || 'empresa';

    if (!date || !name) {
      NexusApp?.showToast?.('Preencha data e nome do feriado', 'error');
      return;
    }

    try {
      const user = this.getCurrentUser();
      await window.db.collection('holidays').add({
        date,
        name,
        type,
        created_by: user.uid,
        created_at: firebase.firestore.FieldValue.serverTimestamp()
      });
      NexusApp?.showToast?.('Feriado cadastrado!', 'success');
      this.closeModal();
      await this.fetchHolidays();
      this.renderCalendar();
    } catch (e) {
      console.error('[Holidays] Erro ao salvar:', e);
      NexusApp?.showToast?.('Erro ao salvar feriado: ' + e.message, 'error');
    }
  },

  async deleteHoliday(id) {
    try {
      await window.db.collection('holidays').doc(id).delete();
      NexusApp?.showToast?.('Feriado removido.', 'success');
      await this.fetchHolidays();
      this.renderCalendar();
    } catch (e) {
      console.error('[Holidays] Erro ao remover:', e);
      NexusApp?.showToast?.('Erro ao remover feriado: ' + e.message, 'error');
    }
  },

  injectStyles() {
    if (document.getElementById('holidays-style')) return;
    const style = document.createElement('style');
    style.id = 'holidays-style';
    style.textContent = `
      .holidays-page { padding: 20px; max-width: 1100px; margin: 0 auto; }
      .holidays-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--space-6); flex-wrap: wrap; gap: 12px; }
      .holidays-cal-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-xl); padding: var(--space-5); }
      .holidays-cal-nav { display: flex; align-items: center; gap: 12px; margin-bottom: var(--space-4); }
      #hol-current-label { min-width: 140px; text-align: center; font-weight: 600; color: var(--text-primary); }
      .hol-week-header { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--surface-border); padding-bottom: 8px; margin-bottom: 6px; }
      .hol-week-header div { text-align: center; font-size: 11px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; }
      .hol-days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
      .hol-day { min-height: 84px; border-radius: 8px; padding: 6px; background: var(--surface-elevated); }
      .hol-day.empty { background: transparent; }
      .hol-day.today { border: 1px solid var(--primary-500); }
      .hol-day.has-holiday { background: rgba(239, 68, 68, 0.06); }
      .hol-day-number { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; }
      .hol-events-list { display: flex; flex-direction: column; gap: 2px; }
      .hol-pill { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 6px; border: 1px solid; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .holidays-legend { display: flex; gap: 16px; margin-top: var(--space-4); flex-wrap: wrap; }
      .holidays-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
      .holidays-legend-item .dot { width: 8px; height: 8px; border-radius: 50%; }
    `;
    document.head.appendChild(style);
  }
};

window.NexusHolidays = NexusHolidays;
