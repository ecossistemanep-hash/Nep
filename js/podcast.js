/**
 * NEXUS PLATFORM - PODCAST
 * Módulo de Podcast com Temporadas e Episódios
 */

const NexusPodcast = {
  currentSeason: null,
  currentEpisode: 0,
  isPlaying: false,
  completedEpisodes: new Set(),
  audio: null,

  // Estrutura de temporadas
  seasons: [
    {
      id: 0,
      title: 'Temporada 0',
      subtitle: 'Introdução',
      description: 'Onboarding estratégico e alinhamento de mindset.',
      color: '#ec4899',
      icon: '🎯',
      episodes: [
        { id: 'ep0.1', title: 'Transição de Carreira', duration: 25, points: 5 },
        { id: 'ep0.2', title: 'Perfil Profissional Estratégico', duration: 65, points: 5 },
        { id: 'ep0.3', title: 'Roadmap de Estudos', duration: 135, points: 5 },
        { id: 'ep0.4', title: 'Mercado e Tendências', duration: 45, points: 5 }
      ],
      quiz: {
        passingScore: 70,
        points: 50,
        questions: [
          { q: 'Qual é o principal objetivo estratégico do podcast?', options: ['Gerenciar tempo', 'Transformar em consultores técnicos'], answer: 1 },
          { q: 'Qual competência chave para dados?', options: ['SQL', 'Java Avançado'], answer: 0 },
          { q: 'Complete: Dado → _____ → Ação', options: ['Insight', 'Problema'], answer: 0 }
        ]
      }
    },
    {
      id: 1,
      title: 'Temporada 1',
      subtitle: 'CX Avançado',
      description: 'Experiência do cliente para nível analítico e preditivo.',
      color: '#3b82f6',
      icon: '🎧',
      episodes: [
        { id: 'ep1.1', title: 'Jornada do Cliente Data-Driven', duration: 60, points: 5 },
        { id: 'ep1.2', title: 'Voz do Cliente (VoC)', duration: 55, points: 5 },
        { id: 'ep1.3', title: 'Métricas Estratégicas de CX', duration: 70, points: 5 },
        { id: 'ep1.4', title: 'CX Preditivo', duration: 65, points: 5 }
      ],
      quiz: { passingScore: 70, points: 50, questions: [] }
    },
    {
      id: 2,
      title: 'Temporada 2',
      subtitle: 'IA Aplicada',
      description: 'Inteligência Artificial na operação de qualidade.',
      color: '#8b5cf6',
      icon: '🤖',
      episodes: [
        { id: 'ep2.1', title: 'Fundamentos de IA', duration: 75, points: 5 },
        { id: 'ep2.2', title: 'Modelos Preditivos', duration: 80, points: 5 },
        { id: 'ep2.3', title: 'Chatbots e Automação', duration: 65, points: 5 },
        { id: 'ep2.4', title: 'Generative AI', duration: 70, points: 5 }
      ],
      quiz: { passingScore: 70, points: 50, questions: [] }
    },
    {
      id: 3,
      title: 'Temporada 3',
      subtitle: 'Data-Driven',
      description: 'Base analítica sólida para decisões executivas.',
      color: '#10b981',
      icon: '📊',
      episodes: [
        { id: 'ep3.1', title: 'SQL Estratégico', duration: 90, points: 5 },
        { id: 'ep3.2', title: 'Estatística Aplicada', duration: 85, points: 5 },
        { id: 'ep3.3', title: 'Power BI', duration: 80, points: 5 },
        { id: 'ep3.4', title: 'Visualização Executiva', duration: 75, points: 5 }
      ],
      quiz: { passingScore: 70, points: 50, questions: [] }
    },
    {
      id: 4,
      title: 'Temporada 4',
      subtitle: 'Python',
      description: 'Automação e eficiência com Python.',
      color: '#f59e0b',
      icon: '🐍',
      episodes: [
        { id: 'ep4.1', title: 'Python como Alavanca', duration: 70, points: 5 },
        { id: 'ep4.2', title: 'Pandas para Qualidade', duration: 85, points: 5 },
        { id: 'ep4.3', title: 'Web Scraping', duration: 75, points: 5 },
        { id: 'ep4.4', title: 'NLP Aplicado', duration: 80, points: 5 }
      ],
      quiz: { passingScore: 70, points: 50, questions: [] }
    },
    {
      id: 5,
      title: 'Temporada 5',
      subtitle: 'Soft Skills',
      description: 'Liderança, influência e pensamento estratégico.',
      color: '#ef4444',
      icon: '💡',
      episodes: [
        { id: 'ep5.1', title: 'Storytelling com Dados', duration: 60, points: 5 },
        { id: 'ep5.2', title: 'Pensamento Crítico', duration: 55, points: 5 },
        { id: 'ep5.3', title: 'Liderança Analítica', duration: 65, points: 5 },
        { id: 'ep5.4', title: 'Comunicação de Impacto', duration: 60, points: 5 }
      ],
      quiz: { passingScore: 70, points: 50, questions: [] }
    },
    {
      id: 6,
      title: 'Temporada 6',
      subtitle: 'Ferramentas',
      description: 'Escalar soluções com integração e automação.',
      color: '#06b6d4',
      icon: '🛠️',
      episodes: [
        { id: 'ep6.1', title: 'Power BI Avançado', duration: 90, points: 5 },
        { id: 'ep6.2', title: 'APIs e Integrações', duration: 85, points: 5 },
        { id: 'ep6.3', title: 'No-Code & Low-Code', duration: 70, points: 5 },
        { id: 'ep6.4', title: 'Automação de Processos', duration: 80, points: 5 }
      ],
      quiz: { passingScore: 70, points: 50, questions: [] }
    },
    {
      id: 7,
      title: 'Temporada 7',
      subtitle: 'Projetos',
      description: 'Converter conhecimento em entregáveis reais.',
      color: '#84cc16',
      icon: '🚀',
      episodes: [
        { id: 'ep7.1', title: 'Projeto de Churn', duration: 100, points: 5 },
        { id: 'ep7.2', title: 'Dashboards Executivos', duration: 95, points: 5 },
        { id: 'ep7.3', title: 'Automação de Feedback', duration: 85, points: 5 },
        { id: 'ep7.4', title: 'Case Completo', duration: 110, points: 5 }
      ],
      quiz: { passingScore: 70, points: 50, questions: [] }
    },
    {
      id: 8,
      title: 'Temporada 8',
      subtitle: 'Futuro',
      description: 'Posicionar-se na fronteira da inovação.',
      color: '#a855f7',
      icon: '🔮',
      episodes: [
        { id: 'ep8.1', title: 'Tendências Globais', duration: 70, points: 5 },
        { id: 'ep8.2', title: 'IA Avançada', duration: 80, points: 5 },
        { id: 'ep8.3', title: 'Qualidade como Ativo', duration: 75, points: 5 },
        { id: 'ep8.4', title: 'Roadmap 2030', duration: 65, points: 5 }
      ],
      quiz: { passingScore: 70, points: 50, questions: [] }
    }
  ],

  init() {
    this.loadProgress();
  },

  render(container) {
    if (this.currentSeason !== null) {
      this.renderSeasonPlayer(container);
    } else {
      this.renderSeasonsList(container);
    }
  },

  renderSeasonsList(container) {
    container.innerHTML = `
      <div class="podcast-page animate-fade-in">
        <div class="podcast-header">
          <div class="podcast-header-content">
            <span class="podcast-badge">🎧 NEXT LEVEL</span>
            <h1 class="podcast-title">Jornada de Excelência</h1>
            <p class="podcast-subtitle">Transforme-se em um profissional de alta performance através de conteúdo exclusivo.</p>
          </div>
          <div class="podcast-stats">
            <div class="podcast-stat">
              <span class="podcast-stat-value">${this.seasons.length}</span>
              <span class="podcast-stat-label">Temporadas</span>
            </div>
            <div class="podcast-stat">
              <span class="podcast-stat-value">${this.seasons.reduce((acc, s) => acc + s.episodes.length, 0)}</span>
              <span class="podcast-stat-label">Episódios</span>
            </div>
            <div class="podcast-stat">
              <span class="podcast-stat-value">${this.getOverallProgress()}%</span>
              <span class="podcast-stat-label">Progresso</span>
            </div>
          </div>
        </div>

        <div class="seasons-grid">
          ${this.seasons.map((season, index) => this.renderSeasonCard(season, index)).join('')}
        </div>
      </div>
    `;

    this.attachSeasonEvents();
  },

  renderSeasonCard(season, index) {
    const isLocked = index > 0 && !this.isSeasonCompleted(index - 1);
    const isCompleted = this.isSeasonCompleted(index);
    const progress = this.getSeasonProgress(index);

    return `
      <div class="season-card ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}" 
           data-season="${index}" 
           style="--season-color: ${season.color}">
        ${isLocked ? `
          <div class="season-lock">
            <i class="fa-solid fa-lock"></i>
            <span>Complete a temporada anterior</span>
          </div>
        ` : ''}
        
        <div class="season-header">
          <div class="season-icon">${season.icon}</div>
          <div class="season-badge" style="background: ${season.color}">${season.subtitle}</div>
        </div>
        
        <h3 class="season-title">${season.title}</h3>
        <p class="season-desc">${season.description}</p>
        
        <div class="season-meta">
          <span><i class="fa-solid fa-headphones"></i> ${season.episodes.length} episódios</span>
          <span><i class="fa-solid fa-clock"></i> ${this.formatDuration(season.episodes.reduce((acc, e) => acc + e.duration, 0))}</span>
        </div>
        
        <div class="season-progress">
          <div class="season-progress-bar" style="width: ${progress}%; background: ${season.color}"></div>
        </div>
        <div class="season-progress-text">${progress}% concluído</div>
        
        ${isCompleted ? `
          <div class="season-completed-badge">
            <i class="fa-solid fa-check-circle"></i> Temporada Concluída
          </div>
        ` : ''}
      </div>
    `;
  },

  renderSeasonPlayer(container) {
    const season = this.seasons[this.currentSeason];
    const episode = season.episodes[this.currentEpisode];
    const progress = this.getSeasonProgress(this.currentSeason);
    const canTakeQuiz = this.canTakeQuiz(this.currentSeason);

    container.innerHTML = `
      <div class="player-page animate-fade-in">
        <div class="player-header">
          <button class="btn btn-ghost" id="btn-back-seasons">
            <i class="fa-solid fa-arrow-left"></i> Voltar às Temporadas
          </button>
          <div class="player-progress-indicator">
            <span>Progresso:</span>
            <div class="mini-progress">
              <div class="mini-progress-bar" style="width: ${progress}%; background: ${season.color}"></div>
            </div>
            <span>${progress}%</span>
          </div>
        </div>

        <div class="player-layout">
          <!-- Player -->
          <div class="player-main">
            <div class="player-card" style="--season-color: ${season.color}">
              <div class="player-cover">
                <div class="player-cover-icon">${season.icon}</div>
                <div class="player-cover-overlay"></div>
              </div>
              
              <div class="player-info">
                <span class="player-season-badge" style="background: ${season.color}">${season.title}</span>
                <h2 class="player-episode-title">${episode.title}</h2>
                <p class="player-episode-number">Episódio ${this.currentEpisode + 1} de ${season.episodes.length}</p>
              </div>

              <div class="player-scrubber">
                <div class="scrubber-bar" id="scrubber-bar">
                  <div class="scrubber-progress" id="scrubber-progress"></div>
                  <div class="scrubber-handle" id="scrubber-handle"></div>
                </div>
                <div class="scrubber-times">
                  <span id="current-time">0:00</span>
                  <span id="total-time">${this.formatTime(episode.duration)}</span>
                </div>
              </div>

              <div class="player-controls">
                <button class="player-btn" id="btn-prev" ${this.currentEpisode === 0 ? 'disabled' : ''}>
                  <i class="fa-solid fa-backward-step"></i>
                </button>
                <button class="player-btn player-btn-main" id="btn-play">
                  <i class="fa-solid ${this.isPlaying ? 'fa-pause' : 'fa-play'}"></i>
                </button>
                <button class="player-btn" id="btn-next" ${this.currentEpisode >= season.episodes.length - 1 ? 'disabled' : ''}>
                  <i class="fa-solid fa-forward-step"></i>
                </button>
              </div>

              <div class="player-points">
                <i class="fa-solid fa-star"></i>
                <span>+${episode.points} pts ao concluir</span>
              </div>
            </div>
          </div>

          <!-- Playlist -->
          <div class="player-sidebar">
            <div class="playlist-header">
              <h3><i class="fa-solid fa-list"></i> Episódios</h3>
              <span class="playlist-count">${this.getCompletedEpisodesCount(this.currentSeason)}/${season.episodes.length}</span>
            </div>
            
            <div class="playlist-items">
              ${season.episodes.map((ep, idx) => this.renderPlaylistItem(ep, idx, season)).join('')}
            </div>

            <!-- Quiz Section -->
            <div class="quiz-section ${canTakeQuiz ? 'unlocked' : 'locked'}">
              ${canTakeQuiz ? `
                <div class="quiz-header">
                  <i class="fa-solid fa-graduation-cap"></i>
                  <div>
                    <h4>Prova da Temporada</h4>
                    <p>Teste seus conhecimentos e ganhe +${season.quiz.points} pts</p>
                  </div>
                </div>
                <button class="btn btn-primary w-full" id="btn-start-quiz">
                  <i class="fa-solid fa-play"></i> Iniciar Prova
                </button>
              ` : `
                <div class="quiz-locked">
                  <i class="fa-solid fa-lock"></i>
                  <span>Complete todos os episódios para desbloquear a prova</span>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>

      <!-- Quiz Modal -->
      <div class="modal-backdrop" id="quiz-modal">
        <div class="modal quiz-modal" style="max-width: 600px;">
          <div class="modal-header">
            <h3 class="modal-title">Prova: ${season.title}</h3>
            <button class="modal-close" id="quiz-modal-close">✕</button>
          </div>
          <div class="modal-body" id="quiz-content">
            <!-- Quiz content rendered here -->
          </div>
        </div>
      </div>
    `;

    this.attachPlayerEvents(season);
  },

  renderPlaylistItem(episode, index, season) {
    const isCompleted = this.isEpisodeCompleted(this.currentSeason, index);
    const isCurrent = index === this.currentEpisode;
    const isLocked = index > 0 && !this.isEpisodeCompleted(this.currentSeason, index - 1) && !isCompleted;

    return `
      <div class="playlist-item ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}"
           data-episode="${index}">
        <div class="playlist-item-icon">
          ${isLocked ? '<i class="fa-solid fa-lock"></i>' :
        isCompleted ? '<i class="fa-solid fa-check"></i>' :
          isCurrent && this.isPlaying ? '<i class="fa-solid fa-volume-high"></i>' :
            '<i class="fa-solid fa-play"></i>'}
        </div>
        <div class="playlist-item-info">
          <span class="playlist-item-title">${episode.title}</span>
          <span class="playlist-item-meta">${this.formatTime(episode.duration)} • +${episode.points} pts</span>
        </div>
      </div>
    `;
  },

  attachSeasonEvents() {
    document.querySelectorAll('.season-card:not(.locked)').forEach(card => {
      card.addEventListener('click', () => {
        this.currentSeason = parseInt(card.dataset.season);
        this.currentEpisode = 0;
        this.render(document.getElementById('page-content'));
      });
    });
  },

  attachPlayerEvents(season) {
    // Back button
    document.getElementById('btn-back-seasons').addEventListener('click', () => {
      this.stopAudio();
      this.currentSeason = null;
      this.render(document.getElementById('page-content'));
    });

    // Play controls
    document.getElementById('btn-play').addEventListener('click', () => this.togglePlay());
    document.getElementById('btn-prev').addEventListener('click', () => this.prevEpisode());
    document.getElementById('btn-next').addEventListener('click', () => this.nextEpisode());

    // Playlist items
    document.querySelectorAll('.playlist-item:not(.locked)').forEach(item => {
      item.addEventListener('click', () => {
        this.currentEpisode = parseInt(item.dataset.episode);
        this.stopAudio();
        this.render(document.getElementById('page-content'));
      });
    });

    // Scrubber
    const scrubberBar = document.getElementById('scrubber-bar');
    if (scrubberBar) {
      scrubberBar.addEventListener('click', (e) => this.seekTo(e));
    }

    // Quiz button
    const quizBtn = document.getElementById('btn-start-quiz');
    if (quizBtn) {
      quizBtn.addEventListener('click', () => this.startQuiz(season));
    }

    // Quiz modal close
    document.getElementById('quiz-modal-close')?.addEventListener('click', () => {
      document.getElementById('quiz-modal').classList.remove('active');
    });
  },

  togglePlay() {
    if (this.isPlaying) {
      this.stopAudio();
    } else {
      this.startAudio();
    }
  },

  startAudio() {
    this.isPlaying = true;
    this.simulateProgress();
    this.updatePlayButton();
  },

  stopAudio() {
    this.isPlaying = false;
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }
    this.updatePlayButton();
  },

  updatePlayButton() {
    const btn = document.getElementById('btn-play');
    if (btn) {
      btn.innerHTML = `<i class="fa-solid ${this.isPlaying ? 'fa-pause' : 'fa-play'}"></i>`;
    }
  },

  simulateProgress() {
    const season = this.seasons[this.currentSeason];
    const episode = season.episodes[this.currentEpisode];
    const totalDuration = episode.duration;
    let currentTime = 0;

    this.progressTimer = setInterval(() => {
      if (!this.isPlaying) return;

      currentTime += 0.5;
      const progress = (currentTime / totalDuration) * 100;

      document.getElementById('scrubber-progress').style.width = `${progress}%`;
      document.getElementById('current-time').textContent = this.formatTime(currentTime);

      if (currentTime >= totalDuration) {
        this.completeEpisode();
      }
    }, 500);
  },

  seekTo(e) {
    const bar = document.getElementById('scrubber-bar');
    const rect = bar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const season = this.seasons[this.currentSeason];
    const episode = season.episodes[this.currentEpisode];
    const newTime = percent * episode.duration;

    document.getElementById('scrubber-progress').style.width = `${percent * 100}%`;
    document.getElementById('current-time').textContent = this.formatTime(newTime);
  },

  prevEpisode() {
    if (this.currentEpisode > 0) {
      this.stopAudio();
      this.currentEpisode--;
      this.render(document.getElementById('page-content'));
    }
  },

  nextEpisode() {
    const season = this.seasons[this.currentSeason];
    if (this.currentEpisode < season.episodes.length - 1) {
      this.stopAudio();
      this.currentEpisode++;
      this.render(document.getElementById('page-content'));
    }
  },

  completeEpisode() {
    this.stopAudio();

    const key = `${this.currentSeason}-${this.currentEpisode}`;
    if (!this.completedEpisodes.has(key)) {
      this.completedEpisodes.add(key);
      this.saveProgress();

      const season = this.seasons[this.currentSeason];
      const episode = season.episodes[this.currentEpisode];

      // Podcast NÃO gera pontos para ranking (regra de negócio)
      // Progresso é salvo localmente apenas

      NexusApp.showToast(`Episódio concluído! 🎧`, 'success');
    }

    // Auto-advance or show quiz
    const season = this.seasons[this.currentSeason];
    if (this.currentEpisode < season.episodes.length - 1) {
      setTimeout(() => {
        this.currentEpisode++;
        this.render(document.getElementById('page-content'));
        this.startAudio();
      }, 1500);
    } else {
      this.render(document.getElementById('page-content'));
    }
  },

  startQuiz(season) {
    const modal = document.getElementById('quiz-modal');
    const content = document.getElementById('quiz-content');

    if (!season.quiz.questions || season.quiz.questions.length === 0) {
      content.innerHTML = `
        <div class="quiz-empty">
          <i class="fa-solid fa-tools"></i>
          <h4>Em Construção</h4>
          <p>A prova desta temporada ainda está sendo preparada.</p>
          <button class="btn btn-secondary" onclick="document.getElementById('quiz-modal').classList.remove('active')">Fechar</button>
        </div>
      `;
    } else {
      content.innerHTML = `
        <form id="quiz-form">
          ${season.quiz.questions.map((q, i) => `
            <div class="quiz-question">
              <p class="quiz-question-text">
                <span class="quiz-question-num">${i + 1}</span>
                ${q.q}
              </p>
              <div class="quiz-options">
                ${q.options.map((opt, j) => `
                  <label class="quiz-option">
                    <input type="radio" name="q${i}" value="${j}">
                    <span>${opt}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          `).join('')}
          <button type="button" class="btn btn-primary w-full mt-4" id="btn-submit-quiz">
            <i class="fa-solid fa-paper-plane"></i> Enviar Respostas
          </button>
        </form>
      `;

      document.getElementById('btn-submit-quiz').addEventListener('click', () => this.submitQuiz(season));
    }

    modal.classList.add('active');
  },

  submitQuiz(season) {
    const form = document.getElementById('quiz-form');
    let correct = 0;

    season.quiz.questions.forEach((q, i) => {
      const selected = form.querySelector(`input[name="q${i}"]:checked`);
      if (selected && parseInt(selected.value) === q.answer) {
        correct++;
      }
    });

    const score = Math.round((correct / season.quiz.questions.length) * 100);
    const passed = score >= season.quiz.passingScore;

    const content = document.getElementById('quiz-content');
    content.innerHTML = `
      <div class="quiz-result ${passed ? 'passed' : 'failed'}">
        <div class="quiz-result-icon">
          ${passed ? '<i class="fa-solid fa-trophy"></i>' : '<i class="fa-solid fa-times-circle"></i>'}
        </div>
        <h3>${passed ? 'Parabéns!' : 'Tente Novamente'}</h3>
        <p class="quiz-result-score">${correct}/${season.quiz.questions.length} corretas (${score}%)</p>
        <p class="quiz-result-message">
          ${passed ? `Você conquistou o certificado da ${season.title}!` : `Você precisa de ${season.quiz.passingScore}% para passar.`}
        </p>
        ${passed ? `<div class="quiz-result-points">+${season.quiz.points} pontos</div>` : ''}
        <button class="btn ${passed ? 'btn-primary' : 'btn-secondary'}" onclick="document.getElementById('quiz-modal').classList.remove('active')">
          ${passed ? 'Continuar Jornada' : 'Voltar'}
        </button>
      </div>
    `;

    if (passed) {
      // Podcast NÃO gera pontos para ranking (regra de negócio)
      NexusApp.showToast(`Prova aprovada! 🎓 Certificado conquistado!`, 'success');
    }
  },

  // Helpers
  isSeasonCompleted(seasonIndex) {
    const season = this.seasons[seasonIndex];
    return season.episodes.every((_, idx) =>
      this.completedEpisodes.has(`${seasonIndex}-${idx}`)
    );
  },

  isEpisodeCompleted(seasonIndex, episodeIndex) {
    return this.completedEpisodes.has(`${seasonIndex}-${episodeIndex}`);
  },

  getSeasonProgress(seasonIndex) {
    const season = this.seasons[seasonIndex];
    const completed = season.episodes.filter((_, idx) =>
      this.completedEpisodes.has(`${seasonIndex}-${idx}`)
    ).length;
    return Math.round((completed / season.episodes.length) * 100);
  },

  getOverallProgress() {
    const total = this.seasons.reduce((acc, s) => acc + s.episodes.length, 0);
    const completed = this.completedEpisodes.size;
    return Math.round((completed / total) * 100);
  },

  getCompletedEpisodesCount(seasonIndex) {
    const season = this.seasons[seasonIndex];
    return season.episodes.filter((_, idx) =>
      this.completedEpisodes.has(`${seasonIndex}-${idx}`)
    ).length;
  },

  canTakeQuiz(seasonIndex) {
    return this.isSeasonCompleted(seasonIndex);
  },

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
  },

  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    return `${m} min`;
  },

  saveProgress() {
    localStorage.setItem('nexus_podcast_progress', JSON.stringify([...this.completedEpisodes]));
  },

  loadProgress() {
    const saved = localStorage.getItem('nexus_podcast_progress');
    if (saved) {
      this.completedEpisodes = new Set(JSON.parse(saved));
    }
  }
};

