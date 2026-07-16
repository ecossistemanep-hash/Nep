/**
 * NEXUS PLATFORM - ADMIN
 * Painel Administrativo com Gestão de Usuários
 * v2.0 - Carregamento robusto
 */

const NexusAdmin = {
  activeTab: 'dashboard',
  users: [],
  auditLogs: [],
  modulesReady: false,

  // Helper para aguardar módulos Firebase - versão mais tolerante
  async waitForModules(timeout = 15000) {
    console.log('[Admin] Aguardando módulos Firebase...');

    // Se já estão disponíveis, retorna imediatamente
    if (window.UserManagement && window.AuditService) {
      this.modulesReady = true;
      console.log('[Admin] ✅ Módulos já disponíveis');
      return true;
    }

    // Se já foram marcados como carregados
    if (window.firebaseModulesLoaded) {
      console.log('[Admin] Flag firebaseModulesLoaded detectada, aguardando...');
      await new Promise(r => setTimeout(r, 500));
      if (window.UserManagement && window.AuditService) {
        this.modulesReady = true;
        console.log('[Admin] ✅ Módulos carregados após flag');
        return true;
      }
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      let resolved = false;

      const checkModules = () => {
        if (resolved) return;

        if (window.UserManagement && window.AuditService) {
          resolved = true;
          this.modulesReady = true;
          console.log('[Admin] ✅ Módulos Firebase carregados após ' + (Date.now() - startTime) + 'ms');
          resolve(true);
          return;
        }

        if (Date.now() - startTime > timeout) {
          resolved = true;
          console.warn('[Admin] ⚠️ Timeout após ' + timeout + 'ms - módulos não carregados');
          console.log('[Admin] UserManagement:', !!window.UserManagement, '| AuditService:', !!window.AuditService);
          resolve(false);
          return;
        }

        setTimeout(checkModules, 200);
      };

      window.addEventListener('firebaseModulesReady', () => {
        console.log('[Admin] Evento firebaseModulesReady recebido');
        setTimeout(() => {
          if (!resolved && window.UserManagement && window.AuditService) {
            resolved = true;
            this.modulesReady = true;
            console.log('[Admin] ✅ Módulos carregados via evento');
            resolve(true);
          }
        }, 200);
      }, { once: true });

      checkModules();
    });
  },

  async render(container) {
    const isAdmin = localStorage.getItem('nep_is_admin') === 'true';

    if (!isAdmin) {
      container.innerHTML = `
        <div class="admin-denied animate-fade-in">
          <div class="admin-denied-icon">🔒</div>
          <h2>Acesso Restrito</h2>
          <p>Esta área é exclusiva para administradores.</p>
          <button class="btn btn-primary" onclick="NexusApp.navigate('dashboard')">Voltar ao Dashboard</button>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="admin-page animate-fade-in">
        <div class="admin-header">
          <div>
            <h1 class="page-title">Painel Administrativo</h1>
            <p class="page-description">Gerenciamento completo do sistema</p>
          </div>
          <div class="admin-header-badge"><i class="fa-solid fa-shield-halved"></i> ADMIN</div>
        </div>
        <div class="admin-tabs">
          <button class="admin-tab ${this.activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
            <i class="fa-solid fa-chart-line"></i> Dashboard
          </button>
          <button class="admin-tab ${this.activeTab === 'analytics' ? 'active' : ''}" data-tab="analytics">
            <i class="fa-solid fa-chart-mixed"></i> Analytics Avançado
          </button>
          <button class="admin-tab ${this.activeTab === 'users' ? 'active' : ''}" data-tab="users">
            <i class="fa-solid fa-users-gear"></i> Usuários
          </button>
          <button class="admin-tab ${this.activeTab === 'permissions' ? 'active' : ''}" data-tab="permissions">
            <i class="fa-solid fa-lock"></i> Permissões
          </button>
          <button class="admin-tab ${this.activeTab === 'audit' ? 'active' : ''}" data-tab="audit">
            <i class="fa-solid fa-clipboard-list"></i> Auditoria
          </button>
          <button class="admin-tab ${this.activeTab === 'tools' ? 'active' : ''}" data-tab="tools">
            <i class="fa-solid fa-toolbox"></i> Ferramentas
          </button>
          <button class="admin-tab ${this.activeTab === 'statuspage' ? 'active' : ''}" data-tab="statuspage">
            <i class="fa-solid fa-satellite-dish"></i> Status Page
          </button>
          <button class="admin-tab ${this.activeTab === 'backlog' ? 'active' : ''}" data-tab="backlog">
            <i class="fa-solid fa-inbox"></i> Backlog
          </button>
          <button class="admin-tab ${this.activeTab === 'logos' ? 'active' : ''}" data-tab="logos">
            <i class="fa-solid fa-building"></i> Logos
          </button>
          <button class="admin-tab ${this.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
            <i class="fa-solid fa-cog"></i> Configurações
          </button>
        </div>
        <div class="admin-content" id="admin-tab-content">
          <div class="loading-spinner">
            <i class="fa-solid fa-circle-notch fa-spin"></i> 
            <span>Carregando dados do Firestore...</span>
          </div>
        </div>
      </div>`;

    this.attachTabEvents();

    // Aguardar módulos Firebase
    const modulesLoaded = await this.waitForModules(15000);

    if (!modulesLoaded) {
      document.getElementById('admin-tab-content').innerHTML = `
        <div class="admin-section">
          <div class="alert alert-warning" style="display: flex; align-items: center; gap: 12px; padding: 20px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; color: #f59e0b;">
            <i class="fa-solid fa-exclamation-triangle" style="font-size: 24px;"></i>
            <div>
              <strong>Erro de conexão com Firebase</strong><br>
              <span style="color: #94a3b8; font-size: 14px;">
                Os módulos do Firebase não foram carregados.
                <br>Pressione Ctrl+F5 para recarregar a página.
                <br>Verifique sua conexão com a internet.
              </span>
            </div>
          </div>
        </div>`;
      return;
    }

    await this.loadTabContent();
  },

  attachTabEvents() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', async () => {
        this.activeTab = tab.dataset.tab;
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        await this.loadTabContent();
      });
    });
  },

  async loadTabContent() {
    const container = document.getElementById('admin-tab-content');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando...</div>';

    try {
      switch (this.activeTab) {
        case 'dashboard': await this.renderAnalyticsDashboard(container); break;
        case 'analytics': await this.renderAdvancedAnalytics(container); break;
        case 'users': await this.renderUsersManagement(container); break;
        case 'permissions': await this.renderPermissionsTab(container); break;
        case 'audit': await this.renderAuditLogs(container); break;
        case 'seasons': this.renderSeasonsTab(container); break;
        case 'supabase': await this.renderSupabaseTab(container); break;
        case 'tools': await this.renderToolsManagementTab(container); break;
        case 'statuspage': await this.renderStatusPageTab(container); break;
        case 'backlog': await this.renderBacklogTab(container); break;
        case 'logos': await this.renderLogosManagement(container); break;
        case 'settings': this.renderSettingsTab(container); break;
      }
    } catch (error) {
      console.error('[Admin] Erro ao carregar conteúdo:', error);
      container.innerHTML = `
                <div class="admin-section">
                    <div class="alert alert-error" style="padding: 20px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; color: #ef4444;">
                        <strong>Erro ao carregar:</strong> ${error.message}
                    </div>
                </div>`;
    }
  },

  // =========================================
  // GESTÃO DE USUÁRIOS
  // =========================================

  /**
   * Candidatos a gestor direto para um cargo.
   * O sistema se retroalimenta: conforme usuários são cadastrados, os níveis
   * superiores passam a aparecer aqui automaticamente.
   * - Só usuários ATIVOS de nível hierárquico SUPERIOR ao cargo selecionado
   * - Se houver logos selecionadas, prioriza gestores da mesma logo
   *   (se nenhum compartilhar logo, mostra todos para não travar o cadastro)
   */
  getManagerCandidates(cargoKey, selectedLogos = [], excludeUid = null) {
    const roles = window.UserManagement?.ROLES || [];
    const levelOf = (key) => roles.find(r => r.key === key)?.level ?? -1;
    const myLevel = levelOf(cargoKey);
    if (myLevel < 0) return [];

    let candidates = (this.users || []).filter(u =>
      u.status === 'ATIVO' &&
      u.uid !== excludeUid &&
      levelOf(u.cargo) > myLevel
    );

    if (selectedLogos.length > 0) {
      const byLogo = candidates.filter(u => {
        const userLogos = Array.isArray(u.logos) ? u.logos : (u.setor ? [u.setor] : []);
        return userLogos.some(l => selectedLogos.includes(l));
      });
      if (byLogo.length > 0) candidates = byLogo;
    }

    // Nível mais próximo primeiro (ex.: p/ MONITOR vem COORDENADOR antes de GERENTE)
    return candidates.sort((a, b) =>
      (levelOf(a.cargo) - levelOf(b.cargo)) || (a.nome || '').localeCompare(b.nome || '')
    );
  },

  /**
   * Monta as <option> do select de gestor, agrupadas por cargo.
   * Pré-seleção inteligente: se no nível superior mais próximo existir
   * exatamente 1 pessoa (ex.: o único superintendente), ela já vem marcada.
   */
  renderManagerOptions(cargoKey, selectedLogos = [], currentGestorUid = null, excludeUid = null) {
    const roles = window.UserManagement?.ROLES || [];
    const labelOf = (key) => roles.find(r => r.key === key)?.label || key;
    const candidates = this.getManagerCandidates(cargoKey, selectedLogos, excludeUid);

    if (!cargoKey) {
      return '<option value="">Selecione primeiro o cargo...</option>';
    }
    if (candidates.length === 0) {
      return '<option value="">Nenhum gestor cadastrado ainda (opcional)</option>';
    }

    // Pré-seleção: único candidato do nível superior mais próximo
    let autoUid = null;
    if (!currentGestorUid) {
      const closestCargo = candidates[0].cargo;
      const closest = candidates.filter(c => c.cargo === closestCargo);
      if (closest.length === 1) autoUid = closest[0].uid;
    }
    const selectedUid = currentGestorUid || autoUid;

    // Agrupar por cargo preservando a ordem (nível mais próximo primeiro)
    const groups = [];
    candidates.forEach(c => {
      let group = groups.find(g => g.cargo === c.cargo);
      if (!group) { group = { cargo: c.cargo, items: [] }; groups.push(group); }
      group.items.push(c);
    });

    return '<option value="">Sem gestor definido</option>' + groups.map(g => `
      <optgroup label="${labelOf(g.cargo)}">
        ${g.items.map(c => `
          <option value="${c.uid}" data-nome="${(c.nome || '').replace(/"/g, '&quot;')}"
            ${c.uid === selectedUid ? 'selected' : ''}>${c.nome || c.email}</option>
        `).join('')}
      </optgroup>
    `).join('');
  },

  /**
   * Liga o select de gestor ao cargo e às logos do modal:
   * qualquer mudança recalcula os candidatos na hora.
   */
  _bindManagerField(prefix, currentGestorUid = null, excludeUid = null) {
    const cargoSelect = document.getElementById(`${prefix}-role`);
    const managerSelect = document.getElementById(`${prefix}-gestor`);
    if (!cargoSelect || !managerSelect) return;

    const refresh = () => {
      const selectedLogos = [];
      document.querySelectorAll(`#${prefix}-logos-container input[type="checkbox"]:checked`)
        .forEach(cb => selectedLogos.push(cb.value));
      managerSelect.innerHTML = this.renderManagerOptions(
        cargoSelect.value, selectedLogos, currentGestorUid, excludeUid
      );
      // Depois da primeira troca manual, a pré-seleção automática não força mais nada
      currentGestorUid = managerSelect.value || null;
    };

    cargoSelect.addEventListener('change', () => { currentGestorUid = null; refresh(); });
    managerSelect.addEventListener('change', () => { currentGestorUid = managerSelect.value || null; });
    document.getElementById(`${prefix}-logos-container`)?.addEventListener('change', refresh);
    refresh();
  },

  async renderUsersManagement(container) {
    try {
      this.users = await window.UserManagement.listUsers();
    } catch (e) {
      console.error('[Admin] Erro ao carregar usuários:', e);
      container.innerHTML = `
        <div class="admin-section">
          <div class="alert alert-error" style="padding: 20px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; color: #ef4444;">
            <strong>Erro ao carregar usuários:</strong> ${e.message}
          </div>
        </div>`;
      return;
    }

    const activeUsers = this.users.filter(u => u.status === 'ATIVO').length;
    const roles = window.UserManagement?.ROLES || [
      { key: 'ADMIN', label: 'Administrador' },
      { key: 'SUPERINTENDENTE', label: 'Superintendente' },
      { key: 'GERENTE', label: 'Gerente' },
      { key: 'CONSULTOR', label: 'Consultor' },
      { key: 'COORDENADOR', label: 'Coordenador' },
      { key: 'ANALISTA', label: 'Analista' },
      { key: 'MONITOR', label: 'Monitor' }
    ];

    container.innerHTML = `
                <div class="admin-section-header">
                    <div class="admin-section-left">
                        <h3><i class="fa-solid fa-users-gear"></i> Gestão de Usuários</h3>
                        <span class="admin-stat-badge">${activeUsers} ativos de ${this.users.length} total</span>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-secondary" id="btn-export-users">
                            <i class="fa-solid fa-file-excel"></i> Exportar Excel
                        </button>
                        <button class="btn btn-primary" id="btn-create-user">
                            <i class="fa-solid fa-user-plus"></i> Novo Usuário
                        </button>
                    </div>
                </div>

                <div class="admin-filters">
                    <div class="admin-search">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" id="user-search" placeholder="Buscar por nome ou email...">
                    </div>
                    <select id="filter-status" class="form-select">
                        <option value="all">Todos os Status</option>
                        <option value="ATIVO">Ativos</option>
                        <option value="INATIVO">Inativos</option>
                    </select>
                    <select id="filter-role" class="form-select">
                        <option value="all">Todos os Cargos</option>
                        ${roles.map(r => `<option value="${r.key}">${r.label}</option>`).join('')}
                    </select>
                </div>

                <div class="admin-table-container">
                    <table class="admin-table" id="users-table">
                        <thead>
                            <tr>
                                <th>Usuário</th>
                                <th>Cargo</th>
                                <th>Gestor</th>
                                <th>Logos</th>
                                <th>Status</th>
                                <th>Primeiro Acesso</th>
                                <th>Último Login</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>${this.renderUsersRows(this.users)}</tbody>
                    </table>
                </div>
            </div>`;

    this.attachUserEvents();
  },

  renderUsersRows(users) {
    if (!users || !users.length) {
      return '<tr><td colspan="8" class="text-center text-muted" style="padding: 40px;">Nenhum usuário encontrado</td></tr>';
    }

    return users.map(user => `
            <tr data-uid="${user.uid}">
                <td>
                    <div class="admin-user-cell">
                        <div class="avatar avatar-sm" style="background: ${this.getAvatarGradient(user.uid)}">${user.initials || '??'}</div>
                        <div>
                            <div class="admin-user-name">${user.nome || 'Sem nome'}</div>
                            <div class="admin-user-email">${user.email || 'sem email'}</div>
                        </div>
                    </div>
                </td>
                <td><span class="role-badge role-${(user.cargo || 'usuario').toLowerCase()}">${user.cargo || 'N/A'}</span></td>
                <td><span class="text-muted" style="font-size: 13px;">${user.gestor_nome || '—'}</span></td>
                <td>${this._renderUserLogoBadges(user)}</td>
                <td><span class="status-badge status-${(user.status || 'inativo').toLowerCase()}">${user.status || 'N/A'}</span></td>
                <td>${user.primeiro_acesso ? '<span class="badge-warning">Pendente</span>' : '<span class="badge-success">Concluído</span>'}</td>
                <td><span class="text-muted">${user.ultimo_login || 'Nunca'}</span></td>
                <td>
                    <div class="admin-actions">
                        <button class="admin-action-btn" title="Editar" data-action="edit" data-uid="${user.uid}">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="admin-action-btn" title="${user.status === 'ATIVO' ? 'Desativar' : 'Ativar'}" 
                            data-action="toggle-status" data-uid="${user.uid}" data-status="${user.status}">
                            <i class="fa-solid fa-${user.status === 'ATIVO' ? 'ban' : 'check'}"></i>
                        </button>
                        <button class="admin-action-btn danger" title="Excluir" data-action="delete" data-uid="${user.uid}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
  },

  attachUserEvents() {
    document.getElementById('btn-create-user')?.addEventListener('click', () => this.showCreateUserModal());
    document.getElementById('btn-export-users')?.addEventListener('click', () => this.exportUsersToExcel()); // Export Listener

    document.getElementById('user-search')?.addEventListener('input', () => this.filterUsers());
    document.getElementById('filter-status')?.addEventListener('change', () => this.filterUsers());
    document.getElementById('filter-role')?.addEventListener('change', () => this.filterUsers());

    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => this.handleUserAction(btn.dataset.action, btn.dataset.uid, btn.dataset));
    });
  },

  filterUsers() {
    const search = (document.getElementById('user-search')?.value || '').toLowerCase();
    const status = document.getElementById('filter-status')?.value || 'all';
    const role = document.getElementById('filter-role')?.value || 'all';

    const filtered = this.users.filter(u => {
      const matchSearch = (u.nome || '').toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search);
      const matchStatus = status === 'all' || u.status === status;
      const matchRole = role === 'all' || u.cargo === role;
      return matchSearch && matchStatus && matchRole;
    });

    const tbody = document.querySelector('#users-table tbody');
    if (tbody) {
      tbody.innerHTML = this.renderUsersRows(filtered);
      document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => this.handleUserAction(btn.dataset.action, btn.dataset.uid, btn.dataset));
      });
    }
  },

  async handleUserAction(action, uid, data) {
    const user = this.users.find(u => u.uid === uid);
    if (!user && action !== 'create') return;

    switch (action) {
      case 'edit':
        this.showEditUserModal(user);
        break;
      case 'toggle-status':
        if (confirm(`Deseja ${data.status === 'ATIVO' ? 'desativar' : 'ativar'} este usuário?`)) {
          try {
            if (data.status === 'ATIVO') {
              await window.UserManagement.deactivateUser(uid);
            } else {
              await window.UserManagement.activateUser(uid);
            }
            if (typeof NexusApp !== 'undefined') NexusApp.showToast('Status atualizado!', 'success');
            await this.loadTabContent();
          } catch (e) {
            if (typeof NexusApp !== 'undefined') NexusApp.showToast(e.message, 'error');
            else alert(e.message);
          }
        }
        break;
      case 'delete':
        if (confirm(`Tem certeza que deseja excluir "${user?.nome}"? Esta ação não pode ser desfeita.`)) {
          try {
            await window.UserManagement.deleteUser(uid, false);
            if (typeof NexusApp !== 'undefined') NexusApp.showToast('Usuário excluído!', 'success');
            await this.loadTabContent();
          } catch (e) {
            if (typeof NexusApp !== 'undefined') NexusApp.showToast(e.message, 'error');
            else alert(e.message);
          }
        }
        break;
    }
  },

  showCreateUserModal() {
    const roles = window.UserManagement?.ROLES || [
      { key: 'ADMIN', label: 'Administrador' },
      { key: 'SUPERINTENDENTE', label: 'Superintendente' },
      { key: 'GERENTE', label: 'Gerente' },
      { key: 'CONSULTOR', label: 'Consultor' },
      { key: 'COORDENADOR', label: 'Coordenador' },
      { key: 'ANALISTA', label: 'Analista' },
      { key: 'MONITOR', label: 'Monitor' }
    ];

    // Remover modal existente se houver
    document.getElementById('create-user-modal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'create-user-modal';
    modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3><i class="fa-solid fa-user-plus"></i> Criar Novo Usuário</h3>
                    <button class="modal-close" onclick="document.getElementById('create-user-modal').remove()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Nome Completo *</label>
                        <input type="text" id="new-user-name" class="form-input" placeholder="Ex: João Silva">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email *</label>
                        <input type="email" id="new-user-email" class="form-input" placeholder="email@empresa.com">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cargo *</label>
                        <select id="new-user-role" class="form-input">
                            <option value="">Selecione o cargo...</option>
                            ${roles.map(r => `<option value="${r.key}">${r.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Logos Iniciais (Multi-tenancy)</label>
                        <div id="new-user-logos-container" style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0">Carregando logos...</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Gestor Direto</label>
                        <select id="new-user-gestor" class="form-input">
                            <option value="">Selecione primeiro o cargo...</option>
                        </select>
                        <small style="color: var(--text-tertiary); font-size: 12px; display: block; margin-top: 6px;">
                            Sugerido automaticamente pelo cargo e pela logo — ajuste se precisar.
                        </small>
                    </div>
                    <div class="alert alert-info">
                        <i class="fa-solid fa-info-circle"></i>
                        <span>Senha padrão: <strong>NEP2025@Temp</strong><br>O usuário deverá trocar no primeiro acesso.</span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('create-user-modal').remove()">Cancelar</button>
                    <button class="btn btn-primary" id="btn-confirm-create"><i class="fa-solid fa-check"></i> Criar Usuário</button>
                </div>
            </div>`;

    document.body.appendChild(modal);

    // Carregar os mesmos checkboxes para o modal de criação
    if (this._populateLogoCheckboxesForNewUser) {
      this._populateLogoCheckboxesForNewUser();
    } else {
      NexusAdmin._populateLogoCheckboxesForNewUser = async function () {
        const container = document.getElementById('new-user-logos-container');
        if (!container) return;
        try {
          const allLogos = window.LogoService ? await window.LogoService.listLogos() : [];
          if (allLogos.length === 0) {
            container.innerHTML = '<span class="text-muted" style="font-size:13px">Nenhuma logo cadastrada no sistema. Crie logos na aba correspondente.</span>';
            return;
          }
          container.innerHTML = allLogos.map(logo => {
            const color = logo.color || '#6366f1';
            return `
                        <label class="logo-checkbox-label" style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--surface-card);border:1px solid var(--surface-border);border-radius:8px;cursor:pointer;font-size:12px;transition:all .2s"
                               onchange="this.style.borderColor = this.querySelector('input').checked ? '${color}' : 'var(--surface-border)'">
                            <input type="checkbox" value="${logo.name}" style="accent-color:${color}">
                            <span style="color:${color};font-weight:600">${logo.name}</span>
                        </label>`;
          }).join('');
        } catch (e) {
          container.innerHTML = '<span class="text-muted">Erro ao carregar logos</span>';
        }
      };
      this._populateLogoCheckboxesForNewUser();
    }

    // Select de gestor reage ao cargo e às logos escolhidas
    this._bindManagerField('new-user');

    document.getElementById('btn-confirm-create').addEventListener('click', async () => {
      const nome = document.getElementById('new-user-name').value.trim();
      const email = document.getElementById('new-user-email').value.trim();
      const cargo = document.getElementById('new-user-role').value;

      if (!nome || !email || !cargo) {
        if (typeof NexusApp !== 'undefined') NexusApp.showToast('Preencha todos os campos', 'error');
        else alert('Preencha todos os campos');
        return;
      }

      try {
        document.getElementById('btn-confirm-create').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando...';
        document.getElementById('btn-confirm-create').disabled = true;

        // Coletar logos selecionados
        const selectedLogos = [];
        document.querySelectorAll('#new-user-logos-container input[type="checkbox"]:checked').forEach(cb => {
          selectedLogos.push(cb.value);
        });

        // Gestor direto selecionado
        const gestorSelect = document.getElementById('new-user-gestor');
        const gestorUid = gestorSelect?.value || '';
        const gestorNome = gestorSelect?.selectedOptions?.[0]?.dataset?.nome || '';

        await window.UserManagement.createUser(nome, email, cargo, {
          logos: selectedLogos,
          gestor_uid: gestorUid,
          gestor_nome: gestorNome
        });

        if (typeof NexusApp !== 'undefined') NexusApp.showToast('Usuário criado com sucesso!', 'success');
        modal.remove();
        await this.loadTabContent();
      } catch (e) {
        if (typeof NexusApp !== 'undefined') NexusApp.showToast(e.message, 'error');
        else alert(e.message);
        document.getElementById('btn-confirm-create').innerHTML = '<i class="fa-solid fa-check"></i> Criar Usuário';
        document.getElementById('btn-confirm-create').disabled = false;
      }
    });
  },

  showEditUserModal(user) {
    if (!user) return;

    const roles = window.UserManagement?.ROLES || [
      { key: 'ADMIN', label: 'Administrador' },
      { key: 'SUPERINTENDENTE', label: 'Superintendente' },
      { key: 'GERENTE', label: 'Gerente' },
      { key: 'CONSULTOR', label: 'Consultor' },
      { key: 'COORDENADOR', label: 'Coordenador' },
      { key: 'ANALISTA', label: 'Analista' },
      { key: 'MONITOR', label: 'Monitor' }
    ];

    // Remover modal existente se houver
    document.getElementById('edit-user-modal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'edit-user-modal';
    modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3><i class="fa-solid fa-user-edit"></i> Editar Usuário</h3>
                    <button class="modal-close" onclick="document.getElementById('edit-user-modal').remove()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Nome</label>
                        <input type="text" id="edit-user-name" class="form-input" value="${user.nome || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" id="edit-user-email" class="form-input" value="${user.email || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cargo</label>
                        <select id="edit-user-role" class="form-input">
                            ${roles.map(r => `<option value="${r.key}" ${user.cargo === r.key ? 'selected' : ''}>${r.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select id="edit-user-status" class="form-input">
                            <option value="ATIVO" ${user.status === 'ATIVO' ? 'selected' : ''}>Ativo</option>
                            <option value="INATIVO" ${user.status === 'INATIVO' ? 'selected' : ''}>Inativo</option>
                            <option value="PENDENTE" ${user.status === 'PENDENTE' ? 'selected' : ''}>Pendente</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Logos</label>
                        <div id="edit-user-logos-container" style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 0">Carregando logos...</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Gestor Direto</label>
                        <select id="edit-user-gestor" class="form-input">
                            <option value="">Carregando...</option>
                        </select>
                        <small style="color: var(--text-tertiary); font-size: 12px; display: block; margin-top: 6px;">
                            Apenas usuários ativos de nível superior ao cargo aparecem aqui.
                        </small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('edit-user-modal').remove()">Cancelar</button>
                    <button class="btn btn-primary" id="btn-confirm-edit"><i class="fa-solid fa-save"></i> Salvar</button>
                </div>
            </div>`;

    document.body.appendChild(modal);

    // Carregar logos disponíveis e preencher checkboxes
    this._populateLogoCheckboxes(user);

    // Select de gestor: pré-preenchido com o gestor atual, sem sugerir outro
    // automaticamente, e sem permitir que a pessoa seja gestora de si mesma
    this._bindManagerField('edit-user', user.gestor_uid || null, user.uid);

    document.getElementById('btn-confirm-edit').addEventListener('click', async () => {
      const nome = document.getElementById('edit-user-name').value.trim();
      const email = document.getElementById('edit-user-email').value.trim();
      const cargo = document.getElementById('edit-user-role').value;
      const status = document.getElementById('edit-user-status').value;

      // Coletar logos selecionados
      const selectedLogos = [];
      document.querySelectorAll('#edit-user-logos-container input[type="checkbox"]:checked').forEach(cb => {
        selectedLogos.push(cb.value);
      });

      try {
        document.getElementById('btn-confirm-edit').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        document.getElementById('btn-confirm-edit').disabled = true;

        if (nome !== user.nome) await window.UserManagement.updateUserName(user.uid, nome);
        if (email !== user.email) await window.UserManagement.updateUserEmail(user.uid, email);
        if (cargo !== user.cargo) await window.UserManagement.updateUserRole(user.uid, cargo);

        // Atualizar Status e Logos diretamente no Firestore
        const updates = {};
        if (status !== user.status) updates.status = status;

        // Gestor direto
        const gestorSelect = document.getElementById('edit-user-gestor');
        const newGestorUid = gestorSelect?.value || '';
        if (newGestorUid !== (user.gestor_uid || '')) {
          updates.gestor_uid = newGestorUid;
          updates.gestor_nome = gestorSelect?.selectedOptions?.[0]?.dataset?.nome || '';
        }

        // Atualizar logos
        const oldLogos = Array.isArray(user.logos) ? user.logos : (user.setor ? [user.setor] : []);
        const logosChanged = JSON.stringify(selectedLogos.sort()) !== JSON.stringify(oldLogos.sort());
        if (logosChanged) {
          updates.logos = selectedLogos;
          updates.setor = selectedLogos[0] || ''; // Manter compatibilidade
        }

        if (Object.keys(updates).length > 0) {
          const db = firebase.firestore();
          await db.collection('users').doc(user.uid).update(updates);
        }

        if (typeof NexusApp !== 'undefined') NexusApp.showToast('Usuário atualizado!', 'success');
        modal.remove();
        await this.loadTabContent();
      } catch (e) {
        if (typeof NexusApp !== 'undefined') NexusApp.showToast(e.message, 'error');
        else alert(e.message);
        document.getElementById('btn-confirm-edit').innerHTML = '<i class="fa-solid fa-save"></i> Salvar';
        document.getElementById('btn-confirm-edit').disabled = false;
      }
    });
  },

  // =========================================
  // AUDITORIA
  // =========================================
  async renderAuditLogs(container) {
    try {
      this.auditLogs = await window.AuditService.getRecentLogs(100);
    } catch (e) {
      console.error('[Admin] Erro ao carregar logs:', e);
      container.innerHTML = `
        <div class="admin-section">
          <div class="alert alert-error" style="padding: 20px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; color: #ef4444;">
            <strong>Erro ao carregar logs:</strong> ${e.message}
          </div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="admin-section">
        <div class="admin-section-header">
          <h3><i class="fa-solid fa-clipboard-list"></i> Logs de Auditoria</h3>
          <div style="display:flex; gap:10px; align-items:center;">
             <span class="admin-stat-badge">${this.auditLogs.length} registros</span>
             <button class="btn btn-sm btn-secondary" onclick="NexusAdmin.exportAuditLogs()"><i class="fa-solid fa-download"></i> Exportar CSV</button>
          </div>
        </div>
        <div class="admin-table-container">
          <table class="admin-table">
            <thead>
              <tr><th>Data/Hora</th><th>Ação</th><th>Executor</th><th>Detalhes</th></tr>
            </thead>
            <tbody>
              ${this.auditLogs.length ? this.auditLogs.map(log => `
                <tr>
                  <td><span class="text-muted">${log.timestamp || log.data || 'N/A'}</span></td>
                  <td><span class="audit-action">${log.acao || 'N/A'}</span></td>
                  <td>${log.executor_email || log.executor_nome || 'N/A'}</td>
                  <td><span class="text-muted">${log.detalhe || log.descricao || '-'}</span></td>
                </tr>
              `).join('') : '<tr><td colspan="4" class="text-center" style="padding: 40px; color: #64748b;">Nenhum log encontrado</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`
  },

  exportUsersToExcel() {
    if (!this.users || !this.users.length) {
      if (typeof NexusApp !== 'undefined') NexusApp.showToast('Sem usuários para exportar', 'warning');
      return;
    }

    const data = this.users.map(u => ({
      'Nome': u.nome || '',
      'Email': u.email || '',
      'Status': u.status || 'INATIVO',
      'Produto': u.produto || u.setor || '',
      'Cargo': u.cargo || '',
      'Último Acesso': u.ultimo_login || 'Nunca'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuários");
    XLSX.writeFile(wb, `usuarios_sistema_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  exportAuditLogs() {
    if (!this.auditLogs || !this.auditLogs.length) {
      NexusApp.showToast('Sem logs para exportar', 'warning');
      return;
    }
    let csv = 'Data,Ação,Executor,Detalhes\n';
    this.auditLogs.forEach(l => {
      csv += `"${l.timestamp || ''}","${l.acao || ''}","${l.executor_nome || ''}","${(l.detalhe || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  // =========================================
  // AUDITORIA DE PONTOS (Excel)
  // =========================================
  async exportPointsAudit() {
    const db = window.db;
    if (!db) { alert('Banco de dados não disponível'); return; }

    const btn = document.getElementById('btn-audit-points');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando auditoria...';
    }

    try {
      // 1) Buscar todos os usuários
      const usersSnap = await db.collection('users').get();
      const usersMap = {};
      usersSnap.forEach(doc => {
        const d = doc.data();
        usersMap[doc.id] = { name: d.nome || d.name || 'Sem nome', email: d.email || '' };
      });

      // 2) Buscar todos os saldos de pontos
      const pointsSnap = await db.collection('user_points').get();
      const pointsMap = {};
      pointsSnap.forEach(doc => {
        const d = doc.data();
        pointsMap[doc.id] = { total: d.total_points || 0, level: d.level || 1, name: d.name || '' };
      });

      // 3) Buscar TODAS as transações
      const txSnap = await db.collection('points_transactions').orderBy('timestamp', 'desc').get();
      const transactions = [];
      txSnap.forEach(doc => {
        const d = doc.data();
        const pts = Number(d.amount || d.points || 0) || 0;
        const type = d.type || d.action_type || 'OUTRO';
        const label = d.action_label || d.description || type;
        let dateStr = '';
        if (d.timestamp?.toDate) {
          dateStr = d.timestamp.toDate().toLocaleString('pt-BR');
        } else if (d.created_at?.toDate) {
          dateStr = d.created_at.toDate().toLocaleString('pt-BR');
        }

        transactions.push({
          uid: d.uid,
          userName: usersMap[d.uid]?.name || pointsMap[d.uid]?.name || d.uid,
          email: usersMap[d.uid]?.email || '',
          type,
          label,
          points: pts,
          date: dateStr,
          metadata: d.metadata ? JSON.stringify(d.metadata) : ''
        });
      });

      // 4) Gerar aba "Resumo" (1 linha por usuário)
      const EXCLUDED_TYPES = ['PODCAST_EPISODE', 'QUIZ_PASSED'];
      const TYPE_LABELS = {
        'COMPLETE_TASK': 'Kanban', 'TASK_COMPLETED': 'Kanban', 'TASK_VALIDATED': 'Kanban', 'CreateTask': 'Kanban', 'TASK_CREATED': 'Kanban',
        'SEND_TESTIMONIAL': 'Social', 'RECEIVE_TESTIMONIAL': 'Social',
        'FORUM_POST': 'Fórum', 'FORUM_TOPIC': 'Fórum', 'FORUM_REPLY': 'Fórum', 'FORUM_SOLUTION': 'Fórum',
        'ROUTINE_COMPLETED': 'Rotina ADM', 'REPORT_SENT': 'Relatórios',
        'TICKET_CREATED': 'Chamados', 'TICKET_RESOLVED': 'Chamados',
        'MODULE_COMPLETED': 'Cursos', 'COURSE_COMPLETED': 'Cursos',
        'DAILY_LOGIN': 'Login Diário', 'ACHIEVEMENT': 'Conquista'
      };

      // Group transactions by user (excluindo Podcast)
      const userTx = {};
      transactions.forEach(t => {
        if (EXCLUDED_TYPES.includes(t.type)) return; // Ignorar transações de Podcast
        if (!userTx[t.uid]) userTx[t.uid] = [];
        userTx[t.uid].push(t);
      });

      // Build summary data
      const summaryData = [];
      const allUids = new Set([...Object.keys(pointsMap), ...Object.keys(userTx)]);
      for (const uid of allUids) {
        const user = usersMap[uid] || { name: pointsMap[uid]?.name || uid, email: '' };
        const totalPts = pointsMap[uid]?.total || 0;
        const level = pointsMap[uid]?.level || 1;
        const txList = userTx[uid] || [];

        // Count by category
        const byCategory = {};
        let somaTransacoes = 0;
        txList.forEach(t => {
          const cat = TYPE_LABELS[t.type] || 'Outros';
          byCategory[cat] = (byCategory[cat] || 0) + t.points;
          somaTransacoes += t.points;
        });

        const diferenca = totalPts - somaTransacoes;

        summaryData.push({
          'Usuário': user.name,
          'Email': user.email,
          'Pontos Total (Firestore)': totalPts,
          'Soma Transações': somaTransacoes,
          'Diferença': diferenca,
          'Status': diferenca === 0 ? '✅ OK' : '⚠️ DIVERGENTE',
          'Nível': level,
          'Kanban': byCategory['Kanban'] || 0,
          'Social': byCategory['Social'] || 0,
          'Fórum': byCategory['Fórum'] || 0,
          'Chamados': byCategory['Chamados'] || 0,
          'Cursos': byCategory['Cursos'] || 0,
          'Conquista': byCategory['Conquista'] || 0,
          'Rotina ADM': byCategory['Rotina ADM'] || 0,
          'Relatórios': byCategory['Relatórios'] || 0,
          'Outros': byCategory['Outros'] || 0,
          'Transações': txList.length
        });
      }

      // Sort by total points descending
      summaryData.sort((a, b) => b['Pontos Total (Firestore)'] - a['Pontos Total (Firestore)']);

      // 5) Gerar aba "Transações" (excluindo Podcast)
      const detailData = transactions
        .filter(t => !EXCLUDED_TYPES.includes(t.type))
        .map(t => ({
          'Usuário': t.userName,
          'Email': t.email,
          'Tipo': TYPE_LABELS[t.type] || t.type,
          'Descrição': t.label,
          'Pontos': t.points,
          'Data': t.date,
          'Detalhes': t.metadata
        }));

      // 6) Gerar Excel com 2 abas
      const wb = XLSX.utils.book_new();
      const wsResumo = XLSX.utils.json_to_sheet(summaryData);
      const wsDetalhes = XLSX.utils.json_to_sheet(detailData);

      // Ajustar largura das colunas
      wsResumo['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
      wsDetalhes['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 30 }];

      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
      XLSX.utils.book_append_sheet(wb, wsDetalhes, 'Transações');

      const fileName = `auditoria_pontos_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      if (window.NepApp?.showToast) {
        NepApp.showToast(`✅ Auditoria exportada: ${summaryData.length} usuários, ${transactions.length} transações`, 'success');
      }

      console.log(`[Admin] Auditoria exportada: ${summaryData.length} usuários, ${transactions.length} transações`);

    } catch (e) {
      console.error('[Admin] Erro ao exportar auditoria:', e);
      alert('Erro ao gerar auditoria: ' + e.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-file-excel"></i> Exportar Auditoria de Pontos';
      }
    }
  },

  // =========================================
  // DASHBOARD ANALYTICS 360°
  // =========================================
  async renderAnalyticsDashboard(container) {
    try {
      const db = firebase.firestore();
      const sb = window.sb || window.SupabaseClient?.client;

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last12h = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      // Carregamento paralelo massivo para o BI 360 (ORQUESTRAÇÃO V2)
      const [
        stats,
        tasksSnap,
        vacationsSnap,
        usersSnap,
        okrSnap,
        ticketsSnap,
        analyticsSnap,
        pointsSnap,
        auditSnap
      ] = await Promise.all([
        window.AnalyticsService?.getOverallStats() || {},
        db.collection('tasks').get(),
        db.collection('vacations').get(),
        db.collection('users').where('status', '==', 'PENDENTE').get(),
        db.collection('deliveries').get(),
        db.collection('tickets').get(),
        db.collection('user_analytics').where('timestamp', '>', last7d).get(),
        db.collection('points').orderBy('total_points', 'desc').limit(5).get(),
        db.collection('audit_logs').where('timestamp', '>', last12h).get()
      ]);

      const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const vacations = vacationsSnap.docs.map(d => d.data());
      const pendingUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const deliveries = okrSnap.docs.map(d => d.data());
      const tickets = ticketsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const analytics = analyticsSnap.docs.map(d => d.data());
      const ranking = pointsSnap.docs.map(d => d.data());
      const recentAudit = auditSnap.docs.map(d => d.data());

      // --- CÁLCULOS V2 ---

      // 1. Engajamento (Usuários Ativos)
      const uids24h = new Set(analytics.filter(a => a.timestamp?.toDate() > last24h).map(a => a.uid)).size;
      const uids7d = new Set(analytics.map(a => a.uid)).size;

      // 2. Operacional (Kanban & Tickets)
      const activeTasks = tasks.filter(t => t.status !== 'Concluído' && t.status !== 'Arquivado').length;
      const throughput7d = tasks.filter(t => t.status === 'Concluído' && t.updated_at?.toDate() > last7d).length;
      const blindSpots = tasks.filter(t => t.status !== 'Concluído' && t.updated_at?.toDate() < new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)).length;
      const openTickets = tickets.filter(t => t.status === 'new' || t.status === 'in_progress').length;

      // 3. RH (Time Off Hoje)
      const todayStr = now.toISOString().split('T')[0];
      const teamOffToday = vacations.filter(v =>
        v.status === 'aprovado' &&
        v.startDate <= todayStr &&
        v.endDate >= todayStr
      );

      // 4. OKR & IA
      const avgScore = deliveries.filter(d => d.finalScore).reduce((acc, d) => acc + parseFloat(d.finalScore), 0) / (deliveries.filter(d => d.finalScore).length || 1);
      const aiConsultas = stats.recentActivity?.filter(a => a.event_type === 'IA_CONSULTA').length || 0;

      const moduleRanking = Object.entries(stats.moduleViews || {})
        .map(([module, count]) => ({ module, count }))
        .sort((a, b) => b.count - a.count);

      const maxCount = moduleRanking.length > 0 ? moduleRanking[0].count : 1;

      const moduleLabels = {
        dashboard: '🏠 Dashboard', kanban: '📋 Kanban', calendar: '📅 Agendas',
        forum: '💬 Fórum', announcements: '📢 Avisos', podcast: '🎧 Podcast',
        courses: '📚 Cursos', scoring: '🏆 Ranking', tools: '🛠️ Ferramentas',
        reports: '📊 Relatórios', profile: '👤 Perfil', estagiario: '🤖 Estagiário',
        admin: '⚙️ Admin'
      };

      container.innerHTML = `
        <div class="admin-section">
          <div class="admin-section-header">
            <div>
              <h3 style="margin-bottom: 4px;"><i class="fa-solid fa-gauge-high"></i> Central de Comando NEP <span style="font-size: 10px; vertical-align: middle; background: #6366f1; padding: 2px 6px; border-radius: 4px;">V2 BETA</span></h3>
              <p style="font-size: 11px; color: var(--text-tertiary);">Visão Total de Operação, Engajamento e Risco</p>
            </div>
            <div style="display: flex; gap: 10px;">
              <span class="status-badge ${sb ? 'status-ativo' : 'status-inativo'}">
                <i class="fa-solid fa-database"></i> SQL ${sb ? 'OK' : 'OFF'}
              </span>
              <button class="btn btn-ghost" onclick="NexusAdmin.loadTabContent();">
                <i class="fa-solid fa-sync"></i> Refresh
              </button>
              <div class="setting-item">
                <label>Resetar Kanban</label>
                <button id="btn-reset-kanban" class="btn btn-sm btn-outline-danger" onclick="NexusAdmin.resetKanban()">
                  <i class="fa-solid fa-bomb"></i> Reset Kanban
                </button>
              </div>
              <div class="setting-item">
                <label>Recalcular Ranking</label>
                <button id="btn-recalc-ranking" class="btn btn-sm btn-outline-warning" onclick="NexusAdmin.recalculateRanking()">
                  <i class="fa-solid fa-calculator"></i> Recalcular Ranking
                </button>
              </div>
            </div>
          </div>

          <!-- GRID DE KPIS DENSOS -->
          <div class="analytics-kpis" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 20px;">
            <div class="analytics-kpi highlight">
              <div class="analytics-kpi-value">${uids24h}</div>
              <div class="analytics-kpi-label">Ativos (24h)</div>
              <div style="font-size: 10px; opacity: 0.8;">Semanal: ${uids7d}</div>
            </div>
            <div class="analytics-kpi active">
              <div class="analytics-kpi-value">${activeTasks}</div>
              <div class="analytics-kpi-label">No Kanban</div>
              <div style="font-size: 10px; opacity: 0.8;">Fluxo 7d: +${throughput7d}</div>
            </div>
            <div class="analytics-kpi ${blindSpots > 0 ? 'warning' : ''}">
              <div class="analytics-kpi-value">${blindSpots}</div>
              <div class="analytics-kpi-label">Pontos Cegos</div>
              <div style="font-size: 10px; opacity: 0.8;">Sem move +3d</div>
            </div>
            <div class="analytics-kpi info">
              <div class="analytics-kpi-value">${openTickets}</div>
              <div class="analytics-kpi-label">Tickets</div>
              <div style="font-size: 10px; opacity: 0.8;">Suporte Ativo</div>
            </div>
            <div class="analytics-kpi success">
              <div class="analytics-kpi-value">${avgScore.toFixed(1)}</div>
              <div class="analytics-kpi-label">Score OKR</div>
              <div style="font-size: 10px; opacity: 0.8;">Média de Entregas</div>
            </div>
            <div class="analytics-kpi" style="border-color: #8b5cf6;">
              <div class="analytics-kpi-value">${aiConsultas}</div>
              <div class="analytics-kpi-label">IA Help</div>
              <div style="font-size: 10px; color: #a78bfa;">Insights Gerados</div>
            </div>
          </div>

          <div class="analytics-grid" style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
            <div class="analytics-main-col">
              <!-- Usuários Pendentes / Moderação -->
              ${pendingUsers.length > 0 ? `
                <div class="analytics-card" style="margin-bottom: 20px; border: 1px solid #f59e0b44; background: #f59e0b11;">
                  <h4 style="color: #f59e0b; margin-top:0;"><i class="fa-solid fa-shield-halved"></i> Moderação Necessária (${pendingUsers.length})</h4>
                  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 10px;">
                    ${pendingUsers.slice(0, 4).map(u => `
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--surface-card); border-radius: 8px; font-size: 12px;">
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;">${u.nome}</span>
                        <button class="btn btn-xs btn-primary" onclick="NexusAdmin.handleUserAction('edit', '${u.id}')">Ver</button>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Ranking de Atividade (Destaque Top 3) -->
              <div class="analytics-card">
                <h4><i class="fa-solid fa-trophy"></i> Elite da Semana (Ranking XP)</h4>
                <div style="display: flex; gap: 15px; margin-top: 15px; overflow-x: auto; padding-bottom: 10px;">
                  ${ranking.map((user, idx) => `
                    <div style="min-width: 140px; text-align: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 12px; position: relative;">
                      <div style="font-size: 20px; position: absolute; top: -5px; right: -5px;">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '✨'}</div>
                      <div style="width: 40px; height: 40px; background: var(--primary-500); border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                        ${(user.nome || 'U')[0]}
                      </div>
                      <div style="font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.nome || 'Usuário'}</div>
                      <div style="font-size: 11px; color: var(--primary-400);">${user.total_points || 0} XP</div>
                    </div>
                  `).join('') || '<p class="text-muted">Aguardando dados de gamificação...</p>'}
                </div>
              </div>

              <!-- Prazos Iminentes -->
              <div class="analytics-card" style="margin-top: 20px;">
                <h4><i class="fa-solid fa-calendar-day"></i> Próximos Deliverables</h4>
                <div class="analytics-activity">
                  ${tasks.filter(t => t.status !== 'Concluído' && t.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5).map(t => `
                    <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #ffffff05; font-size: 12px;">
                      <div>
                        <strong>${t.title}</strong>
                        <div style="font-size: 10px; color: var(--text-tertiary);">${t.assignee || 'Sem dono'}</div>
                      </div>
                      <div style="color: ${new Date(t.deadline) < now ? '#ef4444' : 'var(--text-tertiary)'}; font-weight: ${new Date(t.deadline) < now ? 'bold' : 'normal'}">
                        ${new Date(t.deadline).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  `).join('') || '<p class="text-muted text-center">Nenhum prazo mapeado.</p>'}
                </div>
              </div>
            </div>

            <div class="analytics-sidebar-col">
              <!-- Disponibilidade / Time Off -->
              <div class="analytics-card">
                <h4><i class="fa-solid fa-umbrella-beach"></i> Time Off Hoje</h4>
                <div style="margin-top: 10px;">
                  ${teamOffToday.map(v => `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px;">
                      <i class="fa-solid fa-circle" style="font-size: 6px; color: #10b981;"></i>
                      <span>${v.userName || 'Membro'}</span>
                      <span style="font-size: 10px; color: var(--text-tertiary); margin-left: auto;">${v.type || 'Férias'}</span>
                    </div>
                  `).join('') || '<p class="text-muted" style="font-size: 11px;">Todo o time disponível.</p>'}
                </div>
              </div>

              <!-- Alertas de Segurança (Audit) -->
              <div class="analytics-card" style="margin-top: 20px; border-top: 3px solid #ef444499;">
                <h4><i class="fa-solid fa-eye"></i> Audit Alert (12h)</h4>
                <div style="font-size: 11px; margin-top: 10px;">
                  ${recentAudit.length > 0 ? recentAudit.slice(0, 5).map(a => `
                    <div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #ffffff05;">
                      <div style="font-weight: 600; color: #ef4444;">${a.acao}</div>
                      <div style="color: var(--text-tertiary);">${a.executor_email || 'Sistema'}</div>
                    </div>
                  `).join('') : '<p class="text-muted" style="font-size: 11px;">Nenhuma anomalia detectada.</p>'}
                  ${recentAudit.length > 5 ? `<p style="text-align: center; color: var(--primary-400); cursor: pointer;" onclick="NexusAdmin.activeTab='audit'; NexusAdmin.loadTabContent();">Ver todos logs</p>` : ''}
                </div>
              </div>

              <!-- Heatmap de Acessos -->
              <div class="analytics-card" style="margin-top: 20px;">
                <h4><i class="fa-solid fa-chart-line"></i> Acessos p/ Módulo</h4>
                <div style="margin-top: 15px;">
                  ${moduleRanking.slice(0, 5).map(m => `
                    <div style="margin-bottom: 10px;">
                      <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
                        <span>${moduleLabels[m.module] || m.module}</span>
                        <span>${m.count}</span>
                      </div>
                      <div style="height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden;">
                        <div style="height: 100%; width: ${(m.count / maxCount) * 100}%; background: var(--primary-500);"></div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
          
          <div class="analytics-card" style="margin-top: 20px;">
              <h4 style="margin-bottom: 15px;"><i class="fa-solid fa-list-ul"></i> Transações em Tempo Real</h4>
              <div class="analytics-activity" style="max-height: 200px; overflow-y: auto;">
                  ${stats.recentActivity?.slice(0, 15).map(a => `
                      <div style="display: flex; align-items: center; gap: 10px; padding: 8px 5px; border-bottom: 1px solid #ffffff05; font-size: 12px;">
                          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${a.event_type?.includes('ERROR') ? '#ef4444' : '#6366f1'}"></div>
                          <span style="font-weight: 600;">${a.user_name || 'Alguém'}</span>
                          <span style="color: var(--text-tertiary);">${a.event_type}</span>
                          <span style="margin-left: auto; font-size: 10px; color: var(--text-tertiary);">${a.timestamp instanceof Date ? a.timestamp.toLocaleTimeString('pt-BR') : 'Agora'}</span>
                      </div>
                  `).join('') || '<p class="text-muted text-center">Aguardando eventos...</p>'}
              </div>
          </div>
        </div>`;
    } catch (error) {
      console.error('[Admin] Erro Crítico no Dashboard:', error);
      container.innerHTML = `
        <div class="admin-section">
          <div class="alert alert-error">Falha ao consolidar BI: ${error.message}</div>
        </div>`;
    }
  },

  // =========================================
  // PERMISSÕES (MIME)
  // =========================================
  async renderPermissionsTab(container) {
    try {
      const modules = await window.ModulePermissionService?.getModulesWithStatus() || [];
      const roles = window.ModulePermissionService?.ROLES || [];

      container.innerHTML = `
        <div class="admin-section">
          <div class="admin-section-header">
            <div>
              <h3><i class="fa-solid fa-lock"></i> Controle de Permissões (MIME)</h3>
              <p class="text-muted" style="margin-top: 4px; font-size: 13px;">Ative ou desative módulos por cargo</p>
            </div>
            <button class="btn btn-ghost" id="btn-sync-modules" title="Sincronizar novos módulos">
                <i class="fa-solid fa-sync"></i> Atualizar Lista
            </button>
          </div>

          <div class="permissions-list" id="permissions-list">
            ${modules.map(m => `
              <div class="permission-card ${m.disabled_for_all ? 'disabled' : ''}" data-module="${m.id}">
                <div class="permission-header">
                  <div class="permission-info">
                    <span class="permission-icon">${m.icon}</span>
                    <span class="permission-name">${m.name}</span>
                    <span class="permission-category">${m.category}</span>
                  </div>
                  <div class="permission-toggle">
                    <label class="toggle-switch">
                      <input type="checkbox" ${m.enabled && !m.disabled_for_all ? 'checked' : ''} 
                             data-module="${m.id}" data-action="toggle-module">
                      <span class="toggle-slider"></span>
                    </label>
                    <span class="toggle-status">${m.disabled_for_all ? 'DESATIVADO' : 'ATIVO'}</span>
                  </div>
                </div>
                <div class="permission-roles" style="${m.disabled_for_all ? 'opacity: 0.5; pointer-events: none;' : ''}">
                  <span class="permission-roles-label">Permitido para:</span>
                  <div class="permission-roles-grid">
                    ${roles.map(role => `
                      <label class="role-checkbox">
                        <input type="checkbox" ${m.allowed_roles?.includes(role) ? 'checked' : ''} 
                               data-module="${m.id}" data-role="${role}" data-action="toggle-role">
                        <span class="role-name">${role}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;

      this.attachPermissionEvents();

    } catch (error) {
      console.error('[Admin] Erro ao carregar permissões:', error);
      container.innerHTML = `
        <div class="admin-section">
          <div class="alert alert-error">Erro ao carregar permissões: ${error.message}</div>
        </div>`;
    }
  },

  attachPermissionEvents() {
    // Toggle módulo on/off
    document.querySelectorAll('[data-action="toggle-module"]').forEach(input => {
      input.addEventListener('change', async (e) => {
        const moduleId = e.target.dataset.module;
        const enabled = e.target.checked;

        try {
          await window.ModulePermissionService.toggleModuleForAll(moduleId, enabled);
          if (typeof NexusApp !== 'undefined') {
            NexusApp.showToast(`Módulo ${enabled ? 'ativado' : 'desativado'}!`, 'success');
          }
          await this.loadTabContent();
        } catch (err) {
          if (typeof NexusApp !== 'undefined') NexusApp.showToast(err.message, 'error');
          e.target.checked = !enabled;
        }
      });
    });

    // Toggle cargo específico
    document.querySelectorAll('[data-action="toggle-role"]').forEach(input => {
      input.addEventListener('change', async (e) => {
        const moduleId = e.target.dataset.module;
        const role = e.target.dataset.role;
        const allowed = e.target.checked;

        try {
          await window.ModulePermissionService.toggleRoleAccess(moduleId, role, allowed);
          if (typeof NexusApp !== 'undefined') {
            NexusApp.showToast(`Permissão atualizada!`, 'success');
          }
        } catch (err) {
          if (typeof NexusApp !== 'undefined') NexusApp.showToast(err.message, 'error');
          e.target.checked = !allowed;
        }
      });
    });

    // Botão de Sincronizar
    document.getElementById('btn-sync-modules')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spin fa-circle-notch"></i> Sincronizando...';
      btn.disabled = true;

      try {
        const result = await window.ModulePermissionService.syncModules();
        if (typeof NexusApp !== 'undefined') {
          NexusApp.showToast(`Sincronização concluída! ${result.added} novos módulos encontrados.`, 'success');
        }
        await NexusAdmin.loadTabContent(); // Recarregar a aba
      } catch (error) {
        console.error('[Admin] Erro sync:', error);
        if (typeof NexusApp !== 'undefined') NexusApp.showToast('Erro na sincronização: ' + error.message, 'error');
      } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
      }
    });
  },

  // =========================================
  // TEMPORADAS
  // =========================================
  renderSeasonsTab(container) {
    const seasons = window.NexusPodcast?.seasons || [];
    container.innerHTML = `
            <div class="admin-section">
                <div class="admin-section-header">
                    <h3><i class="fa-solid fa-layer-group"></i> Gerenciar Temporadas</h3>
                    <button class="btn btn-primary"><i class="fa-solid fa-plus"></i> Nova Temporada</button>
                </div>
                <div class="admin-table-container">
                    <table class="admin-table">
                        <thead><tr><th>Título</th><th>Episódios</th><th>Status</th><th>Ações</th></tr></thead>
                        <tbody>
                            ${seasons.length ? seasons.map(s => `
                                <tr>
                                    <td>${s.icon || '📻'} ${s.title || 'Sem título'}</td>
                                    <td>${s.episodes?.length || 0} eps</td>
                                    <td><span class="status-badge status-ativo">Ativo</span></td>
                                    <td><button class="admin-action-btn"><i class="fa-solid fa-pen"></i></button></td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" class="text-center" style="padding: 40px; color: #64748b;">Nenhuma temporada cadastrada</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`;
  },

  // =========================================
  // CONFIGURAÇÕES
  // =========================================
  renderSettingsTab(container) {
    container.innerHTML = `
            <div class="admin-section">
                <div class="admin-section-header"><h3><i class="fa-solid fa-cog"></i> Configurações do Sistema</h3></div>
                <div class="settings-grid">
                    <div class="settings-card">
                        <h4><i class="fa-solid fa-key"></i> Segurança</h4>
                        <div class="setting-item"><label>Máx. tentativas de login</label><input type="number" class="form-input form-input-sm" value="5"></div>
                        <div class="setting-item"><label>Tempo de bloqueio (min)</label><input type="number" class="form-input form-input-sm" value="15"></div>
                    </div>
                    <div class="settings-card">
                        <h4><i class="fa-solid fa-star"></i> Pontuação</h4>
                        <div class="setting-item"><label>Tarefa concluída</label><input type="number" class="form-input form-input-sm" value="10"></div>
                        <div class="setting-item"><label>Post no fórum</label><input type="number" class="form-input form-input-sm" value="5"></div>
                        
                        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--surface-border);">
                            <p style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 8px;">Manutenção</p>
                            <button id="btn-fix-points" class="btn btn-sm btn-warning" style="width: 100%; justify-content: center; background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2);">
                                <i class="fa-solid fa-wrench"></i> Corrigir Pontos Retroativos
                            </button>
                            <button id="btn-audit-points" class="btn btn-sm" style="width: 100%; justify-content: center; margin-top: 8px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2);">
                                <i class="fa-solid fa-file-excel"></i> Exportar Auditoria de Pontos
                            </button>
                        </div>
                    </div>
                    <div class="settings-card">
                        <h4><i class="fa-solid fa-sitemap"></i> Documentação Técnica</h4>
                        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
                            Baixe o fluxograma interativo do sistema com todos os módulos, fluxos e integrações mapeados.
                        </p>
                        <a href="/FLUXOGRAMA_SISTEMA_COMPLETO_V2.html" download="FLUXOGRAMA_SISTEMA_COMPLETO_V2.html" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                            <i class="fa-solid fa-download"></i> Baixar Fluxograma Mestre
                        </a>
                        <a href="/fluxo_podcast.html" download="fluxo_podcast.html" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-download"></i> Baixar Fluxograma Podcast
                        </a>
                    </div>
                </div>
                <div class="settings-actions">
                    <button class="btn btn-primary"><i class="fa-solid fa-save"></i> Salvar Configurações</button>
                </div>
            </div>`;

    // Attach Event Listeners
    setTimeout(() => {
      document.getElementById('btn-fix-points')?.addEventListener('click', async () => {
        if (confirm('⚠️ Recalcular Ranking e Conquistas?\n\nIsso irá:\n✅ Somar TODAS as transações de pontos de cada usuário\n✅ Recalcular total_points e nível\n✅ Atualizar stats de conquistas (tarefas, fórum, elogios, etc.)\n✅ Desbloquear conquistas pendentes\n\nOs dados brutos (transações) NÃO serão alterados.')) {
          const btn = document.getElementById('btn-fix-points');
          if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Recalculando...';
          }
          try {
            if (window.fixRetroactivePointsV3) {
              await window.fixRetroactivePointsV3();
            } else if (window.fixRetroactivePoints) {
              await window.fixRetroactivePoints();
            } else {
              alert('Script de correção não carregado. Recarregue a página (Ctrl+F5).');
            }
          } catch (e) {
            console.error('Erro na correção:', e);
            alert('Erro: ' + e.message);
          } finally {
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = '<i class="fa-solid fa-wrench"></i> Corrigir Pontos Retroativos';
            }
          }
        }
      });
      document.getElementById('btn-audit-points')?.addEventListener('click', () => this.exportPointsAudit());
    }, 100);
  },

  // =========================================
  // GESTÃO DE FERRAMENTAS
  // =========================================
  async renderToolsManagementTab(container) {
    // Carregar permissões
    let permissions = {};
    try {
      if (typeof ToolsService !== 'undefined') {
        permissions = await ToolsService.loadPermissions();
      }
    } catch (e) {
      console.warn('[Admin] Erro ao carregar permissões de ferramentas:', e);
    }

    // Se não carregou, usar defaults
    if (!permissions || Object.keys(permissions).length === 0) {
      permissions = ToolsService?._getDefaultPermissions?.() || {};
    }

    const roles = ['ADMIN', 'SUPERINTENDENTE', 'GERENTE', 'CONSULTOR', 'COORDENADOR', 'ANALISTA', 'MONITOR'];

    // Agrupar por categoria
    const categories = {};
    for (const [toolId, config] of Object.entries(permissions)) {
      const cat = config.category || 'Outros';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({ id: toolId, ...config });
    }

    const categoryOrder = ['Qualidade', 'Análise', 'CEP', 'Estatística', 'Metas', 'Segurança', 'Produtividade', 'API', 'Visualização', 'Multimídia', 'Outros'];
    const sortedCategories = categoryOrder.filter(c => categories[c]).map(c => ({ name: c, tools: categories[c] }));

    container.innerHTML = `
      <div class="admin-section">
        <div class="admin-section-header">
          <div class="admin-section-left">
            <h3><i class="fa-solid fa-toolbox"></i> Gestão de Ferramentas</h3>
            <span class="admin-stat-badge">${Object.keys(permissions).length} ferramentas</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-secondary" id="btn-reset-tools">
              <i class="fa-solid fa-rotate-left"></i> Reset
            </button>
            <button class="btn btn-primary" id="btn-save-tools">
              <i class="fa-solid fa-save"></i> Salvar Alterações
            </button>
          </div>
        </div>

        <div class="alert alert-info" style="margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
          <i class="fa-solid fa-info-circle"></i>
          <span>Habilite ou desabilite ferramentas e defina quais cargos têm acesso a cada uma. As alterações serão aplicadas para todos os usuários.</span>
        </div>

        <!-- CARD DE GERENCIAMENTO DE DADOS -->
        <div class="analytics-card" style="margin-bottom: 24px; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05);">
          <h4 style="color: #ef4444; margin-bottom: 12px;">
            <i class="fa-solid fa-database"></i> Gerenciamento de Dados
          </h4>
          <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
            Ferramentas perigosas para manutenção do banco de dados. Use com cuidado!
          </p>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">
            <!-- Reset Kanban -->
            <div style="padding: 16px; background: var(--surface-card); border-radius: 8px; border: 1px solid var(--surface-border);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i class="fa-solid fa-trash-can" style="color: #ef4444;"></i>
                  <strong style="font-size: 14px;">Reset Kanban</strong>
                </div>
                <span class="status-badge status-inativo" style="font-size: 10px;">DESTRUTIVO</span>
              </div>
              <p style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 12px;">
                Apaga TODAS as tarefas e cria uma tarefa de teste com novo schema
              </p>
              <button class="btn btn-sm btn-danger" id="btn-reset-kanban" style="width: 100%;">
                <i class="fa-solid fa-bomb"></i> Reset Kanban
              </button>
            </div>

            <!-- Futuras opções aqui -->
            <div style="padding: 16px; background: var(--surface-card); border-radius: 8px; border: 1px dashed var(--surface-border); opacity: 0.5;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <i class="fa-solid fa-circle-plus" style="color: #64748b;"></i>
                <strong style="font-size: 14px; color: var(--text-tertiary);">Mais em breve</strong>
              </div>
              <p style="font-size: 12px; color: var(--text-tertiary);">
                Outras ferramentas de manutenção serão adicionadas aqui
              </p>
            </div>
          </div>
        </div>

        <div class="permissions-list" id="tools-permissions-list">
          ${sortedCategories.map(cat => `
            <div class="tools-category" style="margin-bottom: 24px;">
              <h4 style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
                ${cat.name}
              </h4>
              ${cat.tools.map(tool => `
                <div class="permission-card ${!tool.enabled ? 'disabled' : ''}" data-tool-id="${tool.id}">
                  <div class="permission-header">
                    <div class="permission-info">
                      <div class="permission-icon" style="color: ${tool.color || '#6366f1'}">
                        <i class="fa-solid ${tool.icon || 'fa-wrench'}"></i>
                      </div>
                      <div>
                        <div class="permission-name">${tool.name || tool.id}</div>
                        <span class="permission-category">${tool.category || 'Ferramenta'}</span>
                      </div>
                    </div>
                    <div class="permission-toggle">
                      <label class="toggle-switch">
                        <input type="checkbox" class="tool-enabled-toggle" data-tool-id="${tool.id}" ${tool.enabled ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                      </label>
                      <span class="toggle-status ${tool.enabled ? 'text-success' : 'text-error'}">
                        ${tool.enabled ? 'Habilitada' : 'Desabilitada'}
                      </span>
                    </div>
                  </div>
                  <div class="permission-roles">
                    <span class="permission-roles-label">Cargos com acesso:</span>
                    <div class="permission-roles-grid">
                      ${roles.map(role => `
                        <label class="role-checkbox">
                          <input type="checkbox" class="tool-role-toggle" data-tool-id="${tool.id}" data-role="${role}"
                            ${(tool.allowedRoles || []).includes(role) ? 'checked' : ''}>
                          <span class="role-name">${role}</span>
                        </label>
                      `).join('')}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Eventos
    this.attachToolsEvents();
  },

  attachToolsEvents() {
    // Reset Kanban
    document.getElementById('btn-reset-kanban')?.addEventListener('click', async () => {
      await this.handleResetKanban();
    });

    // Toggle enabled/disabled
    document.querySelectorAll('.tool-enabled-toggle').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const card = e.target.closest('.permission-card');
        const statusEl = card.querySelector('.toggle-status');

        if (e.target.checked) {
          card.classList.remove('disabled');
          statusEl.textContent = 'Habilitada';
          statusEl.classList.remove('text-error');
          statusEl.classList.add('text-success');
        } else {
          card.classList.add('disabled');
          statusEl.textContent = 'Desabilitada';
          statusEl.classList.remove('text-success');
          statusEl.classList.add('text-error');
        }
      });
    });

    // Salvar alterações
    document.getElementById('btn-save-tools')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-save-tools');
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
      btn.disabled = true;

      try {
        const updates = [];

        document.querySelectorAll('.permission-card').forEach(card => {
          const toolId = card.dataset.toolId;
          const enabled = card.querySelector('.tool-enabled-toggle')?.checked ?? true;
          const allowedRoles = [];

          card.querySelectorAll('.tool-role-toggle:checked').forEach(cb => {
            allowedRoles.push(cb.dataset.role);
          });

          updates.push({ toolId, enabled, allowedRoles });
        });

        // Atualizar no Firestore
        for (const update of updates) {
          await ToolsService.updatePermission(update.toolId, {
            enabled: update.enabled,
            allowedRoles: update.allowedRoles
          });
        }

        if (typeof NexusApp !== 'undefined') {
          NexusApp.showToast('Permissões de ferramentas atualizadas!', 'success');
        }
      } catch (error) {
        console.error('[Admin] Erro ao salvar permissões:', error);
        if (typeof NexusApp !== 'undefined') {
          NexusApp.showToast('Erro ao salvar: ' + error.message, 'error');
        }
      } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
      }
    });

    // Reset
    document.getElementById('btn-reset-tools')?.addEventListener('click', async () => {
      if (!confirm('Resetar todas as permissões para o padrão? Isso habilitará todas as ferramentas para todos os cargos.')) {
        return;
      }

      try {
        if (typeof ToolsService !== 'undefined') {
          await ToolsService.initializeDefaultPermissions();
        }
        await this.loadTabContent();
        if (typeof NexusApp !== 'undefined') {
          NexusApp.showToast('Permissões resetadas!', 'success');
        }
      } catch (error) {
        console.error('[Admin] Erro ao resetar:', error);
        if (typeof NexusApp !== 'undefined') {
          NexusApp.showToast('Erro ao resetar: ' + error.message, 'error');
        }
      }
    });
  },

  // =========================================
  // SUPABASE MANAGEMENT
  // =========================================
  async renderSupabaseTab(container) {
    const isSupabaseReady = !!window.sb;

    container.innerHTML = `
      <div class="admin-section">
        <div class="admin-section-header">
          <h3><i class="fa-solid fa-cloud-bolt"></i> Expansão Supabase (Fase 2)</h3>
          <span class="status-badge ${isSupabaseReady ? 'status-ativo' : 'status-inativo'}">
            ${isSupabaseReady ? 'CONECTADO' : 'DESCONECTADO'}
          </span>
        </div>

        <div class="analytics-grid">
          <!-- Status de Sincronização -->
          <div class="analytics-card">
            <h4><i class="fa-solid fa-sync"></i> Sincronização de Dados</h4>
            <p class="text-muted" style="font-size: 13px; margin-bottom: 20px;">
              Mantenha o PostgreSQL do Supabase atualizado com os dados do Firestore para relatórios complexos.
            </p>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div class="sync-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--surface-card); border-radius: 8px;">
                <div>
                  <div style="font-weight: 600;">Módulo Kanban</div>
                  <div style="font-size: 11px; color: var(--text-tertiary);">Tarefas, prazos e entregas</div>
                </div>
                <button class="btn btn-sm btn-secondary" onclick="NexusAdmin.bulkSync('kanban')">Sync Full</button>
              </div>

              <div class="sync-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--surface-card); border-radius: 8px;">
                <div>
                  <div style="font-weight: 600;">Módulo Férias</div>
                  <div style="font-size: 11px; color: var(--text-tertiary);">Calendário de ausências</div>
                </div>
                <button class="btn btn-sm btn-secondary" onclick="NexusAdmin.bulkSync('vacation')">Sync Full</button>
              </div>
            </div>
          </div>

          <!-- IA & Vetores -->
          <div class="analytics-card">
            <h4><i class="fa-solid fa-brain"></i> Busca Vetorial (RAG)</h4>
            <p class="text-muted" style="font-size: 13px; margin-bottom: 20px;">
              Prepare o banco para Busca Vetorial usando pgvector para alimentar o Estagiário IA.
            </p>
            <div class="alert alert-info" style="gap:10px; padding:15px; border:1px solid rgba(59,130,246,0.3); background:rgba(59,130,246,0.1); border-radius:10px; font-size:13px; display:flex; align-items:flex-start;">
              <i class="fa-solid fa-microchip" style="color:#3b82f6; font-size:16px; margin-top:2px;"></i>
              <div>
                <strong>Dica:</strong> Para usar busca vetorial, execute o script SQL <code>supabase_schema.sql</code> no seu painel.
              </div>
            </div>
            <button class="btn btn-secondary full" style="margin-top: 16px; width:100%;" onclick="NexusAdmin.setupVectorSearch()">
              <i class="fa-solid fa-vial-virus"></i> Testar Conectividade RAG
            </button>
          </div>
        </div>

        <div class="settings-card" style="margin-top: 24px; padding:20px; background:var(--surface-elevated); border:1px solid var(--surface-border); border-radius:12px;">
          <h4><i class="fa-solid fa-terminal"></i> Configuração de Infraestrutura</h4>
          <p style="font-size: 13px; color: var(--text-secondary); margin-bottom:12px;">
            Certifique-se de que as tabelas necessárias existem no seu projeto Supabase.
          </p>
          <div style="background: #000; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #10b981; max-height: 200px; overflow: auto; border:1px solid #333;">
            -- SQL de Inicialização (supabase_schema.sql)<br>
            CREATE TABLE kanban_tasks (...);<br>
            CREATE TABLE vacation_records (...);
          </div>
        </div>
      </div>`;
  },

  async bulkSync(module) {
    if (!window.SupabaseSync) {
      if (typeof NexusApp !== 'undefined') NexusApp.showToast('Serviço de Sync não carregado', 'error');
      else alert('Serviço de Sync não carregado');
      return;
    }

    try {
      if (typeof NexusApp !== 'undefined') NexusApp.showToast(`Iniciando sincronização de ${module}...`, 'info');

      let items = [];
      const db = firebase.firestore();

      if (module === 'kanban') {
        const snap = await db.collection('tasks').get();
        items = snap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            title: d.title || '',
            owner: d.owner || '',
            unit: d.unit || '',
            status: d.status || '',
            priority: d.priority || '',
            complexity: d.complexity || '',
            deadline: d.deadline || null,
            points: d.points || 0,
            created_at: d.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });
      } else if (module === 'vacation') {
        const snap = await db.collection('vacations').get();
        items = snap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            user_name: d.employeeName || '',
            role: d.role || '',
            product: d.product || '',
            start_date: d.startDate || null,
            end_date: d.endDate || null,
            status: d.status || '',
            updated_at: new Date().toISOString()
          };
        });
      }

      if (items.length > 0) {
        await window.SupabaseSync.syncBatch(module, items);
        if (typeof NexusApp !== 'undefined') NexusApp.showToast(`${items.length} itens sincronizados!`, 'success');
      } else {
        if (typeof NexusApp !== 'undefined') NexusApp.showToast('Nenhum dado encontrado.', 'warning');
      }
    } catch (e) {
      console.error(e);
      if (typeof NexusApp !== 'undefined') NexusApp.showToast('Erro no sync: ' + e.message, 'error');
    }
  },

  setupVectorSearch() {
    if (typeof NexusApp !== 'undefined') NexusApp.showToast('Busca Vetorial pronta para configuração.', 'info');
  },

  // =========================================
  // STATUS PAGE MANAGEMENT
  // =========================================
  async renderStatusPageTab(container) {
    const db = firebase.firestore();
    let updates = [];
    try {
      const snap = await db.collection('status_updates').orderBy('createdAt', 'desc').get();
      updates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { console.warn('[Admin] Erro status_updates:', e); }

    const typeLabels = { fix: '🐛 Correção', feature: '🆕 Novidade', improvement: '⚡ Melhoria', security: '🔒 Segurança' };

    container.innerHTML = `
      <div class="admin-section">
        <div class="admin-section-header">
          <div class="admin-section-left">
            <h3><i class="fa-solid fa-satellite-dish"></i> Status Page</h3>
            <span class="admin-stat-badge">${updates.length} atualizações</span>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-secondary" onclick="window.open('/status.html','_blank')">
              <i class="fa-solid fa-external-link"></i> Ver Página Pública
            </button>
            <button class="btn btn-secondary" onclick="window.seedUpdates()">
              <i class="fa-solid fa-database"></i> Seed
            </button>
            <button class="btn btn-primary" id="btn-new-status">
              <i class="fa-solid fa-plus"></i> Nova Atualização
            </button>
          </div>
        </div>

        <div class="admin-table-container">
          <table class="admin-table">
            <thead>
              <tr><th>Data</th><th>Tipo</th><th>Versão</th><th>Título</th><th>Ações</th></tr>
            </thead>
            <tbody>
              ${updates.length ? updates.map(u => {
      const d = u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('pt-BR') : u.date || '-';
      return `<tr>
                  <td><span class="text-muted">${d}</span></td>
                  <td>${typeLabels[u.type] || u.type}</td>
                  <td>${u.version ? 'v' + u.version : '-'}</td>
                  <td><strong>${u.title || '-'}</strong><br><span class="text-muted" style="font-size:12px;">${(u.description || '').substring(0, 80)}${(u.description || '').length > 80 ? '...' : ''}</span></td>
                  <td>
                    <div class="admin-actions">
                      <button class="admin-action-btn" title="Editar" onclick="NexusAdmin.editStatusUpdate('${u.id}')"><i class="fa-solid fa-pen"></i></button>
                      <button class="admin-action-btn danger" title="Excluir" onclick="NexusAdmin.deleteStatusUpdate('${u.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                  </td>
                </tr>`;
    }).join('') : '<tr><td colspan="5" class="text-center" style="padding:40px;color:#64748b;">Nenhuma atualização publicada</td></tr>'}
            </tbody>
          </table>
        </div>

        <div style="margin-top:16px; padding:12px 16px; background:rgba(0,224,255,0.06); border:1px solid rgba(0,224,255,0.15); border-radius:10px; display:flex; align-items:center; gap:12px;">
          <i class="fa-solid fa-link" style="color:#00E0FF;"></i>
          <div>
            <div style="font-size:12px; color:#9CA3AF;">Link Público (compartilhe com a equipe)</div>
            <div style="font-size:13px; color:#00E0FF; cursor:pointer;" onclick="navigator.clipboard.writeText('https://ecossistema-nep.web.app/status.html');NexusApp?.showToast?.('Link copiado!','success');">
              https://ecossistema-nep.web.app/status.html 📋
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('btn-new-status')?.addEventListener('click', () => this.showStatusUpdateModal());
  },

  showStatusUpdateModal(existingData = null) {
    document.getElementById('status-update-modal')?.remove();

    const isEdit = !!existingData;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'status-update-modal';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3><i class="fa-solid fa-${isEdit ? 'pen' : 'plus'}"></i> ${isEdit ? 'Editar' : 'Nova'} Atualização</h3>
          <button class="modal-close" onclick="document.getElementById('status-update-modal').remove()">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Tipo *</label>
            <select id="su-type" class="form-input">
              <option value="feature" ${existingData?.type === 'feature' ? 'selected' : ''}>🆕 Novidade</option>
              <option value="fix" ${existingData?.type === 'fix' ? 'selected' : ''}>🐛 Correção</option>
              <option value="improvement" ${existingData?.type === 'improvement' ? 'selected' : ''}>⚡ Melhoria</option>
              <option value="security" ${existingData?.type === 'security' ? 'selected' : ''}>🔒 Segurança</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Versão (opcional)</label>
            <input type="text" id="su-version" class="form-input" placeholder="Ex: 2.1.0" value="${existingData?.version || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Título *</label>
            <input type="text" id="su-title" class="form-input" placeholder="Ex: Novo módulo de Feedbacks" value="${existingData?.title || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea id="su-desc" class="form-input" rows="4" style="resize:vertical;" placeholder="Detalhes da atualização...">${existingData?.description || ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('status-update-modal').remove()">Cancelar</button>
          <button class="btn btn-primary" id="btn-save-su"><i class="fa-solid fa-check"></i> ${isEdit ? 'Salvar' : 'Publicar'}</button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    document.getElementById('btn-save-su').addEventListener('click', async () => {
      const type = document.getElementById('su-type').value;
      const version = document.getElementById('su-version').value.trim();
      const title = document.getElementById('su-title').value.trim();
      const description = document.getElementById('su-desc').value.trim();

      if (!title) { NexusApp?.showToast?.('Preencha o título', 'warning'); return; }

      const btn = document.getElementById('btn-save-su');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

      try {
        const db = firebase.firestore();
        const data = { type, title, description, version };

        if (isEdit) {
          await db.collection('status_updates').doc(existingData.id).update(data);
        } else {
          data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await db.collection('status_updates').add(data);
        }

        NexusApp?.showToast?.(isEdit ? 'Atualização editada!' : 'Atualização publicada!', 'success');
        modal.remove();
        this.loadTabContent();
      } catch (e) {
        NexusApp?.showToast?.('Erro: ' + e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Salvar' : 'Publicar'}`;
      }
    });
  },

  async editStatusUpdate(id) {
    try {
      const doc = await firebase.firestore().collection('status_updates').doc(id).get();
      if (doc.exists) this.showStatusUpdateModal({ id, ...doc.data() });
    } catch (e) { NexusApp?.showToast?.('Erro ao carregar: ' + e.message, 'error'); }
  },

  async deleteStatusUpdate(id) {
    if (!confirm('Excluir esta atualização?')) return;
    try {
      await firebase.firestore().collection('status_updates').doc(id).delete();
      NexusApp?.showToast?.('Atualização excluída', 'info');
      this.loadTabContent();
    } catch (e) { NexusApp?.showToast?.('Erro: ' + e.message, 'error'); }
  },

  // =========================================
  // BACKLOG (FEEDBACK REQUESTS)
  // =========================================
  async renderBacklogTab(container) {
    const db = firebase.firestore();
    let feedbacks = [];
    try {
      const snap = await db.collection('feedback_requests').orderBy('createdAt', 'desc').get();
      feedbacks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { console.warn('[Admin] Erro feedback_requests:', e); }

    const statusLabels = {
      new: '<span style="color:#00E0FF;">🆕 Novo</span>',
      analyzing: '<span style="color:#f59e0b;">🔍 Em análise</span>',
      planned: '<span style="color:#8b5cf6;">📋 Planejado</span>',
      done: '<span style="color:#10B981;">✅ Implementado</span>',
      rejected: '<span style="color:#ef4444;">❌ Rejeitado</span>'
    };
    const typeIcons = { bug: '🐛', feature: '💡', suggestion: '📝' };
    const prioIcons = { low: '🟢', medium: '🟡', high: '🔴' };

    const counts = {
      new: feedbacks.filter(f => f.status === 'new').length,
      analyzing: feedbacks.filter(f => f.status === 'analyzing').length,
      planned: feedbacks.filter(f => f.status === 'planned').length,
      done: feedbacks.filter(f => f.status === 'done').length
    };

    container.innerHTML = `
      <div class="admin-section">
        <div class="admin-section-header">
          <div class="admin-section-left">
            <h3><i class="fa-solid fa-inbox"></i> Backlog de Feedbacks</h3>
            <span class="admin-stat-badge">${feedbacks.length} total</span>
          </div>
        </div>

        <div style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap;">
          <div style="padding:10px 16px; background:rgba(0,224,255,0.08); border:1px solid rgba(0,224,255,0.2); border-radius:10px; flex:1; min-width:100px; text-align:center;">
            <div style="font-size:22px; font-weight:700; color:#00E0FF;">${counts.new}</div>
            <div style="font-size:11px; color:#9CA3AF;">Novos</div>
          </div>
          <div style="padding:10px 16px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2); border-radius:10px; flex:1; min-width:100px; text-align:center;">
            <div style="font-size:22px; font-weight:700; color:#f59e0b;">${counts.analyzing}</div>
            <div style="font-size:11px; color:#9CA3AF;">Em análise</div>
          </div>
          <div style="padding:10px 16px; background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.2); border-radius:10px; flex:1; min-width:100px; text-align:center;">
            <div style="font-size:22px; font-weight:700; color:#8b5cf6;">${counts.planned}</div>
            <div style="font-size:11px; color:#9CA3AF;">Planejados</div>
          </div>
          <div style="padding:10px 16px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); border-radius:10px; flex:1; min-width:100px; text-align:center;">
            <div style="font-size:22px; font-weight:700; color:#10B981;">${counts.done}</div>
            <div style="font-size:11px; color:#9CA3AF;">Implementados</div>
          </div>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap;">
          <select id="bl-filter-status" class="form-select" style="padding:6px 10px; font-size:12px; border-radius:8px; background:var(--surface-elevated); border:1px solid var(--surface-border); color:var(--text-primary);">
            <option value="all">Todos Status</option>
            <option value="new">🆕 Novos</option>
            <option value="analyzing">🔍 Em análise</option>
            <option value="planned">📋 Planejados</option>
            <option value="done">✅ Implementados</option>
            <option value="rejected">❌ Rejeitados</option>
          </select>
          <select id="bl-filter-type" class="form-select" style="padding:6px 10px; font-size:12px; border-radius:8px; background:var(--surface-elevated); border:1px solid var(--surface-border); color:var(--text-primary);">
            <option value="all">Todos Tipos</option>
            <option value="bug">🐛 Bug</option>
            <option value="feature">💡 Melhoria</option>
            <option value="suggestion">📝 Sugestão</option>
          </select>
        </div>

        <div class="admin-table-container">
          <table class="admin-table" id="backlog-table">
            <thead>
              <tr><th>Prio</th><th>Tipo</th><th>Título</th><th>De</th><th>Status</th><th>Data</th><th>Ações</th></tr>
            </thead>
            <tbody>
              ${feedbacks.length ? feedbacks.map(f => {
      const d = f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString('pt-BR') : '-';
      return `<tr data-status="${f.status}" data-type="${f.type}" style="cursor:pointer;" onclick="NexusAdmin.showFeedbackDetail('${f.id}')">
                  <td>${prioIcons[f.priority] || '🟡'}</td>
                  <td>${typeIcons[f.type] || '📝'} ${f.type || '-'}</td>
                  <td><strong>${f.title || '-'}</strong><br><span class="text-muted" style="font-size:11px;">${(f.description || '').substring(0, 80)}${(f.description || '').length > 80 ? '...' : ''}</span>
                    ${f.module ? `<br><span style="font-size:10px; background:rgba(255,255,255,0.05); padding:1px 6px; border-radius:3px; color:#6B7280;">${f.module}</span>` : ''}
                  </td>
                  <td><span class="text-muted" style="font-size:12px;">${f.createdBy || 'Anônimo'}</span></td>
                  <td>${statusLabels[f.status] || f.status}</td>
                  <td><span class="text-muted" style="font-size:12px;">${d}</span></td>
                  <td>
                    <div class="admin-actions" onclick="event.stopPropagation()">
                      <select class="form-select" style="font-size:11px; padding:4px 6px; border-radius:6px; background:var(--surface-elevated); border:1px solid var(--surface-border); color:var(--text-primary);" onchange="NexusAdmin.updateFeedbackStatus('${f.id}', this.value)">
                        <option value="new" ${f.status === 'new' ? 'selected' : ''}>🆕 Novo</option>
                        <option value="analyzing" ${f.status === 'analyzing' ? 'selected' : ''}>🔍 Analisando</option>
                        <option value="planned" ${f.status === 'planned' ? 'selected' : ''}>📋 Planejado</option>
                        <option value="done" ${f.status === 'done' ? 'selected' : ''}>✅ Feito</option>
                        <option value="rejected" ${f.status === 'rejected' ? 'selected' : ''}>❌ Rejeitado</option>
                      </select>
                      <button class="admin-action-btn danger" title="Excluir" onclick="event.stopPropagation(); NexusAdmin.deleteFeedback('${f.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                  </td>
                </tr>`;
    }).join('') : '<tr><td colspan="7" class="text-center" style="padding:40px;color:#64748b;">Nenhum feedback recebido ainda</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;

    // Filter events
    const filterFn = () => {
      const st = document.getElementById('bl-filter-status')?.value || 'all';
      const tp = document.getElementById('bl-filter-type')?.value || 'all';
      document.querySelectorAll('#backlog-table tbody tr').forEach(row => {
        const matchSt = st === 'all' || row.dataset.status === st;
        const matchTp = tp === 'all' || row.dataset.type === tp;
        row.style.display = matchSt && matchTp ? '' : 'none';
      });
    };
    document.getElementById('bl-filter-status')?.addEventListener('change', filterFn);
    document.getElementById('bl-filter-type')?.addEventListener('change', filterFn);
  },

  async showFeedbackDetail(id) {
    try {
      const doc = await firebase.firestore().collection('feedback_requests').doc(id).get();
      if (!doc.exists) { NexusApp?.showToast?.('Feedback não encontrado', 'error'); return; }
      const f = doc.data();
      const d = f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
      const typeLabels = { bug: '🐛 Bug', feature: '💡 Melhoria', suggestion: '📝 Sugestão' };
      const prioLabels = { low: '🟢 Baixa', medium: '🟡 Média', high: '🔴 Alta' };
      const statusLabels = { new: '🆕 Novo', analyzing: '🔍 Em análise', planned: '📋 Planejado', done: '✅ Implementado', rejected: '❌ Rejeitado' };

      document.getElementById('feedback-detail-modal')?.remove();
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'feedback-detail-modal';
      modal.innerHTML = `
        <div class="modal-container" style="max-width:560px;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-inbox"></i> Detalhes do Feedback</h3>
            <button class="modal-close" onclick="document.getElementById('feedback-detail-modal').remove()">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
          <div class="modal-body" style="display:flex; flex-direction:column; gap:16px;">
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <span style="padding:4px 10px; border-radius:8px; font-size:12px; font-weight:600; background:rgba(139,92,246,0.15); color:#a78bfa;">${typeLabels[f.type] || f.type || '-'}</span>
              <span style="padding:4px 10px; border-radius:8px; font-size:12px; font-weight:600; background:rgba(245,158,11,0.15); color:#fbbf24;">${prioLabels[f.priority] || 'N/A'}</span>
              <span style="padding:4px 10px; border-radius:8px; font-size:12px; font-weight:600; background:rgba(0,224,255,0.1); color:#00E0FF;">${statusLabels[f.status] || f.status}</span>
            </div>
            <div>
              <div style="font-size:11px; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Título</div>
              <div style="font-size:16px; font-weight:600;">${f.title || '-'}</div>
            </div>
            <div>
              <div style="font-size:11px; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Descrição</div>
              <div style="font-size:14px; line-height:1.6; color:var(--text-secondary); background:var(--surface-elevated); padding:14px 16px; border-radius:10px; border:1px solid var(--surface-border); white-space:pre-wrap; word-break:break-word;">${f.description || 'Sem descrição.'}</div>
            </div>
            ${f.module ? `<div>
              <div style="font-size:11px; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Módulo</div>
              <div style="font-size:13px; color:var(--text-secondary);">${f.module}</div>
            </div>` : ''}
            <div style="display:flex; gap:24px; flex-wrap:wrap;">
              <div>
                <div style="font-size:11px; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Enviado por</div>
                <div style="font-size:13px;">${f.createdBy || 'Anônimo'}</div>
              </div>
              <div>
                <div style="font-size:11px; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Data</div>
                <div style="font-size:13px;">${d}</div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('feedback-detail-modal').remove()">Fechar</button>
          </div>
        </div>`;

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });
      document.body.appendChild(modal);
    } catch (e) {
      console.error('[Admin] Erro ao carregar detalhes:', e);
      NexusApp?.showToast?.('Erro ao carregar detalhes: ' + e.message, 'error');
    }
  },

  async updateFeedbackStatus(id, status) {
    try {
      await firebase.firestore().collection('feedback_requests').doc(id).update({ status });
      NexusApp?.showToast?.('Status atualizado!', 'success');
    } catch (e) { NexusApp?.showToast?.('Erro: ' + e.message, 'error'); }
  },

  async deleteFeedback(id) {
    if (!confirm('Excluir este feedback?')) return;
    try {
      await firebase.firestore().collection('feedback_requests').doc(id).delete();
      NexusApp?.showToast?.('Feedback excluído', 'info');
      this.loadTabContent();
    } catch (e) { NexusApp?.showToast?.('Erro: ' + e.message, 'error'); }
  },

  // =========================================
  // HELPERS
  // =========================================

  // =========================================
  // RESET KANBAN
  // =========================================
  async handleResetKanban() {
    const confirmation1 = confirm(
      '⚠️ ATENÇÃO: AÇÃO DESTRUTIVA\n\n' +
      'Esta ação irá DELETAR PERMANENTEMENTE todas as tarefas do Kanban.\n\n' +
      'Deseja continuar?'
    );

    if (!confirmation1) return;

    const confirmation2 = prompt(
      '🔒 CONFIRMAÇÃO FINAL\n\n' +
      'Digite "RESETAR" (em maiúsculas) para confirmar:'
    );

    if (confirmation2 !== 'RESETAR') {
      if (typeof NexusApp !== 'undefined') {
        NexusApp.showToast('Reset cancelado', 'info');
      }
      return;
    }

    // Verificar se NexusKanban está disponível
    if (typeof NexusKanban === 'undefined' || typeof NexusKanban.cleanupDatabase !== 'function') {
      if (typeof NexusApp !== 'undefined') {
        NexusApp.showToast('❌ Erro: Módulo Kanban não carregado', 'error');
      } else {
        alert('Erro: Módulo Kanban não carregado');
      }
      return;
    }

    try {
      // Desabilitar botão
      const btn = document.getElementById('btn-reset-kanban');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetando...';
      }

      // Chamar cleanup do Kanban
      await NexusKanban.cleanupDatabase();

      if (typeof NexusApp !== 'undefined') {
        NexusApp.showToast('✅ Kanban resetado com sucesso!', 'success');
      } else {
        alert('✅ Kanban resetado com sucesso!');
      }

      // Re-habilitar botão
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-bomb"></i> Reset Kanban';
      }

      // Log de auditoria
      if (window.AuditService) {
        await window.AuditService.log(
          'RESET_KANBAN',
          'Reset completo do banco de dados do Kanban'
        );
      }

    } catch (error) {
      console.error('[Admin] Erro ao resetar Kanban:', error);
      if (typeof NexusApp !== 'undefined') {
        NexusApp.showToast(`❌ Erro: ${error.message}`, 'error');
      } else {
        alert(`Erro ao resetar: ${error.message}`);
      }

      // Re-habilitar botão em caso de erro
      const btn = document.getElementById('btn-reset-kanban');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-bomb"></i> Reset Kanban';
      }
    }
  },

  async recalculateRanking() {
    if (!confirm('ATENÇÃO: Isso irá recalcular a pontuação de TODOS os usuários baseando-se no histórico (Tarefas, Depoimentos, Chamados). O saldo atual será substituído. Continuar?')) return;

    const btn = document.getElementById('btn-recalc-ranking');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Calculando...';
    }

    try {
      console.log('[Admin] Iniciando recálculo de ranking...');

      // 1. Zerar pontuações (em memória)
      const userScores = {}; // uid -> points
      const userStats = {};  // uid -> { tasks_completed: 0, etc }

      // Helper para somar pontos
      const add = (uid, amount) => {
        if (!uid) return;
        if (!userScores[uid]) userScores[uid] = 0;
        userScores[uid] += amount;
      };

      // Helper para somar stats
      const incStat = (uid, key, val = 1) => {
        if (!uid) return;
        if (!userStats[uid]) userStats[uid] = {};
        if (!userStats[uid][key]) userStats[uid][key] = 0;
        userStats[uid][key] += val;
      };

      // 2. Buscar Usuários (para garantir que todos existam no map)
      const usersSnap = await window.db.collection('users').get();
      usersSnap.forEach(doc => {
        userScores[doc.id] = 0;
        userStats[doc.id] = {}; // Initialize stats for all users
      });
      console.log(`[Admin] ${usersSnap.size} usuários encontrados.`);

      // 3. Somar KANBAN (Tasks concluídas/validada)
      // Precisamos buscar de todas as coleções de tasks se houver múltiplas, ou a principal
      const tasksSnap = await window.db.collection('tasks').get();
      let tasksCount = 0;
      tasksSnap.forEach(doc => {
        const t = doc.data();
        if (t.status === 'done' || t.validated) {
          // Pontos base por tarefa (ex: 20)
          // Se tiver pontos salvos na tarefa, usa. Se não, usa 20.
          let pts = t.points || 20;
          // Se foi entregue com atraso, pode ter penalidade, mas vamos simplificar: +20 por entrega

          if (t.ownerUid) {
            add(t.ownerUid, pts);
            incStat(t.ownerUid, 'tasks_completed', 1);
            tasksCount++;
          }

          // Count creator manually if possible, assuming t.ownerUid is executor
          // Usually creator is not tracked easily in 'tasks' unless we check audit or other fields
          // MVP: Only track completed for now
        }

        // Track created?
        // if (t.createdBy) incStat(t.createdBy, 'tasks_created', 1);
      });
      console.log(`[Admin] ${tasksCount} tarefas contabilizadas.`);

      // 4. Somar DEPOIMENTOS
      const testSnap = await window.db.collection('testimonials').get();
      let testCount = 0;
      testSnap.forEach(doc => {
        const t = doc.data();
        // Quem recebeu ganha 50
        if (t.toUid) {
          add(t.toUid, 50);
          incStat(t.toUid, 'testimonials_received', 1);
        }
        // Quem enviou ganha 10
        if (t.fromUid) {
          add(t.fromUid, 10);
          incStat(t.fromUid, 'testimonials_sent', 1);
        }
        testCount++;
      });
      console.log(`[Admin] ${testCount} depoimentos contabilizados.`);

      // 5. Somar CHAMADOS (Firestore)
      {
        const ticketsSnap = await window.db.collection('tickets').get();
        let ticketCount = 0;
        ticketsSnap.forEach(doc => {
          const t = doc.data();
          // Criou (+5)
          add(t.created_by, 5);
          // incStat(t.created_by, 'tickets_created', 1); // If we had this stat

          // Resolveu (+15) - Apenas se status for resolved/closed
          if ((t.status === 'resolved' || t.status === 'closed') && t.assigned_to) {
            add(t.assigned_to, 15);
            // incStat(t.assigned_to, 'tickets_resolved', 1);
          }
          ticketCount++;
        });
        console.log(`[Admin] ${ticketCount} chamados contabilizados.`);
      }

      // 6. Salvar no Firestore (Batch)
      // Firestore max batch size is 500. Each user = 2 ops (points + stats).
      // Safe limit: 200 users => 400 ops.
      const batchSize = 200;
      const entries = Object.entries(userScores);
      const batches = [];

      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = window.db.batch();
        const chunk = entries.slice(i, i + batchSize);

        chunk.forEach(([uid, total]) => {
          // --- ATUALIZAR PONTOS ---
          const ref = window.db.collection('user_points').doc(uid);
          let level = 1;
          if (window.PointsService) {
            level = window.PointsService.calculateLevel(total);
          } else {
            if (total >= 3500) level = 10;
            else if (total >= 2500) level = 9;
            else if (total >= 1700) level = 8;
            else if (total >= 1200) level = 7;
            else if (total >= 800) level = 6;
            else if (total >= 500) level = 5;
            else if (total >= 300) level = 4;
            else if (total >= 150) level = 3;
            else if (total >= 50) level = 2; // Fallback simples
          }

          batch.set(ref, {
            uid,
            total_points: total,
            level,
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            last_recalc: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          // --- ATUALIZAR STATS E CONQUISTAS ---
          if (window.NexusAchievements) {
            const stats = userStats[uid] || {};
            // Garantir total_points nas stats
            stats.total_points = total;

            // Calcular Desbloqueios
            const unlocked = [];
            const achievements = window.NexusAchievements.ACHIEVEMENTS;
            for (const [key, ach] of Object.entries(achievements)) {
              const { type, value, operator } = ach.condition;
              const statVal = stats[type] || 0;
              let isUnlocked = false;
              if (operator === '<=') isUnlocked = statVal <= value; // Rank
              else if (operator === '==') isUnlocked = statVal === value;
              else isUnlocked = statVal >= value; // Padrão >=

              if (isUnlocked) unlocked.push(key);
            }

            const achRef = window.db.collection('user_achievements').doc(uid);
            // Salvar stats e unlocked (merge true preserva outros campos como streak)
            batch.set(achRef, {
              stats,
              unlocked,
              last_activity: new Date().toISOString()
            }, { merge: true });
          }
        });

        batches.push(batch.commit());
      }

      await Promise.all(batches);
      console.log('[Admin] Recálculo concluído com sucesso!');
      alert('Ranking e Conquistas recalculados com sucesso! Histórico processado.');

    } catch (e) {
      console.error(e);
      alert('Erro ao recalcular ranking: ' + e.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-calculator"></i> Recalcular Ranking';
      }
    }
  },

  getAvatarGradient(id) {
    const gradients = [
      'linear-gradient(135deg, #2f6fed, #1c4ed8)',
      'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #ec4899, #db2777)',
      'linear-gradient(135deg, #06b6d4, #0891b2)'
    ];
    let hash = 0;
    const str = String(id || 'default');
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  }
};

// Estilos do Admin
const adminStyles = document.createElement('style');
adminStyles.textContent = `
.admin-denied{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center}
.admin-denied-icon{font-size:80px;margin-bottom:24px}
.admin-page{max-width:1400px;margin:0 auto}
.admin-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:16px}
.admin-header-badge{display:flex;align-items:center;gap:8px;padding:8px 16px;background:linear-gradient(135deg,#1e293b,#334155);border:1px solid var(--surface-border);border-radius:20px;font-size:14px;font-weight:700;color:#f59e0b}
.admin-tabs{display:flex;gap:8px;margin-bottom:24px;background:var(--surface-card);padding:8px;border-radius:16px;border:1px solid var(--surface-border);overflow-x:auto}
.admin-tab{display:flex;align-items:center;gap:8px;padding:12px 20px;background:transparent;border:none;color:var(--text-secondary);font-size:14px;font-weight:500;border-radius:12px;cursor:pointer;transition:all .2s;white-space:nowrap}
.admin-tab:hover{color:var(--text-primary);background:var(--surface-hover)}
.admin-tab.active{background:linear-gradient(135deg,#2f6fed,#8b5cf6);color:white}
.admin-section{background:var(--surface-card);border:1px solid var(--surface-border);border-radius:16px;padding:24px}
.admin-section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:16px}
.admin-section-left{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.admin-stat-badge{background:var(--surface-elevated);padding:6px 12px;border-radius:20px;font-size:12px;color:var(--text-secondary)}
.admin-filters{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.admin-search{display:flex;align-items:center;gap:8px;background:var(--surface-elevated);border:1px solid var(--surface-border);border-radius:10px;padding:0 12px;flex:1;min-width:200px}
.admin-search i{color:var(--text-tertiary)}
.admin-search input{border:none;background:transparent;padding:10px 0;width:100%;color:var(--text-primary);outline:none}
.admin-table-container{overflow-x:auto}
.admin-table{width:100%;border-collapse:collapse}
.admin-table th,.admin-table td{padding:12px 16px;text-align:left;border-bottom:1px solid var(--surface-border)}
.admin-table th{font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em}
.admin-table tbody tr:hover{background:var(--surface-hover)}
.admin-user-cell{display:flex;align-items:center;gap:12px}
.admin-user-name{font-weight:500}
.admin-user-email{font-size:12px;color:var(--text-tertiary)}
.admin-actions{display:flex;gap:8px}
.admin-action-btn{width:32px;height:32px;border-radius:8px;background:var(--surface-elevated);border:1px solid var(--surface-border);color:var(--text-secondary);cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center}
.admin-action-btn:hover{background:var(--surface-hover);color:var(--text-primary);border-color:var(--primary-500)}
.admin-action-btn.danger:hover{background:rgba(239,68,68,.1);color:#ef4444;border-color:#ef4444}
.status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:500}
.status-ativo{background:rgba(16,185,129,.2);color:#10b981}
.status-inativo{background:rgba(239,68,68,.2);color:#ef4444}
.status-excluido{background:rgba(107,114,128,.2);color:#6b7280}
.role-badge{display:inline-block;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;background:var(--surface-elevated)}
.role-admin{background:rgba(245,158,11,.2);color:#f59e0b}
.role-superintendente{background:rgba(139,92,246,.2);color:#8b5cf6}
.role-gerente{background:rgba(59,130,246,.2);color:#3b82f6}
.badge-warning{background:rgba(245,158,11,.2);color:#f59e0b;padding:4px 8px;border-radius:6px;font-size:11px}
.badge-success{background:rgba(16,185,129,.2);color:#10b981;padding:4px 8px;border-radius:6px;font-size:11px}
.loading-spinner{display:flex;align-items:center;justify-content:center;padding:60px;color:var(--text-secondary);font-size:16px;gap:12px}
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(4px)}
.modal-container{background:var(--surface-card);border:1px solid var(--surface-border);border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow:auto}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--surface-border)}
.modal-header h3{font-size:18px;display:flex;align-items:center;gap:10px}
.modal-close{background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px}
.modal-body{padding:24px}
.modal-footer{display:flex;justify-content:flex-end;gap:12px;padding:16px 24px;border-top:1px solid var(--surface-border)}
.form-group{margin-bottom:16px}
.form-label{display:block;font-size:13px;font-weight:500;margin-bottom:8px;color:var(--text-secondary)}
.form-select{background:var(--surface-elevated);border:1px solid var(--surface-border);border-radius:8px;padding:10px 12px;color:var(--text-primary);cursor:pointer}
.alert{display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-radius:10px;font-size:13px}
.alert-info{background:rgba(59,130,246,.1);color:#3b82f6;border:1px solid rgba(59,130,246,.2)}
.text-center{text-align:center}
.text-muted{color:var(--text-tertiary)}
.settings-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:24px}
.settings-card{background:var(--surface-elevated);border:1px solid var(--surface-border);border-radius:12px;padding:20px}
.settings-card h4{display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--surface-border)}
.setting-item{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.setting-item label{font-size:14px;color:var(--text-secondary)}
.setting-item input{width:80px;text-align:center}
.settings-actions{display:flex;justify-content:flex-end}
.audit-action{font-weight:500}
.avatar{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:12px}
.avatar-sm{width:32px;height:32px;font-size:11px}

/* Analytics Dashboard */
.analytics-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px}
.analytics-kpi{background:var(--surface-elevated);border:1px solid var(--surface-border);border-radius:12px;padding:20px;text-align:center}
.analytics-kpi.highlight{border-color:var(--success-500);background:rgba(16,185,129,.08)}
.analytics-kpi.warning{border-color:var(--warning-500);background:rgba(245,158,11,.08)}
.analytics-kpi-value{font-size:24px;font-weight:700;color:var(--text-primary);margin-bottom:4px}
.analytics-kpi.highlight .analytics-kpi-value{color:var(--success-500)}
.analytics-kpi.warning .analytics-kpi-value{color:var(--warning-500)}
.analytics-kpi-label{font-size:12px;color:var(--text-secondary)}
.analytics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:20px;margin-bottom:24px}
.analytics-card{background:var(--surface-elevated);border:1px solid var(--surface-border);border-radius:12px;padding:20px}
.analytics-card h4{font-size:14px;font-weight:600;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.analytics-bars{display:flex;flex-direction:column;gap:12px}
.analytics-bar-row{display:flex;align-items:center;gap:12px}
.analytics-bar-label{font-size:13px;min-width:140px;color:var(--text-secondary)}
.analytics-bar-container{flex:1;height:20px;background:var(--surface-border);border-radius:10px;overflow:hidden}
.analytics-bar-fill{height:100%;background:linear-gradient(90deg,var(--primary-500),var(--accent-500));border-radius:10px;transition:width .5s ease}
.analytics-bar-value{font-size:13px;font-weight:600;min-width:40px;text-align:right}
.analytics-activity{display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto}
.analytics-activity-row{display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--surface-card);border-radius:8px;font-size:13px}
.analytics-activity-user{font-weight:500}
.analytics-activity-module{color:var(--text-secondary)}
.analytics-activity-time{color:var(--text-tertiary);font-size:11px}
.analytics-summary{display:flex;gap:24px;padding:16px;background:var(--surface-elevated);border-radius:12px}
.analytics-summary-item{display:flex;align-items:center;gap:8px;font-size:14px}
.analytics-summary-item i{color:var(--primary-400)}

/* Permissions (MIME) */
.permissions-list{display:flex;flex-direction:column;gap:16px}
.permission-card{background:var(--surface-elevated);border:1px solid var(--surface-border);border-radius:12px;padding:20px;transition:all .2s}
.permission-card.disabled{opacity:0.7;border-color:var(--error-400)}
.permission-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.permission-info{display:flex;align-items:center;gap:12px}
.permission-icon{font-size:24px}
.permission-name{font-weight:600;font-size:16px}
.permission-category{font-size:11px;padding:4px 8px;background:var(--surface-border);border-radius:20px;color:var(--text-tertiary);text-transform:uppercase}
.permission-toggle{display:flex;align-items:center;gap:12px}
.toggle-switch{position:relative;display:inline-block;width:50px;height:26px}
.toggle-switch input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;cursor:pointer;inset:0;background:var(--surface-border);border-radius:26px;transition:.3s}
.toggle-slider:before{position:absolute;content:"";height:20px;width:20px;left:3px;bottom:3px;background:white;border-radius:50%;transition:.3s}
.toggle-switch input:checked+.toggle-slider{background:var(--success-500)}
.toggle-switch input:checked+.toggle-slider:before{transform:translateX(24px)}
.toggle-status{font-size:12px;font-weight:600;min-width:80px}
.permission-roles{border-top:1px solid var(--surface-border);padding-top:16px}
.permission-roles-label{font-size:12px;color:var(--text-secondary);margin-bottom:12px;display:block}
.permission-roles-grid{display:flex;flex-wrap:wrap;gap:8px}
.role-checkbox{display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--surface-card);border:1px solid var(--surface-border);border-radius:8px;cursor:pointer;font-size:12px;transition:all .2s}
.role-checkbox:hover{border-color:var(--primary-400)}
.role-checkbox input:checked+.role-name{color:var(--primary-400);font-weight:600}
.role-checkbox input:checked+.role-name{color:var(--primary-400);font-weight:600}
.role-name{color:var(--text-secondary)}
.logo-checkbox-label input[type="checkbox"] { opacity: 1 !important; width: 16px !important; height: 16px !important; margin: 0 !important; appearance: auto !important; position: static !important; }
`;
document.head.appendChild(adminStyles);

window.NexusAdmin = NexusAdmin;

// ═══════════════════════════════════════════
// LOGO MANAGEMENT METHODS (added to NexusAdmin)
// ═══════════════════════════════════════════

NexusAdmin._renderUserLogoBadges = function (user) {
  const logos = Array.isArray(user.logos) && user.logos.length > 0
    ? user.logos
    : (user.setor ? [user.setor] : []);

  if (logos.length === 0) return '<span class="text-muted">-</span>';

  return logos.map(l => {
    const color = window.LogoService?._generateColor(l) || '#6366f1';
    return `<span class="logo-badge" style="background:${color}20;color:${color};border:1px solid ${color}40;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;margin:1px 2px;display:inline-block">${l}</span>`;
  }).join('');
};

NexusAdmin._populateLogoCheckboxes = async function (user) {
  const container = document.getElementById('edit-user-logos-container');
  if (!container) return;

  try {
    const allLogos = window.LogoService ? await window.LogoService.listLogos() : [];
    const userLogos = Array.isArray(user.logos) ? user.logos : (user.setor ? [user.setor] : []);

    if (allLogos.length === 0) {
      container.innerHTML = '<span class="text-muted" style="font-size:13px">Nenhuma logo cadastrada. Crie logos na aba "Logos".</span>';
      return;
    }

    container.innerHTML = allLogos.map(logo => {
      const checked = userLogos.includes(logo.name) ? 'checked' : '';
      const color = logo.color || '#6366f1';
      return `
                <label class="logo-checkbox-label" style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--surface-card);border:1px solid ${checked ? color : 'var(--surface-border)'};border-radius:8px;cursor:pointer;font-size:12px;transition:all .2s"
                       onchange="this.style.borderColor = this.querySelector('input').checked ? '${color}' : 'var(--surface-border)'">
                    <input type="checkbox" value="${logo.name}" ${checked} style="accent-color:${color}">
                    <span style="color:${color};font-weight:600">${logo.name}</span>
                </label>`;
    }).join('');
  } catch (e) {
    container.innerHTML = '<span class="text-muted">Erro ao carregar logos</span>';
    console.error('[Admin] Erro ao carregar logos:', e);
  }
};

NexusAdmin.renderLogosManagement = async function (container) {
  let allLogos = [];
  try {
    allLogos = window.LogoService ? await window.LogoService.listLogos(true) : [];
  } catch (e) {
    console.error('[Admin] Erro ao carregar logos:', e);
  }

  // Contar usuários por logo
  const logoCounts = {};
  for (const user of this.users) {
    const logos = Array.isArray(user.logos) ? user.logos : (user.setor ? [user.setor] : []);
    for (const l of logos) {
      logoCounts[l] = (logoCounts[l] || 0) + 1;
    }
  }

  container.innerHTML = `
        <div class="admin-section">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
                <div>
                    <h3 style="margin:0;font-size:20px"><i class="fa-solid fa-building" style="color:var(--primary-400);margin-right:8px"></i>Gestão de Logos</h3>
                    <p class="text-muted" style="margin:4px 0 0;font-size:13px">Gerencie as logos (clientes/produtos) e atribua aos usuários</p>
                </div>
                <button class="btn btn-primary" id="btn-create-logo">
                    <i class="fa-solid fa-plus"></i> Nova Logo
                </button>
            </div>

            <!-- Lista de Logos -->
            <div class="logos-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:32px">
                ${allLogos.length === 0 ? `
                    <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-tertiary)">
                        <i class="fa-solid fa-building" style="font-size:48px;margin-bottom:12px;opacity:0.3"></i>
                        <p>Nenhuma logo cadastrada</p>
                        <p style="font-size:13px">Clique em "Nova Logo" para começar</p>
                    </div>
                ` : allLogos.map(logo => {
    const color = logo.color || '#6366f1';
    const count = logoCounts[logo.name] || 0;
    return `
                    <div class="logo-card" style="background:var(--surface-elevated);border:1px solid var(--surface-border);border-radius:12px;padding:20px;border-left:4px solid ${color};transition:all .2s">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start">
                            <div>
                                <h4 style="margin:0;font-size:18px;color:${color}">${logo.name}</h4>
                                <p class="text-muted" style="margin:4px 0 0;font-size:13px">
                                    <i class="fa-solid fa-users" style="margin-right:4px"></i> ${count} usuário${count !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <div style="display:flex;gap:6px">
                                <button class="admin-action-btn" title="Ver Usuários" data-action="view-logo-users" data-logo="${logo.name}" style="color:${color}">
                                    <i class="fa-solid fa-eye"></i>
                                </button>
                                <button class="admin-action-btn danger" title="Excluir" data-action="delete-logo" data-logo-id="${logo.id}" data-logo-name="${logo.name}">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>`;
  }).join('')}
            </div>

            <!-- Seção: usuários sem logo -->
            <div style="margin-top:16px">
                <h4 style="margin:0 0 12px"><i class="fa-solid fa-user-slash" style="color:var(--warning-500);margin-right:8px"></i>Usuários sem Logo (${this.users.filter(u => !(Array.isArray(u.logos) && u.logos.length > 0) && !u.setor).length})</h4>
                <div id="users-without-logo" style="display:flex;flex-wrap:wrap;gap:8px">
                    ${this.users.filter(u => !(Array.isArray(u.logos) && u.logos.length > 0) && !u.setor && u.status === 'ATIVO').map(u => `
                        <span class="user-no-logo-chip" data-uid="${u.uid}" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:var(--surface-card);border:1px solid var(--surface-border);border-radius:8px;font-size:12px;cursor:pointer;transition:all .2s" title="Clique para atribuir logo">
                            <span class="avatar avatar-xs" style="width:20px;height:20px;font-size:8px;background:${this.getAvatarGradient(u.uid)}">${u.initials || '??'}</span>
                            ${u.nome} (${u.cargo || 'N/A'})
                        </span>
                    `).join('') || '<span class="text-muted" style="font-size:13px">Todos os usuários ativos têm logo atribuída ✅</span>'}
                </div>
            </div>
        </div>`;

  // Event: Criar Logo
  document.getElementById('btn-create-logo')?.addEventListener('click', async () => {
    const name = prompt('Nome da nova Logo (ex: NUBANK, VIVO, etc):');
    if (!name || !name.trim()) return;

    try {
      await window.LogoService.createLogo(name);
      if (typeof NexusApp !== 'undefined') NexusApp.showToast(`Logo "${name.trim().toUpperCase()}" criada!`, 'success');
      await this.loadTabContent();
    } catch (e) {
      if (typeof NexusApp !== 'undefined') NexusApp.showToast(e.message, 'error');
      else alert(e.message);
    }
  });

  // Event: Excluir Logo
  document.querySelectorAll('[data-action="delete-logo"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const logoId = btn.dataset.logoId;
      const logoName = btn.dataset.logoName;
      if (!confirm(`Excluir a logo "${logoName}"? Isso NÃO remove a logo dos usuários.`)) return;

      try {
        await window.LogoService.deleteLogo(logoId);
        if (typeof NexusApp !== 'undefined') NexusApp.showToast(`Logo "${logoName}" excluída`, 'success');
        await this.loadTabContent();
      } catch (e) {
        if (typeof NexusApp !== 'undefined') NexusApp.showToast(e.message, 'error');
      }
    });
  });

  // Event: Ver Usuários da Logo
  document.querySelectorAll('[data-action="view-logo-users"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const logoName = btn.dataset.logo;
      const logoUsers = this.users.filter(u => {
        const logos = Array.isArray(u.logos) ? u.logos : (u.setor ? [u.setor] : []);
        return logos.includes(logoName);
      });

      const color = window.LogoService?._generateColor(logoName) || '#6366f1';

      const modal = document.createElement('div');
      modal.id = 'logo-users-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
                <div class="modal" style="max-width:500px">
                    <div class="modal-header">
                        <h3 style="color:${color}"><i class="fa-solid fa-building" style="margin-right:8px"></i>${logoName}</h3>
                        <button class="modal-close" onclick="document.getElementById('logo-users-modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body" style="max-height:400px;overflow-y:auto">
                        ${logoUsers.length === 0 ? '<p class="text-muted">Nenhum usuário nesta logo</p>' :
          `<div style="display:flex;flex-direction:column;gap:8px">
                            ${logoUsers.map(u => `
                                <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--surface-card);border-radius:8px;border:1px solid var(--surface-border)">
                                    <span class="avatar avatar-sm" style="background:${this.getAvatarGradient(u.uid)}">${u.initials || '??'}</span>
                                    <div>
                                        <div style="font-weight:500;font-size:14px">${u.nome}</div>
                                        <div class="text-muted" style="font-size:12px">${u.cargo || 'N/A'} • ${u.email}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>`}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('logo-users-modal').remove()">Fechar</button>
                    </div>
                </div>`;
      document.body.appendChild(modal);
    });
  });

  // Event: Clicar em usuário sem logo → abrir modal de edição
  document.querySelectorAll('.user-no-logo-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const uid = chip.dataset.uid;
      const user = this.users.find(u => u.uid === uid);
      if (user) this.openEditModal(user);
    });
  });
};

