/**
 * NEXUS PLATFORM - SISTEMA DE GOVERNANÇA E GESTÃO
 * (Substitui o antigo OKR Management)
 * 
 * Módulos:
 * 1. Dashboard de Indicadores
 * 2. OKRs (Objectives and Key Results)
 * 3. Cases de Sucesso
 * 4. Sugestões de Melhoria
 * 5. Elogios
 * 6. Rituais e Prazos
 * 7. Recuperação Financeira
 */

const NexusOKR = {
    // Estado local
    currentTab: 'dashboard',
    editingId: null,
    editingTable: null,
    okrs: [],
    cases: [],
    suggestions: [],
    compliments: [],
    rituals: [],
    recovery: [],

    init() {
        console.log('[NexusGovernance] Módulo de Governança Inicializado');
        this.bindGlobalEvents();
    },

    bindGlobalEvents() {
        // Expor funções para o HTML globalmente se necessário, ou usar NexusOKR nas chamadas
        window.NexusGovernance = this;
    },

    async render(container) {
        // CSS Específico do Módulo (Copiado e Adaptado do HTML original)
        const styles = `
            <style>
                .gov-container {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    color: var(--text-primary);
                    padding-bottom: 50px;
                }

                .gov-header {
                    background: var(--surface-card);
                    padding: 30px;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    margin-bottom: 30px;
                    text-align: center;
                    border: 1px solid var(--surface-border);
                }

                .gov-header h1 {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-size: 2.5em;
                    margin-bottom: 10px;
                    font-weight: 800;
                }

                .gov-subtitle {
                    color: var(--text-secondary);
                    font-size: 1.2em;
                }

                /* Nav Tabs */
                .gov-nav-tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 30px;
                    flex-wrap: wrap;
                }

                .gov-tab-button {
                    background: var(--surface-card);
                    color: var(--text-secondary);
                    border: 1px solid var(--surface-border);
                    padding: 15px 25px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 1em;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    flex: 1;
                    text-align: center;
                    min-width: 150px;
                }

                .gov-tab-button:hover {
                    transform: translateY(-2px);
                    background: var(--surface-hover);
                    color: var(--text-primary);
                }

                .gov-tab-button.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
                }

                /* Section */
                .gov-section {
                    background: var(--surface-card);
                    padding: 30px;
                    border-radius: 15px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                    margin-bottom: 25px;
                    border: 1px solid var(--surface-border);
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .gov-section h2 {
                    color: #8b5cf6;
                    font-size: 1.8em;
                    margin-bottom: 20px;
                    border-bottom: 3px solid #667eea;
                    padding-bottom: 10px;
                    display: inline-block;
                }

                .gov-section h3 {
                    color: #a78bfa;
                    font-size: 1.4em;
                    margin: 25px 0 15px 0;
                }

                /* Forms */
                .gov-form-group { margin-bottom: 20px; }
                .gov-label { display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); }
                
                .gov-input, .gov-select, .gov-textarea {
                    width: 100%;
                    padding: 12px;
                    background: var(--bg-body);
                    border: 2px solid var(--surface-border);
                    border-radius: 8px;
                    font-size: 1em;
                    color: var(--text-primary);
                    transition: border-color 0.3s ease;
                }

                .gov-input:focus, .gov-select:focus, .gov-textarea:focus {
                    outline: none;
                    border-color: #667eea;
                }

                .gov-textarea { resize: vertical; min-height: 100px; }

                .gov-form-row {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                }

                .gov-btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 8px;
                    font-size: 1.1em;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    width: 100%;
                    margin-top: 10px;
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
                }

                .gov-btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 7px 20px rgba(102, 126, 234, 0.5);
                    filter: brightness(1.1);
                }

                /* Table */
                .gov-table-wrapper { overflow-x: auto; }
                .gov-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    font-size: 0.95em;
                    min-width: 800px;
                }

                .gov-th {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 15px;
                    text-align: left;
                    font-weight: 600;
                    border-radius: 4px 4px 0 0;
                }

                .gov-td {
                    padding: 12px 15px;
                    border-bottom: 1px solid var(--surface-border);
                    color: var(--text-secondary);
                }

                .gov-tr:hover .gov-td {
                    background: var(--surface-hover);
                    color: var(--text-primary);
                }

                /* Cards Stats */
                .gov-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin: 20px 0;
                }

                .gov-stat-card {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 25px;
                    border-radius: 10px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    text-align: center;
                }

                .gov-stat-number { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
                .gov-stat-label { font-size: 1em; opacity: 0.9; }

                /* Progress Bar */
                .gov-progress-bar {
                    width: 100%;
                    height: 25px;
                    background: var(--surface-border);
                    border-radius: 12px;
                    overflow: hidden;
                    margin: 10px 0;
                }

                .gov-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 600;
                    font-size: 0.9em;
                    transition: width 0.3s ease;
                }

                /* Alert */
                .gov-alert {
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    display: none;
                    font-weight: 500;
                }
                .gov-alert.show { display: block; animation: slideDown 0.3s ease; }
                .gov-alert-success { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; }

                /* Status Badges */
                .gov-badge { padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: 600; }
                .badge-validado { background: rgba(16, 185, 129, 0.2); color: #10b981; }
                .badge-pendente { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
                .badge-revisao { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

                /* Action Buttons */
                .gov-actions { display: flex; gap: 6px; justify-content: center; }
                .gov-btn-edit, .gov-btn-delete {
                    width: 32px; height: 32px; border: none; border-radius: 8px;
                    cursor: pointer; font-size: 14px; display: flex; align-items: center;
                    justify-content: center; transition: all 0.2s ease; background: transparent;
                }
                .gov-btn-edit:hover { background: rgba(59, 130, 246, 0.15); transform: scale(1.1); }
                .gov-btn-delete:hover { background: rgba(239, 68, 68, 0.15); transform: scale(1.1); }
            </style>
        `;

        container.innerHTML = styles + `
            <div class="gov-container animate-fade-in">
                <header class="gov-header">
                    <h1>Sistema de Governança</h1>
                    <p class="gov-subtitle">Superintendência Samuel Rosa - 2026</p>
                    <p style="margin-top: 10px; color: #a78bfa; font-weight: 600;">Antecipar & Diferenciar</p>
                </header>

                <div class="gov-nav-tabs">
                    <button class="gov-tab-button ${this.currentTab === 'dashboard' ? 'active' : ''}" onclick="NexusOKR.showTab('dashboard')">📊 Dashboard</button>
                    <button class="gov-tab-button ${this.currentTab === 'okrs' ? 'active' : ''}" onclick="NexusOKR.showTab('okrs')">🎯 Cadastrar OKRs</button>
                    <button class="gov-tab-button ${this.currentTab === 'cases' ? 'active' : ''}" onclick="NexusOKR.showTab('cases')">💡 Registrar Cases</button>
                    <button class="gov-tab-button ${this.currentTab === 'sugestoes' ? 'active' : ''}" onclick="NexusOKR.showTab('sugestoes')">💭 Sugestões</button>
                    <button class="gov-tab-button ${this.currentTab === 'elogios' ? 'active' : ''}" onclick="NexusOKR.showTab('elogios')">⭐ Elogios</button>
                    <button class="gov-tab-button ${this.currentTab === 'rituais' ? 'active' : ''}" onclick="NexusOKR.showTab('rituais')">⏰ Controle de Rituais</button>
                    <button class="gov-tab-button ${this.currentTab === 'recuperacao' ? 'active' : ''}" onclick="NexusOKR.showTab('recuperacao')">💰 Recuperação</button>
                </div>

                <div id="gov-content-area">
                    <!-- O conteúdo da aba ativa será renderizado aqui -->
                    <div class="flex items-center justify-center p-8"><span class="loading-spinner"></span></div>
                </div>
            </div>
        `;

        // Carregar dados iniciais e renderizar aba atual
        await this.loadAllData();
        this.renderCurrentTab();
    },

    showTab(tabName) {
        this.currentTab = tabName;
        // Atualizar botões
        document.querySelectorAll('.gov-tab-button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.toLowerCase().includes(tabName.substring(0, 3))) {
                btn.classList.add('active'); // Match aproximado pelo texto ou índice
            }
            // Força active via onclick direto se preferir, mas aqui vamos re-renderizar styles ou classes
        });

        // Re-renderizar apenas container ou botões
        const buttons = document.querySelectorAll('.gov-tab-button');
        const tabMap = ['dashboard', 'okrs', 'cases', 'sugestoes', 'elogios', 'rituais', 'recuperacao'];
        buttons.forEach((btn, index) => {
            if (tabMap[index] === tabName) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        this.renderCurrentTab();
    },

    renderCurrentTab() {
        const container = document.getElementById('gov-content-area');
        if (!container) return;

        switch (this.currentTab) {
            case 'dashboard': this.renderDashboard(container); break;
            case 'okrs': this.renderOKRs(container); break;
            case 'cases': this.renderCases(container); break;
            case 'sugestoes': this.renderSugestoes(container); break;
            case 'elogios': this.renderElogios(container); break;
            case 'rituais': this.renderRituais(container); break;
            case 'recuperacao': this.renderRecuperacao(container); break;
        }
    },

    // ================================= DATA LOADING =================================

    async loadAllData() {
        if (!window.supabaseClient) {
            console.error('Supabase Client not ready');
            return;
        }

        try {
            // Paralelizar chamadas
            const [okrs, cases, suggestions, compliments, rituals, recovery] = await Promise.all([
                window.supabaseClient.from('gov_okrs').select('*'),
                window.supabaseClient.from('gov_cases').select('*'),
                window.supabaseClient.from('gov_suggestions').select('*'),
                window.supabaseClient.from('gov_compliments').select('*'),
                window.supabaseClient.from('gov_rituals').select('*'),
                window.supabaseClient.from('gov_recovery').select('*')
            ]);

            let okrsData = okrs.data || [];
            let casesData = cases.data || [];
            let suggestionsData = suggestions.data || [];
            let complimentsData = compliments.data || [];
            let ritualsData = rituals.data || [];
            let recoveryData = recovery.data || [];

            // Filtragem por Logo (Mapeamento de Nomes -> Usuários Firebase)
            if (window.LogoService && window.LogoService.shouldFilterByLogo() && window.db) {
                try {
                    const snap = await window.db.collection('users').where('status', '==', 'ATIVO').get();
                    const fbUsers = snap.docs.map(doc => doc.data());

                    const canSeeName = (name) => {
                        if (!name) return true;
                        const nameLower = name.trim().toLowerCase();
                        const matches = fbUsers.filter(u => {
                            const uName = (u.nome || u.name || '').toLowerCase();
                            return uName.includes(nameLower) || nameLower.includes(uName);
                        });

                        if (matches.length > 0) {
                            return matches.some(m => window.LogoService.canSeeUser(m));
                        }
                        return true; // Se não achar usuário com esse nome, permite ver por padrão
                    };

                    okrsData = okrsData.filter(item => canSeeName(item.lider));
                    casesData = casesData.filter(item => canSeeName(item.responsavel));
                    suggestionsData = suggestionsData.filter(item => canSeeName(item.responsavel));
                    ritualsData = ritualsData.filter(item => canSeeName(item.responsavel));
                    recoveryData = recoveryData.filter(item => canSeeName(item.responsavel));
                    complimentsData = complimentsData.filter(item => canSeeName(item.quem_recebeu) || canSeeName(item.quem_elogiou) || canSeeName(item.user_name));

                } catch (e) {
                    console.warn('[OKR] Erro ao filtrar por logo:', e);
                }
            }

            this.okrs = okrsData;
            this.cases = casesData;
            this.suggestions = suggestionsData;
            this.compliments = complimentsData;
            this.rituals = ritualsData;
            this.recovery = recoveryData;

        } catch (error) {
            console.error("Erro ao carregar dados de governança:", error);
            NexusApp.showToast("Erro ao carregar dados.", "error");
        }
    },

    // ================================= TABS =================================

    renderDashboard(container) {
        // Calcular totais
        const totalOkrs = this.okrs.length;
        const totalCases = this.cases.filter(c => c.status === 'Validado').length;
        const totalSugestoes = this.suggestions.filter(s => s.status === 'Aprovada' || s.status === 'Implementada').length;
        const totalRecuperacao = this.recovery.reduce((acc, curr) => acc + (parseFloat(curr.valor_recuperado) || 0), 0);

        // Formatar moeda
        const recuperacaoFormatada = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRecuperacao);

        container.innerHTML = `
            <div class="gov-section animate-fade-in">
                <h2>📊 Dashboard de Indicadores</h2>

                <div class="gov-stats-grid">
                    <div class="gov-stat-card">
                        <div class="gov-stat-label">OKRs Cadastrados</div>
                        <div class="gov-stat-number">${totalOkrs}</div>
                        <div class="gov-stat-label">Total</div>
                    </div>
                    <div class="gov-stat-card">
                        <div class="gov-stat-label">Cases Validados</div>
                        <div class="gov-stat-number">${totalCases}</div>
                        <div class="gov-stat-label">Total</div>
                    </div>
                    <div class="gov-stat-card">
                        <div class="gov-stat-label">Sugestões Aprovadas</div>
                        <div class="gov-stat-number">${totalSugestoes}</div>
                        <div class="gov-stat-label">Total</div>
                    </div>
                    <div class="gov-stat-card">
                        <div class="gov-stat-label">Recuperação Financeira</div>
                        <div class="gov-stat-number" style="font-size: 1.8em;">${recuperacaoFormatada}</div>
                        <div class="gov-stat-label">Acumulado</div>
                    </div>
                </div>

                <h3>Aderência aos Rituais (Simulado)</h3>
                <div style="margin: 20px 0;">
                    <label class="gov-label">Agendas Programadas</label>
                    <div class="gov-progress-bar">
                        <div class="gov-progress-fill" style="width: 85%;">85%</div>
                    </div>

                    <label class="gov-label" style="margin-top: 15px;">Reports de Qualidade</label>
                    <div class="gov-progress-bar">
                        <div class="gov-progress-fill" style="width: 70%;">70%</div>
                    </div>

                    <label class="gov-label" style="margin-top: 15px;">Cumprimento de Prazos</label>
                    <div class="gov-progress-bar">
                        <div class="gov-progress-fill" style="width: 92%;">92%</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderOKRs(container) {
        container.innerHTML = `
            <div class="gov-section animate-fade-in">
                <h2>🎯 Cadastrar OKRs</h2>
                <div id="alert-okr" class="gov-alert gov-alert-success">OKR Cadastrado com sucesso!</div>

                <form id="form-okr" onsubmit="NexusOKR.submitOKR(event)">
                    <div class="gov-form-row">
                        <div class="gov-form-group">
                            <label class="gov-label">Líder Responsável *</label>
                            <select class="gov-select" name="lider" required>
                                <option value="">Selecione...</option>
                                <option value="Pedro Almeida">Pedro Almeida</option>
                                <option value="Kathellen Heloisa">Kathellen Heloisa</option>
                                <option value="Luiz Bertoldo">Luiz Bertoldo</option>
                                <option value="Thyellisson Ayslan">Thyellisson Ayslan</option>
                                <option value="Aleff Dias">Aleff Dias</option>
                            </select>
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Período *</label>
                            <select class="gov-select" name="periodo" required>
                                <option value="Q1-2026">Q1 2026</option>
                                <option value="Q2-2026">Q2 2026</option>
                                <option value="Q3-2026">Q3 2026</option>
                                <option value="Q4-2026">Q4 2026</option>
                            </select>
                        </div>
                    </div>

                    <div class="gov-form-group">
                        <label class="gov-label">Objetivo (O) *</label>
                        <textarea class="gov-textarea" name="objetivo" required placeholder="Qual mudança vamos causar?"></textarea>
                    </div>

                    <div class="gov-form-group">
                        <label class="gov-label">Key Result 1 *</label>
                        <input type="text" class="gov-input" name="kr1_titulo" required placeholder="Métrica mensurável">
                    </div>
                    <div class="gov-form-row">
                        <div class="gov-form-group">
                            <label class="gov-label">Baseline KR1</label>
                            <input type="text" class="gov-input" name="kr1_baseline" placeholder="Média anterior">
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Meta KR1 *</label>
                            <input type="text" class="gov-input" name="kr1_meta" required placeholder="Valor esperado">
                        </div>
                    </div>

                    <!-- Campos de Fonte -->
                    <div class="gov-form-row">
                        <div class="gov-form-group">
                            <label class="gov-label">Fonte Oficial dos Dados *</label>
                            <input type="text" class="gov-input" name="fonte_dados" required placeholder="Sistema/painel single source of truth">
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Owner do Indicador *</label>
                            <input type="text" class="gov-input" name="owner_dados" required placeholder="Responsável por validar os dados">
                        </div>
                    </div>

                    <button type="submit" class="gov-btn-primary">💾 Cadastrar OKR</button>
                </form>

                <h3 style="margin-top: 40px;">OKRs Cadastrados</h3>
                <div class="gov-table-wrapper">
                    <table class="gov-table">
                        <thead>
                            <tr>
                                <th class="gov-th">Líder</th>
                                <th class="gov-th">Período</th>
                                <th class="gov-th">Objetivo</th>
                                <th class="gov-th">KR Principal</th>
                                <th class="gov-th">Meta</th>
                                <th class="gov-th" style="width:100px;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.okrs.length === 0
                ? '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-tertiary);">Nenhum OKR cadastrado.</td></tr>'
                : this.okrs.map(okr => `
                                    <tr class="gov-tr">
                                        <td class="gov-td">${okr.lider}</td>
                                        <td class="gov-td">${okr.periodo}</td>
                                        <td class="gov-td">${okr.objetivo}</td>
                                        <td class="gov-td">${okr.kr1_titulo}</td>
                                        <td class="gov-td">${okr.kr1_meta}</td>
                                        <td class="gov-td gov-actions">
                                            <button class="gov-btn-edit" onclick="NexusOKR.startEdit('gov_okrs', ${JSON.stringify(okr).replace(/"/g, '&quot;')})" title="Editar">✏️</button>
                                            <button class="gov-btn-delete" onclick="NexusOKR.deleteItem('gov_okrs', '${okr.id}')" title="Excluir">🗑️</button>
                                        </td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderCases(container) {
        container.innerHTML = `
            <div class="gov-section animate-fade-in">
                <h2>💡 Registrar Cases</h2>
                <div id="alert-case" class="gov-alert gov-alert-success">Case registrado com sucesso!</div>

                <form id="form-case" onsubmit="NexusOKR.submitCase(event)">
                    <div class="gov-form-row">
                        <div class="gov-form-group">
                            <label class="gov-label">Responsável *</label>
                            <select class="gov-select" name="responsavel" required>
                                <option value="">Selecione...</option>
                                <option value="Pedro Almeida">Pedro Almeida</option>
                                <option value="Kathellen Heloisa">Kathellen Heloisa</option>
                                <option value="Luiz Bertoldo">Luiz Bertoldo</option>
                                <option value="Thyellisson Ayslan">Thyellisson Ayslan</option>
                                <option value="Aleff Dias">Aleff Dias</option>
                            </select>
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Data *</label>
                            <input type="date" class="gov-input" name="data_registro" required>
                        </div>
                    </div>

                    <div class="gov-form-group">
                        <label class="gov-label">Título do Case *</label>
                        <input type="text" class="gov-input" name="titulo" required placeholder="Nome identificador do case">
                    </div>

                    <div class="gov-form-group">
                        <label class="gov-label">Contexto / Problema *</label>
                        <textarea class="gov-textarea" name="contexto" required placeholder="Qual era a situação ou problema enfrentado?"></textarea>
                    </div>

                    <div class="gov-form-group">
                        <label class="gov-label">Solução Implementada *</label>
                        <textarea class="gov-textarea" name="solucao" required placeholder="O que foi feito para resolver?"></textarea>
                    </div>

                    <div class="gov-form-group">
                        <label class="gov-label">Resultados e Impacto *</label>
                        <textarea class="gov-textarea" name="resultados" required placeholder="Quais foram os resultados mensuráveis?"></textarea>
                    </div>

                    <div class="gov-form-row">
                        <div class="gov-form-group">
                            <label class="gov-label">Área de Impacto *</label>
                            <select class="gov-select" name="area_impacto" required>
                                <option value="Qualidade">Qualidade</option>
                                <option value="Performance">Performance</option>
                                <option value="Processos">Processos</option>
                                <option value="Inovação">Inovação</option>
                                <option value="Pessoas">Pessoas</option>
                                <option value="Financeiro">Financeiro</option>
                            </select>
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Status *</label>
                            <select class="gov-select" name="status" required>
                                <option value="Aguardando Validação">Aguardando Validação</option>
                                <option value="Validado">Validado</option>
                                <option value="Revisão Necessária">Revisão Necessária</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" class="gov-btn-primary">💾 Registrar Case</button>
                </form>

                <h3 style="margin-top: 40px;">Cases Registrados</h3>
                <div class="gov-table-wrapper">
                    <table class="gov-table">
                        <thead>
                            <tr>
                                <th class="gov-th">Data</th>
                                <th class="gov-th">Responsável</th>
                                <th class="gov-th">Título</th>
                                <th class="gov-th">Área</th>
                                <th class="gov-th">Status</th>
                                <th class="gov-th" style="width:100px;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.cases.length === 0
                ? '<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhum case cadastrado.</td></tr>'
                : this.cases.map(c => `
                                    <tr class="gov-tr">
                                        <td class="gov-td">${c.data_registro ? new Date(c.data_registro).toLocaleDateString('pt-BR') : '-'}</td>
                                        <td class="gov-td">${c.responsavel}</td>
                                        <td class="gov-td">${c.titulo}</td>
                                        <td class="gov-td">${c.area_impacto}</td>
                                        <td class="gov-td">
                                            <span class="gov-badge ${c.status === 'Validado' ? 'badge-validado' : 'badge-pendente'}">${c.status}</span>
                                        </td>
                                        <td class="gov-td gov-actions">
                                            <button class="gov-btn-edit" onclick="NexusOKR.startEdit('gov_cases', ${JSON.stringify(c).replace(/"/g, '&quot;')})" title="Editar">✏️</button>
                                            <button class="gov-btn-delete" onclick="NexusOKR.deleteItem('gov_cases', '${c.id}')" title="Excluir">🗑️</button>
                                        </td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderSugestoes(container) {
        container.innerHTML = `
            <div class="gov-section animate-fade-in">
                <h2>💭 Registrar Sugestões</h2>
                <div id="alert-sugestao" class="gov-alert gov-alert-success">Sugestão registrada!</div>

                <form id="form-sugestao" onsubmit="NexusOKR.submitItem(event, 'gov_suggestions', 'sugestao')">
                     <div class="gov-form-row">
                        <div class="gov-form-group">
                            <label class="gov-label">Responsável *</label>
                            <select class="gov-select" name="responsavel" required>
                                <option value="Pedro Almeida">Pedro Almeida</option>
                                <option value="Kathellen Heloisa">Kathellen Heloisa</option>
                                <option value="Luiz Bertoldo">Luiz Bertoldo</option>
                                <option value="Thyellisson Ayslan">Thyellisson Ayslan</option>
                                <option value="Aleff Dias">Aleff Dias</option>
                            </select>
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Data *</label>
                            <input type="date" class="gov-input" name="data_registro" required>
                        </div>
                    </div>

                    <div class="gov-form-group">
                        <label class="gov-label">Título da Sugestão *</label>
                        <input type="text" class="gov-input" name="titulo" required>
                    </div>

                    <div class="gov-form-group">
                        <label class="gov-label">Descrição Completa *</label>
                        <textarea class="gov-textarea" name="descricao" required></textarea>
                    </div>

                    <div class="gov-form-group">
                        <label class="gov-label">Impacto Esperado</label>
                        <textarea class="gov-textarea" name="impacto_esperado"></textarea>
                    </div>

                    <div class="gov-form-row">
                        <div class="gov-form-group">
                             <label class="gov-label">Categoria *</label>
                             <select class="gov-select" name="categoria" required>
                                <option value="Processo">Processo</option>
                                <option value="Tecnologia">Tecnologia</option>
                                <option value="Qualidade">Qualidade</option>
                                <option value="Atendimento">Atendimento</option>
                             </select>
                        </div>
                        <div class="gov-form-group">
                             <label class="gov-label">Prioridade *</label>
                             <select class="gov-select" name="prioridade" required>
                                <option value="Alta">Alta</option>
                                <option value="Média">Média</option>
                                <option value="Baixa">Baixa</option>
                             </select>
                        </div>
                    </div>

                    <button type="submit" class="gov-btn-primary">💾 Registrar Sugestão</button>
                </form>

                <h3 style="margin-top:40px;">Lista de Sugestões</h3>
                <div class="gov-table-wrapper">
                    <table class="gov-table">
                        <thead><tr><th class="gov-th">Título</th><th class="gov-th">Responsável</th><th class="gov-th">Prioridade</th><th class="gov-th">Status</th><th class="gov-th" style="width:100px;">Ações</th></tr></thead>
                        <tbody>
                            ${this.suggestions.length === 0
                ? '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-tertiary);">Nenhuma sugestão.</td></tr>'
                : this.suggestions.map(s => `
                                <tr class="gov-tr"><td class="gov-td">${s.titulo || ''}</td><td class="gov-td">${s.responsavel || ''}</td><td class="gov-td">${s.prioridade || ''}</td><td class="gov-td">${s.status || ''}</td>
                                <td class="gov-td gov-actions">
                                    <button class="gov-btn-edit" onclick="NexusOKR.startEdit('gov_suggestions', ${JSON.stringify(s).replace(/"/g, '&quot;')})" title="Editar">✏️</button>
                                    <button class="gov-btn-delete" onclick="NexusOKR.deleteItem('gov_suggestions', '${s.id}')" title="Excluir">🗑️</button>
                                </td></tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderElogios(container) {
        container.innerHTML = `
            <div class="gov-section animate-fade-in">
                <h2>⭐ Elogios Formais</h2>
                <div id="alert-elogio" class="gov-alert gov-alert-success">Elogio registrado!</div>

                <form id="form-elogio" onsubmit="NexusOKR.submitItem(event, 'gov_compliments', 'elogio')">
                    <div class="gov-form-group"><label class="gov-label">Quem recebeu o elogio? *</label><input type="text" class="gov-input" name="quem_recebeu" required></div>
                    <div class="gov-form-group"><label class="gov-label">Quem elogiou? (Cliente/Parceiro) *</label><input type="text" class="gov-input" name="quem_elogiou" required></div>
                    <div class="gov-form-group"><label class="gov-label">Motivo do elogio *</label><textarea class="gov-textarea" name="motivo" required></textarea></div>
                    
                    <div class="gov-form-row">
                        <div class="gov-form-group"><label class="gov-label">Canal de Origem *</label><input type="text" class="gov-input" name="canal_origem" placeholder="Email, Call, etc."></div>
                        <div class="gov-form-group"><label class="gov-label">Data *</label><input type="date" class="gov-input" name="data_registro" required></div>
                    </div>
                    
                    <input type="hidden" name="responsavel_registro" value="Eu mesmo"> <!-- Simplificação -->
                    <button type="submit" class="gov-btn-primary">💾 Registrar Elogio</button>
                </form>
                
                 <h3 style="margin-top:40px;">Elogios Recentes</h3>
                 <div class="gov-table-wrapper">
                    <table class="gov-table">
                        <thead><tr><th class="gov-th">Quem Recebeu</th><th class="gov-th">Quem Elogiou</th><th class="gov-th">Motivo</th><th class="gov-th" style="width:100px;">Ações</th></tr></thead>
                        <tbody>
                            ${this.compliments.length === 0
                ? '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-tertiary);">Nenhum elogio.</td></tr>'
                : this.compliments.map(c => `
                                <tr class="gov-tr"><td class="gov-td">${c.quem_recebeu || ''}</td><td class="gov-td">${c.quem_elogiou || ''}</td><td class="gov-td">${c.motivo || ''}</td>
                                <td class="gov-td gov-actions">
                                    <button class="gov-btn-edit" onclick="NexusOKR.startEdit('gov_compliments', ${JSON.stringify(c).replace(/"/g, '&quot;')})" title="Editar">✏️</button>
                                    <button class="gov-btn-delete" onclick="NexusOKR.deleteItem('gov_compliments', '${c.id}')" title="Excluir">🗑️</button>
                                </td></tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderRituais(container) {
        container.innerHTML = `
            <div class="gov-section animate-fade-in">
                <h2>⏰ Controle de Rituais</h2>
                <div id="alert-ritual" class="gov-alert gov-alert-success">Ritual atualizado!</div>
                 
                 <form id="form-ritual" onsubmit="NexusOKR.submitItem(event, 'gov_rituals', 'ritual')">
                    <div class="gov-form-row">
                        <div class="gov-form-group"><label class="gov-label">Tipo de Ritual *</label><input type="text" class="gov-input" name="tipo_ritual" required></div>
                        <div class="gov-form-group"><label class="gov-label">Data Prevista *</label><input type="date" class="gov-input" name="data_prevista" required></div>
                    </div>
                    <div class="gov-form-row">
                        <div class="gov-form-group"><label class="gov-label">Responsável *</label><input type="text" class="gov-input" name="responsavel" required></div>
                         <div class="gov-form-group">
                            <label class="gov-label">Status *</label>
                            <select class="gov-select" name="status">
                                <option value="Pendente">Pendente</option>
                                <option value="Realizado">Realizado</option>
                                <option value="Cancelado">Cancelado</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" class="gov-btn-primary">💾 Salvar Ritual</button>
                 </form>

                 <h3 style="margin-top:40px;">Rituais Agendados</h3>
                 <div class="gov-table-wrapper">
                    <table class="gov-table">
                         <thead><tr><th class="gov-th">Ritual</th><th class="gov-th">Data</th><th class="gov-th">Responsável</th><th class="gov-th">Status</th><th class="gov-th" style="width:100px;">Ações</th></tr></thead>
                        <tbody>
                            ${this.rituals.length === 0
                ? '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-tertiary);">Nenhum ritual.</td></tr>'
                : this.rituals.map(r => `
                                <tr class="gov-tr"><td class="gov-td">${r.tipo_ritual || ''}</td><td class="gov-td">${r.data_prevista ? new Date(r.data_prevista).toLocaleDateString('pt-BR') : '-'}</td><td class="gov-td">${r.responsavel || ''}</td><td class="gov-td">${r.status || ''}</td>
                                <td class="gov-td gov-actions">
                                    <button class="gov-btn-edit" onclick="NexusOKR.startEdit('gov_rituals', ${JSON.stringify(r).replace(/"/g, '&quot;')})" title="Editar">✏️</button>
                                    <button class="gov-btn-delete" onclick="NexusOKR.deleteItem('gov_rituals', '${r.id}')" title="Excluir">🗑️</button>
                                </td></tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderRecuperacao(container) {
        container.innerHTML = `
             <div class="gov-section animate-fade-in">
                <h2>💰 Recuperação Financeira</h2>
                <div id="alert-recuperacao" class="gov-alert gov-alert-success">Recuperação registrada!</div>

                <form id="form-recuperacao" onsubmit="NexusOKR.submitItem(event, 'gov_recovery', 'recuperacao')">
                    <div class="gov-form-row">
                        <div class="gov-form-group"><label class="gov-label">Cliente *</label><input type="text" class="gov-input" name="cliente" required></div>
                        <div class="gov-form-group"><label class="gov-label">Valor (R$) *</label><input type="number" step="0.01" class="gov-input" name="valor_recuperado" required></div>
                    </div>
                    <div class="gov-form-group"><label class="gov-label">Descrição da Ação *</label><textarea class="gov-textarea" name="descricao_acao" required></textarea></div>
                    <div class="gov-form-row">
                        <div class="gov-form-group"><label class="gov-label">Responsável *</label><input type="text" class="gov-input" name="responsavel" required></div>
                        <div class="gov-form-group"><label class="gov-label">Data *</label><input type="date" class="gov-input" name="data_registro" required></div>
                    </div>
                    <button type="submit" class="gov-btn-primary">💾 Registrar Recuperação</button>
                </form>

                <h3 style="margin-top:40px;">Histórico</h3>
                <div class="gov-table-wrapper">
                    <table class="gov-table">
                         <thead><tr><th class="gov-th">Cliente</th><th class="gov-th">Valor</th><th class="gov-th">Ação</th><th class="gov-th" style="width:100px;">Ações</th></tr></thead>
                        <tbody>
                            ${this.recovery.length === 0
                ? '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-tertiary);">Nenhum registro.</td></tr>'
                : this.recovery.map(r => `
                                <tr class="gov-tr">
                                    <td class="gov-td">${r.cliente || ''}</td>
                                    <td class="gov-td">R$ ${parseFloat(r.valor_recuperado || 0).toFixed(2)}</td>
                                    <td class="gov-td">${r.descricao_acao || ''}</td>
                                    <td class="gov-td gov-actions">
                                        <button class="gov-btn-edit" onclick="NexusOKR.startEdit('gov_recovery', ${JSON.stringify(r).replace(/"/g, '&quot;')})" title="Editar">✏️</button>
                                        <button class="gov-btn-delete" onclick="NexusOKR.deleteItem('gov_recovery', '${r.id}')" title="Excluir">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
             </div>
        `;
    },

    // ================================= SUBMISSIONS =================================

    _getUserData() {
        // As tabelas gov_* não possuem colunas user_id/user_name
        // RLS deve ser desabilitado no Supabase Dashboard para essas tabelas
        return {};
    },

    async submitOKR(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        Object.assign(data, this._getUserData());

        try {
            if (this.editingId && this.editingTable === 'gov_okrs') {
                await this.updateItem('gov_okrs', this.editingId, data);
            } else {
                const { error } = await window.supabaseClient.from('gov_okrs').insert([data]);
                if (error) throw error;
            }

            this.showAlert('alert-okr', this.editingId ? 'OKR atualizado!' : 'OKR cadastrado com sucesso!');
            this.cancelEdit();
            form.reset();
            await this.loadAllData();
            this.renderOKRs(document.getElementById('gov-content-area'));

        } catch (error) {
            console.error(error);
            NexusApp.showToast('Erro ao salvar OKR: ' + error.message, 'error');
        }
    },

    async submitCase(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        Object.assign(data, this._getUserData());

        try {
            if (this.editingId && this.editingTable === 'gov_cases') {
                await this.updateItem('gov_cases', this.editingId, data);
            } else {
                const { error } = await window.supabaseClient.from('gov_cases').insert([data]);
                if (error) throw error;
            }

            this.showAlert('alert-case', this.editingId ? 'Case atualizado!' : 'Case registrado com sucesso!');
            this.cancelEdit();
            form.reset();
            await this.loadAllData();
            this.renderCases(document.getElementById('gov-content-area'));

        } catch (error) {
            console.error(error);
            NexusApp.showToast('Erro ao salvar Case: ' + error.message, 'error');
        }
    },

    // Função genérica para outros formulários simples
    async submitItem(event, table, alertIdSuffix) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        Object.assign(data, this._getUserData());

        if (table === 'gov_compliments' && !data.responsavel_registro) data.responsavel_registro = data.user_name;

        try {
            if (this.editingId && this.editingTable === table) {
                await this.updateItem(table, this.editingId, data);
            } else {
                const { error } = await window.supabaseClient.from(table).insert([data]);
                if (error) throw error;
            }

            this.showAlert(`alert-${alertIdSuffix}`, this.editingId ? 'Registro atualizado!' : 'Registro salvo com sucesso!');
            this.cancelEdit();
            form.reset();
            await this.loadAllData();
            this.renderCurrentTab();

        } catch (error) {
            console.error(error);
            NexusApp.showToast('Erro ao salvar: ' + error.message, 'error');
        }
    },

    // ================================= EDIT & DELETE =================================

    async deleteItem(table, id) {
        if (!id) {
            NexusApp.showToast('ID do registro não encontrado.', 'error');
            return;
        }
        if (!confirm('🗑️ Excluir este registro?\n\nEssa ação não pode ser desfeita.')) return;

        try {
            const { error } = await window.supabaseClient.from(table).delete().eq('id', id);
            if (error) throw error;

            NexusApp.showToast('Registro excluído com sucesso!', 'success');
            await this.loadAllData();
            this.renderCurrentTab();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            NexusApp.showToast('Erro ao excluir: ' + error.message, 'error');
        }
    },

    startEdit(table, item) {
        this.editingId = item.id;
        this.editingTable = table;

        // Mapa de qual tab renderizar para cada tabela
        const tabMap = {
            'gov_okrs': 'okrs',
            'gov_cases': 'cases',
            'gov_suggestions': 'sugestoes',
            'gov_compliments': 'elogios',
            'gov_rituals': 'rituais',
            'gov_recovery': 'recuperacao'
        };

        // Navegar para a aba correta e re-renderizar
        this.currentTab = tabMap[table] || this.currentTab;
        this.renderCurrentTab();

        // Preencher o formulário após renderização
        setTimeout(() => {
            const forms = document.querySelectorAll('form');
            const form = forms[0]; // Primeiro form da aba
            if (!form) return;

            // Preencher campos com dados do item
            Object.keys(item).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input && key !== 'id' && key !== 'user_id' && key !== 'user_name' && key !== 'created_at') {
                    input.value = item[key] || '';
                }
            });

            // Atualizar botão de submit
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '✏️ Atualizar Registro';
                submitBtn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
            }

            // Adicionar botão de cancelar edição
            if (!document.getElementById('gov-cancel-edit')) {
                const cancelBtn = document.createElement('button');
                cancelBtn.id = 'gov-cancel-edit';
                cancelBtn.type = 'button';
                cancelBtn.className = 'gov-btn-primary';
                cancelBtn.style.cssText = 'background: rgba(107, 114, 128, 0.2); color: #9ca3af; border: 1px solid rgba(107, 114, 128, 0.3); margin-top: 8px;';
                cancelBtn.innerHTML = '❌ Cancelar Edição';
                cancelBtn.onclick = () => {
                    this.cancelEdit();
                    form.reset();
                    this.renderCurrentTab();
                };
                submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
            }

            // Scroll para o formulário
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    },

    cancelEdit() {
        this.editingId = null;
        this.editingTable = null;
    },

    async updateItem(table, id, data) {
        // Remover campos que não devem ser atualizados
        delete data.id;
        data.updated_at = new Date().toISOString();

        const { error } = await window.supabaseClient.from(table).update(data).eq('id', id);
        if (error) throw error;
    },

    showAlert(elementId, message) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = message;
            el.classList.add('show');
            setTimeout(() => el.classList.remove('show'), 3000);
        } else {
            NexusApp.showToast(message, 'success');
        }
    }
};

window.NexusOKR = NexusOKR;
