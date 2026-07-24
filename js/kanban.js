/* =========================================
   NEP KANBAN - DELIVERY CONTROL SYSTEM
   Versão 2.0 - Consolidada e Corrigida
   Firebase Realtime + Gamificação + UX Premium
   ========================================= */

const NexusKanban = {
  // ============ STATE ============
  db: null,
  allTasks: [],
  showArchived: false,
  draggedItem: null,
  deliveryTaskId: null,
  reviewTaskId: null,
  isEditing: false,
  editId: null,
  unsubscribe: null,
  container: null,

  // ============ ATTACHMENTS STATE ============
  taskFilesToUpload: [],
  currentTaskAttachments: [],
  currentTaskId: null,

  // ============ ROLE IDENTIFICATION ============
  PRIVILEGED_ROLES: ['admin', 'diretor', 'superintendente'],

  ROLE_LABEL: {
    admin: 'ADMIN',
    diretor: 'DIRETOR',
    superintendente: 'SUPERINTENDENTE',
    gerente: 'GERENTE',
    consultor: 'CONSULTOR',
    coordenador: 'COORDENADOR',
    analista: 'ANALISTA',
    monitor: 'MONITOR'
  },

  // ============ PONTUAÇÃO AUTOMÁTICA ============
  // Pontos base calculados pelo prazo (dias úteis até deadline)
  DEADLINE_POINTS: [
    { maxDays: 0,  points: 25 },  // Mesmo dia (urgente real)
    { maxDays: 2,  points: 15 },  // 1-2 dias úteis
    { maxDays: 5,  points: 10 },  // 3-5 dias úteis
    { maxDays: 10, points: 7 },   // 6-10 dias úteis
    { maxDays: Infinity, points: 5 } // 11+ dias
  ],

  // Multiplicador por tipo de tarefa
  TASK_TYPE_MULTIPLIER: {
    'Rotina': 1.0,
    'Análise': 1.3,
    'Projeto': 1.5,
    'Correção Urgente': 1.8
  },

  // Bônus por entrega antecipada
  EARLY_BONUS: { 1: 2, 2: 5 }, // 1 dia antes = +2, 2+ dias = +5

  // Penalidade por atraso
  DELAY_PENALTY: [
    { maxDays: 1, penalty: -5 },
    { maxDays: 2, penalty: -10 },
    { maxDays: 5, penalty: -15 },
    { maxDays: Infinity, penalty: -20 }
  ],

  // Penalidade por extensão de prazo
  DEADLINE_CHANGE_PENALTY: [
    { maxDays: 2, penalty: -3 },
    { maxDays: 5, penalty: -5 },
    { maxDays: Infinity, penalty: -8 }
  ],

  // Limite de WIP (tarefas em execução simultânea por responsável)
  WIP_LIMIT: 5,

  // Dias até arquivamento automático de tarefas concluídas
  AUTO_ARCHIVE_DAYS: 3,

  // Dias da semana para recorrência
  WEEKDAYS: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],

  // ============ INIT ============
  async init() {
    console.log('[Kanban] Inicializando...');

    // Usar Firebase já carregado globalmente
    if (window.db) {
      this.db = window.db;
      console.log('[Kanban] Usando Firebase global');
    } else if (typeof firebase !== 'undefined' && firebase.firestore) {
      this.db = firebase.firestore();
      console.log('[Kanban] Usando firebase.firestore()');
    } else {
      console.error('[Kanban] Firebase não disponível!');
      return;
    }

    // User info
    this.myRoleKey = this.getMyRoleKey();
    this.myRoleLabel = this.ROLE_LABEL[this.myRoleKey] || 'USUÁRIO';
    this.myName = (localStorage.getItem('nep_user_name') || '').trim();
    this.myUid = localStorage.getItem('nep_user_uid') || '';

    console.log('[Kanban] User:', this.myName, 'Role:', this.myRoleKey, 'UID:', this.myUid);

    // Carregar usuários ativos para o select de responsável
    await this.loadActiveUsers();
  },

  async loadActiveUsers() {
    if (!this.db) return;
    try {
      const snapshot = await this.db.collection('users').where('status', '==', 'ATIVO').get();
      this.activeUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      console.log('[Kanban] Usuários ativos carregados:', this.activeUsers.length);
    } catch (e) {
      console.warn('[Kanban] Erro ao carregar usuários:', e);
      this.activeUsers = [];
    }
  },

  getMyRoleKey() {
    // Fonte primária: cargo carregado do Firestore no login (auth-firebase.js).
    // A autorização real é aplicada nas Firestore Rules — aqui é só experiência.
    const stored = localStorage.getItem('nep_user_role_key');
    if (stored && this.ROLE_LABEL[stored]) return stored;

    const legacy = localStorage.getItem('nep_user_role');
    const map = { '5': 'superintendente', '4': 'gerente', '3': 'consultor', '2': 'coordenador', '1': 'analista', '0': 'monitor' };
    return map[String(legacy)] || 'analista';
  },

  // ============ HELPERS ============
  norm(v) { return String(v || '').trim().toLowerCase(); },

  // SEGURANÇA: escape de HTML p/ conteúdo vindo de usuários (anti-XSS)
  esc(v) {
    if (window.escapeHtml) return window.escapeHtml(v);
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  // SEGURANÇA: só permite links http/https (bloqueia javascript: e data:)
  safeUrl(url) {
    const u = String(url || '').trim();
    return /^https?:\/\//i.test(u) ? u : '';
  },

  isAdmin() {
    // SEGURANÇA: NÃO usar localStorage para determinar admin.
    // Qualquer pessoa pode setar localStorage no console do navegador.
    // A verificação real de cargo vem do Firestore (carregada no login).
    return this.PRIVILEGED_ROLES.includes(this.myRoleKey);
  },

  isCreatorMe(task) {
    return this.myUid && task?.creatorUid === this.myUid;
  },

  isOwnerMe(task) {
    return this.myUid && task?.ownerUid === this.myUid;
  },

  isViewerMe(task) {
    return this.myUid && task?.viewers && Array.isArray(task.viewers) && task.viewers.includes(this.myUid);
  },

  canSeeTask(task) {
    // Admin, Diretor e Superintendente veem tudo (das suas logos)
    if (this.myRoleKey === 'admin' || this.myRoleKey === 'diretor' || this.myRoleKey === 'superintendente') {
      return true;
    }

    // Criador sempre vê
    if (this.myUid && task.creatorUid === this.myUid) {
      return true;
    }

    // Responsável sempre vê
    if (this.myUid && task.ownerUid === this.myUid) {
      return true;
    }

    // Visualizadores adicionais
    if (task.viewers && Array.isArray(task.viewers)) {
      if (task.viewers.includes(this.myUid)) {
        return true;
      }
    }

    // Filtragem por Logo: verificar se o owner da task pertence às minhas logos
    if (window.LogoService && window.LogoService.shouldFilterByLogo()) {
      const ownerUser = this.activeUsers.find(u => u.uid === task.ownerUid);
      if (ownerUser && !window.LogoService.canSeeUser(ownerUser)) {
        return false;
      }
      // Também verificar o criador
      const creatorUser = this.activeUsers.find(u => u.uid === task.creatorUid);
      if (creatorUser && !window.LogoService.canSeeUser(creatorUser)) {
        return false;
      }
    }

    // Caso contrário, não pode ver
    return false;
  },

  canDeleteTask(task) {
    if (this.isAdmin()) return true;
    return this.isCreatorMe(task);
  },

  // SEGURANÇA: Somente gestor direto do responsável ou admin pode alterar prazo
  // Exceção: Superintendente e Diretor podem alterar os próprios prazos
  canEditDeadline(task) {
    if (this.isAdmin()) return true;
    if (this.isTopLevel() && this.isCreatorMe(task)) return true;
    return this.isManagerOfOwner(task);
  },

  // SEGURANÇA: Somente gestor direto do responsável ou admin pode validar
  // Exceção: Superintendente e Diretor são auto-validados (não precisam de aprovação)
  canValidateTask(task) {
    if (!task || task.status !== 'done' || task.validated) return false;
    if (this.isAdmin()) return true;
    // Superintendente/Diretor: podem validar qualquer tarefa da sua estrutura
    if (this.isTopLevel()) return true;
    return this.isManagerOfOwner(task);
  },

  // Verifica se o usuário logado é Superintendente ou Diretor (topo de hierarquia)
  isTopLevel() {
    return ['superintendente', 'diretor'].includes(this.myRoleKey);
  },

  // Verifica se o responsável da tarefa é Superintendente ou Diretor
  // Se for, a tarefa é auto-validada na entrega
  isOwnerTopLevel(task) {
    if (!task || !task.ownerUid) return false;
    const ownerUser = this.activeUsers.find(u => u.uid === task.ownerUid);
    if (!ownerUser) return false;
    const ownerRole = (ownerUser.cargo || '').toLowerCase();
    return ['superintendente', 'diretor', 'admin'].includes(ownerRole);
  },

  // Verifica se o usuário logado é o gestor direto do responsável da tarefa
  isManagerOfOwner(task) {
    if (!task || !task.ownerUid || !this.myUid) return false;
    const ownerUser = this.activeUsers.find(u => u.uid === task.ownerUid);
    if (!ownerUser) return false;
    // Campo real do vínculo hierárquico é `gestor_uid` (ver user-management/admin).
    return (ownerUser.gestor_uid || ownerUser.managerUid) === this.myUid;
  },

  // Retorna o UID do gestor direto do responsável da tarefa
  getManagerUidOfOwner(task) {
    if (!task || !task.ownerUid) return null;
    const ownerUser = this.activeUsers.find(u => u.uid === task.ownerUid);
    return ownerUser?.gestor_uid || ownerUser?.managerUid || null;
  },

  // Verifica se o responsável excedeu o limite de WIP
  isWipExceeded(ownerUid) {
    if (!ownerUid) return false;
    const doingCount = this.allTasks.filter(t =>
      t.ownerUid === ownerUid && t.status === 'doing' && t.status !== 'archived'
    ).length;
    return doingCount >= this.WIP_LIMIT;
  },

  toBRDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    } catch { return dateStr; }
  },

  getDeadline(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },

  // ============ PONTUAÇÃO AUTOMÁTICA ============

  // Calcula dias úteis entre duas datas (exclui sáb/dom)
  calcBusinessDays(startDate, endDate) {
    let count = 0;
    const cur = new Date(startDate);
    const end = new Date(endDate);
    cur.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(0, count - 1); // Exclui o próprio dia de criação
  },

  // Calcula pontos base a partir do prazo (dias úteis) e tipo de tarefa
  // ANTI-FRAUDE: não depende de escolha manual do usuário
  calculatePoints(taskType, deadline, createdAt) {
    const created = createdAt ? new Date(createdAt) : new Date();
    const deadlineDate = deadline ? new Date(deadline + 'T23:59:59') : created;
    const businessDays = this.calcBusinessDays(created, deadlineDate);

    // Pontos base pelo prazo
    let base = 5;
    for (const tier of this.DEADLINE_POINTS) {
      if (businessDays <= tier.maxDays) { base = tier.points; break; }
    }

    // Multiplicador pelo tipo de tarefa
    const mult = this.TASK_TYPE_MULTIPLIER[taskType] || 1.0;
    return Math.round(base * mult);
  },

  // Deriva a prioridade visual automaticamente a partir do prazo
  derivePriority(deadline) {
    if (!deadline) return 'Baixo';
    const now = new Date();
    const dl = new Date(deadline + 'T23:59:59');
    const days = this.calcBusinessDays(now, dl);
    if (days <= 0) return 'Urgente';
    if (days <= 2) return 'Alto';
    if (days <= 5) return 'Médio';
    return 'Baixo';
  },

  // Calcula pontuação final incluindo bônus, atrasos e penalidades de extensão
  calculateFinalPoints(task) {
    let points = this.calculatePoints(task.taskType || 'Rotina', task.deadline, task.createdAt);

    if (task.deadline && task.deliveredAt) {
      const deadline = new Date(task.deadline + 'T23:59:59');
      const delivered = new Date(task.deliveredAt);
      const diffMs = delivered - deadline;
      const daysLate = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (daysLate > 0) {
        // Penalidade por atraso
        for (const tier of this.DELAY_PENALTY) {
          if (daysLate <= tier.maxDays) { points += tier.penalty; break; }
        }
      } else if (daysLate < 0) {
        // Bônus por entrega antecipada
        const daysEarly = Math.abs(daysLate);
        if (daysEarly >= 2) points += this.EARLY_BONUS[2];
        else if (daysEarly >= 1) points += this.EARLY_BONUS[1];
      }
    }

    // Penalidade acumulada por extensões de prazo
    if (task.deadlineChangePenalty) {
      points += task.deadlineChangePenalty; // Valor já é negativo
    }

    return Math.max(1, points);
  },

  // Calcula a penalidade por extensão de prazo
  calcDeadlineChangePenalty(oldDeadline, newDeadline) {
    if (!oldDeadline || !newDeadline) return 0;
    const oldDate = new Date(oldDeadline + 'T23:59:59');
    const newDate = new Date(newDeadline + 'T23:59:59');
    const diffDays = Math.floor((newDate - oldDate) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 0; // Redução de prazo não penaliza

    for (const tier of this.DEADLINE_CHANGE_PENALTY) {
      if (diffDays <= tier.maxDays) return tier.penalty;
    }
    return -8;
  },

  // ============ FIREBASE ============
  subscribeToTasks() {
    if (this.unsubscribe) this.unsubscribe();

    console.log('[Kanban] Inscrevendo para atualizações em tempo real...');

    this.unsubscribe = this.db.collection('tasks').onSnapshot(snapshot => {
      this.allTasks = [];
      snapshot.forEach(doc => this.allTasks.push({ ...doc.data(), id: doc.id }));
      console.log('[Kanban] Recebidas', this.allTasks.length, 'tarefas');
      this.renderBoard();
      this.updateNotificationBadge();
    }, err => console.error('[Kanban] Erro:', err));
  },

  async saveTaskToFirebase(data) {
    const docRef = await this.db.collection('tasks').add(data);
    return docRef.id;
  },

  async updateTaskInFirebase(taskId, data) {
    await this.db.collection('tasks').doc(taskId).update(data);
  },

  async deleteTaskFromFirebase(taskId) {
    await this.db.collection('tasks').doc(taskId).delete();
  },

  // ============ RENDER ============
  async render(container) {
    this.container = container;
    await this.init();
    this.renderUI();
    this.bindEvents();
    this.subscribeToTasks();
  },

  getVisibleTasks() {
    let list = this.allTasks.filter(t => this.canSeeTask(t));
    if (this.showArchived) return list.filter(t => t.status === 'archived');
    list = list.filter(t => t.status !== 'archived');

    const unitFilter = document.getElementById('kb-filter-unit')?.value;
    const logoFilter = document.getElementById('kb-filter-logo')?.value;
    const ownerFilter = document.getElementById('kb-filter-owner')?.value;
    const priorityFilter = document.getElementById('kb-filter-priority')?.value;
    const requesterFilter = document.getElementById('kb-filter-requester')?.value;
    const deadlineFilter = document.getElementById('kb-filter-deadline')?.value;
    if (unitFilter && unitFilter !== 'all') list = list.filter(t => t.unit === unitFilter);
    // Logo filter: filtrar por logo do owner da task
    if (logoFilter && logoFilter !== 'all') {
      list = list.filter(t => {
        const ownerUser = this.activeUsers.find(u => u.uid === t.ownerUid);
        if (!ownerUser) return false;
        const ownerLogos = Array.isArray(ownerUser.logos) ? ownerUser.logos : (ownerUser.setor ? [ownerUser.setor] : []);
        return ownerLogos.includes(logoFilter);
      });
    }
    if (ownerFilter && ownerFilter !== 'all') list = list.filter(t => t.owner === ownerFilter);
    if (priorityFilter && priorityFilter !== 'all') list = list.filter(t => t.priority === priorityFilter);
    if (requesterFilter && requesterFilter !== 'all') list = list.filter(t => t.requester === requesterFilter);
    if (deadlineFilter && deadlineFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (7 - today.getDay()));

      list = list.filter(t => {
        if (deadlineFilter === 'none') return !t.deadline;
        if (!t.deadline) return false;
        const dl = new Date(t.deadline + 'T23:59:59');
        if (deadlineFilter === 'overdue') return dl < now;
        if (deadlineFilter === 'today') return dl >= today && dl < new Date(today.getTime() + 86400000);
        if (deadlineFilter === 'week') return dl >= today && dl <= endOfWeek;
        return true;
      });
    }

    return list;
  },

  countUnacknowledgedTasks() {
    return this.allTasks.filter(t =>
      this.isOwnerMe(t) && t.status === 'backlog' && !t.acknowledged
    ).length;
  },

  updateNotificationBadge() {
    const count = this.countUnacknowledgedTasks();
    const badge = document.getElementById('kb-notification-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  },

  updateFilters() {
    const visible = this.allTasks.filter(t => this.canSeeTask(t) && t.status !== 'archived');

    ['kb-filter-unit', 'kb-filter-owner', 'kb-filter-requester'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const field = id.includes('unit') ? 'unit' : id.includes('requester') ? 'requester' : 'owner';
      const current = sel.value;
      const vals = [...new Set(visible.map(t => t[field]).filter(Boolean))].sort();
      sel.innerHTML = '<option value="all">Todos</option>';
      vals.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        sel.appendChild(opt);
      });
      if (vals.includes(current)) sel.value = current;
    });

    // Populate Logo filter
    this._populateLogoFilter();
  },

  async _populateLogoFilter() {
    const sel = document.getElementById('kb-filter-logo');
    if (!sel || !window.LogoService) return;

    const current = sel.value;
    try {
      const accessibleLogos = await window.LogoService.getAccessibleLogos();
      sel.innerHTML = '<option value="all">Todas</option>';
      accessibleLogos.forEach(logo => {
        const opt = document.createElement('option');
        opt.value = logo.name;
        opt.textContent = logo.name;
        sel.appendChild(opt);
      });
      if (current && current !== 'all') {
        const exists = accessibleLogos.find(l => l.name === current);
        if (exists) sel.value = current;
      }
    } catch (e) {
      console.warn('[Kanban] Erro ao carregar logos para filtro:', e);
    }
  },

  renderUI() {
    this.container.innerHTML = `
      <div class="kb-page">
        <header class="kb-header">
          <div class="kb-header-left">
            <h1 class="kb-title">📋 Gestão de Demandas</h1>
            <p class="kb-subtitle">Sistema Kanban • ${this.myRoleLabel} • ${this.myName || 'Usuário'}</p>
          </div>
          <div class="kb-header-right">
            <button class="kb-btn kb-btn-secondary" id="kb-btn-archive">
              <i class="fa-solid fa-folder"></i> <span id="kb-txt-archive">Ver Arquivados</span>
            </button>
            <button class="kb-btn kb-btn-secondary" id="kb-btn-export">
              <i class="fa-solid fa-file-export"></i> Exportar
            </button>
            <button class="kb-btn kb-btn-primary" id="kb-btn-new">
              <i class="fa-solid fa-plus"></i> Nova Demanda
            </button>
          </div>
        </header>

        <div class="kb-filters">
          <div class="kb-filter-group">
            <label>Unidade</label>
            <select id="kb-filter-unit"><option value="all">Todas</option></select>
          </div>
          <div class="kb-filter-group">
            <label>Logo</label>
            <select id="kb-filter-logo"></select>
          </div>
          <div class="kb-filter-group">
            <label>Responsável</label>
            <select id="kb-filter-owner"><option value="all">Todos</option></select>
          </div>
          <div class="kb-filter-group">
            <label>Prioridade</label>
            <select id="kb-filter-priority">
              <option value="all">Todas</option>
              <option value="Baixo">🟢 Baixo</option>
              <option value="Médio">🔵 Médio</option>
              <option value="Alto">🟡 Alto</option>
              <option value="Urgente">🔴 Urgente</option>
            </select>
          </div>
          <div class="kb-filter-group">
            <label>Solicitante</label>
            <select id="kb-filter-requester"><option value="all">Todos</option></select>
          </div>
          <div class="kb-filter-group">
            <label>Prazo</label>
            <select id="kb-filter-deadline">
              <option value="all">Todos</option>
              <option value="overdue">⚠️ Atrasados</option>
              <option value="today">📅 Hoje</option>
              <option value="week">📆 Esta semana</option>
              <option value="none">❌ Sem prazo</option>
            </select>
          </div>
          <div class="kb-filter-group" style="margin-left: auto;">
            <span id="kb-notification-badge" class="kb-notif-badge" style="display:none;">0</span>
          </div>
        </div>

        <div class="kb-board" id="kb-board">
          <div class="kb-column" data-status="backlog">
            <div class="kb-column-header kb-col-blue"><span>📋 Backlog</span><span class="kb-count" id="kb-count-backlog">0</span></div>
            <div class="kb-track" id="kb-track-backlog" data-status="backlog"></div>
          </div>
          <div class="kb-column" data-status="doing">
            <div class="kb-column-header kb-col-yellow"><span>⚡ Execução</span><span class="kb-count" id="kb-count-doing">0</span></div>
            <div class="kb-track" id="kb-track-doing" data-status="doing"></div>
          </div>
          <div class="kb-column" data-status="pending">
            <div class="kb-column-header kb-col-red"><span>🚫 Bloqueado</span><span class="kb-count" id="kb-count-pending">0</span></div>
            <div class="kb-track" id="kb-track-pending" data-status="pending"></div>
          </div>
          <div class="kb-column" data-status="done">
            <div class="kb-column-header kb-col-green"><span>✅ Entregue</span><span class="kb-count" id="kb-count-done">0</span></div>
            <div class="kb-track" id="kb-track-done" data-status="done"></div>
          </div>
        </div>

        <div class="kb-archive-zone" id="kb-archive-zone"><i class="fa-solid fa-box-archive"></i> Arraste para arquivar</div>
      </div>

      <!-- Modal Nova/Editar Demanda -->
      <div class="kb-modal hidden" id="kb-modal-task">
        <div class="kb-modal-content">
          <div class="kb-modal-header">
            <h3 id="kb-modal-title">Nova Demanda</h3>
            <button class="kb-modal-close" id="kb-close-task">&times;</button>
          </div>
          <form id="kb-form-task">
            <div class="kb-form-row">
              <div class="kb-form-group full"><label>Título</label><input type="text" id="kb-task-title" required></div>
            </div>
            <div class="kb-form-row">
              <div class="kb-form-group"><label>Solicitante</label><input type="text" id="kb-task-requester" required></div>
              <div class="kb-form-group"><label>Unidade</label>
                <select id="kb-task-unit" required>
                  <option value="">Selecione...</option>
                  <option>Comercial</option><option>Operações</option><option>TI</option>
                  <option>RH</option><option>Financeiro</option><option>Qualidade</option><option>Outros</option>
                </select>
              </div>
            </div>
            <div class="kb-form-row">
              <div class="kb-form-group"><label>Responsável</label>
                <select id="kb-task-owner" required>
                  <option value="">Selecione...</option>
                  ${(window.LogoService ? window.LogoService.filterUsersByLogo(this.activeUsers) : this.activeUsers).sort((a, b) => a.nome.localeCompare(b.nome)).map(u => `<option value="${u.nome}" data-cargo="${u.cargo}" data-uid="${u.uid}">${u.nome}</option>`).join('')}
                </select>
              </div>
              <div class="kb-form-group"><label>Cargo</label><input type="text" id="kb-task-owner-role" readonly placeholder="Automático"></div>
            </div>
            <div class="kb-form-row">
              <div class="kb-form-group full">
                <label>👥 Visualizadores Adicionais (Opcional)</label>
                <div class="kb-viewers-container" id="kb-viewers-container">
                  <div class="kb-viewers-chips" id="kb-viewers-chips"></div>
                  <input type="text" id="kb-viewers-search" class="kb-viewers-search" placeholder="🔍 Buscar por nome..." autocomplete="off">
                  <div class="kb-viewers-dropdown" id="kb-viewers-dropdown">
                    ${(window.LogoService ? window.LogoService.filterUsersByLogo(this.activeUsers) : this.activeUsers).sort((a, b) => a.nome.localeCompare(b.nome)).map(u => `
                      <label class="kb-viewer-option" data-uid="${u.uid}" data-nome="${u.nome}">
                        <input type="checkbox" value="${u.uid}" data-nome="${u.nome}">
                        <span>${this.esc(u.nome.toUpperCase())} - ${this.esc((u.cargo || '').toUpperCase())}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
            <div class="kb-form-row">
              <div class="kb-form-group"><label>Prazo</label><input type="date" id="kb-task-deadline" required></div>
              <div class="kb-form-group"><label>Tipo de Tarefa</label>
                <select id="kb-task-type">
                  <option value="Rotina">Rotina / Operacional (×1.0)</option>
                  <option value="Análise">Análise / Relatório (×1.3)</option>
                  <option value="Projeto">Projeto / Desenvolvimento (×1.5)</option>
                  <option value="Correção Urgente">Correção Urgente / Incidente (×1.8)</option>
                </select>
              </div>
            </div>
            <div class="kb-form-row">
              <div class="kb-form-group"><label>🏆 Pontos (automático)</label><input type="number" id="kb-task-points" readonly value="5"></div>
              <div class="kb-form-group"><label>📊 Prioridade (automática)</label><input type="text" id="kb-task-priority-display" readonly value="Baixo"></div>
            </div>
            <div class="kb-form-row">
              <div class="kb-form-group">
                <label>🔁 Atividade Recorrente</label>
                <select id="kb-task-recurring">
                  <option value="">Não (única vez)</option>
                  <option value="0">Domingo</option>
                  <option value="1">Segunda-feira</option>
                  <option value="2">Terça-feira</option>
                  <option value="3">Quarta-feira</option>
                  <option value="4">Quinta-feira</option>
                  <option value="5">Sexta-feira</option>
                  <option value="6">Sábado</option>
                </select>
              </div>
              <div class="kb-form-group" id="kb-deadline-reason-group" style="display:none;">
                <label>📝 Justificativa (alteração de prazo)</label>
                <input type="text" id="kb-deadline-reason" placeholder="Motivo da alteração...">
              </div>
            </div>
            <div class="kb-form-row">
              <div class="kb-form-group full"><label>Descrição</label><textarea id="kb-task-desc" rows="3"></textarea></div>
            </div>
            
            <div class="kb-form-row">
              <div class="kb-form-group full">
                <label>Anexos & Evidências</label>
                 <div class="kb-attachments-wrapper">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-size:11px; color:#64748b;">Arquivos de apoio ou evidências de entrega</span>
                        <label for="kb-file-input" class="kb-btn kb-btn-secondary kb-btn-sm" style="cursor:pointer;">
                            <i class="fa-solid fa-cloud-arrow-up"></i> Adicionar
                        </label>
                    </div>
                    <input type="file" id="kb-file-input" multiple style="display:none" onchange="NexusKanban.handleFileSelect(this)">
                    <div id="kb-task-attachments-list" class="kb-attachments-list"></div>
                 </div>
              </div>
            </div>
            <div class="kb-form-row" id="kb-history-section" style="display:none;">
              <div class="kb-form-group full">
                <label>📜 Histórico de Atividades</label>
                <div class="kb-history-timeline" id="kb-history-timeline"></div>
              </div>
            </div>
            <button type="submit" class="kb-btn kb-btn-primary full"><i class="fa-solid fa-check"></i> Salvar Demanda</button>
          </form>
        </div>
      </div>

      <!-- Modal Entrega -->
      <div class="kb-modal hidden" id="kb-modal-delivery">
        <div class="kb-modal-content">
          <div class="kb-modal-header"><h3>Registrar Entrega</h3><button class="kb-modal-close" id="kb-close-delivery">&times;</button></div>
          <div class="kb-form-group full"><label>Descreva o que foi feito</label><textarea id="kb-delivery-evidence" rows="5" required></textarea></div>
          <div class="kb-form-group full"><label>Link de evidência (opcional)</label><input type="text" id="kb-delivery-link" placeholder="https://..."></div>
          <div class="kb-form-group full">
             <label>Anexar Evidência (PDF/Imagem - Max 2MB)</label>
             <input type="file" id="kb-delivery-file" accept="image/*,.pdf">
          </div>
          <button class="kb-btn kb-btn-primary full" id="kb-confirm-delivery"><i class="fa-solid fa-paper-plane"></i> Enviar para Aprovação</button>
        </div>
      </div>

      <!-- Modal Review -->
      <div class="kb-modal hidden" id="kb-modal-review">
        <div class="kb-modal-content">
          <div class="kb-modal-header"><h3>Revisar Entrega</h3><button class="kb-modal-close" id="kb-close-review">&times;</button></div>
          <div class="kb-evidence-box"><label>Descrição do Executor</label><div id="kb-review-text"></div></div>
          <div class="kb-evidence-box"><label>Link</label><div id="kb-review-link"></div></div>
          <div class="kb-evidence-box">
             <label>Arquivos Anexados</label>
             <div id="kb-review-attachments" class="kb-attachments-list"></div>
          </div>
          <div class="kb-form-group full" style="padding: 0 20px 12px;">
            <label>📝 Observação / Motivo (obrigatório para rejeição)</label>
            <textarea id="kb-reject-reason" rows="3" placeholder="Descreva o que precisa ser ajustado..."></textarea>
          </div>
          <div class="kb-form-row" style="padding: 0 20px 20px;">
            <button class="kb-btn kb-btn-primary" id="kb-approve-review"><i class="fa-solid fa-check-double"></i> Aprovar</button>
            <button class="kb-btn kb-btn-danger" id="kb-reject-review"><i class="fa-solid fa-times"></i> Solicitar Ajustes</button>
          </div>
        </div>
      </div>
    `;
    this.injectStyles();
  },

  renderBoard() {
    if (this.draggedItem) return;

    // ============ AUTO-ARCHIVE: mover tarefas concluídas há mais de 3 dias ============
    this.autoArchiveCompletedTasks();

    // Limpar todas as tracks
    ['backlog', 'doing', 'pending', 'done'].forEach(s => {
      const t = document.getElementById(`kb-track-${s}`);
      if (t) t.innerHTML = '';
    });

    const visible = this.getVisibleTasks();

    // Se estiver no modo "Ver Arquivados", mostrar lista diferente
    if (this.showArchived) {
      // Esconder board normal e mostrar lista de arquivados
      const board = document.getElementById('kb-board');
      const archiveZone = document.getElementById('kb-archive-zone');
      if (board) board.style.display = 'none';
      if (archiveZone) archiveZone.style.display = 'none';

      // Criar/atualizar container de arquivados
      let archiveContainer = document.getElementById('kb-archived-list');
      if (!archiveContainer) {
        archiveContainer = document.createElement('div');
        archiveContainer.id = 'kb-archived-list';
        archiveContainer.className = 'kb-archived-container';
        document.querySelector('.kb-page')?.appendChild(archiveContainer);
      }

      if (visible.length === 0) {
        archiveContainer.innerHTML = `
          <div class="kb-empty-archive">
            <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
            <h3>Nenhuma demanda arquivada</h3>
            <p style="color: var(--text-tertiary);">Arraste demandas para a zona de arquivamento</p>
          </div>
        `;
      } else {
        archiveContainer.innerHTML = `
          <div class="kb-archived-header">
            <h3>📦 Demandas Arquivadas (${visible.length})</h3>
          </div>
          <div class="kb-archived-grid" id="kb-archived-grid"></div>
        `;
        const grid = document.getElementById('kb-archived-grid');
        visible.forEach(task => {
          const card = this.createArchivedCard(task);
          grid.appendChild(card);
        });
      }
      return;
    }

    // Modo normal: esconder lista de arquivados e mostrar board
    const archiveContainer = document.getElementById('kb-archived-list');
    if (archiveContainer) archiveContainer.remove();

    const board = document.getElementById('kb-board');
    const archiveZone = document.getElementById('kb-archive-zone');
    if (board) board.style.display = 'grid';
    if (archiveZone) archiveZone.style.display = 'block';

    const counts = { backlog: 0, doing: 0, pending: 0, done: 0 };

    visible.forEach(task => {
      const card = this.createCard(task);
      const track = document.getElementById(`kb-track-${task.status}`);
      if (track) {
        track.appendChild(card);
        if (counts[task.status] !== undefined) counts[task.status]++;
      }
    });

    Object.keys(counts).forEach(s => {
      const el = document.getElementById(`kb-count-${s}`);
      if (el) el.textContent = counts[s];
    });

    this.updateFilters();
  },

  createArchivedCard(task) {
    const card = document.createElement('div');
    card.className = 'kb-archived-card';
    card.dataset.id = task.id;

    const points = this.calculatePoints(task.taskType || 'Rotina', task.deadline, task.createdAt);

    card.innerHTML = `
      <div class="kb-archived-card-header">
        <span class="kb-card-unit">${this.esc(task.unit) || 'Geral'}</span>
        <span class="kb-badge kb-points">🏆 ${points}</span>
      </div>
      <div class="kb-card-title">${this.esc(task.title)}</div>
      <div class="kb-archived-card-meta">
        <span><i class="fa-solid fa-user"></i> ${this.esc((task.owner || 'N/D').toUpperCase())}</span>
        <span>${this.toBRDate(task.deadline)}</span>
      </div>
      <div class="kb-archived-card-actions">
        <button class="kb-btn kb-btn-secondary kb-restore-btn" title="Restaurar">
          <i class="fa-solid fa-rotate-left"></i> Restaurar
        </button>
        <button class="kb-btn kb-btn-danger kb-delete-archived-btn" title="Excluir permanentemente">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    card.querySelector('.kb-restore-btn')?.addEventListener('click', () => this.restoreTask(task.id));
    card.querySelector('.kb-delete-archived-btn')?.addEventListener('click', () => this.deleteTask(task.id));

    return card;
  },

  async restoreTask(taskId) {
    try {
      // Restaurar para status 'done' (entregue), não 'backlog'
      await this.addHistory(taskId, 'Demanda restaurada', `Restaurado por ${this.myName}`);
      await this.updateTaskInFirebase(taskId, { status: 'done' });
      this.showToast('Demanda restaurada para Entregue!', 'success');
    } catch (err) {
      console.error(err);
      this.showToast('Erro ao restaurar', 'error');
    }
  },

  createCard(task) {
    const card = document.createElement('div');
    card.className = 'kb-card';
    card.draggable = true;
    card.dataset.id = task.id;
    card.dataset.status = task.status;

    const isNew = task.status === 'backlog' && !task.acknowledged && this.isOwnerMe(task);
    if (isNew) card.classList.add('kb-new-task');
    if (task.status === 'done') card.classList.add(task.validated ? 'kb-validated' : 'kb-pending-validation');

    const derivedPriority = task.priority || this.derivePriority(task.deadline);
    const prioClass = { 'Urgente': 'kb-p-urgente', 'Alto': 'kb-p-alto', 'Médio': 'kb-p-medio', 'Baixo': 'kb-p-baixo' }[derivedPriority] || 'kb-p-baixo';
    const points = this.calculatePoints(task.taskType || 'Rotina', task.deadline, task.createdAt);

    let slaHtml = '';
    if (task.status !== 'done' && task.status !== 'archived' && task.deadline) {
      const deadline = new Date(task.deadline + 'T23:59:59');
      const diff = deadline - new Date();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (diff < 0) slaHtml = '<div class="kb-sla kb-sla-danger">⚠️ EXPIRADO</div>';
      else if (days > 1) slaHtml = `<div class="kb-sla kb-sla-ok">⏰ ${days} dias</div>`;
      else slaHtml = `<div class="kb-sla ${hours < 4 ? 'kb-sla-danger' : 'kb-sla-warn'}">⏰ ${hours}h</div>`;
    }

    let newBadge = isNew ? `<div class="kb-new-badge">🔔 Nova demanda de ${this.esc((task.creatorName || 'Gestor').toUpperCase())}</div><button class="kb-btn-ack" data-id="${task.id}">✓ RECEBI A DEMANDA</button>` : '';

    let validationHtml = '';
    if (task.status === 'done') {
      if (task.validated) validationHtml = '<div class="kb-validation kb-val-ok">✅ Concluída</div>';
      else {
        validationHtml = '<div class="kb-validation kb-val-pending">⏳ Aguardando validação do gestor</div>';
        if (this.canValidateTask(task)) validationHtml += `<button class="kb-btn-validate" data-id="${task.id}">🔍 REVISAR</button>`;
      }
    }

    let viewersHtml = '';
    if (task.viewersNames && task.viewersNames.length > 0) {
      const viewersList = task.viewersNames.slice(0, 3).map(n => this.esc(n.toUpperCase())).join(', ');
      const extraCount = task.viewersNames.length > 3 ? ` +${task.viewersNames.length - 3}` : '';
      viewersHtml = `
        <div class="kb-card-viewers" title="${task.viewersNames.map(n => this.esc(n.toUpperCase())).join(', ')}">
          <i class="fa-solid fa-eye"></i> ${task.viewersNames.length} visualizador(es)${extraCount ? extraCount : ''}
        </div>
      `;
    }

    // Badge de recorrência
    const recurBadge = task.isRecurring ? `<span class="kb-badge kb-recurring" title="Recorrente: ${this.WEEKDAYS[task.recurringDay] || 'Semanal'}">🔁 ${this.WEEKDAYS[task.recurringDay] || 'Semanal'}</span>` : '';

    card.innerHTML = `
      <div class="kb-card-header">
        <span class="kb-card-unit">${this.esc(task.unit) || 'Geral'}</span>
        ${task.hasAttachments ? '<i class="fa-solid fa-paperclip" style="margin-left:auto; margin-right:8px; color:#94a3b8; font-size:11px;" title="Possui anexos"></i>' : ''}
        <div class="kb-card-actions">
          <button class="kb-act-btn kb-edit-btn" title="Editar"><i class="fa-solid fa-pen"></i></button>
          ${task.status !== 'archived' ? '<button class="kb-act-btn kb-archive-card-btn" title="Arquivar"><i class="fa-solid fa-box-archive"></i></button>' : ''}
          ${this.canDeleteTask(task) ? '<button class="kb-act-btn kb-del-btn" title="Excluir"><i class="fa-solid fa-trash"></i></button>' : ''}
        </div>
      </div>
      <div class="kb-card-title">${this.esc(task.title)}</div>
      ${newBadge}
      ${slaHtml}
      ${validationHtml}
      ${viewersHtml}
      <div class="kb-card-meta">
        <div class="kb-card-owner"><i class="fa-solid fa-user"></i> ${this.esc((task.owner || 'N/D').toUpperCase())}</div>
        <div class="kb-card-badges">
          <span class="kb-badge ${prioClass}">${derivedPriority}</span>
          ${recurBadge}
          <span class="kb-badge kb-points">🏆 ${points}</span>
        </div>
      </div>
      <div class="kb-card-date">${this.toBRDate(task.deadline)}${task.taskType ? ' · ' + this.esc(task.taskType) : ''}</div>
    `;

    // Events
    card.querySelector('.kb-edit-btn')?.addEventListener('click', e => { e.stopPropagation(); this.openEditModal(task); });
    card.querySelector('.kb-del-btn')?.addEventListener('click', e => { e.stopPropagation(); this.deleteTask(task.id); });
    card.querySelector('.kb-archive-card-btn')?.addEventListener('click', e => { e.stopPropagation(); this.archiveTask(task.id); });
    card.querySelector('.kb-btn-ack')?.addEventListener('click', e => { e.stopPropagation(); this.acknowledgeTask(task.id); });
    card.querySelector('.kb-btn-validate')?.addEventListener('click', e => { e.stopPropagation(); this.openReviewModal(task.id); });

    card.addEventListener('click', () => this.openEditModal(task));
    card.addEventListener('dragstart', () => { this.draggedItem = card; card.classList.add('kb-dragging'); });
    card.addEventListener('dragend', () => { card.classList.remove('kb-dragging'); this.draggedItem = null; });

    return card;
  },

  bindEvents() {
    // Nova demanda
    document.getElementById('kb-btn-new')?.addEventListener('click', () => this.openNewModal());

    // Fechar modais
    document.getElementById('kb-close-task')?.addEventListener('click', () => this.closeModal('kb-modal-task'));
    document.getElementById('kb-close-delivery')?.addEventListener('click', () => this.closeModal('kb-modal-delivery'));
    document.getElementById('kb-close-review')?.addEventListener('click', () => this.closeModal('kb-modal-review'));

    // Form submit
    document.getElementById('kb-form-task')?.addEventListener('submit', e => { e.preventDefault(); this.saveTask(); });

    // Atualizar pontos ao mudar tipo de tarefa ou prazo
    document.getElementById('kb-task-type')?.addEventListener('change', () => this.updatePointsPreview());
    document.getElementById('kb-task-deadline')?.addEventListener('change', () => this.updatePointsPreview());

    // Preencher cargo automaticamente ao selecionar responsável
    document.getElementById('kb-task-owner')?.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const cargo = selectedOption?.dataset?.cargo || '';
      document.getElementById('kb-task-owner-role').value = cargo;
    });

    // Viewers search & toggle
    this.initViewersPicker();

    // Entrega
    document.getElementById('kb-confirm-delivery')?.addEventListener('click', () => this.confirmDelivery());

    // Review
    document.getElementById('kb-approve-review')?.addEventListener('click', () => this.approveTask());
    document.getElementById('kb-reject-review')?.addEventListener('click', () => this.rejectTask());

    // Filtros
    document.getElementById('kb-filter-unit')?.addEventListener('change', () => this.renderBoard());
    document.getElementById('kb-filter-logo')?.addEventListener('change', () => this.renderBoard());
    document.getElementById('kb-filter-owner')?.addEventListener('change', () => this.renderBoard());
    document.getElementById('kb-filter-priority')?.addEventListener('change', () => this.renderBoard());
    document.getElementById('kb-filter-requester')?.addEventListener('change', () => this.renderBoard());
    document.getElementById('kb-filter-deadline')?.addEventListener('change', () => this.renderBoard());

    // Arquivados
    document.getElementById('kb-btn-archive')?.addEventListener('click', () => {
      this.showArchived = !this.showArchived;
      document.getElementById('kb-txt-archive').textContent = this.showArchived ? 'Voltar' : 'Ver Arquivados';
      this.renderBoard();
    });

    // Export
    document.getElementById('kb-btn-export')?.addEventListener('click', () => this.exportCSV());

    // Drag & Drop nas colunas
    document.querySelectorAll('.kb-track').forEach(track => {
      track.addEventListener('dragover', e => { e.preventDefault(); track.classList.add('kb-drag-over'); });
      track.addEventListener('dragleave', () => track.classList.remove('kb-drag-over'));
      track.addEventListener('drop', async e => {
        e.preventDefault();
        track.classList.remove('kb-drag-over');
        if (!this.draggedItem) return;

        const newStatus = track.dataset.status;
        const oldStatus = this.draggedItem.dataset.status;
        const taskId = this.draggedItem.dataset.id;

        if (newStatus === 'doing' && oldStatus !== 'doing') {
          // Verificar WIP limit
          const task = this.allTasks.find(t => t.id === taskId);
          if (task && this.isWipExceeded(task.ownerUid)) {
            this.showToast(`Limite de ${this.WIP_LIMIT} tarefas em execução atingido!`, 'warning');
            return;
          }
        }

        if (newStatus === 'done' && oldStatus !== 'done') {
          this.deliveryTaskId = taskId;
          this.openDeliveryModal();
          return;
        }

        if (newStatus && newStatus !== oldStatus) {
          await this.moveTask(taskId, newStatus, oldStatus);
        }
      });
    });

    // Archive zone
    const archiveZone = document.getElementById('kb-archive-zone');
    if (archiveZone) {
      archiveZone.addEventListener('dragover', e => { e.preventDefault(); archiveZone.classList.add('kb-drag-over'); });
      archiveZone.addEventListener('dragleave', () => archiveZone.classList.remove('kb-drag-over'));
      archiveZone.addEventListener('drop', async e => {
        e.preventDefault();
        archiveZone.classList.remove('kb-drag-over');
        if (this.draggedItem) await this.archiveTask(this.draggedItem.dataset.id);
      });
    }
  },

  // ============ MODAL METHODS ============
  openModal(id) { document.getElementById(id)?.classList.remove('hidden'); },
  closeModal(id) { document.getElementById(id)?.classList.add('hidden'); },

  openNewModal() {
    this.isEditing = false;
    this.editId = null;
    this.currentTaskId = null;
    this.taskFilesToUpload = [];
    this.currentTaskAttachments = [];
    document.getElementById('kb-form-task')?.reset();
    document.getElementById('kb-modal-title').textContent = 'Nova Demanda';
    document.getElementById('kb-task-deadline').value = this.getDeadline(3);
    document.getElementById('kb-task-requester').value = this.myName;
    document.getElementById('kb-task-deadline').disabled = false;
    // Resetar novos campos
    const recurSel = document.getElementById('kb-task-recurring');
    if (recurSel) recurSel.value = '';
    const reasonGroup = document.getElementById('kb-deadline-reason-group');
    if (reasonGroup) reasonGroup.style.display = 'none';

    // Clear viewers
    this.clearViewersPicker();

    // Hide history for new task
    const histSection = document.getElementById('kb-history-section');
    if (histSection) histSection.style.display = 'none';

    // Clear attachment list
    this.renderAttachmentsListUI([], document.getElementById('kb-task-attachments-list'), false);

    this.updatePointsPreview();
    this.openModal('kb-modal-task');
  },

  openEditModal(task) {
    this.isEditing = true;
    this.editId = task.id;
    this.currentTaskId = task.id;
    this.taskFilesToUpload = [];
    this.currentTaskAttachments = [];
    this._originalDeadline = task.deadline || '';

    document.getElementById('kb-modal-title').textContent = 'Editar Demanda';
    document.getElementById('kb-task-title').value = task.title || '';
    document.getElementById('kb-task-requester').value = task.requester || '';
    document.getElementById('kb-task-unit').value = task.unit || '';
    document.getElementById('kb-task-owner').value = task.owner || '';
    document.getElementById('kb-task-owner-role').value = task.ownerRole || '';
    document.getElementById('kb-task-deadline').value = task.deadline || '';
    document.getElementById('kb-task-type').value = task.taskType || 'Rotina';
    document.getElementById('kb-task-desc').value = task.description || '';
    document.getElementById('kb-task-deadline').disabled = !this.canEditDeadline(task);

    // Recorrência
    const recurSel = document.getElementById('kb-task-recurring');
    if (recurSel) recurSel.value = task.isRecurring ? String(task.recurringDay) : '';

    // Mostrar campo de justificativa de prazo apenas na edição
    const reasonGroup = document.getElementById('kb-deadline-reason-group');
    if (reasonGroup) reasonGroup.style.display = this.canEditDeadline(task) ? 'flex' : 'none';

    // Carregar visualizadores existentes no picker
    this.loadViewersPicker(task.viewers || []);

    // Mostrar histórico
    this.renderHistoryTimeline(task.history || []);

    this.loadTaskAttachments(task.id);
    this.updatePointsPreview();
    this.openModal('kb-modal-task');
  },

  openDeliveryModal() {
    document.getElementById('kb-delivery-evidence').value = '';
    document.getElementById('kb-delivery-link').value = '';
    const fileInput = document.getElementById('kb-delivery-file');
    if (fileInput) fileInput.value = '';

    // Verificar se o responsável é top-level (auto-validação)
    const task = this.allTasks.find(t => t.id === this.deliveryTaskId);
    const autoValidate = task && this.isOwnerTopLevel(task);
    const btn = document.getElementById('kb-confirm-delivery');
    if (btn) btn.innerHTML = autoValidate
      ? '<i class="fa-solid fa-check"></i> Concluir (Auto-validação)'
      : '<i class="fa-solid fa-paper-plane"></i> Enviar para Aprovação do Gestor';
    this.openModal('kb-modal-delivery');
  },

  openReviewModal(taskId) {
    this.reviewTaskId = taskId;
    const task = this.allTasks.find(t => t.id === taskId);
    if (!task) return;
    document.getElementById('kb-review-text').textContent = task.evidence || 'Sem descrição.';
    const linkEl = document.getElementById('kb-review-link');
    const safeEvidence = this.safeUrl(task.evidenceLink);
    linkEl.innerHTML = safeEvidence ? `<a href="${this.esc(safeEvidence)}" target="_blank" rel="noopener noreferrer">🔗 Ver Evidência</a>` : 'Nenhum link';

    // Load Attachments ReadOnly
    this.loadTaskAttachments(taskId, 'kb-review-attachments', true);

    this.openModal('kb-modal-review');
  },

  updatePointsPreview() {
    const taskType = document.getElementById('kb-task-type')?.value || 'Rotina';
    const deadline = document.getElementById('kb-task-deadline')?.value || '';
    const pts = this.calculatePoints(taskType, deadline, null);
    const el = document.getElementById('kb-task-points');
    if (el) el.value = pts;
    // Atualizar prioridade derivada
    const prioDisplay = document.getElementById('kb-task-priority-display');
    if (prioDisplay) prioDisplay.value = this.derivePriority(deadline);
  },

  // ============ ATTACHMENTS METHODS ============
  async loadTaskAttachments(taskId, containerId = 'kb-task-attachments-list', readOnly = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!window.StorageService) {
      container.innerHTML = '<div style="color:#94a3b8; font-size:11px;">Storage indisponível.</div>';
      return;
    }

    container.innerHTML = '<div style="color:#94a3b8; font-size:11px;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</div>';

    try {
      const files = await window.StorageService.listAttachments('kanban', taskId);
      if (!readOnly) this.currentTaskAttachments = files;
      this.renderAttachmentsListUI(files, container, readOnly);
    } catch (e) {
      console.warn('Attachments load error:', e);
      if (!readOnly) this.currentTaskAttachments = [];
      this.renderAttachmentsListUI([], container, readOnly);
    }
  },

  renderAttachmentsListUI(files, container, readOnly = false) {
    if (!container) return;
    container.innerHTML = '';

    if (files.length === 0 && (readOnly || this.taskFilesToUpload.length === 0)) {
      container.innerHTML = '<div style="color:#64748b; font-size:11px; font-style:italic;">Nenhum anexo.</div>';
      return;
    }

    // Existing Files
    files.forEach(file => {
      const div = document.createElement('div');
      div.className = 'kb-attachment-item';
      const deleteBtn = !readOnly ? `
            <button type="button" class="kb-attachment-btn delete" onclick="NexusKanban.deleteAttachment('${file.name}')" title="Excluir">
                <i class="fa-solid fa-trash"></i>
            </button>` : '';

      div.innerHTML = `
            <div class="kb-attachment-info">
                <i class="fa-solid ${file.name.endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-image'}"></i>
                <a href="${file.url}" target="_blank" class="kb-attachment-name" style="text-decoration:none; color:inherit;">${file.name}</a>
            </div>
            <div class="kb-attachment-actions">
                ${readOnly ? `<a href="${file.url}" target="_blank" class="kb-attachment-btn" title="Baixar"><i class="fa-solid fa-download"></i></a>` : deleteBtn}
            </div>
        `;
      container.appendChild(div);
    });

    // New Files (Upload Pending) - Only for edit mode
    if (!readOnly && this.taskFilesToUpload) {
      this.taskFilesToUpload.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'kb-attachment-item';
        div.style.borderStyle = 'dashed';
        div.innerHTML = `
                <div class="kb-attachment-info">
                    <i class="fa-solid fa-cloud-arrow-up" style="color:#10b981;"></i>
                    <span class="kb-attachment-name" style="color:#cbd5e1;">${file.name} (Pendente)</span>
                </div>
                <div class="kb-attachment-actions">
                    <button type="button" class="kb-attachment-btn delete" onclick="NexusKanban.removeFileToUpload(${index})">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            `;
        container.appendChild(div);
      });
    }
  },

  handleFileSelect(input) {
    if (input.files && input.files.length > 0) {
      // 2MB Limit Check
      const validFiles = Array.from(input.files).filter(f => {
        if (f.size > 2 * 1024 * 1024) {
          this.showToast(`Arquivo ${f.name} excede 2MB`, 'error');
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        validFiles.forEach(file => {
          if (!this.taskFilesToUpload.some(f => f.name === file.name)) {
            this.taskFilesToUpload.push(file);
          }
        });
        const container = document.getElementById('kb-task-attachments-list');
        this.renderAttachmentsListUI(this.currentTaskAttachments, container, false);
      }
    }
    input.value = '';
  },

  removeFileToUpload(index) {
    this.taskFilesToUpload.splice(index, 1);
    const container = document.getElementById('kb-task-attachments-list');
    this.renderAttachmentsListUI(this.currentTaskAttachments, container, false);
  },

  async deleteAttachment(fileName) {
    if (!confirm('Excluir arquivo permanentemente?')) return;
    if (!this.currentTaskId) return;

    try {
      const fileObj = this.currentTaskAttachments.find(f => f.name === fileName);
      let path = fileObj?.path || `kanban/${this.currentTaskId}/${fileName}`;

      await window.StorageService.delete(window.SupabaseClient.buckets.attachments, path);
      await this.loadTaskAttachments(this.currentTaskId);
      this.showToast('Anexo removido', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Erro ao remover anexo', 'error');
    }
  },

  // ============ TASK ACTIONS ============
  async saveTask() {
    const title = document.getElementById('kb-task-title')?.value.trim();
    if (!title) { this.showToast('Informe o título!', 'error'); return; }

    const ownerSelect = document.getElementById('kb-task-owner');
    const ownerOption = ownerSelect?.options?.[ownerSelect.selectedIndex];

    const saveBtn = document.querySelector('#kb-form-task button[type="submit"]');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';

    const taskType = document.getElementById('kb-task-type')?.value || 'Rotina';
    const deadline = document.getElementById('kb-task-deadline')?.value || '';
    const recurringVal = document.getElementById('kb-task-recurring')?.value;

    const data = {
      title,
      requester: document.getElementById('kb-task-requester')?.value.trim() || '',
      unit: document.getElementById('kb-task-unit')?.value || '',
      owner: ownerSelect?.value?.trim() || '',
      ownerUid: ownerOption?.dataset?.uid || '',
      ownerRole: document.getElementById('kb-task-owner-role')?.value.trim() || '',
      deadline,
      taskType,
      priority: this.derivePriority(deadline),
      description: document.getElementById('kb-task-desc')?.value.trim() || '',
      isRecurring: recurringVal !== '' && recurringVal !== undefined,
      recurringDay: recurringVal !== '' ? parseInt(recurringVal) : null
    };

    // Capturar visualizadores selecionados do picker
    const selectedViewers = this.getSelectedViewers();
    data.viewers = selectedViewers.map(v => v.uid);
    data.viewersNames = selectedViewers.map(v => v.nome);

    try {
      let savedTaskId = this.editId;

      if (this.isEditing && this.editId) {
        data.updatedAt = new Date().toISOString();
        // Detectar mudanças para histórico
        const oldTask = this.allTasks.find(t => t.id === this.editId);
        const changes = [];
        if (oldTask) {
          // Penalidade por extensão de prazo
          if (oldTask.deadline !== data.deadline) {
            const penalty = this.calcDeadlineChangePenalty(oldTask.deadline, data.deadline);
            const reason = document.getElementById('kb-deadline-reason')?.value.trim() || '';
            if (penalty < 0) {
              if (!reason && !this.isAdmin()) {
                this.showToast('Justificativa obrigatória para alteração de prazo!', 'error');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                return;
              }
              const currentPenalty = oldTask.deadlineChangePenalty || 0;
              data.deadlineChangePenalty = currentPenalty + penalty;
              changes.push(`Prazo: ${this.toBRDate(oldTask.deadline)} → ${this.toBRDate(data.deadline)} (${penalty} pts)`);
              if (reason) changes.push(`Motivo: ${reason}`);
            } else {
              changes.push(`Prazo: ${this.toBRDate(oldTask.deadline)} → ${this.toBRDate(data.deadline)}`);
            }
          }
          if (oldTask.owner !== data.owner) changes.push(`Responsável: ${oldTask.owner} → ${data.owner}`);
          if (oldTask.taskType !== data.taskType) changes.push(`Tipo: ${oldTask.taskType || 'Rotina'} → ${data.taskType}`);
          if (oldTask.title !== data.title) changes.push(`Título alterado`);
          if (data.isRecurring !== (oldTask.isRecurring || false)) changes.push(`Recorrência: ${data.isRecurring ? 'Ativada (' + this.WEEKDAYS[data.recurringDay] + ')' : 'Desativada'}`);
        }
        if (changes.length > 0) {
          await this.addHistory(this.editId, 'Tarefa editada', changes.join(' | '));
        }
        await this.updateTaskInFirebase(this.editId, data);
        this.showToast('Demanda atualizada!', 'success');
      } else {
        data.status = 'backlog';
        data.createdAt = new Date().toISOString();
        data.creatorName = this.myName;
        data.creatorUid = this.myUid;
        data.creatorRoleKey = this.myRoleKey;
        data.acknowledged = false;
        data.validated = false;
        data.history = [{ date: new Date().toISOString(), action: 'Tarefa criada', user: this.myName, details: `Status: Backlog | Responsável: ${data.owner} | Prazo: ${this.toBRDate(data.deadline)}` }];
        savedTaskId = await this.saveTaskToFirebase(data);

        // Gamification: Pontos por criar tarefa
        if (window.NexusGamification) {
          this.showGameToast('Demanda criada! +2 XP', 5, 'success');
          // Persistir pontos no banco
          window.NexusGamification.addPoints(
            this.myUid,
            2,
            'CreateTask',
            `Criação de demanda: "${title}"`
          ).catch(err => console.error('[Kanban] Erro ao pontuar criação:', err));
        } else {
          this.showGameToast('Demanda criada!', 5, 'success');
        }
      }

      // Upload Files
      if (this.taskFilesToUpload.length > 0 && window.StorageService) {
        saveBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Anexando (${this.taskFilesToUpload.length})...`;
        let count = 0;
        for (const file of this.taskFilesToUpload) {
          try {
            await window.StorageService.uploadAttachment('kanban', savedTaskId, file);
            count++;
          } catch (e) {
            console.error('Upload failed:', file.name, e);
          }
        }
        if (count > 0) {
          await this.updateTaskInFirebase(savedTaskId, { hasAttachments: true });
        }
      }

      this.closeModal('kb-modal-task');

      // Sync to Supabase
      if (window.SupabaseSync) {
        const fullTask = { ...data, id: savedTaskId };
        window.SupabaseSync.syncTask(fullTask);
      }
    } catch (err) {
      console.error('[Kanban] Erro ao salvar:', err);
      this.showToast('Erro ao salvar!', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }
    }

    // Notification: Task Assignment
    if (savedTaskId && data.ownerUid && data.ownerUid !== this.myUid && window.NexusNotifications) {
      console.log('[Kanban] Enviando notificação de atribuição...', { ownerUid: data.ownerUid, taskId: savedTaskId });

      const isNew = !this.isEditing;
      let shouldNotify = isNew;

      if (this.isEditing) {
        shouldNotify = true;
      }

      if (shouldNotify) {
        const msg = isNew
          ? `${this.myName} atribuiu uma nova tarefa para você: "${data.title}"`
          : `${this.myName} atualizou a tarefa "${data.title}" atribuída a você.`;

        window.NexusNotifications.add({
          tipo: 'tarefa',
          titulo: '📋 Nova Atribuição',
          mensagem: msg,
          destinatario_uid: data.ownerUid,
          referencia_tipo: 'task',
          referencia_id: savedTaskId
        }).then(() => {
          console.log('[Kanban] ✅ Notificação de atribuição enviada com sucesso!');
        }).catch(err => {
          console.error('[Kanban] ❌ Erro ao enviar notificação:', err);
        });
      }
    }

    // Notification: Notify viewers on new/edited task
    if (savedTaskId && data.viewers && data.viewers.length > 0 && window.NexusNotifications) {
      const isNew = !this.isEditing;
      const viewerMsg = isNew
        ? `Você foi adicionado como visualizador na tarefa "${data.title}" criada por ${this.myName}.`
        : `A tarefa "${data.title}" (que você visualiza) foi atualizada por ${this.myName}.`;

      const viewersToNotify = data.viewers.filter(uid => uid !== this.myUid);
      if (viewersToNotify.length > 0) {
        window.NexusNotifications.notifyUsers(viewersToNotify, {
          tipo: 'tarefa',
          titulo: isNew ? '👁️ Adicionado como Visualizador' : '🔄 Tarefa Atualizada',
          mensagem: viewerMsg,
          referencia_tipo: 'task',
          referencia_id: savedTaskId
        }).catch(err => console.error('[Kanban] Erro ao notificar visualizadores:', err));
      }
    }
  },

  async moveTask(taskId, newStatus, oldStatus) {
    try {
      const statusLabelsH = { 'backlog': 'Backlog', 'doing': 'Execução', 'pending': 'Bloqueado', 'done': 'Entregue' };
      await this.addHistory(taskId, 'Status alterado', `${statusLabelsH[oldStatus] || oldStatus} → ${statusLabelsH[newStatus] || newStatus}`);
      await this.updateTaskInFirebase(taskId, {
        status: newStatus
      });

      // Sync to Supabase
      if (window.SupabaseSync) {
        const task = this.allTasks.find(t => t.id === taskId);
        if (task) window.SupabaseSync.syncTask({ ...task, status: newStatus });
      }
    } catch (err) { console.error('[Kanban] Erro ao mover:', err); }

    // Notification: Status Change → owner
    if (window.NexusNotifications) {
      const task = this.allTasks.find(t => t.id === taskId);
      const statusLabels = { 'backlog': 'Backlog', 'doing': 'Execução', 'pending': 'Bloqueado', 'done': 'Entregue', 'archived': 'Arquivado' };
      const humanStatus = statusLabels[newStatus] || newStatus;

      if (task && task.ownerUid && task.ownerUid !== this.myUid) {
        window.NexusNotifications.add({
          tipo: 'sistema',
          titulo: '🔄 Status Atualizado',
          mensagem: `Sua tarefa "${task.title}" foi movida para ${humanStatus} por ${this.myName}.`,
          destinatario_uid: task.ownerUid,
          referencia_tipo: 'task',
          referencia_id: taskId
        }).catch(err => console.error('[Kanban] Erro notificação status:', err));
      }

      // Notification: Status Change → viewers
      if (task && task.viewers && task.viewers.length > 0) {
        const viewersToNotify = task.viewers.filter(uid => uid !== this.myUid && uid !== task.ownerUid);
        if (viewersToNotify.length > 0) {
          window.NexusNotifications.notifyUsers(viewersToNotify, {
            tipo: 'sistema',
            titulo: '🔄 Status Atualizado',
            mensagem: `A tarefa "${task.title}" foi movida para ${humanStatus} por ${this.myName}.`,
            referencia_tipo: 'task',
            referencia_id: taskId
          }).catch(err => console.error('[Kanban] Erro notif viewers status:', err));
        }
      }

      // Notification: Status Change → creator (if different from owner and me)
      if (task && task.creatorUid && task.creatorUid !== this.myUid && task.creatorUid !== task.ownerUid) {
        window.NexusNotifications.add({
          tipo: 'sistema',
          titulo: '🔄 Status Atualizado',
          mensagem: `A tarefa "${task.title}" (que você criou) foi movida para ${humanStatus} por ${this.myName}.`,
          destinatario_uid: task.creatorUid,
          referencia_tipo: 'task',
          referencia_id: taskId
        }).catch(err => console.error('[Kanban] Erro notif criador status:', err));
      }
    }
  },

  async acknowledgeTask(taskId) {
    try {
      await this.updateTaskInFirebase(taskId, { acknowledged: true });
      this.showGameToast('Demanda recebida!', 2, 'success');

      // Notification: Acknowledge → notify creator
      const task = this.allTasks.find(t => t.id === taskId);
      if (task && task.creatorUid && task.creatorUid !== this.myUid && window.NexusNotifications) {
        window.NexusNotifications.add({
          tipo: 'tarefa',
          titulo: '✅ Demanda Recebida',
          mensagem: `${this.myName} confirmou o recebimento da tarefa "${task.title}".`,
          destinatario_uid: task.creatorUid,
          referencia_tipo: 'task',
          referencia_id: taskId
        }).catch(err => console.error('[Kanban] Erro notif acknowledge:', err));
      }
    } catch (err) { console.error(err); }
  },

  async confirmDelivery() {
    if (!this.deliveryTaskId) return;
    const evidence = document.getElementById('kb-delivery-evidence').value.trim();
    const link = document.getElementById('kb-delivery-link').value.trim();
    const fileInput = document.getElementById('kb-delivery-file');
    const file = fileInput?.files?.[0];

    if (!evidence && !link && !file) {
      this.showToast('Forneça uma descrição, link ou anexo!', 'warning');
      return;
    }

    if (file && file.size > 2 * 1024 * 1024) {
      this.showToast('Arquivo excede 2MB!', 'error');
      return;
    }

    try {
      this.showToast('Enviando entrega...', 'info');

      // Upload se tiver arquivo
      if (file && window.StorageService) {
        try {
          await window.StorageService.uploadAttachment('kanban_delivery', this.deliveryTaskId, file);
          this.showToast('Evidência anexada!', 'success');
        } catch (e) {
          console.error('Erro upload entrega', e);
        }
      }

      // Verificar se é auto-validação para Superintendente / Diretor / Admin
      const isAuto = task && this.isOwnerTopLevel(task);

      await this.addHistory(this.deliveryTaskId, 'Entrega registrada', evidence ? evidence.substring(0, 100) : 'Evidência anexada');
      
      const updateData = {
        status: 'done',
        deliveredAt: new Date().toISOString(),
        evidence,
        evidenceLink: link,
        validated: isAuto
      };

      if (isAuto) {
        updateData.validatedBy = this.myName;
        updateData.validatedAt = new Date().toISOString();
      }

      await this.updateTaskInFirebase(this.deliveryTaskId, updateData);

      if (isAuto) {
        this.showToast('Entrega registrada e auto-validada!', 'success');
        // Se for recorrente, criar a próxima ocorrência semanal
        if (task && task.isRecurring) {
          await this.createRecurringInstance(task);
        }
      } else {
        // Notificar gestor sobre entrega
        const managerUid = this.getManagerUidOfOwner(task) || task.creatorUid;
        if (managerUid && window.NexusNotifications) {
          window.NexusNotifications.add({
            tipo: 'validacao',
            titulo: '📦 Tarefa Entregue',
            mensagem: `${this.myName} entregou a tarefa "${task.title}" e aguarda sua validação.`,
            destinatario_uid: managerUid,
            referencia_tipo: 'task',
            referencia_id: this.deliveryTaskId
          }).catch(console.error);
        }

        // Notification: Delivery → notify viewers
        if (task && task.viewers && task.viewers.length > 0 && window.NexusNotifications) {
          const viewersToNotify = task.viewers.filter(uid => uid !== this.myUid && uid !== managerUid);
          if (viewersToNotify.length > 0) {
            window.NexusNotifications.notifyUsers(viewersToNotify, {
              tipo: 'validacao',
              titulo: '📦 Tarefa Entregue',
              mensagem: `A tarefa "${task.title}" (que você visualiza) foi entregue por ${this.myName}.`,
              referencia_tipo: 'task',
              referencia_id: this.deliveryTaskId
            }).catch(err => console.error('[Kanban] Erro notif viewers entrega:', err));
          }
        }

        this.showToast('Entrega registrada! Aguardando validação do gestor.', 'success');
      }

      this.closeModal('kb-modal-delivery');
      this.deliveryTaskId = null;
    } catch (err) {
      console.error(err);
      this.showToast('Erro ao registrar entrega.', 'error');
    }
  },

  async approveTask() {
    if (!this.reviewTaskId) return;

    // 🛡️ Guard 1: Prevent re-entrancy (double-click)
    if (this._approving) return;
    this._approving = true;

    // 🛡️ Guard 2: Disable button immediately
    const approveBtn = document.getElementById('kb-approve-review');
    if (approveBtn) {
      approveBtn.disabled = true;
      approveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Aprovando...';
    }

    // 🛡️ Guard 3: Safety timeout — force reset after 10 seconds
    const safetyTimeout = setTimeout(() => {
      console.warn('[Kanban] ⚠️ approveTask safety timeout triggered (10s)');
      this._approving = false;
      const btn = document.getElementById('kb-approve-review');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Aprovar'; }
      this.closeModal('kb-modal-review');
      this.showToast('Aprovação processada (timeout de segurança)', 'warning');
    }, 10000);

    const task = this.allTasks.find(t => t.id === this.reviewTaskId);
    if (!task) {
      clearTimeout(safetyTimeout);
      this._approving = false;
      if (approveBtn) { approveBtn.disabled = false; approveBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Aprovar'; }
      return;
    }

    // 🛡️ Guard 4: If already validated, skip (idempotency)
    if (task.validated === true) {
      console.warn('[Kanban] Tarefa já foi validada anteriormente. Ignorando clique duplicado.');
      clearTimeout(safetyTimeout);
      this._approving = false;
      this.closeModal('kb-modal-review');
      return;
    }

    const points = this.calculateFinalPoints(task);
    const taskId = this.reviewTaskId;

    try {
      // ===== OPERAÇÃO CRÍTICA: Atualizar Firebase =====
      await this.addHistory(taskId, 'Demanda aprovada', `Validado por ${this.myName} | +${points} XP`);
      await this.updateTaskInFirebase(taskId, {
        validated: true,
        validatedBy: this.myName,
        validatedAt: new Date().toISOString()
      });

      // 🛡️ Mark local copy immediately to prevent race conditions
      task.validated = true;

      // ===== OPERAÇÕES NÃO-CRÍTICAS: Gamificação (não bloqueia aprovação) =====
      let executorUid = task.ownerUid;

      if (!executorUid && task.owner && this.activeUsers) {
        console.warn('[Kanban] ownerUid não encontrado. Tentando buscar por nome:', task.owner);
        const foundUser = this.activeUsers.find(u => u.nome === task.owner || u.name === task.owner);
        if (foundUser) {
          executorUid = foundUser.uid;
          this.updateTaskInFirebase(task.id, { ownerUid: executorUid }).catch(() => { });
        }
      }

      // Fallback: buscar UID no Firestore quando não encontra em activeUsers
      if (!executorUid && task.owner) {
        console.warn('[Kanban] Tentando buscar UID no Firestore para:', task.owner);
        try {
          if (window.db) {
            const usersSnap = await window.db.collection('users')
              .where('nome', '==', task.owner).limit(1).get();
            if (!usersSnap.empty) {
              executorUid = usersSnap.docs[0].id;
              console.log('[Kanban] UID encontrado no Firestore:', executorUid);
              this.updateTaskInFirebase(task.id, { ownerUid: executorUid }).catch(() => { });
            }
          }
        } catch (e) { console.warn('[Kanban] Erro ao buscar UID no Firestore:', e); }
      }

      if (!executorUid) {
        console.error('[Kanban] ❌ CRÍTICO: Não foi possível identificar UID do executor.', { owner: task.owner });
        // NÃO usar task.owner como UID — evita criar docs fantasma no Firestore
      }

      // Gamificação — fire-and-forget, NÃO bloqueia
      try {
        if (window.NexusGamification && executorUid) {
          await window.NexusGamification.addPoints(executorUid, points, 'COMPLETE_TASK', `Conclusão da tarefa: "${task.title}"`);
        } else if (!executorUid) {
          console.warn('[Kanban] ⚠️ Gamificação pulada — UID do executor não resolvido');
        }
      } catch (gamErr) {
        console.error('[Kanban] Erro na gamificação (não-crítico):', gamErr);
      }

      // Conquistas — fire-and-forget, NÃO bloqueia
      try {
        if (window.NexusAchievements && executorUid) {
          await window.NexusAchievements.incrementStat(executorUid, 'tasks_completed', 1);

          if (task.deadline && task.deliveredAt) {
            const deadline = new Date(task.deadline + 'T23:59:59');
            const delivered = new Date(task.deliveredAt);
            if (delivered <= deadline) {
              await window.NexusAchievements.incrementStat(executorUid, 'on_time_deliveries', 1);
            }
          }

          if (task.createdAt && task.deliveredAt) {
            const created = new Date(task.createdAt);
            const delivered = new Date(task.deliveredAt);
            if ((delivered - created) < 86400000) {
              await window.NexusAchievements.incrementStat(executorUid, 'fast_delivery', 1);
            }
          }
        }

        if (window.NexusAchievements && this.myUid) {
          await window.NexusAchievements.incrementStat(this.myUid, 'validations', 1);
        }
      } catch (achErr) {
        console.error('[Kanban] Erro nas conquistas (não-crítico):', achErr);
      }

      // Notificações — fire-and-forget, NÃO bloqueia
      try {
        if (window.NexusNotifications) {
          window.NexusNotifications.add({
            tipo: 'validacao',
            titulo: '✅ Demanda Validada!',
            mensagem: `"${task.title}" foi aprovada por ${this.myName}. +${points} XP`,
            destinatario_uid: executorUid,
            referencia_tipo: 'task',
            referencia_id: task.id
          }).catch(err => console.error('[Kanban] Erro notif aprovação:', err));

          if (task.viewers && task.viewers.length > 0) {
            const viewersToNotify = task.viewers.filter(uid => uid !== this.myUid && uid !== executorUid);
            if (viewersToNotify.length > 0) {
              window.NexusNotifications.notifyUsers(viewersToNotify, {
                tipo: 'validacao',
                titulo: '✅ Demanda Validada',
                mensagem: `A tarefa "${task.title}" foi aprovada por ${this.myName}.`,
                referencia_tipo: 'task',
                referencia_id: task.id
              }).catch(err => console.error('[Kanban] Erro notif viewers aprovação:', err));
            }
          }
        }
      } catch (notifErr) {
        console.error('[Kanban] Erro nas notificações (não-crítico):', notifErr);
      }

      this.showGameToast('Demanda validada!', points, 'success');
      this.reviewTaskId = null;

      // 🔁 RECORRÊNCIA SEMANAL: criar próxima ocorrência se configurada
      if (task.isRecurring) {
        await this.createRecurringInstance(task);
      }

    } catch (err) {
      console.error('[Kanban] Erro ao aprovar tarefa:', err);
      this.showToast('Erro ao aprovar. Tente novamente.', 'error');
    } finally {
      // 🛡️ SEMPRE limpar estado, fechar modal e re-habilitar botão
      clearTimeout(safetyTimeout);
      this._approving = false;
      this.closeModal('kb-modal-review');
      const btn = document.getElementById('kb-approve-review');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Aprovar';
      }
    }
  },

  async rejectTask() {
    if (!this.reviewTaskId) return;
    const task = this.allTasks.find(t => t.id === this.reviewTaskId);
    const reason = document.getElementById('kb-reject-reason')?.value.trim();

    if (!reason) {
      this.showToast('Informe o motivo dos ajustes necessários!', 'warning');
      return;
    }

    try {
      await this.addHistory(this.reviewTaskId, 'Ajustes solicitados', `Devolvido por ${this.myName}. Motivo: ${reason}`);
      await this.updateTaskInFirebase(this.reviewTaskId, { status: 'pending' });

      // Notificar executor sobre rejeição
      if (task && task.ownerUid && window.NexusNotifications) {
        window.NexusNotifications.add({
          tipo: 'validacao',
          titulo: '⚠️ Ajustes Necessários',
          mensagem: `Sua tarefa "${task.title}" precisa de ajustes. Motivo: ${reason}`,
          destinatario_uid: task.ownerUid,
          referencia_tipo: 'task',
          referencia_id: this.reviewTaskId
        }).catch(console.error);

        // Notification: Rejection → notify viewers
        if (task.viewers && task.viewers.length > 0) {
          const viewersToNotify = task.viewers.filter(uid => uid !== this.myUid && uid !== task.ownerUid);
          if (viewersToNotify.length > 0) {
            window.NexusNotifications.notifyUsers(viewersToNotify, {
              tipo: 'validacao',
              titulo: '⚠️ Ajustes Solicitados',
              mensagem: `A tarefa "${task.title}" teve ajustes solicitados por ${this.myName}.`,
              referencia_tipo: 'task',
              referencia_id: this.reviewTaskId
            }).catch(err => console.error('[Kanban] Erro notif viewers rejeição:', err));
          }
        }
      }

      this.closeModal('kb-modal-review');
      this.showToast('Ajustes solicitados ao executor', 'warning');
      this.reviewTaskId = null;
    } catch (err) { console.error(err); }
  },

  // ============ AUTO-ARCHIVE ============
  async autoArchiveCompletedTasks() {
    if (!this.allTasks || this.allTasks.length === 0) return;
    const now = new Date();
    const thresholdMs = this.AUTO_ARCHIVE_DAYS * 24 * 60 * 60 * 1000;

    const toArchive = this.allTasks.filter(t => {
      if (t.status !== 'done' || !t.validated || !t.validatedAt) return false;
      const valDate = new Date(t.validatedAt);
      return (now - valDate) >= thresholdMs;
    });

    for (const task of toArchive) {
      try {
        console.log(`[Kanban] Auto-arquivando tarefa ${task.id} (${task.title})`);
        await this.addHistory(task.id, 'Arquivado automaticamente', `Arquivado após ${this.AUTO_ARCHIVE_DAYS} dias de conclusão`);
        await this.updateTaskInFirebase(task.id, { status: 'archived' });
      } catch (err) {
        console.warn(`[Kanban] Erro no auto-arquivamento da tarefa ${task.id}:`, err);
      }
    }
  },

  // ============ RECORRÊNCIA SEMANAL ============
  async createRecurringInstance(parentTask) {
    try {
      // Calcular próximo prazo baseado no dia da semana configurado
      const today = new Date();
      const targetDay = parentTask.recurringDay !== null && parentTask.recurringDay !== undefined
        ? parentTask.recurringDay
        : today.getDay(); // Padrão: mesmo dia da semana

      let nextDate = new Date(today);
      nextDate.setDate(today.getDate() + 7); // Próxima semana

      // Ajustar para o dia exato da semana se necessário
      const dayDiff = targetDay - nextDate.getDay();
      nextDate.setDate(nextDate.getDate() + dayDiff);
      if (nextDate <= today) nextDate.setDate(nextDate.getDate() + 7);

      const nextDeadlineStr = nextDate.toISOString().split('T')[0];

      const newTaskData = {
        title: parentTask.title,
        description: parentTask.description || '',
        unit: parentTask.unit || '',
        requester: parentTask.requester || 'Sistema (Recorrente)',
        owner: parentTask.owner || '',
        ownerUid: parentTask.ownerUid || '',
        ownerRole: parentTask.ownerRole || '',
        deadline: nextDeadlineStr,
        taskType: parentTask.taskType || 'Rotina',
        priority: this.derivePriority(nextDeadlineStr),
        status: 'backlog',
        createdAt: new Date().toISOString(),
        creatorName: 'Sistema (Recorrência)',
        creatorUid: parentTask.creatorUid || this.myUid,
        creatorRoleKey: parentTask.creatorRoleKey || 'sistema',
        acknowledged: false,
        validated: false,
        isRecurring: true,
        recurringDay: targetDay,
        recurringParentId: parentTask.id,
        viewers: parentTask.viewers || [],
        viewersNames: parentTask.viewersNames || [],
        history: [{
          date: new Date().toISOString(),
          action: 'Tarefa recorrente criada',
          user: 'Sistema',
          details: `Instância semanal gerada a partir da demanda #${parentTask.id} | Prazo: ${this.toBRDate(nextDeadlineStr)}`
        }]
      };

      const newId = await this.saveTaskToFirebase(newTaskData);
      console.log(`[Kanban] 🔁 Nova instância recorrente criada com sucesso: ${newId}`);
      this.showToast(`🔁 Próxima ocorrência semanal criada! (Prazo: ${this.toBRDate(nextDeadlineStr)})`, 'success');

      // Notificar responsável
      if (newTaskData.ownerUid && window.NexusNotifications) {
        window.NexusNotifications.add({
          tipo: 'tarefa',
          titulo: '🔁 Tarefa Recorrente Gerada',
          mensagem: `Nova ocorrência semanal da tarefa "${parentTask.title}" foi gerada com prazo para ${this.toBRDate(nextDeadlineStr)}.`,
          destinatario_uid: newTaskData.ownerUid,
          referencia_tipo: 'task',
          referencia_id: newId
        }).catch(console.error);
      }
    } catch (err) {
      console.error('[Kanban] Erro ao criar instância recorrente:', err);
    }
  },

  async archiveTask(taskId) {
    if (!confirm('Arquivar esta demanda?')) return;
    try {
      await this.addHistory(taskId, 'Demanda arquivada', `Arquivado por ${this.myName}`);
      await this.updateTaskInFirebase(taskId, { status: 'archived' });
      this.showToast('Arquivado!', 'success');

      // Notification: Archive → notify owner + viewers
      const task = this.allTasks.find(t => t.id === taskId);
      if (task && window.NexusNotifications) {
        if (task.ownerUid && task.ownerUid !== this.myUid) {
          window.NexusNotifications.add({
            tipo: 'sistema',
            titulo: '📁 Demanda Arquivada',
            mensagem: `Sua tarefa "${task.title}" foi arquivada por ${this.myName}.`,
            destinatario_uid: task.ownerUid,
            referencia_tipo: 'task',
            referencia_id: taskId
          }).catch(console.error);
        }
        if (task.viewers && task.viewers.length > 0) {
          const viewersToNotify = task.viewers.filter(uid => uid !== this.myUid && uid !== task.ownerUid);
          if (viewersToNotify.length > 0) {
            window.NexusNotifications.notifyUsers(viewersToNotify, {
              tipo: 'sistema',
              titulo: '📁 Demanda Arquivada',
              mensagem: `A tarefa "${task.title}" foi arquivada por ${this.myName}.`,
              referencia_tipo: 'task',
              referencia_id: taskId
            }).catch(err => console.error('[Kanban] Erro notif viewers arquivo:', err));
          }
        }
      }
    } catch (err) { console.error(err); }
  },

  async deleteTask(taskId) {
    const task = this.allTasks.find(t => t.id === taskId);
    if (!task || !this.canDeleteTask(task)) { this.showToast('Sem permissão!', 'error'); return; }
    if (!confirm('Excluir esta demanda?')) return;
    try {
      await this.deleteTaskFromFirebase(taskId);
      this.showToast('Excluído!', 'success');
    } catch (err) { console.error(err); }
  },

  exportCSV() {
    let csv = 'ID,TITULO,RESPONSAVEL,UNIDADE,STATUS,PRIORIDADE,PRAZO\n';
    this.allTasks.forEach(t => {
      csv += `"${t.id}","${t.title}","${t.owner}","${t.unit}","${t.status}","${t.priority}","${t.deadline}"\n`;
    });
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `kanban_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    this.showToast('CSV exportado!', 'success');
  },

  // ============ NOTIFICATIONS ============
  showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container') || document.body;
    const toast = document.createElement('div');
    toast.className = `kb-toast kb-toast-${type}`;
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('kb-toast-show'), 10);
    setTimeout(() => { toast.classList.remove('kb-toast-show'); setTimeout(() => toast.remove(), 300); }, 3000);
  },

  showGameToast(msg, points, type = 'success') {
    const container = document.getElementById('toast-container') || document.body;
    const toast = document.createElement('div');
    toast.className = `kb-toast kb-toast-${type}`;
    const pointsHtml = points !== 0 ? `<span class="kb-toast-pts ${points > 0 ? 'positive' : 'negative'}">${points > 0 ? '+' : ''}${points} pts</span>` : '';
    toast.innerHTML = `<span>${msg}</span>${pointsHtml}`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('kb-toast-show'), 10);
    setTimeout(() => { toast.classList.remove('kb-toast-show'); setTimeout(() => toast.remove(), 300); }, 4000);
  },

  // ============ CLEANUP ============
  async cleanupDatabase() {
    console.log('[Kanban] Limpando banco...');
    const snapshot = await this.db.collection('tasks').get();
    const batch = this.db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`[Kanban] ${snapshot.size} tarefas removidas`);

    await this.db.collection('tasks').add({
      title: '✅ Tarefa de Teste - Sistema Resetado',
      description: 'Tarefa criada após reset. Sistema agora usa novo modelo de permissões com visualizadores.',
      status: 'backlog', priority: 'Médio', complexity: 'Baixa',
      unit: 'TI', requester: 'Sistema', owner: this.myName || 'Admin',
      ownerUid: this.myUid || 'system',
      ownerRole: 'ADMIN',
      deadline: this.getDeadline(5), createdAt: new Date().toISOString(),
      creatorName: 'Sistema',
      creatorUid: 'system',  // ✅ Novo campo
      creatorRoleKey: 'admin',
      acknowledged: false, validated: false,
      viewers: [],           // ✅ Novo campo
      viewersNames: [],      // ✅ Novo campo
      history: [{ date: new Date().toISOString(), action: 'Criado automaticamente após reset do sistema' }]
    });
    console.log('[Kanban] Tarefa teste criada com novo schema!');
  },

  // ============ STYLES ============
  // ============ HISTORY ============
  async addHistory(taskId, action, details = '') {
    try {
      const entry = {
        date: new Date().toISOString(),
        action,
        user: this.myName,
        details
      };
      await this.updateTaskInFirebase(taskId, {
        history: firebase.firestore.FieldValue.arrayUnion(entry)
      });
    } catch (err) {
      console.warn('[Kanban] Erro ao registrar histórico:', err);
    }
  },

  renderHistoryTimeline(history) {
    const section = document.getElementById('kb-history-section');
    const container = document.getElementById('kb-history-timeline');
    if (!section || !container) return;

    if (!history || history.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Mapa para traduzir nomes crus de status para português
    const statusMap = { 'backlog': 'Backlog', 'doing': 'Execução', 'pending': 'Bloqueado', 'done': 'Entregue', 'archived': 'Arquivado' };
    const sanitizeAction = (text) => {
      return text.replace(/\b(backlog|doing|pending|done|archived)\b/gi, match => statusMap[match.toLowerCase()] || match);
    };

    container.innerHTML = sorted.map(h => {
      const dt = new Date(h.date);
      const dateStr = `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      const actionText = this.esc(sanitizeAction(h.action));
      const detailsText = h.details ? this.esc(sanitizeAction(h.details)) : '';
      const icon = actionText.includes('criada') || actionText.includes('Criada') || actionText.includes('Criado') ? '🆕' :
        actionText.includes('Status') || actionText.includes('Movid') ? '🔄' :
          actionText.includes('editada') || actionText.includes('Editada') ? '✏️' :
            actionText.includes('Entrega') || actionText.includes('entrega') ? '📦' :
              actionText.includes('aprovada') || actionText.includes('Aprovada') ? '✅' :
                actionText.includes('Ajustes') ? '⚠️' :
                  actionText.includes('arquivada') || actionText.includes('Arquivada') ? '📁' :
                    actionText.includes('restaurada') || actionText.includes('Restaurada') ? '♻️' : '📌';
      return `
        <div class="kb-history-item">
          <div class="kb-history-icon">${icon}</div>
          <div class="kb-history-content">
            <div class="kb-history-action">${actionText}</div>
            ${detailsText ? `<div class="kb-history-details">${detailsText}</div>` : ''}
            <div class="kb-history-meta">${this.esc((h.user || 'Sistema').toUpperCase())} • ${dateStr}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  // ============ VIEWERS PICKER ============
  initViewersPicker() {
    const search = document.getElementById('kb-viewers-search');
    const dropdown = document.getElementById('kb-viewers-dropdown');
    if (!search || !dropdown) return;

    // Show dropdown on focus
    search.addEventListener('focus', () => {
      dropdown.style.display = 'block';
    });

    // Filter on type
    search.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      dropdown.querySelectorAll('.kb-viewer-option').forEach(opt => {
        const nome = (opt.dataset.nome || '').toLowerCase();
        opt.style.display = nome.includes(q) ? 'flex' : 'none';
      });
    });

    // Handle checkbox changes
    dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        this.updateViewersChips();
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const container = document.getElementById('kb-viewers-container');
      if (container && !container.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  },

  updateViewersChips() {
    const chipsContainer = document.getElementById('kb-viewers-chips');
    const dropdown = document.getElementById('kb-viewers-dropdown');
    if (!chipsContainer || !dropdown) return;

    const selected = dropdown.querySelectorAll('input[type="checkbox"]:checked');
    chipsContainer.innerHTML = '';

    selected.forEach(cb => {
      const chip = document.createElement('span');
      chip.className = 'kb-viewer-chip';
      chip.innerHTML = `${this.esc((cb.dataset.nome || '').toUpperCase())} <button type="button" class="kb-chip-remove" data-uid="${cb.value}">✕</button>`;
      chipsContainer.appendChild(chip);
    });

    // Bind remove buttons
    chipsContainer.querySelectorAll('.kb-chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uid = btn.dataset.uid;
        const cb = dropdown.querySelector(`input[value="${uid}"]`);
        if (cb) cb.checked = false;
        this.updateViewersChips();
      });
    });
  },

  getSelectedViewers() {
    const dropdown = document.getElementById('kb-viewers-dropdown');
    if (!dropdown) return [];
    const checked = dropdown.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checked).map(cb => ({ uid: cb.value, nome: cb.dataset.nome || '' }));
  },

  clearViewersPicker() {
    const dropdown = document.getElementById('kb-viewers-dropdown');
    const chips = document.getElementById('kb-viewers-chips');
    const search = document.getElementById('kb-viewers-search');
    if (dropdown) dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    if (chips) chips.innerHTML = '';
    if (search) search.value = '';
    if (dropdown) dropdown.querySelectorAll('.kb-viewer-option').forEach(opt => opt.style.display = 'flex');
  },

  loadViewersPicker(viewerUids) {
    this.clearViewersPicker();
    const dropdown = document.getElementById('kb-viewers-dropdown');
    if (!dropdown || !viewerUids || viewerUids.length === 0) return;
    viewerUids.forEach(uid => {
      const cb = dropdown.querySelector(`input[value="${uid}"]`);
      if (cb) cb.checked = true;
    });
    this.updateViewersChips();
  },

  // ============ STYLES ============
  injectStyles() {
    if (document.getElementById('kb-styles')) return;
    const style = document.createElement('style');
    style.id = 'kb-styles';
    style.textContent = `
      .kb-page { padding: 20px; }
      .kb-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
      .kb-title { font-size: 24px; font-weight: 700; color: var(--primary, #38bdf8); margin: 0; }
      .kb-subtitle { font-size: 12px; color: var(--text-tertiary, #64748b); margin: 4px 0 0; }
      .kb-header-right { display: flex; gap: 10px; flex-wrap: wrap; }
      .kb-btn { padding: 10px 16px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
      .kb-btn-primary { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; }
      .kb-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59,130,246,0.4); }
      .kb-btn-secondary { background: var(--surface-card, #1e293b); color: var(--text-primary, #e2e8f0); border: 1px solid var(--surface-border, #334155); }
      .kb-btn-secondary:hover { background: var(--surface-hover, #334155); }
      .kb-btn-danger { background: #ef4444; color: white; }
      .kb-btn.full { width: 100%; justify-content: center; }
      .kb-filters { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
      .kb-filter-group { display: flex; flex-direction: column; gap: 4px; }
      .kb-filter-group label { font-size: 11px; color: var(--text-tertiary, #64748b); text-transform: uppercase; }
      .kb-filter-group select { padding: 8px 12px; background: var(--surface-card, #1e293b); border: 1px solid var(--surface-border, #334155); border-radius: 6px; color: var(--text-primary, #e2e8f0); min-width: 150px; }
      .kb-notif-badge { background: #ef4444; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; animation: pulse 2s infinite; }
      @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      .kb-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; min-height: 500px; }
      @media (max-width: 1200px) { .kb-board { grid-template-columns: repeat(2, 1fr); } }
      @media (max-width: 768px) { .kb-board { grid-template-columns: 1fr; } }
      .kb-column { background: var(--surface-card, #1e293b); border: 1px solid var(--surface-border, #334155); border-radius: 12px; display: flex; flex-direction: column; }
      .kb-column-header { padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; font-weight: 600; border-bottom: 3px solid; }
      .kb-col-blue { border-bottom-color: #3b82f6; }
      .kb-col-yellow { border-bottom-color: #f59e0b; }
      .kb-col-red { border-bottom-color: #ef4444; }
      .kb-col-green { border-bottom-color: #10b981; }
      .kb-count { background: var(--primary, #3b82f6); color: white; padding: 2px 10px; border-radius: 20px; font-size: 12px; }
      .kb-track { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; min-height: 200px; transition: background 0.2s; }
      .kb-track.kb-drag-over { background: rgba(59, 130, 246, 0.1); }
      .kb-card { background: var(--surface-ground, #0f172a); border: 1px solid var(--surface-border, #334155); border-radius: 10px; padding: 14px; cursor: grab; transition: all 0.2s; }
      .kb-card:hover { transform: translateY(-2px); border-color: var(--primary, #3b82f6); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
      .kb-card.kb-dragging { opacity: 0.5; transform: rotate(3deg); }
      .kb-card.kb-new-task { border-left: 4px solid #f59e0b; animation: glow 2s infinite; }
      @keyframes glow { 0%, 100% { box-shadow: 0 0 5px rgba(245,158,11,0.3); } 50% { box-shadow: 0 0 15px rgba(245,158,11,0.6); } }
      .kb-card.kb-validated { border-left: 4px solid #10b981; }
      .kb-card.kb-pending-validation { border-left: 4px solid #f59e0b; }
      .kb-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      .kb-card-unit { font-size: 10px; text-transform: uppercase; color: var(--text-tertiary, #64748b); background: var(--surface-card, #1e293b); padding: 2px 8px; border-radius: 4px; }
      .kb-card-actions { display: flex; gap: 6px; }
      .kb-act-btn { background: transparent; border: none; color: var(--text-tertiary, #64748b); cursor: pointer; padding: 4px; border-radius: 4px; }
      .kb-act-btn:hover { color: var(--primary, #3b82f6); background: var(--surface-hover, #334155); }
      .kb-card-title { font-weight: 600; font-size: 14px; margin-bottom: 8px; color: var(--text-primary, #e2e8f0); }
      .kb-new-badge { background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.2)); border: 1px solid rgba(245,158,11,0.4); color: #f59e0b; padding: 8px; border-radius: 6px; font-size: 11px; margin-bottom: 8px; }
      .kb-btn-ack { width: 100%; padding: 8px; background: linear-gradient(135deg, #f59e0b, #ea580c); color: white; border: none; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer; margin-bottom: 8px; }
      .kb-btn-ack:hover { transform: translateY(-1px); }
      .kb-sla { font-size: 11px; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; display: inline-block; }
      .kb-sla-ok { background: rgba(16,185,129,0.2); color: #10b981; }
      .kb-sla-warn { background: rgba(245,158,11,0.2); color: #f59e0b; }
      .kb-sla-danger { background: rgba(239,68,68,0.2); color: #ef4444; }
      .kb-validation { font-size: 11px; padding: 6px 8px; border-radius: 4px; margin-bottom: 8px; }
      .kb-val-ok { background: rgba(16,185,129,0.2); color: #10b981; }
      .kb-val-pending { background: rgba(245,158,11,0.2); color: #f59e0b; }
      .kb-btn-validate { width: 100%; padding: 6px; background: var(--primary, #3b82f6); color: white; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; margin-top: 6px; }
      .kb-card-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
      .kb-card-owner { font-size: 12px; color: var(--text-secondary, #94a3b8); }
      .kb-card-badges { display: flex; gap: 6px; }
      .kb-badge { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
      .kb-p-baixo { background: rgba(100,116,139,0.3); color: #94a3b8; }
      .kb-p-medio { background: rgba(59,130,246,0.3); color: #60a5fa; }
      .kb-p-alto { background: rgba(245,158,11,0.3); color: #fbbf24; }
      .kb-p-urgente { background: rgba(239,68,68,0.3); color: #f87171; }
      .kb-points { background: rgba(139,92,246,0.3); color: #a78bfa; }
      .kb-card-date { font-size: 10px; color: var(--text-tertiary, #64748b); text-align: right; margin-top: 8px; }
      .kb-archive-zone { padding: 20px; text-align: center; border: 2px dashed var(--surface-border, #334155); border-radius: 10px; color: var(--text-tertiary, #64748b); margin-top: 20px; transition: all 0.2s; }
      .kb-archive-zone.kb-drag-over { border-color: #f59e0b; background: rgba(245,158,11,0.1); color: #f59e0b; }
      .kb-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
      .kb-modal.hidden { display: none; }
      .kb-modal-content { background: var(--surface-card, #1e293b); border: 1px solid var(--surface-border, #334155); border-radius: 16px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
      .kb-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid var(--surface-border, #334155); }
      .kb-modal-header h3 { margin: 0; font-size: 18px; }
      .kb-modal-close { background: transparent; border: none; font-size: 24px; color: var(--text-tertiary, #64748b); cursor: pointer; }
      .kb-modal-close:hover { color: #ef4444; }
      #kb-form-task { padding: 20px; }
      .kb-form-row { display: flex; gap: 16px; margin-bottom: 16px; }
      .kb-form-group { flex: 1; display: flex; flex-direction: column; gap: 6px; }
      .kb-form-group.full { flex: 100%; }
      .kb-form-group label { font-size: 12px; color: var(--text-secondary, #94a3b8); }
      .kb-form-group input, .kb-form-group select, .kb-form-group textarea { padding: 10px 12px; background: var(--surface-ground, #0f172a); border: 1px solid var(--surface-border, #334155); border-radius: 8px; color: var(--text-primary, #e2e8f0); font-size: 14px; }
      .kb-form-group input:focus, .kb-form-group select:focus, .kb-form-group textarea:focus { outline: none; border-color: var(--primary, #3b82f6); }
      .kb-form-group input:disabled { opacity: 0.5; cursor: not-allowed; }
      .kb-evidence-box { padding: 16px 20px; border-bottom: 1px solid var(--surface-border, #334155); }
      .kb-evidence-box label { font-size: 11px; color: var(--text-tertiary, #64748b); text-transform: uppercase; display: block; margin-bottom: 8px; }
      .kb-evidence-box div { color: var(--text-primary, #e2e8f0); }
      .kb-evidence-box a { color: var(--primary, #3b82f6); }
      .kb-toast { position: fixed; bottom: 20px; right: 20px; background: var(--surface-card, #1e293b); border: 1px solid var(--surface-border, #334155); border-radius: 10px; padding: 14px 20px; display: flex; align-items: center; gap: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); transform: translateX(120%); transition: transform 0.3s; z-index: 9999; }
      .kb-toast.kb-toast-show { transform: translateX(0); }
      .kb-toast-success { border-left: 4px solid #10b981; }
      .kb-toast-warning { border-left: 4px solid #f59e0b; }
      .kb-toast-error { border-left: 4px solid #ef4444; }
      .kb-toast-pts { font-weight: 700; padding: 4px 8px; border-radius: 4px; }
      .kb-toast-pts.positive { background: rgba(16,185,129,0.2); color: #10b981; }
      .kb-toast-pts.negative { background: rgba(239,68,68,0.2); color: #ef4444; }
      .kb-archived-container { padding: 20px; }
      .kb-archived-header { margin-bottom: 20px; }
      .kb-archived-header h3 { font-size: 20px; color: var(--text-primary, #e2e8f0); }
      .kb-archived-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
      .kb-archived-card { background: var(--surface-card, #1e293b); border: 1px solid var(--surface-border, #334155); border-left: 4px solid #64748b; border-radius: 10px; padding: 16px; }
      .kb-archived-card-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
      .kb-archived-card-meta { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-tertiary, #64748b); margin: 12px 0; }
      .kb-archived-card-actions { display: flex; gap: 10px; margin-top: 12px; }
      .kb-archived-card-actions .kb-btn { flex: 1; padding: 8px; font-size: 12px; }
      .kb-empty-archive { text-align: center; padding: 60px 20px; background: var(--surface-card, #1e293b); border: 1px dashed var(--surface-border, #334155); border-radius: 12px; }
      .kb-empty-archive h3 { color: var(--text-primary, #e2e8f0); margin-bottom: 8px; }
      
      /* Attachments */
      .kb-attachments-wrapper { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; border: 1px dashed var(--surface-border, #334155); margin-top: 4px; }
      .kb-attachments-list { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
      .kb-attachment-item { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #cbd5e1; border: 1px solid transparent; transition: all 0.2s; }
      .kb-attachment-item:hover { border-color: #475569; background: rgba(255,255,255,0.08); }
      .kb-attachment-info { display: flex; align-items: center; gap: 8px; overflow: hidden; }
      .kb-attachment-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; }
      .kb-attachment-actions { display: flex; gap: 8px; }
      .kb-attachment-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 4px; }
      .kb-attachment-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
      .kb-attachment-btn.delete:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
      .kb-btn-sm { padding: 4px 10px; font-size: 11px; height: 28px; }
      
      /* Visualizadores */
      .kb-card-viewers {
        font-size: 11px;
        color: var(--text-tertiary, #64748b);
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        margin-bottom: 8px;
        padding: 6px 10px;
        background: rgba(59, 130, 246, 0.1);
        border-radius: 6px;
        border: 1px solid rgba(59, 130, 246, 0.2);
      }
      /* Viewers Picker */
      .kb-viewers-container { position: relative; }
      .kb-viewers-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
      .kb-viewer-chip { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2)); border: 1px solid rgba(59,130,246,0.3); color: #e2e8f0; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
      .kb-chip-remove { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 12px; padding: 0 2px; line-height: 1; }
      .kb-chip-remove:hover { color: #ef4444; }
      .kb-viewers-search { width: 100%; padding: 10px 12px; background: var(--surface-ground, #0f172a); border: 1px solid var(--surface-border, #334155); border-radius: 8px; color: var(--text-primary, #e2e8f0); font-size: 14px; }
      .kb-viewers-search:focus { outline: none; border-color: var(--primary, #3b82f6); box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
      .kb-viewers-dropdown { display: none; position: absolute; top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto; background: var(--surface-card, #1e293b); border: 1px solid var(--surface-border, #334155); border-radius: 8px; z-index: 50; margin-top: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
      .kb-viewer-option { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; font-size: 13px; color: var(--text-primary, #e2e8f0); transition: background 0.15s; }
      .kb-viewer-option:hover { background: var(--surface-hover, #334155); }
      .kb-viewer-option input[type="checkbox"] { accent-color: #3b82f6; width: 16px; height: 16px; cursor: pointer; }

      /* History Timeline */
      .kb-history-timeline { max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
      .kb-history-item { display: flex; gap: 10px; padding: 8px 12px; background: rgba(0,0,0,0.2); border-radius: 8px; border-left: 3px solid var(--primary, #3b82f6); }
      .kb-history-icon { font-size: 16px; flex-shrink: 0; margin-top: 2px; }
      .kb-history-content { flex: 1; min-width: 0; }
      .kb-history-action { font-size: 13px; font-weight: 600; color: var(--text-primary, #e2e8f0); }
      .kb-history-details { font-size: 11px; color: var(--text-secondary, #94a3b8); margin-top: 2px; word-break: break-word; }
      .kb-history-meta { font-size: 10px; color: var(--text-tertiary, #64748b); margin-top: 4px; }

      /* Archive button */
      .kb-archive-card-btn:hover { color: #f59e0b !important; background: rgba(245,158,11,0.15) !important; }

      /* ====================================================
         MODO CLARO — KANBAN OVERRIDES COMPLETO
         ==================================================== */
      [data-theme="light"] .kb-column {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
      [data-theme="light"] .kb-column-header {
        color: #0f172a !important;
        background: #f8fafc !important;
      }
      [data-theme="light"] .kb-track {
        background: #f8fafc !important;
      }
      [data-theme="light"] .kb-card {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 1px 4px rgba(0,0,0,0.07) !important;
      }
      [data-theme="light"] .kb-card:hover {
        border-color: #6366f1 !important;
        box-shadow: 0 4px 14px rgba(99,102,241,0.15) !important;
      }
      [data-theme="light"] .kb-card-title {
        color: #0f172a !important;
      }
      [data-theme="light"] .kb-card-unit {
        background: #f1f5f9 !important;
        color: #475569 !important;
      }
      [data-theme="light"] .kb-card-owner,
      [data-theme="light"] .kb-card-date,
      [data-theme="light"] .kb-card-viewers {
        color: #64748b !important;
      }
      [data-theme="light"] .kb-card-viewers {
        background: rgba(99,102,241,0.07) !important;
        border-color: rgba(99,102,241,0.2) !important;
      }
      [data-theme="light"] .kb-act-btn {
        color: #64748b !important;
      }
      [data-theme="light"] .kb-act-btn:hover {
        color: #6366f1 !important;
        background: #f1f5f9 !important;
      }

      /* Badges de prioridade — mais contraste no modo claro */
      [data-theme="light"] .kb-p-baixo { background: rgba(100,116,139,0.15) !important; color: #475569 !important; }
      [data-theme="light"] .kb-p-medio { background: rgba(59,130,246,0.12) !important; color: #2563eb !important; }
      [data-theme="light"] .kb-p-alto  { background: rgba(245,158,11,0.15) !important; color: #d97706 !important; }
      [data-theme="light"] .kb-p-urgente { background: rgba(239,68,68,0.12) !important; color: #dc2626 !important; }
      [data-theme="light"] .kb-points { background: rgba(139,92,246,0.12) !important; color: #7c3aed !important; }

      /* Filtros */
      [data-theme="light"] .kb-filter-group label { color: #475569 !important; }
      [data-theme="light"] .kb-filter-group select {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
      }

      /* Modal kanban */
      [data-theme="light"] .kb-modal-content {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
      [data-theme="light"] .kb-modal-header {
        border-color: #e2e8f0 !important;
      }
      [data-theme="light"] .kb-modal-header h3 { color: #0f172a !important; }
      [data-theme="light"] .kb-form-group label { color: #475569 !important; }
      [data-theme="light"] .kb-form-group input,
      [data-theme="light"] .kb-form-group select,
      [data-theme="light"] .kb-form-group textarea {
        background: #f8fafc !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
      }
      [data-theme="light"] .kb-form-group input:focus,
      [data-theme="light"] .kb-form-group select:focus,
      [data-theme="light"] .kb-form-group textarea:focus {
        border-color: #6366f1 !important;
        background: #ffffff !important;
      }
      [data-theme="light"] .kb-evidence-box {
        border-color: #e2e8f0 !important;
        color: #0f172a !important;
      }
      [data-theme="light"] .kb-attachments-wrapper {
        background: #f1f5f9 !important;
        border-color: #cbd5e1 !important;
      }
      [data-theme="light"] .kb-attachment-item {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
        color: #0f172a !important;
      }
      [data-theme="light"] .kb-attachment-item:hover {
        background: #f8fafc !important;
        border-color: #94a3b8 !important;
      }
      [data-theme="light"] .kb-attachment-btn { color: #64748b !important; }
      [data-theme="light"] .kb-attachment-btn:hover { color: #0f172a !important; background: #e2e8f0 !important; }

      /* Viewers picker */
      [data-theme="light"] .kb-viewers-search,
      [data-theme="light"] .kb-viewers-dropdown {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
      }
      [data-theme="light"] .kb-viewer-option {
        color: #0f172a !important;
      }
      [data-theme="light"] .kb-viewer-option:hover {
        background: #f1f5f9 !important;
      }
      [data-theme="light"] .kb-viewer-chip {
        background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1)) !important;
        border-color: rgba(99,102,241,0.25) !important;
        color: #4338ca !important;
      }

      /* Histórico */
      [data-theme="light"] .kb-history-item {
        background: #f1f5f9 !important;
      }
      [data-theme="light"] .kb-history-action { color: #0f172a !important; }
      [data-theme="light"] .kb-history-details { color: #475569 !important; }
      [data-theme="light"] .kb-history-meta { color: #64748b !important; }

      /* Toast + arquivados */
      [data-theme="light"] .kb-toast {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;
      }
      [data-theme="light"] .kb-archived-card,
      [data-theme="light"] .kb-empty-archive {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
      [data-theme="light"] .kb-archived-header h3,
      [data-theme="light"] .kb-empty-archive h3 {
        color: #0f172a !important;
      }
    `;

    document.head.appendChild(style);
  }
};

// Export para uso global
window.NexusKanban = NexusKanban;
