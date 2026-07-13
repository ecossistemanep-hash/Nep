/**
 * NEXUS PLATFORM - ESTAGIÁRIO (IA CHAT) v2.0
 * Interface de Chat com IA Inteligente, Análise de Dados e Geração Profissional de PPT
 */

const NexusEstagiario = {
  messages: [],
  isProcessing: false,
  uploadedFile: null,

  render(container) {
    container.innerHTML = `
      <div class="estagiario-page animate-fade-in">
        <div class="estagiario-header">
          <div class="estagiario-header-left">
            <h1 class="page-title">
              <span class="estagiario-icon">🤖</span>
              Neuronyo
              <span class="version-badge">v2.0</span>
            </h1>
            <p class="page-description">Assistente inteligente para análises, insights e apresentações profissionais</p>
          </div>
          <div class="status-badge status-active">
            <i class="fa-solid fa-circle-check"></i> Online
          </div>
        </div>

        <div class="estagiario-container">
          <div class="chat-area">
            <div class="chat-messages" id="chat-messages">
               ${this.messages.length === 0 ? this.getWelcomeMessage() : ''}
            </div>

            <!-- Zona de Upload -->
            <div class="file-upload-zone" id="file-upload-zone">
              <div class="upload-indicator" id="upload-indicator" style="display: none;">
                <i class="fa-solid fa-file-csv"></i>
                <span id="uploaded-file-name">arquivo.csv</span>
                <button class="btn-remove-file" id="btn-remove-file">✕</button>
              </div>
            </div>

            <div class="chat-input-area">
              <div class="chat-input-wrapper">
                <label class="btn-upload" for="file-input" title="Enviar arquivo CSV/JSON">
                  <i class="fa-solid fa-paperclip"></i>
                </label>
                <input type="file" id="file-input" accept=".csv,.json" style="display: none;">
                <input type="text" class="form-input chat-input" id="chat-input" 
                       placeholder="Pergunte algo ou peça um PPT profissional..." autocomplete="off">
                <button class="btn btn-primary chat-send" id="chat-send">
                  <i class="fa-solid fa-paper-plane"></i>
                </button>
              </div>
              <div class="chat-hint">
                <i class="fa-solid fa-lightbulb"></i>
                Dica: Envie um CSV e peça "Crie um PPT com análise dos dados"
              </div>
            </div>
          </div>

          <div class="chat-sidebar">
            <div class="chat-sidebar-section">
              <div class="nav-section-title">Capacidades v2.0</div>
              <div class="capability-item" onclick="NexusEstagiario.sendPrompt('Analise os dados do Kanban e mostre os principais indicadores')">
                <span class="capability-icon">📊</span>
                <div>
                  <div class="capability-name">Análise Inteligente</div>
                  <div class="capability-desc">Kanban, Agendas e arquivos CSV</div>
                </div>
              </div>
              <div class="capability-item" onclick="NexusEstagiario.sendPrompt('Crie um PPT executivo com gráficos sobre o status atual')">
                <span class="capability-icon">📽️</span>
                <div>
                  <div class="capability-name">PPT Profissional</div>
                  <div class="capability-desc">Gráficos, KPIs e design premium</div>
                </div>
              </div>
              <div class="capability-item" onclick="NexusEstagiario.sendPrompt('Faça uma análise de risco do Kanban e identifique tarefas que podem atrasar')">
                <span class="capability-icon">⚠️</span>
                <div>
                  <div class="capability-name">Análise de Risco</div>
                  <div class="capability-desc">Prevê atrasos e gargalos</div>
                </div>
              </div>
              <div class="capability-item" onclick="NexusEstagiario.sendPrompt('O que foi discutido na última reunião?')">
                <span class="capability-icon">📝</span>
                <div>
                  <div class="capability-name">Resumo de Atas</div>
                  <div class="capability-desc">Consulta agendas executivas</div>
                </div>
              </div>
              <div class="capability-item new-feature" onclick="document.getElementById('file-input').click()">
                <span class="capability-icon">📁</span>
                <div>
                  <div class="capability-name">Upload de Dados</div>
                  <div class="capability-desc">CSV e JSON para análise</div>
                </div>
              </div>
            </div>

            <div class="chat-sidebar-section">
              <div class="nav-section-title">Status do Sistema</div>
              <div class="status-info">
                <div class="status-row">
                  <span>Nexus Brain</span>
                  <span class="status-badge status-active">Conectado</span>
                </div>
                <div class="status-row">
                  <span>PPT Engine</span>
                  <span class="status-badge status-active">v2.0</span>
                </div>
                <div class="status-row">
                  <span>Data Analyzer</span>
                  <span class="status-badge status-active">Ativo</span>
                </div>
              </div>
            </div>

            <div class="chat-sidebar-section">
              <div class="nav-section-title">Temas PPT</div>
              <div class="theme-selector">
                <button class="theme-btn active" data-theme="dark" title="Dark (Premium)">🌙</button>
                <button class="theme-btn" data-theme="light" title="Light (Corporativo)">☀️</button>
                <button class="theme-btn" data-theme="gradient" title="Gradient (Moderno)">🎨</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderMessages();
  },

  selectedTheme: 'dark',

  getWelcomeMessage() {
    return `
      <div class="chat-welcome">
        <div class="chat-welcome-icon">🤖</div>
        <h2>Olá! 👋 Sou o Neuronio,</h2>
        <p>seu assistente inteligente da plataforma Nep.</p>
        <p>Como posso te ajudar hoje a navegar, entender ou utilizar o sistema com maestria? 😊</p>
        <div class="suggestion-chips">
          <button onclick="NexusEstagiario.sendPrompt('Faça um resumo executivo das tarefas')">📋 Resumo Executivo</button>
          <button onclick="NexusEstagiario.sendPrompt('Crie um PPT com KPIs e gráficos')">📊 PPT com Gráficos</button>
          <button onclick="document.getElementById('file-input').click()">📁 Enviar Dados</button>
        </div>
      </div>
    `;
  },

  bindEvents() {
    const input = document.getElementById('chat-input');
    const btn = document.getElementById('chat-send');
    const fileInput = document.getElementById('file-input');
    const removeFileBtn = document.getElementById('btn-remove-file');

    const send = () => {
      const text = input.value.trim();
      if (text && !this.isProcessing) {
        this.addUserMessage(text);
        input.value = '';
        this.processMessage(text);
      }
    };

    btn?.addEventListener('click', send);
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') send();
    });

    // File Upload
    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await this.handleFileUpload(file);
      }
    });

    removeFileBtn?.addEventListener('click', () => {
      this.clearUploadedFile();
    });

    // Theme selector
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedTheme = btn.dataset.theme;
      });
    });

    // Drag and drop
    const dropZone = document.getElementById('chat-messages');
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
      });
      dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) {
          await this.handleFileUpload(file);
        }
      });
    }
  },

  async handleFileUpload(file) {
    try {
      const result = await NexusDataAnalyzer.loadFile(file);
      this.uploadedFile = result;

      // Mostrar indicador
      document.getElementById('upload-indicator').style.display = 'flex';
      document.getElementById('uploaded-file-name').textContent = `${file.name} (${result.rowCount} linhas)`;

      // Mensagem no chat
      this.addBotMessage(`📁 **Arquivo carregado:** ${file.name}\n\n` +
        `- **Linhas:** ${result.rowCount}\n` +
        `- **Colunas:** ${result.columns.join(', ')}\n\n` +
        `Agora você pode pedir análises ou gerar um PPT com esses dados!`);

    } catch (err) {
      this.addBotMessage(`❌ Erro ao carregar arquivo: ${err.message}`);
    }
  },

  clearUploadedFile() {
    NexusDataAnalyzer.clear();
    this.uploadedFile = null;
    document.getElementById('upload-indicator').style.display = 'none';
    document.getElementById('file-input').value = '';
  },

  addUserMessage(text) {
    this.messages.push({ role: 'user', content: text, timestamp: new Date() });
    this.renderMessages();
  },

  addBotMessage(text, isHTML = false) {
    this.messages.push({ role: 'assistant', content: text, isHTML, timestamp: new Date() });
    this.renderMessages();
  },

  renderMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    if (this.messages.length === 0) {
      container.innerHTML = this.getWelcomeMessage();
      return;
    }

    container.innerHTML = this.messages.map(msg => `
      <div class="message ${msg.role}">
        <div class="message-avatar">
          ${msg.role === 'user' ? '<i class="fa-solid fa-user"></i>' : '🤖'}
        </div>
        <div class="message-content markdown-body">
          ${msg.isHTML ? msg.content : (typeof marked !== 'undefined' ? marked.parse(msg.content) : msg.content)}
        </div>
      </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
  },

  async processMessage(text) {
    this.isProcessing = true;
    this.showTyping();

    try {
      // Adicionar contexto de dados se houver arquivo carregado
      let enrichedMessages = this.messages.map(m => ({ role: m.role, content: m.content }));

      if (this.uploadedFile && NexusDataAnalyzer.currentData) {
        const dataContext = NexusDataAnalyzer.getInsightsText();
        enrichedMessages.push({
          role: 'system',
          content: `DADOS DO ARQUIVO CARREGADO:\n${dataContext}`
        });
      }

      // Chamada ao Serviço NexusIA
      const response = await NexusIA.chat(enrichedMessages);

      console.log('[Estagiario] Resposta da IA:', response.substring(0, 200));

      // Verificar se é comando de PPT (melhor detecção)
      const hasPPTJson = response.includes('"type"') &&
        (response.includes('PPT_GENERATION') || response.includes('"slides"'));
      const hasJsonBlock = response.includes('```json') || response.trim().startsWith('{');

      if (hasPPTJson || hasJsonBlock) {
        await this.handlePPTGeneration(response);
      } else {
        this.addBotMessage(response);
      }

    } catch (err) {
      console.error('[Estagiario] Erro:', err);
      this.addBotMessage(`⚠️ Erro ao processar: ${err.message}`);
    } finally {
      this.isProcessing = false;
      this.hideTyping();
      document.getElementById('chat-input')?.focus();
    }
  },

  async handlePPTGeneration(jsonResponse) {
    try {
      console.log('[Estagiario] Tentando gerar PPT de:', jsonResponse.substring(0, 300));

      // Extrair JSON - tentar múltiplos formatos
      let jsonText = null;

      // Formato 1: ```json ... ```
      const jsonBlockMatch = jsonResponse.match(/```json([\s\S]*?)```/);
      if (jsonBlockMatch) {
        jsonText = jsonBlockMatch[1].trim();
      }

      // Formato 2: JSON direto
      if (!jsonText) {
        const jsonDirectMatch = jsonResponse.match(/\{[\s\S]*\}/);
        if (jsonDirectMatch) {
          jsonText = jsonDirectMatch[0];
        }
      }

      if (!jsonText) {
        throw new Error("Não foi possível extrair JSON da resposta");
      }

      console.log('[Estagiario] JSON extraído:', jsonText.substring(0, 200));

      const pptData = JSON.parse(jsonText);

      if (!pptData.title || !pptData.slides) {
        throw new Error("JSON incompleto - falta title ou slides");
      }

      this.addBotMessage(`🏗️ **Gerando apresentação profissional:** _"${pptData.title}"_\n\nUsando tema: **${this.selectedTheme}**...`);

      // Verificar se NexusPPTEngine está disponível
      if (typeof NexusPPTEngine !== 'undefined') {
        // Usar o novo engine premium
        const config = {
          title: pptData.title,
          subtitle: pptData.subtitle || 'Gerado por Nexus IA',
          theme: this.selectedTheme,
          slides: this.convertSlidesToEngine(pptData.slides),
          closingTitle: 'Obrigado!',
          closingSubtitle: 'Dúvidas? Entre em contato.'
        };

        console.log('[Estagiario] Gerando com config:', config);

        await NexusPPTEngine.generate(config);
        this.addBotMessage(`✅ **Pronto!** A apresentação **${pptData.title}.pptx** foi baixada.\n\n🎨 Tema usado: **${this.selectedTheme}**\n📊 Slides: ${pptData.slides?.length || 0} + capa + encerramento`);
      } else {
        // Fallback para método antigo
        await this.legacyPPTGeneration(pptData);
      }

    } catch (e) {
      console.error(e);
      this.addBotMessage(`❌ Falha ao criar PPT: ${e.message}. Tente novamente.`);
    }
  },

  /**
   * Converte slides do formato IA para o formato do NexusPPTEngine
   */
  convertSlidesToEngine(slides) {
    if (!slides || !Array.isArray(slides)) return [];

    return slides.map(s => {
      // Detectar tipo de slide
      if (s.chartData || s.type === 'chart' || s.type === 'chartBar') {
        return {
          type: s.chartType || 'chartBar',
          title: s.title,
          chartData: s.chartData || this.generateChartDataFromContext()
        };
      } else if (s.type === 'kpis' || s.kpis) {
        return {
          type: 'kpis',
          title: s.title,
          kpis: s.kpis || this.generateKPIsFromContext()
        };
      } else if (s.type === 'twoColumn' || s.leftContent) {
        return {
          type: 'twoColumn',
          title: s.title,
          leftTitle: s.leftTitle || 'Pontos Positivos',
          leftContent: s.leftContent || [],
          rightTitle: s.rightTitle || 'Pontos de Atenção',
          rightContent: s.rightContent || []
        };
      } else if (s.type === 'quote' || s.quote) {
        return {
          type: 'quote',
          quote: s.quote || s.content?.[0] || '',
          author: s.author || ''
        };
      } else {
        // Slide de conteúdo padrão
        return {
          type: 'content',
          title: s.title,
          content: Array.isArray(s.content) ? s.content : [s.content]
        };
      }
    });
  },

  /**
   * Gera dados de gráfico a partir do contexto (Kanban/Arquivo)
   */
  generateChartDataFromContext() {
    // Se tem arquivo carregado, usar
    if (NexusDataAnalyzer.currentData) {
      const cols = NexusDataAnalyzer.currentData.headers;
      const types = NexusDataAnalyzer.detectColumnTypes();

      // Encontrar coluna categórica e numérica
      const catCol = cols.find(c => types[c] === 'categorical');
      const numCol = cols.find(c => types[c] === 'numeric');

      if (catCol) {
        return NexusDataAnalyzer.prepareBarChartData(catCol, numCol);
      }
    }

    // Fallback: dados do Kanban
    if (window.NexusKanban?.allTasks) {
      const tasks = window.NexusKanban.allTasks;
      const byStatus = {
        'Backlog': tasks.filter(t => t.status === 'backlog').length,
        'Execução': tasks.filter(t => t.status === 'doing').length,
        'Bloqueado': tasks.filter(t => t.status === 'pending').length,
        'Entregue': tasks.filter(t => t.status === 'done').length
      };

      return [{
        name: 'Tarefas',
        labels: Object.keys(byStatus),
        values: Object.values(byStatus)
      }];
    }

    // Dados de exemplo
    return [{
      name: 'Dados',
      labels: ['Jan', 'Fev', 'Mar', 'Abr'],
      values: [12, 19, 15, 25]
    }];
  },

  /**
   * Gera KPIs a partir do contexto
   */
  generateKPIsFromContext() {
    if (window.NexusKanban?.allTasks) {
      const tasks = window.NexusKanban.allTasks;
      const done = tasks.filter(t => t.status === 'done').length;
      const total = tasks.length;
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;

      return [
        { label: 'Total', value: total, icon: '📋' },
        { label: 'Concluídas', value: done, icon: '✅' },
        { label: 'Pendentes', value: total - done, icon: '⏳' },
        { label: 'Taxa', value: `${rate}%`, icon: '📈' }
      ];
    }

    return [
      { label: 'Total', value: 0, icon: '📊' },
      { label: 'Concluídos', value: 0, icon: '✅' },
      { label: 'Pendentes', value: 0, icon: '⏳' },
      { label: 'Taxa', value: '0%', icon: '📈' }
    ];
  },

  /**
   * Fallback para geração de PPT (método antigo)
   */
  async legacyPPTGeneration(pptData) {
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';

    let slide = pres.addSlide();
    slide.background = { color: '111827' };
    slide.addText(pptData.title, { x: 1, y: 2, w: '80%', fontSize: 36, color: 'FFFFFF', bold: true });
    slide.addText(`Gerado por Nexus IA - ${new Date().toLocaleDateString()}`, { x: 1, y: 3.5, fontSize: 14, color: '9CA3AF' });

    pptData.slides?.forEach(s => {
      let slide = pres.addSlide();
      slide.background = { color: 'FFFFFF' };
      slide.addText(s.title, { x: 0.5, y: 0.5, w: '90%', fontSize: 24, color: '111827', bold: true });

      if (Array.isArray(s.content)) {
        let yPos = 1.5;
        s.content.forEach(bullet => {
          slide.addText(bullet, { x: 0.8, y: yPos, w: '85%', fontSize: 16, color: '374151', bullet: true });
          yPos += 0.6;
        });
      }
    });

    await pres.writeFile({ fileName: `${pptData.title}.pptx` });
    this.addBotMessage(`✅ **Pronto!** A apresentação **${pptData.title}.pptx** foi baixada.`);
  },

  showTyping() {
    const container = document.getElementById('chat-messages');
    const typing = document.createElement('div');
    typing.className = 'message assistant typing-indicator';
    typing.id = 'typing-indicator';
    typing.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-content">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    `;
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
  },

  hideTyping() {
    document.getElementById('typing-indicator')?.remove();
  },

  sendPrompt(text) {
    const input = document.getElementById('chat-input');
    if (input) {
      input.value = text;
      document.getElementById('chat-send').click();
    }
  }
};

