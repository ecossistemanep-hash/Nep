/**
 * NEP DELIVERY CONTROL - DASHBOARD EXECUTIVO PREMIUM
 * Consolidado: KPIs, Gráficos, Mini-Ranking, Alertas e Métricas Avançadas
 */

const NepDashboard = {
  charts: {},
  dataCache: null,

  timeout(ms) {
    return new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout Excedido')), ms));
  },

  async render(container) {
    if (!container) return; // Prevent "Cannot set properties of undefined"
    // Mostrar skeleton imediatamente para UX rápido
    container.innerHTML = this.renderSkeleton();

    const user = NepAuth?.getUser() || { name: localStorage.getItem('nep_user_name') || 'Usuário' };

    // Carregar tarefas do Firebase diretamente se NexusKanban não tiver dados
    let tasks = NexusKanban?.allTasks || [];
    if (tasks.length === 0 && window.db) {
      try {
        const snap = await window.db.collection('tasks').orderBy('createdAt', 'desc').limit(100).get();
        tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { console.warn('[Dashboard] Erro ao carregar tarefas:', e); }
    }

    // FILTRAR TAREFAS POR USUÁRIO/VISUALIZADOR (corrigido)
    const uid = localStorage.getItem('nep_user_uid');
    const userName = localStorage.getItem('nep_user_name');
    const isAdmin = localStorage.getItem('nep_is_admin') === 'true';
    const roleKey = (localStorage.getItem('nep_user_role_key') || '').toLowerCase();
    const isGlobalViewer = isAdmin || roleKey === 'superintendente' || roleKey === 'diretor';

    if (!isGlobalViewer && uid) {
      tasks = tasks.filter(t => {
        // Usuário é o responsável
        if (t.ownerUid === uid || t.owner === userName) return true;
        // Usuário é o criador
        if (t.creatorUid === uid) return true;
        // Usuário está nos visualizadores
        if (t.viewers && Array.isArray(t.viewers) && t.viewers.includes(uid)) return true;
        return false;
      });
    }

    const stats = this.calculateStats(tasks);

    // Load user points from PointsService (com timeout)
    let userPoints = 0, userLevel = 1, userStreak = 0;
    if (window.PointsService && uid) {
      try {
        const pointsPromise = window.PointsService.getUserPoints(uid);
        const pointsData = await Promise.race([pointsPromise, this.timeout(3000)]);
        userPoints = pointsData?.total_points || 0;
        userLevel = pointsData?.level || 1;
      } catch (e) { console.warn('[Dashboard] Timeout ou erro ao carregar pontos'); }
    }

    // Load streak from user_achievements (where updateStreak saves it)
    if (window.NexusAchievements && uid) {
      try {
        // Update streak on dashboard load (tracks daily usage)
        const streakResult = await Promise.race([
          window.NexusAchievements.updateStreak(uid),
          this.timeout(3000)
        ]);
        userStreak = streakResult?.streak || 0;
      } catch (e) {
        console.warn('[Dashboard] Timeout ao atualizar streak');
        // Fallback: try reading from existing data
        try {
          const achData = await window.NexusAchievements.getUserAchievements(uid);
          userStreak = achData?.stats?.streak || 0;
        } catch (e2) { /* ignore */ }
      }
    }

    // Get Top 5 ranking (com timeout)
    let topUsers = [];
    if (window.PointsService) {
      try {
        const rankingPromise = window.PointsService.getRanking(5);
        topUsers = await Promise.race([rankingPromise, this.timeout(2000)]) || [];
      } catch (e) { console.warn('[Dashboard] Timeout ou erro ao carregar ranking'); }
    }

    // Get overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'done' || t.status === 'archived') return false;
      if (!t.deadline) return false;
      return new Date(t.deadline + 'T23:59:59') < now;
    }).slice(0, 5);

    // Fetch Ticket Stats
    let ticketStats = { pending: 0, returned: 0, resolved: 0 };
    if (window.sb && uid) {
      try {
        // Check if client is actually ready (might vary based on init timing)
        const client = window.sb;
        const { data: tickets, error } = await client
          .from('tickets')
          .select('status, assigned_to, created_by')
          .or(`created_by.eq.${uid},assigned_to.eq.${uid}`);

        if (!error && tickets) {
          // Logic: 
          // Pending: Received and status is new/opened
          // Returned: Created by me and status is returned OR Received by me and I need to fix? No, usually returned to creator.
          // Let's stick to the module logic:
          // My Pending (To Do): Assigned to me AND (new OR returned? No returned is for creator).

          // Let's simplify:
          // Pending (Action needed): Assigned to me (new) OR Created by me (returned)
          ticketStats.pending = tickets.filter(t => (t.assigned_to === uid && t.status === 'new') || (t.created_by === uid && t.status === 'returned')).length;

          // Returned (Waiting for others?): Created by me (returned) -> Actually this is action needed.
          // Let's just count purely by status for the blocks:
          // "Ação Necessária"
          ticketStats.actionNeeded = tickets.filter(t => (t.assigned_to === uid && t.status === 'new') || (t.created_by === uid && t.status === 'returned')).length;

          // "Em Andamento"
          ticketStats.inProgress = tickets.filter(t => t.status === 'in_progress').length;

          // "Resolvidos"
          ticketStats.resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
        }
      } catch (e) {
        console.warn('[Dashboard] Error fetching tickets:', e);
      }
    }

    container.innerHTML = `
      <div class="dashboard-container fade-in">
        <!-- Header with Streak -->
        <div class="dash-header">
          <div>
            <h1 class="dash-title">Bem-vindo, ${user?.name?.split(' ')[0] || 'Usuário'}! 👋</h1>
            <p class="dash-subtitle">Performance operacional em tempo real</p>
          </div>
          <div class="dash-header-right">
            <div class="streak-badge ${userStreak >= 7 ? 'hot' : ''}">
              <span class="streak-fire">🔥</span>
              <span class="streak-count">${userStreak}</span>
              <span class="streak-label">dias</span>
            </div>
            <span class="dash-date">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>

        <!-- KPI Filters Area (Global Configs) -->
        ${window.LogoService && window.LogoService.isGlobalViewer() ? `
        <div class="dash-filters" style="display:flex; justify-content:flex-end; margin-bottom: 16px; align-items:center; gap: 8px;">
          <label style="font-size:12px; font-weight:600; color:var(--text-secondary);">Filtrar Visão Global por Logo:</label>
          <select id="dash-filter-logo" style="background:var(--surface-elevated); border:1px solid var(--surface-border); border-radius:8px; padding:6px 12px; color:var(--text-primary); cursor:pointer; font-size:13px; outline:none;">
            <option value="all">🌐 Todas as Logos</option>
          </select>
        </div>` : ''}

        <!-- KPIs Grid - 6 cards -->
        <div class="kpi-grid-6">
          <div class="kpi-card">
            <div class="kpi-icon icon-blue">📊</div>
            <div class="kpi-data">
              <span class="kpi-value" id="kpi-total">${stats.total}</span>
              <span class="kpi-label">Total Demandas</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon icon-yellow">⚡</div>
            <div class="kpi-data">
              <span class="kpi-value" id="kpi-doing">${stats.doing}</span>
              <span class="kpi-label">Em Andamento</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon icon-orange">⏳</div>
            <div class="kpi-data">
              <span class="kpi-value" id="kpi-pending">${stats.pending}</span>
              <span class="kpi-label">Aguardando</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon icon-green">✅</div>
            <div class="kpi-data">
              <span class="kpi-value" id="kpi-done">${stats.done}</span>
              <span class="kpi-label">Concluídas</span>
            </div>
          </div>
          <div class="kpi-card highlight">
            <div class="kpi-icon icon-teal">📈</div>
            <div class="kpi-data">
              <span class="kpi-value" id="kpi-ontime">${stats.onTimeRate}%</span>
              <span class="kpi-label">Taxa On-Time</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon icon-purple">🏆</div>
            <div class="kpi-data">
              <span class="kpi-value" id="kpi-points">${userPoints.toLocaleString()}</span>
              <span class="kpi-label">Seus Pontos (Nv.${userLevel})</span>
            </div>
          </div>
        </div>

        <!-- Ticket Stats Row -->
        <div class="section-divider">
            <h3>🎫 Central de Chamados</h3>
        </div>
        <div class="kpi-grid-3">
            <div class="kpi-card" style="border-left: 3px solid #f59e0b;">
                <div class="kpi-icon icon-yellow"><i class="fa-solid fa-bell"></i></div>
                <div class="kpi-data">
                    <span class="kpi-value">${ticketStats.actionNeeded || 0}</span>
                    <span class="kpi-label">Ação Necessária</span>
                </div>
            </div>
            <div class="kpi-card" style="border-left: 3px solid #3b82f6;">
                <div class="kpi-icon icon-blue"><i class="fa-solid fa-spinner"></i></div>
                <div class="kpi-data">
                    <span class="kpi-value">${ticketStats.inProgress || 0}</span>
                    <span class="kpi-label">Em Andamento</span>
                </div>
            </div>
            <div class="kpi-card" style="border-left: 3px solid #10b981;">
                <div class="kpi-icon icon-green"><i class="fa-solid fa-check-circle"></i></div>
                <div class="kpi-data">
                    <span class="kpi-value">${ticketStats.resolved || 0}</span>
                    <span class="kpi-label">Resolvidos/Fechados</span>
                </div>
            </div>
        </div>

        <!-- Main Content Grid -->
        <div class="dash-grid-3">
          <!-- Status Chart -->
          <div class="dash-section">
            <div class="section-header">
              <h3>📊 Status das Demandas</h3>
            </div>
            <div class="chart-container"><canvas id="chart-status"></canvas></div>
          </div>

          <!-- Priority by Status -->
          <div class="dash-section">
            <div class="section-header">
              <h3>🎯 SLA por Prioridade</h3>
            </div>
            <div class="chart-container"><canvas id="chart-priority"></canvas></div>
          </div>

          <!-- Mini Ranking -->
          <div class="dash-section ranking-section">
            <div class="section-header">
              <h3>🏆 Top 5 da Semana</h3>
              <a href="#ranking" class="section-link" onclick="NepApp.navigate('ranking')">Ver todos</a>
            </div>
            <div class="mini-ranking" id="mini-ranking">
              ${topUsers.length > 0 ? topUsers.map((u, i) => `
                <div class="rank-row ${u.uid === uid ? 'is-me' : ''}">
                  <span class="rank-pos rank-${i + 1}">${i + 1}</span>
                  <div class="rank-avatar" style="background: ${this.getAvatarGradient(u.nome)}">${this.getInitials(u.nome)}</div>
                  <span class="rank-name">${u.nome || 'Usuário'}</span>
                  <span class="rank-pts">${u.total_points?.toLocaleString() || 0} pts</span>
                </div>
              `).join('') : '<div class="empty-state-small">Nenhum dado ainda</div>'}
            </div>
          </div>
        </div>

        <!-- Second Row -->
        <div class="dash-grid-2">
          <!-- Workload -->
          <div class="dash-section">
            <div class="section-header">
              <h3>👥 Carga de Trabalho</h3>
            </div>
            <div class="chart-container small-height"><canvas id="chart-workload"></canvas></div>
          </div>

          <!-- Alerts -->
          <div class="dash-section alerts-section">
            <div class="section-header">
              <h3>🚨 Alertas Ativos</h3>
              <span class="alert-count ${overdueTasks.length > 0 ? 'has-alerts' : ''}">${overdueTasks.length}</span>
            </div>
            <div class="alerts-list">
              ${overdueTasks.length > 0 ? overdueTasks.map(t => `
                <div class="alert-item">
                  <div class="alert-icon">⚠️</div>
                  <div class="alert-content">
                    <span class="alert-title">${t.title}</span>
                    <span class="alert-meta">${t.owner || 'Sem responsável'} • Venceu em ${this.formatDate(t.deadline)}</span>
                  </div>
                  <span class="alert-badge priority-${(t.priority || 'medio').toLowerCase()}">${t.priority || 'Médio'}</span>
                </div>
              `).join('') : '<div class="empty-state-small">✅ Nenhuma demanda atrasada!</div>'}
            </div>
          </div>
        </div>

        <!-- Weekly Trend -->
        <div class="dash-section full-width">
          <div class="section-header">
            <h3>📈 Tendência Semanal</h3>
          </div>
          <div class="chart-container small-height"><canvas id="chart-trend"></canvas></div>
        </div>
      </div>
    `;

    // Populate the Logo Filter if it exists
    if (window.LogoService && window.LogoService.isGlobalViewer()) {
      const logoFilter = document.getElementById('dash-filter-logo');
      if (logoFilter) {
        window.LogoService.listLogos().then(logos => {
          logos.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.name;
            opt.textContent = l.name;
            logoFilter.appendChild(opt);
          });
        });

        // Add Event Listener to rebuild KPIs when changed
        logoFilter.addEventListener('change', () => {
          this.refreshDashboardData(tasks);
        });
      }
    }

    // Save the base tasks for filtering
    this.dataCache = tasks;

    requestAnimationFrame(() => this.refreshDashboardData(tasks));

    // 🔄 Subscribe to real-time task updates for KPIs
    this.subscribeToTaskUpdates();
  },

  refreshDashboardData(baseTasks) {
    let filteredTasks = [...baseTasks];

    // Apply Logo Filter if Global Viewer selected a specific logo
    if (window.LogoService && window.LogoService.isGlobalViewer()) {
      const logoFilter = document.getElementById('dash-filter-logo');
      if (logoFilter && logoFilter.value !== 'all') {
        const selectedLogo = logoFilter.value;
        filteredTasks = filteredTasks.filter(t => {
          const logosForTask = t.logos || (t.logo ? [t.logo] : []);
          // Fallback to checking owner's logos if task doesn't have it directly
          if (logosForTask.length === 0 && window.NexusKanban && window.NexusKanban.activeUsers) {
            const ownerInfo = window.NexusKanban.activeUsers.find(u => u.uid === t.ownerUid);
            if (ownerInfo) {
              const ownerLogos = ownerInfo.logos || (ownerInfo.setor ? [ownerInfo.setor] : []);
              return ownerLogos.includes(selectedLogo);
            }
          }
          return logosForTask.includes(selectedLogo);
        });
      }
    }

    const stats = this.calculateStats(filteredTasks);
    this.updateKPIUI(stats);
    this.initCharts(stats, filteredTasks);
  },

  updateKPIUI(stats) {
    const updates = {
      'kpi-total': stats.total,
      'kpi-doing': stats.doing,
      'kpi-pending': stats.pending,
      'kpi-done': stats.done,
      'kpi-ontime': stats.onTimeRate + '%'
    };

    for (const [id, value] of Object.entries(updates)) {
      const el = document.getElementById(id);
      if (el && el.textContent !== String(value)) {
        el.textContent = value;
        el.style.transition = 'color 0.3s';
        el.style.color = '#3b82f6';
        setTimeout(() => { el.style.color = '#fff'; }, 600);
      }
    }
  },

  // Real-time KPI refresh: listens to Firestore task changes
  subscribeToTaskUpdates() {
    if (this._kpiUnsub) this._kpiUnsub(); // Unsub previous listener

    if (!window.db) return;

    this._kpiUnsub = window.db.collection('tasks').onSnapshot(snapshot => {
      let tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Apply same user filter as render()
      const uid = localStorage.getItem('nep_user_uid');
      const userName = localStorage.getItem('nep_user_name');
      const isAdmin = localStorage.getItem('nep_is_admin') === 'true';
      const roleKey = (localStorage.getItem('nep_user_role_key') || '').toLowerCase();
      const isGlobalViewer = isAdmin || roleKey === 'superintendente' || roleKey === 'diretor';

      if (!isGlobalViewer && uid) {
        tasks = tasks.filter(t => {
          if (t.ownerUid === uid || t.owner === userName) return true;
          if (t.creatorUid === uid) return true;
          if (t.viewers && Array.isArray(t.viewers) && t.viewers.includes(uid)) return true;
          return false;
        });
      }

      this.dataCache = tasks;
      this.refreshDashboardData(this.dataCache);
    }, err => console.warn('[Dashboard] KPI listener error:', err));
  },

  // Update only the KPI number elements (no full re-render)
  refreshKPIs(tasks) {
    // Wrapper around the new flow for backwards compatibility if called separately
    this.refreshDashboardData(tasks);
  },

  // Timeout helper para evitar travamento em chamadas lentas
  timeout(ms) {
    return new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));
  },

  // Skeleton loading para feedback visual imediato
  renderSkeleton() {
    return `
      <div class="dashboard-container fade-in">
        <div class="dash-header">
          <div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
          </div>
        </div>
        <div class="kpi-grid-6">
          ${Array(6).fill('<div class="kpi-card"><div class="skeleton skeleton-kpi"></div></div>').join('')}
        </div>
        <div class="dash-grid-3">
          ${Array(3).fill('<div class="dash-section"><div class="skeleton skeleton-chart"></div></div>').join('')}
        </div>
      </div>
    `;
  },

  calculateStats(tasks) {
    const stats = {
      total: tasks.length,
      backlog: 0, doing: 0, pending: 0, done: 0,
      onTime: 0, totalValidated: 0,
      units: {}, workload: {},
      priorityCounts: { 'Urgente': 0, 'Alto': 0, 'Médio': 0, 'Baixo': 0 }
    };

    tasks.forEach(t => {
      if (stats[t.status] !== undefined) stats[t.status]++;
      if (t.unit) stats.units[t.unit] = (stats.units[t.unit] || 0) + 1;

      if (t.status !== 'done' && t.status !== 'archived' && t.owner) {
        let ownerName = t.owner.split(' ')[0];
        stats.workload[ownerName] = (stats.workload[ownerName] || 0) + 1;
      }

      if (t.priority && stats.priorityCounts[t.priority] !== undefined) {
        stats.priorityCounts[t.priority]++;
      }

      if (t.status === 'done' && t.validated) {
        stats.totalValidated++;
        if (t.deadline && t.deliveredAt) {
          if (new Date(t.deliveredAt) <= new Date(t.deadline + 'T23:59:59')) {
            stats.onTime++;
          }
        }
      }
    });

    stats.onTimeRate = stats.totalValidated > 0
      ? Math.round((stats.onTime / stats.totalValidated) * 100)
      : 100;

    return stats;
  },

  initCharts(stats, tasks) {
    this.createStatusChart(stats);
    this.createPriorityChart(stats);
    this.createWorkloadChart(stats);
    this.createTrendChart(tasks);
  },

  createStatusChart(stats) {
    const ctx = document.getElementById('chart-status');
    if (!ctx) return;
    if (this.charts.status) this.charts.status.destroy();

    // Register Plugin if available
    if (window.ChartDataLabels) Chart.register(window.ChartDataLabels);

    this.charts.status = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Backlog', 'Em Andamento', 'Revisão', 'Concluído'],
        datasets: [{
          data: [stats.backlog, stats.doing, stats.pending, stats.done],
          backgroundColor: ['#64748b', '#f2b705', '#e5533d', '#2ecc71'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { color: '#8fa6c6', font: { family: 'Inter' } } },
          datalabels: {
            color: '#fff',
            font: { weight: 'bold', family: 'Inter' },
            formatter: (value) => value > 0 ? value : ''
          }
        }
      }
    });
  },

  createPriorityChart(stats) {
    const ctx = document.getElementById('chart-priority');
    if (!ctx) return;
    if (this.charts.priority) this.charts.priority.destroy();

    this.charts.priority = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Urgente', 'Alto', 'Médio', 'Baixo'],
        datasets: [{
          label: 'Demandas',
          data: [
            stats.priorityCounts['Urgente'],
            stats.priorityCounts['Alto'],
            stats.priorityCounts['Médio'],
            stats.priorityCounts['Baixo']
          ],
          backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#64748b'],
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            color: '#fff',
            anchor: 'end',
            align: 'end',
            offset: -4,
            font: { weight: 'bold', family: 'Inter' },
            formatter: (value) => value > 0 ? value : ''
          }
        },
        scales: {
          x: { grid: { color: '#1e293b' }, ticks: { color: '#64748b' } },
          y: { grid: { display: false }, ticks: { color: '#8fa6c6' } }
        }
      }
    });
  },

  createWorkloadChart(stats) {
    const ctx = document.getElementById('chart-workload');
    if (!ctx) return;
    if (this.charts.workload) this.charts.workload.destroy();

    const owners = Object.keys(stats.workload);
    const data = Object.values(stats.workload);

    this.charts.workload = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: owners,
        datasets: [{
          label: 'Demandas Ativas',
          data: data,
          backgroundColor: data.map(v => v > 8 ? '#e5533d' : v > 5 ? '#f2b705' : '#2f6fed'),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 20 } }, // Espaço para label
        plugins: {
          legend: { display: false },
          datalabels: {
            color: '#fff',
            anchor: 'end',
            align: 'end',
            offset: -4,
            font: { weight: 'bold', family: 'Inter' },
            formatter: (value) => value > 0 ? value : ''
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#1e293b' }, ticks: { color: '#64748b', stepSize: 1 } },
          x: { grid: { display: false }, ticks: { color: '#8fa6c6' } }
        }
      }
    });
  },

  createTrendChart(tasks) {
    const ctx = document.getElementById('chart-trend');
    if (!ctx) return;
    if (this.charts.trend) this.charts.trend.destroy();

    // Get last 7 days
    const labels = [];
    const createdData = [];
    const doneData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      labels.push(date.toLocaleDateString('pt-BR', { weekday: 'short' }));

      createdData.push(tasks.filter(t => t.createdAt?.startsWith(dateStr)).length);
      doneData.push(tasks.filter(t => t.deliveredAt?.startsWith(dateStr)).length);
    }

    this.charts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Criadas', data: createdData, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 },
          { label: 'Concluídas', data: doneData, borderColor: '#2ecc71', backgroundColor: 'rgba(46,204,113,0.1)', fill: true, tension: 0.4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { color: '#8fa6c6' } } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#1e293b' }, ticks: { color: '#64748b' } },
          x: { grid: { display: false }, ticks: { color: '#8fa6c6' } }
        }
      }
    });
  },

  getAvatarGradient(name) {
    const colors = ['#2f6fed', '#8b5cf6', '#e5533d', '#f2b705', '#2ecc71', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  },

  getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  },

  formatDate(dateStr) {
    if (!dateStr) return 'N/D';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
};

