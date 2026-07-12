/**
 * NEP DELIVERY CONTROL - SCORING & RANKING
 * Sistema de Pontuação, Ranking e Integração com Conquistas
 * Conectado ao Firebase - SEM MODO DEMO
 */

const NexusScoring = {
  currentTab: 'ranking',
  rankingData: [],
  userPointsData: null,
  userAchievements: null,
  userTransactions: [],

  // Ranking inteligente: período (geral | mes | semana) e filtro por logo
  currentPeriod: 'geral',
  currentLogoFilter: 'all',
  _periodCache: {},

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 300px; flex-direction: column; gap: 15px;">
        <i class="fa-solid fa-trophy fa-bounce" style="font-size: 40px; color: #f59e0b;"></i>
        <div style="color: var(--text-secondary);">Carregando Ranking...</div>
      </div>
    `;

    // Carregar dados
    await this.loadData();

    const uid = localStorage.getItem('nep_user_uid');
    const userName = localStorage.getItem('nep_user_name') || 'Usuário';

    // Obter liga do usuário
    const league = window.NexusAchievements?.getLeague(this.userPointsData?.total_points || 0) || { icon: '🥉', name: 'Bronze', color: '#CD7F32' };
    const streak = this.userAchievements?.stats?.streak || 0;
    const dailyChallenge = window.NexusAchievements?.getDailyChallenge() || { description: 'Faça login', bonus: 5 };

    // Calcular próximo nível
    const currentPoints = this.userPointsData?.total_points || 0;
    const currentLevel = this.userPointsData?.level || 1;
    const nextLevel = window.PointsService?.getNextLevelInfo(currentPoints) || { nextLevel: 2, required: 100, progress: 0 };

    container.innerHTML = `
      <div class="scoring-page fade-in">
        <!-- Header com Stats do Usuário -->
        <div class="scoring-header">
          <div class="user-card">
            <div class="user-avatar-large" style="background: ${this.getAvatarGradient(userName)}">
              ${this.getInitials(userName)}
            </div>
            <div class="user-main-info">
              <h2>${userName}</h2>
              <div class="user-badges">
                <span class="league-badge" style="background: ${league.color}22; color: ${league.color}; border: 1px solid ${league.color}44">
                  ${league.icon} ${league.name}
                </span>
                <span class="level-badge">Nível ${currentLevel}</span>
              </div>
            </div>
          </div>
          
          <div class="header-stats">
            <div class="stat-item">
              <div class="stat-value">${currentPoints.toLocaleString()}</div>
              <div class="stat-label">XP Total</div>
            </div>
            <div class="stat-item streak ${streak >= 7 ? 'hot' : ''}">
              <div class="stat-value">🔥 ${streak}</div>
              <div class="stat-label">Dias de Streak</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.userAchievements?.unlocked?.length || 0}/20</div>
              <div class="stat-label">Conquistas</div>
            </div>
          </div>
        </div>
        
        <!-- Barra de Progresso de Nível -->
        <div class="level-progress-section">
          <div class="level-progress-header">
            <span>Nível ${currentLevel}</span>
            <span class="progress-text">${nextLevel.progress}%</span>
            <span>Nível ${nextLevel.nextLevel}</span>
          </div>
          <div class="level-progress-bar">
            <div class="level-progress-fill" style="width: ${nextLevel.progress}%"></div>
          </div>
          <div class="level-progress-xp">${nextLevel.remaining || 0} XP para o próximo nível</div>
        </div>
        
        <!-- Desafio Diário -->
        <div class="daily-challenge-section">
          <div class="section-header">
            <h3>⚡ Desafio Diário</h3>
          </div>
          <div class="daily-challenge-card">
            <div class="challenge-icon">🎯</div>
            <div class="challenge-info">
              <div class="challenge-desc">${dailyChallenge.description}</div>
              <div class="challenge-bonus">+${dailyChallenge.bonus} XP de bônus</div>
            </div>
          </div>
        </div>
        
        <!-- Tabs -->
        <div class="scoring-tabs">
          <button class="scoring-tab ${this.currentTab === 'ranking' ? 'active' : ''}" data-tab="ranking">
            🏆 Ranking
          </button>
          <button class="scoring-tab ${this.currentTab === 'achievements' ? 'active' : ''}" data-tab="achievements">
            🏅 Conquistas
          </button>
          <button class="scoring-tab ${this.currentTab === 'history' ? 'active' : ''}" data-tab="history">
            📊 Histórico
          </button>
        </div>
        
        <!-- Tab Content -->
        <div class="scoring-tab-content" id="scoring-tab-content">
          ${this.renderTabContent()}
        </div>
      </div>
    `;

    this.attachEvents();
  },

  async loadData() {
    const uid = localStorage.getItem('nep_user_uid');

    // Carregar pontos do usuário
    // Tenta PointsService (ES module) primeiro, com fallback para compat SDK (window.db)
    if (window.PointsService && uid) {
      try {
        this.userPointsData = await window.PointsService.getUserPoints(uid);
        let ranking = await window.PointsService.getRanking(100); // Buscar a mais para compensar filtro
        if (window.LogoService && window.LogoService.shouldFilterByLogo()) {
          ranking = ranking.filter(u => window.LogoService.canSeeUser(u));
        }
        this.rankingData = ranking.slice(0, 50);
      } catch (e) {
        console.warn('[Scoring] Erro no PointsService, tentando fallback compat:', e);
        await this._loadDataCompat(uid);
      }
    } else if (window.db && uid) {
      // Fallback: PointsService ainda não carregou (ES module assíncrono)
      console.log('[Scoring] PointsService não disponível, usando fallback compat SDK');
      await this._loadDataCompat(uid);
    }

    // Carregar conquistas
    if (window.NexusAchievements && uid) {
      try {
        this.userAchievements = await window.NexusAchievements.getUserAchievements(uid);
        // Atualizar streak
        await window.NexusAchievements.updateStreak(uid);
      } catch (e) {
        console.warn('[Scoring] Erro ao carregar conquistas:', e);
      }
    }

    // Carregar histórico de transações do usuário (aba Histórico)
    await this._loadUserTransactions(uid);
  },

  /**
   * Histórico do usuário vem de points_transactions (não do doc de pontos).
   * Requer índice composto uid+created_at (ver firestore.indexes.json).
   */
  async _loadUserTransactions(uid) {
    if (!uid) { this.userTransactions = []; return; }
    try {
      if (window.PointsService?.getUserTransactions) {
        this.userTransactions = await window.PointsService.getUserTransactions(uid, 30);
        return;
      }
      if (window.db) {
        const snap = await window.db.collection('points_transactions')
          .where('uid', '==', uid)
          .orderBy('created_at', 'desc')
          .limit(30)
          .get();
        this.userTransactions = snap.docs.map(d => {
          const t = d.data();
          return {
            ...t,
            points: t.points ?? t.amount ?? 0,
            created_at: t.created_at?.toDate?.()?.toLocaleString('pt-BR') || ''
          };
        });
      }
    } catch (e) {
      console.warn('[Scoring] Erro ao carregar histórico de transações:', e);
      this.userTransactions = [];
    }
  },

  /**
   * Ranking por período: soma as transações desde o início do mês/semana.
   * Agregação no cliente (escala Spark) com cache de 60s por período.
   */
  async getPeriodRanking(period) {
    const cached = this._periodCache[period];
    if (cached && (Date.now() - cached.at < 60000)) return cached.data;

    const db = window.db;
    if (!db) return [];

    const now = new Date();
    let start;
    if (period === 'semana') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); // domingo
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1); // dia 1 do mês
    }

    try {
      const snap = await db.collection('points_transactions')
        .where('created_at', '>=', start)
        .orderBy('created_at', 'desc')
        .limit(3000)
        .get();

      // Somar pontos por usuário no período
      const sums = {};
      snap.docs.forEach(d => {
        const t = d.data();
        const pts = t.points ?? t.amount ?? 0;
        if (!t.uid || !pts) return;
        sums[t.uid] = (sums[t.uid] || 0) + pts;
      });

      // Reaproveitar os perfis já resolvidos do ranking geral; buscar os que faltarem
      const byUid = {};
      (this.rankingData || []).forEach(u => { byUid[u.uid] = u; });

      const rows = await Promise.all(Object.entries(sums).map(async ([uid, pts]) => {
        let base = byUid[uid];
        if (!base) {
          try {
            const uSnap = await db.collection('users').doc(uid).get();
            const u = uSnap.exists ? uSnap.data() : {};
            base = {
              uid,
              nome: u.nome || u.name || 'Usuário',
              cargo: u.cargo || 'Membro',
              email: u.email || '',
              photoURL: u.photoURL || null,
              logos: u.logos || (u.setor ? [u.setor] : []),
              level: 1,
              initials: this.getInitials(u.nome || 'U')
            };
          } catch { base = { uid, nome: 'Usuário', cargo: 'Membro', logos: [], initials: '?' }; }
        }
        return { ...base, total_points: pts };
      }));

      // Mesmos filtros do ranking geral (teste/admin/logo)
      let ranking = rows.filter(u => {
        const lowerName = (u.nome || '').toLowerCase();
        const lowerEmail = (u.email || '').toLowerCase();
        if (lowerName === 'teste' || lowerName.includes('teste automacao')) return false;
        if (lowerEmail.startsWith('teste')) return false;
        if (u.cargo === 'ADMIN' || u.cargo === 'Administrador') return false;
        return true;
      });
      if (window.LogoService && window.LogoService.shouldFilterByLogo()) {
        ranking = ranking.filter(u => window.LogoService.canSeeUser(u));
      }

      ranking.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
      this._periodCache[period] = { at: Date.now(), data: ranking };
      return ranking;
    } catch (e) {
      console.warn('[Scoring] Erro no ranking por período:', e);
      return [];
    }
  },

  /**
   * Posições com empate (dense ranking): mesma pontuação = mesma posição.
   */
  applyPositions(list) {
    let lastPoints = null;
    let lastPosition = 0;
    return list.map((u, i) => {
      const pts = u.total_points || 0;
      const position = (pts === lastPoints) ? lastPosition : i + 1;
      lastPoints = pts;
      lastPosition = position;
      return { ...u, position };
    });
  },

  /**
   * Aplica o filtro de logo escolhido no dropdown do ranking.
   */
  applyLogoFilter(list) {
    if (this.currentLogoFilter === 'all') return list;
    return list.filter(u => {
      const logos = Array.isArray(u.logos) ? u.logos : (u.setor ? [u.setor] : []);
      return logos.includes(this.currentLogoFilter);
    });
  },

  /**
   * Fallback: carrega dados diretamente via Firebase Compat SDK (window.db)
   * Usado quando o PointsService (ES module) ainda não inicializou
   */
  async _loadDataCompat(uid) {
    const db = window.db;
    if (!db) return;

    try {
      // 1. Pontos do usuário
      const userDoc = await db.collection('user_points').doc(uid).get();
      this.userPointsData = userDoc.exists ? userDoc.data() : { total_points: 0, level: 1 };

      // 2. Ranking top 50
      const rankingSnap = await db.collection('user_points')
        .orderBy('total_points', 'desc')
        .limit(50)
        .get();

      const rankingPromises = rankingSnap.docs.map(async (docSnap, index) => {
        const data = docSnap.data();

        // Buscar dados do usuário para nome/foto
        let displayName = data.name || 'Usuário';
        let cargo = data.role || 'Membro';
        let photoURL = data.photoURL || null;
        let email = '';
        let logos = data.logos || [];
        let setor = data.setor || '';

        if (!data.photoURL || !data.name || data.logos === undefined) {
          try {
            const userSnap = await db.collection('users').doc(data.uid).get();
            if (userSnap.exists) {
              const u = userSnap.data();
              displayName = u.nome || u.name || u.displayName || displayName;
              cargo = u.cargo || u.role || cargo;
              photoURL = u.photoURL || u.avatarUrl || photoURL;
              email = u.email || '';
              logos = u.logos || [];
              setor = u.setor || '';
            }
          } catch (e) { /* ignore */ }
        }

        return {
          position: index + 1,
          uid: data.uid,
          nome: displayName,
          cargo,
          email,
          photoURL,
          logos,
          setor,
          total_points: data.total_points || 0,
          level: data.level || 1,
          initials: (displayName || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
        };
      });

      const allResults = await Promise.all(rankingPromises);

      // Filtrar usuários de teste e admins (mesma lógica do PointsService.getRanking)
      let ranking = allResults.filter(u => {
        const lowerName = (u.nome || '').toLowerCase();
        const lowerEmail = (u.email || '').toLowerCase();
        if (lowerName === 'teste' || lowerName.includes('teste automacao')) return false;
        if (lowerEmail.startsWith('teste')) return false;
        if (u.cargo === 'ADMIN' || u.cargo === 'Administrador' || u.cargo === 'DIRETOR') return false;
        return true;
      });

      // Filtrar por logo se necessário
      if (window.LogoService && window.LogoService.shouldFilterByLogo()) {
        ranking = ranking.filter(u => window.LogoService.canSeeUser(u));
      }

      this.rankingData = ranking.slice(0, 50);

      console.log(`[Scoring] Ranking carregado via compat SDK: ${this.rankingData.length} usuários`);
    } catch (e) {
      console.error('[Scoring] Erro no fallback compat:', e);
    }
  },

  renderTabContent() {
    switch (this.currentTab) {
      case 'ranking': return this.renderRanking();
      case 'achievements': return this.renderAchievements();
      case 'history': return this.renderHistory();
      default: return this.renderRanking();
    }
  },

  renderRanking() {
    const uid = localStorage.getItem('nep_user_uid');

    // Base: geral (todos os tempos) ou período carregado sob demanda
    const baseList = this.currentPeriod === 'geral'
      ? (this.rankingData || [])
      : (this._periodCache[this.currentPeriod]?.data || []);

    // Dropdown de logos montado a partir dos dados visíveis (retroalimentado)
    const allLogos = [...new Set(
      (this.rankingData || []).flatMap(u => Array.isArray(u.logos) ? u.logos : (u.setor ? [u.setor] : []))
    )].filter(Boolean).sort();

    const filtered = this.applyLogoFilter(baseList);
    const ranked = this.applyPositions(filtered);

    const filtersHtml = `
      <div class="ranking-filters">
        <div class="period-tabs">
          <button class="period-tab ${this.currentPeriod === 'geral' ? 'active' : ''}" data-period="geral">Geral</button>
          <button class="period-tab ${this.currentPeriod === 'mes' ? 'active' : ''}" data-period="mes">Este Mês</button>
          <button class="period-tab ${this.currentPeriod === 'semana' ? 'active' : ''}" data-period="semana">Esta Semana</button>
        </div>
        ${allLogos.length > 1 ? `
          <select class="ranking-logo-filter" id="ranking-logo-filter">
            <option value="all" ${this.currentLogoFilter === 'all' ? 'selected' : ''}>Todas as logos</option>
            ${allLogos.map(l => `<option value="${l}" ${this.currentLogoFilter === l ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        ` : ''}
      </div>
    `;

    if (ranked.length === 0) {
      const emptyMsg = this.currentPeriod === 'geral'
        ? 'Nenhum usuário no ranking ainda.'
        : 'Ninguém pontuou neste período ainda. Seja o primeiro! 🚀';
      return `${filtersHtml}<div class="empty-state"><p>${emptyMsg}</p></div>`;
    }

    const top3 = ranked.slice(0, 3);
    const rest = ranked.slice(3);

    // Helper para renderizar avatar (foto ou iniciais)
    const renderAvatar = (user, size = 'normal') => {
      const sizeClass = size === 'large' ? 'avatar-large' : '';
      if (user.photoURL) {
        return `<img src="${user.photoURL}" class="ranking-avatar ${sizeClass}" alt="${user.nome}">`;
      }
      return `<div class="ranking-avatar ${sizeClass}" style="background: ${this.getAvatarGradient(user.nome)}">${this.getInitials(user.nome)}</div>`;
    };

    const rowHtml = (user, extraClass = '') => `
      <div class="ranking-row ${user.uid === uid ? 'is-me' : ''} ${extraClass}">
        <span class="ranking-pos">${user.position}</span>
        ${renderAvatar(user)}
        <div class="ranking-info">
          <div class="ranking-name">${user.nome || 'Usuário'}</div>
          <div class="ranking-role">${user.cargo || 'Membro'}</div>
        </div>
        <div class="ranking-league">${window.NexusAchievements?.getLeague(user.total_points)?.icon || '🥉'}</div>
        <div class="ranking-points">${user.total_points?.toLocaleString() || 0} XP</div>
      </div>
    `;

    // "Minha posição": se eu não estiver visível na lista, mostra fixado no fim
    const visibleLimit = 50;
    const visibleRest = rest.slice(0, visibleLimit - 3);
    const me = ranked.find(u => u.uid === uid);
    const meIsVisible = me && ranked.indexOf(me) < visibleLimit;
    const myPositionHtml = (me && !meIsVisible)
      ? `<div class="my-position-divider">···</div>${rowHtml(me, 'pinned-me')}`
      : '';

    return `
      ${filtersHtml}
      <!-- Pódio -->
      <div class="podium-section">
        ${top3.length >= 2 ? `
          <div class="podium-item second">
            ${renderAvatar(top3[1], 'normal')}
            <div class="podium-medal">🥈</div>
            <div class="podium-name">${top3[1].nome?.split(' ')[0] || 'Usuário'}</div>
            <div class="podium-points">${top3[1].total_points?.toLocaleString() || 0} XP</div>
          </div>
        ` : ''}
        ${top3.length >= 1 ? `
          <div class="podium-item first">
            ${renderAvatar(top3[0], 'large')}
            <div class="podium-medal">🥇</div>
            <div class="podium-crown">👑</div>
            <div class="podium-name">${top3[0].nome?.split(' ')[0] || 'Usuário'}</div>
            <div class="podium-points">${top3[0].total_points?.toLocaleString() || 0} XP</div>
          </div>
        ` : ''}
        ${top3.length >= 3 ? `
          <div class="podium-item third">
            ${renderAvatar(top3[2], 'normal')}
            <div class="podium-medal">🥉</div>
            <div class="podium-name">${top3[2].nome?.split(' ')[0] || 'Usuário'}</div>
            <div class="podium-points">${top3[2].total_points?.toLocaleString() || 0} XP</div>
          </div>
        ` : ''}
      </div>

      <!-- Lista do Ranking -->
      <div class="ranking-list">
        ${visibleRest.map(user => rowHtml(user)).join('')}
        ${myPositionHtml}
      </div>
    `;
  },

  /**
   * Troca o período do ranking (carrega sob demanda com estado de loading).
   */
  async setPeriod(period) {
    this.currentPeriod = period;
    const content = document.getElementById('scoring-tab-content');
    if (period !== 'geral' && !this._periodCache[period]) {
      if (content) content.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i> Calculando ranking do período...</div>';
      await this.getPeriodRanking(period);
    }
    if (content) {
      content.innerHTML = this.renderTabContent();
      this.attachRankingFilterEvents();
    }
  },

  attachRankingFilterEvents() {
    document.querySelectorAll('.period-tab').forEach(btn => {
      btn.addEventListener('click', () => this.setPeriod(btn.dataset.period));
    });
    document.getElementById('ranking-logo-filter')?.addEventListener('change', (e) => {
      this.currentLogoFilter = e.target.value;
      const content = document.getElementById('scoring-tab-content');
      if (content) {
        content.innerHTML = this.renderTabContent();
        this.attachRankingFilterEvents();
      }
    });
  },

  renderAchievements() {
    const achievements = window.NexusAchievements?.ACHIEVEMENTS || {};
    const unlocked = this.userAchievements?.unlocked || [];
    const rarityColors = window.NexusAchievements?.RARITY_COLORS || {
      'comum': '#9CA3AF', 'incomum': '#10B981', 'raro': '#3B82F6', 'épico': '#8B5CF6', 'lendário': '#F59E0B'
    };

    // Agrupar por categoria
    const categories = {
      'kanban': { name: '📋 Kanban', items: [] },
      'forum': { name: '💬 Hub de Conhecimento', items: [] },
      'streak': { name: '🔥 Streak', items: [] },
      'ranking': { name: '🏆 Ranking', items: [] }
    };

    for (const [key, ach] of Object.entries(achievements)) {
      const cat = ach.category || 'kanban';
      if (categories[cat]) {
        categories[cat].items.push({ key, ...ach, isUnlocked: unlocked.includes(key) });
      }
    }

    // Renderizar cards diretamente
    const renderCard = (ach) => {
      const rarityColor = rarityColors[ach.rarity] || '#9CA3AF';
      return `
        <div class="achievement-card ${ach.isUnlocked ? 'unlocked' : 'locked'}" data-achievement="${ach.key}">
          <div class="achievement-icon" style="background: ${ach.isUnlocked ? `linear-gradient(135deg, ${rarityColor}33, ${rarityColor}66)` : '#1e293b'}">
            ${ach.isUnlocked ? ach.icon : '🔒'}
          </div>
          <div class="achievement-info">
            <div class="achievement-name">${ach.name}</div>
            <div class="achievement-desc">${ach.description}</div>
            <div class="achievement-meta">
              <span class="achievement-rarity" style="color: ${rarityColor}">${ach.rarity.toUpperCase()}</span>
              <span class="achievement-points">+${ach.points} pts</span>
            </div>
          </div>
        </div>
      `;
    };

    return `
      <div class="achievements-grid">
        ${Object.entries(categories).map(([catKey, cat]) => `
          <div class="achievement-category">
            <h3 class="category-title">${cat.name} (${cat.items.filter(i => i.isUnlocked).length}/${cat.items.length})</h3>
            <div class="category-achievements">
              ${cat.items.map(ach => renderCard(ach)).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderHistory() {
    // Correção: as transações vivem em points_transactions (carregadas em
    // _loadUserTransactions), não no documento de pontos do usuário
    const transactions = this.userTransactions || [];

    if (transactions.length === 0) {
      return `<div class="empty-state"><p>Nenhuma transação de pontos ainda.</p></div>`;
    }

    return `
      <div class="history-list">
        ${transactions.slice(0, 30).map(t => `
          <div class="history-item">
            <div class="history-icon ${t.points > 0 ? 'positive' : 'negative'}">
              ${this.getHistoryIcon(t.action_type)}
            </div>
            <div class="history-content">
              <div class="history-title">${t.description || t.action_type}</div>
              <div class="history-date">${this.formatDate(t.created_at)}</div>
            </div>
            <div class="history-points ${t.points > 0 ? 'positive' : 'negative'}">
              ${t.points > 0 ? '+' : ''}${t.points} XP
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  getHistoryIcon(type) {
    const icons = {
      'TASK_COMPLETED': '✅',
      'TASK_ON_TIME': '⏰',
      'TASK_VALIDATED': '✔️',
      'COURSE_COMPLETED': '📚',
      'LESSON_COMPLETED': '📖',
      'QUIZ_PASSED': '🧠',
      'PODCAST_LISTENED': '🎧',
      'DAILY_LOGIN': '📅',
      'ACHIEVEMENT': '🏆',
      'PENALTY': '❌'
    };
    return icons[type] || '⭐';
  },

  attachEvents() {
    document.querySelectorAll('.scoring-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentTab = tab.dataset.tab;
        document.querySelectorAll('.scoring-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('scoring-tab-content').innerHTML = this.renderTabContent();
        if (this.currentTab === 'ranking') this.attachRankingFilterEvents();
      });
    });
    this.attachRankingFilterEvents();
  },

  getAvatarGradient(name) {
    const colors = ['#2f6fed', '#8b5cf6', '#e5533d', '#f2b705', '#2ecc71', '#ec4899', '#14b8a6', '#f97316'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  },

  getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
};

// Estilos do Scoring
const scoringStyles = document.createElement('style');
scoringStyles.textContent = `
  .scoring-page { max-width: 1000px; margin: 0 auto; padding: 20px; }
  
  .scoring-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 24px; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; }
  .user-card { display: flex; align-items: center; gap: 16px; }
  .user-avatar-large { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: white; }
  .user-main-info h2 { font-size: 22px; margin: 0 0 8px 0; color: #fff; }
  .user-badges { display: flex; gap: 10px; }
  .league-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .level-badge { background: rgba(139, 92, 246, 0.2); color: #a78bfa; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  
  .header-stats { display: flex; gap: 32px; }
  .stat-item { text-align: center; }
  .stat-value { font-size: 28px; font-weight: 800; color: #fff; }
  .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
  .stat-item.streak.hot .stat-value { color: #f97316; animation: glow-orange 1.5s ease-in-out infinite; }
  @keyframes glow-orange { 0%, 100% { text-shadow: 0 0 10px #f9731644; } 50% { text-shadow: 0 0 20px #f9731688; } }
  
  .level-progress-section { margin-bottom: 24px; padding: 20px; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; }
  .level-progress-header { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; color: #94a3b8; }
  .progress-text { font-weight: 700; color: #8b5cf6; }
  .level-progress-bar { height: 12px; background: #1e293b; border-radius: 6px; overflow: hidden; }
  .level-progress-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #6366f1); border-radius: 6px; transition: width 0.5s ease-out; }
  .level-progress-xp { text-align: center; margin-top: 10px; font-size: 12px; color: #64748b; }
  
  .daily-challenge-section { margin-bottom: 24px; }
  .daily-challenge-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(234, 88, 12, 0.1)); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; }
  .challenge-icon { font-size: 36px; }
  .challenge-desc { font-size: 15px; color: #e5e7eb; font-weight: 500; }
  .challenge-bonus { font-size: 13px; color: #10b981; font-weight: 600; margin-top: 4px; }
  
  .scoring-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
  .scoring-tab { flex: 1; padding: 12px; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; color: #94a3b8; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .scoring-tab:hover { border-color: #334155; color: #e5e7eb; }
  .scoring-tab.active { background: #1e293b; border-color: #8b5cf6; color: #fff; }
  
  .podium-section { display: flex; justify-content: center; align-items: flex-end; gap: 20px; margin-bottom: 30px; padding: 30px 0; }
  .podium-item { display: flex; flex-direction: column; align-items: center; padding: 20px; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; position: relative; }
  .podium-item.first { transform: scale(1.1); border-color: #ffd700; box-shadow: 0 0 30px rgba(255, 215, 0, 0.2); z-index: 1; }
  .podium-item.second { border-color: #c0c0c0; }
  .podium-item.third { border-color: #cd7f32; }
  .podium-avatar { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: white; margin-bottom: 10px; }
  .podium-item.first .podium-avatar { width: 80px; height: 80px; font-size: 26px; }
  .podium-medal { position: absolute; bottom: -10px; font-size: 28px; }
  .podium-crown { position: absolute; top: -20px; font-size: 24px; animation: bounce 1s ease-in-out infinite; }
  @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  .podium-name { font-weight: 600; color: #e5e7eb; margin-bottom: 4px; }
  .podium-points { font-size: 14px; color: #8b5cf6; font-weight: 600; }
  
  .ranking-list { display: flex; flex-direction: column; gap: 10px; }
  .ranking-row { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; transition: all 0.2s; }
  .ranking-row:hover { border-color: #334155; transform: translateX(4px); }
  .ranking-row.is-me { background: rgba(139, 92, 246, 0.1); border-color: #8b5cf6; }
  .ranking-pos { width: 28px; font-size: 14px; font-weight: 700; color: #64748b; }
  .ranking-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; color: white; object-fit: cover; }
  .ranking-avatar.avatar-large { width: 80px; height: 80px; font-size: 26px; }
  img.ranking-avatar { border: 2px solid #334155; }
  .ranking-info { flex: 1; min-width: 0; }
  .ranking-name { font-weight: 600; color: #e5e7eb; }
  .ranking-role { font-size: 12px; color: #64748b; }
  .ranking-league { font-size: 20px; }
  .ranking-points { font-weight: 700; color: #8b5cf6; }
  
  .achievements-grid { display: flex; flex-direction: column; gap: 24px; }
  .category-title { font-size: 16px; color: #e5e7eb; margin-bottom: 12px; }
  .category-achievements { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  
  .history-list { display: flex; flex-direction: column; gap: 10px; }
  .history-item { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; }
  .history-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 18px; border-radius: 10px; }
  .history-icon.positive { background: rgba(16, 185, 129, 0.15); }
  .history-icon.negative { background: rgba(239, 68, 68, 0.15); }
  .history-content { flex: 1; }
  .history-title { font-size: 14px; color: #e5e7eb; }
  .history-date { font-size: 11px; color: #64748b; margin-top: 2px; }
  .history-points { font-weight: 700; font-size: 15px; }
  .history-points.positive { color: #10b981; }
  .history-points.negative { color: #ef4444; }
  
  .empty-state { text-align: center; padding: 60px 20px; color: #64748b; }

  /* Filtros do ranking inteligente */
  .ranking-filters { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .period-tabs { display: flex; gap: 6px; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 4px; }
  .period-tab { padding: 8px 16px; background: transparent; border: none; border-radius: 8px; color: #94a3b8; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .period-tab:hover { color: #e5e7eb; }
  .period-tab.active { background: #8b5cf6; color: #fff; box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4); }
  .ranking-logo-filter { padding: 8px 14px; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; color: #e5e7eb; font-size: 13px; font-weight: 600; cursor: pointer; }
  .ranking-logo-filter:focus { outline: none; border-color: #8b5cf6; }
  .my-position-divider { text-align: center; color: #64748b; font-weight: 700; letter-spacing: 4px; padding: 4px 0; }
  .ranking-row.pinned-me { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.12); box-shadow: 0 0 16px rgba(139, 92, 246, 0.15); }

  [data-theme="light"] .period-tabs { background: #ffffff; border-color: #e4e7ec; }
  [data-theme="light"] .period-tab { color: #475467; }
  [data-theme="light"] .period-tab.active { background: #9333EA; color: #fff; }
  [data-theme="light"] .ranking-logo-filter { background: #ffffff; border-color: #e4e7ec; color: #101828; }
  
  .section-header { margin-bottom: 16px; }
  .section-header h3 { font-size: 16px; color: #e5e7eb; }
  
  @media (max-width: 768px) {
    .scoring-header { flex-direction: column; gap: 20px; }
    .header-stats { width: 100%; justify-content: space-around; }
    .podium-section { gap: 10px; }
    .podium-item.first { transform: scale(1.05); }
  }
`;
document.head.appendChild(scoringStyles);

window.NexusScoring = NexusScoring;
