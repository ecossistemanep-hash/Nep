/**
 * NEXUS PLATFORM - PROFILE v2.0
 * Perfil do Usuário Completo - Integrado com PointsService
 * Inclui: Banners selecionáveis, Estatísticas avançadas, Conquistas, Hierarquia
 */

const NexusProfile = {
  userData: null,
  transactions: [],
  selectedBanner: null,

  // 10 opções de banner para o usuário escolher
  BANNER_OPTIONS: [
    { id: 'gradient-blue-purple', name: 'Azul & Roxo', style: 'linear-gradient(135deg, #2f6fed 0%, #8b5cf6 100%)' },
    { id: 'gradient-green-cyan', name: 'Verde & Ciano', style: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' },
    { id: 'gradient-orange-red', name: 'Laranja & Vermelho', style: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' },
    { id: 'gradient-pink-purple', name: 'Rosa & Roxo', style: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' },
    { id: 'gradient-gold', name: 'Dourado Premium', style: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)' },
    { id: 'gradient-dark', name: 'Escuro Elegante', style: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)' },
    { id: 'gradient-neon', name: 'Neon Cyber', style: 'linear-gradient(135deg, #00f5ff 0%, #ff00ff 50%, #00ff88 100%)' },
    { id: 'gradient-sunset', name: 'Pôr do Sol', style: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #ff9ff3 100%)' },
    { id: 'gradient-ocean', name: 'Oceano Profundo', style: 'linear-gradient(135deg, #0077b6 0%, #00b4d8 50%, #90e0ef 100%)' },
    { id: 'gradient-forest', name: 'Floresta', style: 'linear-gradient(135deg, #2d6a4f 0%, #40916c 50%, #74c69d 100%)' }
  ],

  async render(container) {
    const user = NepAuth.getUser();
    this.selectedBanner = localStorage.getItem('nep_profile_banner') || 'gradient-blue-purple';
    const bannerStyle = this.BANNER_OPTIONS.find(b => b.id === this.selectedBanner)?.style || this.BANNER_OPTIONS[0].style;

    container.innerHTML = `
          <div class="profile-page animate-fade-in">
            <div class="profile-header-section">
              <div class="profile-cover" id="profile-cover" style="background: ${bannerStyle};">
                <button class="btn-change-banner" id="btn-change-banner" title="Alterar banner">
                  <i class="fa-solid fa-palette"></i>
                </button>
              </div>
              <div class="profile-info">
                <div class="profile-avatar-wrapper">
                  <div class="profile-avatar" style="background: ${NepAuth.getAvatarGradient(user.name)}" id="profile-avatar">
                    ${user.initials}
                  </div>
                  <label class="profile-avatar-edit" title="Alterar foto">
                    <i class="fa-solid fa-camera"></i>
                    <input type="file" accept="image/*" id="profile-photo-input" hidden>
                  </label>
                </div>
                <div class="profile-details">
                  <h1 class="profile-name">${user.name}</h1>
                  <p class="profile-role">
                    <span class="role-badge">${user.label}</span>
                  </p>
                  <div class="profile-segments">
                    <span class="segment-tag">${user.isAdmin ? '🛡️ Administrador' : '👤 Colaborador'}</span>
                    <span class="segment-tag">📧 ${user.email || 'email@exemplo.com'}</span>
                  </div>
                </div>
                <div class="profile-level" id="profile-level">
                  <div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
                </div>
              </div>
            </div>

            <!-- Banner Picker Modal -->
            <div class="banner-picker-modal" id="banner-picker-modal" style="display: none;">
              <div class="banner-picker-content">
                <div class="banner-picker-header">
                  <h3>🎨 Escolha seu Banner</h3>
                  <button class="btn btn-icon btn-ghost" id="close-banner-picker"><i class="fa-solid fa-xmark"></i></button>
                </div>
                
                <!-- Upload de imagem personalizada -->
                <div class="banner-upload-section">
                  <label class="banner-upload-btn" id="banner-upload-label">
                    <i class="fa-solid fa-cloud-upload-alt"></i>
                    <span>Enviar imagem personalizada</span>
                    <input type="file" accept="image/*" id="banner-image-input" hidden>
                  </label>
                  <div class="banner-upload-hint">Tamanho recomendado: 1200x300px | Máximo: 5MB</div>
                </div>
                
                <div class="banner-picker-divider">
                  <span>ou escolha um gradiente</span>
                </div>
                
                <div class="banner-picker-grid">
                  ${this.BANNER_OPTIONS.map(b => `
                    <div class="banner-option ${b.id === this.selectedBanner ? 'selected' : ''}" 
                         data-banner-id="${b.id}" 
                         style="background: ${b.style};">
                      <span class="banner-option-name">${b.name}</span>
                      ${b.id === this.selectedBanner ? '<i class="fa-solid fa-check"></i>' : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <div class="profile-content">
              <div class="profile-main">
                <!-- Quick Stats Cards -->
                <div class="profile-quick-cards" id="profile-quick-cards">
                  <div class="quick-card loading"><div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i></div></div>
                  <div class="quick-card loading"><div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i></div></div>
                  <div class="quick-card loading"><div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i></div></div>
                  <div class="quick-card loading"><div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i></div></div>
                </div>

                <div class="profile-section" id="profile-stats-section">
                  <h3 class="section-title">📊 Carregando estatísticas...</h3>
                </div>

                <div class="profile-section" id="profile-history-section">
                  <h3 class="section-title">📈 Histórico de Pontos</h3>
                  <div id="points-history-list" class="history-list">
                    <div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
                  </div>
                </div>

                <div class="profile-section" id="profile-achievements-section">
                  <h3 class="section-title">🏅 Conquistas</h3>
                  <div id="achievements-grid" class="achievements-grid"></div>
                </div>
              </div>

              <div class="profile-sidebar">
                <div class="profile-section">
                  <h3 class="section-title">🎯 Nível e Progresso</h3>
                  <div id="level-progress-section">
                    <div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
                  </div>
                </div>

                <div class="profile-section">
                  <h3 class="section-title">👥 Hierarquia</h3>
                  <div class="hierarchy-list">
                    ${this.getHierarchy().map(h => `
                      <div class="hierarchy-item ${h.current ? 'current' : ''}">
                        <div class="hierarchy-level">${h.levelNum}</div>
                        <div class="hierarchy-info">
                          <div class="hierarchy-role">${h.role}</div>
                          ${h.name ? `<div class="hierarchy-name">${h.name}</div>` : ''}
                        </div>
                        ${h.current ? '<span class="you-badge">Você</span>' : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>

                <div class="profile-section" id="profile-quick-stats">
                  <h3 class="section-title">📈 Estatísticas Rápidas</h3>
                  <div id="quick-stats-list" class="stats-list">
                    <div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
                  </div>
                </div>

                <div class="profile-section">
                  <h3 class="section-title">⚙️ Preferências</h3>
                  <div class="preferences-list">
                    <div class="pref-item">
                      <span>🎨 Banner do Perfil</span>
                      <button class="btn btn-sm btn-ghost" id="btn-change-banner-alt">Alterar</button>
                    </div>
                    <div class="pref-item">
                      <span>📷 Foto de Perfil</span>
                      <label class="btn btn-sm btn-ghost" style="cursor: pointer;">
                        Alterar
                        <input type="file" accept="image/*" id="profile-photo-input-alt" hidden>
                      </label>
                    </div>
                    <div class="pref-item">
                      <span>🔔 Notificações Push</span>
                      <button class="btn btn-sm btn-ghost" id="btn-toggle-push" onclick="NexusProfile.togglePushNotifications()">
                        ${window.NexusPWA?.pushPermission === 'granted' ? '✅ Ativadas' : 'Ativar'}
                      </button>
                    </div>
                    <div class="pref-item" id="pwa-install-pref" style="${window.NexusPWA?.isInstalled ? 'display:none;' : ''}">
                      <span>📱 Instalar App</span>
                      <button class="btn btn-sm btn-ghost" id="btn-install-pwa" onclick="NexusPWA.promptInstall()">Instalar</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

    this.attachEvents();
    await this.loadUserData();
  },

  async loadUserData() {
    const currentUid = localStorage.getItem('nep_user_uid');
    const db = window.db;

    // 1) Carregar pontos do usuário + listener em tempo real
    try {
      if (db && currentUid) {
        // Leitura inicial
        const pointsDoc = await db.collection('user_points').doc(currentUid).get();
        if (pointsDoc.exists) {
          this.userData = pointsDoc.data();
        } else {
          this.userData = { total_points: 0, level: 1 };
        }

        // Listener em tempo real para atualizar pontos automaticamente
        if (this._pointsUnsub) this._pointsUnsub();
        this._pointsUnsub = db.collection('user_points').doc(currentUid)
          .onSnapshot(snap => {
            if (snap.exists) {
              const newData = snap.data();
              const changed = (newData.total_points !== this.userData?.total_points) ||
                (newData.level !== this.userData?.level);
              this.userData = newData;
              if (changed) {
                console.log('[Profile] 🔄 Pontos atualizados em tempo real:', newData.total_points);
                this.renderQuickCards();
                this.renderUserLevel();
                this.renderLevelProgress();
                this.renderStats();
              }
            }
          }, err => console.warn('[Profile] Erro no listener de pontos:', err));
      } else {
        this.userData = { total_points: 0, level: 1 };
      }
    } catch (e) {
      console.warn('[Profile] Erro ao carregar pontos:', e);
      this.userData = { total_points: 0, level: 1 };
    }

    // 2) Carregar transações (direto do Firestore compat API)
    try {
      if (db && currentUid) {
        const snap = await db.collection('points_transactions')
          .where('uid', '==', currentUid)
          .orderBy('timestamp', 'desc')
          .limit(50)
          .get();

        this.transactions = snap.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            // Normalizar campos (NexusGamification usa type/amount/timestamp)
            points: data.points || data.amount || 0,
            action_type: data.action_type || data.type || 'OTHER',
            action_label: data.action_label || data.description || data.type || 'Pontos',
            created_at: data.created_at?.toDate?.()?.toLocaleString('pt-BR')
              || (data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString('pt-BR') : 'N/A')
          };
        });
      } else {
        this.transactions = [];
      }
    } catch (e) {
      console.warn('[Profile] Erro ao carregar transações:', e);
      this.transactions = [];
    }

    // 3) Carregar conquistas reais do Firestore
    try {
      if (window.NexusAchievements && currentUid) {
        this.achievementsData = await window.NexusAchievements.getUserAchievements(currentUid);
        // Retroativo: se unlocked vazio e tem pontos, calcular
        if ((!this.achievementsData.unlocked || this.achievementsData.unlocked.length === 0) && (this.userData?.total_points || 0) > 0) {
          console.log('[Profile] Calculando conquistas retroativas...');
          const retro = await window.NexusAchievements.calculateRetroactiveStats(currentUid);
          if (retro) this.achievementsData = await window.NexusAchievements.getUserAchievements(currentUid);
        }
      } else {
        this.achievementsData = { unlocked: [], stats: {} };
      }
    } catch (e) {
      console.warn('[Profile] Erro ao carregar conquistas:', e);
      this.achievementsData = { unlocked: [], stats: {} };
    }

    // 4) Composição retroativa: se transactions não cobre o total, inferir de stats
    this._buildRetroactiveComposition();

    this.renderQuickCards();
    this.renderUserLevel();
    this.renderLevelProgress();
    this.renderStats();
    this.renderHistory();
    this.renderAchievements();
  },

  /**
   * Constrói composição retroativa de pontos quando as transações
   * não cobrem o total (sistema já estava em uso antes do logging).
   * Usa o POINTS_RULES do NexusGamification para estimar pontos por categoria.
   */
  _buildRetroactiveComposition() {
    const totalPoints = this.userData?.total_points || 0;
    const transactionsTotal = this.transactions.reduce((acc, t) => acc + (t.points || t.amount || 0), 0);
    const gap = totalPoints - transactionsTotal;

    if (gap <= 0 || !totalPoints) return; // Transações já cobrem tudo

    const stats = this.achievementsData?.stats || {};

    // Estimar pontos por categoria usando as regras de gamificação conhecidas
    const RULES = {
      TASK_COMPLETED: 20,       // COMPLETE_TASK no gamification
      TASK_VALIDATED: 5,
      SEND_TESTIMONIAL: 10,
      RECEIVE_TESTIMONIAL: 50,
      FORUM_TOPIC: 5,
      FORUM_REPLY: 3,
      ROUTINE_COMPLETED: 10,
      REPORT_SENT: 5,
    };

    const estimatedPoints = {
      TASK_COMPLETED: (stats.tasks_completed || 0) * RULES.TASK_COMPLETED,
      SEND_TESTIMONIAL: (stats.testimonials_sent || 0) * RULES.SEND_TESTIMONIAL,
      RECEIVE_TESTIMONIAL: (stats.testimonials_received || 0) * RULES.RECEIVE_TESTIMONIAL,
      FORUM_TOPIC: (stats.forum_topics || 0) * RULES.FORUM_TOPIC,
      FORUM_REPLY: (stats.forum_replies || 0) * RULES.FORUM_REPLY,
      ROUTINE_COMPLETED: (stats.routines_completed || 0) * RULES.ROUTINE_COMPLETED,
      REPORT_SENT: (stats.reports_sent || 0) * RULES.REPORT_SENT,
    };

    // Subtrair o que já está nas transações por tipo
    const txByType = {};
    this.transactions.forEach(t => {
      let type = t.action_type || t.type || 'OTHER';
      if (type === 'COMPLETE_TASK') type = 'TASK_COMPLETED';
      txByType[type] = (txByType[type] || 0) + (t.points || t.amount || 0);
    });

    // Criar transações retroativas sintéticas para o gap
    const retroTransactions = [];
    for (const [type, estimated] of Object.entries(estimatedPoints)) {
      const alreadyCovered = txByType[type] || 0;
      const remaining = Math.max(0, estimated - alreadyCovered);
      if (remaining > 0) {
        retroTransactions.push({
          points: remaining,
          action_type: type,
          action_label: this._getRetroLabel(type),
          created_at: 'Retroativo',
          _retroactive: true
        });
      }
    }

    // Adiciona as retroativas ao início da lista (mostradas no final)
    this.transactions = [...this.transactions, ...retroTransactions];

    console.log(`[Profile] Composição retroativa: ${retroTransactions.length} categorias inferidas, gap=${gap}`);
  },

  _getRetroLabel(type) {
    const labels = {
      'TASK_COMPLETED': '📋 Kanban (retroativo)',
      'SEND_TESTIMONIAL': '❤️ Depoimentos Enviados (retroativo)',
      'RECEIVE_TESTIMONIAL': '❤️ Depoimentos Recebidos (retroativo)',
      'FORUM_TOPIC': '💬 Tópicos Fórum (retroativo)',
      'FORUM_REPLY': '💬 Respostas Fórum (retroativo)',
      'ROUTINE_COMPLETED': '📅 Rotina ADM (retroativo)',
      'REPORT_SENT': '📝 Relatórios (retroativo)',
    };
    return labels[type] || type;
  },

  // Level/badge helpers (inline - eliminates PointsService dependency)
  _LEVEL_THRESHOLDS: [0, 50, 150, 300, 500, 800, 1200, 1700, 2500, 3500],
  _LEVEL_BADGES: [
    { name: 'Iniciante', icon: '🌱', color: '#6b7280' },
    { name: 'Aprendiz', icon: '📗', color: '#10b981' },
    { name: 'Praticante', icon: '⭐', color: '#3b82f6' },
    { name: 'Competente', icon: '🏅', color: '#8b5cf6' },
    { name: 'Proficiente', icon: '💎', color: '#06b6d4' },
    { name: 'Especialista', icon: '🔥', color: '#f59e0b' },
    { name: 'Mestre', icon: '👑', color: '#d97706' },
    { name: 'Grão-Mestre', icon: '🏆', color: '#dc2626' },
    { name: 'Lenda', icon: '⚡', color: '#7c3aed' },
    { name: 'Transcendente', icon: '🌟', color: '#f43f5e' },
  ],

  _getLevelBadge(level) {
    const idx = Math.max(0, Math.min((level || 1) - 1, this._LEVEL_BADGES.length - 1));
    return this._LEVEL_BADGES[idx];
  },

  _getNextLevelInfo(points) {
    const thresholds = this._LEVEL_THRESHOLDS;
    let currentLevel = 1;
    for (let i = 1; i < thresholds.length; i++) {
      if (points >= thresholds[i]) currentLevel = i + 1;
      else break;
    }
    if (currentLevel >= thresholds.length) {
      return { nextLevel: currentLevel, pointsNeeded: 0, progress: 100, pointsToNext: 0 };
    }
    const currentThreshold = thresholds[currentLevel - 1];
    const nextThreshold = thresholds[currentLevel];
    const progressInLevel = points - currentThreshold;
    const levelRange = nextThreshold - currentThreshold;
    const progress = Math.min(100, Math.round((progressInLevel / levelRange) * 100));
    return {
      nextLevel: currentLevel + 1,
      pointsNeeded: nextThreshold,
      progress,
      pointsToNext: nextThreshold - points
    };
  },

  renderQuickCards() {
    const container = document.getElementById('profile-quick-cards');
    if (!container) return;

    const points = this.userData?.total_points || 0;
    const level = this.userData?.level || 1;
    const totalAchievements = Object.keys(window.NexusAchievements?.ACHIEVEMENTS || {}).length || 44;
    const unlockedCount = this.achievementsData?.unlocked?.length || 0;
    const levelBadge = window.PointsService?.getLevelBadge?.(level) || { name: 'Iniciante', icon: '🌱', color: '#6b7280' };

    container.innerHTML = `
      <div class="quick-card">
        <div class="quick-card-icon" style="background: linear-gradient(135deg, #8b5cf6, #6366f1);">🏆</div>
        <div class="quick-card-info">
          <div class="quick-card-value">${points.toLocaleString()}</div>
          <div class="quick-card-label">Pontos Totais</div>
        </div>
      </div>
      <div class="quick-card">
        <div class="quick-card-icon" style="background: linear-gradient(135deg, ${levelBadge.color}, ${levelBadge.color}88);">${levelBadge.icon}</div>
        <div class="quick-card-info">
          <div class="quick-card-value">Nível ${level}</div>
          <div class="quick-card-label">${levelBadge.name}</div>
        </div>
      </div>
      <div class="quick-card">
        <div class="quick-card-icon" style="background: linear-gradient(135deg, #10b981, #059669);">✅</div>
        <div class="quick-card-info">
          <div class="quick-card-value">${this.achievementsData?.stats?.tasks_completed || 0}</div>
          <div class="quick-card-label">Tarefas Concluídas</div>
        </div>
      </div>
      <div class="quick-card">
        <div class="quick-card-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">🔥</div>
        <div class="quick-card-info">
          <div class="quick-card-value">${unlockedCount}/${totalAchievements}</div>
          <div class="quick-card-label">Conquistas</div>
        </div>
      </div>
    `;
  },

  renderUserLevel() {
    const container = document.getElementById('profile-level');
    if (!container || !this.userData) return;

    const level = this.userData.level || 1;
    const points = this.userData.total_points || 0;
    const levelBadge = this._getLevelBadge(level);
    const nextLevelInfo = this._getNextLevelInfo(points);

    container.innerHTML = `
          <div class="level-badge" style="background: linear-gradient(135deg, ${levelBadge.color}, ${levelBadge.color}88);">
            <span class="level-icon">${levelBadge.icon}</span>
            <span class="level-name">${levelBadge.name}</span>
          </div>
          <div class="level-points">${points.toLocaleString()} pontos</div>
          <div class="level-progress-mini">
            <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 8px;">
              ${nextLevelInfo.progress < 100 ? `${nextLevelInfo.progress}% para Nível ${nextLevelInfo.nextLevel}` : 'Nível máximo!'}
            </div>
          </div>
        `;
  },

  renderLevelProgress() {
    const container = document.getElementById('level-progress-section');
    if (!container) return;

    const points = this.userData?.total_points || 0;
    const level = this.userData?.level || 1;
    const nextLevelInfo = this._getNextLevelInfo(points);
    const levelBadge = this._getLevelBadge(level);

    container.innerHTML = `
      <div class="level-detail-card">
        <div class="level-current">
          <div class="level-icon-big" style="background: linear-gradient(135deg, ${levelBadge.color}, ${levelBadge.color}88);">
            ${levelBadge.icon}
          </div>
          <div class="level-info">
            <div class="level-title">${levelBadge.name}</div>
            <div class="level-subtitle">Nível ${level}</div>
          </div>
        </div>
        <div class="level-progress-bar">
          <div class="level-progress-fill" style="width: ${nextLevelInfo.progress}%;"></div>
        </div>
        <div class="level-progress-text">
          <span>${points.toLocaleString()} pts</span>
          <span>${nextLevelInfo.progress < 100 ? `${nextLevelInfo.pointsToNext} pts para próximo nível` : '🎉 Nível máximo atingido!'}</span>
        </div>
      </div>
    `;
  },

  renderStats() {
    const statsSection = document.getElementById('profile-stats-section');
    const quickStats = document.getElementById('quick-stats-list');
    if (!statsSection) return;

    const points = this.userData?.total_points || 0;
    const level = this.userData?.level || 1;
    const stats = this.achievementsData?.stats || {};

    // Calcular pontos por fonte usando transações
    // Normalizar transações (NexusGamification usa 'type'/'amount', PointsService usa 'action_type'/'points')
    const pointsByType = {};
    this.transactions.forEach(t => {
      let type = t.action_type || t.type || 'OTHER';
      const pts = t.points || t.amount || 0;

      // Mapear tipos equivalentes
      if (type === 'COMPLETE_TASK') type = 'TASK_COMPLETED';
      if (type === 'CreateTask') type = 'TASK_CREATED';
      // TASK_VALIDATED é mantido como categoria própria (NÃO misturar com TASK_COMPLETED)

      // Ignorar transações de Podcast (não devem aparecer na composição)
      if (type === 'PODCAST_EPISODE' || type === 'QUIZ_PASSED') return;

      pointsByType[type] = (pointsByType[type] || 0) + pts;
    });

    const kanbanPts = (pointsByType['TASK_COMPLETED'] || 0) + (pointsByType['TASK_CREATED'] || 0) + (pointsByType['TASK_VALIDATED'] || 0);
    const forumPts = (pointsByType['FORUM_TOPIC'] || 0) + (pointsByType['FORUM_REPLY'] || 0) + (pointsByType['FORUM_SOLUTION'] || 0) + (pointsByType['FORUM_POST'] || 0);
    const socialPts = (pointsByType['SEND_TESTIMONIAL'] || 0) + (pointsByType['RECEIVE_TESTIMONIAL'] || 0);
    const routinePts = (pointsByType['ROUTINE_COMPLETED'] || 0);
    const reportsPts = (pointsByType['REPORT_SENT'] || 0);
    const ticketPts = (pointsByType['TICKET_CREATED'] || 0) + (pointsByType['TICKET_RESOLVED'] || 0);
    const coursePts = (pointsByType['MODULE_COMPLETED'] || 0) + (pointsByType['COURSE_COMPLETED'] || 0);
    const achievementPts = (pointsByType['ACHIEVEMENT'] || 0);
    const otherPts = Math.max(0, points - kanbanPts - forumPts - socialPts - routinePts - reportsPts - ticketPts - coursePts - achievementPts);

    const sources = [
      { icon: '📋', label: 'Kanban', value: `${stats.tasks_completed || 0} tarefas`, pts: kanbanPts, color: '#2f6fed' },
      { icon: '💬', label: 'Fórum', value: `${(stats.forum_topics || 0) + (stats.forum_replies || 0)} posts`, pts: forumPts, color: '#10B981' },
      { icon: '❤️', label: 'Social', value: `${(stats.testimonials_sent || 0) + (stats.testimonials_received || 0)} depoimentos`, pts: socialPts, color: '#EC4899' },
      { icon: '🎫', label: 'Chamados', value: `${(stats.tickets_created || 0) + (stats.tickets_resolved || 0)} tickets`, pts: ticketPts, color: '#8B5CF6' },
      { icon: '📚', label: 'Cursos', value: `${stats.courses_completed || 0} cursos`, pts: coursePts, color: '#F97316' },
      { icon: '🏆', label: 'Conquistas', value: `${this.achievementsData?.unlocked?.length || 0} desbloqueadas`, pts: achievementPts, color: '#FBBF24' },
      { icon: '📅', label: 'Rotina ADM', value: `${stats.routines_completed || 0} dias`, pts: routinePts, color: '#06B6D4' },
      { icon: '📝', label: 'Relatórios', value: `${stats.reports_sent || 0} enviados`, pts: reportsPts, color: '#6366F1' }
    ].filter(s => s.pts > 0);

    let html = `<h3 class="section-title">📊 Composição da Pontuação</h3><div class="score-breakdown">`;

    sources.forEach(s => {
      html += `
        <div class="score-item">
          <div class="score-source"><span class="score-icon">${s.icon}</span><span>${s.label}</span></div>
          <div class="score-bar"><div class="score-fill" style="width: ${Math.min(100, (s.pts / Math.max(points, 1)) * 100)}%; background: ${s.color};"></div></div>
          <span class="score-value">${s.pts} pts</span>
        </div>`;
    });

    if (otherPts > 0) {
      html += `
        <div class="score-item">
          <div class="score-source"><span class="score-icon">💾</span><span>Histórico / Outros</span></div>
          <div class="score-bar"><div class="score-fill" style="width: ${Math.min(100, (otherPts / Math.max(points, 1)) * 100)}%; background: #64748b;"></div></div>
          <span class="score-value">${otherPts} pts</span>
        </div>`;
    }

    html += `
        <div class="score-item">
          <div class="score-source"><span class="score-icon">🏆</span><span>Total</span></div>
          <div class="score-bar"><div class="score-fill" style="width: 100%; background: linear-gradient(90deg, #f2b705, #d97706);"></div></div>
          <span class="score-value">${points.toLocaleString()} pts</span>
        </div>
      </div>`;

    statsSection.innerHTML = html;

    if (quickStats) {
      const totalAch = Object.keys(window.NexusAchievements?.ACHIEVEMENTS || {}).length || 44;
      const unlockedAch = this.achievementsData?.unlocked?.length || 0;

      quickStats.innerHTML = `
        <div class="stat-row"><span class="stat-name">Pontos Totais</span><span class="stat-val">${points.toLocaleString()}</span></div>
        <div class="stat-row"><span class="stat-name">Nível Atual</span><span class="stat-val">Nível ${level}</span></div>
        <div class="stat-row"><span class="stat-name">Tarefas Concluídas</span><span class="stat-val">${stats.tasks_completed || 0}</span></div>
        <div class="stat-row"><span class="stat-name">Streak</span><span class="stat-val">${stats.streak || 0} 🔥</span></div>
        <div class="stat-row"><span class="stat-name">Conquistas</span><span class="stat-val">${unlockedAch}/${totalAch}</span></div>
      `;
    }
  },

  renderHistory() {
    const container = document.getElementById('points-history-list');
    if (!container) return;

    // Calculate Legacy Points again for history context
    const points = this.userData?.total_points || 0;
    const knownPoints = this.transactions.reduce((acc, t) => acc + (t.points || t.amount || 0), 0);
    const legacyPoints = Math.max(0, points - knownPoints);

    let displayList = [...this.transactions];

    // Se tiver pontos de legado/migração e histórico vazio (ou parcial), adiciona entrada visual
    if (legacyPoints > 0) {
      displayList.push({
        points: legacyPoints,
        action_type: 'MIGRATION',
        action_label: 'Histórico / Migração',
        created_at: 'Anterior'
      });
    }

    if (displayList.length === 0) {
      container.innerHTML = `
              <div class="no-trails">
                <span>📈</span>
                <p>Nenhuma transação de pontos ainda</p>
                <p style="font-size: 12px; color: var(--text-tertiary);">Complete tarefas no Kanban ou participe do Fórum para ganhar pontos!</p>
              </div>
            `;
      return;
    }

    container.innerHTML = displayList.map(t => {
      const pts = t.points || t.amount || 0;
      const label = t.action_label || t.description || t.action_type || t.type || 'Pontos';
      const date = t.created_at || (t.timestamp?.toDate ? t.timestamp.toDate().toLocaleString('pt-BR') : 'N/A');
      return `
          <div class="history-item">
            <div class="history-icon ${pts > 0 ? 'success' : 'warning'}">
              ${pts > 0 ? '⬆️' : '⬇️'}
            </div>
            <div class="history-content">
              <div class="history-description">${label}</div>
              <div class="history-date">${date}</div>
            </div>
            <div class="history-points" style="color: ${pts > 0 ? 'var(--success-500)' : 'var(--error-500)'}">
              ${pts > 0 ? '+' : ''}${pts}
            </div>
          </div>`;
    }).join('');
  },

  renderAchievements() {
    const container = document.getElementById('achievements-grid');
    if (!container) return;

    const unlocked = this.achievementsData?.unlocked || [];
    const allAchievements = window.NexusAchievements?.ACHIEVEMENTS || {};
    const categories = window.NexusAchievements?.CATEGORIES || {};

    if (Object.keys(allAchievements).length === 0) {
      container.innerHTML = '<p style="color: var(--text-tertiary);">Sistema de conquistas indisponível</p>';
      return;
    }

    // Agrupar por categoria
    const grouped = {};
    for (const [key, ach] of Object.entries(allAchievements)) {
      const cat = ach.category || 'outros';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ key, ...ach, isUnlocked: unlocked.includes(key) });
    }

    // Ordenar: desbloqueadas primeiro
    let html = '';
    for (const [catKey, items] of Object.entries(grouped)) {
      const catInfo = categories[catKey] || { name: catKey, icon: '🏅', color: '#9CA3AF' };
      const unlockedInCat = items.filter(i => i.isUnlocked).length;
      html += `
        <div class="achievement-category-header" style="display: flex; align-items: center; gap: 8px; margin-top: 16px; margin-bottom: 10px;">
          <span style="font-size: 18px;">${catInfo.icon}</span>
          <span style="font-weight: 600; color: ${catInfo.color};">${catInfo.name}</span>
          <span style="font-size: 12px; color: var(--text-tertiary); margin-left: auto;">${unlockedInCat}/${items.length}</span>
        </div>`;

      const sorted = [...items].sort((a, b) => (b.isUnlocked ? 1 : 0) - (a.isUnlocked ? 1 : 0));
      html += sorted.map(a => window.NexusAchievements.renderAchievementCard(a.key, a.isUnlocked)).join('');
    }

    container.innerHTML = html;
  },

  getHierarchy() {
    const user = NepAuth.getUser();

    return [
      { levelNum: 5, role: 'Superintendente', name: '', level: 5, current: user.roleKey === 'superintendente' },
      { levelNum: 4, role: 'Gerente', name: '', level: 4, current: user.roleKey === 'gerente' },
      { levelNum: 3, role: 'Consultor', name: '', level: 3, current: user.roleKey === 'consultor' },
      { levelNum: 2, role: 'Coordenador', name: '', level: 2, current: user.roleKey === 'coordenador' },
      { levelNum: 1, role: 'Analista', name: '', level: 1, current: user.roleKey === 'analista' },
      { levelNum: 0, role: 'Monitor', name: '', level: 0, current: user.roleKey === 'monitor' }
    ];
  },

  openBannerPicker() {
    const modal = document.getElementById('banner-picker-modal');
    if (modal) modal.style.display = 'flex';
  },

  closeBannerPicker() {
    const modal = document.getElementById('banner-picker-modal');
    if (modal) modal.style.display = 'none';
  },

  selectBanner(bannerId) {
    this.selectedBanner = bannerId;
    localStorage.setItem('nep_profile_banner', bannerId);
    // Remove custom image if selecting gradient
    localStorage.removeItem('nep_profile_banner_image');

    const banner = this.BANNER_OPTIONS.find(b => b.id === bannerId);
    const cover = document.getElementById('profile-cover');
    if (cover && banner) {
      cover.style.background = banner.style;
      cover.style.backgroundImage = 'none';
    }

    // Update picker UI
    document.querySelectorAll('.banner-option').forEach(opt => {
      opt.classList.remove('selected');
      opt.querySelector('.fa-check')?.remove();
    });
    const selected = document.querySelector(`[data-banner-id="${bannerId}"]`);
    if (selected) {
      selected.classList.add('selected');
      selected.innerHTML += '<i class="fa-solid fa-check"></i>';
    }

    this.closeBannerPicker();
    NepApp?.showToast?.('Banner atualizado!', 'success');
  },

  async uploadBannerImage(file) {
    const cover = document.getElementById('profile-cover');
    const uploadLabel = document.getElementById('banner-upload-label');
    const originalContent = uploadLabel?.innerHTML;

    // Validação
    if (file.size > 5 * 1024 * 1024) {
      NepApp?.showToast?.('Imagem muito grande! Máximo 5MB', 'error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      NepApp?.showToast?.('Arquivo deve ser uma imagem', 'error');
      return;
    }

    // Loading state
    if (uploadLabel) {
      uploadLabel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Enviando...</span>';
    }

    try {
      // Tenta upload para Supabase
      if (window.StorageService && window.SupabaseClient?.isReady) {
        const uid = localStorage.getItem('nep_user_uid');
        const fileName = `banner_${uid}_${Date.now()}.jpg`;

        // Comprimir imagem
        let fileToUpload = file;
        try {
          const compressedBlob = await StorageService.compressImage(file, {
            maxWidth: 1920,
            maxHeight: 600,
            quality: 0.85
          });
          fileToUpload = new File([compressedBlob], fileName, { type: 'image/jpeg' });
        } catch (e) {
          console.warn('[Profile] Compressão do banner falhou, usando original');
        }

        const bannerUrl = await StorageService.uploadAvatar(fileToUpload);

        // Aplica banner
        if (cover) {
          cover.style.backgroundImage = `url(${bannerUrl})`;
          cover.style.backgroundSize = 'cover';
          cover.style.backgroundPosition = 'center';
        }

        // Salva URL
        localStorage.setItem('nep_profile_banner_image', bannerUrl);
        localStorage.removeItem('nep_profile_banner');
        this.selectedBanner = null;

        // Salva no Firestore também
        if (window.db && uid) {
          try {
            await window.db.collection('users').doc(uid).update({ bannerURL: bannerUrl });
          } catch (e) {
            console.warn('[Profile] Erro ao salvar banner no Firestore:', e);
          }
        }

        NepApp?.showToast?.('Banner personalizado salvo! ☁️', 'success');
        this.closeBannerPicker();

      } else {
        // Fallback localStorage
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (cover) {
            cover.style.backgroundImage = `url(${ev.target.result})`;
            cover.style.backgroundSize = 'cover';
            cover.style.backgroundPosition = 'center';
          }
          localStorage.setItem('nep_profile_banner_image', ev.target.result);
          localStorage.removeItem('nep_profile_banner');
          this.selectedBanner = null;
          NepApp?.showToast?.('Banner salvo localmente!', 'success');
          this.closeBannerPicker();
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('[Profile] Erro upload banner:', error);
      NepApp?.showToast?.('Erro ao enviar banner: ' + error.message, 'error');
    } finally {
      if (uploadLabel && originalContent) {
        uploadLabel.innerHTML = originalContent;
      }
    }
  },

  async togglePushNotifications() {
    if (!window.NexusPWA) {
      NepApp?.showToast?.('PWA não disponível', 'error');
      return;
    }

    const btn = document.getElementById('btn-toggle-push');

    if (window.NexusPWA.pushPermission === 'granted') {
      NepApp?.showToast?.('Notificações já estão ativadas!', 'info');
      return;
    }

    if (window.NexusPWA.pushPermission === 'denied') {
      NepApp?.showToast?.('Permissão negada. Ative nas configurações do navegador.', 'warning');
      return;
    }

    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      btn.disabled = true;
    }

    try {
      const permission = await window.NexusPWA.requestPushPermission();

      if (permission === 'granted') {
        NepApp?.showToast?.('Notificações ativadas! 🔔', 'success');
        if (btn) btn.innerHTML = '✅ Ativadas';
      } else if (permission === 'denied') {
        NepApp?.showToast?.('Permissão negada pelo navegador', 'error');
        if (btn) btn.innerHTML = 'Bloqueadas';
      } else {
        if (btn) btn.innerHTML = 'Ativar';
      }
    } catch (error) {
      console.error('[Profile] Push notification error:', error);
      NepApp?.showToast?.('Erro ao ativar notificações', 'error');
      if (btn) btn.innerHTML = 'Ativar';
    }

    if (btn) btn.disabled = false;
  },

  /**
   * Carrega foto salva - Prioriza Firestore (Supabase URL), depois localStorage
   */
  async loadSavedPhoto() {
    const avatar = document.getElementById('profile-avatar');
    if (!avatar) return;

    const uid = localStorage.getItem('nep_user_uid');
    let photoUrl = null;

    // 1. Tenta buscar do Firestore (URL do Supabase)
    if (window.db && uid) {
      try {
        const userDoc = await window.db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          photoUrl = userDoc.data()?.photoURL;
        }
      } catch (e) {
        console.warn('[Profile] Não foi possível buscar foto do Firestore:', e);
      }
    }

    // 2. Fallback para localStorage
    if (!photoUrl) {
      photoUrl = localStorage.getItem('nexus_profile_photo');
    }

    // 3. Aplica a foto se encontrada
    if (photoUrl) {
      avatar.style.backgroundImage = `url(${photoUrl})`;
      avatar.style.backgroundSize = 'cover';
      avatar.textContent = '';
      console.log('[Profile] 📷 Foto carregada:', photoUrl.substring(0, 50) + '...');
    }
  },

  attachEvents() {
    // Change photo - Integrado com Supabase Storage
    const photoInputs = [
      document.getElementById('profile-photo-input'),
      document.getElementById('profile-photo-input-alt')
    ];

    photoInputs.forEach(input => {
      input?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validações
        if (file.size > 2 * 1024 * 1024) {
          NepApp?.showToast?.('Imagem muito grande! Máximo 2MB', 'error');
          return;
        }

        if (!file.type.startsWith('image/')) {
          NepApp?.showToast?.('Arquivo deve ser uma imagem', 'error');
          return;
        }

        const avatar = document.getElementById('profile-avatar');
        const originalContent = avatar?.innerHTML;

        // Mostra loading
        if (avatar) {
          avatar.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size: 32px;"></i>';
        }

        try {
          // Tenta usar Supabase Storage se disponível
          if (window.StorageService && window.SupabaseClient?.isReady) {
            // Comprimir imagem antes do upload
            let fileToUpload = file;
            try {
              const compressedBlob = await StorageService.compressImage(file, {
                maxWidth: 512,
                maxHeight: 512,
                quality: 0.85
              });
              fileToUpload = new File([compressedBlob], file.name, { type: 'image/jpeg' });
            } catch (compressErr) {
              console.warn('[Profile] Compressão falhou, usando original:', compressErr);
            }

            // Upload para Supabase
            const photoUrl = await StorageService.uploadAvatar(fileToUpload);

            // Atualiza UI
            if (avatar) {
              avatar.style.backgroundImage = `url(${photoUrl})`;
              avatar.style.backgroundSize = 'cover';
              avatar.textContent = '';
            }

            // Limpa localStorage antigo se existir
            localStorage.removeItem('nexus_profile_photo');

            NepApp?.showToast?.('Foto atualizada e sincronizada! ☁️', 'success');
            console.log('[Profile] ✅ Foto salva no Supabase:', photoUrl);

          } else {
            // Fallback para localStorage se Supabase não está configurado
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (avatar) {
                avatar.style.backgroundImage = `url(${ev.target.result})`;
                avatar.style.backgroundSize = 'cover';
                avatar.textContent = '';
              }
              localStorage.setItem('nexus_profile_photo', ev.target.result);
              NepApp?.showToast?.('Foto atualizada!', 'success');
              console.log('[Profile] ℹ️ Foto salva localmente (Supabase não configurado)');
            };
            reader.readAsDataURL(file);
          }

        } catch (error) {
          console.error('[Profile] Erro no upload:', error);
          NepApp?.showToast?.('Erro ao enviar foto: ' + error.message, 'error');

          // Restaura estado anterior
          if (avatar && originalContent) {
            avatar.innerHTML = originalContent;
          }
        }
      });
    });

    // Load saved photo - Prioriza Firestore, depois localStorage
    this.loadSavedPhoto();

    // Carrega banner salvo (imagem ou gradiente)
    this.loadSavedBanner();

    // Banner picker
    document.getElementById('btn-change-banner')?.addEventListener('click', () => this.openBannerPicker());
    document.getElementById('btn-change-banner-alt')?.addEventListener('click', () => this.openBannerPicker());
    document.getElementById('close-banner-picker')?.addEventListener('click', () => this.closeBannerPicker());

    // Banner image upload
    document.getElementById('banner-image-input')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await this.uploadBannerImage(file);
      }
    });

    // Banner options
    document.querySelectorAll('.banner-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const bannerId = opt.dataset.bannerId;
        this.selectBanner(bannerId);
      });
    });

    // Close modal on backdrop click
    document.getElementById('banner-picker-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'banner-picker-modal') {
        this.closeBannerPicker();
      }
    });
  },

  async loadSavedBanner() {
    const cover = document.getElementById('profile-cover');
    if (!cover) return;

    const uid = localStorage.getItem('nep_user_uid');
    let bannerUrl = null;

    // 1. Tenta buscar URL do Firestore
    if (window.db && uid) {
      try {
        const userDoc = await window.db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          bannerUrl = userDoc.data()?.bannerURL;
        }
      } catch (e) {
        console.warn('[Profile] Não foi possível buscar banner do Firestore:', e);
      }
    }

    // 2. Fallback para localStorage (imagem)
    if (!bannerUrl) {
      bannerUrl = localStorage.getItem('nep_profile_banner_image');
    }

    // 3. Aplica imagem personalizada se encontrada
    if (bannerUrl) {
      cover.style.backgroundImage = `url(${bannerUrl})`;
      cover.style.backgroundSize = 'cover';
      cover.style.backgroundPosition = 'center';
      console.log('[Profile] 🖼️ Banner personalizado carregado');
    }
  }
};

// Profile Styles v2.0
const profileStyles = document.createElement('style');
profileStyles.textContent = `
  .profile-page { max-width: 1200px; margin: 0 auto; }
  
  .profile-header-section {
    position: relative;
    margin-bottom: var(--space-6);
  }
  
  .profile-cover {
    height: 180px;
    background: linear-gradient(135deg, #2f6fed, #8b5cf6);
    border-radius: var(--radius-xl);
    position: relative;
    overflow: hidden;
  }
  
  .btn-change-banner {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 40px;
    height: 40px;
    background: rgba(0,0,0,0.4);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    backdrop-filter: blur(8px);
  }
  
  .btn-change-banner:hover {
    background: rgba(0,0,0,0.6);
    transform: scale(1.1);
  }
  
  .profile-info {
    display: flex;
    align-items: flex-end;
    gap: var(--space-5);
    padding: 0 var(--space-6);
    margin-top: -60px;
    position: relative;
  }
  
  .profile-avatar-wrapper { position: relative; }
  
  .profile-avatar {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    font-weight: bold;
    color: white;
    border: 4px solid var(--surface-card);
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }
  
  .profile-avatar-edit {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 36px;
    height: 36px;
    background: var(--primary-500);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: 3px solid var(--surface-card);
    transition: transform var(--transition-fast);
  }
  
  .profile-avatar-edit:hover { transform: scale(1.1); }
  
  .profile-details { flex: 1; padding-bottom: var(--space-4); }
  
  .profile-name { font-size: var(--text-2xl); font-weight: var(--font-bold); margin-bottom: var(--space-1); }
  
  .role-badge {
    background: rgba(47, 111, 237, 0.2);
    color: var(--primary-400);
    padding: 4px 12px;
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
  }
  
  .profile-segments {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-3);
    flex-wrap: wrap;
  }
  
  .segment-tag {
    background: var(--surface-elevated);
    color: var(--text-secondary);
    padding: 4px 10px;
    border-radius: var(--radius-md);
    font-size: var(--text-xs);
  }
  
  .profile-level {
    text-align: center;
    padding-bottom: var(--space-4);
  }
  
  .level-badge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: linear-gradient(135deg, #f2b705, #d97706);
    color: white;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-full);
    font-weight: var(--font-bold);
  }
  
  .level-icon { font-size: var(--text-xl); }
  .level-points { font-size: var(--text-sm); color: var(--text-secondary); margin-top: var(--space-2); }
  
  /* Banner Picker Modal */
  .banner-picker-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }
  
  .banner-picker-content {
    background: var(--surface-card);
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
    width: 90%;
    max-width: 600px;
    border: 1px solid var(--surface-border);
  }
  
  .banner-picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-5);
  }
  
  .banner-picker-header h3 {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
  }
  
  .banner-picker-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }
  
  .banner-option {
    height: 80px;
    border-radius: var(--radius-lg);
    cursor: pointer;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: var(--space-3);
    transition: all 0.2s;
    border: 3px solid transparent;
    position: relative;
  }
  
  .banner-option:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 20px rgba(0,0,0,0.3);
  }
  
  .banner-option.selected {
    border-color: white;
    box-shadow: 0 0 0 3px var(--primary-500);
  }
  
  .banner-option-name {
    font-size: var(--text-xs);
    color: white;
    font-weight: var(--font-medium);
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }
  
  .banner-option .fa-check {
    color: white;
    background: var(--primary-500);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }
  
  /* Banner Upload Section */
  .banner-upload-section {
    margin-bottom: var(--space-4);
    text-align: center;
  }
  
  .banner-upload-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-4);
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.15));
    border: 2px dashed var(--primary-500);
    border-radius: var(--radius-lg);
    cursor: pointer;
    color: var(--primary-400);
    font-weight: var(--font-medium);
    transition: all 0.2s;
  }
  
  .banner-upload-btn:hover {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(99, 102, 241, 0.25));
    border-color: var(--primary-400);
    transform: translateY(-2px);
  }
  
  .banner-upload-btn i {
    font-size: 24px;
  }
  
  .banner-upload-hint {
    margin-top: var(--space-2);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }
  
  .banner-picker-divider {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin: var(--space-4) 0;
  }
  
  .banner-picker-divider::before,
  .banner-picker-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--surface-border);
  }
  
  .banner-picker-divider span {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }
  
  /* Quick Cards */
  .profile-quick-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-5);
  }
  
  .quick-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    padding: var(--space-4);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    transition: all 0.2s;
  }
  
  .quick-card:hover {
    border-color: var(--primary-500);
    transform: translateY(-2px);
  }
  
  .quick-card-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }
  
  .quick-card-value {
    font-size: var(--text-xl);
    font-weight: var(--font-bold);
    color: var(--text-primary);
  }
  
  .quick-card-label {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }
  
  /* Level Progress */
  .level-detail-card {
    background: var(--surface-elevated);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }
  
  .level-current {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  
  .level-icon-big {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
  }
  
  .level-title {
    font-size: var(--text-lg);
    font-weight: var(--font-bold);
  }
  
  .level-subtitle {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }
  
  .level-progress-bar {
    height: 12px;
    background: var(--surface-border);
    border-radius: var(--radius-full);
    overflow: hidden;
    margin-bottom: var(--space-2);
  }
  
  .level-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-500), var(--primary-400));
    border-radius: var(--radius-full);
    transition: width 0.5s ease;
  }
  
  .level-progress-text {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }
  
  .profile-content {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: var(--space-6);
  }
  
  .profile-section {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
    margin-bottom: var(--space-4);
  }
  
  .section-title {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--surface-border);
  }
  
  .score-breakdown { display: flex; flex-direction: column; gap: var(--space-3); }
  
  .score-item { display: flex; align-items: center; gap: var(--space-3); }
  
  .score-source { display: flex; align-items: center; gap: var(--space-2); min-width: 140px; font-size: var(--text-sm); }
  
  .score-bar { flex: 1; height: 8px; background: var(--surface-elevated); border-radius: var(--radius-full); overflow: hidden; }
  
  .score-fill { height: 100%; border-radius: var(--radius-full); transition: width var(--transition-normal); }
  
  .score-value { min-width: 70px; text-align: right; font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--text-secondary); }
  
  .history-list { display: flex; flex-direction: column; gap: var(--space-2); max-height: 400px; overflow-y: auto; }
  
  .history-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--surface-elevated);
    border-radius: var(--radius-lg);
  }
  
  .history-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }
  
  .history-icon.success { background: rgba(16, 185, 129, 0.2); }
  .history-icon.warning { background: rgba(239, 68, 68, 0.2); }
  
  .history-content { flex: 1; }
  .history-description { font-size: var(--text-sm); font-weight: var(--font-medium); }
  .history-date { font-size: var(--text-xs); color: var(--text-tertiary); }
  .history-points { font-weight: var(--font-bold); font-size: var(--text-sm); }
  
  .no-trails { text-align: center; padding: var(--space-6); color: var(--text-tertiary); }
  .no-trails span { font-size: 32px; display: block; margin-bottom: var(--space-2); }
  
  .achievements-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }
  
  .achievement-card {
    text-align: center;
    padding: var(--space-4);
    background: var(--surface-elevated);
    border-radius: var(--radius-lg);
    border: 1px solid var(--surface-border);
    transition: all var(--transition-fast);
  }
  
  .achievement-card.locked { opacity: 0.5; filter: grayscale(1); }
  .achievement-card.unlocked { border-color: var(--warning-500); }
  
  .achievement-icon { font-size: 28px; margin-bottom: var(--space-2); }
  .achievement-name { font-size: var(--text-sm); font-weight: var(--font-medium); margin-bottom: var(--space-1); }
  .achievement-desc { font-size: var(--text-xs); color: var(--text-tertiary); }
  
  .hierarchy-list { display: flex; flex-direction: column; gap: var(--space-2); }
  
  .hierarchy-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-lg);
    background: var(--surface-elevated);
  }
  
  .hierarchy-item.current { background: rgba(47, 111, 237, 0.15); border: 1px solid var(--primary-500); }
  
  .hierarchy-level {
    width: 28px;
    height: 28px;
    background: var(--surface-border);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xs);
    font-weight: bold;
  }
  
  .hierarchy-item.current .hierarchy-level { background: var(--primary-500); color: white; }
  
  .hierarchy-role { font-size: var(--text-sm); font-weight: var(--font-medium); }
  .hierarchy-name { font-size: var(--text-xs); color: var(--text-tertiary); }
  
  .you-badge {
    background: var(--primary-500);
    color: white;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
  }
  
  .stats-list { display: flex; flex-direction: column; gap: var(--space-2); }
  
  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--surface-border);
    font-size: var(--text-sm);
  }
  
  .stat-row:last-child { border-bottom: none; }
  .stat-val { font-weight: var(--font-medium); color: var(--primary-400); }
  
  .preferences-list { display: flex; flex-direction: column; gap: var(--space-2); }
  
  .pref-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
    font-size: var(--text-sm);
  }
  
  @media (max-width: 1024px) {
    .profile-content { grid-template-columns: 1fr; }
    .profile-info { flex-direction: column; align-items: center; text-align: center; }
    .profile-quick-cards { grid-template-columns: repeat(2, 1fr); }
    .achievements-grid { grid-template-columns: repeat(2, 1fr); }
    .banner-picker-grid { grid-template-columns: 1fr; }
  }
  
  @media (max-width: 600px) {
    .profile-quick-cards { grid-template-columns: 1fr; }
    .achievements-grid { grid-template-columns: 1fr; }
  }
`;
document.head.appendChild(profileStyles);

window.NexusProfile = NexusProfile;
