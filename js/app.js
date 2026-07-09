/**
 * NEP DELIVERY CONTROL - MAIN APP
 * Inicialização e Roteamento
 */

/**
 * Chave da API Perplexity (usada em calendar.js, tools.js, tools-ishikawa-pro.js).
 * NUNCA cravar a chave no código-fonte — ela fica só no localStorage deste navegador.
 * Para configurar: abra o Console do navegador (F12) e rode:
 *   window.setPplxApiKey('sua-chave-aqui')
 */
window.getPplxApiKey = function () {
  return localStorage.getItem('nep_pplx_api_key') || '';
};
window.setPplxApiKey = function (key) {
  if (key) localStorage.setItem('nep_pplx_api_key', key);
  else localStorage.removeItem('nep_pplx_api_key');
};

const NepApp = {
  currentPage: 'dashboard',

  init() {
    if (!NepAuth.protectPage()) return;

    this.setupNavigation();
    this.setupMobileMenu();
    this.setupKeyboardShortcuts();
    this.setupTheme();
    this.setupNotifications();
    this.renderSidebar();

    const hash = window.location.hash.replace('#', '');
    this.navigate(hash || 'dashboard');
  },

  setupNavigation() {
    document.addEventListener('click', e => {
      const navItem = e.target.closest('[data-page]');
      if (navItem) {
        e.preventDefault();
        this.navigate(navItem.dataset.page);
      }
    });

    window.addEventListener('popstate', e => {
      if (e.state?.page) this.navigate(e.state.page, false);
    });
  },

  setupMobileMenu() {
    const toggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (toggle && sidebar) {
      toggle.addEventListener('click', () => sidebar.classList.toggle('open'));

      document.addEventListener('click', e => {
        if (sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          !toggle.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }
  },

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Abrir busca global se disponível
        if (window.NexusGlobalSearch) {
          window.NexusGlobalSearch.open();
        } else {
          // Fallback: focar campo antigo
          document.querySelector('.search-input')?.focus();
        }
      }
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.active').forEach(m => m.classList.remove('active'));
      }
    });
  },

  setupTheme() {
    const btn = document.getElementById('btn-theme-toggle');
    const saved = localStorage.getItem('nep_theme');

    if (saved === 'light') {
      document.body.setAttribute('data-theme', 'light');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }

    btn?.addEventListener('click', () => {
      const isLight = document.body.getAttribute('data-theme') === 'light';
      document.body.setAttribute('data-theme', isLight ? 'dark' : 'light');
      btn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      localStorage.setItem('nep_theme', isLight ? 'dark' : 'light');
    });
  },

  setupNotifications() {
    const btn = document.getElementById('btn-notifications');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const existing = document.getElementById('notifications-dropdown');
      if (existing) {
        existing.remove();
        return;
      }

      if (typeof NexusNotifications !== 'undefined') {
        btn.insertAdjacentHTML('afterend', NexusNotifications.renderDropdown());
        NexusNotifications.attachDropdownEvents();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('notifications-dropdown');
      if (dropdown && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.remove();
      }
    });
  },

  navigate(page, pushState = true) {
    this.currentPage = page;

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    if (pushState) {
      history.pushState({ page }, '', `#${page}`);
    }

    const titles = {
      dashboard: 'Dashboard Executivo',
      kanban: 'Gestão de Demandas',
      ranking: 'Ranking & Pontuação',
      forum: 'Fórum Colaborativo',
      admin: 'Painel Admin',
      checklist: 'Rotina ADM',
      calendar: 'Agendas Executivas',
      'teams-calendar': 'Calendário Teams',
      estagiario: 'Neuronyo',
      reports: 'Relatórios',
      profile: 'Meu Perfil',
      results: 'Resultados Operacionais',
      tools: 'Ferramentas',
      announcements: 'Avisos',
      testimonials: 'NEP Depoimentos',
      vacation: 'Controle de Férias',
      okr: 'Gestão de Entregas'
    };

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = titles[page] || 'NEP';

    // Track analytics
    if (window.AnalyticsService) {
      window.AnalyticsService.trackModuleView(page);
    }

    this.renderPage(page);
    document.querySelector('.sidebar')?.classList.remove('open');
  },

  async renderPage(page) {
    const content = document.getElementById('page-content');
    if (!content) return;

    content.innerHTML = '<div class="flex items-center justify-center p-8"><div class="spinner"></div></div>';

    // Verificar permissão MIME (exceto admin que sempre tem acesso)
    // Tenta pegar do cache, se falhar, aguarda o firebase carregar
    let userRole = localStorage.getItem('nep_cargo') || 'MONITOR';
    let isAdmin = localStorage.getItem('nep_is_admin') === 'true';

    // Se nulo, checa o Firebase Auth atual
    if (typeof NepAuth !== 'undefined') {
      const u = NepAuth.getUser();
      if (u) {
        userRole = u.roleKey || userRole;
        isAdmin = u.isAdmin || isAdmin;
      }
    }

    if (!isAdmin && window.ModulePermissionService) {
      const hasAccess = await window.ModulePermissionService.checkAccess(page, userRole);
      if (!hasAccess) {
        content.innerHTML = `
          <div class="empty-state" style="text-align: center; padding: 60px;">
            <div style="font-size: 64px; margin-bottom: 16px;">🔒</div>
            <h3 style="margin-bottom: 8px;">Módulo Indisponível</h3>
            <p style="color: var(--text-secondary);">Este módulo foi desativado para seu cargo pelo administrador.</p>
            <button class="btn btn-primary" style="margin-top: 24px;" onclick="NexusApp.navigate('dashboard')">Voltar ao Dashboard</button>
          </div>
        `;
        return;
      }
    }

    setTimeout(() => {
      switch (page) {
        case 'dashboard':
          if (typeof NepDashboard !== 'undefined') {
            try {
              NepDashboard.render(content);
            } catch (e) {
              console.error('Erro render dashboard:', e);
              content.innerHTML = `<div class="p-4 text-red-500">Erro execução Dashboard: ${e.message}</div>`;
            }
          } else {
            console.error('NepDashboard is undefined');
            content.innerHTML = '<div class="p-4 text-red-500">Erro: Módulo Dashboard não carregado.</div>';
          }
          break;
        case 'kanban':
          if (typeof NexusKanban !== 'undefined') NexusKanban.render(content);
          break;
        case 'ranking':
          if (typeof NexusScoring !== 'undefined') NexusScoring.render(content);
          else this.renderRanking(content);
          break;
        case 'forum':
          if (typeof NexusForum !== 'undefined') NexusForum.render(content);
          break;
        case 'admin':
          if (typeof NexusAdmin !== 'undefined') NexusAdmin.render(content);
          break;
        case 'checklist':
          if (typeof RotinaADM !== 'undefined') RotinaADM.render(content);
          else this.renderChecklist(content);
          break;
        case 'calendar':
          if (typeof NexusCalendar !== 'undefined') NexusCalendar.render(content);
          break;
        case 'teams-calendar':
          if (typeof NexusTeamsCalendar !== 'undefined') NexusTeamsCalendar.render(content);
          break;
        case 'estagiario':
          if (typeof NexusEstagiario !== 'undefined') NexusEstagiario.render(content);
          break;
        case 'reports':
          if (typeof NexusReports !== 'undefined') NexusReports.render(content);
          break;
        case 'profile':
          if (typeof NexusProfile !== 'undefined') NexusProfile.render(content);
          break;
        case 'results':
          if (typeof NexusResults !== 'undefined') NexusResults.render(content);
          break;
        // case 'ranking' handled above (line 204) via NexusScoring.render
        case 'tools':
          if (typeof NexusTools !== 'undefined') NexusTools.render(content);
          break;
        case 'announcements':
          if (typeof NexusAnnouncements !== 'undefined') NexusAnnouncements.render(content);
          break;
        case 'testimonials':
          if (typeof NexusTestimonials !== 'undefined') NexusTestimonials.render(content);
          break;
        case 'vacation':
          if (typeof NexusVacation !== 'undefined') NexusVacation.render(content);
          break;
        case 'okr':
          if (typeof NexusOKR !== 'undefined') NexusOKR.render(content);
          break;
        case 'tickets':
          if (window.TicketManagement) window.TicketManagement.render(content);
          else content.innerHTML = '<div class="loading-spinner"></div><p style="text-align:center">Carregando módulo...</p>';
          break;
        default:
          content.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">🚧</div>
              <h3 class="empty-state-title">Em Construção</h3>
              <p class="empty-state-description">Esta funcionalidade estará disponível em breve.</p>
            </div>
          `;
      }
      content.classList.add('animate-fade-in');
    }, 100);
  },

  renderDashboard(container) {
    const user = NepAuth.getUser();
    const stats = NexusKanban?.getStats?.() || { points: 0, streak: 0, tasksCompleted: 0, tasksInProgress: 0 };

    container.innerHTML = `
      <div class="dashboard-page">
        <div class="welcome-banner">
          <div>
            <h1 style="font-size: var(--text-2xl); font-weight: var(--font-bold); margin-bottom: var(--space-2);">
              Olá, ${user?.name || 'Usuário'}! 👋
            </h1>
            <p style="color: var(--text-secondary);">Bem-vindo ao NEP Delivery Control. Gerencie suas demandas de forma inteligente.</p>
          </div>
          <div class="streak-badge" style="background: linear-gradient(135deg, var(--warning-500), var(--primary-500)); color: white; padding: var(--space-3) var(--space-4); border-radius: var(--radius-xl); display: flex; align-items: center; gap: var(--space-2);">
            <span style="font-size: 24px;">🔥</span>
            <div>
              <div style="font-size: var(--text-xs); opacity: 0.9;">Streak</div>
              <div style="font-size: var(--text-xl); font-weight: var(--font-bold);">${stats.streak} dias</div>
            </div>
          </div>
        </div>

        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); margin-top: var(--space-6);">
          <div class="stat-card card">
            <div class="stat-icon" style="font-size: 32px; margin-bottom: var(--space-3);">📊</div>
            <div class="stat-value" style="font-size: var(--text-2xl); font-weight: var(--font-bold);">${stats.points}</div>
            <div class="stat-label" style="color: var(--text-secondary);">Pontos Totais</div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon" style="font-size: 32px; margin-bottom: var(--space-3);">✅</div>
            <div class="stat-value" style="font-size: var(--text-2xl); font-weight: var(--font-bold);">${stats.tasksCompleted}</div>
            <div class="stat-label" style="color: var(--text-secondary);">Concluídas</div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon" style="font-size: 32px; margin-bottom: var(--space-3);">⚡</div>
            <div class="stat-value" style="font-size: var(--text-2xl); font-weight: var(--font-bold);">${stats.tasksInProgress}</div>
            <div class="stat-label" style="color: var(--text-secondary);">Em Andamento</div>
          </div>
          <div class="stat-card card">
            <div class="stat-icon" style="font-size: 32px; margin-bottom: var(--space-3);">🏆</div>
            <div class="stat-value" style="font-size: var(--text-2xl); font-weight: var(--font-bold);">${this.getLevel(stats.points)}</div>
            <div class="stat-label" style="color: var(--text-secondary);">Nível</div>
          </div>
        </div>

        <div class="charts-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); margin-top: var(--space-6);">
          <div class="card" style="padding: var(--space-4);">
            <h3 style="margin-bottom: var(--space-4);">Status das Demandas</h3>
            <canvas id="chart-status" height="200"></canvas>
          </div>
          <div class="card" style="padding: var(--space-4);">
            <h3 style="margin-bottom: var(--space-4);">Por Solicitante</h3>
            <canvas id="chart-requester" height="200"></canvas>
          </div>
        </div>
      </div>
    `;

    this.renderDashboardCharts();
  },

  renderDashboardCharts() {
    const tasks = NexusKanban?.allTasks || [];

    const statusData = [0, 0, 0, 0];
    const reqData = {};

    tasks.forEach(t => {
      if (t.status === 'backlog') statusData[0]++;
      if (t.status === 'doing') statusData[1]++;
      if (t.status === 'pending') statusData[2]++;
      if (t.status === 'done') statusData[3]++;
      if (t.requester) reqData[t.requester] = (reqData[t.requester] || 0) + 1;
    });

    const ctxStatus = document.getElementById('chart-status');
    if (ctxStatus) {
      new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: ['Backlog', 'Em Andamento', 'Revisão', 'Concluído'],
          datasets: [{ data: statusData, backgroundColor: ['#2f6fed', '#f2b705', '#e5533d', '#2ecc71'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    const ctxReq = document.getElementById('chart-requester');
    if (ctxReq) {
      new Chart(ctxReq, {
        type: 'bar',
        data: {
          labels: Object.keys(reqData),
          datasets: [{ label: 'Demandas', data: Object.values(reqData), backgroundColor: '#1c4ed8' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  },

  renderRanking(container) {
    const stats = NexusKanban?.getStats?.() || { points: 0, streak: 0 };
    const user = NepAuth.getUser();

    container.innerHTML = `
      <div class="ranking-page">
        <div class="card" style="padding: var(--space-6); text-align: center; margin-bottom: var(--space-6);">
          <div style="font-size: 64px; margin-bottom: var(--space-4);">🏆</div>
          <h2 style="font-size: var(--text-2xl); margin-bottom: var(--space-2);">${user?.name || 'Usuário'}</h2>
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">${user?.label || 'Colaborador'}</p>
          <div style="display: flex; justify-content: center; gap: var(--space-8);">
            <div>
              <div style="font-size: var(--text-3xl); font-weight: var(--font-bold); color: var(--primary-500);">${stats.points}</div>
              <div style="color: var(--text-secondary);">Pontos</div>
            </div>
            <div>
              <div style="font-size: var(--text-3xl); font-weight: var(--font-bold); color: var(--warning-500);">${stats.streak}</div>
              <div style="color: var(--text-secondary);">Streak</div>
            </div>
            <div>
              <div style="font-size: var(--text-3xl); font-weight: var(--font-bold); color: var(--success-500);">${this.getLevel(stats.points)}</div>
              <div style="color: var(--text-secondary);">Nível</div>
            </div>
          </div>
        </div>

        <div class="card" style="padding: var(--space-4);">
          <h3 style="margin-bottom: var(--space-4);">🎮 Como Ganhar Pontos</h3>
          <div style="display: grid; gap: var(--space-3);">
            <div style="display: flex; justify-content: space-between; padding: var(--space-2); background: var(--surface-elevated); border-radius: var(--radius-md);">
              <span>Criar demanda</span><span style="color: var(--success-500);">+5 pts</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: var(--space-2); background: var(--surface-elevated); border-radius: var(--radius-md);">
              <span>Entregar demanda Baixa</span><span style="color: var(--success-500);">+5 pts</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: var(--space-2); background: var(--surface-elevated); border-radius: var(--radius-md);">
              <span>Entregar demanda Média</span><span style="color: var(--success-500);">+10 pts</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: var(--space-2); background: var(--surface-elevated); border-radius: var(--radius-md);">
              <span>Entregar demanda Alta</span><span style="color: var(--success-500);">+15 pts</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: var(--space-2); background: var(--surface-elevated); border-radius: var(--radius-md);">
              <span>Entregar demanda Urgente</span><span style="color: var(--success-500);">+20 pts</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: var(--space-2); background: var(--surface-elevated); border-radius: var(--radius-md);">
              <span>Complexidade Alta</span><span style="color: var(--warning-500);">x2</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: var(--space-2); background: var(--surface-elevated); border-radius: var(--radius-md);">
              <span>Pomodoro completo</span><span style="color: var(--success-500);">+2 pts</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderChecklist(container) {
    const user = NepAuth.getUser();
    const storageKey = `nep_routine_${user?.roleKey}_${user?.name?.toLowerCase().replace(/\s/g, '_')}`;
    const today = new Date().toISOString().split('T')[0];

    let routine = [];
    try {
      routine = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch (e) { }

    container.innerHTML = `
      <div class="checklist-page">
        <div class="card" style="padding: var(--space-4); margin-bottom: var(--space-4);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
            <h2>✅ Rotina ADM - ${new Date().toLocaleDateString('pt-BR')}</h2>
            <span id="progress-text" style="font-weight: var(--font-bold);">0%</span>
          </div>
          <div style="background: var(--surface-elevated); height: 8px; border-radius: var(--radius-full); overflow: hidden;">
            <div id="progress-fill" style="background: var(--success-500); height: 100%; width: 0%; transition: width 0.3s;"></div>
          </div>
        </div>

        <div class="card" style="padding: var(--space-4);">
          <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-4);">
            <input type="text" class="form-input" id="new-adm-task" placeholder="Adicionar nova tarefa..." style="flex: 1;">
            <button class="btn btn-primary" id="btn-add-adm">Adicionar</button>
          </div>
          <div id="checklist-items"></div>
        </div>
      </div>
    `;

    this.renderChecklistItems(routine, storageKey, today);

    document.getElementById('btn-add-adm')?.addEventListener('click', () => {
      this.addChecklistItem(storageKey);
    });

    document.getElementById('new-adm-task')?.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.addChecklistItem(storageKey);
    });
  },

  renderChecklistItems(routine, storageKey, today) {
    const container = document.getElementById('checklist-items');
    if (!container) return;

    container.innerHTML = '';
    let total = routine.length;
    let completed = 0;

    routine.forEach((item, idx) => {
      const doneKey = `nep_done_${today}_${item.id}`;
      const done = localStorage.getItem(doneKey) === '1';
      if (done) completed++;

      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); background: var(--surface-elevated); border-radius: var(--radius-md); margin-bottom: var(--space-2);';

      row.innerHTML = `
        <input type="checkbox" ${done ? 'checked' : ''} style="accent-color: var(--primary-500);">
        <span style="flex: 1; ${done ? 'text-decoration: line-through; color: var(--text-tertiary);' : ''}">${item.text}</span>
        <button class="task-action-btn danger"><i class="fa-solid fa-trash"></i></button>
      `;

      row.querySelector('input').addEventListener('change', e => {
        if (e.target.checked) localStorage.setItem(doneKey, '1');
        else localStorage.removeItem(doneKey);
        this.renderChecklistItems(routine, storageKey, today);
      });

      row.querySelector('button').addEventListener('click', () => {
        routine.splice(idx, 1);
        localStorage.setItem(storageKey, JSON.stringify(routine));
        this.renderChecklistItems(routine, storageKey, today);
      });

      container.appendChild(row);
    });

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = pct + '%';
  },

  addChecklistItem(storageKey) {
    const input = document.getElementById('new-adm-task');
    const text = input?.value.trim();
    if (!text) return;

    let routine = [];
    try { routine = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (e) { }

    routine.push({ id: Date.now().toString(), text });
    localStorage.setItem(storageKey, JSON.stringify(routine));

    input.value = '';
    this.renderChecklist(document.getElementById('page-content'));
    this.showToast('Tarefa adicionada!', 'success');
  },

  renderMetrics(container) {
    const tasks = NexusKanban?.allTasks || [];
    const now = new Date();

    // Calculate metrics
    let onTime = 0, late = 0, totalCompleted = 0;
    let totalLeadTime = 0;

    tasks.forEach(t => {
      if (t.status === 'done' && t.validated) {
        totalCompleted++;
        const created = new Date(t.createdAt);
        const delivered = new Date(t.deliveredAt || t.validatedAt);
        const leadDays = Math.ceil((delivered - created) / (1000 * 60 * 60 * 24));
        totalLeadTime += leadDays;

        const deadline = new Date(t.deadline + 'T23:59:59');
        if (delivered <= deadline) onTime++;
        else late++;
      }
    });

    const avgLeadTime = totalCompleted > 0 ? (totalLeadTime / totalCompleted).toFixed(1) : 0;
    const otdRate = totalCompleted > 0 ? Math.round((onTime / totalCompleted) * 100) : 0;

    const backlogAging = tasks.filter(t => t.status === 'backlog').map(t => {
      const created = new Date(t.createdAt);
      return Math.ceil((now - created) / (1000 * 60 * 60 * 24));
    });
    const avgBacklogAge = backlogAging.length > 0 ? (backlogAging.reduce((a, b) => a + b, 0) / backlogAging.length).toFixed(1) : 0;

    container.innerHTML = `
      <div class="metrics-page">
        <h2 style="margin-bottom: var(--space-6);">📈 Métricas Avançadas</h2>
        
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4);">
          <div class="card" style="padding: var(--space-4); text-align: center;">
            <div style="font-size: 40px; color: var(--success-500);">${otdRate}%</div>
            <div style="color: var(--text-secondary);">Taxa On-Time</div>
          </div>
          <div class="card" style="padding: var(--space-4); text-align: center;">
            <div style="font-size: 40px; color: var(--primary-500);">${avgLeadTime}d</div>
            <div style="color: var(--text-secondary);">Lead Time Médio</div>
          </div>
          <div class="card" style="padding: var(--space-4); text-align: center;">
            <div style="font-size: 40px; color: var(--warning-500);">${avgBacklogAge}d</div>
            <div style="color: var(--text-secondary);">Aging Backlog</div>
          </div>
          <div class="card" style="padding: var(--space-4); text-align: center;">
            <div style="font-size: 40px; color: var(--error-500);">${late}</div>
            <div style="color: var(--text-secondary);">Entregas Atrasadas</div>
          </div>
        </div>

        <div class="card" style="padding: var(--space-4); margin-top: var(--space-6);">
          <h3 style="margin-bottom: var(--space-4);">Carga de Trabalho por Colaborador</h3>
          <canvas id="chart-workload" height="250"></canvas>
        </div>
      </div>
    `;

    // Workload chart
    const workload = {};
    tasks.filter(t => t.status !== 'done' && t.status !== 'archived' && t.owner).forEach(t => {
      workload[t.owner] = (workload[t.owner] || 0) + 1;
    });

    const ctx = document.getElementById('chart-workload');
    if (ctx && Object.keys(workload).length > 0) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Object.keys(workload),
          datasets: [{
            label: 'Demandas Ativas',
            data: Object.values(workload),
            backgroundColor: Object.values(workload).map(v => v > 8 ? '#e5533d' : v > 5 ? '#f2b705' : '#2ecc71')
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  },

  renderSidebar() {
    const user = NepAuth.getUser();
    if (!user) return;

    const sidebar = document.getElementById('sidebar-user');
    if (sidebar) {
      sidebar.innerHTML = `
        <div class="sidebar-avatar" style="background: ${NepAuth.getAvatarGradient(user.name)}">${user.initials}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${user.name}</div>
          <div class="sidebar-user-role">${user.isAdmin ? '🛡️' : '👤'} ${user.label}</div>
        </div>
        <button class="sidebar-logout" id="btn-logout" title="Sair">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      `;

      document.getElementById('btn-logout')?.addEventListener('click', () => {
        if (confirm('Sair do NEP?')) NepAuth.logout();
      });
    }

    // Show/hide admin nav
    const adminNav = document.querySelector('[data-page="admin"]');
    if (adminNav) adminNav.style.display = user.isAdmin ? 'flex' : 'none';
  },

  getLevel(points) {
    if (points >= 1000) return 'Expert';
    if (points >= 500) return 'Avançado';
    if (points >= 200) return 'Intermediário';
    if (points >= 50) return 'Iniciante';
    return 'Novato';
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</div>
      <div class="toast-content"><div class="toast-message">${message}</div></div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // Helper Methods required by other modules
  getAvatarGradient(nameOrId) {
    if (typeof NepAuth !== 'undefined' && NepAuth.getAvatarGradient) {
      return NepAuth.getAvatarGradient(nameOrId);
    }
    // Fallback if NepAuth isn't ready
    const colors = ['#2f6fed', '#8b5cf6', '#e5533d', '#f2b705', '#2ecc71', '#ec4899'];
    let hash = 0;
    const str = nameOrId || 'user';
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  },

  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
};

// Add styles for sidebar logout
const sidebarStyle = document.createElement('style');
sidebarStyle.textContent = `
  .sidebar-user { display: flex; align-items: center; gap: var(--space-3); position: relative; }
  .sidebar-logout { position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border-radius: var(--radius-lg); background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; opacity: 0; transition: all var(--transition-fast); }
  .sidebar-user:hover .sidebar-logout { opacity: 1; }
  .sidebar-logout:hover { background: rgba(239, 68, 68, 0.1); color: var(--error-500); }
  .welcome-banner { display: flex; justify-content: space-between; align-items: center; padding: var(--space-6); background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-2xl); }
  .stat-card { padding: var(--space-4); text-align: center; }
  @media (max-width: 768px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .charts-grid { grid-template-columns: 1fr !important; }
  }
`;
document.head.appendChild(sidebarStyle);

// Initialize
document.addEventListener('DOMContentLoaded', () => NepApp.init());

// Expose globally
window.NepApp = NepApp;
window.NexusApp = NepApp; // Alias for compatibility with other modules