// Premium Dashboard Styles
const dashStyles = document.createElement('style');
dashStyles.textContent = `
  .dashboard-container { padding: 20px; max-width: 1600px; margin: 0 auto; }
  .dash-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
  .dash-title { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.5px; }
  .dash-subtitle { color: #8fa6c6; font-size: 14px; margin-top: 5px; }
  .dash-header-right { display: flex; align-items: center; gap: 16px; }
  .dash-date { background: rgba(47, 111, 237, 0.1); color: #2f6fed; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; }
  
  .streak-badge { display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #f97316, #ea580c); padding: 8px 14px; border-radius: 30px; }
  .streak-badge.hot { animation: pulse-glow 1.5s ease-in-out infinite; }
  @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 15px rgba(249, 115, 22, 0.4); } 50% { box-shadow: 0 0 25px rgba(249, 115, 22, 0.7); } }
  .streak-fire { font-size: 18px; }
  .streak-count { font-size: 20px; font-weight: 800; color: #fff; }
  .streak-label { font-size: 11px; color: rgba(255,255,255,0.8); }
  
  .kpi-grid-6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin-bottom: 24px; }
  .kpi-card { background: #0f1729; border: 1px solid rgba(47, 111, 237, 0.15); border-radius: 14px; padding: 16px; display: flex; align-items: center; gap: 14px; transition: all 0.2s; }
  .kpi-card:hover { transform: translateY(-2px); border-color: rgba(47, 111, 237, 0.3); }
  .kpi-card.highlight { background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1)); border-color: rgba(16, 185, 129, 0.3); }
  .kpi-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .icon-blue { background: rgba(47, 111, 237, 0.15); }
  .icon-yellow { background: rgba(242, 183, 5, 0.15); }
  .icon-orange { background: rgba(249, 115, 22, 0.15); }
  .icon-green { background: rgba(46, 204, 113, 0.15); }
  .icon-purple { background: rgba(139, 92, 246, 0.15); }
  .icon-teal { background: rgba(20, 184, 166, 0.15); }
  .kpi-data { display: flex; flex-direction: column; }
  .kpi-value { font-size: 22px; font-weight: 700; color: #fff; line-height: 1.1; }
  .kpi-label { font-size: 11px; color: #64748b; margin-top: 4px; }
  
  .dash-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px; }
  .dash-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px; }
  .dash-section { background: #0f1729; border: 1px solid rgba(47, 111, 237, 0.15); border-radius: 16px; padding: 20px; }
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .section-header h3 { font-size: 15px; color: #e5e7eb; font-weight: 600; }
  .section-link { font-size: 12px; color: #3b82f6; text-decoration: none; }
  .section-link:hover { text-decoration: underline; }
  .chart-container { position: relative; height: 220px; }
  .chart-container.small-height { height: 180px; }
  .full-width { grid-column: span 2; }
  
  .mini-ranking { display: flex; flex-direction: column; gap: 10px; }
  .rank-row { display: flex; align-items: center; gap: 12px; padding: 10px; background: rgba(255,255,255,0.02); border-radius: 10px; transition: all 0.2s; }
  .rank-row:hover { background: rgba(255,255,255,0.05); }
  .rank-row.is-me { background: rgba(47, 111, 237, 0.1); border: 1px solid rgba(47, 111, 237, 0.3); }
  .rank-pos { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 12px; font-weight: 700; }
  .rank-1 { background: linear-gradient(135deg, #ffd700, #ffb800); color: #000; }
  .rank-2 { background: linear-gradient(135deg, #c0c0c0, #a0a0a0); color: #000; }
  .rank-3 { background: linear-gradient(135deg, #cd7f32, #b06020); color: #fff; }
  .rank-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 600; }
  .rank-name { flex: 1; font-size: 13px; color: #e5e7eb; }
  .rank-pts { font-size: 13px; font-weight: 600; color: #8b5cf6; }
  
  .alerts-section .section-header { border-bottom: none; }
  .alert-count { background: #64748b; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .alert-count.has-alerts { background: #ef4444; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
  .alerts-list { display: flex; flex-direction: column; gap: 10px; max-height: 220px; overflow-y: auto; }
  .alert-item { display: flex; align-items: center; gap: 12px; padding: 10px; background: rgba(239, 68, 68, 0.08); border-radius: 10px; border-left: 3px solid #ef4444; }
  .alert-icon { font-size: 18px; }
  .alert-content { flex: 1; min-width: 0; }
  .alert-title { display: block; font-size: 13px; color: #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .alert-meta { display: block; font-size: 11px; color: #64748b; margin-top: 2px; }
  .alert-badge { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
  .priority-urgente { background: rgba(239, 68, 68, 0.2); color: #f87171; }
  .priority-alto { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
  .priority-médio, .priority-medio { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
  .priority-baixo { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }
  
  /* Skeleton Loading */
  .skeleton { background: linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%); background-size: 200% 100%; animation: skeleton-pulse 1.5s infinite; border-radius: 8px; }
  @keyframes skeleton-pulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  .skeleton-title { width: 250px; height: 32px; margin-bottom: 10px; }
  .skeleton-text { width: 180px; height: 16px; }
  .skeleton-kpi { width: 100%; height: 50px; }
  .skeleton-chart { width: 100%; height: 200px; }
  
  .empty-state-small { text-align: center; padding: 30px; color: #64748b; font-size: 13px; }
  
  @media (max-width: 1400px) { .kpi-grid-6 { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 1024px) { 
    .kpi-grid-6 { grid-template-columns: repeat(2, 1fr); }
    .kpi-grid-3 { grid-template-columns: repeat(3, 1fr); } /* Maintain 3 for tickets if possible, or wrap */
    .dash-grid-3 { grid-template-columns: 1fr; }
    .dash-grid-2 { grid-template-columns: 1fr; }
    .full-width { grid-column: span 1; }
  }
  @media (max-width: 768px) {
      .kpi-grid-3 { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) { .kpi-grid-6 { grid-template-columns: 1fr; } }
  
  .kpi-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
  .section-divider { margin: 30px 0 15px 0; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; }
  .section-divider h3 { font-size: 18px; color: #fff; display: flex; align-items: center; gap: 10px; }
`;
document.head.appendChild(dashStyles);

window.NepDashboard = NepDashboard;
