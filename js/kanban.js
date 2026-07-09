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
  selectedPriority: 'Baixo',
  selectedComplexity: 'Baixa',
  isEditing: false,
  editId: null,
  unsubscribe: null,
  container: null,

  // ============ ATTACHMENTS STATE ============
  taskFilesToUpload: [],
  currentTaskAttachments: [],
  currentTaskId: null,

  // ============ ROLE IDENTIFICATION ============
  // Mantido apenas para identificação de cargos privilegiados
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

  // ============ GAMIFICATION ============
  PRIORITY_POINTS: { 'Baixo': 5, 'Médio': 10, 'Alto': 15, 'Urgente': 25 },
  COMPLEXITY_MULTIPLIER: { 'Baixa': 1, 'Média': 1.5, 'Alta': 2 },
  DELAY_PENALTY: { 1: -5, 2: -10, 3: -15 },

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

  isAdmin() {
    return this.PRIVILEGED_ROLES.includes(this.myRoleKey) ||
      localStorage.getItem('nep_is_admin') === 'true';
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

  canEditDeadline(task) {
    if (this.isAdmin()) return true;
    return this.isCreatorMe(task);
  },

  canValidateTask(task) {
    if (!task || task.status !== 'done' || task.validated) return false;
    if (this.isAdmin()) return true;
    if (this.isCreatorMe(task)) return true;
    if (this.isViewerMe(task)) return true;
    return false;
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

  // ============ POINTS CALCULATION ============
  calculatePoints(priority, complexity) {
    const base = this.PRIORITY_POINTS[priority] || 5;
    const mult = this.COMPLEXITY_MULTIPLIER[complexity] || 1;
    return Math.round(base * mult);
  },

  calculateFinalPoints(task) {
    let points = this.calculatePoints(task.priority, task.complexity);

    if (task.deadline && task.deliveredAt) {
      const deadline = new Date(task.deadline + 'T23:59:59');
      const delivered = new Date(task.deliveredAt);
      const daysLate = Math.floor((delivered - deadline) / (1000 * 60 * 60 * 24));

      if (daysLate > 0) {
        if (daysLate === 1) points += this.DELAY_PENALTY[1];
        else if (daysLate === 2) points += this.DELAY_PENALTY[2];
        else points += this.DELAY_PENALTY[3];
        points = Math.max(1, points);
      }
    }
    return points;
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
                        <span>${u.nome.toUpperCase()} - ${(u.cargo || '').toUpperCase()}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
            <div class="kb-form-row">
              <div class="kb-form-group"><label>Prazo</label><input type="date" id="kb-task-deadline" required></div>
              <div class="kb-form-group"><label>Prioridade</label>
                <select id="kb-task-priority"><option value="Baixo">Baixo (5 pts)</option><option value="Médio">Médio (10 pts)</option><option value="Alto">Alto (15 pts)</option><option value="Urgente">Urgente (25 pts)</option></select>
              </div>
            </div>
            <div class="kb-form-row">
              <div class="kb-form-group"><label>Complexidade</label>
                <select id="kb-task-complexity"><option value="Baixa">Baixa (×1)</option><option value="Média">Média (×1.5)</option><option value="Alta">Alta (×2)</option></select>
              </div>
              <div class="kb-form-group"><label>🏆 Pontos</label><input type="number" id="kb-task-points" readonly value="5"></div>
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
          <div class="kb-form-row">
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

    const points = this.calculatePoints(task.priority, task.complexity);

    card.innerHTML = `
      <div class="kb-archived-card-header">
        <span class="kb-card-unit">${task.unit || 'Geral'}</span>
        <span class="kb-badge kb-points">🏆 ${points}</span>
      </div>
      <div class="kb-card-title">${task.title}</div>
      <div class="kb-archived-card-meta">
        <span><i class="fa-solid fa-user"></i> ${(task.owner || 'N/D').toUpperCase()}</span>
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

    const prioClass = { 'Urgente': 'kb-p-urgente', 'Alto': 'kb-p-alto', 'Médio': 'kb-p-medio', 'Baixo': 'kb-p-baixo' }[task.priority] || 'kb-p-baixo';
    const points = this.calculatePoints(task.priority, task.complexity);

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

    let newBadge = isNew ? `<div class="kb-new-badge">🔔 Nova demanda de ${(task.creatorName || 'Gestor').toUpperCase()}</div><button class="kb-btn-ack" data-id="${task.id}">✓ RECEBI A DEMANDA</button>` : '';

    let validationHtml = '';
    if (task.status === 'done') {
      if (task.validated) validationHtml = '<div class="kb-validation kb-val-ok">✅ Concluída</div>';
      else {
        validationHtml = '<div class="kb-validation kb-val-pending">⏳ Aguardando validação</div>';
        if (this.canValidateTask(task)) validationHtml += `<button class="kb-btn-validate" data-id="${task.id}">🔍 REVISAR</button>`;
      }
    }

    let viewersHtml = '';
    if (task.viewersNames && task.viewersNames.length > 0) {
      const viewersList = task.viewersNames.slice(0, 3).map(n => n.toUpperCase()).join(', ');
      const extraCount = task.viewersNames.length > 3 ? ` +${task.viewersNames.length - 3}` : '';
      viewersHtml = `
        <div class="kb-card-viewers" title="${task.viewersNames.map(n => n.toUpperCase()).join(', ')}">
          <i class="fa-solid fa-eye"></i> ${task.viewersNames.length} visualizador(es)${extraCount ? extraCount : ''}
        </div>
      `;
    }

    card.innerHTML = `
      <div class="kb-card-header">
        <span class="kb-card-unit">${task.unit || 'Geral'}</span>
        ${task.hasAttachments ? '<i class="fa-solid fa-paperclip" style="margin-left:auto; margin-right:8px; color:#94a3b8; font-size:11px;" title="Possui anexos"></i>' : ''}
        <div class="kb-card-actions">
          <button class="kb-act-btn kb-edit-btn" title="Editar"><i class="fa-solid fa-pen"></i></button>
          ${task.status !== 'archived' ? '<button class="kb-act-btn kb-archive-card-btn" title="Arquivar"><i class="fa-solid fa-box-archive"></i></button>' : ''}
          ${this.canDeleteTask(task) ? '<button class="kb-act-btn kb-del-btn" title="Excluir"><i class="fa-solid fa-trash"></i></button>' : ''}
        </div>
      </div>
      <div class="kb-card-title">${task.title}</div>
      ${newBadge}
      ${slaHtml}
      ${validationHtml}
      ${viewersHtml}
      <div class="kb-card-meta">
        <div class="kb-card-owner"><i class="fa-solid fa-user"></i> ${(task.owner || 'N/D').toUpperCase()}</div>
        <div class="kb-card-badges">
          <span class="kb-badge ${prioClass}">${task.priority || 'Baixo'}</span>
          <span class="kb-badge kb-points">🏆 ${points}</span>
        </div>
      </div>
      <div class="kb-card-date">${this.toBRDate(task.deadline)}</div>
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

    // Atualizar pontos ao mudar prioridade/complexidade
    document.getElementById('kb-task-priority')?.addEventListener('change', () => this.updatePointsPreview());
    document.getElementById('kb-task-complexity')?.addEventListener('change', () => this.updatePointsPreview());

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

    document.getElementById('kb-modal-title').textContent = 'Editar Demanda';
    document.getElementById('kb-task-title').value = task.title || '';
    document.getElementById('kb-task-requester').value = task.requester || '';
    document.getElementById('kb-task-unit').value = task.unit || '';
    document.getElementById('kb-task-owner').value = task.owner || '';
    document.getElementById('kb-task-owner-role').value = task.ownerRole || '';
    document.getElementById('kb-task-deadline').value = task.deadline || '';
    document.getElementById('kb-task-priority').value = task.priority || 'Baixo';
    document.getElementById('kb-task-complexity').value = task.complexity || 'Baixa';
    document.getElementById('kb-task-desc').value = task.description || '';
    document.getElementById('kb-task-deadline').disabled = !this.canEditDeadline(task);

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

    const btn = document.getElementById('kb-confirm-delivery');
    if (btn) btn.innerHTML = this.isAdmin() ? '<i class="fa-solid fa-check"></i> Concluir (Auto)' : '<i class="fa-solid fa-paper-plane"></i> Enviar para Aprovação';
    this.openModal('kb-modal-delivery');
  },

  openReviewModal(taskId) {
    this.reviewTaskId = taskId;
    const task = this.allTasks.find(t => t.id === taskId);
    if (!task) return;
    document.getElementById('kb-review-text').textContent = task.evidence || 'Sem descrição.';
    const linkEl = document.getElementById('kb-review-link');
    linkEl.innerHTML = task.evidenceLink ? `<a href="${task.evidenceLink}" target="_blank">🔗 Ver Evidência</a>` : 'Nenhum link';

    // Load Attachments ReadOnly
    this.loadTaskAttachments(taskId, 'kb-review-attachments', true);

    this.openModal('kb-modal-review');
  },

  updatePointsPreview() {
    const p = document.getElementById('kb-task-priority')?.value || 'Baixo';
    const c = document.getElementById('kb-task-complexity')?.value || 'Baixa';
    const pts = this.calculatePoints(p, c);
    const el = document.getElementById('kb-task-points');
    if (el) el.value = pts;
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

    const data = {
      title,
      requester: document.getElementById('kb-task-requester')?.value.trim() || '',
      unit: document.getElementById('kb-task-unit')?.value || '',
      owner: ownerSelect?.value?.trim() || '',
      ownerUid: ownerOption?.dataset?.uid || '',
      ownerRole: document.getElementById('kb-task-owner-role')?.value.trim() || '',
      deadline: document.getElementById('kb-task-deadline')?.value || '',
      priority: document.getElementById('kb-task-priority')?.value || 'Baixo',
      complexity: document.getElementById('kb-task-complexity')?.value || 'Baixa',
      description: document.getElementById('kb-task-desc')?.value.trim() || ''
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
          if (oldTask.deadline !== data.deadline) changes.push(`Prazo: ${this.toBRDate(oldTask.deadline)} → ${this.toBRDate(data.deadline)}`);
          if (oldTask.owner !== data.owner) changes.push(`Responsável: ${oldTask.owner} → ${data.owner}`);
          if (oldTask.priority !== data.priority) changes.push(`Prioridade: ${oldTask.priority} → ${data.priority}`);
          if (oldTask.complexity !== data.complexity) changes.push(`Complexidade: ${oldTask.complexity} → ${data.complexity}`);
          if (oldTask.title !== data.title) changes.push(`Título alterado`);
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

      await this.addHistory(this.deliveryTaskId, 'Entrega registrada', evidence ? evidence.substring(0, 100) : 'Evidência anexada');
      await this.updateTaskInFirebase(this.deliveryTaskId, {
        status: 'done',
        deliveredAt: new Date().toISOString(),
        evidence,
        evidenceLink: link,
        validated: false
      });

      // Notificar gestor sobre entrega
      const task = this.allTasks.find(t => t.id === this.deliveryTaskId);
      if (task && task.creatorUid && window.NexusNotifications) {
        window.NexusNotifications.add({
          tipo: 'validacao',
          titulo: '📦 Tarefa Entregue',
          mensagem: `${this.myName} entregou a tarefa "${task.title}" e aguarda sua validação.`,
          destinatario_uid: task.creatorUid || task.creatorName,
          referencia_tipo: 'task',
          referencia_id: this.deliveryTaskId
        }).catch(console.error);
      }

      // Notification: Delivery → notify viewers
      if (task && task.viewers && task.viewers.length > 0 && window.NexusNotifications) {
        const viewersToNotify = task.viewers.filter(uid => uid !== this.myUid && uid !== task.creatorUid);
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

      this.showToast('Entrega registrada! Aguardando validação.', 'success');
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

      // Animação XP
      if (window.NexusAchievements) {
        try { window.NexusAchievements.showXPAnimation(points); } catch (e) { }
      }

      this.showGameToast('Demanda validada!', points, 'success');
      this.reviewTaskId = null;

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
    try {
      await this.addHistory(this.reviewTaskId, 'Ajustes solicitados', `Devolvido por ${this.myName}`);
      await this.updateTaskInFirebase(this.reviewTaskId, { status: 'pending' });

      // Notificar executor sobre rejeição
      if (task && task.ownerUid && window.NexusNotifications) {
        window.NexusNotifications.add({
          tipo: 'validacao',
          titulo: '⚠️ Ajustes Necessários',
          mensagem: `Sua tarefa "${task.title}" precisa de ajustes. ${this.myName} solicitou revisão.`,
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
      this.showToast('Ajustes solicitados', 'warning');
      this.reviewTaskId = null;
    } catch (err) { console.error(err); }
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
      const actionText = sanitizeAction(h.action);
      const detailsText = h.details ? sanitizeAction(h.details) : '';
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
            <div class="kb-history-meta">${(h.user || 'Sistema').toUpperCase()} • ${dateStr}</div>
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
      chip.innerHTML = `${(cb.dataset.nome || '').toUpperCase()} <button type="button" class="kb-chip-remove" data-uid="${cb.value}">✕</button>`;
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