// Initialize
NexusPodcast.init();

// Add podcast styles
const podcastStyles = document.createElement('style');
podcastStyles.textContent = `
  .podcast-page {
    max-width: 1400px;
    margin: 0 auto;
  }

  .podcast-header {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-2xl);
    padding: var(--space-8);
    margin-bottom: var(--space-8);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-6);
  }

  .podcast-badge {
    display: inline-block;
    background: linear-gradient(135deg, #ec4899, #8b5cf6);
    color: white;
    padding: 6px 16px;
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: var(--font-bold);
    letter-spacing: 0.1em;
    margin-bottom: var(--space-3);
  }

  .podcast-title {
    font-size: var(--text-3xl);
    font-weight: var(--font-bold);
    margin-bottom: var(--space-2);
  }

  .podcast-subtitle {
    color: var(--text-secondary);
    max-width: 500px;
  }

  .podcast-stats {
    display: flex;
    gap: var(--space-8);
  }

  .podcast-stat {
    text-align: center;
  }

  .podcast-stat-value {
    display: block;
    font-size: var(--text-3xl);
    font-weight: var(--font-bold);
    color: var(--accent-400);
  }

  .podcast-stat-label {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .seasons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-6);
  }

  .season-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
    cursor: pointer;
    transition: all var(--transition-base);
    position: relative;
    overflow: hidden;
  }

  .season-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--season-color);
    transform: scaleX(0);
    transition: transform var(--transition-base);
  }

  .season-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    border-color: var(--season-color);
  }

  .season-card:hover::before {
    transform: scaleX(1);
  }

  .season-card.locked {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .season-card.locked:hover {
    transform: none;
    box-shadow: none;
  }

  .season-lock {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    z-index: 10;
    border-radius: var(--radius-2xl);
  }

  .season-lock i {
    font-size: var(--text-3xl);
    color: var(--text-tertiary);
  }

  .season-lock span {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .season-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .season-icon {
    font-size: var(--text-3xl);
  }

  .season-badge {
    padding: 4px 12px;
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: var(--font-bold);
    color: white;
  }

  .season-title {
    font-size: var(--text-xl);
    font-weight: var(--font-bold);
    margin-bottom: var(--space-2);
  }

  .season-desc {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin-bottom: var(--space-4);
    line-height: var(--leading-relaxed);
  }

  .season-meta {
    display: flex;
    gap: var(--space-4);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    margin-bottom: var(--space-4);
  }

  .season-meta i {
    margin-right: var(--space-1);
  }

  .season-progress {
    height: 4px;
    background: var(--surface-elevated);
    border-radius: var(--radius-full);
    overflow: hidden;
    margin-bottom: var(--space-2);
  }

  .season-progress-bar {
    height: 100%;
    transition: width var(--transition-slow);
  }

  .season-progress-text {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .season-completed-badge {
    margin-top: var(--space-4);
    padding: var(--space-3);
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: var(--radius-lg);
    color: var(--success-500);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    text-align: center;
  }

  /* Player Page */
  .player-page {
    max-width: 1200px;
    margin: 0 auto;
  }

  .player-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-6);
    flex-wrap: wrap;
    gap: var(--space-4);
  }

  .player-progress-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .mini-progress {
    width: 100px;
    height: 6px;
    background: var(--surface-elevated);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .mini-progress-bar {
    height: 100%;
    transition: width var(--transition-base);
  }

  .player-layout {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: var(--space-6);
  }

  .player-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-2xl);
    overflow: hidden;
    padding: var(--space-6);
    text-align: center;
  }

  .player-cover {
    width: 200px;
    height: 200px;
    margin: 0 auto var(--space-6);
    background: linear-gradient(135deg, var(--season-color) 0%, rgba(139, 92, 246, 0.5) 100%);
    border-radius: var(--radius-2xl);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }

  .player-cover-icon {
    font-size: 80px;
    z-index: 1;
  }

  .player-season-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: var(--font-bold);
    color: white;
    margin-bottom: var(--space-2);
  }

  .player-episode-title {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    margin-bottom: var(--space-2);
  }

  .player-episode-number {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin-bottom: var(--space-6);
  }

  .player-scrubber {
    margin-bottom: var(--space-6);
  }

  .scrubber-bar {
    height: 8px;
    background: var(--surface-elevated);
    border-radius: var(--radius-full);
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }

  .scrubber-progress {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-500), var(--primary-500));
    border-radius: var(--radius-full);
    width: 0;
    transition: width 0.1s linear;
  }

  .scrubber-times {
    display: flex;
    justify-content: space-between;
    margin-top: var(--space-2);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }

  .player-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-6);
    margin-bottom: var(--space-6);
  }

  .player-btn {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-full);
    background: var(--surface-elevated);
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .player-btn:hover:not(:disabled) {
    background: var(--surface-hover);
    transform: scale(1.05);
  }

  .player-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .player-btn-main {
    width: 72px;
    height: 72px;
    background: linear-gradient(135deg, var(--accent-500), var(--primary-500));
    font-size: var(--text-xl);
    box-shadow: 0 8px 30px rgba(139, 92, 246, 0.3);
  }

  .player-btn-main:hover:not(:disabled) {
    box-shadow: 0 12px 40px rgba(139, 92, 246, 0.5);
  }

  .player-points {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    color: var(--warning-500);
  }

  .player-sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .playlist-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .playlist-header h3 {
    font-size: var(--text-base);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .playlist-count {
    font-size: var(--text-sm);
    color: var(--accent-400);
    font-weight: var(--font-bold);
  }

  .playlist-items {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    overflow: hidden;
    max-height: 320px;
    overflow-y: auto;
  }

  .playlist-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    border-bottom: 1px solid var(--surface-border);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .playlist-item:last-child {
    border-bottom: none;
  }

  .playlist-item:hover:not(.locked) {
    background: var(--surface-hover);
  }

  .playlist-item.active {
    background: var(--surface-hover);
    border-left: 3px solid var(--accent-500);
  }

  .playlist-item.locked {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .playlist-item-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background: var(--surface-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-sm);
    flex-shrink: 0;
  }

  .playlist-item.completed .playlist-item-icon {
    background: rgba(16, 185, 129, 0.2);
    color: var(--success-500);
  }

  .playlist-item.active .playlist-item-icon {
    background: var(--accent-500);
    color: white;
  }

  .playlist-item-info {
    flex: 1;
    min-width: 0;
  }

  .playlist-item-title {
    display: block;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .playlist-item-meta {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .quiz-section {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
  }

  .quiz-section.locked {
    opacity: 0.6;
  }

  .quiz-header {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .quiz-header i {
    font-size: var(--text-2xl);
    color: var(--accent-400);
  }

  .quiz-header h4 {
    font-size: var(--text-base);
    margin-bottom: 2px;
  }

  .quiz-header p {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .quiz-locked {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-align: center;
    padding: var(--space-4);
  }

  .quiz-locked i {
    font-size: var(--text-2xl);
    color: var(--text-tertiary);
  }

  .quiz-locked span {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  /* Quiz Modal */
  .quiz-modal .modal-body {
    max-height: 60vh;
    overflow-y: auto;
  }

  .quiz-question {
    margin-bottom: var(--space-6);
  }

  .quiz-question-text {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    font-weight: var(--font-semibold);
    margin-bottom: var(--space-3);
  }

  .quiz-question-num {
    background: var(--accent-500);
    color: white;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xs);
    flex-shrink: 0;
  }

  .quiz-options {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .quiz-option {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--surface-elevated);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .quiz-option:hover {
    background: var(--surface-hover);
    border-color: var(--accent-500);
  }

  .quiz-option input {
    accent-color: var(--accent-500);
  }

  .quiz-empty, .quiz-result {
    text-align: center;
    padding: var(--space-8);
  }

  .quiz-empty i, .quiz-result-icon {
    font-size: 64px;
    margin-bottom: var(--space-4);
    color: var(--text-tertiary);
  }

  .quiz-result.passed .quiz-result-icon {
    color: var(--success-500);
  }

  .quiz-result.failed .quiz-result-icon {
    color: var(--error-500);
  }

  .quiz-result-score {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    margin: var(--space-3) 0;
  }

  .quiz-result-points {
    display: inline-block;
    padding: var(--space-2) var(--space-4);
    background: rgba(16, 185, 129, 0.2);
    color: var(--success-500);
    border-radius: var(--radius-full);
    font-weight: var(--font-bold);
    margin: var(--space-4) 0;
  }

  .w-full {
    width: 100%;
  }

  @media (max-width: 1024px) {
    .player-layout {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .podcast-header {
      flex-direction: column;
      text-align: center;
    }

    .podcast-stats {
      justify-content: center;
    }

    .seasons-grid {
      grid-template-columns: 1fr;
    }
  }
`;
document.head.appendChild(podcastStyles);
window.NexusPodcast = NexusPodcast;