// ============ STYLES v2.0 ============
const estagiarioStyles = document.createElement('style');
estagiarioStyles.textContent = `
  .estagiario-page { max-width: 1400px; margin: 0 auto; height: 100%; display: flex; flex-direction: column; }
  .estagiario-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
  .estagiario-icon { font-size: 2rem; margin-right: 0.5rem; }
  .version-badge { background: linear-gradient(135deg, #7555e8, #9c5cff); color: white; font-size: 0.65rem; padding: 0.2rem 0.5rem; border-radius: 4px; margin-left: 0.5rem; font-weight: 600; }
  
  .status-active { background: rgba(16, 185, 129, 0.1); color: #10B981; padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 600; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; border: 1px solid rgba(16, 185, 129, 0.2); }

  .estagiario-container { display: grid; grid-template-columns: 1fr 300px; gap: 2rem; flex: 1; min-height: 0; }
  
  .chat-area { background: var(--surface-card, #1f2937); border: 1px solid var(--surface-border, #374151); border-radius: 1rem; display: flex; flex-direction: column; overflow: hidden; height: calc(100vh - 200px); }
  
  .chat-messages { flex: 1; overflow-y: auto; padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
  .chat-messages.drag-over { background: rgba(99, 102, 241, 0.1); border: 2px dashed #7555e8; }
  
  .message { display: flex; gap: 1rem; max-width: 85%; animation: slideIn 0.3s ease; }
  .message.user { align-self: flex-end; flex-direction: row-reverse; }
  .message.assistant { align-self: flex-start; }
  
  .message-avatar { width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: var(--primary-bg, #3b82f6); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; color: white; }
  .message.user .message-avatar { background: var(--secondary-bg, #7555e8); }
  
  .message-content { background: var(--surface-hover, #374151); padding: 1rem 1.5rem; border-radius: 0 1rem 1rem 1rem; font-size: 0.95rem; line-height: 1.6; color: var(--text-primary, #f3f4f6); }
  .message.user .message-content { background: var(--primary-600, #2563eb); color: white; border-radius: 1rem 0 1rem 1rem; }
  
  /* File Upload Zone */
  .file-upload-zone { padding: 0 1.5rem; }
  .upload-indicator { display: none; align-items: center; gap: 0.5rem; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); padding: 0.5rem 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem; }
  .upload-indicator i { color: #7555e8; }
  .upload-indicator span { flex: 1; font-size: 0.85rem; color: var(--text-secondary); }
  .btn-remove-file { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1rem; }

  .chat-input-area { padding: 1.5rem; border-top: 1px solid var(--surface-border, #374151); background: var(--surface-card, #1f2937); }
  .chat-input-wrapper { display: flex; gap: 0.75rem; align-items: center; }
  .btn-upload { width: 40px; height: 40px; border-radius: 0.5rem; background: var(--surface-hover, #374151); border: 1px solid var(--surface-border, #4b5563); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); transition: all 0.2s; }
  .btn-upload:hover { background: var(--primary-600, #7555e8); color: white; border-color: transparent; }
  .chat-input { flex: 1; padding: 0.75rem 1rem; border-radius: 0.75rem; border: 1px solid var(--surface-border, #4b5563); background: var(--bg-body, #111827); color: white; }
  .chat-input:focus { outline: none; border-color: var(--primary-500, #3b82f6); box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
  
  .chat-welcome { text-align: center; margin: auto; max-width: 600px; }
  .chat-welcome-icon { font-size: 4rem; margin-bottom: 1rem; animation: float 3s infinite ease-in-out; }
  .suggestion-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 2rem; }
  .suggestion-chips button { background: var(--surface-hover, #374151); border: 1px solid var(--surface-border, #4b5563); padding: 0.5rem 1rem; border-radius: 2rem; color: var(--text-secondary, #9ca3af); cursor: pointer; transition: all 0.2s; }
  .suggestion-chips button:hover { background: var(--primary-600, #2563eb); color: white; border-color: transparent; transform: translateY(-2px); }

  .chat-sidebar { display: flex; flex-direction: column; gap: 1.5rem; }
  .chat-sidebar-section { background: var(--surface-card, #1f2937); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--surface-border, #374151); }
  .nav-section-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-tertiary, #6b7280); margin-bottom: 1rem; font-weight: 700; }
  
  .capability-item { display: flex; gap: 1rem; padding: 0.75rem; border-radius: 0.5rem; cursor: pointer; transition: background 0.2s; }
  .capability-item:hover { background: var(--surface-hover, #374151); }
  .capability-item.new-feature { border: 1px dashed rgba(99, 102, 241, 0.5); }
  .capability-icon { font-size: 1.25rem; }
  .capability-name { font-weight: 600; font-size: 0.9rem; color: var(--text-primary, #f3f4f6); }
  .capability-desc { font-size: 0.8rem; color: var(--text-secondary, #9ca3af); }

  /* Theme Selector */
  .theme-selector { display: flex; gap: 0.5rem; }
  .theme-btn { width: 40px; height: 40px; border-radius: 0.5rem; border: 2px solid var(--surface-border, #4b5563); background: var(--surface-hover, #374151); cursor: pointer; font-size: 1.2rem; transition: all 0.2s; }
  .theme-btn:hover { border-color: var(--primary-500); }
  .theme-btn.active { border-color: var(--primary-500, #7555e8); background: rgba(99, 102, 241, 0.2); }

  /* Typing Dots */
  .typing-indicator .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #9ca3af; margin-right: 4px; animation: typing 1.4s infinite ease-in-out both; }
  .typing-indicator .dot:nth-child(1) { animation-delay: -0.32s; }
  .typing-indicator .dot:nth-child(2) { animation-delay: -0.16s; }
  
  @keyframes typing { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
  @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }

  .markdown-body ul, .markdown-body ol { margin-left: 1.5rem; margin-bottom: 1rem; }
  .markdown-body p { margin-bottom: 0.75rem; }
  .markdown-body strong { color: var(--primary-400, #60a5fa); }
  .chat-hint { font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
`;
document.head.appendChild(estagiarioStyles);

window.NexusEstagiario = NexusEstagiario;
