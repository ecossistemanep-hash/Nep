/**
 * NEXUS TOOLS - HTML CREATOR MODULE
 * Ferramenta de criação de HTML assistida por IA
 */

const NexusHTMLCreator = {
    messages: [],
    currentHTML: '',
    isProcessing: false,

    render() {
        return `
      <div class="html-creator-container">
        <!-- HEADER -->
        <div class="html-creator-header">
            <div class="header-left">
                <div class="tool-icon-sm" style="background: linear-gradient(135deg, #0ea5e9, #0284c7);">
                    <i class="fa-solid fa-code"></i>
                </div>
                <div>
                    <h2>Criador de Interfaces Web</h2>
                    <p>Descreva o que você precisa e a IA gera o código HTML/CSS/JS pronto.</p>
                </div>
            </div>
            <div class="header-actions">
                 <button class="tools-btn-secondary" id="btn-download-html" disabled>
                    <i class="fa-solid fa-download"></i> Baixar HTML
                 </button>
            </div>
        </div>

        <!-- MAIN SPLIT VIEW -->
        <div class="creator-split-view">
            
            <!-- LEFT: CHAT -->
            <div class="creator-chat-panel">
                <div class="chat-messages" id="creator-chat-messages">
                    ${this.messages.length === 0 ? this.getWelcomeMessage() : ''}
                </div>
                
                <!-- File Preview Chip -->
                <div id="file-attachment-chip" class="file-chip" style="display: none;">
                    <i class="fa-solid fa-file-csv"></i>
                    <span id="file-name-display">dados.csv</span>
                    <button id="btn-remove-file" class="btn-remove-file"><i class="fa-solid fa-times"></i></button>
                </div>

                <div class="chat-input-area">
                    <button class="btn-attach" id="btn-attach" title="Anexar arquivo (Max 2MB)"><i class="fa-solid fa-paperclip"></i></button>
                    <input type="file" id="file-input" hidden accept=".csv,.txt,.json,.js,.html,.css,.xml,.md,.xlsx,.xls">
                    
                    <textarea id="creator-input" placeholder="Ex: Crie um dashboard com estes dados..." rows="1"></textarea>
                    <button id="creator-send" class="btn-send"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>

            <!-- RIGHT: PREVIEW -->
            <div class="creator-preview-panel">
                <div class="preview-header">
                    <span><i class="fa-solid fa-eye"></i> Preview em Tempo Real</span>
                    <span class="preview-badge" id="preview-status">Aguardando geração...</span>
                </div>
                <div class="preview-frame-wrapper">
                    <!-- Loading Overlay (Visible by default as placeholder) -->
                    <div id="preview-loading" class="preview-loading">
                        <div class="tech-waves-container">
                            <div class="tech-wave"></div>
                            <div class="tech-wave"></div>
                            <div class="tech-wave"></div>
                            <div class="tech-orbital"></div>
                            <div class="tech-core">
                                <i class="fa-solid fa-brain"></i>
                            </div>
                        </div>
                        <span class="loading-text" id="preview-loading-text">Aguardando Instruções...</span>
                    </div>
                    <iframe id="html-preview-frame" sandbox="allow-scripts allow-modals allow-forms allow-same-origin"></iframe>
                </div>
            </div>

        </div>
      </div>
    `;
    },

    getWelcomeMessage() {
        return `
      <div class="message assistant">
        <div class="message-content">
          <p>👋 <strong>Olá! Sou seu Desenvolvedor Frontend.</strong></p>
          <p>Posso criar ferramentas completas em HTML para você. O que vamos construir hoje?</p>
          <div class="suggestion-chips">
            <button onclick="NexusHTMLCreator.sendPrompt('Crie uma calculadora de ROI simples')">🧮 Calculadora de ROI</button>
            <button onclick="NexusHTMLCreator.sendPrompt('Crie um checklist de onboarding de funcionários')">📋 Checklist Onboarding</button>
            <button onclick="NexusHTMLCreator.sendPrompt('Crie um formulário de pesquisa de satisfação com estrelas')">⭐ Pesquisa NPS</button>
          </div>
        </div>
      </div>
    `;
    },

    postRender() {
        this.renderMessages();
        this.bindEvents();
        if (this.currentHTML) this.updatePreview(this.currentHTML);
    },

    bindEvents() {
        const input = document.getElementById('creator-input');
        const btn = document.getElementById('creator-send');
        const dlBtn = document.getElementById('btn-download-html');

        const send = () => {
            const text = input.value.trim();
            if (text && !this.isProcessing) {
                this.handleUserMessage(text);
                input.value = '';
            }
        };

        btn?.addEventListener('click', send);
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
            }
        });

        dlBtn?.addEventListener('click', () => this.downloadHTML());

        // File Attachment Bindings
        const attachBtn = document.getElementById('btn-attach');
        const fileInput = document.getElementById('file-input');
        const removeFileBtn = document.getElementById('btn-remove-file');

        attachBtn?.addEventListener('click', () => fileInput.click());
        fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));
        removeFileBtn?.addEventListener('click', () => {
            this.attachedFile = null;
            this.updateFileChip();
            fileInput.value = '';
        });
    },

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            NexusApp?.showToast?.('Arquivo muito grande. Máximo 2MB.', 'error');
            return;
        }

        try {
            let content = '';
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                content = await this.readExcelFile(file);
            } else {
                content = await this.readTextFile(file);
            }

            this.attachedFile = {
                name: file.name,
                content: content,
                type: file.type
            };
            this.updateFileChip();

        } catch (error) {
            console.error(error);
            NexusApp?.showToast?.('Erro ao ler arquivo: ' + error.message, 'error');
        }
    },

    readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    },

    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    resolve(JSON.stringify(json));
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    },

    updateFileChip() {
        const chip = document.getElementById('file-attachment-chip');
        const nameDisplay = document.getElementById('file-name-display');

        if (this.attachedFile) {
            chip.style.display = 'flex';
            nameDisplay.textContent = this.attachedFile.name;
        } else {
            chip.style.display = 'none';
        }
    },

    async handleUserMessage(text) {
        this.addUserMessage(text);
        this.isProcessing = true;
        this.showTyping();

        try {
            // Analisa intenção: É pedido de geração ou conversa?
            // Simplificação: Se tiver "crie", "gere", "faça", "html", assume geração.
            const isGeneration = /crie|gere|construa|faça|html|código|check|calculadora|form/i.test(text);

            if (isGeneration) {
                this.addBotMessage("🛠️ Entendido! Estou escrevendo o código... Isso pode levar alguns segundos.");

                const loadingOverlay = document.getElementById('preview-loading');
                const loadingText = document.getElementById('preview-loading-text');

                if (loadingOverlay) loadingOverlay.style.display = 'flex';
                if (loadingText) loadingText.textContent = "IA Construindo Interface...";

                try {
                    // Contexto da conversa anterior para manter coerência
                    const context = this.messages.map(m => `${m.role}: ${m.content}`).join('\n');

                    // Pass file content if available
                    let fileContext = '';
                    if (this.attachedFile) {
                        fileContext = `Arquivo anexado: ${this.attachedFile.name}\nTipo: ${this.attachedFile.type}\nConteúdo: ${this.attachedFile.content}`;
                    }

                    const htmlCode = await NexusIA.generateHTMLCode(text, context, fileContext);
                    this.currentHTML = htmlCode;

                    this.updatePreview(htmlCode);
                    this.addBotMessage("✅ Código gerado com sucesso! Veja o preview ao lado. Se quiser ajustar algo, é só pedir.");
                } finally {
                    if (loadingOverlay) loadingOverlay.style.display = 'none';
                }

            } else {
                // Conversa normal de alinhamento
                const response = await NexusIA.generateText([
                    { role: 'system', content: 'Você é um especialista em Frontend ajudando a especificar uma ferramenta HTML. Seja breve.' },
                    ...this.messages
                ]);
                this.addBotMessage(response);
            }

        } catch (error) {
            console.error(error);
            this.addBotMessage(`❌ Ocorreu um erro: ${error.message}`);
            // Ensure loading is hidden on error
            const loadingOverlay = document.getElementById('preview-loading');
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        } finally {
            this.isProcessing = false;
            this.hideTyping();
        }
    },

    addUserMessage(text) {
        this.messages.push({ role: 'user', content: text });
        this.renderMessages();
    },

    addBotMessage(text) {
        this.messages.push({ role: 'assistant', content: text });
        this.renderMessages();
    },

    renderMessages() {
        const container = document.getElementById('creator-chat-messages');
        if (!container) return;

        if (this.messages.length === 0) {
            container.innerHTML = this.getWelcomeMessage();
            return;
        }

        container.innerHTML = this.messages.map(msg => `
        <div class="message ${msg.role}">
            <div class="message-content">
                ${msg.role === 'assistant' ? (typeof marked !== 'undefined' ? marked.parse(msg.content) : msg.content) : msg.content}
            </div>
        </div>
    `).join('');

        container.scrollTop = container.scrollHeight;
    },

    showTyping() {
        const container = document.getElementById('creator-chat-messages');
        const typing = document.createElement('div');
        typing.className = 'message assistant typing';
        typing.id = 'creator-typing';
        typing.innerHTML = '<div class="message-content">Agente digitando...</div>';
        container.appendChild(typing);
        container.scrollTop = container.scrollHeight;
    },

    hideTyping() {
        document.getElementById('creator-typing')?.remove();
    },

    updatePreview(html) {
        const iframe = document.getElementById('html-preview-frame');
        const badge = document.getElementById('preview-status');
        const dlBtn = document.getElementById('btn-download-html');

        if (iframe) {
            iframe.srcdoc = html;
        }

        if (badge) {
            badge.textContent = "Atualizado agora";
            badge.style.background = "rgba(16, 185, 129, 0.2)";
            badge.style.color = "#10b981";
        }

        if (dlBtn) dlBtn.disabled = false;
    },

    downloadHTML() {
        if (!this.currentHTML) return;

        const blob = new Blob([this.currentHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ferramenta_nep_${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    sendPrompt(text) {
        const input = document.getElementById('creator-input');
        if (input) {
            input.value = text;
            document.getElementById('creator-send').click();
        }
    },

    // Inject Styles dynamically
    initStyles() {
        const style = document.createElement('style');
        style.textContent = `
        .html-creator-container { display: flex; flex-direction: column; height: calc(100vh - 140px); min-height: 500px; }
        .html-creator-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-shrink: 0; }
        .header-left { display: flex; gap: 15px; align-items: center; }
        
        .creator-split-view { display: grid; grid-template-columns: 400px 1fr; gap: 20px; flex: 1; min-height: 0; overflow: hidden; }
        
        /* CHAT PANEL */
        .creator-chat-panel { background: #1e293b; border-radius: 12px; display: flex; flex-direction: column; border: 1px solid #334155; height: 100%; overflow: hidden; }
        .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; scroll-behavior: smooth; }
        
        /* CHAT INPUT AREA */
        .chat-input-area { padding: 15px; border-top: 1px solid #334155; display: flex; gap: 10px; align-items: flex-end; background: #1e293b; flex-shrink: 0; }
        #creator-input { flex: 1; background: #0f1729; border: 1px solid #334155; color: white; border-radius: 8px; padding: 12px; resize: none; font-family: inherit; min-height: 44px; max-height: 120px; line-height: 1.5; }
        #creator-input:focus { border-color: #3b82f6; outline: none; }
        
        .btn-send { background: #3b82f6; color: white; border: none; width: 44px; height: 44px; border-radius: 8px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
        .btn-send:hover { background: #2563eb; }
        
        .btn-attach { background: transparent; color: #94a3b8; border: 1px solid #334155; width: 44px; height: 44px; border-radius: 8px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-attach:hover { color: white; border-color: #64748b; background: rgba(255,255,255,0.05); }

        /* FILE CHIP */
        .file-chip { background: #334155; padding: 6px 12px; border-radius: 6px; display: flex; align-items: center; gap: 8px; margin: 0 15px 10px; width: fit-content; font-size: 0.85rem; color: #e2e8f0; border: 1px solid #475569; animation: slideIn 0.3s ease; }
        .btn-remove-file { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1rem; margin-left: 5px; padding: 0 4px; display: flex; align-items: center; }
        .btn-remove-file:hover { color: #ef4444; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* PREVIEW PANEL */
        .creator-preview-panel { background: #1e293b; border-radius: 12px; display: flex; flex-direction: column; border: 1px solid #334155; padding: 10px; height: 100%; overflow: hidden; }
        .preview-header { display: flex; justify-content: space-between; margin-bottom: 10px; color: #94a3b8; font-size: 0.9rem; padding: 0 10px; flex-shrink: 0; }
        .preview-badge { font-size: 0.75rem; background: #334155; padding: 2px 8px; border-radius: 4px; }
        
        /* PREVIEW FRAME */
        .preview-frame-wrapper { flex: 1; background: white; border-radius: 8px; overflow: hidden; position: relative; min-height: 0; }
        #html-preview-frame { width: 100%; height: 100%; border: none; }

        /* LOADING ANIMATION - TECH WAVES */
        .preview-loading { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #0f1729; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; overflow: hidden; }
        
        .tech-waves-container { position: relative; width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; }
        
        .tech-wave { position: absolute; border: 2px solid rgba(56, 189, 248, 0.3); width: 100%; height: 100%; border-radius: 50%; opacity: 0; animation: ripple 3s infinite cubic-bezier(0.1, 0.6, 0.2, 1); }
        .tech-wave:nth-child(2) { animation-delay: 0.5s; border-color: rgba(59, 130, 246, 0.3); }
        .tech-wave:nth-child(3) { animation-delay: 1s; border-color: rgba(14, 165, 233, 0.3); }
        
        .tech-core { width: 60px; height: 60px; background: radial-gradient(circle at 30% 30%, #38bdf8, #0ea5e9); border-radius: 50%; box-shadow: 0 0 30px rgba(56, 189, 248, 0.6); animation: pulse-core 2s ease-in-out infinite; display: flex; align-items: center; justify-content: center; z-index: 2; position: relative; }
        .tech-core i { font-size: 24px; color: white; }

        .tech-orbital { position: absolute; width: 100%; height: 100%; animation: rotate-orbital 8s linear infinite; }
        .tech-orbital::after { content: ''; position: absolute; top: 0; left: 50%; width: 8px; height: 8px; background: #fff; border-radius: 50%; box-shadow: 0 0 10px #fff; transform: translate(-50%, -50%); }

        .loading-text { margin-top: 40px; color: #94a3b8; font-family: 'Orbitron', sans-serif; letter-spacing: 2px; font-size: 14px; text-transform: uppercase; animation: fade-text 2s ease-in-out infinite; z-index: 2; }

        @keyframes ripple { 0% { transform: scale(0.5); opacity: 0; } 50% { opacity: 1; } 100% { transform: scale(1.8); opacity: 0; } }
        @keyframes pulse-core { 0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(56, 189, 248, 0.4); } 50% { transform: scale(1.1); box-shadow: 0 0 40px rgba(56, 189, 248, 0.8); } }
        @keyframes rotate-orbital { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fade-text { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

        /* MESSAGES */
        .message { display: flex; }
        .message.user { justify-content: flex-end; }
        .message-content { padding: 12px 16px; border-radius: 12px; max-width: 85%; font-size: 0.95rem; line-height: 1.5; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .message.user .message-content { background: #3b82f6; color: white; border-bottom-right-radius: 2px; }
        .message.assistant .message-content { background: #334155; color: #e2e8f0; border-bottom-left-radius: 2px; }
        
        .typing .message-content { font-style: italic; color: #94a3b8; background: rgba(51, 65, 85, 0.5); }

        .suggestion-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
        .suggestion-chips button { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #e2e8f0; padding: 6px 12px; border-radius: 16px; cursor: pointer; font-size: 0.8rem; transition: background 0.2s; }
        .suggestion-chips button:hover { background: rgba(255,255,255,0.2); }

        @media (max-width: 1024px) {
            .creator-split-view { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
            .html-creator-container { height: auto; min-height: 100vh; }
        }
    `;
        document.head.appendChild(style);
    }
};

// Auto-init styles on load
NexusHTMLCreator.initStyles();
window.NexusHTMLCreator = NexusHTMLCreator;
