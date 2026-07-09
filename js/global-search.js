/**
 * NEXUS GLOBAL SEARCH - SPOTLIGHT STYLE
 * Busca global instantânea em todos os módulos
 */

const NexusGlobalSearch = {
    isOpen: false,
    searchResults: [],
    selectedIndex: 0,
    recentSearches: [],

    /**
     * Inicializa busca global
     */
    init() {
        this.loadRecentSearches();
        this.injectStyles();
        this.injectModal();
    },

    /**
     * Abre modal de busca
     */
    open() {
        const modal = document.getElementById('global-search-modal');
        if (!modal) return;

        modal.classList.add('active');
        this.isOpen = true;

        setTimeout(() => {
            const input = document.getElementById('global-search-input');
            input?.focus();
            input.value = '';
        }, 100);

        this.renderRecentSearches();
    },

    /**
     * Fecha modal
     */
    close() {
        const modal = document.getElementById('global-search-modal');
        modal?.classList.remove('active');
        this.isOpen = false;
        this.searchResults = [];
        this.selectedIndex = 0;
    },

    /**
     * Busca em todos os módulos
     */
    async search(query) {
        if (!query || query.trim().length < 2) {
            this.renderRecentSearches();
            return;
        }

        const normalizedQuery = query.toLowerCase().trim();

        // Detectar filtros especiais
        const filter = this.detectFilter(normalizedQuery);

        this.searchResults = [];

        // Buscar em paralelo em todos os módulos
        const searches = [];

        if (!filter || filter === 'tasks') searches.push(this.searchKanban(normalizedQuery));
        if (!filter || filter === 'forum') searches.push(this.searchForum(normalizedQuery));
        if (!filter || filter === 'reports') searches.push(this.searchReports(normalizedQuery));
        if (!filter || filter === 'announcements') searches.push(this.searchAnnouncements(normalizedQuery));
        if (!filter || filter === 'users') searches.push(this.searchUsers(normalizedQuery));
        if (!filter || filter === 'agendas') searches.push(this.searchAgendas(normalizedQuery));

        const results = await Promise.all(searches);
        this.searchResults = results.flat().sort((a, b) => b.score - a.score);

        this.selectedIndex = 0;
        this.renderResults();

        // Salvar busca recente
        this.addRecentSearch(query);
    },

    /**
     * Detecta filtros (#tarefas, @pessoas, etc)
     */
    detectFilter(query) {
        if (query.startsWith('#tarefas') || query.startsWith('#tasks')) return 'tasks';
        if (query.startsWith('#forum')) return 'forum';
        if (query.startsWith('#relatorios') || query.startsWith('#reports')) return 'reports';
        if (query.startsWith('#avisos')) return 'announcements';
        if (query.startsWith('@') || query.startsWith('#pessoas')) return 'users';
        if (query.startsWith('#agendas')) return 'agendas';
        return null;
    },

    /**
     * Busca no Kanban
     */
    async searchKanban(query) {
        if (!window.NexusKanban?.allTasks) return [];

        const tasks = window.NexusKanban.allTasks;
        const results = [];

        tasks.forEach(task => {
            const score = this.calculateScore(query, [
                task.title || '',
                task.description || '',
                task.owner || '',
                task.unit || '',
                task.requester || ''
            ]);

            if (score > 0) {
                results.push({
                    type: 'task',
                    title: task.title,
                    subtitle: `${task.owner || 'Sem responsável'} • ${task.status || 'backlog'}`,
                    icon: this.getTaskIcon(task.priority),
                    score: score,
                    action: () => {
                        this.close();
                        window.NexusApp?.navigate('kanban');
                        setTimeout(() => {
                            const card = document.querySelector(`[data-task-id="${task.id}"]`);
                            if (card) {
                                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                card.style.animation = 'pulse 1s ease';
                            }
                        }, 500);
                    }
                });
            }
        });

        return results;
    },

    /**
     * Busca no Fórum
     */
    async searchForum(query) {
        const db = firebase.firestore();
        try {
            const snapshot = await db.collection('forum_topics').limit(100).get();
            const results = [];

            snapshot.docs.forEach(doc => {
                const topic = doc.data();
                const score = this.calculateScore(query, [
                    topic.title || '',
                    topic.content || '',
                    topic.author_name || ''
                ]);

                if (score > 0) {
                    results.push({
                        type: 'forum',
                        title: topic.title,
                        subtitle: `Fórum • ${topic.category || 'Sem categoria'} • ${topic.replies_count || 0} respostas`,
                        icon: '💬',
                        score: score,
                        action: () => {
                            this.close();
                            window.NexusApp?.navigate('forum');
                            setTimeout(() => {
                                if (window.NexusForum?.viewTopic) {
                                    window.NexusForum.viewTopic(doc.id, topic);
                                }
                            }, 500);
                        }
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('[GlobalSearch] Erro busca forum:', error);
            return [];
        }
    },

    /**
     * Busca em Relatórios
     */
    async searchReports(query) {
        const db = firebase.firestore();
        try {
            const snapshot = await db.collection('reports').limit(50).get();
            const results = [];

            snapshot.docs.forEach(doc => {
                const report = doc.data();
                const score = this.calculateScore(query, [
                    report.title || '',
                    report.type || '',
                    report.author_name || ''
                ]);

                if (score > 0) {
                    results.push({
                        type: 'report',
                        title: report.title,
                        subtitle: `Relatório • ${report.type || 'Geral'} • ${this.formatDate(report.created_at)}`,
                        icon: '📊',
                        score: score,
                        action: () => {
                            this.close();
                            window.NexusApp?.navigate('reports');
                        }
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('[GlobalSearch] Erro busca reports:', error);
            return [];
        }
    },

    /**
     * Busca em Avisos
     */
    async searchAnnouncements(query) {
        const db = firebase.firestore();
        try {
            const snapshot = await db.collection('announcements').limit(50).get();
            const results = [];

            snapshot.docs.forEach(doc => {
                const announcement = doc.data();
                const score = this.calculateScore(query, [
                    announcement.title || '',
                    announcement.content || '',
                    announcement.category || ''
                ]);

                if (score > 0) {
                    results.push({
                        type: 'announcement',
                        title: announcement.title,
                        subtitle: `Aviso • ${announcement.category || 'Geral'}`,
                        icon: '📢',
                        score: score,
                        action: () => {
                            this.close();
                            window.NexusApp?.navigate('announcements');
                        }
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('[GlobalSearch] Erro busca avisos:', error);
            return [];
        }
    },

    /**
     * Busca em Usuários
     */
    async searchUsers(query) {
        const db = firebase.firestore();
        try {
            const snapshot = await db.collection('users').limit(100).get();
            const results = [];

            snapshot.docs.forEach(doc => {
                const user = doc.data();
                const score = this.calculateScore(query, [
                    user.nome || '',
                    user.email || '',
                    user.cargo || '',
                    user.setor || ''
                ]);

                if (score > 0) {
                    results.push({
                        type: 'user',
                        title: user.nome,
                        subtitle: `${user.cargo || 'Cargo não definido'} • ${user.setor || 'Setor não definido'}`,
                        icon: '👤',
                        score: score,
                        action: () => {
                            this.close();
                            // Abrir perfil do usuário se existir
                            window.NexusApp?.showToast(`Perfil de ${user.nome}`, 'info');
                        }
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('[GlobalSearch] Erro busca users:', error);
            return [];
        }
    },

    /**
     * Busca em Agendas
     */
    async searchAgendas(query) {
        const db = firebase.firestore();
        try {
            const snapshot = await db.collection('agendas').limit(50).get();
            const results = [];

            snapshot.docs.forEach(doc => {
                const agenda = doc.data();
                const score = this.calculateScore(query, [
                    agenda.title || '',
                    agenda.responsible || '',
                    agenda.minute || ''
                ]);

                if (score > 0) {
                    results.push({
                        type: 'agenda',
                        title: agenda.title,
                        subtitle: `Agenda • ${this.formatDate(agenda.date)} • ${agenda.responsible || 'Sem responsável'}`,
                        icon: '📅',
                        score: score,
                        action: () => {
                            this.close();
                            window.NexusApp?.navigate('calendar');
                        }
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('[GlobalSearch] Erro busca agendas:', error);
            return [];
        }
    },

    /**
     * Calcula score de relevância (fuzzy match)
     */
    calculateScore(query, texts) {
        let score = 0;
        const queryLower = query.toLowerCase().replace(/[#@]/g, '');
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

        texts.forEach(text => {
            if (!text) return;
            const textLower = text.toLowerCase();

            queryWords.forEach(word => {
                // Match exato
                if (textLower === word) score += 100;
                // Começa com
                else if (textLower.startsWith(word)) score += 50;
                // Contém
                else if (textLower.includes(word)) score += 20;
                // Fuzzy (todas as letras na ordem)
                else if (this.fuzzyMatch(word, textLower)) score += 10;
            });
        });

        return score;
    },

    /**
     * Fuzzy match simples
     */
    fuzzyMatch(pattern, text) {
        let patternIdx = 0;
        for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
            if (text[i] === pattern[patternIdx]) patternIdx++;
        }
        return patternIdx === pattern.length;
    },

    /**
     * Renderiza resultados
     */
    renderResults() {
        const container = document.getElementById('global-search-results');
        if (!container) return;

        if (this.searchResults.length === 0) {
            container.innerHTML = `
        <div class="search-empty">
          <div style="font-size: 48px; margin-bottom: 12px;">🔍</div>
          <div style="font-size: 14px; color: var(--text-secondary);">Nenhum resultado encontrado</div>
        </div>
      `;
            return;
        }

        container.innerHTML = this.searchResults.slice(0, 8).map((result, idx) => `
      <div class="search-result-item ${idx === this.selectedIndex ? 'selected' : ''}" data-index="${idx}">
        <div class="search-result-icon">${result.icon}</div>
        <div class="search-result-content">
          <div class="search-result-title">${this.highlightMatch(result.title)}</div>
          <div class="search-result-subtitle">${result.subtitle}</div>
        </div>
        <div class="search-result-badge">${result.type}</div>
      </div>
    `).join('');

        // Bind click events
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const idx = parseInt(item.dataset.index);
                this.selectResult(idx);
            });
        });
    },

    /**
     * Renderiza buscas recentes
     */
    renderRecentSearches() {
        const container = document.getElementById('global-search-results');
        if (!container) return;

        if (this.recentSearches.length === 0) {
            container.innerHTML = `
        <div class="search-empty">
          <div style="font-size: 48px; margin-bottom: 12px;">🔍</div>
          <div style="font-size: 14px; color: var(--text-secondary);">Comece a digitar para buscar...</div>
          <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 8px;">
            Use <kbd>Ctrl+K</kbd> para abrir, <kbd>Esc</kbd> para fechar
          </div>
        </div>
      `;
            return;
        }

        container.innerHTML = `
      <div class="search-section-title">Buscas Recentes</div>
      ${this.recentSearches.map((search, idx) => `
        <div class="search-result-item" data-recent="${idx}">
          <div class="search-result-icon">🕒</div>
          <div class="search-result-content">
            <div class="search-result-title">${search}</div>
          </div>
        </div>
      `).join('')}
    `;

        container.querySelectorAll('[data-recent]').forEach(item => {
            item.addEventListener('click', () => {
                const query = this.recentSearches[parseInt(item.dataset.recent)];
                document.getElementById('global-search-input').value = query;
                this.search(query);
            });
        });
    },

    /**
     * Highlight de match
     */
    highlightMatch(text) {
        // Por simplicidade, retorna texto normal
        // TODO: implementar highlight real
        return text;
    },

    /**
     * Seleciona resultado
     */
    selectResult(index) {
        if (this.searchResults[index]) {
            this.searchResults[index].action();
        }
    },

    /**
     * Navega com teclado
     */
    handleKeyboard(e) {
        if (!this.isOpen) return;

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this.close();
                break;

            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.searchResults.length - 1);
                this.renderResults();
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.renderResults();
                break;

            case 'Enter':
                e.preventDefault();
                this.selectResult(this.selectedIndex);
                break;
        }
    },

    /**
     * Salva busca recente
     */
    addRecentSearch(query) {
        if (!query || query.trim().length < 2) return;

        this.recentSearches = this.recentSearches.filter(s => s !== query);
        this.recentSearches.unshift(query);
        this.recentSearches = this.recentSearches.slice(0, 5);

        localStorage.setItem('nep_recent_searches', JSON.stringify(this.recentSearches));
    },

    /**
     * Carrega buscas recentes
     */
    loadRecentSearches() {
        try {
            this.recentSearches = JSON.parse(localStorage.getItem('nep_recent_searches') || '[]');
        } catch (e) {
            this.recentSearches = [];
        }
    },

    /**
     * Helpers
     */
    getTaskIcon(priority) {
        const icons = {
            'Urgente': '🔴',
            'Alta': '🟠',
            'Média': '🟡',
            'Baixa': '🟢'
        };
        return icons[priority] || '📋';
    },

    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    },

    /**
     * Injeta modal HTML
     */
    injectModal() {
        const existing = document.getElementById('global-search-modal');
        if (existing) return;

        const modal = document.createElement('div');
        modal.id = 'global-search-modal';
        modal.className = 'global-search-overlay';
        modal.innerHTML = `
      <div class="global-search-backdrop"></div>
      <div class="global-search-container">
        <div class="global-search-box">
          <div class="global-search-header">
            <span class="global-search-icon">🔍</span>
            <input 
              type="text" 
              id="global-search-input" 
              placeholder="Buscar em tudo... (digite # para filtros)"
              autocomplete="off"
              spellcheck="false"
            />
            <kbd class="global-search-kbd">Esc</kbd>
          </div>
          <div class="global-search-results" id="global-search-results"></div>
          <div class="global-search-footer">
            <div class="global-search-hints">
              <span><kbd>#tarefas</kbd> Filtrar tarefas</span>
              <span><kbd>#forum</kbd> Tópicos</span>
              <span><kbd>@nome</kbd> Pessoas</span>
            </div>
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(modal);

        // Bind events
        modal.querySelector('.global-search-backdrop').addEventListener('click', () => this.close());

        const input = document.getElementById('global-search-input');
        let debounceTimer;
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.search(e.target.value), 200);
        });

        input.addEventListener('keydown', (e) => this.handleKeyboard(e));
    },

    /**
     * Injeta estilos
     */
    injectStyles() {
        const styleId = 'global-search-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
      .global-search-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: none;
        align-items: flex-start;
        justify-content: center;
        padding-top: 15vh;
      }
      
      .global-search-overlay.active {
        display: flex;
      }
      
      .global-search-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        animation: fadeIn 0.2s ease;
      }
      
      .global-search-container {
        position: relative;
        width: 100%;
        max-width: 640px;
        animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      
      .global-search-box {
        background: var(--surface-card, #1f2937);
        border: 1px solid var(--surface-border, #374151);
        border-radius: 16px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        overflow: hidden;
      }
      
      .global-search-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--surface-border, #374151);
      }
      
      .global-search-icon {
        font-size: 20px;
        opacity: 0.6;
      }
      
      #global-search-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: 16px;
        color: var(--text-primary, #fff);
        font-weight: 500;
      }
      
      #global-search-input::placeholder {
        color: var(--text-tertiary, #6b7280);
      }
      
      .global-search-kbd {
        padding: 4px 8px;
        background: var(--surface-elevated, #374151);
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        color: var(--text-secondary, #9ca3af);
        font-family: monospace;
      }
      
      .global-search-results {
        max-height: 400px;
        overflow-y: auto;
        padding: 8px;
      }
      
      .search-result-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      
      .search-result-item:hover,
      .search-result-item.selected {
        background: var(--surface-elevated, #374151);
      }
      
      .search-result-icon {
        font-size: 24px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--surface-elevated, #374151);
        border-radius: 8px;
      }
      
      .search-result-content {
        flex: 1;
        min-width: 0;
      }
      
      .search-result-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary, #fff);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .search-result-subtitle {
        font-size: 12px;
        color: var(--text-secondary, #9ca3af);
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .search-result-badge {
        font-size: 10px;
        font-weight: 600;
        color: var(--text-tertiary, #6b7280);
        background: var(--surface-elevated, #374151);
        padding: 4px 8px;
        border-radius: 4px;
        text-transform: uppercase;
      }
      
      .search-empty {
        padding: 60px 20px;
        text-align: center;
      }
      
      .search-section-title {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-tertiary, #6b7280);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 12px 12px 8px;
      }
      
      .global-search-footer {
        border-top: 1px solid var(--surface-border, #374151);
        padding: 12px 16px;
      }
      
      .global-search-hints {
        display: flex;
        gap: 16px;
        font-size: 11px;
        color: var(--text-tertiary, #6b7280);
      }
      
      .global-search-hints kbd {
        background: var(--surface-elevated, #374151);
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: 600;
        margin-right: 4px;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideDown {
        from { 
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;

        document.head.appendChild(style);
    }
};

// Inicializar quando DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NexusGlobalSearch.init());
} else {
    NexusGlobalSearch.init();
}

// Expor globalmente
window.NexusGlobalSearch = NexusGlobalSearch;

console.log('[GlobalSearch] Module loaded');
