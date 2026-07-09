/**
 * ROTINA ADM PRO - Módulo de Checklist Diário Gamificado
 * Com Big Numbers, Sistema de Motivação e Supabase
 */

const RotinaADM = {
  tasks: [],
  history: [],
  selectedDate: null, // Data sendo visualizada (null = hoje)
  viewingReadOnly: false, // Se está vendo um dia passado

  // Frases motivacionais por faixa de progresso
  motivationalPhrases: {
    0: [
      "🚀 Bora começar! O primeiro passo é sempre o mais importante!",
      "💪 Um dia produtivo começa agora! Vamos nessa!",
      "🌟 Hoje é dia de fazer acontecer!"
    ],
    25: [
      "🔥 Boa! Já está pegando ritmo!",
      "⚡ Isso aí! Mantenha o foco!",
      "💫 Excelente começo! Continue assim!"
    ],
    50: [
      "🎯 Metade do caminho! Tá voando!",
      "🏃 No meio do percurso e arrasando!",
      "⭐ Halfway there! Você é demais!"
    ],
    75: [
      "🔥 Quase lá, campeão! Não desiste!",
      "💪 Tá chegando! Falta pouco!",
      "⚡ Reta final! Você consegue!"
    ],
    100: [
      "🏆 CAMPEÃO! Todas as tarefas concluídas!",
      "🎉 PERFEITO! Você é uma máquina!",
      "👑 LENDÁRIO! Rotina 100%!",
      "🌟 INCRÍVEL! Dia produtivo demais!"
    ]
  },

  // Emojis de incentivo por status
  statusEmojis: {
    great: ['🔥', '💪', '⚡', '🚀', '✨', '⭐'],
    good: ['👏', '💫', '🎯', '✅', '👍'],
    meh: ['🤔', '💭', '📝'],
    low: ['😴', '☕', '🌙']
  },

  init() {
    this.selectedDate = this.getToday();
    this.loadFromStorage();
  },

  /**
   * Verifica se uma data (YYYY-MM-DD) é dia útil (seg-sex)
   */
  isWeekday(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay(); // 0=dom, 6=sab
    return day >= 1 && day <= 5;
  },

  async loadFromStorage() {
    try {
      // Tentar carregar do Firebase primeiro
      const loadedFromFirebase = await this.loadFromFirebase();

      if (!loadedFromFirebase) {
        // Fallback para localStorage
        const storageKey = this.getStorageKey();
        this.tasks = JSON.parse(localStorage.getItem(storageKey) || '[]');
        this.history = JSON.parse(localStorage.getItem(`${storageKey}_history`) || '[]');
      }
    } catch (e) {
      console.warn('[RotinaADM] Error loading:', e);
      this.tasks = [];
      this.history = [];
    }
  },

  getStorageKey() {
    const user = NepAuth?.getUser?.();
    return `nep_rotina_${user?.roleKey || 'default'}_${(user?.name || 'user').toLowerCase().replace(/\s/g, '_')}`;
  },

  save() {
    const storageKey = this.getStorageKey();
    // Salvar backup local
    localStorage.setItem(storageKey, JSON.stringify(this.tasks));
    localStorage.setItem(`${storageKey}_history`, JSON.stringify(this.history));

    // Salvar no Firebase (principal)
    this.saveToFirebase();
  },

  async saveToFirebase() {
    try {
      const user = NepAuth?.getUser?.();
      const uid = user?.uid || localStorage.getItem('nep_user_uid');
      if (!uid || !window.db) return;

      const today = new Date().toISOString().split('T')[0];
      const docId = `${uid}_${today}`; // ID único por dia

      await window.db.collection('rotinas_adm').doc(docId).set({
        user_id: uid,
        user_name: user?.name || localStorage.getItem('nep_user_name'),
        data: today,
        tarefas: this.tasks,
        total: this.tasks.length,
        concluidas: this.getCompletedCount(),
        percentual: this.getProgress(),
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log('[RotinaADM] Salvo no Firebase ✅');
    } catch (e) {
      console.warn('[RotinaADM] Erro ao salvar Firebase:', e);
    }
  },

  async loadFromFirebase() {
    try {
      const user = NepAuth?.getUser?.();
      const uid = user?.uid || localStorage.getItem('nep_user_uid');
      if (!uid || !window.db) return false;

      const today = new Date().toISOString().split('T')[0];
      const docId = `${uid}_${today}`;

      const docSnap = await window.db.collection('rotinas_adm').doc(docId).get();

      if (docSnap.exists) {
        const data = docSnap.data();
        this.tasks = data.tarefas || [];
        console.log('[RotinaADM] Carregado do Firebase ✅');
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[RotinaADM] Erro ao carregar Firebase:', e);
      return false;
    }
  },

  async saveToSupabase() {
    try {
      const user = NepAuth?.getUser?.();
      if (!user || typeof supabaseClient === 'undefined') return;

      const today = new Date().toISOString().split('T')[0];

      // Upsert rotina do dia
      const { error } = await supabaseClient
        .from('rotinas_adm')
        .upsert({
          user_id: user.id || user.email,
          user_name: user.name,
          data: today,
          tarefas: this.tasks,
          total: this.tasks.length,
          concluidas: this.getCompletedCount(),
          percentual: this.getProgress(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,data' });

      if (error) console.warn('[RotinaADM] Supabase error:', error);
    } catch (e) {
      console.warn('[RotinaADM] Supabase save failed:', e);
    }
  },

  async loadFromSupabase() {
    try {
      const user = NepAuth?.getUser?.();
      if (!user || typeof supabaseClient === 'undefined') return;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabaseClient
        .from('rotinas_adm')
        .select('*')
        .eq('user_id', user.id || user.email)
        .eq('data', today)
        .single();

      if (data && !error) {
        this.tasks = data.tarefas || [];
        this.save(); // Sincronizar com localStorage
      }
    } catch (e) {
      console.warn('[RotinaADM] Supabase load failed:', e);
    }
  },

  getToday() {
    return new Date().toISOString().split('T')[0];
  },

  getActiveDate() {
    return this.selectedDate || this.getToday();
  },

  getCompletedCount() {
    const activeDate = this.getActiveDate();
    return this.tasks.filter(t => t.completedAt?.startsWith(activeDate)).length;
  },

  getProgress() {
    if (this.tasks.length === 0) return 0;
    return Math.round((this.getCompletedCount() / this.tasks.length) * 100);
  },

  getMotivationalPhrase() {
    const progress = this.getProgress();
    let tier = 0;
    if (progress >= 100) tier = 100;
    else if (progress >= 75) tier = 75;
    else if (progress >= 50) tier = 50;
    else if (progress >= 25) tier = 25;

    const phrases = this.motivationalPhrases[tier];
    return phrases[Math.floor(Math.random() * phrases.length)];
  },

  getRandomEmoji(type = 'good') {
    const emojis = this.statusEmojis[type] || this.statusEmojis.good;
    return emojis[Math.floor(Math.random() * emojis.length)];
  },

  getStreakDays() {
    // Calcular quantos DIAS ÚTEIS seguidos o usuário completou 100%
    // Sáb/Dom são ignorados (não quebram streak)
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 60; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      // Pular fins de semana
      if (!this.isWeekday(dateStr)) continue;

      const dayHistory = this.history.find(h => h.date === dateStr);
      if (dayHistory && dayHistory.percentage >= 100) {
        streak++;
      } else if (streak > 0) {
        // Primeiro dia útil sem 100% → quebra streak
        break;
      }
    }

    return streak;
  },

  getWeeklyStats() {
    // Mostrar últimos 5 dias ÚTEIS (seg-sex)
    const today = new Date();
    const week = [];
    let daysFound = 0;

    for (let i = 0; daysFound < 5; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      if (!this.isWeekday(dateStr)) continue;

      const dayHistory = this.history.find(h => h.date === dateStr);
      week.unshift({
        date: dateStr,
        day: checkDate.toLocaleDateString('pt-BR', { weekday: 'short' }),
        percentage: dayHistory?.percentage || 0,
        completed: dayHistory?.completed || 0,
        total: dayHistory?.total || 0
      });
      daysFound++;
    }

    return week;
  },

  /**
   * Navegar para dia anterior (só dias úteis)
   */
  goToPrevDay() {
    const current = new Date(this.getActiveDate() + 'T12:00:00');
    let prev = new Date(current);
    do {
      prev.setDate(prev.getDate() - 1);
    } while (!this.isWeekday(prev.toISOString().split('T')[0]));
    this.goToDate(prev.toISOString().split('T')[0]);
  },

  /**
   * Navegar para próximo dia (só dias úteis, máx = hoje)
   */
  goToNextDay() {
    const current = new Date(this.getActiveDate() + 'T12:00:00');
    const today = this.getToday();
    let next = new Date(current);
    do {
      next.setDate(next.getDate() + 1);
    } while (!this.isWeekday(next.toISOString().split('T')[0]));
    const nextStr = next.toISOString().split('T')[0];
    if (nextStr > today) return; // Não pode ir para o futuro
    this.goToDate(nextStr);
  },

  /**
   * Ir para uma data específica
   */
  async goToDate(dateStr) {
    this.selectedDate = dateStr;
    this.viewingReadOnly = (dateStr !== this.getToday());

    if (this.viewingReadOnly) {
      await this.loadDateFromFirebase(dateStr);
    } else {
      await this.loadFromStorage();
    }
    this.refresh();
  },

  /**
   * Carregar tarefas de um dia específico do Firebase
   */
  async loadDateFromFirebase(dateStr) {
    try {
      const user = NepAuth?.getUser?.();
      const uid = user?.uid || localStorage.getItem('nep_user_uid');
      if (!uid || !window.db) return;

      const docId = `${uid}_${dateStr}`;
      const docSnap = await window.db.collection('rotinas_adm').doc(docId).get();

      if (docSnap.exists) {
        const data = docSnap.data();
        this.tasks = data.tarefas || [];
      } else {
        this.tasks = [];
      }
    } catch (e) {
      console.warn('[RotinaADM] Erro ao carregar data:', dateStr, e);
      this.tasks = [];
    }
  },

  render(container) {
    if (!this.selectedDate) this.selectedDate = this.getToday();
    const activeDate = this.getActiveDate();
    const isToday = activeDate === this.getToday();
    this.viewingReadOnly = !isToday;

    if (isToday) this.loadFromStorage();
    const progress = this.getProgress();
    const completed = this.getCompletedCount();
    const total = this.tasks.length;
    const streak = this.getStreakDays();
    const weeklyStats = this.getWeeklyStats();
    const phrase = this.getMotivationalPhrase();
    const user = NepAuth?.getUser?.();

    // Calcular média dos dias úteis
    const weeklyAvg = weeklyStats.reduce((sum, d) => sum + d.percentage, 0) / 5;

    // Formatar data sendo visualizada
    const viewDate = new Date(activeDate + 'T12:00:00');
    const dateLabel = viewDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const canGoNext = activeDate < this.getToday();

    container.innerHTML = `
      <div class="rotina-adm-container">
        <!-- Header com Motivação -->
        <div class="rotina-header">
          <div class="rotina-header-content">
            <div class="rotina-greeting">
              <span class="rotina-emoji">${this.getRandomEmoji(progress >= 75 ? 'great' : progress >= 50 ? 'good' : 'meh')}</span>
              <div>
                <h1>Olá, ${user?.name?.split(' ')[0] || 'Campeão'}!</h1>
                <p class="rotina-date">${dateLabel}</p>
              </div>
            </div>
            <div class="rotina-motivation-card">
              <p class="rotina-phrase">${isToday ? phrase : '📅 Visualizando dia anterior'}</p>
            </div>
          </div>
        </div>

        <!-- Navegação por Data -->
        <div class="rotina-date-nav">
          <button class="rotina-nav-btn" id="rotina-prev-day" title="Dia útil anterior">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="rotina-nav-date">
            <span class="rotina-nav-label">${isToday ? '📍 Hoje' : '📅 ' + viewDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
            ${!isToday ? '<button class="rotina-nav-today" id="rotina-go-today">Voltar para Hoje</button>' : ''}
          </div>
          <button class="rotina-nav-btn ${!canGoNext ? 'disabled' : ''}" id="rotina-next-day" title="Próximo dia útil" ${!canGoNext ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        ${this.viewingReadOnly ? '<div class="rotina-readonly-banner"><i class="fa-solid fa-eye"></i> Visualizando registro de ' + dateLabel + ' (somente leitura)</div>' : ''}

        <!-- Big Numbers -->
        <div class="rotina-stats-grid">
          <div class="rotina-stat-card primary">
            <div class="rotina-stat-icon">📊</div>
            <div class="rotina-stat-value">${progress}%</div>
            <div class="rotina-stat-label">Progresso Hoje</div>
            <div class="rotina-stat-bar">
              <div class="rotina-stat-bar-fill" style="width: ${progress}%; background: ${progress >= 100 ? '#22c55e' : progress >= 75 ? '#3b82f6' : progress >= 50 ? '#f59e0b' : '#ef4444'};"></div>
            </div>
          </div>
          
          <div class="rotina-stat-card">
            <div class="rotina-stat-icon">✅</div>
            <div class="rotina-stat-value">${completed}<span class="rotina-stat-small">/${total}</span></div>
            <div class="rotina-stat-label">Tarefas Concluídas</div>
          </div>
          
          <div class="rotina-stat-card ${streak >= 3 ? 'highlight' : ''}">
            <div class="rotina-stat-icon">🔥</div>
            <div class="rotina-stat-value">${streak}</div>
            <div class="rotina-stat-label">Dias de Streak</div>
            ${streak >= 7 ? '<div class="rotina-badge">🏆 Semana Perfeita!</div>' : streak >= 3 ? '<div class="rotina-badge">⭐ Em alta!</div>' : ''}
          </div>
          
          <div class="rotina-stat-card">
            <div class="rotina-stat-icon">📈</div>
            <div class="rotina-stat-value">${Math.round(weeklyAvg)}%</div>
            <div class="rotina-stat-label">Média Semanal</div>
          </div>
        </div>

        <!-- Gráfico da Semana -->
        <div class="rotina-weekly-chart">
          <h3><i class="fa-solid fa-chart-line"></i> Performance da Semana</h3>
          <div class="rotina-week-bars">
            ${weeklyStats.map(day => `
              <div class="rotina-week-bar-group">
                <div class="rotina-week-bar" style="height: ${Math.max(day.percentage, 5)}%;">
                  <span class="rotina-week-bar-value">${day.percentage}%</span>
                </div>
                <span class="rotina-week-day">${day.day}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Checklist Principal -->
        <div class="rotina-checklist-section">
          <div class="rotina-checklist-header">
            <h3><i class="fa-solid fa-list-check"></i> ${isToday ? 'Minhas Rotinas' : 'Rotinas do dia'}</h3>
            <span class="rotina-count">${completed}/${total} completas</span>
          </div>
          
          ${!this.viewingReadOnly ? `
          <!-- Adicionar Tarefa (só hoje) -->
          <div class="rotina-add-form">
            <input type="text" id="rotina-new-task" 
                   placeholder="✨ Adicionar nova rotina..." 
                   class="rotina-input" />
            <button class="rotina-btn-add" id="rotina-btn-add">
              <i class="fa-solid fa-plus"></i> Adicionar
            </button>
          </div>
          ` : ''}

          <!-- Lista de Tarefas -->
          <div class="rotina-tasks-list" id="rotina-tasks-list">
            ${this.tasks.length === 0 ? `
              <div class="rotina-empty">
                <div class="rotina-empty-icon">${isToday ? '📝' : '📭'}</div>
                <p>${isToday ? 'Nenhuma rotina cadastrada' : 'Nenhum registro neste dia'}</p>
                <span>${isToday ? 'Adicione suas tarefas diárias acima!' : 'Não foram encontradas tarefas para esta data.'}</span>
              </div>
            ` : this.tasks.map((task, idx) => this.renderTask(task, idx)).join('')}
          </div>
        </div>

        <!-- Mensagem de Incentivo Dinâmica -->
        ${this.renderIncentiveCard(progress, completed, total)}
      </div>

      <style>
        .rotina-adm-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }
        
        .rotina-header {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%);
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 24px;
          border: 1px solid rgba(139, 92, 246, 0.2);
        }
        
        .rotina-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 24px;
        }
        
        .rotina-greeting {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .rotina-emoji {
          font-size: 48px;
          animation: bounce 1s ease infinite;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        
        .rotina-greeting h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
        }
        
        .rotina-date {
          color: var(--text-secondary);
          margin: 4px 0 0;
          text-transform: capitalize;
        }
        
        .rotina-motivation-card {
          background: rgba(139, 92, 246, 0.15);
          padding: 16px 24px;
          border-radius: 12px;
          max-width: 400px;
        }
        
        .rotina-phrase {
          font-size: 16px;
          font-weight: 500;
          color: var(--text-primary);
          margin: 0;
        }
        
        /* Big Numbers Grid */
        .rotina-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 900px) {
          .rotina-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        
        @media (max-width: 500px) {
          .rotina-stats-grid { grid-template-columns: 1fr; }
        }
        
        .rotina-stat-card {
          background: var(--surface-card);
          border: 1px solid var(--surface-border);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .rotina-stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.2);
        }
        
        .rotina-stat-card.primary {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.15));
          border-color: rgba(139, 92, 246, 0.3);
        }
        
        .rotina-stat-card.highlight {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1));
          border-color: rgba(245, 158, 11, 0.3);
        }
        
        .rotina-stat-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }
        
        .rotina-stat-value {
          font-size: 42px;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }
        
        .rotina-stat-small {
          font-size: 20px;
          font-weight: 400;
          color: var(--text-tertiary);
        }
        
        .rotina-stat-label {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 8px;
        }
        
        .rotina-stat-bar {
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          margin-top: 16px;
          overflow: hidden;
        }
        
        .rotina-stat-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        
        .rotina-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          color: white;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        
        /* Weekly Chart */
        .rotina-weekly-chart {
          background: var(--surface-card);
          border: 1px solid var(--surface-border);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }
        
        .rotina-weekly-chart h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 20px;
          font-size: 16px;
          color: var(--text-primary);
        }
        
        .rotina-week-bars {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          height: 120px;
          gap: 12px;
        }
        
        .rotina-week-bar-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }
        
        .rotina-week-bar {
          width: 100%;
          max-width: 60px;
          background: linear-gradient(180deg, #8b5cf6, #6366f1);
          border-radius: 8px 8px 0 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          min-height: 5%;
          position: relative;
          transition: height 0.5s ease;
        }
        
        .rotina-week-bar-value {
          position: absolute;
          top: -24px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .rotina-week-day {
          margin-top: 8px;
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: capitalize;
        }
        
        /* Checklist Section */
        .rotina-checklist-section {
          background: var(--surface-card);
          border: 1px solid var(--surface-border);
          border-radius: 16px;
          padding: 24px;
        }
        
        .rotina-checklist-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .rotina-checklist-header h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          font-size: 18px;
        }
        
        .rotina-count {
          background: rgba(139, 92, 246, 0.15);
          color: #8b5cf6;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
        }
        
        .rotina-add-form {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .rotina-input {
          flex: 1;
          background: var(--surface-elevated);
          border: 1px solid var(--surface-border);
          border-radius: 12px;
          padding: 14px 18px;
          font-size: 15px;
          color: var(--text-primary);
          transition: all 0.2s;
        }
        
        .rotina-input:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
        }
        
        .rotina-btn-add {
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        
        .rotina-btn-add:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(139, 92, 246, 0.3);
        }
        
        /* Task Items */
        .rotina-tasks-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .rotina-task-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px;
          background: var(--surface-elevated);
          border: 1px solid var(--surface-border);
          border-radius: 12px;
          transition: all 0.2s;
        }
        
        .rotina-task-item:hover {
          border-color: rgba(139, 92, 246, 0.3);
        }
        
        .rotina-task-item.completed {
          background: rgba(34, 197, 94, 0.08);
          border-color: rgba(34, 197, 94, 0.2);
        }
        
        .rotina-task-checkbox {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 2px solid var(--surface-border);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        
        .rotina-task-checkbox:hover {
          border-color: #8b5cf6;
        }
        
        .rotina-task-checkbox.checked {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border-color: #22c55e;
          color: white;
        }
        
        .rotina-task-text {
          flex: 1;
          font-size: 15px;
          color: var(--text-primary);
        }
        
        .rotina-task-item.completed .rotina-task-text {
          text-decoration: line-through;
          color: var(--text-tertiary);
        }
        
        .rotina-task-time {
          font-size: 12px;
          color: var(--text-tertiary);
        }
        
        .rotina-task-delete {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s;
        }
        
        .rotina-task-item:hover .rotina-task-delete {
          opacity: 1;
        }
        
        .rotina-task-delete:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        
        .rotina-empty {
          text-align: center;
          padding: 48px;
          color: var(--text-secondary);
        }
        
        .rotina-empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        
        .rotina-empty span {
          display: block;
          margin-top: 8px;
          font-size: 13px;
          color: var(--text-tertiary);
        }
        
        /* Incentive Card */
        .rotina-incentive-card {
          margin-top: 24px;
          padding: 24px;
          border-radius: 16px;
          text-align: center;
          animation: fadeIn 0.5s ease;
        }
        
        .rotina-incentive-card.success {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.1));
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        
        .rotina-incentive-card.warning {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 179, 8, 0.1));
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        
        .rotina-incentive-card.danger {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1));
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .rotina-incentive-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        
        .rotina-incentive-text {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
        
        .rotina-incentive-sub {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 8px;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Date Navigation */
        .rotina-date-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 24px;
          padding: 16px;
          background: var(--surface-card);
          border: 1px solid var(--surface-border);
          border-radius: 16px;
        }

        .rotina-nav-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid var(--surface-border);
          background: var(--surface-elevated);
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s;
        }

        .rotina-nav-btn:hover:not(.disabled) {
          background: rgba(139, 92, 246, 0.15);
          border-color: #8b5cf6;
          transform: scale(1.05);
        }

        .rotina-nav-btn.disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .rotina-nav-date {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 200px;
        }

        .rotina-nav-label {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .rotina-nav-today {
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          color: white;
          border: none;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .rotina-nav-today:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .rotina-readonly-banner {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #f59e0b;
          padding: 12px 20px;
          border-radius: 12px;
          text-align: center;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
      </style>
    `;

    this.bindEvents(container);
  },

  renderTask(task, idx) {
    const activeDate = this.getActiveDate();
    const isCompleted = task.completedAt?.startsWith(activeDate);
    const completedTime = isCompleted && task.completedAt ? new Date(task.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

    return `
      <div class="rotina-task-item ${isCompleted ? 'completed' : ''}" data-idx="${idx}">
        <div class="rotina-task-checkbox ${isCompleted ? 'checked' : ''} ${this.viewingReadOnly ? 'readonly' : ''}" ${!this.viewingReadOnly ? `data-action="toggle" data-idx="${idx}"` : ''}>
          ${isCompleted ? '<i class="fa-solid fa-check"></i>' : ''}
        </div>
        <span class="rotina-task-text">${task.text}</span>
        ${isCompleted ? `<span class="rotina-task-time">✓ ${completedTime}</span>` : ''}
        ${!this.viewingReadOnly ? `<button class="rotina-task-delete" data-action="delete" data-idx="${idx}"><i class="fa-solid fa-trash"></i></button>` : ''}
      </div>
    `;
  },

  renderIncentiveCard(progress, completed, total) {
    if (total === 0) return '';

    let cardClass, icon, text, subtext;

    if (progress >= 100) {
      cardClass = 'success';
      icon = '🏆';
      text = '🎉 PARABÉNS! Você completou TODAS as rotinas!';
      subtext = 'Você é uma inspiração para o time! Continue assim amanhã!';
    } else if (progress >= 75) {
      cardClass = 'success';
      icon = '💪';
      text = `Quase lá! Faltam apenas ${total - completed} tarefas!`;
      subtext = 'Você está na reta final, campeão! Não desiste!';
    } else if (progress >= 50) {
      cardClass = 'warning';
      icon = '⚡';
      text = `Metade do caminho! ${completed} de ${total} concluídas!`;
      subtext = 'Continue firme, você consegue terminar tudo hoje!';
    } else if (progress >= 25) {
      cardClass = 'warning';
      icon = '🔥';
      text = 'Bom começo! Vamos acelerar?';
      subtext = `Ainda faltam ${total - completed} tarefas. Bora que dá tempo!`;
    } else {
      cardClass = 'danger';
      icon = '🚀';
      text = 'Hora de começar!';
      subtext = 'Cada tarefa concluída te deixa mais perto do objetivo!';
    }

    return `
      <div class="rotina-incentive-card ${cardClass}">
        <div class="rotina-incentive-icon">${icon}</div>
        <p class="rotina-incentive-text">${text}</p>
        <p class="rotina-incentive-sub">${subtext}</p>
      </div>
    `;
  },

  bindEvents(container) {
    // Navegação por data
    container.querySelector('#rotina-prev-day')?.addEventListener('click', () => this.goToPrevDay());
    container.querySelector('#rotina-next-day')?.addEventListener('click', () => this.goToNextDay());
    container.querySelector('#rotina-go-today')?.addEventListener('click', () => this.goToDate(this.getToday()));

    // Adicionar tarefa (só hoje)
    const addBtn = container.querySelector('#rotina-btn-add');
    const input = container.querySelector('#rotina-new-task');

    addBtn?.addEventListener('click', () => this.addTask());
    input?.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.addTask();
    });

    // Toggle e Delete
    container.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        const idx = parseInt(e.currentTarget.dataset.idx);

        if (action === 'toggle') this.toggleTask(idx);
        if (action === 'delete') this.deleteTask(idx);
      });
    });
  },

  addTask() {
    const input = document.getElementById('rotina-new-task');
    const text = input?.value?.trim();
    if (!text) return;

    this.tasks.push({
      id: Date.now().toString(),
      text,
      createdAt: new Date().toISOString(),
      completedAt: null
    });

    input.value = '';
    this.save();
    this.updateHistory();
    this.refresh();
    NexusApp?.showToast?.('✨ Rotina adicionada!', 'success');
  },

  toggleTask(idx) {
    const task = this.tasks[idx];
    if (!task) return;

    const today = this.getToday();

    if (task.completedAt?.startsWith(today)) {
      task.completedAt = null;
    } else {
      task.completedAt = new Date().toISOString();

      // Mostrar incentivo
      const progress = this.getProgress();
      if (progress >= 100) {
        NexusApp?.showToast?.('🏆 PERFEITO! Todas as rotinas concluídas! +15 pts', 'success');
        // Gamificação
        const uid = localStorage.getItem('nep_user_uid');
        if (uid && window.NexusGamification) {
          window.NexusGamification.addPoints(uid, 15, 'ROUTINE_COMPLETED', 'Checklist diário completo');
          if (window.NexusAchievements) window.NexusAchievements.incrementStat(uid, 'routines_completed');
        }
      } else if (progress >= 75) {
        NexusApp?.showToast?.('💪 Quase lá! Não desiste!', 'success');
      } else {
        NexusApp?.showToast?.('✅ Tarefa concluída!', 'success');
      }
    }

    this.save();
    this.updateHistory();
    this.refresh();
  },

  deleteTask(idx) {
    if (!confirm('Excluir esta rotina?')) return;

    this.tasks.splice(idx, 1);
    this.save();
    this.updateHistory();
    this.refresh();
  },

  updateHistory() {
    const today = this.getToday();
    const historyEntry = {
      date: today,
      total: this.tasks.length,
      completed: this.getCompletedCount(),
      percentage: this.getProgress()
    };

    const existingIdx = this.history.findIndex(h => h.date === today);
    if (existingIdx >= 0) {
      this.history[existingIdx] = historyEntry;
    } else {
      this.history.push(historyEntry);
    }

    // Manter apenas últimos 30 dias
    this.history = this.history.slice(-30);
    this.save();
  },

  refresh() {
    const container = document.getElementById('page-content');
    if (container && NepApp?.currentPage === 'checklist') {
      this.render(container);
    }
  }
};

// Inicializar
RotinaADM.init();

// Exportar globalmente
window.RotinaADM = RotinaADM;
