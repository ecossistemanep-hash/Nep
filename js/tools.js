/**
 * NEP PLATFORM - MÓDULO DE FERRAMENTAS
 * Inclui: NEP Correlação, Calculadora de Factibilidade, Gerador de Senha, PDCA, DMAIC
 * v2.0 - Com gestão de permissões via Admin
 */

const NexusTools = {
  currentTool: 'menu',
  permissionsLoaded: false,
  userRole: null,

  // PDCA Data
  pdcaData: { plan: [], do: [], check: [], act: [] },

  // DMAIC Data
  dmaicData: { define: '', measure: '', analyze: '', improve: '', control: '' },

  // Correlation Data
  correlationData: { headers: [], columns: [], matrix: [] },

  // Factibilidade Data
  factibilidadeData: {
    rawData: [],
    meta: null,
    variable: '',
    period: '',
    stats: null,
    quartiles: null,
    probability: null,
    classification: null
  },

  async render(container) {
    // Carregar permissões se ainda não carregou
    if (!this.permissionsLoaded && typeof ToolsService !== 'undefined') {
      try {
        await ToolsService.loadPermissions();
        this.permissionsLoaded = true;
      } catch (e) {
        console.warn('[Tools] Erro ao carregar permissões:', e);
      }
    }

    // Obter cargo do usuário
    this.userRole = localStorage.getItem('nep_user_cargo') || localStorage.getItem('nep_user_role') || 'ANALISTA';

    container.innerHTML = `
      <div class="tools-page">
        ${this.currentTool === 'menu' ? this.renderMenu() : this.renderTool()}
      </div>
    `;
    this.injectStyles();
    this.bindEvents();
  },

  // Verifica se ferramenta está habilitada para o usuário
  canAccessTool(toolId) {
    if (typeof ToolsService === 'undefined') return true;
    return ToolsService.canAccessTool(toolId, this.userRole);
  },

  renderMenu() {
    // Lista de todas as ferramentas com seus dados
    const allTools = [
      { id: 'correlacao', name: 'NEP Correlação', desc: 'Análise estatística de correlação entre indicadores via upload de Excel', tag: 'Estatística', icon: 'fa-chart-line', color: '#6366f1, #8b5cf6' },
      { id: 'factibilidade', name: 'Calculadora de Factibilidade', desc: 'Calcule a viabilidade de metas considerando baseline e capacidade', tag: 'Metas', icon: 'fa-calculator', color: '#22c55e, #16a34a' },
      { id: 'senha', name: 'Gerador de Senha', desc: 'Gere senhas seguras com configurações personalizadas', tag: 'Segurança', icon: 'fa-key', color: '#f59e0b, #d97706' },
      { id: 'pdca', name: 'Estruturador PDCA', desc: 'Organize ciclos de melhoria contínua Plan-Do-Check-Act', tag: 'Qualidade', icon: 'fa-arrows-spin', color: '#3b82f6, #1d4ed8' },
      { id: 'dmaic', name: 'Estruturador DMAIC', desc: 'Metodologia Six Sigma: Define, Measure, Analyze, Improve, Control', tag: 'Six Sigma', icon: 'fa-diagram-project', color: '#ef4444, #dc2626' },
      { id: 'compressor', name: 'Compressor de Vídeo', desc: 'Reduza o tamanho de vídeos mantendo a qualidade', tag: 'Multimídia', icon: 'fa-video', color: '#ec4899, #be185d' },
      { id: 'pareto', name: 'Diagrama de Pareto', desc: 'Análise 80/20 para priorização de problemas', tag: 'Análise', icon: 'fa-chart-bar', color: '#14b8a6, #0d9488' },
      { id: 'ishikawa', name: 'Diagrama de Ishikawa', desc: 'Espinha de peixe para análise de causa raiz (6M)', tag: 'Causa Raiz', icon: 'fa-fish', color: '#0ea5e9, #0284c7' },
      { id: 'gut', name: 'Matriz GUT', desc: 'Priorização por Gravidade × Urgência × Tendência', tag: 'Priorização', icon: 'fa-ranking-star', color: '#a855f7, #7c3aed' },
      { id: 'cronometro', name: 'Cronômetro/Pomodoro', desc: 'Timer de produtividade com técnica Pomodoro', tag: 'Produtividade', icon: 'fa-stopwatch', color: '#f43f5e, #e11d48' },
      { id: 'weather', name: 'NEP Clima', desc: 'Monitoramento meteorológico em tempo real (HG Brasil)', tag: 'API', icon: 'fa-cloud-sun', color: '#3b82f6, #1d4ed8' },
      { id: 'news_br', name: 'NEP News Brasil', desc: 'Notícias do Brasil em tempo real (GNews)', tag: 'Notícias', icon: 'fa-newspaper', color: '#ef4444, #dc2626' },
      { id: 'news_world', name: 'NEP Mundo Updates', desc: 'Giro de notícias globais em português', tag: 'Mundo', icon: 'fa-globe', color: '#8b5cf6, #6d28d9' },
      { id: 'dict', name: 'NEP Dicionário', desc: 'Consulta lexicográfica e sinônimos', tag: 'Educação', icon: 'fa-book-bookmark', color: '#10b981, #059669' },
      { id: 'brasil', name: 'NEP Brasil Data', desc: 'Dados públicos: CNPJ, CEP, FIPE, Feriados (BrasilAPI)', tag: 'Dados', icon: 'fa-flag', color: '#f59e0b, #d97706' },
      { id: 'fluxograma', name: 'Criador de Fluxograma', desc: 'Monte fluxogramas visuais interativos', tag: 'Fluxo', icon: 'fa-diagram-project', color: '#06b6d4, #0891b2' },
      { id: 'cincoporques', name: '5 Porquês', desc: 'Técnica de análise de causa raiz com gráfico', tag: 'Causa Raiz', icon: 'fa-question', color: '#84cc16, #65a30d' },
      { id: 'cartacontrole', name: 'Carta de Controle', desc: 'Gráfico de controle estatístico de processos', tag: 'CEP', icon: 'fa-chart-line', color: '#6366f1, #4f46e5' },
      { id: 'geradorgraficos', name: 'Gerador de Gráficos', desc: 'Crie qualquer tipo de gráfico com exportação visual', tag: 'Gráficos', icon: 'fa-chart-pie', color: '#f97316, #ea580c' },
      { id: 'nexus', name: 'NEP Nexus', desc: 'Visualização interativa do ecossistema NEP com mandala orbital', tag: 'Visualização', icon: 'fa-atom', color: '#06b6d4, #0e7490' },
      { id: 'html_creator', name: 'Criador de HTML', desc: 'Crie ferramentas web completas e baixe-as usando IA', tag: 'IA Creator', icon: 'fa-code', color: '#0ea5e9, #0284c7' },
      { id: 'promptcreator', name: 'Criador de Prompt', desc: 'Descreva sua ideia e gere um prompt profissional otimizado para qualquer IA', tag: 'IA', icon: 'fa-wand-magic-sparkles', color: '#a855f7, #7c3aed' },
      { id: 'estatistica', name: 'Estatística Avançada', desc: 'Análise estatística completa: quartis, dispersão, correlação, anomalias e mais', tag: 'Análise', icon: 'fa-square-root-variable', color: '#6366f1, #4f46e5' },
      { id: 'grafo', name: 'Grafo do NEP', desc: 'Visualização interativa do ecossistema completo: módulos, conexões e fluxos de dados', tag: 'Visualização', icon: 'fa-diagram-project', color: '#00E0FF, #0891b2' }
    ];

    // Filtrar ferramentas baseado em permissões
    const visibleTools = allTools.filter(tool => this.canAccessTool(tool.id));

    if (visibleTools.length === 0) {
      return `
        <header class="tools-header">
          <h1><i class="fa-solid fa-toolbox"></i> Ferramentas</h1>
          <p>Utilitários para análise, planejamento e produtividade</p>
        </header>
        <div class="tools-empty" style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
          <i class="fa-solid fa-lock" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
          <p>Nenhuma ferramenta disponível para seu perfil.</p>
          <p style="font-size: 12px;">Contate o administrador para solicitar acesso.</p>
        </div>
      `;
    }

    return `
      <header class="tools-header">
        <h1><i class="fa-solid fa-toolbox"></i> Ferramentas</h1>
        <p>Utilitários para análise, planejamento e produtividade</p>
      </header>
      
      <div class="tools-grid">
        ${visibleTools.map(tool => `
          <div class="tool-card" data-tool="${tool.id}">
            <div class="tool-icon" style="background: linear-gradient(135deg, ${tool.color});">
              <i class="fa-solid ${tool.icon}"></i>
            </div>
            <h3>${tool.name}</h3>
            <p>${tool.desc}</p>
            <span class="tool-tag">${tool.tag}</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderTool() {
    // Use Pro versions for quality tools if available
    const tools = {
      correlacao: this.renderCorrelacao(),
      factibilidade: this.renderFactibilidade(),
      senha: this.renderSenha(),
      pdca: typeof PDCAPro !== 'undefined' ? PDCAPro.render() : this.renderPDCA(),
      dmaic: typeof DMAICPro !== 'undefined' ? DMAICPro.render() : this.renderDMAIC(),
      compressor: this.renderCompressor(),
      pareto: typeof ParetoPro !== 'undefined' ? ParetoPro.render() : this.renderPareto(),
      ishikawa: typeof IshikawaPro !== 'undefined' ? IshikawaPro.render() : this.renderIshikawa(),
      gut: typeof GUTPro !== 'undefined' ? GUTPro.render() : this.renderGUT(),
      cronometro: this.renderCronometro(),
      fluxograma: this.renderFluxograma(),
      cincoporques: typeof CincoPorquesPro !== 'undefined' ? CincoPorquesPro.render() : this.renderCincoPortes(),
      cartacontrole: typeof CartaControlePro !== 'undefined' ? CartaControlePro.render() : this.renderCartaControle(),
      geradorgraficos: this.renderGeradorGraficos(),
      nexus: this.renderNexus(),
      html_creator: this.renderHTMLCreator(),
      promptcreator: this.renderPromptCreator(),
      grafo: typeof NepGrafo !== 'undefined' ? NepGrafo.render() : '<p>Módulo Grafo não carregado.</p>'
    };


    return `
      <header class="tools-header">
        <button class="tools-back" id="btn-back"><i class="fa-solid fa-arrow-left"></i> Voltar</button>
      </header>
      ${tools[this.currentTool] || ''}
    `;
  },

  // ============ NEP CORRELAÇÃO ============
  renderCorrelacao() {
    return `
      <div class="tool-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
            <i class="fa-solid fa-chart-line"></i>
          </div>
          <div>
            <h2>Matriz de Correlação NEP</h2>
            <p>Faça upload da sua planilha Excel com indicadores de performance.</p>
          </div>
        </div>
        
        <div class="upload-area" id="upload-area">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <p>Arraste um arquivo Excel aqui ou clique para selecionar</p>
          <input type="file" id="corr-upload" accept=".xlsx, .xls" hidden>
          <span id="corr-file-name"></span>
        </div>
        
        <div class="corr-info-box">
          <h4><i class="fa-solid fa-info-circle"></i> O que é Correlação?</h4>
          <p><strong>Correlação</strong> é uma métrica estatística que quantifica o grau e a direção da relação linear entre dois indicadores numéricos.</p>
          <ul>
            <li><strong>Forte (|r| ≥ 0.70)</strong>: Relação robusta – ação prioritária</li>
            <li><strong>Moderada (0.30 a 0.69)</strong>: Monitore, indica dependência</li>
            <li><strong>Fraca (|r| < 0.30)</strong>: Baixa dependência estatística</li>
          </ul>
        </div>
        
        <div id="corr-matrix-container" style="display: none;">
          <h3>Matriz de Correlação</h3>
          <div id="corr-matrix"></div>
          <small>💡 Clique em uma célula para ver o gráfico de dispersão</small>
        </div>
        
        <div id="corr-chart-container" style="display: none;">
          <h3>📊 Gráfico de Dispersão</h3>
          <div id="corr-plot" style="width: 100%; height: 400px;"></div>
        </div>
        
        <div id="corr-insights" class="corr-insights" style="display: none;"></div>
      </div>
    `;
  },

  // ============ CALCULADORA DE FACTIBILIDADE ============
  renderFactibilidade() {
    return `
      <div class="tool-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #22c55e, #16a34a);">
            <i class="fa-solid fa-calculator"></i>
          </div>
          <div>
            <h2>Calculadora de Factibilidade Executiva</h2>
            <p>Análise estatística avançada de metas baseada em dados históricos</p>
          </div>
        </div>
        
        <!-- Upload Section -->
        <div class="upload-area" id="fact-upload-area" style="margin-bottom: 24px;">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <p>Arraste planilha Excel/CSV ou clique para selecionar</p>
          <input type="file" id="fact-upload" accept=".xlsx, .xls, .csv" hidden>
          <span id="fact-file-name"></span>
        </div>

        <!-- Meta Input -->
        <div id="fact-meta-input" style="display: none;">
          <div class="fact-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; marginbottom: 16px;">
            <div class="fact-input-group">
              <label>Meta Desejada</label>
              <input type="number" id="fact-meta-value" placeholder="Ex: 90" step="0.01">
            </div>
            <div class="fact-input-group">
              <label>Variável de Resultado</label>
              <select id="fact-variable">
                <option value="">Selecione...</option>
              </select>
            </div>
          </div>
          <button class="tools-btn-primary" id="btn-calc-fact"><i class="fa-solid fa-calculator"></i> Analisar Factibilidade</button>
        </div>

        <!-- Results Section -->
        <div id="fact-results" style="display: none;">
          <!-- Big Numbers -->
          <div class="fact-section">
            <h3 style="margin: 24px 0 16px; font-size: 18px; font-weight: 600;">📊 Indicadores Principais</h3>
            <div id="fact-kpis" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;"></div>
          </div>

          <!-- Goal Classification -->
          <div class="fact-section">
            <h3 style="margin: 24px 0 16px; font-size: 18px; font-weight: 600;">🎯 Classificação da Meta</h3>
            <div id="fact-classification"></div>
          </div>

          <!-- Stats Table -->
          <div class="fact-section">
            <h3 style="margin: 24px 0 16px; font-size: 18px; font-weight: 600;">📈 Estatísticas Completas</h3>
            <div id="fact-stats-table" style="overflow-x: auto;"></div>
          </div>

          <!-- Quartiles -->
          <div class="fact-section">
            <h3 style="margin: 24px 0 16px; font-size: 18px; font-weight: 600;">📊 Distribuição por Quartis</h3>
            <div id="fact-quartiles"></div>
          </div>

          <!-- Scenarios -->
          <div class="fact-section">
            <h3 style="margin: 24px 0 16px; font-size: 18px; font-weight: 600;">🎲 Cenários de Previsão</h3>
            <div id="fact-scenarios"></div>
          </div>

          <!-- Insights -->
          <div class="fact-section">
            <h3 style="margin: 24px 0 16px; font-size: 18px; font-weight: 600;">💡 Insights Executivos</h3>
            <div id="fact-insights"></div>
          </div>

          <!-- Recommendations -->
          <div class="fact-section">
            <h3 style="margin: 24px 0 16px; font-size: 18px; font-weight: 600;">✅ Recomendações</h3>
            <div id="fact-recommendations"></div>
          </div>
        </div>

        <div class="fact-info-box" style="margin-top: 24px;">
          <h4><i class="fa-solid fa-info-circle"></i> Como Funciona</h4>
          <ul style="margin: 8px 0; padding-left: 20px; font-size: 13px;">
            <li><strong>Upload:</strong> Planilha Excel/CSV com dados históricos</li>
            <li><strong>Coluna numérica:</strong> Variável de resultado (ex: vendas, produtividade)</li>
            <li><strong>Meta:</strong> Valor desejado a ser atingido</li>
            <li><strong>Análise:</strong> Estatísticas completas + probabilidade + classificação + recomendações</li>
          </ul>
        </div>
      </div>
    `;
  },

  // ============ GERADOR DE SENHA ============
  renderSenha() {
    return `
      <div class="tool-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
            <i class="fa-solid fa-key"></i>
          </div>
          <div>
            <h2>Gerador de Senha Segura</h2>
            <p>Crie senhas fortes e personalizadas</p>
          </div>
        </div>
        
        <div class="pwd-output">
          <input type="text" id="pwd-result" readonly value="Clique em Gerar" class="pwd-field">
          <button class="pwd-copy" id="btn-copy-pwd" title="Copiar"><i class="fa-solid fa-copy"></i></button>
        </div>
        
        <div class="pwd-options">
          <div class="pwd-length">
            <label>Tamanho: <span id="pwd-length-val">16</span></label>
            <input type="range" id="pwd-length" min="8" max="64" value="16">
          </div>
          
          <div class="pwd-checkboxes">
            <label><input type="checkbox" id="pwd-upper" checked> Maiúsculas (A-Z)</label>
            <label><input type="checkbox" id="pwd-lower" checked> Minúsculas (a-z)</label>
            <label><input type="checkbox" id="pwd-numbers" checked> Números (0-9)</label>
            <label><input type="checkbox" id="pwd-symbols" checked> Símbolos (!@#$%)</label>
          </div>
        </div>
        
        <button class="tools-btn-primary" id="btn-gen-pwd"><i class="fa-solid fa-rotate"></i> Gerar Nova Senha</button>
        
        <div id="pwd-strength" class="pwd-strength"></div>
      </div>
    `;
  },

  // ============ PDCA ============
  renderPDCA() {
    this.loadPDCA();
    return `
      <div class="tool-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
            <i class="fa-solid fa-arrows-spin"></i>
          </div>
          <div>
            <h2>Estruturador PDCA</h2>
            <p>Ciclo de melhoria contínua: Plan → Do → Check → Act</p>
          </div>
        </div>
        
        <div class="pdca-grid">
          ${['plan', 'do', 'check', 'act'].map(phase => `
            <div class="pdca-phase pdca-${phase}">
              <h3>${phase.toUpperCase()}</h3>
              <div class="pdca-items" id="pdca-${phase}">
                ${(this.pdcaData[phase] || []).map((item, i) => `
                  <div class="pdca-item">
                    <span>${item}</span>
                    <button class="pdca-rm" data-phase="${phase}" data-idx="${i}"><i class="fa-solid fa-times"></i></button>
                  </div>
                `).join('')}
              </div>
              <div class="pdca-add">
                <input type="text" id="pdca-input-${phase}" placeholder="Adicionar item...">
                <button class="pdca-add-btn" data-phase="${phase}"><i class="fa-solid fa-plus"></i></button>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="pdca-actions">
          <button class="tools-btn-secondary" id="btn-export-pdca"><i class="fa-solid fa-download"></i> Exportar PDCA</button>
          <button class="tools-btn-danger" id="btn-clear-pdca"><i class="fa-solid fa-trash"></i> Limpar Tudo</button>
        </div>
      </div>
    `;
  },

  // ============ DMAIC ============
  renderDMAIC() {
    this.loadDMAIC();
    const phases = [
      { key: 'define', label: 'Define', icon: 'fa-bullseye', color: '#6366f1', desc: 'Defina o problema, escopo e objetivos' },
      { key: 'measure', label: 'Measure', icon: 'fa-ruler', color: '#22c55e', desc: 'Meça o desempenho atual' },
      { key: 'analyze', label: 'Analyze', icon: 'fa-magnifying-glass-chart', color: '#f59e0b', desc: 'Analise as causas raiz' },
      { key: 'improve', label: 'Improve', icon: 'fa-arrow-trend-up', color: '#3b82f6', desc: 'Implemente melhorias' },
      { key: 'control', label: 'Control', icon: 'fa-shield-halved', color: '#ef4444', desc: 'Controle e sustente os ganhos' }
    ];

    return `
      <div class="tool-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
            <i class="fa-solid fa-diagram-project"></i>
          </div>
          <div>
            <h2>Estruturador DMAIC</h2>
            <p>Metodologia Six Sigma para resolução de problemas</p>
          </div>
        </div>
        
        <div class="dmaic-phases">
          ${phases.map(p => `
            <div class="dmaic-phase">
              <div class="dmaic-header" style="border-color: ${p.color};">
                <i class="fa-solid ${p.icon}" style="color: ${p.color};"></i>
                <h4>${p.label}</h4>
              </div>
              <p class="dmaic-desc">${p.desc}</p>
              <textarea id="dmaic-${p.key}" placeholder="Descreva ${p.label}..." rows="4">${this.dmaicData[p.key] || ''}</textarea>
            </div>
          `).join('')}
        </div>
        
        <div class="dmaic-actions">
          <button class="tools-btn-primary" id="btn-save-dmaic"><i class="fa-solid fa-save"></i> Salvar DMAIC</button>
          <button class="tools-btn-secondary" id="btn-export-dmaic"><i class="fa-solid fa-download"></i> Exportar</button>
          <button class="tools-btn-danger" id="btn-clear-dmaic"><i class="fa-solid fa-trash"></i> Limpar</button>
        </div>
      </div>
    `;
  },

  // ============ CRIADOR DE PROMPT PROFISSIONAL ============
  renderPromptCreator() {
    return `
    <div class="tool-container">
      <div class="tool-title-row">
        <div class="tool-icon-sm" style="background:linear-gradient(135deg,#a855f7,#7c3aed)">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
        </div>
        <div>
          <h2>Criador de Prompt Profissional</h2>
          <p>Descreva sua ideia em linguagem simples e receba um prompt otimizado para qualquer IA</p>
        </div>
      </div>

      <div style="max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:20px;">

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label class="pc-lbl">🎯 Para qual IA?</label>
            <select id="pc-target-ai" class="pc-sel">
              <option value="chatgpt">ChatGPT / GPT-4</option>
              <option value="gemini" selected>Google Gemini</option>
              <option value="claude">Anthropic Claude</option>
              <option value="copilot">Microsoft Copilot</option>
              <option value="geral">Qualquer IA</option>
            </select>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label class="pc-lbl">📋 Tipo de tarefa</label>
            <select id="pc-task-type" class="pc-sel">
              <option value="analise">📊 Análise de dados</option>
              <option value="redacao">✍️ Redação / Texto</option>
              <option value="codigo">💻 Código</option>
              <option value="apresentacao">🎤 Apresentação</option>
              <option value="email">📧 E-mail</option>
              <option value="gestao">📋 Gestão</option>
              <option value="criativo">🎨 Criativo</option>
              <option value="outro">🔧 Outro</option>
            </select>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label class="pc-lbl">🗣️ Tom desejado</label>
            <select id="pc-tone" class="pc-sel">
              <option value="profissional">🏢 Profissional</option>
              <option value="direto">⚡ Direto</option>
              <option value="didatico">📚 Didático</option>
              <option value="criativo">🎨 Criativo</option>
              <option value="formal">🎩 Formal</option>
            </select>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;">
          <label class="pc-lbl">💡 Descreva sua ideia ou necessidade</label>
          <textarea id="pc-idea" class="pc-ta" rows="6"
            placeholder="Ex: Preciso analisar um relatório de vendas e identificar os meses com maior queda, possíveis causas e criar um plano de ação...&#10;&#10;Quanto mais detalhe você der, melhor será o prompt!"></textarea>
          <div style="font-size:11px;color:var(--text-tertiary);text-align:right;"><span id="pc-char-count">0</span> caracteres</div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;">
          <label class="pc-lbl">🏢 Contexto adicional <span style="font-weight:400;font-size:11px;color:var(--text-tertiary)">(opcional)</span></label>
          <input type="text" id="pc-context" class="pc-inp"
            placeholder="Ex: Sou analista de qualidade em uma empresa de telecom com 200 agentes...">
        </div>

        <button id="pc-generate-btn" class="pc-btn-gen">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>Gerar Prompt Profissional</span>
        </button>

        <div id="pc-loading" style="display:none;justify-content:center;padding:40px 20px;">
          <div style="display:flex;flex-direction:column;align-items:center;gap:16px;color:var(--text-secondary);font-size:14px;">
            <div class="pc-spin"></div>
            <span>Criando seu prompt profissional...</span>
          </div>
        </div>

        <div id="pc-output-section" style="display:none;background:var(--surface-card,#131B29);border:1px solid var(--surface-border,#2D3A4F);border-radius:16px;overflow:hidden;">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid var(--surface-border,#2D3A4F);background:rgba(168,85,247,0.05);">
            <div style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;color:var(--text-primary);">
              <i class="fa-solid fa-sparkles" style="color:#a855f7"></i> Prompt Gerado
            </div>
            <div style="display:flex;gap:8px;">
              <button id="pc-copy-btn" class="pc-btn-sm"><i class="fa-solid fa-copy"></i> Copiar</button>
              <button id="pc-regen-btn" class="pc-btn-sm pc-btn-ol"><i class="fa-solid fa-rotate"></i> Regerar</button>
            </div>
          </div>
          <div id="pc-result" style="padding:20px;font-size:14px;line-height:1.7;color:var(--text-primary);white-space:pre-wrap;font-family:inherit;min-height:80px;"></div>
          <div id="pc-tips" style="display:none;padding:14px 20px;border-top:1px solid var(--surface-border,#2D3A4F);font-size:12px;color:var(--text-tertiary);background:rgba(0,0,0,0.08);"></div>
        </div>
      </div>
    </div>

    <style>
      .pc-lbl { font-size:13px;font-weight:600;color:var(--text-secondary); }
      .pc-sel,.pc-inp {
        padding:10px 14px;background:var(--surface-elevated,#1C2438);
        border:1px solid var(--surface-border,#2D3A4F);border-radius:10px;
        color:var(--text-primary);font-size:14px;font-family:inherit;transition:border-color 0.2s;
      }
      .pc-sel:focus,.pc-inp:focus { outline:none;border-color:#a855f7; }
      .pc-ta {
        width:100%;padding:14px;background:var(--surface-elevated,#1C2438);
        border:1px solid var(--surface-border,#2D3A4F);border-radius:12px;
        color:var(--text-primary);font-size:14px;font-family:inherit;line-height:1.6;resize:vertical;transition:border-color 0.2s;
      }
      .pc-ta:focus { outline:none;border-color:#a855f7;box-shadow:0 0 0 3px rgba(168,85,247,0.12); }
      .pc-ta::placeholder { color:var(--text-tertiary); }
      .pc-btn-gen {
        padding:14px 28px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:white;border:none;
        border-radius:12px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.3s;
        box-shadow:0 4px 16px rgba(168,85,247,0.3);
      }
      .pc-btn-gen:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 8px 24px rgba(168,85,247,0.4); }
      .pc-btn-gen:disabled { opacity:0.6;cursor:not-allowed; }
      .pc-btn-sm {
        padding:6px 14px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:white;border:none;
        border-radius:8px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;
        display:flex;align-items:center;gap:6px;transition:all 0.2s;
      }
      .pc-btn-sm:hover { transform:translateY(-1px); }
      .pc-btn-ol { background:transparent!important;border:1px solid rgba(168,85,247,0.4)!important;color:#a855f7!important; }
      .pc-btn-ol:hover { background:rgba(168,85,247,0.1)!important; }
      .pc-spin {
        width:40px;height:40px;border:3px solid rgba(168,85,247,0.2);
        border-top-color:#a855f7;border-radius:50%;animation:pc-spin 0.9s linear infinite;
      }
      @keyframes pc-spin { to { transform:rotate(360deg); } }
      [data-theme="light"] .pc-sel,[data-theme="light"] .pc-inp,[data-theme="light"] .pc-ta {
        background:#f8fafc!important;border-color:#cbd5e1!important;color:#0f172a!important;
      }
      [data-theme="light"] #pc-output-section { background:#ffffff!important;border-color:#e2e8f0!important; }
      [data-theme="light"] #pc-result { color:#0f172a!important; }
    </style>
    `;
  },

  async generatePrompt() {
    const idea = document.getElementById('pc-idea')?.value.trim();
    const context = document.getElementById('pc-context')?.value.trim();
    const targetAI = document.getElementById('pc-target-ai')?.value;
    const taskType = document.getElementById('pc-task-type')?.value;
    const tone = document.getElementById('pc-tone')?.value;

    if (!idea) { NexusApp?.showToast?.('Descreva sua ideia antes de gerar o prompt!', 'warning'); return; }

    const aiL = { chatgpt: 'ChatGPT/GPT-4', gemini: 'Google Gemini', claude: 'Claude', copilot: 'Copilot', geral: 'qualquer IA' };
    const taskL = { analise: 'Análise de Dados', redacao: 'Redação/Texto', codigo: 'Código', apresentacao: 'Apresentação', email: 'E-mail', gestao: 'Gestão', criativo: 'Criativo', outro: 'Outro' };
    const toneL = { profissional: 'profissional', direto: 'direto e objetivo', didatico: 'didático e claro', criativo: 'criativo', formal: 'formal' };

    const btn = document.getElementById('pc-generate-btn');
    const output = document.getElementById('pc-output-section');
    const loading = document.getElementById('pc-loading');
    const resultEl = document.getElementById('pc-result');
    const tipsEl = document.getElementById('pc-tips');

    btn.disabled = true;
    output.style.display = 'none';
    loading.style.display = 'flex';

    const metaPrompt = `Você é especialista em prompt engineering.\nCrie um prompt profissional para ${aiL[targetAI]}.\n\nSOLICITAÇÃO: "${idea}"\n${context ? `CONTEXTO: "${context}"\n` : ''}TIPO: ${taskL[taskType]} | TOM: ${toneL[tone]}\n\nO prompt deve: definir papel/persona da IA, formato de saída esperado, restrições, ser específico e sem ambiguidades, otimizado para ${aiL[targetAI]}.\n\nRetorne APENAS o prompt final pronto para copiar e colar. Depois "---" e 2-3 dicas prefixadas com "💡".`;

    try {
      const GEMINI_KEY = window.getGeminiApiKey ? window.getGeminiApiKey() : '';
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: metaPrompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 2000 } })
        }
      );
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) throw new Error('Resposta vazia');

      const parts = text.split('---');
      resultEl.textContent = parts[0]?.trim() || text;
      if (parts[1]?.trim()) {
        tipsEl.innerHTML = `<strong>💡 Dicas:</strong><br>${parts[1].trim().replace(/\n/g, '<br>')}`;
        tipsEl.style.display = 'block';
      } else { tipsEl.style.display = 'none'; }

      loading.style.display = 'none';
      output.style.display = 'block';
      output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
      loading.style.display = 'none';
      NexusApp?.showToast?.('Erro ao gerar prompt: ' + err.message, 'error');
    }
    btn.disabled = false;
  },

  // ============ EVENT BINDINGS ============
  bindEvents() {

    const $ = id => document.getElementById(id);

    // Bind Pro tools events if available
    if (typeof PDCAPro !== 'undefined' && this.currentTool === 'pdca') PDCAPro.bindEvents();
    if (typeof DMAICPro !== 'undefined' && this.currentTool === 'dmaic') DMAICPro.bindEvents();
    if (typeof ParetoPro !== 'undefined' && this.currentTool === 'pareto') ParetoPro.bindEvents();
    if (typeof IshikawaPro !== 'undefined' && this.currentTool === 'ishikawa') IshikawaPro.bindEvents();
    if (typeof GUTPro !== 'undefined' && this.currentTool === 'gut') GUTPro.bindEvents();
    if (typeof CincoPorquesPro !== 'undefined' && this.currentTool === 'cincoporques') CincoPorquesPro.bindEvents();
    if (typeof CartaControlePro !== 'undefined' && this.currentTool === 'cartacontrole') CartaControlePro.bindEvents();
    if (typeof NepGrafo !== 'undefined' && this.currentTool === 'grafo') NepGrafo.init();

    // Menu navigation

    document.querySelectorAll('.tool-card').forEach(card => {
      card.addEventListener('click', () => {
        const tool = card.dataset.tool;

        // Estatística Avançada — abre em nova aba
        if (tool === 'estatistica') {
          window.open('NEP_ESTATISTICA_AVANCADA.html', '_blank');
          return;
        }

        // API Tools Routing
        if (['weather', 'news_br', 'news_world', 'dict', 'brasil'].includes(tool)) {
          if (typeof nexusAPITools !== 'undefined') {
            this.currentTool = tool;
            document.getElementById('page-content').innerHTML = `
                <div class="tools-page">
                  <header class="tools-header">
                    <button class="tools-back" id="btn-back-api"><i class="fa-solid fa-arrow-left"></i> Voltar</button>
                    ${tool === 'weather' ? '<h1><i class="fa-solid fa-cloud-sun"></i> NEP Clima</h1>' : ''}
                  </header>
                  <div id="api-tool-wrapper"></div>
                </div>
             `;

            // Setup container and render
            nexusAPITools.container = document.getElementById('api-tool-wrapper');
            if (tool === 'weather') nexusAPITools.renderWeather();
            else if (tool === 'news_br') nexusAPITools.renderNews('br');
            else if (tool === 'news_world') nexusAPITools.renderNews('world');
            else if (tool === 'dict') nexusAPITools.renderDictionary();
            else if (tool === 'brasil') nexusAPITools.renderBrasilData();

            // Back button logic
            document.getElementById('btn-back-api').addEventListener('click', () => {
              this.currentTool = 'menu';
              this.render(document.getElementById('page-content'));
            });
            return;
          }
        }

        this.currentTool = tool;
        this.render(document.getElementById('page-content'));
      });
    });

    $('btn-back')?.addEventListener('click', () => {
      this.currentTool = 'menu';
      this.render(document.getElementById('page-content'));
    });

    // Correlação
    const uploadArea = $('upload-area');
    const uploadInput = $('corr-upload');
    if (uploadArea && uploadInput) {
      uploadArea.addEventListener('click', () => uploadInput.click());
      uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
      uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
      uploadArea.addEventListener('drop', e => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) this.processCorrelationFile(e.dataTransfer.files[0]);
      });
      uploadInput.addEventListener('change', e => {
        if (e.target.files.length) this.processCorrelationFile(e.target.files[0]);
      });
    }

    // Factibilidade - Upload Excel
    const factUploadArea = $('fact-upload-area');
    const factUploadInput = $('fact-upload');
    if (factUploadArea && factUploadInput) {
      factUploadArea.addEventListener('click', () => factUploadInput.click());
      factUploadArea.addEventListener('dragover', e => { e.preventDefault(); factUploadArea.classList.add('dragover'); });
      factUploadArea.addEventListener('dragleave', () => factUploadArea.classList.remove('dragover'));
      factUploadArea.addEventListener('drop', e => {
        e.preventDefault();
        factUploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) this.processFactibilidadeFile(e.dataTransfer.files[0]);
      });
      factUploadInput.addEventListener('change', e => {
        if (e.target.files.length) this.processFactibilidadeFile(e.target.files[0]);
      });
    }
    $('btn-calc-fact')?.addEventListener('click', () => this.analyzeFactibilidade());

    // Senha
    $('btn-gen-pwd')?.addEventListener('click', () => this.generatePassword());
    $('btn-copy-pwd')?.addEventListener('click', () => this.copyPassword());
    $('pwd-length')?.addEventListener('input', e => {
      $('pwd-length-val').textContent = e.target.value;
    });

    // PDCA
    document.querySelectorAll('.pdca-add-btn').forEach(btn => {
      btn.addEventListener('click', () => this.addPDCAItem(btn.dataset.phase));
    });
    document.querySelectorAll('.pdca-rm').forEach(btn => {
      btn.addEventListener('click', () => this.removePDCAItem(btn.dataset.phase, parseInt(btn.dataset.idx)));
    });
    document.querySelectorAll('[id^="pdca-input-"]').forEach(input => {
      input.addEventListener('keypress', e => {
        if (e.key === 'Enter') this.addPDCAItem(input.id.replace('pdca-input-', ''));
      });
    });
    $('btn-export-pdca')?.addEventListener('click', () => this.exportPDCA());
    $('btn-clear-pdca')?.addEventListener('click', () => this.clearPDCA());

    // DMAIC
    $('btn-save-dmaic')?.addEventListener('click', () => this.saveDMAIC());
    $('btn-export-dmaic')?.addEventListener('click', () => this.exportDMAIC());
    $('btn-clear-dmaic')?.addEventListener('click', () => this.clearDMAIC());

    // ===== CRIADOR DE PROMPT =====
    $('pc-generate-btn')?.addEventListener('click', () => this.generatePrompt());
    $('pc-regen-btn')?.addEventListener('click', () => this.generatePrompt());
    $('pc-copy-btn')?.addEventListener('click', () => {
      const text = $('pc-result')?.textContent;
      if (text) navigator.clipboard.writeText(text).then(() => NexusApp?.showToast?.('✅ Prompt copiado!', 'success'));
    });
    $('pc-idea')?.addEventListener('input', () => {
      const len = $('pc-idea')?.value.length || 0;
      const counter = $('pc-char-count');
      if (counter) counter.textContent = len;
    });

    // ===== COMPRESSOR =====
    const videoUploadArea = $('video-upload-area');
    const videoInput = $('video-input');
    if (videoUploadArea && videoInput) {
      videoUploadArea.addEventListener('click', () => videoInput.click());
      videoInput.addEventListener('change', e => {
        if (e.target.files.length) this.loadVideoForCompress(e.target.files[0]);
      });
    }
    $('btn-compress')?.addEventListener('click', () => this.compressVideo());

    // ===== PARETO =====
    $('btn-add-pareto')?.addEventListener('click', () => this.addParetoItem());
    $('btn-gen-pareto')?.addEventListener('click', () => this.generatePareto());
    $('btn-clear-pareto')?.addEventListener('click', () => this.clearPareto());
    $('pareto-cat')?.addEventListener('keypress', e => { if (e.key === 'Enter') this.addParetoItem(); });

    // ===== ISHIKAWA =====
    document.querySelectorAll('.ishi-add-btn').forEach(btn => {
      btn.addEventListener('click', () => this.addIshikawaCause(btn.dataset.cat));
    });
    document.querySelectorAll('.ishi-rm').forEach(btn => {
      btn.addEventListener('click', () => this.removeIshikawaCause(btn.dataset.cat, parseInt(btn.dataset.idx)));
    });
    document.querySelectorAll('[id^="ishi-input-"]').forEach(input => {
      input.addEventListener('keypress', e => {
        if (e.key === 'Enter') this.addIshikawaCause(input.id.replace('ishi-input-', ''));
      });
    });
    $('btn-save-ishi')?.addEventListener('click', () => { this.saveIshikawa(); NexusApp?.showToast?.('Ishikawa salvo!', 'success'); });
    $('btn-export-ishi')?.addEventListener('click', () => this.exportIshikawa());
    $('btn-clear-ishi')?.addEventListener('click', () => this.clearIshikawa());

    // ===== GUT =====
    $('btn-add-gut')?.addEventListener('click', () => this.addGUTItem());
    $('gut-problem')?.addEventListener('keypress', e => { if (e.key === 'Enter') this.addGUTItem(); });
    document.querySelectorAll('.gut-rm').forEach(btn => {
      btn.addEventListener('click', () => this.removeGUTItem(parseInt(btn.dataset.idx)));
    });
    $('btn-export-gut')?.addEventListener('click', () => this.exportGUT());
    $('btn-clear-gut')?.addEventListener('click', () => this.clearGUT());

    // ===== CRONÔMETRO =====
    document.querySelectorAll('.timer-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setTimerMode(btn.dataset.mode));
    });
    $('btn-timer-start')?.addEventListener('click', () => this.startTimer());
    $('btn-timer-pause')?.addEventListener('click', () => this.pauseTimer());
    $('btn-timer-reset')?.addEventListener('click', () => this.resetTimer());

    // ===== FLUXOGRAMA AVANÇADO =====
    this.initFluxograma();

    // ===== 5 PORQUÊS =====
    $('btn-analyze-5p')?.addEventListener('click', () => this.analyze5Porques());
    $('btn-clear-5p')?.addEventListener('click', () => this.clear5Porques());
    $('btn-export-5p')?.addEventListener('click', () => this.export5Porques());

    // ===== CARTA CONTROLE =====
    $('btn-calc-cc')?.addEventListener('click', () => this.calcCartaControle());
    $('btn-clear-cc')?.addEventListener('click', () => this.clearCartaControle());
    $('btn-export-cc')?.addEventListener('click', () => this.exportCartaControle());

    // ===== GERADOR GRÁFICOS (ADVANCED ENGINE) =====
    const aceUploadArea = $('ace-upload-area');
    const aceFileInput = $('ace-file-input');
    if (aceUploadArea && aceFileInput) {
      aceUploadArea.addEventListener('click', () => aceFileInput.click());
      aceUploadArea.addEventListener('dragover', e => { e.preventDefault(); aceUploadArea.classList.add('dragover'); });
      aceUploadArea.addEventListener('dragleave', () => aceUploadArea.classList.remove('dragover'));
      aceUploadArea.addEventListener('drop', e => {
        e.preventDefault();
        aceUploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) this.handleAceUpload(e.dataTransfer.files[0]);
      });
      aceFileInput.addEventListener('change', e => {
        if (e.target.files.length) this.handleAceUpload(e.target.files[0]);
      });
    }
  },

  // ===== COMPRESSOR LOGIC =====
  loadVideoForCompress(file) {
    const preview = document.getElementById('video-preview');
    const container = document.getElementById('video-preview-container');
    const info = document.getElementById('video-info');
    const btn = document.getElementById('btn-compress');

    document.getElementById('video-file-name').textContent = file.name;
    container.style.display = 'block';
    preview.src = URL.createObjectURL(file);

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    info.innerHTML = `<p><strong>Arquivo:</strong> ${file.name} | <strong>Tamanho:</strong> ${sizeMB} MB</p>`;
    btn.disabled = false;

    this.videoFile = file;
  },

  async compressVideo() {
    if (!this.videoFile) return;

    const qualityNode = document.querySelector('input[name="quality"]:checked');
    const quality = qualityNode ? qualityNode.value : 'medium';

    // Configurações do FFmpeg (CRF: Constant Rate Factor - menor = mais qualidade)
    let crf = '28';
    let preset = 'fast';
    if (quality === 'high') crf = '23';
    else if (quality === 'low') { crf = '32'; preset = 'ultrafast'; }

    const progressDiv = document.getElementById('compress-progress');
    const progressFill = document.getElementById('compress-progress-fill');
    const statusText = document.getElementById('compress-status');
    const resultDiv = document.getElementById('compress-result');
    const btn = document.getElementById('btn-compress');

    btn.disabled = true;
    progressDiv.style.display = 'block';
    progressFill.style.width = '0%';
    statusText.innerText = 'Baixando biblioteca FFmpeg (pode demorar no 1º uso)...';
    resultDiv.style.display = 'none';

    try {
      // Importa dinamicamente a bilbioteca via CDN
      const { FFmpeg } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
      const { toBlobURL, fetchFile } = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');

      const ffmpeg = new FFmpeg();

      ffmpeg.on('progress', ({ progress }) => {
        let perc = Math.round(progress * 100);
        if (perc > 100) perc = 100;
        if (perc < 0) perc = 0;
        progressFill.style.width = `${perc}%`;
        statusText.innerText = `Processando: ${perc}%`;
      });

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      statusText.innerText = 'Lendo arquivo...';
      const inputName = 'input.mp4';
      const outputName = 'output.mp4';

      await ffmpeg.writeFile(inputName, await fetchFile(this.videoFile));

      statusText.innerText = 'Comprimindo vídeo...';

      // Executa o comando FFmpeg (-vcodec libx264 é otimizado para web e alta compatibilidade)
      await ffmpeg.exec([
        '-i', inputName,
        '-vcodec', 'libx264',
        '-crf', crf,
        '-preset', preset,
        outputName
      ]);

      statusText.innerText = 'Finalizando...';
      const data = await ffmpeg.readFile(outputName);

      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      const oldSize = (this.videoFile.size / (1024 * 1024)).toFixed(2);
      const newSize = (blob.size / (1024 * 1024)).toFixed(2);
      const reduction = Math.round((1 - blob.size / this.videoFile.size) * 100);

      progressDiv.style.display = 'none';
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = `
        <div class="compress-result-box" style="background: rgba(16,185,129,0.1); border: 1px solid #10b981; padding: 15px; border-radius: 8px;">
          <h4 style="color: #10b981; margin-bottom: 10px;"><i class="fa-solid fa-check-circle"></i> Compressão Concluída!</h4>
          <p>Tamanho Original: <strong>${oldSize} MB</strong></p>
          <p>Novo Tamanho: <strong>${newSize} MB</strong></p>
          <p>Redução de: <strong>${reduction > 0 ? reduction : 0}%</strong></p>
          <a href="${url}" download="comprimido_${this.videoFile.name}" class="tools-btn-primary" style="display:inline-block; margin-top:15px; text-decoration:none; text-align:center;">
            <i class="fa-solid fa-download"></i> Baixar Vídeo
          </a>
        </div>
      `;
    } catch (error) {
      console.error('Erro FFmpeg:', error);
      progressDiv.style.display = 'none';
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = `
        <div class="compress-result-box" style="background: rgba(239,68,68,0.1); border: 1px solid #ef4444; padding: 15px; border-radius: 8px;">
          <h4 style="color: #ef4444; margin-bottom: 10px;"><i class="fa-solid fa-circle-exclamation"></i> Erro na Compressão</h4>
          <p>${error.message}</p>
          <p style="margin-top: 10px; font-size: 0.85em; color: var(--text-tertiary);">Nota: A compressão no navegador requer muita memória RAM e não suporta arquivos gigantes. Para vídeos muito pesados, recomendamos o uso do software HandBrake.</p>
        </div>
      `;
    } finally {
      btn.disabled = false;
    }
  },

  // ===== PARETO LOGIC =====
  addParetoItem() {
    const cat = document.getElementById('pareto-cat').value.trim();
    const val = parseInt(document.getElementById('pareto-val').value);

    if (!cat || isNaN(val)) {
      NexusApp?.showToast?.('Preencha categoria e quantidade', 'error');
      return;
    }

    this.paretoData.push({ category: cat, value: val });
    this.updateParetoList();
    document.getElementById('pareto-cat').value = '';
    document.getElementById('pareto-val').value = '';
    document.getElementById('btn-gen-pareto').disabled = this.paretoData.length < 2;
  },

  updateParetoList() {
    const list = document.getElementById('pareto-list');
    list.innerHTML = this.paretoData.map((item, i) => `
      <div class="pareto-item">
        <span>${item.category}: ${item.value}</span>
        <button class="pareto-rm" onclick="NexusTools.removeParetoItem(${i})"><i class="fa-solid fa-times"></i></button>
      </div>
    `).join('');
  },

  removeParetoItem(idx) {
    this.paretoData.splice(idx, 1);
    this.updateParetoList();
    document.getElementById('btn-gen-pareto').disabled = this.paretoData.length < 2;
  },

  generatePareto() {
    if (this.paretoData.length < 2) return;

    // Ordenar por valor decrescente
    const sorted = [...this.paretoData].sort((a, b) => b.value - a.value);
    const total = sorted.reduce((sum, item) => sum + item.value, 0);

    // Calcular percentual acumulado
    let cumulative = 0;
    const cumulativeData = sorted.map(item => {
      cumulative += item.value;
      return (cumulative / total) * 100;
    });

    const container = document.getElementById('pareto-chart-container');
    container.style.display = 'block';

    const ctx = document.getElementById('pareto-chart').getContext('2d');

    // Destruir gráfico anterior se existir
    if (this.paretoChart) this.paretoChart.destroy();

    this.paretoChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(item => item.category),
        datasets: [
          {
            type: 'bar',
            label: 'Quantidade',
            data: sorted.map(item => item.value),
            backgroundColor: '#14b8a680',
            borderColor: '#14b8a6',
            borderWidth: 2
          },
          {
            type: 'line',
            label: '% Acumulado',
            data: cumulativeData,
            borderColor: '#ef4444',
            borderWidth: 2,
            fill: false,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, position: 'left' },
          y1: { beginAtZero: true, max: 100, position: 'right', grid: { drawOnChartArea: false } }
        }
      }
    });

    // Insights
    const top80 = [];
    let sum = 0;
    for (const item of sorted) {
      sum += item.value;
      top80.push(item.category);
      if ((sum / total) >= 0.8) break;
    }

    document.getElementById('pareto-insights').innerHTML = `
      <h4>📊 Análise 80/20</h4>
      <p><strong>${top80.length}</strong> categorias representam ~80% do total:</p>
      <ul>${top80.map(c => `<li>${c}</li>`).join('')}</ul>
      <p><strong>Recomendação:</strong> Priorize ações nessas categorias para maior impacto.</p>
    `;
  },

  clearPareto() {
    if (confirm('Limpar todos os dados do Pareto?')) {
      this.paretoData = [];
      this.updateParetoList();
      document.getElementById('pareto-chart-container').style.display = 'none';
      document.getElementById('btn-gen-pareto').disabled = true;
    }
  },

  // ===== ISHIKAWA LOGIC =====
  addIshikawaCause(cat) {
    const input = document.getElementById(`ishi-input-${cat}`);
    const value = input.value.trim();
    if (!value) return;

    this.ishikawaData.causes[cat] = this.ishikawaData.causes[cat] || [];
    this.ishikawaData.causes[cat].push(value);
    this.saveIshikawa();
    this.render(document.getElementById('page-content'));
  },

  removeIshikawaCause(cat, idx) {
    this.ishikawaData.causes[cat].splice(idx, 1);
    this.saveIshikawa();
    this.render(document.getElementById('page-content'));
  },

  exportIshikawa() {
    this.saveIshikawa();
    let content = '=== DIAGRAMA DE ISHIKAWA (6M) ===\n\n';
    content += `PROBLEMA: ${this.ishikawaData.problem || '(não definido)'}\n\n`;

    const labels = { metodo: 'MÉTODO', maquina: 'MÁQUINA', maoDeObra: 'MÃO DE OBRA', material: 'MATERIAL', medicao: 'MEDIÇÃO', meioAmbiente: 'MEIO AMBIENTE' };
    Object.keys(labels).forEach(key => {
      content += `[${labels[key]}]\n`;
      (this.ishikawaData.causes[key] || []).forEach(c => content += `  • ${c}\n`);
      content += '\n';
    });
    content += `\nExportado em: ${new Date().toLocaleString('pt-BR')}`;

    this.downloadText(content, 'ishikawa_export.txt');
    NexusApp?.showToast?.('Ishikawa exportado!', 'success');
  },

  clearIshikawa() {
    if (confirm('Limpar todo o Ishikawa?')) {
      this.ishikawaData = { problem: '', causes: { metodo: [], maquina: [], maoDeObra: [], material: [], medicao: [], meioAmbiente: [] } };
      localStorage.setItem('nexus_ishikawa', JSON.stringify(this.ishikawaData));
      this.render(document.getElementById('page-content'));
    }
  },

  // ===== GUT LOGIC =====
  addGUTItem() {
    const problem = document.getElementById('gut-problem').value.trim();
    const g = parseInt(document.getElementById('gut-g').value);
    const u = parseInt(document.getElementById('gut-u').value);
    const t = parseInt(document.getElementById('gut-t').value);

    if (!problem || isNaN(g) || isNaN(u) || isNaN(t)) {
      NexusApp?.showToast?.('Preencha todos os campos', 'error');
      return;
    }

    if (g < 1 || g > 5 || u < 1 || u > 5 || t < 1 || t > 5) {
      NexusApp?.showToast?.('Valores devem estar entre 1 e 5', 'error');
      return;
    }

    this.gutData.push({ problem, g, u, t, gut: g * u * t });
    this.saveGUT();
    this.render(document.getElementById('page-content'));
    NexusApp?.showToast?.('Problema adicionado!', 'success');
  },

  removeGUTItem(idx) {
    const sorted = [...this.gutData].sort((a, b) => b.gut - a.gut);
    const item = sorted[idx];
    const originalIdx = this.gutData.findIndex(i => i.problem === item.problem && i.gut === item.gut);
    if (originalIdx !== -1) {
      this.gutData.splice(originalIdx, 1);
      this.saveGUT();
      this.render(document.getElementById('page-content'));
    }
  },

  exportGUT() {
    let content = '=== MATRIZ GUT ===\n\n';
    content += 'PRIORIDADE | PROBLEMA | G | U | T | GUT\n';
    content += '-'.repeat(60) + '\n';

    this.gutData.sort((a, b) => b.gut - a.gut).forEach((item, i) => {
      content += `${i + 1}º | ${item.problem} | ${item.g} | ${item.u} | ${item.t} | ${item.gut}\n`;
    });

    content += `\nExportado em: ${new Date().toLocaleString('pt-BR')}`;
    this.downloadText(content, 'gut_export.txt');
    NexusApp?.showToast?.('GUT exportado!', 'success');
  },

  clearGUT() {
    if (confirm('Limpar toda a Matriz GUT?')) {
      this.gutData = [];
      this.saveGUT();
      this.render(document.getElementById('page-content'));
    }
  },

  // ===== CRONÔMETRO LOGIC =====
  setTimerMode(mode) {
    this.timerMode = mode;
    this.resetTimer();

    document.querySelectorAll('.timer-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const pomoSettings = document.getElementById('pomodoro-settings');
    pomoSettings.style.display = mode === 'pomodoro' ? 'block' : 'none';

    if (mode === 'pomodoro') {
      this.pomodoroPhase = 'work';
      const workMin = parseInt(document.getElementById('pomo-work').value) || 25;
      this.timerSeconds = workMin * 60;
      this.updateTimerDisplay();
      document.getElementById('timer-phase').textContent = '🍅 Foco';
    } else {
      document.getElementById('timer-phase').textContent = '';
    }
  },

  startTimer() {
    if (this.timerInterval) return;

    document.getElementById('btn-timer-start').disabled = true;
    document.getElementById('btn-timer-pause').disabled = false;

    if (this.timerMode === 'stopwatch') {
      this.timerInterval = setInterval(() => {
        this.timerSeconds++;
        this.updateTimerDisplay();
      }, 1000);
    } else {
      this.timerInterval = setInterval(() => {
        this.timerSeconds--;
        this.updateTimerDisplay();

        if (this.timerSeconds <= 0) {
          this.pomodoroComplete();
        }
      }, 1000);
    }
  },

  pauseTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
    document.getElementById('btn-timer-start').disabled = false;
    document.getElementById('btn-timer-pause').disabled = true;
  },

  resetTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.timerSeconds = 0;

    if (this.timerMode === 'pomodoro') {
      const workMin = parseInt(document.getElementById('pomo-work')?.value) || 25;
      this.timerSeconds = workMin * 60;
      this.pomodoroPhase = 'work';
      document.getElementById('timer-phase').textContent = '🍅 Foco';
    }

    this.updateTimerDisplay();
    document.getElementById('btn-timer-start').disabled = false;
    document.getElementById('btn-timer-pause').disabled = true;
  },

  pomodoroComplete() {
    this.pauseTimer();

    if (this.pomodoroPhase === 'work') {
      this.pomodoroCount++;
      document.getElementById('pomo-count').textContent = this.pomodoroCount;
      this.pomodoroPhase = 'break';
      const breakMin = parseInt(document.getElementById('pomo-break').value) || 5;
      this.timerSeconds = breakMin * 60;
      document.getElementById('timer-phase').textContent = '☕ Pausa';
      NexusApp?.showToast?.('Pomodoro concluído! Hora da pausa 🎉', 'success');
    } else {
      this.pomodoroPhase = 'work';
      const workMin = parseInt(document.getElementById('pomo-work').value) || 25;
      this.timerSeconds = workMin * 60;
      document.getElementById('timer-phase').textContent = '🍅 Foco';
      NexusApp?.showToast?.('Pausa encerrada! De volta ao foco 💪', 'info');
    }

    this.updateTimerDisplay();
  },

  updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    if (!display) return;

    const hours = Math.floor(this.timerSeconds / 3600);
    const minutes = Math.floor((this.timerSeconds % 3600) / 60);
    const seconds = this.timerSeconds % 60;

    display.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  },

  // ============ FLUXOGRAMA AVANÇADO ============
  fluxState: {
    nodes: [],
    connections: [],
    nodeIdCounter: 0,
    selectedNode: null,
    isDraggingNode: false,
    isConnecting: false,
    connectionStartNode: null,
    connectionStartHandle: null,
    tempPath: null,
    startDragX: 0,
    startDragY: 0,
    initialNodeX: 0,
    initialNodeY: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    isPanning: false
  },

  // Chave configurada pelo admin (ver window.getPplxApiKey em js/app.js). Nunca hardcode aqui.
  get PPLX_API_KEY() { return window.getPplxApiKey ? window.getPplxApiKey() : ''; },

  fluxSetZoom(z) {
    this.fluxState.zoom = Math.max(0.3, Math.min(2, z));
    const container = document.getElementById('flux-canvas-container');
    if (container) {
      container.style.transform = `scale(${this.fluxState.zoom}) translate(${this.fluxState.panX}px, ${this.fluxState.panY}px)`;
      container.style.transformOrigin = 'top left';
    }
    const label = document.getElementById('flux-zoom-label');
    if (label) label.textContent = Math.round(this.fluxState.zoom * 100) + '%';
  },

  renderFluxograma() {
    return `
      <div class="tool-container flux-tool-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #06b6d4, #0891b2);">
            <i class="fa-solid fa-diagram-project"></i>
          </div>
          <div>
            <h2>Criador de Fluxograma</h2>
            <p>Arraste formas, conecte nós e exporte como imagem</p>
          </div>
        </div>

        <div class="flux-advanced-container">
          <!-- Sidebar Palette -->
          <aside class="flux-sidebar">
            <div class="flux-palette-section">
              <h4>Formas Básicas</h4>
              <div class="flux-palette">
                <div class="flux-shape-item" draggable="true" data-type="start">
                  <div class="flux-preview-shape capsule"></div>
                  <span>Início/Fim</span>
                </div>
                <div class="flux-shape-item" draggable="true" data-type="process">
                  <div class="flux-preview-shape rect"></div>
                  <span>Processo</span>
                </div>
                <div class="flux-shape-item" draggable="true" data-type="decision">
                  <div class="flux-preview-shape diamond"></div>
                  <span>Decisão</span>
                </div>
                <div class="flux-shape-item" draggable="true" data-type="io">
                  <div class="flux-preview-shape parallelogram"></div>
                  <span>Dados (I/O)</span>
                </div>
                <div class="flux-shape-item" draggable="true" data-type="document">
                  <div class="flux-preview-shape doc-shape"></div>
                  <span>Documento</span>
                </div>
                <div class="flux-shape-item" draggable="true" data-type="database">
                <div class="flux-preview-shape db-shape"></div>
                <span>Banco de Dados</span>
              </div>
              <div class="flux-shape-item" draggable="true" data-type="fluxlabel" data-label="Sim" style="border-color:rgba(16,185,129,.4)">
                <span style="font-weight:700;color:#10b981;font-size:0.85rem">✓ Sim</span>
              </div>
              <div class="flux-shape-item" draggable="true" data-type="fluxlabel" data-label="Não" style="border-color:rgba(239,68,68,.4)">
                <span style="font-weight:700;color:#ef4444;font-size:0.85rem">✗ Não</span>
              </div>
            </div>
          </div>

            <div class="flux-palette-section">
              <h4>Ícones e Processos</h4>
              <div class="flux-palette grid-2">
                <div class="flux-shape-item icon-item" draggable="true" data-type="email" data-icon="fa-envelope">
                  <i class="fa-solid fa-envelope"></i>
                  <span>Email</span>
                </div>
                <div class="flux-shape-item icon-item" draggable="true" data-type="whatsapp" data-icon="fa-whatsapp">
                  <i class="fa-brands fa-whatsapp"></i>
                  <span>WhatsApp</span>
                </div>
                <div class="flux-shape-item icon-item" draggable="true" data-type="user" data-icon="fa-user">
                  <i class="fa-solid fa-user"></i>
                  <span>Usuário</span>
                </div>
                <div class="flux-shape-item icon-item" draggable="true" data-type="server" data-icon="fa-server">
                  <i class="fa-solid fa-server"></i>
                  <span>Sistema</span>
                </div>
                <div class="flux-shape-item icon-item" draggable="true" data-type="timer" data-icon="fa-clock">
                  <i class="fa-solid fa-clock"></i>
                  <span>Espera</span>
                </div>
                <div class="flux-shape-item icon-item" draggable="true" data-type="check" data-icon="fa-check-circle">
                  <i class="fa-solid fa-check-circle"></i>
                  <span>Validar</span>
                </div>
              </div>
            </div>

            <div class="flux-palette-section">
            <h4>Mais Ícones</h4>
            <div class="flux-palette grid-2">
              <div class="flux-shape-item icon-item" draggable="true" data-type="phone" data-icon="fa-phone">
                <i class="fa-solid fa-phone"></i>
                <span>Telefone</span>
              </div>
              <div class="flux-shape-item icon-item" draggable="true" data-type="alert" data-icon="fa-triangle-exclamation">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Alerta</span>
              </div>
              <div class="flux-shape-item icon-item" draggable="true" data-type="gear" data-icon="fa-gear">
                <i class="fa-solid fa-gear"></i>
                <span>Config</span>
              </div>
              <div class="flux-shape-item icon-item" draggable="true" data-type="folder" data-icon="fa-folder">
                <i class="fa-solid fa-folder"></i>
                <span>Pasta</span>
              </div>
              <div class="flux-shape-item icon-item" draggable="true" data-type="chat" data-icon="fa-comments">
                <i class="fa-solid fa-comments"></i>
                <span>Chat</span>
              </div>
              <div class="flux-shape-item icon-item" draggable="true" data-type="money" data-icon="fa-dollar-sign">
                <i class="fa-solid fa-dollar-sign"></i>
                <span>Finanças</span>
              </div>
            </div>
          </div>

          <div class="flux-actions-section">
            <button class="tools-btn-ai" id="btn-flux-ai">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Gerar com IA
            </button>
            <div style="display:flex;gap:6px;align-items:center;margin:8px 0">
              <button class="tools-btn-secondary" id="btn-flux-zoom-out" style="padding:6px 10px;font-size:16px">−</button>
              <span id="flux-zoom-label" style="font-size:12px;min-width:40px;text-align:center">100%</span>
              <button class="tools-btn-secondary" id="btn-flux-zoom-in" style="padding:6px 10px;font-size:16px">+</button>
              <button class="tools-btn-secondary" id="btn-flux-zoom-fit" style="padding:6px 10px;font-size:11px">Ajustar</button>
            </div>
            <button class="tools-btn-secondary" id="btn-flux-rotate" style="display:flex;align-items:center;gap:6px;justify-content:center">
              <i class="fa-solid fa-rotate-right"></i> Rotacionar
            </button>
            <button class="tools-btn-secondary" id="btn-flux-clear">Limpar Tudo</button>
            <button class="tools-btn-danger" id="btn-flux-delete">Excluir (Del)</button>
            <button class="tools-btn-primary" id="btn-flux-export">Baixar PNG</button>
          </div>

          <div class="flux-instructions">
            <small>Arraste formas para o quadro.<br>Clique e arraste da borda para conectar.<br>Scroll = zoom · Rotacionar = selecione + botão</small>
          </div>
          </aside>

          <!-- Main Workspace -->
          <main class="flux-workspace" id="flux-workspace">
            <div id="flux-canvas-container">
              <svg id="flux-connections-layer"></svg>
              <div id="flux-nodes-layer"></div>
            </div>
          </main>
        </div>

        <!-- AI Modal -->
        <div id="flux-ai-modal" class="flux-modal-overlay" style="display: none;">
          <div class="flux-modal">
            <div class="flux-modal-header">
              <h3>Gerar Fluxograma com IA</h3>
              <button id="btn-flux-close-modal" class="flux-close-btn">&times;</button>
            </div>
            <div class="flux-modal-body">
              <p>Descreva o processo que você deseja montar. Ex: "Processo de reembolso onde o funcionário solicita, o gestor aprova e o financeiro paga."</p>
              <textarea id="flux-ai-prompt" placeholder="Descreva seu fluxo aqui..."></textarea>
              <div id="flux-ai-loading" style="display: none; color: var(--primary-400); margin-top: 10px;">
                <i class="fa-solid fa-spinner fa-spin"></i> Gerando fluxo... por favor aguarde...
              </div>
            </div>
            <div class="flux-modal-footer">
              <button id="btn-flux-generate-ai" class="tools-btn-ai" style="width: 100%;">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Gerar Fluxograma
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async initFluxograma() {
    await this.fluxLoadFromCloud(); // Changed to Cloud
    const workspace = document.getElementById('flux-workspace');
    const nodesLayer = document.getElementById('flux-nodes-layer');
    const connectionsLayer = document.getElementById('flux-connections-layer');
    const canvasContainer = document.getElementById('flux-canvas-container');

    if (!workspace) return;

    // Ensure arrowhead marker
    this.fluxEnsureMarker();

    // Drag from palette
    document.querySelectorAll('.flux-shape-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('shapeType', item.dataset.type);
        e.dataTransfer.setData('iconClass', item.dataset.icon || '');
        e.dataTransfer.setData('labelText', item.dataset.label || '');
        e.dataTransfer.effectAllowed = 'copy';
      });
    });

    workspace.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    workspace.addEventListener('drop', (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('shapeType');
      const iconClass = e.dataTransfer.getData('iconClass');
      const labelText = e.dataTransfer.getData('labelText');
      if (!type) return;

      const rect = canvasContainer.getBoundingClientRect();
      const x = (e.clientX - rect.left - this.fluxState.panX) / this.fluxState.zoom;
      const y = (e.clientY - rect.top - this.fluxState.panY) / this.fluxState.zoom;

      const node = this.fluxCreateNode(type, x, y, iconClass);
      if (labelText) {
        const content = node.querySelector('.content');
        if (content) content.innerText = labelText;
      }
    });

    // Click to deselect
    workspace.addEventListener('click', (e) => {
      if (e.target === workspace || e.target === canvasContainer) {
        this.fluxSelectNode(null);
      }
    });

    // Keyboard delete
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement?.contentEditable !== 'true') {
        if (this.currentTool === 'fluxograma') this.fluxDeleteSelected();
      }
    });

    // Button events
    document.getElementById('btn-flux-delete')?.addEventListener('click', () => this.fluxDeleteSelected());
    document.getElementById('btn-flux-clear')?.addEventListener('click', () => this.fluxClearAll());
    document.getElementById('btn-flux-export')?.addEventListener('click', () => this.fluxExportPNG());
    document.getElementById('btn-flux-ai')?.addEventListener('click', () => this.fluxOpenAIModal());
    document.getElementById('btn-flux-close-modal')?.addEventListener('click', () => this.fluxCloseAIModal());
    document.getElementById('btn-flux-generate-ai')?.addEventListener('click', () => this.fluxGenerateFromAI());
    document.getElementById('btn-flux-rotate')?.addEventListener('click', () => this.fluxRotateSelected());

    // Zoom controls
    document.getElementById('btn-flux-zoom-in')?.addEventListener('click', () => this.fluxSetZoom(this.fluxState.zoom * 1.2));
    document.getElementById('btn-flux-zoom-out')?.addEventListener('click', () => this.fluxSetZoom(this.fluxState.zoom / 1.2));
    document.getElementById('btn-flux-zoom-fit')?.addEventListener('click', () => this.fluxFitView());

    // Close modal on outside click
    document.getElementById('flux-ai-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'flux-ai-modal') this.fluxCloseAIModal();
    });

    // Zoom with mouse wheel
    workspace.addEventListener('wheel', (e) => {
      e.preventDefault();
      const scaleAmount = -e.deltaY * 0.001;
      const newZoom = this.fluxState.zoom * (1 + scaleAmount);

      const rect = canvasContainer.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - this.fluxState.panX) / this.fluxState.zoom;
      const worldY = (mouseY - this.fluxState.panY) / this.fluxState.zoom;

      const newPanX = mouseX - worldX * newZoom;
      const newPanY = mouseY - worldY * newZoom;

      this.fluxSetZoom(newZoom);
      this.fluxSetPan(newPanX, newPanY);
    });

    // Pan with Space key or Right-click
    workspace.addEventListener('mousedown', (e) => {
      if (e.code === 'Space' || e.button === 2) { // Space key or right-click
        e.preventDefault();
        this.fluxState.isPanning = true;
        this.fluxState.startDragX = e.clientX;
        this.fluxState.startDragY = e.clientY;
        workspace.style.cursor = 'grabbing';
      }
    });

    workspace.addEventListener('mousemove', (e) => {
      if (this.fluxState.isPanning) {
        const dx = e.clientX - this.fluxState.startDragX;
        const dy = e.clientY - this.fluxState.startDragY;
        this.fluxSetPan(this.fluxState.panX + dx, this.fluxState.panY + dy);
        this.fluxState.startDragX = e.clientX;
        this.fluxState.startDragY = e.clientY;
      }
    });

    workspace.addEventListener('mouseup', () => {
      this.fluxState.isPanning = false;
      workspace.style.cursor = 'grab';
    });

    workspace.addEventListener('mouseleave', () => {
      this.fluxState.isPanning = false;
      workspace.style.cursor = 'grab';
    });

    workspace.addEventListener('contextmenu', (e) => {
      if (this.fluxState.isPanning) e.preventDefault(); // Prevent context menu if panning with right-click
    });

    // Initial fit view
    this.fluxFitView();
  },

  fluxCreateNode(type, x, y, iconClass = '', shouldSave = true) {
    this.fluxState.nodeIdCounter++;
    const id = `flux-node-${this.fluxState.nodeIdCounter}`;
    const nodesLayer = document.getElementById('flux-nodes-layer');

    const node = document.createElement('div');
    node.className = 'flux-node';
    node.setAttribute('data-type', type);
    node.setAttribute('id', id);
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;

    if (iconClass) {
      node.setAttribute('data-is-icon', 'true');
      const icon = document.createElement('i');
      icon.className = type === 'whatsapp' ? `fa-brands ${iconClass}` : `fa-solid ${iconClass}`;
      node.appendChild(icon);
    }

    // Content
    const content = document.createElement('div');
    content.className = 'content';
    content.contentEditable = true;

    const defaultTexts = {
      decision: '?', email: 'Email', whatsapp: 'WhatsApp',
      user: 'Ação', server: 'System', start: 'Início', process: 'Processo',
      io: 'Dados', document: 'Doc', database: 'BD', timer: 'Espera', check: 'Validar',
      phone: 'Telefone', alert: 'Alerta', gear: 'Config', folder: 'Pasta', chat: 'Chat', money: 'Finanças',
      fluxlabel: ''
    };
    content.innerText = defaultTexts[type] || 'Texto';

    content.addEventListener('mousedown', (e) => e.stopPropagation());
    node.appendChild(content);

    // Connector handles
    ['top', 'right', 'bottom', 'left'].forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `flux-connector-handle flux-handle-${pos}`;
      handle.setAttribute('data-pos', pos);
      handle.addEventListener('mousedown', (e) => this.fluxStartConnection(e, node, pos));
      node.appendChild(handle);
    });

    // Node drag
    node.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('flux-connector-handle')) return;
      this.fluxSelectNode(node);
      this.fluxStartDragNode(e, node);
    });

    node.addEventListener('mouseup', () => {
      if (this.fluxState.isConnecting) this.fluxFinishConnection(node);
    });

    nodesLayer.appendChild(node);

    // Save state
    if (shouldSave) {
      this.fluxSaveToCloud();
    }

    return node;
  },

  fluxSelectNode(node) {
    if (this.fluxState.selectedNode) this.fluxState.selectedNode.classList.remove('selected');
    this.fluxState.selectedNode = node;
    if (node) node.classList.add('selected');
  },

  fluxStartDragNode(e, node) {
    this.fluxState.isDraggingNode = true;
    this.fluxState.startDragX = e.clientX;
    this.fluxState.startDragY = e.clientY;
    this.fluxState.initialNodeX = parseInt(node.style.left || 0);
    this.fluxState.initialNodeY = parseInt(node.style.top || 0);

    const onDrag = (ev) => {
      if (!this.fluxState.isDraggingNode || !this.fluxState.selectedNode) return;
      const dx = ev.clientX - this.fluxState.startDragX;
      const dy = ev.clientY - this.fluxState.startDragY;
      this.fluxState.selectedNode.style.left = `${this.fluxState.initialNodeX + dx / this.fluxState.zoom}px`;
      this.fluxState.selectedNode.style.top = `${this.fluxState.initialNodeY + dy / this.fluxState.zoom}px`;
      this.fluxUpdateConnections();
      this.fluxSaveToCloud(); // Save on drag
    };

    const stopDrag = () => {
      this.fluxState.isDraggingNode = false;
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  },

  fluxStartConnection(e, node, handlePos) {
    e.stopPropagation();
    e.preventDefault();
    this.fluxState.isConnecting = true;
    this.fluxState.connectionStartNode = node;
    this.fluxState.connectionStartHandle = handlePos;

    const connectionsLayer = document.getElementById('flux-connections-layer');
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('class', 'flux-connection');
    tempPath.style.strokeDasharray = '5,5';
    connectionsLayer.appendChild(tempPath);
    this.fluxState.tempPath = tempPath;

    const canvasContainer = document.getElementById('flux-canvas-container');

    const onDrag = (ev) => {
      if (!this.fluxState.isConnecting) return;
      const rect = canvasContainer.getBoundingClientRect();
      const mouseX = (ev.clientX - rect.left - this.fluxState.panX) / this.fluxState.zoom;
      const mouseY = (ev.clientY - rect.top - this.fluxState.panY) / this.fluxState.zoom;
      const startPt = this.fluxGetHandlePosition(this.fluxState.connectionStartNode, this.fluxState.connectionStartHandle);
      this.fluxState.tempPath.setAttribute('d', `M ${startPt.x} ${startPt.y} L ${mouseX} ${mouseY}`);
    };

    const cancel = () => {
      this.fluxResetConnectionState();
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', cancel);
    };

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', cancel);
  },

  fluxFinishConnection(targetNode) {
    if (!this.fluxState.isConnecting || targetNode === this.fluxState.connectionStartNode) return;

    const startPt = this.fluxGetHandlePosition(this.fluxState.connectionStartNode, this.fluxState.connectionStartHandle);
    const targetCenter = {
      x: parseInt(targetNode.style.left) + targetNode.offsetWidth / 2,
      y: parseInt(targetNode.style.top) + targetNode.offsetHeight / 2
    };

    let targetHandle = 'left';
    if (Math.abs(startPt.y - targetCenter.y) > Math.abs(startPt.x - targetCenter.x)) {
      targetHandle = startPt.y < targetCenter.y ? 'top' : 'bottom';
    } else {
      targetHandle = startPt.x < targetCenter.x ? 'left' : 'right';
    }

    const conn = {
      id: `flux-conn-${Date.now()}`,
      sourceId: this.fluxState.connectionStartNode.id,
      targetId: targetNode.id,
      sourceHandle: this.fluxState.connectionStartHandle,
      targetHandle: targetHandle
    };

    this.fluxState.connections.push(conn);
    this.fluxRenderConnection(conn);
    this.fluxResetConnectionState();
    this.fluxSaveToCloud();
  },

  fluxResetConnectionState() {
    this.fluxState.isConnecting = false;
    this.fluxState.connectionStartNode = null;
    if (this.fluxState.tempPath) this.fluxState.tempPath.remove();
    this.fluxState.tempPath = null;
  },

  fluxGetHandlePosition(node, handlePos) {
    const x = parseInt(node.style.left);
    const y = parseInt(node.style.top);
    const w = node.offsetWidth;
    const h = node.offsetHeight;

    if (handlePos === 'top') return { x: x + w / 2, y: y };
    if (handlePos === 'right') return { x: x + w, y: y + h / 2 };
    if (handlePos === 'bottom') return { x: x + w / 2, y: y + h };
    if (handlePos === 'left') return { x: x, y: y + h / 2 };
    return { x: x + w / 2, y: y + h / 2 };
  },

  fluxUpdateConnections() {
    this.fluxState.connections.forEach(conn => {
      const g = document.getElementById(conn.id);
      if (!g) return;
      const path = g.querySelector('path') || g;
      this.fluxUpdatePathD(path, conn);
      const text = g.querySelector('text');
      if (text) this.fluxUpdateLabelPosition(text, path, conn);
    });
  },

  fluxRenderConnection(conn) {
    const connectionsLayer = document.getElementById('flux-connections-layer');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', conn.id);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'flux-connection');
    this.fluxEnsureMarker();
    path.setAttribute('marker-end', 'url(#flux-arrowhead)');
    this.fluxUpdatePathD(path, conn);
    g.appendChild(path);

    // Label (Sim/Não etc)
    if (conn.label) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'flux-conn-label');
      text.setAttribute('fill', '#94a3b8');
      text.setAttribute('font-size', '11');
      text.setAttribute('font-weight', '600');
      text.setAttribute('text-anchor', 'middle');
      text.textContent = conn.label;
      g.appendChild(text);
      this.fluxUpdateLabelPosition(text, path, conn);
    }

    connectionsLayer.appendChild(g);
  },

  fluxUpdateLabelPosition(text, path, conn) {
    const source = document.getElementById(conn.sourceId);
    const target = document.getElementById(conn.targetId);
    if (!source || !target) return;
    const p1 = this.fluxGetHandlePosition(source, conn.sourceHandle);
    const p2 = this.fluxGetHandlePosition(target, conn.targetHandle);
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    // Offset the label slightly from the midpoint
    const offset = conn.sourceHandle === 'right' || conn.sourceHandle === 'left' ? -12 : -8;
    text.setAttribute('x', mx);
    text.setAttribute('y', my + offset);
    // Background rect
    text.setAttribute('paint-order', 'stroke');
    text.setAttribute('stroke', '#0f172a');
    text.setAttribute('stroke-width', '4');
  },

  fluxUpdatePathD(path, conn) {
    const source = document.getElementById(conn.sourceId);
    const target = document.getElementById(conn.targetId);
    if (!source || !target) return;

    const p1 = this.fluxGetHandlePosition(source, conn.sourceHandle);
    const p2 = this.fluxGetHandlePosition(target, conn.targetHandle);

    const dx = Math.abs(p1.x - p2.x) * 0.5;
    let c1 = { ...p1 }, c2 = { ...p2 };

    if (conn.sourceHandle === 'right') c1.x += dx;
    else if (conn.sourceHandle === 'left') c1.x -= dx;
    else if (conn.sourceHandle === 'top') c1.y -= dx;
    else c1.y += dx;

    if (conn.targetHandle === 'right') c2.x += dx;
    else if (conn.targetHandle === 'left') c2.x -= dx;
    else if (conn.targetHandle === 'top') c2.y -= dx;
    else c2.y += dx;

    path.setAttribute('d', `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`);
  },

  fluxEnsureMarker() {
    const connectionsLayer = document.getElementById('flux-connections-layer');
    if (!connectionsLayer || document.getElementById('flux-arrowhead')) return;

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'flux-arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '10');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', '#64748b');

    marker.appendChild(polygon);
    defs.appendChild(marker);
    connectionsLayer.prepend(defs);
  },

  fluxDeleteSelected() {
    if (!this.fluxState.selectedNode) return;
    const id = this.fluxState.selectedNode.id;
    this.fluxState.connections = this.fluxState.connections.filter(c => {
      if (c.sourceId === id || c.targetId === id) {
        const g = document.getElementById(c.id);
        if (g) g.remove();
        return false;
      }
      return true;
    });
    this.fluxState.selectedNode.remove();
    this.fluxState.selectedNode = null;
    this.fluxSaveToCloud();
  },

  fluxRotateSelected() {
    if (!this.fluxState.selectedNode) {
      NexusApp?.showToast?.('Selecione um item para rotacionar.', 'info');
      return;
    }
    const node = this.fluxState.selectedNode;
    const current = parseInt(node.dataset.rotation || '0');
    const next = (current + 90) % 360;
    node.dataset.rotation = next;
    // Apply rotation only to the visual, not affecting position
    const content = node.querySelector('.content');
    if (node.dataset.type === 'fluxlabel') {
      // For labels, rotate the whole node
      node.style.transform = `rotate(${next}deg)`;
    } else {
      // For regular nodes, we don't rotate the whole node (would break connections)
      // Instead we rotate the visual content
      node.style.transform = `rotate(${next}deg)`;
    }
    this.fluxUpdateConnections();
    this.fluxSaveToCloud();
    NexusApp?.showToast?.(`Rotacionado ${next}°`, 'success');
  },

  fluxClearAll() {
    if (!confirm('Tem certeza que deseja limpar tudo?')) return;

    document.getElementById('flux-nodes-layer').innerHTML = '';
    document.getElementById('flux-connections-layer').innerHTML = '';
    this.fluxEnsureMarker();
    this.fluxState.connections = [];
    this.fluxState.nodeIdCounter = 0;
    this.fluxState.selectedNode = null;
    this.fluxSaveToCloud();
  },

  fluxExportPNG() {
    const canvasContainer = document.getElementById('flux-canvas-container');
    if (typeof html2canvas === 'undefined') {
      // Load html2canvas dynamically
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.onload = () => this.fluxDoExport(canvasContainer);
      document.head.appendChild(script);
    } else {
      this.fluxDoExport(canvasContainer);
    }
  },

  fluxDoExport(container) {
    // Temporarily reset zoom and pan for export
    const originalTransform = container.style.transform;
    const originalTransformOrigin = container.style.transformOrigin;
    container.style.transform = 'scale(1) translate(0px, 0px)';
    container.style.transformOrigin = '0 0';

    html2canvas(container, { backgroundColor: '#1e293b' }).then(canvas => {
      const link = document.createElement('a');
      link.download = 'fluxograma.png';
      link.href = canvas.toDataURL();
      link.click();
      NexusApp?.showToast?.('Fluxograma exportado como PNG!', 'success');
    }).finally(() => {
      // Restore original transform
      container.style.transform = originalTransform;
      container.style.transformOrigin = originalTransformOrigin;
    });
  },

  fluxOpenAIModal() {
    document.getElementById('flux-ai-modal').style.display = 'flex';
    document.getElementById('flux-ai-prompt').value = '';
    document.getElementById('flux-ai-prompt').focus();
  },

  fluxCloseAIModal() {
    document.getElementById('flux-ai-modal').style.display = 'none';
  },

  // ============ PERSISTENCE (CLOUD) ============
  async fluxSaveToCloud() {
    const user = window.NepAuth?.getUser();
    if (!user || !window.db) return; // Only save if logged in and DB ready

    const nodes = Array.from(document.querySelectorAll('.flux-node')).map(n => ({
      id: n.id,
      type: n.dataset.type,
      x: parseInt(n.style.left),
      y: parseInt(n.style.top),
      text: n.querySelector('.content')?.innerText || '',
      isIcon: n.hasAttribute('data-is-icon'),
      iconClass: n.querySelector('i')?.className.replace('fa-solid ', '').replace('fa-brands', '').trim()
    }));

    const data = {
      nodes: nodes,
      connections: this.fluxState.connections,
      counter: this.fluxState.nodeIdCounter,
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = window.db.collection('user_data').doc(`${user.uid}_fluxograma`);
      await docRef.set(data);
      console.log('[Fluxograma] Saved to cloud');
    } catch (e) {
      console.error('Flux save error:', e);
    }
  },

  async fluxLoadFromCloud() {
    const user = window.NepAuth?.getUser();
    if (!user || !window.db) return;

    try {
      const docRef = window.db.collection('user_data').doc(`${user.uid}_fluxograma`);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const data = docSnap.data();

        this.fluxClearWorkspaceUI();
        this.fluxState.nodeIdCounter = data.counter || 0;
        this.fluxState.connections = data.connections || [];

        // Recreate nodes
        data.nodes.forEach(n => {
          const node = this.fluxCreateNode(n.type, n.x, n.y, n.isIcon ? n.iconClass : '', false); // Pass false to skip auto-save during load
          node.id = n.id;
          if (n.text) node.querySelector('.content').innerText = n.text;
        });

        // Recreate connections
        data.connections.forEach(c => this.fluxRenderConnection(c));
        console.log('[Fluxograma] Loaded from cloud');
        this.fluxFitView(); // Fit view after loading
      }

    } catch (e) {
      console.error('Error loading fluxograma:', e);
    }
  },

  fluxClearWorkspaceUI() {
    document.getElementById('flux-nodes-layer').innerHTML = '';
    document.getElementById('flux-connections-layer').innerHTML = '';
    this.fluxEnsureMarker();
    this.fluxState.connections = [];
    this.fluxSetPan(0, 0); // Reset pan on clear
    this.fluxSetZoom(1); // Reset zoom on clear
  },

  async fluxGenerateFromAI() {
    const prompt = document.getElementById('flux-ai-prompt').value.trim();
    if (!prompt) {
      NexusApp?.showToast?.('Por favor, descreva o processo.', 'error');
      return;
    }

    const loading = document.getElementById('flux-ai-loading');
    const btn = document.getElementById('btn-flux-generate-ai');
    loading.style.display = 'block';
    btn.disabled = true;

    try {
      // Clear canvas
      document.getElementById('flux-nodes-layer').innerHTML = '';
      document.getElementById('flux-connections-layer').innerHTML = '';
      this.fluxEnsureMarker();
      this.fluxState.connections = [];
      this.fluxState.nodeIdCounter = 0;

      const systemPrompt = `
        You are a flowchart assistant. Convert the user's description into a JSON structure.
        IMPORTANT: Write ALL labels in Portuguese (PT-BR).
        
        Supported Node Types: "start", "end", "process", "decision", "io", "document", "database", "email", "whatsapp", "user", "server", "phone", "alert", "gear", "folder", "chat", "money", "timer", "check".
        
        Rules:
        1. "start" and "end" are type "start". Use "Início" and "Fim" as labels.
        2. "decision" nodes must have "?" at the end of the label.
        3. CRITICAL: Place nodes in a VERTICAL column (x=0 for main flow). Only use x>0 for branches (e.g. "Não" paths).
        4. Space nodes incrementally: y=0, y=1, y=2, etc.
        5. For decisions: the "Sim" path continues DOWN (same x), the "Não" path goes RIGHT (x+1, same y or y+1).
        6. MANDATORY: Connections from decision nodes MUST have a "label" field: "Sim" or "Não".
        7. Use short, clear labels (max 4 words per node).
        8. Return ONLY the JSON object. No markdown.
        
        Output Format:
        {
            "nodes": [
                { "id": "1", "type": "start", "label": "Início", "x": 0, "y": 0 },
                { "id": "2", "type": "process", "label": "Etapa 1", "x": 0, "y": 1 },
                { "id": "3", "type": "decision", "label": "Aprovado?", "x": 0, "y": 2 },
                { "id": "4", "type": "process", "label": "Executar", "x": 0, "y": 3 },
                { "id": "5", "type": "process", "label": "Corrigir", "x": 1, "y": 2 }
            ],
            "connections": [
                { "source": "1", "target": "2", "label": "" },
                { "source": "2", "target": "3", "label": "" },
                { "source": "3", "target": "4", "label": "Sim" },
                { "source": "3", "target": "5", "label": "Não" },
                { "source": "5", "target": "2", "label": "" }
            ]
        }
      `;

      const GEMINI_KEY = window.getGeminiApiKey ? window.getGeminiApiKey() : '';
      const fullPrompt = systemPrompt + '\n\nCreate a flowchart for: ' + prompt;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 4000 }
          })
        }
      );

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      let content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      content = content.replace(/```json/g, '').replace(/```/g, '').trim();

      const flowData = JSON.parse(content);
      this.fluxRenderAIData(flowData);

      this.fluxCloseAIModal();
      NexusApp?.showToast?.('Fluxograma gerado com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      NexusApp?.showToast?.('Erro ao gerar fluxograma: ' + error.message, 'error');
    } finally {
      loading.style.display = 'none';
      btn.disabled = false;
    }
  },

  fluxRenderAIData(data) {
    const MARGIN_TOP = 60;
    const X_STEP = 280;
    const Y_STEP = 150;
    const idMap = {};

    const workspace = document.getElementById('flux-workspace');
    const wsWidth = workspace ? workspace.clientWidth : 800;

    const iconMap = {
      'email': 'fa-envelope', 'whatsapp': 'fa-whatsapp', 'user': 'fa-user',
      'server': 'fa-server', 'phone': 'fa-phone', 'alert': 'fa-triangle-exclamation',
      'gear': 'fa-gear', 'folder': 'fa-folder', 'chat': 'fa-comments',
      'money': 'fa-dollar-sign', 'timer': 'fa-clock', 'check': 'fa-check-circle'
    };

    // Passo 1: Criar todos os nós em posições provisórias
    const nodeDataMap = {};
    data.nodes.forEach(node => {
      const gx = node.x || 0, gy = node.y || 0;
      const tempX = 100 + gx * X_STEP;
      const tempY = MARGIN_TOP + gy * Y_STEP;
      const iconClass = iconMap[node.type] || '';

      const createdNode = this.fluxCreateNode(node.type, tempX, tempY, iconClass, false);
      const contentDiv = createdNode.querySelector('.content');
      if (contentDiv) contentDiv.innerText = node.label || node.text || '';
      idMap[node.id] = createdNode.id;
      nodeDataMap[node.id] = { el: createdNode, gx, gy };
    });

    // Passo 2: Medir larguras reais e centralizar por coluna
    // Agrupar nós por coluna X
    const columns = {};
    Object.values(nodeDataMap).forEach(nd => {
      if (!columns[nd.gx]) columns[nd.gx] = [];
      columns[nd.gx].push(nd);
    });

    // Para cada coluna, encontrar o centro X ideal e centralizar todos os nós
    Object.keys(columns).forEach(gxStr => {
      const gx = parseInt(gxStr);
      const colNodes = columns[gx];
      // Centro da coluna no workspace
      const colCenterX = (wsWidth / 2) - ((Object.keys(columns).length - 1) * X_STEP / 2) + gx * X_STEP;

      colNodes.forEach(nd => {
        const w = nd.el.offsetWidth || 150;
        const centeredX = colCenterX - w / 2;
        nd.el.style.left = `${Math.max(20, centeredX)}px`;
      });
    });

    // Passo 3: Criar conexões com detecção de handle
    data.connections.forEach(conn => {
      const sourceId = idMap[conn.source || conn.from];
      const targetId = idMap[conn.target || conn.to];
      if (!sourceId || !targetId) return;

      const srcNd = nodeDataMap[conn.source || conn.from];
      const tgtNd = nodeDataMap[conn.target || conn.to];
      let srcHandle = 'bottom', tgtHandle = 'top';

      if (srcNd && tgtNd) {
        const dx = tgtNd.gx - srcNd.gx;
        const dy = tgtNd.gy - srcNd.gy;
        if (dx > 0) { srcHandle = 'right'; tgtHandle = 'left'; }
        else if (dx < 0) { srcHandle = 'left'; tgtHandle = 'right'; }
        else if (dy < 0) { srcHandle = 'top'; tgtHandle = 'bottom'; }
      }

      const connObj = {
        id: `flux-conn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        sourceId, targetId, sourceHandle: srcHandle, targetHandle: tgtHandle,
        label: conn.label || ''
      };
      this.fluxState.connections.push(connObj);
      this.fluxRenderConnection(connObj);

      // Passo 4: Criar label arrastável (Sim/Não) como nó
      if (conn.label && conn.label.trim()) {
        const srcEl = document.getElementById(sourceId);
        const tgtEl = document.getElementById(targetId);
        if (srcEl && tgtEl) {
          const sx = parseFloat(srcEl.style.left) + (srcEl.offsetWidth || 100) / 2;
          const sy = parseFloat(srcEl.style.top) + (srcEl.offsetHeight || 60) / 2;
          const tx = parseFloat(tgtEl.style.left) + (tgtEl.offsetWidth || 100) / 2;
          const ty = parseFloat(tgtEl.style.top) + (tgtEl.offsetHeight || 60) / 2;
          const lx = (sx + tx) / 2 - 15;
          const ly = (sy + ty) / 2 - 10;
          const labelNode = this.fluxCreateNode('fluxlabel', lx, ly, '', false);
          const labelContent = labelNode.querySelector('.content');
          if (labelContent) labelContent.innerText = conn.label;
        }
      }
    });

    this.fluxSaveToCloud();
    this.fluxFitView();
  },

  fluxSetPan(x, y) {
    this.fluxState.panX = x;
    this.fluxState.panY = y;
    const container = document.getElementById('flux-canvas-container');
    if (container) {
      container.style.transform = `scale(${this.fluxState.zoom}) translate(${x}px, ${y}px)`;
      container.style.transformOrigin = 'top left';
    }
  },

  fluxFitView() {
    const nodes = document.querySelectorAll('.flux-node');
    if (!nodes.length) { this.fluxSetZoom(1); this.fluxSetPan(0, 0); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      const x = parseInt(n.style.left) || 0, y = parseInt(n.style.top) || 0;
      const w = n.offsetWidth || 160, h = n.offsetHeight || 60;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
    });
    const workspace = document.getElementById('flux-workspace');
    if (!workspace) return;
    const wsW = workspace.clientWidth, wsH = workspace.clientHeight;
    const contentW = maxX - minX + 100, contentH = maxY - minY + 100;
    const zoom = Math.min(wsW / contentW, wsH / contentH, 1.2);
    this.fluxSetZoom(Math.max(0.4, Math.min(zoom, 1.2)));
    this.fluxSetPan(0, 0);
  },

  // ============ 5 PORQUÊS ============
  renderCincoPortes() {
    return `
      <div class="tool-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #84cc16, #65a30d);">
            <i class="fa-solid fa-question"></i>
          </div>
          <div>
            <h2>Análise 5 Porquês</h2>
            <p>Técnica para identificar a causa raiz</p>
          </div>
        </div>
        
        <div class="porques-container">
          <div class="porques-input">
            <label>Problema inicial:</label>
            <input type="text" id="p5-problem" placeholder="Descreva o problema...">
          </div>
          
          <div class="porques-chain">
            ${[1, 2, 3, 4, 5].map(i => `
              <div class="porque-item">
                <label>Por quê ${i}?</label>
                <input type="text" id="p5-why-${i}" placeholder="Por que isso acontece...">
              </div>
            `).join('')}
          </div>
          
          <div class="porques-actions">
            <button class="tools-btn-primary" id="btn-analyze-5p"><i class="fa-solid fa-magnifying-glass"></i> Analisar</button>
            <button class="tools-btn-secondary" id="btn-export-5p"><i class="fa-solid fa-download"></i> Exportar</button>
            <button class="tools-btn-danger" id="btn-clear-5p"><i class="fa-solid fa-trash"></i> Limpar</button>
          </div>
          
          <div id="p5-result" style="display:none;"></div>
          <div id="p5-chart-container" style="display:none;">
            <canvas id="p5-chart"></canvas>
          </div>
        </div>
      </div>
    `;
  },

  analyze5Porques() {
    this.loadChartJS().then(() => {
      const problem = document.getElementById('p5-problem').value.trim();
      const whys = [1, 2, 3, 4, 5].map(i => document.getElementById(`p5-why-${i}`).value.trim()).filter(Boolean);

      if (!problem || whys.length === 0) {
        NexusApp?.showToast?.('Preencha o problema e pelo menos um porquê', 'error');
        return;
      }

      const result = document.getElementById('p5-result');
      const chartContainer = document.getElementById('p5-chart-container');
      result.style.display = 'block';
      chartContainer.style.display = 'block';

      result.innerHTML = `
        <div class="p5-result-box">
          <h4><i class="fa-solid fa-check-circle"></i> Análise Concluída</h4>
          <p><strong>Problema:</strong> ${problem}</p>
          <p><strong>Causa Raiz Identificada:</strong> ${whys[whys.length - 1]}</p>
          <p><strong>Profundidade da Análise:</strong> ${whys.length} níveis</p>
        </div>
      `;

      // Chart
      const ctx = document.getElementById('p5-chart').getContext('2d');
      if (this.p5Chart) this.p5Chart.destroy();
      this.p5Chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: whys.map((_, i) => `Por quê ${i + 1}`),
          datasets: [{
            label: 'Profundidade',
            data: whys.map((_, i) => i + 1),
            backgroundColor: ['#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444']
          }]
        },
        options: {
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: { x: { display: false } }
        }
      });
    });
  },

  clear5Porques() {
    document.getElementById('p5-problem').value = '';
    [1, 2, 3, 4, 5].forEach(i => document.getElementById(`p5-why-${i}`).value = '');
    document.getElementById('p5-result').style.display = 'none';
    document.getElementById('p5-chart-container').style.display = 'none';
    if (this.p5Chart) this.p5Chart.destroy();
  },

  export5Porques() {
    const problem = document.getElementById('p5-problem').value.trim();
    const whys = [1, 2, 3, 4, 5].map(i => document.getElementById(`p5-why-${i}`).value.trim()).filter(Boolean);

    let content = '=== ANÁLISE 5 PORQUÊS ===\n\n';
    content += `PROBLEMA: ${problem}\n\n`;
    whys.forEach((w, i) => content += `POR QUÊ ${i + 1}: ${w}\n`);
    content += `\nCAUSA RAIZ: ${whys[whys.length - 1] || 'Não identificada'}\n`;
    content += `\nExportado em: ${new Date().toLocaleString('pt-BR')}`;
    this.downloadText(content, '5_porques.txt');
    NexusApp?.showToast?.('5 Porquês exportado!', 'success');
  },

  // ============ CARTA DE CONTROLE ============
  renderCartaControle() {
    return `
      <div class="tool-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #6366f1, #4f46e5);">
            <i class="fa-solid fa-chart-line"></i>
          </div>
          <div>
            <h2>Carta de Controle</h2>
            <p>Controle Estatístico de Processos (CEP)</p>
          </div>
        </div>
        
        <div class="cc-container">
          <div class="cc-input">
            <label>Dados (separados por vírgula ou quebra de linha):</label>
            <textarea id="cc-data" rows="6" placeholder="Ex: 10, 12, 11, 13, 10, 12..."></textarea>
          </div>
          
          <div class="cc-actions">
            <button class="tools-btn-primary" id="btn-calc-cc"><i class="fa-solid fa-calculator"></i> Calcular</button>
            <button class="tools-btn-secondary" id="btn-export-cc"><i class="fa-solid fa-download"></i> Exportar</button>
            <button class="tools-btn-danger" id="btn-clear-cc"><i class="fa-solid fa-trash"></i> Limpar</button>
          </div>
          
          <div id="cc-stats" style="display:none;"></div>
          <div id="cc-chart-container" style="display:none;">
            <canvas id="cc-chart"></canvas>
          </div>
        </div>
      </div>
    `;
  },

  calcCartaControle() {
    this.loadChartJS().then(() => {
      const raw = document.getElementById('cc-data').value;
      const data = raw.split(/[,\n]/).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));

      if (data.length < 5) {
        NexusApp?.showToast?.('Insira pelo menos 5 valores', 'error');
        return;
      }

      const mean = data.reduce((a, b) => a + b, 0) / data.length;
      const std = Math.sqrt(data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length);
      const ucl = mean + 3 * std;
      const lcl = mean - 3 * std;

      const outOfControl = data.filter(v => v > ucl || v < lcl).length;

      document.getElementById('cc-stats').style.display = 'block';
      document.getElementById('cc-stats').innerHTML = `
        <div class="cc-stats-grid">
          <div class="cc-stat"><span>Média</span><strong>${mean.toFixed(2)}</strong></div>
          <div class="cc-stat"><span>Desvio Padrão</span><strong>${std.toFixed(2)}</strong></div>
          <div class="cc-stat"><span>LSC (3σ)</span><strong>${ucl.toFixed(2)}</strong></div>
          <div class="cc-stat"><span>LIC (3σ)</span><strong>${lcl.toFixed(2)}</strong></div>
          <div class="cc-stat ${outOfControl > 0 ? 'cc-danger' : 'cc-ok'}">
            <span>Fora de Controle</span><strong>${outOfControl} pontos</strong>
          </div>
        </div>
      `;

      document.getElementById('cc-chart-container').style.display = 'block';
      const ctx = document.getElementById('cc-chart').getContext('2d');
      if (this.ccChart) this.ccChart.destroy();

      this.ccChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map((_, i) => `${i + 1}`),
          datasets: [
            { label: 'Valores', data: data, borderColor: '#3b82f6', backgroundColor: 'transparent', tension: 0.1, pointRadius: 5 },
            { label: 'Média', data: Array(data.length).fill(mean), borderColor: '#22c55e', borderDash: [5, 5], pointRadius: 0 },
            { label: 'LSC', data: Array(data.length).fill(ucl), borderColor: '#ef4444', borderDash: [5, 5], pointRadius: 0 },
            { label: 'LIC', data: Array(data.length).fill(lcl), borderColor: '#ef4444', borderDash: [5, 5], pointRadius: 0 }
          ]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    });
  },

  clearCartaControle() {
    document.getElementById('cc-data').value = '';
    document.getElementById('cc-stats').style.display = 'none';
    document.getElementById('cc-chart-container').style.display = 'none';
    if (this.ccChart) this.ccChart.destroy();
  },

  exportCartaControle() {
    const canvas = document.getElementById('cc-chart');
    if (!canvas) { NexusApp?.showToast?.('Calcule a carta primeiro', 'error'); return; }

    const link = document.createElement('a');
    link.download = 'carta_controle.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    NexusApp?.showToast?.('Carta exportada!', 'success');
  },

  // ============ GERADOR DE GRÁFICOS (ADVANCED ENGINE) ============
  renderGeradorGraficos() {
    // Initial load of dependencies
    if (window.NexusChartEngine && !this.chartEngine) {
      this.chartEngine = new NexusChartEngine('ace-chart-container');
    }

    return `
      <div class="tool-container ace-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #f97316, #ea580c);">
            <i class="fa-solid fa-chart-pie"></i>
          </div>
          <div>
            <h2>Advanced Chart Engine</h2>
            <p>Motor analítico de alta performance para visualização de dados corporativos</p>
          </div>
        </div>
        
        <div class="ace-layout">
            <!-- Sidebar Controls -->
            <aside class="ace-sidebar">
                <div class="ace-section">
                    <h4><i class="fa-solid fa-database"></i> Dados</h4>
                    <div class="ace-data-source">
                        <button class="ace-btn-source active" onclick="NexusTools.setAceSource('manual')">Manual</button>
                        <button class="ace-btn-source" onclick="NexusTools.setAceSource('upload')">Upload</button>
                    </div>
                    
                    <div id="ace-input-manual">
                        <textarea id="ace-manual-data" class="ace-textarea" placeholder="Cole seus dados aqui (Excel, CSV)...&#10;Ex:&#10;Mês, Vendas, Metas&#10;Jan, 100, 90&#10;Fev, 120, 95"></textarea>
                        <div class="ace-helper">Separe por tab, vírgula ou ponto-e-vírgula.</div>
                        <button class="ace-btn-process" onclick="NexusTools.processAceData()">Processar Dados</button>
                    </div>

                    <div id="ace-input-upload" style="display:none;">
                         <div class="upload-area" id="ace-upload-area">
                            <i class="fa-solid fa-cloud-arrow-up"></i>
                            <p>Arraste Excel (.xlsx) ou CSV</p>
                            <input type="file" id="ace-file-input" accept=".xlsx, .xls, .csv" hidden>
                        </div>
                    </div>
                </div>

                <div class="ace-section" id="ace-controls" style="opacity: 0.5; pointer-events: none;">
                    <h4><i class="fa-solid fa-paintbrush"></i> Configuração</h4>
                    
                    <div class="ace-group">
                        <label>Tipo de Gráfico</label>
                        <select id="ace-type" class="ace-select" onchange="NexusTools.updateAceConfig()">
                            <option value="bar">📊 Barras</option>
                            <option value="line">📈 Linhas</option>
                            <option value="area">🗻 Área</option>
                            <option value="pie">🥧 Pizza</option>
                            <option value="donut">🍩 Rosca</option>
                            <option value="scatter">💠 Dispersão</option>
                            <option value="radar">🕸️ Radar</option>
                        </select>
                    </div>

                    <div class="ace-group">
                        <label>Eixo X (Categoria)</label>
                        <select id="ace-axis-x" class="ace-select" onchange="NexusTools.updateAceConfig()"></select>
                    </div>

                    <div class="ace-group">
                        <label>Eixo Y (Valores)</label>
                        <select id="ace-axis-y" class="ace-select" onchange="NexusTools.updateAceConfig()"></select>
                    </div>

                    <div class="ace-group">
                        <label>Orientação</label>
                        <div class="ace-toggles">
                            <label><input type="radio" name="ace-orient" value="v" checked onchange="NexusTools.updateAceConfig()"> Vertical</label>
                            <label><input type="radio" name="ace-orient" value="h" onchange="NexusTools.updateAceConfig()"> Horizontal</label>
                        </div>
                    </div>

                    <hr class="ace-divider">

                    <h4><i class="fa-solid fa-magnifying-glass-chart"></i> Análise</h4>
                    <div class="ace-checkboxes">
                        <label><input type="checkbox" id="ace-avg" onchange="NexusTools.updateAceConfig()"> Linha Média</label>
                        <label><input type="checkbox" id="ace-trend" onchange="NexusTools.updateAceConfig()"> Tendência</label>
                    </div>
                </div>

                <div class="ace-section">
                    <h4><i class="fa-solid fa-download"></i> Exportar</h4>
                    <div class="ace-actions">
                        <button class="tools-btn-secondary" onclick="NexusTools.exportAceChart('png')">PNG</button>
                        <button class="tools-btn-secondary" onclick="NexusTools.exportAceChart('svg')">SVG</button>
                        <button class="tools-btn-secondary" onclick="NexusTools.exportAceChart('pdf')">PDF</button>
                    </div>
                </div>
            </aside>

            <!-- Main Chart Area -->
            <main class="ace-workspace">
                <div class="ace-toolbar">
                    <input type="text" id="ace-title" class="ace-title-input" placeholder="Título do Gráfico" onchange="NexusTools.updateAceConfig()">
                    <div class="ace-theme-switch">
                        <button class="active" onclick="NexusTools.setAceTheme('dark')">Dark</button>
                        <button onclick="NexusTools.setAceTheme('light')">Light</button>
                        <button onclick="NexusTools.setAceTheme('corporate')">Corp</button>
                    </div>
                </div>
                
                <div id="ace-chart-container" class="ace-chart-canvas">
                    <div class="ace-placeholder">
                        <i class="fa-solid fa-chart-simple"></i>
                        <p>Aguardando dados...</p>
                    </div>
                </div>

                <div id="ace-insights" class="ace-insights-panel"></div>
            </main>
        </div>
      </div>
    `;
  },

  // ===== ACE LOGIC =====
  setAceSource(source) {
    document.getElementById('ace-input-manual').style.display = source === 'manual' ? 'block' : 'none';
    document.getElementById('ace-input-upload').style.display = source === 'upload' ? 'block' : 'none';
    document.querySelectorAll('.ace-btn-source').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
  },

  setAceTheme(theme) {
    if (!this.chartEngine) return;
    this.chartEngine.config.theme = theme;
    this.chartEngine.render();

    // Update UI buttons
    const buttons = document.querySelectorAll('.ace-theme-switch button');
    buttons.forEach(b => {
      b.classList.toggle('active', b.textContent.toLowerCase() === theme || (theme === 'corporate' && b.textContent === 'Corp'));
    });
  },

  processAceData() {
    if (!this.chartEngine) this.chartEngine = new NexusChartEngine('ace-chart-container');

    const raw = document.getElementById('ace-manual-data').value;
    if (!raw) { NexusApp?.showToast?.('Insira dados para processar', 'error'); return; }

    const result = this.chartEngine.processInput(raw);
    if (result.success) {
      this.activateAceControls(result.headers);
    } else {
      NexusApp?.showToast?.('Erro ao processar dados: ' + result.error, 'error');
    }
  },

  activateAceControls(headers) {
    const controls = document.getElementById('ace-controls');
    controls.style.opacity = '1';
    controls.style.pointerEvents = 'all';

    // Populate Selects
    const xSelect = document.getElementById('ace-axis-x');
    const ySelect = document.getElementById('ace-axis-y');
    xSelect.innerHTML = '';
    ySelect.innerHTML = '';

    headers.forEach(h => {
      xSelect.add(new Option(h, h));
      ySelect.add(new Option(h, h));
    });

    // Set defaults
    if (this.chartEngine.config.xAxis) xSelect.value = this.chartEngine.config.xAxis;
    if (this.chartEngine.config.yAxis) ySelect.value = this.chartEngine.config.yAxis;

    this.updateAceConfig();
    NexusApp?.showToast?.('Dados processados com sucesso!', 'success');
  },

  updateAceConfig() {
    if (!this.chartEngine) return;

    this.chartEngine.config.type = document.getElementById('ace-type').value;
    this.chartEngine.config.xAxis = document.getElementById('ace-axis-x').value;
    this.chartEngine.config.yAxis = document.getElementById('ace-axis-y').value;
    this.chartEngine.config.title = document.getElementById('ace-title').value;
    this.chartEngine.config.orientation = document.querySelector('input[name="ace-orient"]:checked').value;
    this.chartEngine.config.showAverage = document.getElementById('ace-avg').checked;
    this.chartEngine.config.showTrendline = document.getElementById('ace-trend').checked;

    this.chartEngine.render();

    // Update Insights
    document.getElementById('ace-insights').innerHTML = this.chartEngine.generateInsight();
  },

  exportAceChart(format) {
    if (this.chartEngine) {
      this.chartEngine.exportImage(format, 3); // High Res
      NexusApp?.showToast?.('Exportação iniciada...', 'info');
    }
  },

  // File Upload Handling
  handleAceUpload(file) {
    if (!this.chartEngine) this.chartEngine = new NexusChartEngine('ace-chart-container');
    this.chartEngine.processFile(file).then(result => {
      this.activateAceControls(result.headers);
    }).catch(err => {
      console.error(err);
      NexusApp?.showToast?.('Erro ao ler arquivo', 'error');
    });
  },

  generateChart() {
    this.loadChartJS().then(() => {
      const type = document.getElementById('cg-type').value;
      const title = document.getElementById('cg-title').value || 'Gráfico';
      const labelsRaw = document.getElementById('cg-labels').value;
      const valuesRaw = document.getElementById('cg-values').value;

      const labels = labelsRaw.split(',').map(l => l.trim()).filter(Boolean);
      const values = valuesRaw.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));

      if (labels.length === 0 || values.length === 0) {
        NexusApp?.showToast?.('Preencha rótulos e valores', 'error');
        return;
      }

      const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

      document.getElementById('cg-chart-container').style.display = 'block';
      const ctx = document.getElementById('cg-chart').getContext('2d');
      if (this.cgChart) this.cgChart.destroy();

      this.cgChart = new Chart(ctx, {
        type: type,
        data: {
          labels: labels,
          datasets: [{
            label: title,
            data: values,
            backgroundColor: colors.slice(0, values.length),
            borderColor: type === 'line' ? '#3b82f6' : colors.slice(0, values.length),
            borderWidth: 2,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: title, font: { size: 18 } },
            legend: { display: ['pie', 'doughnut', 'polarArea'].includes(type), position: 'bottom' }
          }
        }
      });
    });
  },

  exportChart() {
    const canvas = document.getElementById('cg-chart');
    if (!canvas) { NexusApp?.showToast?.('Gere o gráfico primeiro', 'error'); return; }

    const link = document.createElement('a');
    link.download = 'grafico_' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    NexusApp?.showToast?.('Gráfico exportado!', 'success');
  },

  clearChart() {
    document.getElementById('cg-title').value = '';
    document.getElementById('cg-labels').value = '';
    document.getElementById('cg-values').value = '';
    document.getElementById('cg-chart-container').style.display = 'none';
    if (this.cgChart) this.cgChart.destroy();
  },

  loadChartJS() {
    return new Promise((resolve) => {
      if (typeof Chart !== 'undefined') { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = resolve;
      document.head.appendChild(script);
    });
  },

  // ============ CORRELAÇÃO LOGIC ============
  processCorrelationFile(file) {
    document.getElementById('corr-file-name').textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Verificar se XLSX está disponível
        if (typeof XLSX === 'undefined') {
          this.loadScript('https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js', () => {
            this.parseExcelData(e.target.result);
          });
        } else {
          this.parseExcelData(e.target.result);
        }
      } catch (err) {
        console.error(err);
        NexusApp?.showToast?.('Erro ao processar arquivo', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  },

  loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    document.head.appendChild(script);
  },

  parseExcelData(data) {
    const uint8 = new Uint8Array(data);
    const workbook = XLSX.read(uint8, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });

    if (json.length < 2) {
      NexusApp?.showToast?.('Dados insuficientes', 'error');
      return;
    }

    const allHeaders = Object.keys(json[0]);
    const numHeaders = allHeaders.filter((col, idx) => {
      if (idx === 0) return false;
      return json.slice(0, 10).some(r => !isNaN(parseFloat((r[col] + '').replace(',', '.'))));
    });

    const parseNum = v => parseFloat(String(v).replace(',', '.'));
    const cols = numHeaders.map(h => json.map(r => parseNum(r[h])).filter(n => !isNaN(n)));

    this.correlationData.headers = numHeaders;
    this.correlationData.columns = cols;

    // Calculate matrix
    let matrix = [];
    for (let i = 0; i < numHeaders.length; i++) {
      let row = [];
      for (let j = 0; j < numHeaders.length; j++) {
        let xi = cols[i], yj = cols[j];
        let minLen = Math.min(xi.length, yj.length);
        let corr = (i === j) ? 1 : this.sampleCorrelation(xi.slice(0, minLen), yj.slice(0, minLen));
        row.push(corr);
      }
      matrix.push(row);
    }
    this.correlationData.matrix = matrix;

    this.renderCorrelationMatrix(numHeaders, matrix);
  },

  sampleCorrelation(x, y) {
    const n = x.length;
    if (n < 2) return 0;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX, dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    return num / Math.sqrt(denX * denY) || 0;
  },

  renderCorrelationMatrix(headers, matrix) {
    let html = '<table class="corr-table"><tr><th></th>';
    headers.forEach(h => html += `<th>${h}</th>`);
    html += '</tr>';

    for (let i = 0; i < headers.length; i++) {
      html += `<tr><th>${headers[i]}</th>`;
      for (let j = 0; j < headers.length; j++) {
        const val = matrix[i][j];
        let cls = 'corr-weak';
        if (i === j) cls = 'corr-diagonal';
        else if (val >= 0.7) cls = 'corr-strong';
        else if (val <= -0.7) cls = 'corr-inverse';
        else if (Math.abs(val) >= 0.3) cls = 'corr-moderate';
        html += `<td class="${cls}" onclick="NexusTools.showCorrelationChart(${i}, ${j})">${val.toFixed(2)}</td>`;
      }
      html += '</tr>';
    }
    html += '</table>';

    document.getElementById('corr-matrix-container').style.display = 'block';
    document.getElementById('corr-matrix').innerHTML = html;
  },

  showCorrelationChart(i, j) {
    if (i === j) return;

    const container = document.getElementById('corr-chart-container');
    const insightsContainer = document.getElementById('corr-insights');
    container.style.display = 'block';
    insightsContainer.style.display = 'block';

    const xData = this.correlationData.columns[j];
    const yData = this.correlationData.columns[i];
    const xName = this.correlationData.headers[j];
    const yName = this.correlationData.headers[i];
    const corr = this.correlationData.matrix[i][j];

    // Verificar se Plotly está disponível
    if (typeof Plotly === 'undefined') {
      this.loadScript('https://cdn.plot.ly/plotly-latest.min.js', () => {
        this.drawPlotlyChart(xData, yData, xName, yName, corr);
      });
    } else {
      this.drawPlotlyChart(xData, yData, xName, yName, corr);
    }
  },

  drawPlotlyChart(xData, yData, xName, yName, corr) {
    // Calculate regression
    const dataPoints = xData.map((val, idx) => [val, yData[idx]]);
    const n = dataPoints.length;
    const sumX = xData.reduce((a, b) => a + b, 0);
    const sumY = yData.reduce((a, b) => a + b, 0);
    const sumXY = dataPoints.reduce((a, p) => a + p[0] * p[1], 0);
    const sumX2 = xData.reduce((a, x) => a + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const xMin = Math.min(...xData), xMax = Math.max(...xData);
    const trendX = [xMin, xMax];
    const trendY = [slope * xMin + intercept, slope * xMax + intercept];

    const scatter = { x: xData, y: yData, mode: 'markers', type: 'scatter', name: 'Dados', marker: { color: '#6366f1', size: 8 } };
    const trend = { x: trendX, y: trendY, mode: 'lines', type: 'scatter', name: 'Tendência', line: { color: '#ef4444', width: 2 } };

    const layout = {
      title: `${yName} vs ${xName}`,
      xaxis: { title: xName },
      yaxis: { title: yName },
      showlegend: true,
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'rgba(30,41,59,0.5)',
      font: { color: '#e2e8f0' }
    };

    Plotly.newPlot('corr-plot', [scatter, trend], layout, { responsive: true });

    // Insights
    const absCorr = Math.abs(corr);
    let forca = absCorr >= 0.7 ? 'forte' : absCorr >= 0.3 ? 'moderada' : 'fraca';
    let direcao = corr > 0 ? 'direta' : 'inversa';

    document.getElementById('corr-insights').innerHTML = `
      <h4>Análise da Relação</h4>
      <p>A correlação entre <strong>${yName}</strong> e <strong>${xName}</strong> é <strong>${forca}</strong> e <strong>${direcao}</strong> (r = ${corr.toFixed(2)}).</p>
      ${absCorr >= 0.5 ? '<p>⚠️ <strong>Ação recomendada:</strong> Investigue a relação de causa-efeito.</p>' : ''}
    `;

    container.scrollIntoView({ behavior: 'smooth' });
  },

  // ============ FACTIBILIDADE LOGIC ============
  calcFactibilidade() {
    const baseline = parseFloat(document.getElementById('fact-baseline').value);
    const meta = parseFloat(document.getElementById('fact-meta').value);
    const desvio = parseFloat(document.getElementById('fact-desvio').value);
    const prazo = parseInt(document.getElementById('fact-prazo').value);

    if (isNaN(baseline) || isNaN(meta) || isNaN(desvio) || isNaN(prazo)) {
      NexusApp?.showToast?.('Preencha todos os campos', 'error');
      return;
    }

    const gap = Math.abs(meta - baseline);
    const melhoriaMensal = gap / prazo;
    const desviosNecessarios = gap / desvio;

    let classificacao, classe;
    if (desviosNecessarios <= 1) {
      classificacao = 'ALTA - Meta conservadora, facilmente atingível';
      classe = 'fact-high';
    } else if (desviosNecessarios <= 2) {
      classificacao = 'MÉDIA - Meta desafiadora mas realista';
      classe = 'fact-medium';
    } else if (desviosNecessarios <= 3) {
      classificacao = 'BAIXA - Meta agressiva, requer esforço significativo';
      classe = 'fact-low';
    } else {
      classificacao = 'MUITO BAIXA - Meta provavelmente inatingível';
      classe = 'fact-very-low';
    }

    const probabilidade = Math.max(0, Math.min(100, 100 - (desviosNecessarios - 1) * 25));

    document.getElementById('fact-result').style.display = 'block';
    document.getElementById('fact-result').innerHTML = `
      <div class="fact-result-header ${classe}">
        <h3>Factibilidade: ${classificacao.split(' - ')[0]}</h3>
        <div class="fact-prob">${probabilidade.toFixed(0)}%</div>
      </div>
      <div class="fact-details">
        <p><strong>Gap a superar:</strong> ${gap.toFixed(1)} pontos percentuais</p>
        <p><strong>Melhoria mensal necessária:</strong> ${melhoriaMensal.toFixed(2)} p.p./mês</p>
        <p><strong>Desvios padrão do gap:</strong> ${desviosNecessarios.toFixed(2)}σ</p>
        <p class="fact-desc">${classificacao.split(' - ')[1]}</p>
      </div>
    `;
  },

  // ============ SENHA LOGIC ============
  generatePassword() {
    const length = parseInt(document.getElementById('pwd-length').value);
    const useUpper = document.getElementById('pwd-upper').checked;
    const useLower = document.getElementById('pwd-lower').checked;
    const useNumbers = document.getElementById('pwd-numbers').checked;
    const useSymbols = document.getElementById('pwd-symbols').checked;

    let chars = '';
    if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (useNumbers) chars += '0123456789';
    if (useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) {
      NexusApp?.showToast?.('Selecione ao menos uma opção', 'error');
      return;
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    document.getElementById('pwd-result').value = password;
    this.showPasswordStrength(password);
  },

  showPasswordStrength(pwd) {
    let score = 0;
    if (pwd.length >= 12) score++;
    if (pwd.length >= 16) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    const labels = ['Muito Fraca', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Muito Forte'];
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981'];

    document.getElementById('pwd-strength').innerHTML = `
      <div class="pwd-strength-bar">
        <div class="pwd-strength-fill" style="width: ${(score / 6) * 100}%; background: ${colors[score - 1] || '#64748b'};"></div>
      </div>
      <span style="color: ${colors[score - 1] || '#64748b'};">${labels[score - 1] || 'N/A'}</span>
    `;
  },

  copyPassword() {
    const pwd = document.getElementById('pwd-result').value;
    navigator.clipboard.writeText(pwd);
    NexusApp?.showToast?.('Senha copiada!', 'success');
  },

  // ============ PDCA LOGIC ============
  loadPDCA() {
    const saved = localStorage.getItem('nexus_pdca');
    this.pdcaData = saved ? JSON.parse(saved) : { plan: [], do: [], check: [], act: [] };
  },

  savePDCA() {
    localStorage.setItem('nexus_pdca', JSON.stringify(this.pdcaData));
  },

  addPDCAItem(phase) {
    const input = document.getElementById(`pdca-input-${phase}`);
    const value = input.value.trim();
    if (!value) return;

    this.pdcaData[phase] = this.pdcaData[phase] || [];
    this.pdcaData[phase].push(value);
    this.savePDCA();
    this.render(document.getElementById('page-content'));
    NexusApp?.showToast?.('Item adicionado!', 'success');
  },

  removePDCAItem(phase, idx) {
    this.pdcaData[phase].splice(idx, 1);
    this.savePDCA();
    this.render(document.getElementById('page-content'));
  },

  exportPDCA() {
    let content = '=== CICLO PDCA ===\n\n';
    ['plan', 'do', 'check', 'act'].forEach(phase => {
      content += `[${phase.toUpperCase()}]\n`;
      (this.pdcaData[phase] || []).forEach((item, i) => content += `  ${i + 1}. ${item}\n`);
      content += '\n';
    });
    content += `\nExportado em: ${new Date().toLocaleString('pt-BR')}`;

    this.downloadText(content, 'pdca_export.txt');
    NexusApp?.showToast?.('PDCA exportado!', 'success');
  },

  clearPDCA() {
    if (confirm('Limpar todo o PDCA?')) {
      this.pdcaData = { plan: [], do: [], check: [], act: [] };
      this.savePDCA();
      this.render(document.getElementById('page-content'));
    }
  },

  // ============ DMAIC LOGIC ============
  loadDMAIC() {
    const saved = localStorage.getItem('nexus_dmaic');
    this.dmaicData = saved ? JSON.parse(saved) : { define: '', measure: '', analyze: '', improve: '', control: '' };
  },

  saveDMAIC() {
    ['define', 'measure', 'analyze', 'improve', 'control'].forEach(key => {
      this.dmaicData[key] = document.getElementById(`dmaic-${key}`)?.value || '';
    });
    localStorage.setItem('nexus_dmaic', JSON.stringify(this.dmaicData));
    NexusApp?.showToast?.('DMAIC salvo!', 'success');
  },

  exportDMAIC() {
    this.saveDMAIC();
    let content = '=== DMAIC - SIX SIGMA ===\n\n';
    const labels = { define: 'DEFINE', measure: 'MEASURE', analyze: 'ANALYZE', improve: 'IMPROVE', control: 'CONTROL' };
    Object.keys(labels).forEach(key => {
      content += `[${labels[key]}]\n${this.dmaicData[key] || '(vazio)'}\n\n`;
    });
    content += `\nExportado em: ${new Date().toLocaleString('pt-BR')}`;

    this.downloadText(content, 'dmaic_export.txt');
    NexusApp?.showToast?.('DMAIC exportado!', 'success');
  },

  clearDMAIC() {
    if (confirm('Limpar todo o DMAIC?')) {
      this.dmaicData = { define: '', measure: '', analyze: '', improve: '', control: '' };
      localStorage.setItem('nexus_dmaic', JSON.stringify(this.dmaicData));
      this.render(document.getElementById('page-content'));
    }
  },

  downloadText(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  },

  // ============ COMPRESSOR DE VÍDEO ============
  renderCompressor() {
    return `
      <div class="tool-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #ec4899, #be185d);">
            <i class="fa-solid fa-video"></i>
          </div>
          <div>
            <h2>Compressor de Vídeo</h2>
            <p>Reduza o tamanho de vídeos mantendo qualidade aceitável</p>
          </div>
        </div>
        
        <div class="upload-area" id="video-upload-area">
          <i class="fa-solid fa-film"></i>
          <p>Arraste um vídeo aqui ou clique para selecionar</p>
          <input type="file" id="video-input" accept="video/*" hidden>
          <span id="video-file-name"></span>
        </div>
        
        <div id="video-preview-container" style="display: none;">
          <video id="video-preview" controls style="max-width: 100%; max-height: 300px; border-radius: 8px;"></video>
          <div class="video-info" id="video-info"></div>
        </div>
        
        <div class="compressor-options" style="margin: 20px 0;">
          <label>Qualidade de Compressão:</label>
          <div class="quality-options">
            <label><input type="radio" name="quality" value="high" checked> Alta (75%)</label>
            <label><input type="radio" name="quality" value="medium"> Média (50%)</label>
            <label><input type="radio" name="quality" value="low"> Baixa (25%)</label>
          </div>
        </div>
        
        <div class="compressor-info">
          <p><i class="fa-solid fa-info-circle"></i> <strong>Nota:</strong> A compressão no navegador tem limitações. Para vídeos grandes, recomendamos ferramentas desktop como HandBrake.</p>
        </div>
        
        <button class="tools-btn-primary" id="btn-compress" disabled>
          <i class="fa-solid fa-compress"></i> Comprimir Vídeo
        </button>
        
        <div id="compress-progress" style="display: none;">
          <div class="progress-bar"><div class="progress-fill" id="compress-progress-fill"></div></div>
          <span id="compress-status">Processando...</span>
        </div>
        
        <div id="compress-result" style="display: none;"></div>
      </div>
    `;
  },

  // ============ DIAGRAMA DE PARETO ============
  paretoData: [],

  renderPareto() {
    return `
      <div class="tool-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #14b8a6, #0d9488);">
            <i class="fa-solid fa-chart-bar"></i>
          </div>
          <div>
            <h2>Diagrama de Pareto</h2>
            <p>Análise 80/20 para identificar os problemas mais impactantes</p>
          </div>
        </div>
        
        <div class="pareto-input-section">
          <h4>Adicionar Categoria</h4>
          <div class="pareto-add-row">
            <input type="text" id="pareto-cat" placeholder="Nome da categoria (ex: Erro de Sistema)">
            <input type="number" id="pareto-val" placeholder="Quantidade">
            <button class="tools-btn-primary" id="btn-add-pareto"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>
        
        <div id="pareto-list" class="pareto-list"></div>
        
        <div id="pareto-chart-container" style="display: none;">
          <h3>Diagrama de Pareto</h3>
          <canvas id="pareto-chart" height="300"></canvas>
          <div id="pareto-insights" class="pareto-insights"></div>
        </div>
        
        <div class="pareto-actions">
          <button class="tools-btn-secondary" id="btn-gen-pareto" disabled><i class="fa-solid fa-chart-bar"></i> Gerar Pareto</button>
          <button class="tools-btn-danger" id="btn-clear-pareto"><i class="fa-solid fa-trash"></i> Limpar</button>
        </div>
      </div>
    `;
  },

  // ============ DIAGRAMA DE ISHIKAWA ============
  ishikawaData: { problem: '', causes: { metodo: [], maquina: [], maoDeObra: [], material: [], medicao: [], meioAmbiente: [] } },

  renderIshikawa() {
    this.loadIshikawa();
    const categories = [
      { key: 'metodo', label: 'Método', icon: 'fa-route', color: '#3b82f6' },
      { key: 'maquina', label: 'Máquina', icon: 'fa-gears', color: '#22c55e' },
      { key: 'maoDeObra', label: 'Mão de Obra', icon: 'fa-users', color: '#f59e0b' },
      { key: 'material', label: 'Material', icon: 'fa-boxes-stacked', color: '#ef4444' },
      { key: 'medicao', label: 'Medição', icon: 'fa-ruler', color: '#8b5cf6' },
      { key: 'meioAmbiente', label: 'Meio Ambiente', icon: 'fa-leaf', color: '#14b8a6' }
    ];

    return `
      <div class="tool-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #0ea5e9, #0284c7);">
            <i class="fa-solid fa-fish"></i>
          </div>
          <div>
            <h2>Diagrama de Ishikawa (Espinha de Peixe)</h2>
            <p>Análise de causa raiz usando os 6M</p>
          </div>
        </div>
        
        <div class="ishikawa-problem">
          <label>Problema/Efeito a ser analisado:</label>
          <input type="text" id="ishikawa-problem" placeholder="Ex: Alta taxa de rechamada" value="${this.ishikawaData.problem || ''}">
        </div>
        
        <div class="ishikawa-grid">
          ${categories.map(cat => `
            <div class="ishikawa-category" style="border-color: ${cat.color};">
              <h4 style="color: ${cat.color};"><i class="fa-solid ${cat.icon}"></i> ${cat.label}</h4>
              <div class="ishikawa-causes" id="ishi-${cat.key}">
                ${(this.ishikawaData.causes[cat.key] || []).map((c, i) => `
                  <div class="ishikawa-cause">
                    <span>${c}</span>
                    <button class="ishi-rm" data-cat="${cat.key}" data-idx="${i}"><i class="fa-solid fa-times"></i></button>
                  </div>
                `).join('')}
              </div>
              <div class="ishikawa-add">
                <input type="text" id="ishi-input-${cat.key}" placeholder="Adicionar causa...">
                <button class="ishi-add-btn" data-cat="${cat.key}"><i class="fa-solid fa-plus"></i></button>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="ishikawa-actions">
          <button class="tools-btn-primary" id="btn-save-ishi"><i class="fa-solid fa-save"></i> Salvar</button>
          <button class="tools-btn-secondary" id="btn-export-ishi"><i class="fa-solid fa-download"></i> Exportar</button>
          <button class="tools-btn-danger" id="btn-clear-ishi"><i class="fa-solid fa-trash"></i> Limpar</button>
        </div>
      </div>
    `;
  },

  loadIshikawa() {
    const saved = localStorage.getItem('nexus_ishikawa');
    this.ishikawaData = saved ? JSON.parse(saved) : { problem: '', causes: { metodo: [], maquina: [], maoDeObra: [], material: [], medicao: [], meioAmbiente: [] } };
  },

  saveIshikawa() {
    this.ishikawaData.problem = document.getElementById('ishikawa-problem')?.value || '';
    localStorage.setItem('nexus_ishikawa', JSON.stringify(this.ishikawaData));
  },

  // ============ MATRIZ GUT ============
  gutData: [],

  renderGUT() {
    this.loadGUT();
    return `
      <div class="tool-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #a855f7, #7c3aed);">
            <i class="fa-solid fa-ranking-star"></i>
          </div>
          <div>
            <h2>Matriz GUT</h2>
            <p>Priorização por Gravidade × Urgência × Tendência</p>
          </div>
        </div>
        
        <div class="gut-info">
          <p><strong>Escala 1-5:</strong> 1 = Sem gravidade/urgência | 5 = Extremamente grave/urgente</p>
        </div>
        
        <div class="gut-add-row">
          <input type="text" id="gut-problem" placeholder="Descreva o problema">
          <input type="number" id="gut-g" placeholder="G" min="1" max="5">
          <input type="number" id="gut-u" placeholder="U" min="1" max="5">
          <input type="number" id="gut-t" placeholder="T" min="1" max="5">
          <button class="tools-btn-primary" id="btn-add-gut"><i class="fa-solid fa-plus"></i></button>
        </div>
        
        <div id="gut-table-container">
          <table class="gut-table">
            <thead>
              <tr>
                <th>Problema</th>
                <th>G</th>
                <th>U</th>
                <th>T</th>
                <th>GUT</th>
                <th>Prioridade</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="gut-tbody">
              ${this.gutData.sort((a, b) => b.gut - a.gut).map((item, i) => `
                <tr class="gut-row ${i === 0 ? 'gut-top' : ''}">
                  <td>${item.problem}</td>
                  <td>${item.g}</td>
                  <td>${item.u}</td>
                  <td>${item.t}</td>
                  <td class="gut-score">${item.gut}</td>
                  <td><span class="gut-priority gut-p-${this.getGUTPriority(item.gut)}">${i + 1}º</span></td>
                  <td><button class="gut-rm" data-idx="${i}"><i class="fa-solid fa-trash"></i></button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${this.gutData.length === 0 ? '<p class="gut-empty">Nenhum problema adicionado. Adicione acima para priorizar.</p>' : ''}
        </div>
        
        <div class="gut-actions">
          <button class="tools-btn-secondary" id="btn-export-gut"><i class="fa-solid fa-download"></i> Exportar</button>
          <button class="tools-btn-danger" id="btn-clear-gut"><i class="fa-solid fa-trash"></i> Limpar</button>
        </div>
      </div>
    `;
  },

  loadGUT() {
    const saved = localStorage.getItem('nexus_gut');
    this.gutData = saved ? JSON.parse(saved) : [];
  },

  saveGUT() {
    localStorage.setItem('nexus_gut', JSON.stringify(this.gutData));
  },

  getGUTPriority(score) {
    if (score >= 100) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
  },

  // ============ CRONÔMETRO/POMODORO ============
  timerInterval: null,
  timerSeconds: 0,
  timerMode: 'stopwatch', // 'stopwatch' or 'pomodoro'
  pomodoroPhase: 'work', // 'work' or 'break'
  pomodoroCount: 0,

  renderCronometro() {
    return `
      <div class="tool-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #f43f5e, #e11d48);">
            <i class="fa-solid fa-stopwatch"></i>
          </div>
          <div>
            <h2>Cronômetro / Pomodoro</h2>
            <p>Timer de produtividade com técnica Pomodoro</p>
          </div>
        </div>
        
        <div class="timer-mode-toggle">
          <button class="timer-mode-btn active" data-mode="stopwatch">Cronômetro</button>
          <button class="timer-mode-btn" data-mode="pomodoro">Pomodoro</button>
        </div>
        
        <div class="timer-display">
          <div class="timer-time" id="timer-display">00:00:00</div>
          <div class="timer-phase" id="timer-phase"></div>
        </div>
        
        <div class="timer-controls">
          <button class="timer-btn timer-btn-start" id="btn-timer-start">
            <i class="fa-solid fa-play"></i>
          </button>
          <button class="timer-btn timer-btn-pause" id="btn-timer-pause" disabled>
            <i class="fa-solid fa-pause"></i>
          </button>
          <button class="timer-btn timer-btn-reset" id="btn-timer-reset">
            <i class="fa-solid fa-rotate-left"></i>
          </button>
        </div>
        
        <div class="pomodoro-settings" id="pomodoro-settings" style="display: none;">
          <h4>Configurações Pomodoro</h4>
          <div class="pomodoro-config">
            <label>Trabalho: <input type="number" id="pomo-work" value="25" min="1" max="60"> min</label>
            <label>Pausa: <input type="number" id="pomo-break" value="5" min="1" max="30"> min</label>
          </div>
          <div class="pomodoro-stats">
            <span>🍅 Pomodoros completados: <strong id="pomo-count">0</strong></span>
          </div>
        </div>
      </div>
    `;
  },

  // ============ STYLES ============
  injectStyles() {
    if (document.getElementById('tools-styles')) return;

    const style = document.createElement('style');
    style.id = 'tools-styles';
    style.textContent = `
.tools-page { max-width: 1200px; margin: 0 auto; }
.tools-header { margin-bottom: 32px; }
.tools-header h1 { font-size: 28px; font-weight: 700; display: flex; align-items: center; gap: 12px; }
.tools-header p { color: var(--text-secondary); margin-top: 4px; }
.tools-back { background: none; border: none; color: var(--text-secondary); font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 8px 0; }
.tools-back:hover { color: var(--primary-400); }

/* Grid Menu */
.tools-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.tool-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 16px; padding: 24px; cursor: pointer; transition: all 0.3s; }
.tool-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.3); border-color: var(--primary-500); }
.tool-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; margin-bottom: 16px; }
.tool-card h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.tool-card p { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px; }
.tool-tag { font-size: 11px; background: var(--primary-500)20; color: var(--primary-400); padding: 4px 10px; border-radius: 20px; font-weight: 500; }

/* Tool Container */
.tool-container { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 16px; padding: 32px; }
.tool-title-row { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 24px; }
.tool-icon-sm { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: white; flex-shrink: 0; }
.tool-title-row h2 { font-size: 22px; font-weight: 600; margin: 0; }
.tool-title-row p { color: var(--text-secondary); font-size: 14px; margin: 4px 0 0; }

/* Buttons */
.tools-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; margin-top: 16px; }
.tools-btn-secondary { background: var(--surface-elevated); color: var(--text-primary); border: 1px solid var(--surface-border); padding: 10px 20px; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.tools-btn-danger { background: #ef444420; color: #ef4444; border: 1px solid #ef444440; padding: 10px 20px; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }

/* Upload Area */
.upload-area { border: 2px dashed var(--surface-border); border-radius: 12px; padding: 48px; text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 24px; }
.upload-area:hover, .upload-area.dragover { border-color: var(--primary-500); background: var(--primary-500)10; }
.upload-area i { font-size: 48px; color: var(--primary-400); margin-bottom: 12px; }
.upload-area p { color: var(--text-secondary); }
#corr-file-name { color: var(--primary-400); font-weight: 500; margin-top: 8px; display: block; }

/* Correlation */
.corr-info-box { background: var(--surface-elevated); border-left: 4px solid var(--primary-500); border-radius: 8px; padding: 20px; margin-bottom: 24px; }
.corr-info-box h4 { margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
.corr-info-box ul { margin: 12px 0 0; padding-left: 20px; }
.corr-info-box li { margin: 4px 0; }
.corr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.corr-table th, .corr-table td { border: 1px solid var(--surface-border); padding: 8px 12px; text-align: center; }
.corr-table th { background: var(--surface-elevated); font-weight: 600; }
.corr-table td { cursor: pointer; transition: transform 0.2s; }
.corr-table td:hover { transform: scale(1.1); z-index: 10; position: relative; }
.corr-diagonal { background: #3b82f620; color: #3b82f6; font-weight: 600; }
.corr-strong { background: #22c55e30; color: #22c55e; font-weight: 600; }
.corr-inverse { background: #ef444430; color: #ef4444; font-weight: 600; }
.corr-moderate { background: #f59e0b30; color: #f59e0b; }
.corr-weak { background: var(--surface-elevated); color: var(--text-tertiary); }
.corr-insights { background: var(--surface-elevated); border-radius: 12px; padding: 20px; margin-top: 20px; }
.corr-insights h4 { margin: 0 0 12px; color: var(--primary-400); }
#corr-matrix-container, #corr-chart-container { margin-top: 24px; }
#corr-matrix-container h3, #corr-chart-container h3 { margin-bottom: 16px; }
#corr-matrix-container small { display: block; margin-top: 12px; color: var(--text-tertiary); text-align: center; }

/* Factibilidade */
.fact-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 16px; }
.fact-input-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
.fact-input-group input { width: 100%; padding: 12px; border: 1px solid var(--surface-border); border-radius: 8px; background: var(--surface-elevated); color: var(--text-primary); font-size: 16px; }
.fact-result { margin-top: 24px; border-radius: 12px; overflow: hidden; }
.fact-result-header { padding: 20px; display: flex; justify-content: space-between; align-items: center; }
.fact-result-header h3 { margin: 0; font-size: 18px; }
.fact-prob { font-size: 32px; font-weight: 700; }
.fact-high { background: #22c55e30; color: #22c55e; }
.fact-medium { background: #f59e0b30; color: #f59e0b; }
.fact-low { background: #f9731630; color: #f97316; }
.fact-very-low { background: #ef444430; color: #ef4444; }
.fact-details { padding: 20px; background: var(--surface-elevated); }
.fact-details p { margin: 8px 0; }
.fact-desc { font-style: italic; color: var(--text-secondary); }

/* Password */
.pwd-output { display: flex; gap: 8px; margin-bottom: 24px; }
.pwd-field { flex: 1; padding: 16px; font-size: 18px; font-family: monospace; background: var(--surface-elevated); border: 1px solid var(--surface-border); border-radius: 10px; color: var(--text-primary); }
.pwd-copy { width: 56px; background: var(--primary-500); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 18px; }
.pwd-options { margin-bottom: 16px; }
.pwd-length { margin-bottom: 16px; }
.pwd-length label { display: block; margin-bottom: 8px; }
.pwd-length input[type="range"] { width: 100%; }
.pwd-checkboxes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.pwd-checkboxes label { display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--surface-elevated); border-radius: 8px; cursor: pointer; }
.pwd-strength { margin-top: 16px; }
.pwd-strength-bar { height: 8px; background: var(--surface-border); border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
.pwd-strength-fill { height: 100%; transition: width 0.3s; }

/* PDCA */
.pdca-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
.pdca-phase { background: var(--surface-elevated); border-radius: 12px; padding: 20px; min-height: 200px; }
.pdca-phase h3 { margin: 0 0 16px; font-size: 16px; }
.pdca-plan h3 { color: #3b82f6; }
.pdca-do h3 { color: #22c55e; }
.pdca-check h3 { color: #f59e0b; }
.pdca-act h3 { color: #ef4444; }
.pdca-items { min-height: 100px; }
.pdca-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--surface-card); border-radius: 6px; margin-bottom: 6px; font-size: 13px; }
.pdca-rm { background: none; border: none; color: #ef4444; cursor: pointer; opacity: 0.6; }
.pdca-rm:hover { opacity: 1; }
.pdca-add { display: flex; gap: 8px; margin-top: 12px; }
.pdca-add input { flex: 1; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: 6px; background: var(--surface-card); color: var(--text-primary); font-size: 13px; }
.pdca-add-btn { background: var(--primary-500); color: white; border: none; width: 36px; height: 36px; border-radius: 6px; cursor: pointer; }
.pdca-actions { display: flex; gap: 12px; }

/* DMAIC */
.dmaic-phases { display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px; }
.dmaic-phase { background: var(--surface-elevated); border-radius: 12px; padding: 20px; }
.dmaic-header { display: flex; align-items: center; gap: 10px; border-left: 4px solid; padding-left: 12px; margin-bottom: 8px; }
.dmaic-header h4 { margin: 0; font-size: 16px; }
.dmaic-header i { font-size: 18px; }
.dmaic-desc { font-size: 13px; color: var(--text-tertiary); margin: 0 0 12px; }
.dmaic-phase textarea { width: 100%; padding: 12px; border: 1px solid var(--surface-border); border-radius: 8px; background: var(--surface-card); color: var(--text-primary); font-size: 14px; resize: vertical; }
.dmaic-actions { display: flex; gap: 12px; }

@media (max-width: 768px) {
  .fact-grid, .pdca-grid { grid-template-columns: 1fr; }
  .pwd-checkboxes { grid-template-columns: 1fr; }
}

/* ===== COMPRESSOR ===== */
.compressor-options label { display: block; margin-bottom: 8px; font-weight: 500; }
.quality-options { display: flex; gap: 16px; flex-wrap: wrap; }
.quality-options label { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: var(--surface-elevated); border-radius: 8px; cursor: pointer; }
.compressor-info { background: #3b82f620; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; }
.compressor-info p { margin: 0; font-size: 13px; }
.compress-result-box { background: var(--surface-elevated); border-radius: 12px; padding: 20px; margin-top: 16px; }
.compress-result-box h4 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; color: var(--primary-400); }
.compress-result-box ul { margin: 8px 0 0; padding-left: 20px; }
.compress-result-box a { color: var(--primary-400); }
.video-info { margin-top: 12px; padding: 12px; background: var(--surface-elevated); border-radius: 8px; }
.progress-bar { height: 8px; background: var(--surface-border); border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
.progress-fill { height: 100%; background: var(--primary-500); transition: width 0.3s; }

/* ===== PARETO ===== */
.pareto-input-section { margin-bottom: 20px; }
.pareto-input-section h4 { margin: 0 0 12px; }
.pareto-add-row { display: flex; gap: 8px; }
.pareto-add-row input { flex: 1; padding: 10px 14px; border: 1px solid var(--surface-border); border-radius: 8px; background: var(--surface-elevated); color: var(--text-primary); }
.pareto-add-row input[type="number"] { width: 100px; flex: 0 0 auto; }
.pareto-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.pareto-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--surface-elevated); border-radius: 8px; font-size: 13px; }
.pareto-rm { background: none; border: none; color: #ef4444; cursor: pointer; opacity: 0.6; }
.pareto-rm:hover { opacity: 1; }
.pareto-actions { display: flex; gap: 12px; margin-top: 20px; }
.pareto-insights { background: var(--surface-elevated); border-radius: 12px; padding: 20px; margin-top: 20px; }
.pareto-insights h4 { margin: 0 0 12px; color: var(--primary-400); }
.pareto-insights ul { margin: 8px 0; padding-left: 20px; }
#pareto-chart-container { margin-top: 24px; }
#pareto-chart-container h3 { margin-bottom: 16px; }

/* ===== ISHIKAWA ===== */
.ishikawa-problem { margin-bottom: 24px; }
.ishikawa-problem label { display: block; font-weight: 500; margin-bottom: 8px; }
.ishikawa-problem input { width: 100%; padding: 12px; border: 1px solid var(--surface-border); border-radius: 8px; background: var(--surface-elevated); color: var(--text-primary); font-size: 16px; }
.ishikawa-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
.ishikawa-category { background: var(--surface-elevated); border-radius: 12px; padding: 16px; border-left: 4px solid; min-height: 180px; }
.ishikawa-category h4 { margin: 0 0 12px; font-size: 14px; display: flex; align-items: center; gap: 8px; }
.ishikawa-causes { min-height: 80px; }
.ishikawa-cause { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--surface-card); border-radius: 6px; margin-bottom: 6px; font-size: 12px; }
.ishi-rm { background: none; border: none; color: #ef4444; cursor: pointer; opacity: 0.6; font-size: 11px; }
.ishi-rm:hover { opacity: 1; }
.ishikawa-add { display: flex; gap: 6px; margin-top: 10px; }
.ishikawa-add input { flex: 1; padding: 6px 10px; border: 1px solid var(--surface-border); border-radius: 6px; background: var(--surface-card); color: var(--text-primary); font-size: 12px; }
.ishi-add-btn { background: var(--primary-500); color: white; border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 12px; }
.ishikawa-actions { display: flex; gap: 12px; }

/* ===== GUT ===== */
.gut-info { background: #a855f720; border-left: 4px solid #a855f7; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
.gut-info p { margin: 0; font-size: 13px; }
.gut-add-row { display: flex; gap: 8px; margin-bottom: 20px; }
.gut-add-row input { padding: 10px 14px; border: 1px solid var(--surface-border); border-radius: 8px; background: var(--surface-elevated); color: var(--text-primary); }
.gut-add-row input[type="text"] { flex: 1; }
.gut-add-row input[type="number"] { width: 60px; text-align: center; }
.gut-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.gut-table th, .gut-table td { border: 1px solid var(--surface-border); padding: 10px 12px; text-align: center; }
.gut-table th { background: var(--surface-elevated); font-weight: 600; }
.gut-table td:first-child { text-align: left; }
.gut-row { transition: background 0.2s; }
.gut-row:hover { background: var(--surface-hover); }
.gut-top { background: #a855f720; }
.gut-score { font-weight: 700; font-size: 16px; }
.gut-priority { padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 12px; }
.gut-p-critical { background: #ef444440; color: #ef4444; }
.gut-p-high { background: #f9731640; color: #f97316; }
.gut-p-medium { background: #f59e0b40; color: #f59e0b; }
.gut-p-low { background: #22c55e40; color: #22c55e; }
.gut-rm { background: none; border: none; color: #ef4444; cursor: pointer; opacity: 0.6; }
.gut-rm:hover { opacity: 1; }
.gut-empty { text-align: center; color: var(--text-tertiary); padding: 20px; }
.gut-actions { display: flex; gap: 12px; margin-top: 20px; }

/* ===== CRONÔMETRO ===== */
.timer-mode-toggle { display: flex; gap: 8px; margin-bottom: 32px; justify-content: center; }
.timer-mode-btn { padding: 10px 24px; border: 1px solid var(--surface-border); background: var(--surface-elevated); color: var(--text-secondary); border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
.timer-mode-btn.active { background: var(--primary-500); color: white; border-color: var(--primary-500); }
.timer-display { text-align: center; margin-bottom: 32px; }
.timer-time { font-size: 72px; font-weight: 700; font-family: 'Courier New', monospace; color: var(--text-primary); letter-spacing: 4px; }
.timer-phase { font-size: 18px; color: var(--primary-400); margin-top: 8px; }
.timer-controls { display: flex; gap: 16px; justify-content: center; margin-bottom: 32px; }
.timer-btn { width: 64px; height: 64px; border-radius: 50%; border: none; font-size: 24px; cursor: pointer; transition: all 0.2s; }
.timer-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.timer-btn-start { background: #22c55e; color: white; }
.timer-btn-start:hover:not(:disabled) { background: #16a34a; transform: scale(1.1); }
.timer-btn-pause { background: #f59e0b; color: white; }
.timer-btn-pause:hover:not(:disabled) { background: #d97706; transform: scale(1.1); }
.timer-btn-reset { background: var(--surface-elevated); color: var(--text-secondary); border: 1px solid var(--surface-border); }
.timer-btn-reset:hover { background: var(--surface-hover); transform: scale(1.1); }
.pomodoro-settings { background: var(--surface-elevated); border-radius: 12px; padding: 20px; text-align: center; }
.pomodoro-settings h4 { margin: 0 0 16px; }
.pomodoro-config { display: flex; gap: 24px; justify-content: center; margin-bottom: 16px; }
.pomodoro-config label { display: flex; align-items: center; gap: 8px; }
.pomodoro-config input { width: 60px; padding: 8px; text-align: center; border: 1px solid var(--surface-border); border-radius: 6px; background: var(--surface-card); color: var(--text-primary); }
.pomodoro-stats { color: var(--text-secondary); }
.pomodoro-stats strong { color: var(--primary-400); font-size: 20px; }

@media (max-width: 768px) {
  .ishikawa-grid { grid-template-columns: repeat(2, 1fr); }
  .timer-time { font-size: 48px; }
  .gut-add-row { flex-wrap: wrap; }
  .gut-add-row input[type="text"] { width: 100%; }
}
    `;
    document.head.appendChild(style);
  },

  // ============ NEP NEXUS ============
  nexusState: {
    currentView: 'MANDALA', // 'MANDALA' | 'PILLARS' | 'SIMULATOR'
    activePillarId: 1,
    simulatorIdx: 0,
    simulatorResult: null
  },

  nexusData: {
    pillars: [
      { id: 1, title: "DADOS & DIAGNÓSTICO", icon: 'database', desc: "Dashboards self-service e diagnósticos automatizados entregues na ponta.", stats: ["Automação: 98%", "Latência: <2ms", "Cobertura: 100%"] },
      { id: 2, title: "GRUPO FOCUS & ALERTAS", icon: 'target', desc: "Atuação cirúrgica em ofensores e grupos críticos (Q4 Reincidentes).", stats: ["Alertas/Dia: 450", "Precisão: High", "NCG Detect.: Active"] },
      { id: 3, title: "TERMÔMETRO", icon: 'trending-up', desc: "Acompanhamento da jornada de performance e redução de dispersão.", stats: ["Dispersão: Low", "Evolução: +15%", "Retenção: Stable"] },
      { id: 4, title: "MONITORIA (IA)", icon: 'cpu', desc: "Inteligência Artificial para insights antecipados e escalabilidade.", stats: ["Model: GPT-4o", "Speech-to-text: ON", "Sentiment: Analysing"] }
    ],
    layers: {
      l1: [
        { icon: 'database', label: "DADOS", color: "#3b82f6", targetView: 'PILLARS', targetId: 1 },
        { icon: 'target', label: "FOCUS", color: "#ef4444", targetView: 'PILLARS', targetId: 2 },
        { icon: 'activity', label: "TERMÔMETRO", color: "#22c55e", targetView: 'PILLARS', targetId: 3 },
        { icon: 'cpu', label: "MONITORIA", color: "#a855f7", targetView: 'PILLARS', targetId: 4 }
      ],
      l2: [
        { icon: 'eye', label: "MONITORAR", color: "#06b6d4" },
        { icon: 'mail', label: "SINALIZAR", color: "#06b6d4" },
        { icon: 'users', label: "RITUAIS", color: "#06b6d4" },
        { icon: 'check-square', label: "DECISÃO", color: "#06b6d4" }
      ],
      l3: [
        { icon: 'layers', label: "DASHBOARDS", color: "#64748b" },
        { icon: 'message-square', label: "ROBBYSON", color: "#ec4899" },
        { icon: 'shield', label: "NCG/ALERTAS", color: "#ef4444", targetView: 'SIMULATOR' },
        { icon: 'users', label: "TREINAMENTO", color: "#eab308" },
        { icon: 'target', label: "AUDITORIA", color: "#f97316" },
        { icon: 'check-square', label: "FEEDBACK", color: "#10b981" }
      ]
    },
    scenarios: [
      { text: "Atendente desligou a chamada na cara do cliente.", type: "CRITICAL", answer: "IMMEDIATE" },
      { text: "Atendente passou informação incorreta sobre o plano (1ª vez).", type: "DEV", answer: "FEEDBACK" },
      { text: "Fraude detectada na alteração cadastral.", type: "CRITICAL", answer: "IMMEDIATE" },
      { text: "Não ofereceu a pesquisa de satisfação final.", type: "DEV", answer: "FEEDBACK" }
    ]
  },

  renderNexus() {
    return `
      <div class="tool-container nexus-container">
        <div class="tool-title-row">
          <div class="tool-icon-sm" style="background: linear-gradient(135deg, #06b6d4, #0e7490);">
            <i class="fa-solid fa-atom"></i>
          </div>
          <div>
            <h2>NEP Nexus</h2>
            <p>Visualização interativa do ecossistema NEP</p>
          </div>
        </div>

        <div class="nexus-wrapper" id="nexus-wrapper">
          <div class="nexus-header">
            <div class="nexus-logo" onclick="NexusTools.nexusNavigate('MANDALA')">
              <span class="nexus-logo-text">ECOSSISTEMA.<span class="accent">NEP</span></span>
            </div>
            <div class="nexus-status">
              SYS.STATUS: <span class="online">ONLINE</span> | VIEW: <span class="accent">${this.nexusState.currentView}</span>
            </div>
          </div>

          <div class="nexus-content" id="nexus-content">
            ${this.renderNexusView()}
          </div>
        </div>
      </div>
    `;
  },

  renderNexusView() {
    if (this.nexusState.currentView === 'MANDALA') return this.renderNexusMandala();
    if (this.nexusState.currentView === 'PILLARS') return this.renderNexusPillars();
    if (this.nexusState.currentView === 'SIMULATOR') return this.renderNexusSimulator();
    return '';
  },

  renderNexusMandala() {
    const createOrbit = (items, radius, duration, direction = 1) => {
      const itemsHtml = items.map((item, i) => {
        const angle = (i / items.length) * 360;
        return `
          <div class="nexus-orbit-item" style="--angle: ${angle}deg; --radius: ${radius}px; --duration: ${duration}s; --direction: ${direction};"
               onclick="NexusTools.nexusItemClick('${item.targetView || ''}', ${item.targetId || 'null'})">
            <div class="nexus-orbit-icon" style="color: ${item.color}; border-color: ${item.color}40;">
              <i class="fa-solid fa-${this.getNexusIcon(item.icon)}"></i>
            </div>
            <span class="nexus-orbit-label">${item.label}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="nexus-orbit" style="--radius: ${radius}px; --duration: ${duration}s; --direction: ${direction};">
          ${itemsHtml}
        </div>
      `;
    };

    return `
      <div class="nexus-mandala">
        <div class="nexus-core">
          <span>NEP</span>
          <div class="nexus-core-ring"></div>
        </div>
        
        <div class="nexus-orbits">
          ${createOrbit(this.nexusData.layers.l1, 120, 30, 1)}
          ${createOrbit(this.nexusData.layers.l2, 200, 45, -1)}
          ${createOrbit(this.nexusData.layers.l3, 290, 60, 1)}
        </div>

        <div class="nexus-legend">
          <h4>SYSTEM_OVERVIEW</h4>
          <p>LAYER 01: STRATEGY</p>
          <p>LAYER 02: TACTICS</p>
          <p>LAYER 03: EXECUTION</p>
        </div>
      </div>
    `;
  },

  renderNexusPillars() {
    const pillar = this.nexusData.pillars.find(p => p.id === this.nexusState.activePillarId);

    return `
      <div class="nexus-pillars">
        <div class="nexus-pillars-header">
          <h2>SYSTEM_MOD::PILLARS</h2>
          <div class="nexus-pillar-tabs">
            ${this.nexusData.pillars.map(p => `
              <button class="nexus-pillar-tab ${this.nexusState.activePillarId === p.id ? 'active' : ''}"
                      onclick="NexusTools.nexusSetPillar(${p.id})">
                <i class="fa-solid fa-${this.getNexusIcon(p.icon)}"></i>
              </button>
            `).join('')}
            <button class="nexus-pillar-tab close" onclick="NexusTools.nexusNavigate('MANDALA')">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
        </div>

        <div class="nexus-pillar-content">
          <div class="nexus-pillar-bg">
            <i class="fa-solid fa-${this.getNexusIcon(pillar.icon)}"></i>
          </div>
          <h3>${pillar.title}</h3>
          <p class="nexus-pillar-desc">${pillar.desc}</p>
          <div class="nexus-pillar-stats">
            ${pillar.stats.map((stat, i) => `
              <div class="nexus-stat">
                <span class="nexus-stat-label">METRIC_0${i + 1}</span>
                <span class="nexus-stat-value">${stat}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  renderNexusSimulator() {
    const scenario = this.nexusData.scenarios[this.nexusState.simulatorIdx];
    const result = this.nexusState.simulatorResult;

    let overlay = '';
    if (result) {
      const className = result === 'CORRECT' ? 'success' : 'error';
      const text = result === 'CORRECT' ? 'ACCESS GRANTED' : 'VIOLATION';
      overlay = `<div class="nexus-sim-overlay ${className}"><h1>${text}</h1></div>`;
    }

    return `
      <div class="nexus-simulator">
        <div class="nexus-sim-header">
          <button class="nexus-back-btn" onclick="NexusTools.nexusNavigate('MANDALA')">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <h2><i class="fa-solid fa-shield"></i> PROTOCOL_SIMULATOR</h2>
        </div>

        <div class="nexus-sim-box">
          ${overlay}
          <div class="nexus-sim-case">INCOMING_CASE_0${this.nexusState.simulatorIdx + 1}</div>
          <h3>"${scenario.text}"</h3>
          <div class="nexus-sim-choices">
            <button class="nexus-choice feedback" onclick="NexusTools.nexusSimChoice('FEEDBACK')">
              Foco em Desenvolvimento
            </button>
            <button class="nexus-choice immediate" onclick="NexusTools.nexusSimChoice('IMMEDIATE')">
              Medida Imediata
            </button>
          </div>
        </div>
      </div>
    `;
  },

  getNexusIcon(name) {
    const iconMap = {
      'database': 'database',
      'target': 'bullseye',
      'trending-up': 'chart-line',
      'cpu': 'microchip',
      'activity': 'heartbeat',
      'eye': 'eye',
      'mail': 'envelope',
      'users': 'users',
      'check-square': 'check-square',
      'layers': 'layer-group',
      'message-square': 'comment',
      'shield': 'shield-halved'
    };
    return iconMap[name] || name;
  },

  initNexus() {
    // Load Lucide if needed for orbital icons
    // The app already uses Font Awesome so we use FA icons
  },

  nexusNavigate(view) {
    this.nexusState.currentView = view;
    this.nexusState.simulatorResult = null;
    const content = document.getElementById('nexus-content');
    if (content) content.innerHTML = this.renderNexusView();
    const status = document.querySelector('.nexus-status .accent');
    if (status) status.textContent = view;
  },

  nexusItemClick(targetView, targetId) {
    if (!targetView) return;
    if (targetView === 'PILLARS' && targetId) {
      this.nexusState.activePillarId = targetId;
    }
    this.nexusNavigate(targetView);
  },

  nexusSetPillar(id) {
    this.nexusState.activePillarId = id;
    const content = document.getElementById('nexus-content');
    if (content) content.innerHTML = this.renderNexusPillars();
  },

  nexusSimChoice(choice) {
    const scenario = this.nexusData.scenarios[this.nexusState.simulatorIdx];
    this.nexusState.simulatorResult = choice === scenario.answer ? 'CORRECT' : 'WRONG';

    const content = document.getElementById('nexus-content');
    if (content) content.innerHTML = this.renderNexusSimulator();

    setTimeout(() => {
      this.nexusState.simulatorResult = null;
      this.nexusState.simulatorIdx = (this.nexusState.simulatorIdx + 1) % this.nexusData.scenarios.length;
      if (content) content.innerHTML = this.renderNexusSimulator();
    }, 1500);
  },

  // ============ HTML CREATOR ============
  renderHTMLCreator() {
    // Delegate to the specialized module
    setTimeout(() => NexusHTMLCreator.postRender(), 100);
    return NexusHTMLCreator.render();
  }
};

window.NexusTools = NexusTools;
