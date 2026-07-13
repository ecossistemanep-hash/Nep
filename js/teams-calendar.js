/**
 * NEXUS TEAMS CALENDAR
 * Módulo de Calendário Integrado (Simulação Teams/Outlook)
 */

const NexusTeamsCalendar = {
    currentDate: new Date(),
    view: 'month', // 'month', 'week', 'day'
    events: [],

    // Configurações
    container: null,

    // Inicialização
    async render(container) {
        this.container = container;
        container.innerHTML = `
            <div class="calendar-wrapper animate-fade-in">
                <div class="cal-header">
                    <div class="cal-title-area">
                        <h2 class="cal-title">📅 Calendário</h2>
                        <p class="cal-subtitle">Sincronizado com Microsoft Teams</p>
                    </div>
                    <div class="cal-actions">
                        <div class="cal-nav">
                            <button class="btn-icon" id="btn-prev"><i class="fa-solid fa-chevron-left"></i></button>
                            <span id="cal-current-label">Janeiro 2026</span>
                            <button class="btn-icon" id="btn-next"><i class="fa-solid fa-chevron-right"></i></button>
                        </div>
                        <button class="btn btn-primary" id="btn-connect-teams">
                            <i class="fa-brands fa-microsoft"></i> Conectar com Teams
                        </button>
                        <button class="btn btn-secondary" id="btn-today">Hoje</button>
                    </div>
                </div>

                <div class="cal-grid" id="cal-grid">
                    <!-- Grid gerado dinamicamente -->
                </div>
            </div>
        `;

        this.injectStyles();
        await this.fetchEvents();
        this.renderCalendar();
        this.attachEvents();
    },

    // Dados Mockados
    async fetchEvents() {
        // Simulação de delay de rede
        this.container.querySelector('#cal-grid').innerHTML = '<div class="cal-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando agenda...</div>';

        await new Promise(r => setTimeout(r, 800));

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        // Eventos fictícios
        this.events = [
            {
                id: '1',
                title: 'Daily Meeting - Qualidade',
                start: new Date(year, month, today.getDate(), 9, 0),
                end: new Date(year, month, today.getDate(), 9, 30),
                type: 'meeting',
                organizer: 'Fernando Pereira'
            },
            {
                id: '2',
                title: 'Alinhamento OKR Q1',
                start: new Date(year, month, today.getDate(), 14, 0),
                end: new Date(year, month, today.getDate(), 15, 0),
                type: 'planning',
                organizer: 'Diretoria'
            },
            {
                id: '3',
                title: 'Treinamento Novos Analistas',
                start: new Date(year, month, today.getDate() + 1, 10, 0),
                end: new Date(year, month, today.getDate() + 1, 12, 0),
                type: 'training',
                organizer: 'RH'
            },
            {
                id: '4',
                title: 'Apresentação de Resultados',
                start: new Date(year, month, today.getDate() + 3, 16, 0),
                end: new Date(year, month, today.getDate() + 3, 17, 30),
                type: 'presentation',
                organizer: 'Gestão'
            },
            {
                id: '5',
                title: 'Feriado Local',
                start: new Date(year, month, today.getDate() + 5, 0, 0),
                end: new Date(year, month, today.getDate() + 5, 23, 59),
                type: 'holiday',
                allDay: true,
                organizer: 'Sistema'
            }
        ];
    },

    // Renderização do Grid (Mês)
    renderCalendar() {
        const grid = document.getElementById('cal-grid');
        if (!grid) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Atualizar Label
        const monthName = this.currentDate.toLocaleString('pt-BR', { month: 'long' });
        document.getElementById('cal-current-label').textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

        // Dias da semana
        const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        let html = `<div class="cal-week-header">
            ${weekDays.map(d => `<div>${d}</div>`).join('')}
        </div>`;

        html += '<div class="cal-days-grid">';

        // Lógica de dias
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay(); // 0-6
        const totalDays = lastDay.getDate();

        // Dias vazios antes do dia 1
        for (let i = 0; i < startingDay; i++) {
            html += `<div class="cal-day empty"></div>`;
        }

        // Dias do mês
        const today = new Date();
        for (let i = 1; i <= totalDays; i++) {
            const currentDayDate = new Date(year, month, i);
            const isToday = currentDayDate.toDateString() === today.toDateString();

            // Buscar eventos do dia
            const dayEvents = this.events.filter(e =>
                e.start.getDate() === i &&
                e.start.getMonth() === month &&
                e.start.getFullYear() === year
            );

            html += `
                <div class="cal-day ${isToday ? 'today' : ''}" data-date="${year}-${month}-${i}">
                    <div class="cal-day-number">${i}</div>
                    <div class="cal-events-list">
                        ${dayEvents.map(e => `
                            <div class="cal-event-pill type-${e.type}" title="${e.title} (${e.organizer})">
                                ${e.allDay ? '' : `<span class="cal-time">${e.start.getHours()}:${e.start.getMinutes().toString().padStart(2, '0')}</span>`}
                                <span class="cal-evt-title">${e.title}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div>'; // Fecha grid
        grid.innerHTML = html;
        this.attachGridEvents();
    },

    attachEvents() {
        document.getElementById('btn-prev')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('btn-next')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });

        document.getElementById('btn-today')?.addEventListener('click', () => {
            this.currentDate = new Date();
            this.renderCalendar();
        });

        document.getElementById('btn-connect-teams')?.addEventListener('click', () => {
            NexusApp.showToast('Funcionalidade em breve! Será necessária conta Microsoft.', 'info');
        });
    },

    attachGridEvents() {
        document.querySelectorAll('.cal-event-pill').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                NexusApp.showToast(el.getAttribute('title'), 'info');
            });
        });
    },

    injectStyles() {
        if (document.getElementById('teams-calendar-style')) return;
        const style = document.createElement('style');
        style.id = 'teams-calendar-style';
        style.textContent = `
            .calendar-wrapper {
                padding: 1.5rem;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: var(--bg-secondary);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-md);
            }

            .cal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
                flex-wrap: wrap;
                gap: 1rem;
            }

            .cal-title-area h2 { margin: 0; color: var(--text-primary); font-family: 'Orbitron', sans-serif; }
            .cal-subtitle { margin: 0; color: var(--text-secondary); font-size: 0.9rem; }

            .cal-actions {
                display: flex;
                gap: 1rem;
                align-items: center;
            }

            .cal-nav {
                display: flex;
                align-items: center;
                gap: 1rem;
                background: var(--bg-primary);
                padding: 0.5rem 1rem;
                border-radius: var(--radius-md);
                border: 1px solid var(--border-color);
            }

            #cal-current-label {
                min-width: 140px;
                text-align: center;
                font-weight: 600;
                color: var(--text-primary);
            }

            .cal-grid {
                flex: 1;
                display: flex;
                flex-direction: column;
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                background: var(--bg-card);
                overflow: hidden;
            }

            .cal-week-header {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                background: var(--bg-start);
                border-bottom: 1px solid var(--border-color);
                padding: 0.8rem 0;
            }

            .cal-week-header div {
                text-align: center;
                text-transform: uppercase;
                font-size: 0.8rem;
                font-weight: 600;
                color: var(--text-secondary);
                letter-spacing: 1px;
            }

            .cal-days-grid {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                /* grid-template-rows: repeat(5, 1fr); Depende do mês, auto é melhor */
                flex: 1;
                background: var(--bg-primary);
            }

            .cal-day {
                border-right: 1px solid var(--border-color);
                border-bottom: 1px solid var(--border-color);
                min-height: 100px;
                padding: 0.5rem;
                background: var(--bg-card);
                transition: background 0.2s;
            }

            .cal-day:hover {
                background: var(--bg-hover);
            }

            .cal-day.empty {
                background: var(--bg-primary);
            }

            .cal-day.today {
                background: rgba(56, 189, 248, 0.05);
            }

            .cal-day.today .cal-day-number {
                background: var(--primary);
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .cal-day-number {
                font-weight: 600;
                color: var(--text-secondary);
                margin-bottom: 0.5rem;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .cal-events-list {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .cal-event-pill {
                font-size: 0.75rem;
                padding: 2px 6px;
                border-radius: 4px;
                background: var(--surface-hover);
                color: var(--text-primary);
                cursor: pointer;
                border-left: 3px solid var(--text-secondary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .cal-event-pill:hover {
                filter: brightness(1.1);
            }

            /* Tipos de Eventos */
            .cal-event-pill.type-meeting { border-left-color: #38bdf8; background: rgba(56, 189, 248, 0.15); }
            .cal-event-pill.type-planning { border-left-color: #7555e8; background: rgba(168, 85, 247, 0.15); }
            .cal-event-pill.type-training { border-left-color: #22c55e; background: rgba(34, 197, 94, 0.15); }
            .cal-event-pill.type-presentation { border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.15); }
            .cal-event-pill.type-holiday { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.15); font-weight: bold; }

            .cal-loading {
                padding: 2rem;
                text-align: center;
                color: var(--text-secondary);
            }

            @media (max-width: 768px) {
                .cal-header { flex-direction: column; align-items: stretch; }
                .cal-actions { flex-direction: column; }
                .cal-week-header div { font-size: 0.7rem; }
                .cal-day { min-height: 80px; }
            }
        `;
        document.head.appendChild(style);
    }
};

// Exportar globalmente
window.NexusTeamsCalendar = NexusTeamsCalendar;
