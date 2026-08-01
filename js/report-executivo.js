/* =========================================
   NEP REPORT EXECUTIVO — TELAS
   Porte do app irmão Report-Executivo (Next.js/Supabase) para a
   arquitetura nativa do NEP (Firebase Auth + Firestore, vanilla JS).

   TODA regra de negócio vive em js/report-executivo-domain.js (window.RED),
   porte fiel de shared/domain/index.ts. Este arquivo só busca dados e
   formata — mesma separação do original, e é o que permite conferir
   número por número contra o Report.

   Coleção central: "items" — mesmo shape do Item do original (22 campos).
   ========================================= */

const NexusReportExecutivo = {
  db: null,
  activeTab: 'portfolio',
  items: [],
  activeUsers: [],
  filters: null,
  tagVocabulary: [],
  _scopeApplied: false,

  // ── Sessão ────────────────────────────────────────────────────────────────

  getMyRoleKey() {
    const stored = localStorage.getItem('nep_user_role_key');
    if (stored) return stored.toLowerCase();
    return (localStorage.getItem('nep_cargo') || 'monitor').toLowerCase();
  },

  canEdit() { return RED.canEdit(this.myRoleKey); },
  canDelete() { return RED.canDelete(this.myRoleKey); },

  init() {
    if (window.db) this.db = window.db;
    else if (typeof firebase !== 'undefined' && firebase.firestore) this.db = firebase.firestore();
    this.myUid = localStorage.getItem('nep_user_uid') || '';
    this.myName = (localStorage.getItem('nep_user_name') || '').trim();
    this.myRoleKey = this.getMyRoleKey();
    if (!this.filters) this.filters = Object.assign({}, RED.EMPTY_FILTERS);
  },

  // ── Dados ─────────────────────────────────────────────────────────────────

  async loadItems() {
    try {
      const snap = await this.db.collection('items').limit(1000).get();
      this.items = snap.docs.map(d => RED.normalizeItem(Object.assign({ id: d.id }, d.data())));
    } catch (e) {
      console.warn('[ReportExecutivo] items indisponível:', e.message);
      this.items = [];
    }
    this.tagVocabulary = RED.buildTagVocabulary(this.items);
  },

  async loadActiveUsers() {
    try {
      const snap = await this.db.collection('users').where('status', '==', 'ATIVO').get();
      this.activeUsers = snap.docs.map(d => Object.assign({ uid: d.id, id: d.id }, d.data()));
    } catch (e) {
      console.warn('[ReportExecutivo] users indisponível:', e.message);
      this.activeUsers = [];
    }
    // Chokepoint de responsáveis: sem isto "Pedro" e "Pedro Almeida Santos"
    // viram duas pessoas em toda agregação por dono.
    RED.setCanonicalOwners(this.activeUsers.map(u => u.nome || u.full_name));
  },

  /** Recorte-padrão por papel. Só depois de activeUsers carregar — aplicar
   *  antes gera a corrida que prende o gestor vendo só as próprias frentes. */
  applyDefaultScope() {
    if (this._scopeApplied) return;
    const me = this.activeUsers.find(u => u.uid === this.myUid);
    const team = me ? RED.subordinateIds(this.activeUsers, this.myUid) : new Set();
    const teamNames = this.activeUsers.filter(u => team.has(u.uid) && u.uid !== this.myUid)
      .map(u => u.nome).filter(Boolean);
    const isManagerWithTeam = teamNames.length > 0;
    const own = me ? me.nome : this.myName;
    this.filters.teamOwners = RED.defaultOwnerScope(this.myRoleKey, isManagerWithTeam,
      isManagerWithTeam ? [own, ...teamNames].filter(Boolean) : [], own);
    this._scopeApplied = true;
  },

  /** Itens após escopo + filtros — fonte única de todas as abas. */
  visibleItems() {
    return RED.filteredItems(this.items, this.filters);
  },

  async saveItem(patch, id) {
    const payload = Object.assign({}, patch, {
      lastUpdate: new Date().toISOString(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    if (id) {
      await this.db.collection('items').doc(id).update(payload);
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      payload.createdBy = this.myUid;
      if (payload.archived === undefined) payload.archived = false;
      await this.db.collection('items').add(payload);
    }
    await this.loadItems();
  },

  // ── Helpers de render ─────────────────────────────────────────────────────

  esc(s) { return RED.esc(s); },

  badge(text, tone) {
    return `<span class="re-badge ${tone || 'tone-gray'}">${RED.esc(text)}</span>`;
  },

  bar(pct, tone) {
    const p = Math.max(0, Math.min(100, pct || 0));
    return `<div class="re-bar"><div class="re-bar-fill ${tone || ''}" style="width:${p}%"></div></div>`;
  },

  // ── Shell ─────────────────────────────────────────────────────────────────

  async render(container) {
    this.init();
    this.container = container;
    if (!this.db) {
      container.innerHTML = `<div class="re-empty">Firestore indisponível.</div>`;
      return;
    }

    const role = this.myRoleKey;
    const tabs = [
      { id: 'portfolio', icon: 'fa-layer-group', label: 'Carteira' },
      { id: 'board', icon: 'fa-table-columns', label: 'Board' },
      { id: 'risks', icon: 'fa-triangle-exclamation', label: 'Riscos' },
      { id: 'dashboard', icon: 'fa-gauge-high', label: 'Dashboard' },
      { id: 'capacity', icon: 'fa-users-gear', label: 'Capacidade' },
      { id: 'routines', icon: 'fa-list-check', label: 'Rotinas' },
      { id: 'development', icon: 'fa-seedling', label: 'Desenvolvimento' },
      { id: 'executive', icon: 'fa-briefcase', label: 'Executivo' },
      { id: 'okrs', icon: 'fa-bullseye', label: RED.canViewStructure(role) || role === 'gerente' ? 'OKRs' : 'Meu OKR' },
      { id: 'director-summary', icon: 'fa-sitemap', label: 'Resumo Estrutura', restricted: true },
      { id: 'agenda', icon: 'fa-calendar-days', label: 'Agenda' },
      { id: 'improvements', icon: 'fa-arrow-trend-up', label: 'Melhorias' },
      { id: 'materials', icon: 'fa-photo-film', label: 'Materiais' },
      { id: 'scorecard', icon: 'fa-clipboard-check', label: 'Meu Scorecard' },
      { id: 'archived', icon: 'fa-box-archive', label: 'Arquivados' }
    ].filter(t => RED.isViewVisible(t.id, !!t.restricted, role));

    if (!tabs.some(t => t.id === this.activeTab)) this.activeTab = tabs[0].id;

    container.innerHTML = `
      <div class="re-page animate-fade-in">
        <div class="re-head">
          <div>
            <h1 class="page-title">Report Executivo</h1>
            <p class="page-description">Carteira, riscos, capacidade e OKR — integrado ao NEP.</p>
          </div>
          <div class="re-head-actions">
            ${this.canEdit() ? `<button class="btn btn-primary btn-sm" id="re-new-item"><i class="fa-solid fa-plus"></i> Nova frente</button>` : ''}
          </div>
        </div>
        <div class="re-tabs">
          ${tabs.map(t => `<button class="re-tab ${this.activeTab === t.id ? 'active' : ''}" data-tab="${t.id}"><i class="fa-solid ${t.icon}"></i> ${t.label}</button>`).join('')}
        </div>
        <div id="re-filterbar"></div>
        <div class="re-content" id="re-content">
          <div class="re-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando…</div>
        </div>
      </div>`;

    container.querySelectorAll('.re-tab').forEach(tab => {
      tab.addEventListener('click', async () => {
        this.activeTab = tab.dataset.tab;
        container.querySelectorAll('.re-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        await this.loadTab();
      });
    });
    document.getElementById('re-new-item')?.addEventListener('click', () => this.openItemModal(null));

    await this.loadActiveUsers();
    await this.loadItems();
    this.applyDefaultScope();
    await this.loadTab();
  },

  /** Abas que operam sobre a carteira mostram a barra de filtros; as demais não. */
  FILTERED_TABS: ['portfolio', 'board', 'risks', 'dashboard', 'executive'],

  async loadTab() {
    const el = document.getElementById('re-content');
    if (!el) return;
    el.innerHTML = `<div class="re-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando…</div>`;
    this.renderFilterBar();
    try {
      switch (this.activeTab) {
        case 'portfolio': this.renderPortfolio(el); break;
        case 'board': this.renderBoard(el); break;
        case 'risks': this.renderRisks(el); break;
        case 'dashboard': this.renderDashboard(el); break;
        case 'capacity': await this.renderCapacity(el); break;
        case 'routines': await this.renderRoutines(el); break;
        case 'development': await this.renderDevelopment(el); break;
        case 'executive': await this.renderExecutive(el); break;
        case 'okrs': await this.renderOkrs(el); break;
        case 'director-summary': this.renderDirectorSummary(el); break;
        case 'agenda': await this.renderAgenda(el); break;
        case 'improvements': await this.renderImprovements(el); break;
        case 'materials': await this.renderMaterials(el); break;
        case 'scorecard': await this.renderScorecard(el); break;
        case 'archived': this.renderArchived(el); break;
      }
    } catch (err) {
      console.error('[ReportExecutivo] erro na aba', this.activeTab, err);
      el.innerHTML = `<div class="re-error"><strong>Erro ao carregar:</strong> ${RED.esc(err.message)}</div>`;
    }
  },

  // ── Barra de filtros (compartilhada) ──────────────────────────────────────

  renderFilterBar() {
    const slot = document.getElementById('re-filterbar');
    if (!slot) return;
    if (!this.FILTERED_TABS.includes(this.activeTab)) { slot.innerHTML = ''; return; }

    const f = this.filters;
    const all = this.items.filter(i => !i.archived);
    const uniq = arr => [...new Set(arr.filter(Boolean))].sort();
    const products = uniq(all.map(i => i.product || RED.NO_PRODUCT));
    const owners = uniq(all.flatMap(i => RED.ownersOf(i.owner)));
    const statuses = uniq(all.map(i => RED.effectiveStatus(i)));

    const multi = (key, label, options) => `
      <div class="re-filter">
        <label>${label}</label>
        <select multiple size="1" data-filter="${key}" class="re-select">
          ${options.map(o => `<option value="${RED.esc(o)}" ${f[key].includes(o) ? 'selected' : ''}>${RED.esc(o)}</option>`).join('')}
        </select>
      </div>`;

    slot.innerHTML = `
      <div class="re-filterbar">
        <div class="re-filter re-filter-grow">
          <label>Buscar</label>
          <input type="text" class="form-input" id="re-q" placeholder="projeto, escopo, responsável, tag…" value="${RED.esc(f.query)}">
        </div>
        ${multi('product', 'Produto', products)}
        ${multi('owner', 'Responsável', owners)}
        ${multi('status', 'Status', statuses)}
        <div class="re-filter">
          <label>Ordenar</label>
          <select class="re-select" id="re-sort">
            ${[['dueAsc', 'Prazo ↑'], ['dueDesc', 'Prazo ↓'], ['riskDesc', 'Risco'], ['scoreAsc', 'Governança ↑'],
               ['progressAsc', 'Progresso ↑'], ['effortDesc', 'Esforço ↓']]
              .map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <label class="re-check"><input type="checkbox" id="re-critical" ${f.criticalOnly ? 'checked' : ''}> Só críticas</label>
        <label class="re-check"><input type="checkbox" id="re-gaps" ${f.gapsOnly ? 'checked' : ''}> Só com lacuna</label>
        ${f.teamOwners ? `<span class="re-scope" title="Recorte automático pelo seu papel">Recorte: meu time (${f.teamOwners.length})</span>` : ''}
        ${RED.hasActiveFilters(f) ? `<button class="btn btn-ghost btn-sm" id="re-clear">Limpar</button>` : ''}
      </div>`;

    const q = document.getElementById('re-q');
    let t = null;
    q?.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(async () => { this.filters.query = q.value; await this.loadTab(); }, 250);
    });
    slot.querySelectorAll('[data-filter]').forEach(sel => {
      sel.addEventListener('change', async () => {
        this.filters[sel.dataset.filter] = [...sel.selectedOptions].map(o => o.value);
        await this.loadTab();
      });
    });
    document.getElementById('re-sort')?.addEventListener('change', async e => {
      this.filters.sort = e.target.value; await this.loadTab();
    });
    document.getElementById('re-critical')?.addEventListener('change', async e => {
      this.filters.criticalOnly = e.target.checked; await this.loadTab();
    });
    document.getElementById('re-gaps')?.addEventListener('change', async e => {
      this.filters.gapsOnly = e.target.checked; await this.loadTab();
    });
    document.getElementById('re-clear')?.addEventListener('click', async () => {
      const scope = this.filters.teamOwners;
      this.filters = Object.assign({}, RED.EMPTY_FILTERS, { teamOwners: scope });
      await this.loadTab();
    });
  },

  // ── Modal de frente (editor completo — 22 campos) ─────────────────────────

  openItemModal(item) {
    const isNew = !item;
    const it = item || RED.normalizeItem({}, this.items.length);
    document.getElementById('re-modal')?.remove();

    const opts = (list, sel) => list.map(v => `<option value="${RED.esc(v)}" ${v === sel ? 'selected' : ''}>${RED.esc(v)}</option>`).join('');
    const preds = this.items.filter(x => x.id !== it.id && !x.archived);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 're-modal';
    modal.innerHTML = `
      <div class="modal-container re-modal">
        <div class="modal-header">
          <h3><i class="fa-solid fa-diagram-project"></i> ${isNew ? 'Nova frente' : RED.esc(RED.frontLabel(it))}</h3>
          <button class="modal-close" id="re-modal-x"><i class="fa-solid fa-times"></i></button>
        </div>
        <div class="modal-body re-modal-body">
          <div class="re-grid-2">
            <div class="form-group"><label class="form-label">Projeto</label>
              <input type="text" class="form-input" id="f-project" value="${RED.esc(it.project)}"></div>
            <div class="form-group"><label class="form-label">Escopo / demanda</label>
              <input type="text" class="form-input" id="f-demand" value="${RED.esc(it.demand)}"></div>
          </div>
          <div class="form-group"><label class="form-label">Definição</label>
            <textarea class="form-input" id="f-definition" rows="3">${RED.esc(it.definition)}</textarea></div>
          <div class="re-grid-3">
            <div class="form-group"><label class="form-label">Responsável(is)</label>
              <input type="text" class="form-input" id="f-owner" list="re-owners" value="${RED.esc(it.owner)}"
                placeholder="Nome, ou vários separados por vírgula">
              <datalist id="re-owners">${this.activeUsers.map(u => `<option value="${RED.esc(u.nome)}">`).join('')}</datalist></div>
            <div class="form-group"><label class="form-label">Produto</label>
              <input type="text" class="form-input" id="f-product" list="re-products" value="${RED.esc(it.product === RED.NO_PRODUCT ? '' : it.product)}">
              <datalist id="re-products">${RED.PRODUCT_SUGGESTIONS.map(p => `<option value="${p}">`).join('')}</datalist></div>
            <div class="form-group"><label class="form-label">Tags (vírgula)</label>
              <input type="text" class="form-input" id="f-tags" value="${RED.esc((it.tags || []).join(', '))}"></div>
          </div>
          <div class="re-grid-4">
            <div class="form-group"><label class="form-label">Status</label>
              <select class="form-input" id="f-status">${opts(RED.STATUSES, it.status)}</select></div>
            <div class="form-group"><label class="form-label">Prioridade</label>
              <select class="form-input" id="f-priority">${opts(RED.PRIORITIES, it.priority)}</select></div>
            <div class="form-group"><label class="form-label">Início</label>
              <input type="date" class="form-input" id="f-start" value="${RED.esc(it.startDate)}"></div>
            <div class="form-group"><label class="form-label">Prazo</label>
              <input type="date" class="form-input" id="f-due" value="${RED.esc(it.dueDate)}"></div>
          </div>
          <div class="re-grid-3">
            <div class="form-group"><label class="form-label">Progresso: <span id="f-prog-out">${it.progress}</span>%</label>
              <input type="range" min="0" max="100" step="5" id="f-progress" value="${it.progress}" style="width:100%"></div>
            <div class="form-group"><label class="form-label">Esforço (h)</label>
              <input type="number" class="form-input" id="f-effort" min="0" max="9999" value="${it.effortHours ?? ''}"
                placeholder="vazio = estimado"></div>
            <div class="form-group"><label class="form-label">Tamanho do time</label>
              <input type="number" class="form-input" id="f-team" min="1" max="50" value="${it.teamSize ?? ''}"></div>
          </div>
          <div class="form-group"><label class="form-label">Próxima ação</label>
            <input type="text" class="form-input" id="f-next" value="${RED.esc(it.nextAction)}"></div>
          <div class="re-grid-2">
            <div class="form-group"><label class="form-label">Depende de</label>
              <select class="form-input" id="f-pred">
                <option value="">— nenhuma —</option>
                ${preds.map(p => `<option value="${p.id}" ${p.id === it.predecessorId ? 'selected' : ''}>${RED.esc(RED.frontLabel(p))}</option>`).join('')}
              </select></div>
            <div class="form-group"><label class="form-label">Nota de dependência</label>
              <input type="text" class="form-input" id="f-depnote" value="${RED.esc(it.dependencyNote)}"></div>
          </div>
          <div class="form-group"><label class="form-label">Comentário executivo</label>
            <textarea class="form-input" id="f-exec" rows="2">${RED.esc(it.executiveComment)}</textarea></div>
          <div id="re-modal-diag"></div>
        </div>
        <div class="modal-footer">
          ${!isNew && this.canDelete() ? `<button class="btn btn-ghost" id="re-archive">${it.archived ? 'Restaurar' : 'Arquivar'}</button>` : ''}
          <button class="btn btn-secondary" id="re-modal-cancel">Cancelar</button>
          <button class="btn btn-primary" id="re-modal-save"><i class="fa-solid fa-save"></i> Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('re-modal-x').addEventListener('click', close);
    document.getElementById('re-modal-cancel').addEventListener('click', close);
    document.getElementById('f-progress').addEventListener('input', e => {
      document.getElementById('f-prog-out').textContent = e.target.value;
    });

    // Diagnóstico ao vivo: mostra o que o motor vai dizer deste item ANTES de
    // salvar — lacunas de governança e score de risco. É o que transforma o
    // formulário em ferramenta em vez de cadastro cego.
    const refreshDiag = () => {
      const draft = this.readItemForm(it);
      const gaps = RED.dataGaps(draft);
      const rs = RED.riskScore(draft, this.items);
      document.getElementById('re-modal-diag').innerHTML = `
        <div class="re-diag">
          <div><strong>Governança:</strong> ${RED.scoreOf(draft)}/100
            ${gaps.length ? `— falta: ${gaps.map(g => RED.esc(g)).join(', ')}` : '— cadastro completo'}</div>
          ${rs ? `<div><strong>Risco:</strong> ${rs.score} (${rs.band}) — ${RED.esc(RED.riskRecommendedAction(draft, rs))}</div>` : ''}
        </div>`;
    };
    modal.querySelectorAll('input,select,textarea').forEach(el => {
      el.addEventListener('change', refreshDiag);
    });
    refreshDiag();

    document.getElementById('re-archive')?.addEventListener('click', async () => {
      await this.saveItem({ archived: !it.archived }, it.id);
      close(); await this.loadTab();
      window.NexusApp?.showToast(it.archived ? 'Frente restaurada.' : 'Frente arquivada.', 'success');
    });

    document.getElementById('re-modal-save').addEventListener('click', async () => {
      const data = this.readItemForm(it);
      if (!data.project && !data.demand) {
        window.NexusApp?.showToast('Informe ao menos projeto ou escopo.', 'warning');
        return;
      }
      const payload = {
        project: data.project, demand: data.demand, definition: data.definition,
        owner: data.owner, product: data.product, tags: data.tags,
        status: data.status, priority: data.priority, progress: data.progress,
        startDate: data.startDate, dueDate: data.dueDate,
        nextAction: data.nextAction, executiveComment: data.executiveComment,
        predecessorId: data.predecessorId, dependencyNote: data.dependencyNote
      };
      if (data.effortHours !== undefined) payload.effortHours = data.effortHours;
      if (data.teamSize !== undefined) payload.teamSize = data.teamSize;
      await this.saveItem(payload, isNew ? null : it.id);
      close(); await this.loadTab();
      window.NexusApp?.showToast(isNew ? 'Frente criada.' : 'Frente atualizada.', 'success');
    });
  },

  readItemForm(base) {
    const val = id => (document.getElementById(id)?.value ?? '').trim();
    const num = id => {
      const v = document.getElementById(id)?.value;
      return v === '' || v === undefined ? undefined : Number(v);
    };
    const rawTags = val('f-tags').split(',').map(s => s.trim()).filter(Boolean);
    return RED.normalizeItem({
      id: base.id,
      project: val('f-project'), demand: val('f-demand'), definition: val('f-definition'),
      owner: val('f-owner'), product: val('f-product'),
      tags: RED.canonicalizeTags(rawTags, this.tagVocabulary),
      status: val('f-status'), priority: val('f-priority'),
      progress: Number(document.getElementById('f-progress')?.value ?? 0),
      startDate: val('f-start'), dueDate: val('f-due'),
      effortHours: num('f-effort'), teamSize: num('f-team'),
      nextAction: val('f-next'), executiveComment: val('f-exec'),
      predecessorId: val('f-pred'), dependencyNote: val('f-depnote'),
      lastUpdate: base.lastUpdate, archived: base.archived
    });
  },

  // ── 1. CARTEIRA ───────────────────────────────────────────────────────────

  renderPortfolio(el) {
    const list = RED.sortItems(this.visibleItems(), this.filters.sort);
    const groups = new Map();
    for (const it of list) {
      const g = it.product || RED.NO_PRODUCT;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(it);
    }

    el.innerHTML = `
      <div class="re-toolbar">
        <span>${list.length} frente(s)</span>
        <button class="btn btn-sm btn-secondary" id="re-csv"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
      </div>
      ${list.length === 0 ? `<div class="re-empty">Nenhuma frente no recorte atual.</div>` : ''}
      ${[...groups.entries()].map(([group, rows]) => {
        const del = RED.portfolioDeliveryIndex(rows);
        return `
        <div class="re-group">
          <div class="re-group-head">
            <strong>${RED.esc(group)}</strong>
            <span class="re-muted">${rows.length} frente(s)</span>
            ${del.index !== null ? `<span class="re-muted">entrega ${del.index}%</span>` : ''}
            ${del.lateCount ? `<span class="re-flag">${del.lateCount} atrasada(s)</span>` : ''}
          </div>
          <div class="table-wrapper">
            <table class="data-table re-table">
              <thead><tr>
                <th>Frente</th><th>Responsável</th><th>Status</th><th>Prioridade</th>
                <th>Prazo</th><th>Progresso</th><th>Risco</th><th>Gov.</th>
              </tr></thead>
              <tbody>
                ${rows.map(it => {
                  const rs = RED.riskScore(it, this.items);
                  const gaps = RED.dataGaps(it);
                  return `
                  <tr data-open="${it.id}" class="re-row">
                    <td>
                      <div class="re-front">${RED.esc(RED.frontLabel(it))}</div>
                      <div class="re-tags">${(it.tags || []).map(t => `<span class="re-chip ${RED.tagTone(t)}">${RED.esc(t)}</span>`).join('')}</div>
                    </td>
                    <td>${RED.esc(RED.joinOwners(RED.ownersOf(it.owner))) || '<span class="re-muted">—</span>'}</td>
                    <td>${this.badge(RED.effectiveStatus(it), RED.statusTone(RED.effectiveStatus(it)))}</td>
                    <td>${this.badge(it.priority, RED.priorityTone(it.priority))}</td>
                    <td>${RED.dateFmt(it.dueDate)}<div class="re-muted re-sm">${RED.dueTextFor(it)}</div></td>
                    <td style="min-width:110px">${this.bar(it.progress)}<span class="re-sm">${it.progress}%</span></td>
                    <td>${rs ? this.badge(`${rs.score} ${rs.band}`, RED.riskBandTone(rs.band)) : '<span class="re-muted">—</span>'}</td>
                    <td>${gaps.length ? `<span class="re-flag" title="${RED.esc(gaps.join(', '))}">${gaps.length}</span>` : `<span class="re-ok">✓</span>`}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
      }).join('')}`;

    el.querySelectorAll('[data-open]').forEach(row => {
      row.addEventListener('click', () => {
        const it = this.items.find(x => x.id === row.dataset.open);
        if (it) this.openItemModal(it);
      });
    });
    document.getElementById('re-csv')?.addEventListener('click', () => {
      RED.downloadCSV('carteira-nep.csv', list.map(it => ({
        id: it.id, projeto: it.project, escopo: it.demand, responsavel: it.owner,
        produto: it.product, status: RED.effectiveStatus(it), prioridade: it.priority,
        prazo: it.dueDate, progresso: it.progress, esforco: RED.itemEffort(it),
        risco: (RED.riskScore(it, this.items) || {}).score ?? '',
        governanca: RED.scoreOf(it), lacunas: RED.dataGaps(it).join(' | ')
      })), [
        { key: 'id', label: 'ID' }, { key: 'projeto', label: 'Projeto' }, { key: 'escopo', label: 'Escopo' },
        { key: 'responsavel', label: 'Responsável' }, { key: 'produto', label: 'Produto' },
        { key: 'status', label: 'Status' }, { key: 'prioridade', label: 'Prioridade' },
        { key: 'prazo', label: 'Prazo' }, { key: 'progresso', label: 'Progresso %' },
        { key: 'esforco', label: 'Esforço (h)' }, { key: 'risco', label: 'Risco' },
        { key: 'governanca', label: 'Governança' }, { key: 'lacunas', label: 'Lacunas' }
      ]);
    });
  },

  // ── 2. BOARD ──────────────────────────────────────────────────────────────

  renderBoard(el) {
    const list = this.visibleItems();
    // Colunas pelo status EFETIVO — "Atrasado" é derivado do prazo, senão a
    // coluna fica vazia enquanto a carteira tem frentes vencidas paradas.
    const cols = ['A iniciar', 'Em andamento', 'Em validação', 'Bloqueado', 'Atrasado', 'Pausado', 'Concluído'];
    const canEdit = this.canEdit();

    el.innerHTML = `
      <div class="re-board">
        ${cols.map(status => {
          const cards = list.filter(i => RED.effectiveStatus(i) === status);
          const horas = cards.reduce((s, i) => s + RED.itemRemainingEffort(i), 0);
          return `
          <div class="re-col" data-status="${RED.esc(status)}">
            <div class="re-col-head">
              <span>${this.badge(status, RED.statusTone(status))}</span>
              <span class="re-muted">${cards.length}${horas ? ` · ${horas}h` : ''}</span>
            </div>
            <div class="re-col-body">
              ${cards.map(it => {
                const rs = RED.riskScore(it, this.items);
                const owners = RED.ownersOf(it.owner);
                return `
                <div class="re-card ${rs && rs.band === 'Crítico' ? 're-card-crit' : ''}"
                     draggable="${canEdit}" data-id="${it.id}">
                  <div class="re-card-title">${RED.esc(RED.frontLabel(it))}</div>
                  <div class="re-tags">${(it.tags || []).slice(0, 3).map(t => `<span class="re-chip ${RED.tagTone(t)}">${RED.esc(t)}</span>`).join('')}</div>
                  ${this.bar(it.progress)}
                  <div class="re-card-meta">
                    <span>${owners.length ? RED.esc(owners[0]) + (owners.length > 1 ? ` +${owners.length - 1}` : '') : '<em>sem dono</em>'}</span>
                    ${this.badge(it.priority, RED.priorityTone(it.priority))}
                  </div>
                  <div class="re-card-meta re-sm">
                    <span title="${RED.esc(RED.dateFmt(it.dueDate))}">${RED.dueTextFor(it)}</span>
                    ${rs ? `<span class="re-risk ${RED.riskBandTone(rs.band)}">${rs.score}</span>` : ''}
                  </div>
                </div>`;
              }).join('') || '<div class="re-col-empty">—</div>'}
            </div>
          </div>`;
        }).join('')}
      </div>`;

    el.querySelectorAll('.re-card').forEach(card => {
      card.addEventListener('click', () => {
        const it = this.items.find(x => x.id === card.dataset.id);
        if (it) this.openItemModal(it);
      });
    });

    if (!canEdit) return;
    let dragged = null;
    el.querySelectorAll('.re-card').forEach(card => {
      card.addEventListener('dragstart', () => { dragged = card.dataset.id; card.classList.add('dragging'); });
      card.addEventListener('dragend', () => { card.classList.remove('dragging'); });
    });
    el.querySelectorAll('.re-col').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', () => col.classList.remove('over'));
      col.addEventListener('drop', async e => {
        e.preventDefault(); col.classList.remove('over');
        if (!dragged) return;
        const status = col.dataset.status;
        // "Atrasado" é derivado, não escolhido: soltar ali não faz sentido.
        if (status === 'Atrasado') {
          window.NexusApp?.showToast('"Atrasado" é calculado pelo prazo — mude o prazo, não o status.', 'warning');
          return;
        }
        const patch = { status };
        if (['Concluído', 'Entregue'].includes(status)) patch.progress = 100;
        await this.saveItem(patch, dragged);
        await this.loadTab();
      });
    });
  },

  // ── 3. RISCOS ─────────────────────────────────────────────────────────────

  renderRisks(el) {
    // Score usa a carteira COMPLETA como universo: resolver predecessora exige
    // enxergar itens fora do filtro atual.
    const scored = this.visibleItems()
      .map(it => ({ it, rs: RED.riskScore(it, this.items) }))
      .filter(x => x.rs)
      .sort((a, b) => b.rs.score - a.rs.score);

    const bands = ['Crítico', 'Alto', 'Médio', 'Baixo'];
    const byBand = bands.map(b => ({ band: b, n: scored.filter(x => x.rs.band === b).length }));

    el.innerHTML = `
      <div class="re-kpis">
        ${byBand.map(b => `
          <div class="re-kpi ${RED.riskBandTone(b.band)}">
            <div class="re-kpi-n">${b.n}</div><div class="re-kpi-l">${b.band}</div>
          </div>`).join('')}
      </div>
      ${scored.length === 0 ? `<div class="re-empty">Nenhuma frente ativa para avaliar.</div>` : ''}
      <div class="re-risklist">
        ${scored.map(({ it, rs }) => {
          const main = RED.riskMainFactor(rs);
          return `
          <div class="re-riskrow">
            <div class="re-riskscore ${RED.riskBandTone(rs.band)}">
              <div class="re-riskscore-n">${rs.score}</div>
              <div class="re-sm">${rs.band}</div>
            </div>
            <div class="re-riskbody">
              <div class="re-riskhead">
                <button class="re-link" data-open="${it.id}">${RED.esc(RED.frontLabel(it))}</button>
                <span class="re-muted">${RED.esc(RED.joinOwners(RED.ownersOf(it.owner)) || 'sem dono')} · ${RED.dateFmt(it.dueDate)}</span>
              </div>
              <div class="re-factors">
                ${rs.factors.map(f => `
                  <div class="re-factor ${f.key === main.key ? 'main' : ''}" title="${RED.esc(f.detail)}">
                    <span class="re-factor-l">${f.label}</span>
                    <span class="re-factor-bar"><i style="width:${f.raw}%"></i></span>
                    <span class="re-factor-v">${Math.round(f.contribution)}</span>
                  </div>`).join('')}
              </div>
              <div class="re-action">
                <i class="fa-solid fa-lightbulb"></i> ${RED.esc(RED.riskRecommendedAction(it, rs))}
                ${this.canEdit() ? `<button class="btn btn-ghost btn-sm" data-setnext="${it.id}">Definir como próxima ação</button>` : ''}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;

    el.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
      const it = this.items.find(x => x.id === b.dataset.open);
      if (it) this.openItemModal(it);
    }));
    el.querySelectorAll('[data-setnext]').forEach(b => b.addEventListener('click', async () => {
      const it = this.items.find(x => x.id === b.dataset.setnext);
      if (!it) return;
      const rs = RED.riskScore(it, this.items);
      await this.saveItem({ nextAction: RED.riskRecommendedAction(it, rs) }, it.id);
      window.NexusApp?.showToast('Próxima ação definida.', 'success');
      await this.loadTab();
    }));
  },

  // ── 4. DASHBOARD ──────────────────────────────────────────────────────────

  renderDashboard(el) {
    const list = this.visibleItems();
    const ativos = list.filter(i => !RED.isDone(i));
    const del = RED.portfolioDeliveryIndex(list);
    const criticos = ativos.filter(RED.isCriticalItem);
    const comGap = ativos.filter(i => RED.dataGaps(i).length > 0);
    const load = RED.ownerLoad(list);
    const loadRows = Object.entries(load).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxLoad = Math.max(1, ...loadRows.map(r => r[1]));
    const statusMix = RED.countsBy(ativos, i => RED.effectiveStatus(i));

    const fila = list.map(it => ({ it, rs: RED.riskScore(it, this.items) }))
      .filter(x => x.rs).sort((a, b) => b.rs.score - a.rs.score).slice(0, 5);

    el.innerHTML = `
      <div class="re-kpis">
        <div class="re-kpi"><div class="re-kpi-n">${ativos.length}</div><div class="re-kpi-l">Ativas</div></div>
        <div class="re-kpi ${del.lateCount ? 'tone-red' : ''}"><div class="re-kpi-n">${del.lateCount}</div><div class="re-kpi-l">Atrasadas</div></div>
        <div class="re-kpi ${criticos.length ? 'tone-amber' : ''}"><div class="re-kpi-n">${criticos.length}</div><div class="re-kpi-l">Risco crítico</div></div>
        <div class="re-kpi"><div class="re-kpi-n">${del.doneCount}</div><div class="re-kpi-l">Concluídas</div></div>
        <div class="re-kpi ${comGap.length ? 'tone-amber' : ''}"><div class="re-kpi-n">${comGap.length}</div><div class="re-kpi-l">Com lacuna</div></div>
      </div>

      <div class="re-grid-2">
        <div class="re-panel">
          <h4>Índice de entrega</h4>
          ${del.index === null ? `<p class="re-muted">Sem itens elegíveis.</p>` : `
            <div class="re-bigscore">${del.index}<span class="re-sm">/100</span></div>
            ${this.bar(del.index, del.index >= 70 ? 'tone-green' : del.index >= 40 ? 'tone-amber' : 'tone-red')}
            <p class="re-muted re-sm">Média ponderada por esforço. Mede entrega — não preenchimento de cadastro.
            Item ativo nunca passa de ${RED.DELIVERY_ACTIVE_CAP}%.</p>`}
        </div>
        <div class="re-panel">
          <h4>Distribuição por status</h4>
          ${Object.entries(statusMix).sort((a, b) => b[1] - a[1]).map(([s, n]) => `
            <div class="re-mixrow">
              <span>${this.badge(s, RED.statusTone(s))}</span>
              <span class="re-factor-bar"><i style="width:${(n / Math.max(1, ativos.length)) * 100}%"></i></span>
              <span>${n}</span>
            </div>`).join('') || '<p class="re-muted">Sem dados.</p>'}
        </div>
      </div>

      <div class="re-panel">
        <h4>Fila de decisão</h4>
        ${fila.length === 0 ? `<p class="re-muted">Nada exigindo decisão agora.</p>` : fila.map(({ it, rs }) => `
          <div class="re-decrow">
            <span class="re-badge ${RED.riskBandTone(rs.band)}">${rs.score}</span>
            <button class="re-link" data-open="${it.id}">${RED.esc(RED.frontLabel(it))}</button>
            <span class="re-muted re-sm">${RED.esc(RED.riskRecommendedAction(it, rs))}</span>
          </div>`).join('')}
      </div>

      <div class="re-panel">
        <h4>Carga por responsável <span class="re-muted re-sm">(horas restantes, rateadas entre co-responsáveis)</span></h4>
        ${loadRows.length === 0 ? `<p class="re-muted">Sem carga atribuída.</p>` : loadRows.map(([owner, h]) => `
          <div class="re-mixrow">
            <span class="re-owner">${RED.esc(owner)}</span>
            <span class="re-factor-bar"><i style="width:${(h / maxLoad) * 100}%"></i></span>
            <span>${Math.round(h)}h</span>
          </div>`).join('')}
      </div>`;

    el.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
      const it = this.items.find(x => x.id === b.dataset.open);
      if (it) this.openItemModal(it);
    }));
  },

  // ── 5. CAPACIDADE ─────────────────────────────────────────────────────────

  async loadAux(collection, cb) {
    try {
      const snap = await this.db.collection(collection).limit(500).get();
      return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    } catch (e) {
      console.warn(`[ReportExecutivo] ${collection} indisponível:`, e.message);
      return [];
    }
  },

  async renderCapacity(el) {
    const [absences, routines, holidaysDocs] = await Promise.all([
      this.loadAux('absences'), this.loadAux('routines'), this.loadAux('feriados')
    ]);
    const holidays = new Set(holidaysDocs.map(h => h.data || h.date).filter(Boolean));
    const canManage = RED.canManagePeople(this.myRoleKey);

    // Horizonte: até o prazo mais distante da carteira ativa, mínimo 4 semanas.
    const ativos = this.items.filter(i => !i.archived && !RED.isDone(i));
    const maxDue = ativos.map(i => RED.daysToDue(i.dueDate)).filter(d => d !== null && d > 0);
    const horizonWeeks = Math.max(4, Math.ceil((maxDue.length ? Math.max(...maxDue) : 28) / 7));
    const reliableHorizon = maxDue.length > 0;

    const janelaIni = Date.now();
    const janelaFim = janelaIni + horizonWeeks * 7 * 86400000;

    const rows = this.activeUsers.map(u => {
      const nome = u.nome || '';
      const meus = ativos.filter(i => RED.ownersOf(i.owner).includes(nome));
      const projectRemainingH = meus.reduce((s, i) => s + RED.itemRemainingEffort(i) / Math.max(1, RED.ownersOf(i.owner).length), 0);
      const fallbackH = meus.filter(RED.isEstimatedEffort)
        .reduce((s, i) => s + RED.itemRemainingEffort(i) / Math.max(1, RED.ownersOf(i.owner).length), 0);
      const routineWeeklyH = routines.filter(r => r.active !== false && (r.assigneeName === nome || r.assigneeUid === u.uid))
        .reduce((s, r) => s + RED.routineWeeklyHours(r.effort_hours ?? r.effortHours, r.recurrence), 0);

      const nominal = Number(u.capacidade_semanal_horas) || 40;
      const minhasAusencias = absences.filter(a => a.personUid === u.uid)
        .map(a => ({ inicio: a.startDate || a.inicio, fim: a.endDate || a.fim }));
      const capEfetiva = RED.effectiveWeeklyCapacity(nominal, janelaIni, janelaFim, minhasAusencias, holidays);

      const util = RED.realUtilization(projectRemainingH, horizonWeeks, routineWeeklyH, capEfetiva);
      const signal = {
        pct: util.pct,
        fallbackShare: projectRemainingH > 0 ? fallbackH / projectRemainingH : 0,
        frontCount: meus.length,
        reliableHorizon
      };
      const klass = RED.classifyUtilization(signal);
      return { u, nome, util, capEfetiva, nominal, klass, frentes: meus.length, signal };
    }).filter(r => r.frentes > 0 || r.util.routineWeeklyH > 0 || r.capEfetiva > 0)
      .sort((a, b) => (b.util.pct ?? -1) - (a.util.pct ?? -1));

    el.innerHTML = `
      <div class="re-toolbar">
        <span>Horizonte de ${horizonWeeks} semana(s)${reliableHorizon ? '' : ' <em>(padrão — sem prazos futuros na carteira)</em>'}</span>
        ${canManage ? `<button class="btn btn-sm btn-secondary" id="re-new-abs"><i class="fa-solid fa-umbrella-beach"></i> Registrar ausência</button>` : ''}
      </div>
      <div id="re-abs-slot"></div>
      <div class="table-wrapper">
        <table class="data-table re-table">
          <thead><tr>
            <th>Pessoa</th><th>Frentes</th><th>Projetos (h/sem)</th><th>Rotinas (h/sem)</th>
            <th>Total (h/sem)</th><th>Capacidade</th><th>Utilização</th><th>Leitura</th>
          </tr></thead>
          <tbody>
            ${rows.length === 0 ? `<tr><td colspan="8" class="re-empty">Sem dados de carga.</td></tr>` : rows.map(r => {
              const lbl = RED.UTILIZATION_LABELS[r.klass];
              return `
              <tr>
                <td>${RED.esc(r.nome)}</td>
                <td>${r.frentes}</td>
                <td>${r.util.projectWeeklyH}h</td>
                <td>${r.util.routineWeeklyH}h</td>
                <td><strong>${r.util.totalWeeklyH}h</strong></td>
                <td>${r.capEfetiva}h${r.capEfetiva !== r.nominal ? `<div class="re-sm re-muted">nominal ${r.nominal}h</div>` : ''}</td>
                <td>${r.util.pct === null ? '<span class="re-muted">—</span>' : `${r.util.pct}%`}</td>
                <td>${this.badge(lbl.label, lbl.tone)}${r.klass === 'review'
                  ? `<div class="re-sm re-muted">estimativa grossa ou horizonte sem lastro</div>` : ''}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <p class="re-muted re-sm">Projetos e rotinas somados na MESMA unidade (h/semana) — é o número que decide alocação.
      Utilização ≥${RED.UTILIZATION_THRESHOLDS.implausible}% é tratada como dado a revisar, não como sobrecarga real.</p>`;

    document.getElementById('re-new-abs')?.addEventListener('click', () => this.showAbsenceForm());
  },

  showAbsenceForm() {
    const slot = document.getElementById('re-abs-slot');
    if (!slot) return;
    slot.innerHTML = `
      <div class="re-panel re-inline-form">
        <select class="form-input" id="ab-person">
          ${this.activeUsers.map(u => `<option value="${u.uid}" data-nome="${RED.esc(u.nome)}">${RED.esc(u.nome)}</option>`).join('')}
        </select>
        <input type="date" class="form-input" id="ab-ini">
        <input type="date" class="form-input" id="ab-fim">
        <button class="btn btn-primary btn-sm" id="ab-save">Salvar</button>
        <button class="btn btn-ghost btn-sm" id="ab-cancel">Cancelar</button>
      </div>`;
    document.getElementById('ab-cancel').addEventListener('click', () => { slot.innerHTML = ''; });
    document.getElementById('ab-save').addEventListener('click', async () => {
      const sel = document.getElementById('ab-person');
      const startDate = document.getElementById('ab-ini').value;
      const endDate = document.getElementById('ab-fim').value;
      if (!sel.value || !startDate || !endDate) {
        window.NexusApp?.showToast('Preencha pessoa, início e fim.', 'warning'); return;
      }
      await this.db.collection('absences').add({
        personUid: sel.value, personName: sel.selectedOptions[0].dataset.nome,
        startDate, endDate, createdBy: this.myUid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      window.NexusApp?.showToast('Ausência registrada.', 'success');
      await this.loadTab();
    });
  },

  // ── 6. EXECUTIVO ──────────────────────────────────────────────────────────

  async renderExecutive(el) {
    const decisions = await this.loadAux('executive_decisions');
    const list = this.visibleItems();
    const texto = RED.executiveLines(list, this.filters);
    const canManage = RED.canViewStructure(this.myRoleKey) || this.myRoleKey === 'gerente';

    el.innerHTML = `
      <div class="re-panel">
        <div class="re-panel-head">
          <h4>Relatório executivo</h4>
          <button class="btn btn-sm btn-secondary" id="re-copy"><i class="fa-solid fa-copy"></i> Copiar</button>
        </div>
        <pre class="re-report">${RED.esc(texto)}</pre>
        <p class="re-muted re-sm">Gerado localmente a partir da carteira — determinístico, sem IA e sem custo.</p>
      </div>
      <div class="re-panel">
        <div class="re-panel-head">
          <h4>Decisões executivas</h4>
          ${canManage ? `<button class="btn btn-sm btn-primary" id="re-new-dec">+ Nova</button>` : ''}
        </div>
        <div id="re-dec-slot"></div>
        <div class="table-wrapper">
          <table class="data-table re-table">
            <thead><tr><th>Decisão</th><th>Status</th><th>Prazo</th>${canManage ? '<th></th>' : ''}</tr></thead>
            <tbody>
              ${decisions.length === 0 ? `<tr><td colspan="4" class="re-empty">Nenhuma decisão registrada.</td></tr>` : decisions.map(d => `
                <tr>
                  <td>${RED.esc(d.title)}</td>
                  <td>${this.badge(d.status || 'aberta', d.status === 'resolvida' ? 'tone-green' : d.status === 'descartada' ? 'tone-gray' : 'tone-amber')}</td>
                  <td>${RED.dateFmt(d.deadline)}</td>
                  ${canManage ? `<td>
                    <select class="re-select" data-dec="${d.id}">
                      ${['aberta', 'resolvida', 'descartada'].map(s => `<option value="${s}" ${(d.status || 'aberta') === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select></td>` : ''}
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('re-copy')?.addEventListener('click', async () => {
      await navigator.clipboard.writeText(texto);
      window.NexusApp?.showToast('Relatório copiado.', 'success');
    });
    document.getElementById('re-new-dec')?.addEventListener('click', () => {
      const slot = document.getElementById('re-dec-slot');
      slot.innerHTML = `
        <div class="re-inline-form">
          <input type="text" class="form-input" id="dec-t" placeholder="Decisão a tomar">
          <input type="date" class="form-input" id="dec-d">
          <button class="btn btn-primary btn-sm" id="dec-s">Salvar</button>
        </div>`;
      document.getElementById('dec-s').addEventListener('click', async () => {
        const title = document.getElementById('dec-t').value.trim();
        if (!title) { window.NexusApp?.showToast('Descreva a decisão.', 'warning'); return; }
        await this.db.collection('executive_decisions').add({
          title, status: 'aberta', deadline: document.getElementById('dec-d').value || null,
          createdBy: this.myUid, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await this.loadTab();
      });
    });
    el.querySelectorAll('[data-dec]').forEach(sel => sel.addEventListener('change', async () => {
      await this.db.collection('executive_decisions').doc(sel.dataset.dec).update({ status: sel.value });
      window.NexusApp?.showToast('Decisão atualizada.', 'success');
      await this.loadTab();
    }));
  },

  // ── 7. RESUMO ESTRUTURA ───────────────────────────────────────────────────

  renderDirectorSummary(el) {
    const ativos = this.items.filter(i => !i.archived);
    const gestores = this.activeUsers.filter(u => this.activeUsers.some(s => s.gestor_uid === u.uid));

    const units = gestores.map(mgr => {
      const time = [...RED.subordinateIds(this.activeUsers, mgr.uid)];
      const nomes = this.activeUsers.filter(u => time.includes(u.uid)).map(u => u.nome).filter(Boolean);
      const seus = ativos.filter(i => RED.ownersOf(i.owner).some(o => nomes.includes(o)));
      const abertos = seus.filter(i => !RED.isDone(i));
      const del = RED.portfolioDeliveryIndex(seus);
      const criticos = abertos.filter(RED.isCriticalItem);
      const gaps = abertos.filter(i => RED.dataGaps(i).length > 0);
      // Fila de atenção: soma dos scores de risco — ordena por dor real, não por contagem.
      const dor = abertos.reduce((s, i) => s + ((RED.riskScore(i, this.items) || {}).score || 0), 0);
      return {
        gestor: mgr.nome, tamanho: nomes.length, total: seus.length, abertos: abertos.length,
        atrasados: del.lateCount, criticos: criticos.length, gaps: gaps.length,
        entrega: del.index, dor
      };
    }).sort((a, b) => b.dor - a.dor);

    el.innerHTML = `
      <p class="re-muted">Unidades ordenadas por dor acumulada (soma dos scores de risco das frentes abertas).</p>
      <div class="table-wrapper">
        <table class="data-table re-table">
          <thead><tr><th>Gestor</th><th>Time</th><th>Frentes</th><th>Abertas</th>
            <th>Atrasadas</th><th>Críticas</th><th>Lacunas</th><th>Entrega</th></tr></thead>
          <tbody>
            ${units.length === 0 ? `<tr><td colspan="8" class="re-empty">Nenhuma unidade com subordinados e frentes atribuídas.</td></tr>` : units.map(u => `
              <tr>
                <td>${RED.esc(u.gestor)}</td>
                <td>${u.tamanho}</td>
                <td>${u.total}</td>
                <td>${u.abertos}</td>
                <td class="${u.atrasados ? 're-flag-cell' : ''}">${u.atrasados}</td>
                <td class="${u.criticos ? 're-flag-cell' : ''}">${u.criticos}</td>
                <td>${u.gaps}</td>
                <td>${u.entrega === null ? '—' : `${u.entrega}% ${this.bar(u.entrega, u.entrega >= 70 ? 'tone-green' : u.entrega >= 40 ? 'tone-amber' : 'tone-red')}`}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  // ── 8. ARQUIVADOS ─────────────────────────────────────────────────────────

  renderArchived(el) {
    const arq = this.items.filter(i => i.archived);
    el.innerHTML = `
      <div class="re-toolbar"><span>${arq.length} frente(s) arquivada(s).</span></div>
      <div class="table-wrapper">
        <table class="data-table re-table">
          <thead><tr><th>Frente</th><th>Responsável</th><th>Status</th><th>Prazo</th><th></th></tr></thead>
          <tbody>
            ${arq.length === 0 ? `<tr><td colspan="5" class="re-empty">Nenhum item arquivado.</td></tr>` : arq.map(it => `
              <tr>
                <td>${RED.esc(RED.frontLabel(it))}</td>
                <td>${RED.esc(RED.joinOwners(RED.ownersOf(it.owner))) || '—'}</td>
                <td>${this.badge(it.status, RED.statusTone(it.status))}</td>
                <td>${RED.dateFmt(it.dueDate)}</td>
                <td>${this.canEdit() ? `<button class="btn btn-sm btn-secondary" data-restore="${it.id}"><i class="fa-solid fa-rotate-left"></i> Restaurar</button>` : ''}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    el.querySelectorAll('[data-restore]').forEach(b => b.addEventListener('click', async () => {
      await this.saveItem({ archived: false }, b.dataset.restore);
      window.NexusApp?.showToast('Frente restaurada.', 'success');
      await this.loadTab();
    }));
  },

  // ── 9. AGENDA ─────────────────────────────────────────────────────────────

  async renderAgenda(el) {
    const events = (await this.loadAux('events')).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const canEdit = RED.canEditAgenda(this.myRoleKey);
    const hoje = RED.hojeIsoBrt();

    el.innerHTML = `
      <div class="re-toolbar">
        <span>${events.filter(e => String(e.date) >= hoje).length} evento(s) futuro(s) de ${events.length}.</span>
        <div>
          <button class="btn btn-sm btn-secondary" id="re-ics"><i class="fa-solid fa-file-export"></i> Exportar ICS</button>
          ${canEdit ? `<button class="btn btn-sm btn-primary" id="re-new-ev">+ Evento</button>` : ''}
        </div>
      </div>
      <div id="re-ev-slot"></div>
      <div class="table-wrapper">
        <table class="data-table re-table">
          <thead><tr><th>Data</th><th>Evento</th><th>Tipo</th><th></th></tr></thead>
          <tbody>
            ${events.length === 0 ? `<tr><td colspan="4" class="re-empty">Nenhum evento cadastrado.</td></tr>` : events.map(e => `
              <tr class="${String(e.date) < hoje ? 're-past' : ''}">
                <td>${RED.dateFmt(e.date)}</td>
                <td>${RED.esc(e.title)}</td>
                <td>${this.badge(e.type, RED.eventTypeTone(e.type))}</td>
                <td>${canEdit ? `<button class="btn btn-ghost btn-sm" data-del-ev="${e.id}"><i class="fa-solid fa-trash"></i></button>` : ''}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    document.getElementById('re-ics')?.addEventListener('click', () => this.exportIcs(events));
    document.getElementById('re-new-ev')?.addEventListener('click', () => {
      const slot = document.getElementById('re-ev-slot');
      slot.innerHTML = `
        <div class="re-inline-form">
          <input type="text" class="form-input" id="ev-t" placeholder="Título do evento">
          <input type="date" class="form-input" id="ev-d">
          <select class="form-input" id="ev-ty">${RED.EVENT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}</select>
          <button class="btn btn-primary btn-sm" id="ev-s">Salvar</button>
        </div>`;
      document.getElementById('ev-s').addEventListener('click', async () => {
        const title = document.getElementById('ev-t').value.trim();
        const date = document.getElementById('ev-d').value;
        if (!title || !date) { window.NexusApp?.showToast('Preencha título e data.', 'warning'); return; }
        await this.db.collection('events').add({
          title, date, type: document.getElementById('ev-ty').value,
          createdBy: this.myUid, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await this.loadTab();
      });
    });
    el.querySelectorAll('[data-del-ev]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Excluir este evento?')) return;
      await this.db.collection('events').doc(b.dataset.delEv).delete();
      await this.loadTab();
    }));
  },

  exportIcs(events) {
    const pad = n => String(n).padStart(2, '0');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NEP//Report Executivo//PT-BR'];
    for (const e of events) {
      if (!e.date) continue;
      const d = new Date(e.date + 'T00:00:00');
      lines.push('BEGIN:VEVENT', `UID:${e.id}@nep`,
        `DTSTART;VALUE=DATE:${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`,
        `SUMMARY:${String(e.title || '').replace(/\r?\n/g, ' ')}`,
        `CATEGORIES:${e.type || 'Outro'}`, 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'agenda-nep.ics'; a.click();
    URL.revokeObjectURL(url);
  },

  // ── 10. MELHORIAS ─────────────────────────────────────────────────────────

  IMPROVEMENT_STAGES: ['Solicitação', 'Triagem', 'Em execução', 'Implementado'],
  IMPROVEMENT_WEEKLY_GOAL: 1,

  async renderImprovements(el) {
    const list = (await this.loadAux('process_improvements'))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const canManage = RED.canEditRoutines(this.myRoleKey);
    const funnel = this.IMPROVEMENT_STAGES.map(s => ({ s, n: list.filter(m => (m.stage || 'Solicitação') === s).length }));
    const implementadas = list.filter(m => m.stage === 'Implementado');

    // Lead time mediano (dias) — só de quem já fechou o ciclo.
    const leads = implementadas.map(m => {
      const ini = m.createdAt?.seconds, fim = m.implementedAt?.seconds;
      return ini && fim ? Math.round((fim - ini) / 86400) : null;
    }).filter(v => v !== null).sort((a, b) => a - b);
    const mediana = leads.length ? leads[Math.floor(leads.length / 2)] : null;

    el.innerHTML = `
      <div class="re-toolbar">
        <span>Funil de melhoria de processo</span>
        ${this.canEdit() ? `<button class="btn btn-sm btn-primary" id="re-new-imp">+ Solicitação</button>` : ''}
      </div>
      <div class="re-kpis">
        ${funnel.map(f => `<div class="re-kpi"><div class="re-kpi-n">${f.n}</div><div class="re-kpi-l">${f.s}</div></div>`).join('')}
        <div class="re-kpi"><div class="re-kpi-n">${mediana === null ? '—' : mediana + 'd'}</div><div class="re-kpi-l">Lead time mediano</div></div>
      </div>
      <div id="re-imp-slot"></div>
      <div class="table-wrapper">
        <table class="data-table re-table">
          <thead><tr><th>Melhoria</th><th>Estágio</th><th>Criticidade</th><th>Solicitada</th>${canManage ? '<th>Mover</th>' : ''}</tr></thead>
          <tbody>
            ${list.length === 0 ? `<tr><td colspan="5" class="re-empty">Nenhuma melhoria registrada.</td></tr>` : list.map(m => `
              <tr>
                <td>${RED.esc(m.title)}</td>
                <td>${this.badge(m.stage || 'Solicitação', m.stage === 'Implementado' ? 'tone-green' : 'tone-blue')}</td>
                <td>${this.badge(m.criticality || '—', m.criticality === 'Alta' ? 'tone-red' : m.criticality === 'Média' ? 'tone-amber' : 'tone-gray')}</td>
                <td>${m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : '—'}</td>
                ${canManage ? `<td><select class="re-select" data-imp="${m.id}" data-from="${RED.esc(m.stage || 'Solicitação')}" data-by="${RED.esc(m.requestedBy || '')}">
                  ${this.IMPROVEMENT_STAGES.map(s => `<option value="${s}" ${s === (m.stage || 'Solicitação') ? 'selected' : ''}>${s}</option>`).join('')}
                </select></td>` : ''}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    document.getElementById('re-new-imp')?.addEventListener('click', () => {
      const slot = document.getElementById('re-imp-slot');
      slot.innerHTML = `
        <div class="re-inline-form">
          <input type="text" class="form-input" id="imp-t" placeholder="Melhoria proposta">
          <select class="form-input" id="imp-c"><option>Baixa</option><option selected>Média</option><option>Alta</option></select>
          <button class="btn btn-primary btn-sm" id="imp-s">Salvar</button>
        </div>`;
      document.getElementById('imp-s').addEventListener('click', async () => {
        const title = document.getElementById('imp-t').value.trim();
        if (!title) { window.NexusApp?.showToast('Descreva a melhoria.', 'warning'); return; }
        await this.db.collection('process_improvements').add({
          title, criticality: document.getElementById('imp-c').value, stage: 'Solicitação',
          requestedBy: this.myUid, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await this.loadTab();
      });
    });

    el.querySelectorAll('[data-imp]').forEach(sel => sel.addEventListener('change', async () => {
      const id = sel.dataset.imp, novo = sel.value, anterior = sel.dataset.from;
      const patch = { stage: novo, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      if (novo === 'Implementado') patch.implementedAt = firebase.firestore.FieldValue.serverTimestamp();
      await this.db.collection('process_improvements').doc(id).update(patch);
      await this.db.collection('improvement_movements').add({
        improvementId: id, fromStage: anterior, toStage: novo,
        movedBy: this.myUid, movedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      // Ponto só quando OUTRA pessoa valida a implementação — quem executa a
      // transição nunca credita a si mesmo (mesma regra anti-fraude do NEP).
      if (novo === 'Implementado' && sel.dataset.by && sel.dataset.by !== this.myUid) {
        window.NexusGamification?.addPoints?.(sel.dataset.by, 20, 'melhoria_implementada', id);
      }
      window.NexusApp?.showToast('Estágio atualizado.', 'success');
      await this.loadTab();
    }));
  },

  // ── 11. MATERIAIS ─────────────────────────────────────────────────────────

  MATERIAL_CRITERIA: [
    { key: 'clareza', label: 'Clareza' },
    { key: 'profundidade', label: 'Profundidade' },
    { key: 'aplicabilidade', label: 'Aplicabilidade' },
    { key: 'atualidade', label: 'Atualidade' }
  ],

  materialComposite(m) {
    const vals = this.MATERIAL_CRITERIA.map(c => Number(m[c.key]) || 0).filter(v => v > 0);
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 20); // 1–5 → 0–100
  },

  async renderMaterials(el) {
    const list = await this.loadAux('materials');
    const canManage = ['admin', 'superintendente', 'diretor', 'gerente', 'coordenador'].includes(this.myRoleKey);
    const scores = list.map(m => this.materialComposite(m)).filter(s => s !== null);
    const media = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    el.innerHTML = `
      <div class="re-toolbar">
        <span>Avaliação por rubrica — nota determinística, sem IA.</span>
        ${canManage ? `<button class="btn btn-sm btn-primary" id="re-new-mat">+ Material</button>` : ''}
      </div>
      <div class="re-kpis">
        <div class="re-kpi"><div class="re-kpi-n">${list.length}</div><div class="re-kpi-l">Materiais</div></div>
        <div class="re-kpi"><div class="re-kpi-n">${scores.length}</div><div class="re-kpi-l">Avaliados</div></div>
        <div class="re-kpi"><div class="re-kpi-n">${media === null ? '—' : media}</div><div class="re-kpi-l">Nota média</div></div>
      </div>
      <div id="re-mat-slot"></div>
      <div class="table-wrapper">
        <table class="data-table re-table">
          <thead><tr><th>Material</th><th>Link</th>
            ${this.MATERIAL_CRITERIA.map(c => `<th>${c.label}</th>`).join('')}<th>Composta</th></tr></thead>
          <tbody>
            ${list.length === 0 ? `<tr><td colspan="7" class="re-empty">Nenhum material cadastrado.</td></tr>` : list.map(m => {
              const s = this.materialComposite(m);
              return `
              <tr>
                <td>${RED.esc(m.title)}</td>
                <td>${m.url ? `<a href="${RED.esc(m.url)}" target="_blank" rel="noopener noreferrer">abrir</a>` : '—'}</td>
                ${this.MATERIAL_CRITERIA.map(c => `<td>${m[c.key] || '—'}</td>`).join('')}
                <td>${s === null ? '<span class="re-muted">sem avaliação</span>'
                  : this.badge(`${s}/100`, s >= 80 ? 'tone-green' : s >= 60 ? 'tone-amber' : 'tone-red')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

    document.getElementById('re-new-mat')?.addEventListener('click', () => {
      const slot = document.getElementById('re-mat-slot');
      slot.innerHTML = `
        <div class="re-panel">
          <div class="re-grid-2">
            <input type="text" class="form-input" id="mat-t" placeholder="Título do material">
            <input type="url" class="form-input" id="mat-u" placeholder="Link (opcional)">
          </div>
          <div class="re-grid-4">
            ${this.MATERIAL_CRITERIA.map(c => `
              <label class="re-sm">${c.label} (1–5)
                <input type="number" class="form-input" id="mat-${c.key}" min="1" max="5" value="3"></label>`).join('')}
          </div>
          <button class="btn btn-primary btn-sm" id="mat-s">Salvar</button>
        </div>`;
      document.getElementById('mat-s').addEventListener('click', async () => {
        const title = document.getElementById('mat-t').value.trim();
        if (!title) { window.NexusApp?.showToast('Dê um título ao material.', 'warning'); return; }
        const data = {
          title, url: document.getElementById('mat-u').value.trim(),
          createdBy: this.myUid, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        this.MATERIAL_CRITERIA.forEach(c => { data[c.key] = Number(document.getElementById(`mat-${c.key}`).value) || 0; });
        await this.db.collection('materials').add(data);
        await this.loadTab();
      });
    });
  },

  // ── 12. ROTINAS + LISTA PESSOAL ───────────────────────────────────────────

  async renderRoutines(el) {
    const [routines, personal] = await Promise.all([
      this.loadAux('routines'),
      (async () => {
        try {
          const snap = await this.db.collection('personal_tasks').where('userId', '==', this.myUid).limit(60).get();
          return snap.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (a.order || 0) - (b.order || 0));
        } catch (e) { return []; }
      })()
    ]);
    const canManage = RED.canEditRoutines(this.myRoleKey);
    const minhas = routines.filter(r => r.assigneeUid === this.myUid);
    const mostrar = canManage ? routines : minhas;

    el.innerHTML = `
      <div class="re-grid-2-wide">
        <div>
          <div class="re-toolbar">
            <span>Rotinas de processo ${canManage ? '(todas)' : '(suas)'}</span>
            ${canManage ? `<button class="btn btn-sm btn-primary" id="re-new-rt">+ Rotina</button>` : ''}
          </div>
          <div id="re-rt-slot"></div>
          <div class="table-wrapper">
            <table class="data-table re-table">
              <thead><tr><th>Rotina</th><th>Responsável</th><th>Recorrência</th><th>h/sem</th><th>Custo/ano</th></tr></thead>
              <tbody>
                ${mostrar.length === 0 ? `<tr><td colspan="5" class="re-empty">Nenhuma rotina cadastrada.</td></tr>` : mostrar.map(r => `
                  <tr>
                    <td>${RED.esc(r.title)}${r.type ? ` ${this.badge(r.type, RED.routineTypeTone(r.type))}` : ''}</td>
                    <td>${RED.esc(r.assigneeName || '—')}</td>
                    <td>${RED.esc(r.recurrence || '—')}</td>
                    <td>${Math.round(RED.routineWeeklyHours(r.effort_hours ?? r.effortHours, r.recurrence) * 10) / 10}h</td>
                    <td>${RED.manualCostHoursPerYear(r)}h</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <p class="re-muted re-sm">Custo/ano é a conta que justifica automatizar: esforço por execução × execuções em ${RED.BUSINESS_DAYS_PER_YEAR} dias úteis.</p>
        </div>
        <div>
          <div class="re-toolbar"><span>Minha lista de hoje</span></div>
          <div class="re-panel">
            <p class="re-muted re-sm"><i class="fa-solid fa-lock"></i> Estritamente privada — nem gestor, nem diretor, nem admin veem esta lista.</p>
            <div id="re-personal">
              ${personal.length === 0 ? `<p class="re-muted">Sem itens hoje.</p>` : personal.map(t => `
                <label class="re-task">
                  <input type="checkbox" data-task="${t.id}" ${t.done ? 'checked' : ''}>
                  <span class="${t.done ? 're-done' : ''}">${RED.esc(t.text)}</span>
                </label>`).join('')}
            </div>
            <div class="re-inline-form">
              <input type="text" class="form-input" id="pt-new" placeholder="Novo item">
              <button class="btn btn-primary btn-sm" id="pt-add">+</button>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('re-new-rt')?.addEventListener('click', () => {
      const slot = document.getElementById('re-rt-slot');
      slot.innerHTML = `
        <div class="re-inline-form">
          <input type="text" class="form-input" id="rt-t" placeholder="Título da rotina">
          <select class="form-input" id="rt-a">${this.activeUsers.map(u => `<option value="${u.uid}" data-nome="${RED.esc(u.nome)}">${RED.esc(u.nome)}</option>`).join('')}</select>
          <select class="form-input" id="rt-r">${RED.ROUTINE_RECURRENCES.map(r => `<option value="${r}">${r}</option>`).join('')}</select>
          <input type="number" class="form-input" id="rt-h" placeholder="h/execução" min="0" step="0.5" style="max-width:110px">
          <button class="btn btn-primary btn-sm" id="rt-s">Salvar</button>
        </div>`;
      document.getElementById('rt-s').addEventListener('click', async () => {
        const title = document.getElementById('rt-t').value.trim();
        const sel = document.getElementById('rt-a');
        if (!title || !sel.value) { window.NexusApp?.showToast('Preencha título e responsável.', 'warning'); return; }
        await this.db.collection('routines').add({
          title, assigneeUid: sel.value, assigneeName: sel.selectedOptions[0].dataset.nome,
          recurrence: document.getElementById('rt-r').value,
          effort_hours: Number(document.getElementById('rt-h').value) || 0,
          active: true, createdBy: this.myUid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await this.loadTab();
      });
    });

    el.querySelectorAll('[data-task]').forEach(cb => cb.addEventListener('change', async () => {
      await this.db.collection('personal_tasks').doc(cb.dataset.task).update({
        done: cb.checked,
        concluida_em: cb.checked ? firebase.firestore.FieldValue.serverTimestamp() : null
      });
      await this.loadTab();
    }));
    document.getElementById('pt-add')?.addEventListener('click', async () => {
      const input = document.getElementById('pt-new');
      const text = input.value.trim();
      if (!text) return;
      await this.db.collection('personal_tasks').add({
        userId: this.myUid, text, done: false, order: personal.length,
        dia: RED.hojeIsoBrt(), createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await this.loadTab();
    });
  },

  // ── 13. OKRs ──────────────────────────────────────────────────────────────

  async renderOkrs(el) {
    const [objectives, targets, measurements] = await Promise.all([
      this.loadAux('okr_objectives'), this.loadAux('okr_targets'), this.loadAux('okr_measurements')
    ]);
    const isGestao = RED.canViewStructure(this.myRoleKey) || this.myRoleKey === 'gerente';
    const visiveis = isGestao ? objectives : objectives.filter(o => o.ownerUid === this.myUid);
    const canEdit = this.canEdit();

    // Atingimento por KR: média dos meses lançados, pela direção do indicador.
    const atingimentoDoKr = kr => {
      const ms = measurements.filter(m => m.targetId === kr.id && m.resultado !== null && m.resultado !== undefined);
      if (!ms.length) return null;
      const vals = ms.map(m => RED.calculateOkrAtingimento(Number(m.resultado), Number(kr.meta), kr.direcao))
        .filter(v => v !== null);
      if (!vals.length) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    el.innerHTML = `
      <div class="re-toolbar">
        <span>${isGestao ? 'Ciclo de OKR' : 'Meus resultados-chave'}</span>
        ${canEdit ? `<button class="btn btn-sm btn-primary" id="re-new-obj">+ Objetivo</button>` : ''}
      </div>
      <div id="re-okr-slot"></div>
      ${visiveis.length === 0 ? `<div class="re-empty">Nenhum objetivo cadastrado.</div>` : visiveis.map(o => {
        const krs = targets.filter(t => t.objectiveId === o.id);
        const contribs = krs.map(k => RED.okrRollupContribution(atingimentoDoKr(k))).filter(v => v !== null);
        const score = contribs.length ? Math.round((contribs.reduce((a, b) => a + b, 0) / contribs.length) * 100) : null;
        const greenLine = Math.round(RED.okrObjectiveGreenLine(krs.map(k => ({ kind: k.kind, peso: k.peso || 1 }))) * 100);
        const fcaLine = Math.round(RED.okrObjectiveFcaLine(krs.map(k => ({ kind: k.kind, peso: k.peso || 1 }))) * 100);
        const precisaFca = RED.objectiveNeedsCycleFca(score, fcaLine);

        return `
        <div class="re-panel re-okr">
          <div class="re-okr-head">
            <div>
              <strong>${RED.esc(o.title)}</strong>
              <div class="re-muted re-sm">${RED.esc(o.ownerName || '')} · ${RED.esc(o.periodo || '')} · verde a partir de ${greenLine}%</div>
            </div>
            <div class="re-okr-score ${RED.okrScoreTone(score)}">${score === null ? '—' : score + '%'}</div>
          </div>
          <table class="data-table re-table">
            <thead><tr><th>Resultado-chave</th><th>Tipo</th><th>Meta</th><th>Direção</th><th>Atingimento</th><th>Status</th>${canEdit ? '<th>Lançar</th>' : ''}</tr></thead>
            <tbody>
              ${krs.length === 0 ? `<tr><td colspan="7" class="re-muted">Sem resultados-chave. ${canEdit ? 'Adicione abaixo.' : ''}</td></tr>` : krs.map(k => {
                const a = atingimentoDoKr(k);
                const pct = a === null ? null : Math.round(a * 100);
                const band = RED.okrAtingimentoBand(a, k.kind);
                const st = RED.resolveOkrStatus(a, k.kind);
                const sandbag = RED.isSandbagMeta(Number(k.meta), k.baseline_numerica, k.direcao);
                const semBaseline = RED.okrBaselineGap({ baseline_numerica: k.baseline_numerica, direcao: k.direcao });
                return `
                <tr>
                  <td>${RED.esc(k.title)}
                    ${sandbag ? `<div class="re-flag re-sm" title="A meta não supera o ponto de partida">meta não supera o baseline</div>` : ''}
                    ${semBaseline ? `<div class="re-muted re-sm" title="Sem baseline não é possível checar se a meta é ambiciosa">sem baseline</div>` : ''}
                  </td>
                  <td>${this.badge(RED.OKR_KIND_LABELS[RED.okrKind(k.kind)], RED.okrKind(k.kind) === 'aspiracional' ? 'tone-purple' : 'tone-blue')}</td>
                  <td>${RED.formatOkrValue(Number(k.meta), k.unidade)}</td>
                  <td class="re-sm">${RED.esc(k.direcao || '—')}</td>
                  <td>${pct === null ? '<span class="re-muted">não medido</span>' : `
                    <div class="re-okr-at ${band === 'verde' ? 'tone-green' : band === 'ambar' ? 'tone-amber' : 'tone-red'}">${pct}%</div>
                    ${this.bar(Math.min(100, pct), band === 'verde' ? 'tone-green' : band === 'ambar' ? 'tone-amber' : 'tone-red')}
                    ${RED.okrMetaLikelyLoose(pct) ? `<div class="re-muted re-sm">cravou o teto — meta pode estar frouxa</div>` : ''}`}</td>
                  <td>${this.badge(st, RED.okrStatusTone(st))}</td>
                  ${canEdit ? `<td>
                    <div class="re-inline-form re-sm">
                      <input type="number" step="any" class="form-input" style="max-width:90px" id="mv-${k.id}" placeholder="valor">
                      <button class="btn btn-ghost btn-sm" data-measure="${k.id}">✓</button>
                    </div></td>` : ''}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
          ${precisaFca ? `<div class="re-fca">
            <strong>FCA de ciclo exigido</strong> — o objetivo fechou em ${score}%, abaixo da linha de ${fcaLine}%.
            <div class="re-sm">${RED.esc(this.fcaSuggestion(krs, atingimentoDoKr))}</div>
          </div>` : ''}
          ${canEdit ? `<button class="btn btn-ghost btn-sm" data-newkr="${o.id}">+ Resultado-chave</button>` : ''}
        </div>`;
      }).join('')}`;

    document.getElementById('re-new-obj')?.addEventListener('click', () => {
      const slot = document.getElementById('re-okr-slot');
      slot.innerHTML = `
        <div class="re-inline-form">
          <input type="text" class="form-input" id="ob-t" placeholder="Objetivo">
          <input type="text" class="form-input" id="ob-p" placeholder="Período (ex: Q3 2026)" style="max-width:170px">
          <button class="btn btn-primary btn-sm" id="ob-s">Salvar</button>
        </div>`;
      document.getElementById('ob-s').addEventListener('click', async () => {
        const title = document.getElementById('ob-t').value.trim();
        if (!title) { window.NexusApp?.showToast('Descreva o objetivo.', 'warning'); return; }
        await this.db.collection('okr_objectives').add({
          title, periodo: document.getElementById('ob-p').value.trim(),
          ownerUid: this.myUid, ownerName: this.myName,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await this.loadTab();
      });
    });

    el.querySelectorAll('[data-newkr]').forEach(b => b.addEventListener('click', async () => {
      const title = prompt('Resultado-chave (o que será medido):');
      if (!title) return;
      const meta = Number(prompt('Meta numérica:'));
      if (!Number.isFinite(meta)) { window.NexusApp?.showToast('Meta precisa ser um número.', 'warning'); return; }
      const direcao = prompt('Direção — 1) Maior é melhor  2) Menor é melhor  3) Igual/meta exata', '1');
      const baseline = prompt('Ponto de partida (baseline) — deixe vazio se não souber:');
      await this.db.collection('okr_targets').add({
        objectiveId: b.dataset.newkr, title, meta,
        direcao: RED.DIRECOES[Math.max(0, Math.min(2, Number(direcao) - 1))] || RED.DIRECOES[0],
        baseline_numerica: baseline === '' || baseline === null ? null : Number(baseline),
        kind: 'comprometido', peso: 1, unidade: '',
        createdBy: this.myUid, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await this.loadTab();
    }));

    el.querySelectorAll('[data-measure]').forEach(b => b.addEventListener('click', async () => {
      const input = document.getElementById(`mv-${b.dataset.measure}`);
      const v = Number(input.value);
      if (!Number.isFinite(v) || input.value === '') { window.NexusApp?.showToast('Informe o valor apurado.', 'warning'); return; }
      await this.db.collection('okr_measurements').add({
        targetId: b.dataset.measure, resultado: v,
        mes: RED.ALL_OKR_MONTHS[new Date().getMonth()],
        date: RED.hojeIsoBrt(), createdBy: this.myUid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      window.NexusApp?.showToast('Medição lançada.', 'success');
      await this.loadTab();
    }));
  },

  /** Sugestão de FCA determinística (sem IA): aponta o KR com maior gap e a
   *  alavanca correspondente. O original chama um modelo aqui; a estrutura é a
   *  mesma, só o texto é gerado por regra. */
  fcaSuggestion(krs, atingimentoDoKr) {
    const comAt = krs.map(k => ({ k, a: atingimentoDoKr(k) })).filter(x => x.a !== null);
    if (!comAt.length) return 'Sem medições suficientes para apontar causa — lance os resultados do período primeiro.';
    const pior = comAt.sort((a, b) => a.a - b.a)[0];
    const pct = Math.round(pior.a * 100);
    const kind = RED.okrKind(pior.k.kind);
    const linha = Math.round(RED.OKR_KIND_THRESHOLDS[kind].green * 100);
    return `Maior lacuna: "${pior.k.title}" a ${pct}% (linha do verde: ${linha}%). `
      + (pct < 50
        ? 'Gap grande demais para recuperação no ciclo — reveja se a meta era executável ou se faltou recurso.'
        : 'Recuperável: defina uma ação semanal com dono e prazo até fechar a diferença.');
  },

  // ── 14. DESENVOLVIMENTO ───────────────────────────────────────────────────

  async renderDevelopment(el) {
    const [pdis, oneOnOnes] = await Promise.all([
      (async () => {
        try {
          const s = await this.db.collection('user_pdis').where('userId', '==', this.myUid).limit(1).get();
          return s.docs[0] ? Object.assign({ id: s.docs[0].id }, s.docs[0].data()) : null;
        } catch (e) { return null; }
      })(),
      (async () => {
        try {
          const s = await this.db.collection('one_on_ones').where('collaboratorUid', '==', this.myUid).limit(30).get();
          return s.docs.map(d => Object.assign({ id: d.id }, d.data()))
            .sort((a, b) => String(b.date).localeCompare(String(a.date)));
        } catch (e) { return []; }
      })()
    ]);
    this.myPdi = pdis;
    const goals = (pdis && pdis.goals) || [];
    const todasAcoes = oneOnOnes.flatMap(o => o.actions || []);
    const adh = RED.oneOnOneAdherence(todasAcoes);

    el.innerHTML = `
      <div class="re-kpis">
        <div class="re-kpi"><div class="re-kpi-n">${goals.length}</div><div class="re-kpi-l">Metas de PDI</div></div>
        <div class="re-kpi"><div class="re-kpi-n">${goals.filter(g => g.done).length}</div><div class="re-kpi-l">Concluídas</div></div>
        <div class="re-kpi ${adh.pct !== null && adh.pct < 70 ? 'tone-amber' : ''}">
          <div class="re-kpi-n">${adh.pct === null ? '—' : adh.pct + '%'}</div><div class="re-kpi-l">Aderência 1:1</div></div>
        <div class="re-kpi ${adh.overdue ? 'tone-red' : ''}"><div class="re-kpi-n">${adh.overdue}</div><div class="re-kpi-l">Ações vencidas</div></div>
      </div>

      <div class="re-grid-2-wide">
        <div class="re-panel">
          <div class="re-panel-head"><h4>Meu PDI</h4><button class="btn btn-sm btn-primary" id="re-add-goal">+ Meta</button></div>
          ${goals.length === 0 ? `<p class="re-muted">Nenhuma meta cadastrada.</p>` : goals.map((g, i) => `
            <label class="re-task">
              <input type="checkbox" data-goal="${i}" ${g.done ? 'checked' : ''}>
              <span class="${g.done ? 're-done' : ''}">${RED.esc(g.text)}</span>
            </label>`).join('')}
        </div>
        <div class="re-panel">
          <h4>Atas de 1:1</h4>
          ${oneOnOnes.length === 0 ? `<p class="re-muted">Nenhuma ata registrada.</p>` : oneOnOnes.map(o => {
            const a = RED.oneOnOneAdherence(o.actions || []);
            return `
            <div class="re-ata">
              <div class="re-ata-head">
                <strong>${RED.dateFmt(o.date)}</strong>
                ${a.pct !== null ? this.badge(`${a.pct}% aderência`, a.pct >= 70 ? 'tone-green' : 'tone-amber') : ''}
              </div>
              ${o.notes ? `<div class="re-sm">${RED.esc(o.notes)}</div>` : ''}
              ${(o.actions || []).map(ac => `
                <div class="re-actionrow">
                  ${this.badge(RED.ONE_ON_ONE_ACTION_LABELS[ac.status] || ac.status, RED.oneOnOneActionTone(ac.status))}
                  <span>${RED.esc(ac.text)}</span>
                  ${RED.oneOnOneActionOverdue(ac, Date.now()) ? '<span class="re-flag re-sm">vencida</span>' : ''}
                </div>`).join('')}
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="re-note">
        <strong>Perfil Vértice</strong> — a avaliação situacional de 108 itens do Report Executivo não foi portada:
        o banco de perguntas não está no Supabase do app irmão (provável fonte separada), então portar de memória
        produziria um instrumento diferente com o mesmo nome. Precisa do arquivo original para ser fiel.
      </div>`;

    document.getElementById('re-add-goal')?.addEventListener('click', async () => {
      const text = prompt('Meta de desenvolvimento:');
      if (!text) return;
      const novas = [...goals, { text, done: false }];
      if (this.myPdi) await this.db.collection('user_pdis').doc(this.myPdi.id).update({ goals: novas });
      else await this.db.collection('user_pdis').add({ userId: this.myUid, goals: novas });
      await this.loadTab();
    });
    el.querySelectorAll('[data-goal]').forEach(cb => cb.addEventListener('change', async () => {
      const novas = [...goals];
      novas[Number(cb.dataset.goal)] = Object.assign({}, novas[Number(cb.dataset.goal)], { done: cb.checked });
      await this.db.collection('user_pdis').doc(this.myPdi.id).update({ goals: novas });
      await this.loadTab();
    }));
  },

  // ── 15. MEU SCORECARD ─────────────────────────────────────────────────────

  median(nums) {
    if (!nums.length) return null;
    const s = [...nums].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
  },

  percentile(nums, p) {
    if (!nums.length) return null;
    const s = [...nums].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
  },

  /** Piso N≥5 contra reidentificação: abaixo disso o "rollup do time" viraria
   *  a nota de uma pessoa identificável. */
  TEAM_FLOOR: 5,

  async renderScorecard(el) {
    const [materials, improvements] = await Promise.all([
      this.loadAux('materials'), this.loadAux('process_improvements')
    ]);
    const meus = materials.filter(m => m.createdBy === this.myUid);
    const minhasNotas = meus.map(m => this.materialComposite(m)).filter(s => s !== null);
    const minhaMediana = this.median(minhasNotas);

    const semanaAtras = Date.now() / 1000 - 7 * 86400;
    const minhasImpl = improvements.filter(m => m.requestedBy === this.myUid
      && m.stage === 'Implementado' && (m.implementedAt?.seconds || 0) >= semanaAtras);
    const metaPct = Math.min(100, Math.round((minhasImpl.length / this.IMPROVEMENT_WEEKLY_GOAL) * 100));

    // Minhas frentes: o scorecard tem que refletir entrega, não só material.
    const minhasFrentes = this.items.filter(i => !i.archived && RED.ownersOf(i.owner).includes(this.myName));
    const del = RED.portfolioDeliveryIndex(minhasFrentes);

    // Rollup do time (só gestor, e só acima do piso).
    const time = [...RED.subordinateIds(this.activeUsers, this.myUid)].filter(u => u !== this.myUid);
    const nomesTime = this.activeUsers.filter(u => time.includes(u.uid)).map(u => u.nome);
    let rollup = null;
    if (nomesTime.length >= this.TEAM_FLOOR) {
      // O score do próprio líder nunca entra no rollup do time.
      const notasTime = this.activeUsers.filter(u => time.includes(u.uid)).map(u => {
        const suas = materials.filter(m => m.createdBy === u.uid).map(m => this.materialComposite(m)).filter(s => s !== null);
        return this.median(suas);
      }).filter(v => v !== null);
      if (notasTime.length) {
        rollup = {
          n: notasTime.length,
          p25: this.percentile(notasTime, 25),
          p50: this.median(notasTime),
          p75: this.percentile(notasTime, 75)
        };
      }
    }

    el.innerHTML = `
      <div class="re-kpis">
        <div class="re-kpi"><div class="re-kpi-n">${minhaMediana === null ? '—' : minhaMediana}</div>
          <div class="re-kpi-l">Mediana dos meus materiais</div></div>
        <div class="re-kpi"><div class="re-kpi-n">${metaPct}%</div>
          <div class="re-kpi-l">Meta semanal de melhorias</div></div>
        <div class="re-kpi"><div class="re-kpi-n">${del.index === null ? '—' : del.index}</div>
          <div class="re-kpi-l">Entrega das minhas frentes</div></div>
        <div class="re-kpi ${del.lateCount ? 'tone-red' : ''}"><div class="re-kpi-n">${del.lateCount}</div>
          <div class="re-kpi-l">Minhas frentes atrasadas</div></div>
      </div>
      ${rollup ? `
        <div class="re-panel">
          <h4>Rollup do time <span class="re-muted re-sm">(N=${rollup.n} — sua nota não entra)</span></h4>
          <div class="re-mixrow"><span>P25</span><span class="re-factor-bar"><i style="width:${rollup.p25}%"></i></span><span>${rollup.p25}</span></div>
          <div class="re-mixrow"><span>Mediana</span><span class="re-factor-bar"><i style="width:${rollup.p50}%"></i></span><span>${rollup.p50}</span></div>
          <div class="re-mixrow"><span>P75</span><span class="re-factor-bar"><i style="width:${rollup.p75}%"></i></span><span>${rollup.p75}</span></div>
        </div>`
      : nomesTime.length > 0
        ? `<div class="re-note">Rollup do time oculto: são ${nomesTime.length} pessoa(s), abaixo do piso de ${this.TEAM_FLOOR}.
             Com time pequeno a "mediana do time" identifica indivíduos.</div>`
        : ''}`;
  }
};

window.NexusReportExecutivo = NexusReportExecutivo;
