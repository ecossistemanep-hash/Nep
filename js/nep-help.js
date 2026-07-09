/**
 * NEP HELP - Assistente Virtual Inteligente
 * Interface de Chat Flutuante conectada ao Gemini (NexusIA)
 */

class NepHelp {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.init();
    }

    init() {
        if (document.getElementById('nep-help-fab')) return; // Já existe
        this.injectUI();
        this.bindEvents();
    }

    injectUI() {
        const uiHTML = `
            <!-- Floating Button -->
            <div id="nep-help-fab" class="nep-help-fab" title="NEP Help">
                <i class="fa-solid fa-comments"></i>
            </div>

            <!-- Chat Window -->
            <div id="nep-help-window" class="nep-help-window">
                <div class="nep-help-header">
                    <div class="nep-help-title">
                        <h3>NEP Help</h3>
                        <span>Assistente Inteligente</span>
                    </div>
                    <button id="nep-help-close" class="nep-help-close"><i class="fa-solid fa-xmark"></i></button>
                </div>
                
                <div id="nep-help-body" class="nep-help-body">
                    <div class="msg bot">
                        Olá! Sou o assistente virtual do Ecossistema NEP. 
                        Posso ajudar com dúvidas sobre módulos, ferramentas ou analisar seus dados. Como posso ajudar hoje?
                    </div>
                </div>

                <div class="nep-help-input-area">
                    <input type="text" id="nep-help-input" class="nep-help-input" placeholder="Digite sua dúvida...">
                    <button id="nep-help-send" class="nep-help-send"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', uiHTML);
    }

    bindEvents() {
        const fab = document.getElementById('nep-help-fab');
        const win = document.getElementById('nep-help-window');
        const closeBtn = document.getElementById('nep-help-close');
        const sendBtn = document.getElementById('nep-help-send');
        const input = document.getElementById('nep-help-input');

        // Toggle Open/Close
        fab.addEventListener('click', () => this.toggleWindow());
        closeBtn.addEventListener('click', () => this.toggleWindow());

        // Send Message
        const sendMessage = async () => {
            const text = input.value.trim();
            if (!text) return;

            // Add User Message
            this.addMessage(text, 'user');
            input.value = '';

            // Loading State
            this.showTyping();

            try {
                // Construct message history for AI
                const apiMessages = this.messages.map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    content: m.text
                }));

                // Call NexusIA
                const response = await NexusIA.chat(apiMessages, { kanban: true, calendar: true, dashboard: true });

                this.removeTyping();
                this.addMessage(response, 'bot');
            } catch (error) {
                this.removeTyping();
                this.addMessage('Desculpe, tive um erro de conexão. Tente novamente.', 'bot');
                console.error(error);
            }
        };

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    toggleWindow() {
        const win = document.getElementById('nep-help-window');
        const fab = document.getElementById('nep-help-fab');
        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            win.classList.add('active');
            fab.style.display = 'none';
            document.getElementById('nep-help-input').focus();
        } else {
            win.classList.remove('active');
            setTimeout(() => { fab.style.display = 'flex'; }, 300);
        }
    }

    addMessage(text, type) {
        const body = document.getElementById('nep-help-body');

        // Parse Markdown if bot (usando marked se disponível, senão texto puro)
        let content = text;
        if (type === 'bot' && typeof marked !== 'undefined') {
            content = marked.parse(text);
        }

        const div = document.createElement('div');
        div.className = `msg ${type}`;
        div.innerHTML = content;

        body.appendChild(div);
        body.scrollTop = body.scrollHeight;

        // Save history (limited to last 20)
        this.messages.push({ role: type, text: text });
        if (this.messages.length > 20) this.messages.shift();
    }

    showTyping() {
        const body = document.getElementById('nep-help-body');
        const dots = `
            <div id="nep-typing" class="msg bot typing-dots">
                <div class="dot"></div><div class="dot"></div><div class="dot"></div>
            </div>
        `;
        body.insertAdjacentHTML('beforeend', dots);
        body.scrollTop = body.scrollHeight;
    }

    removeTyping() {
        const el = document.getElementById('nep-typing');
        if (el) el.remove();
    }
}

// Inicializar quando carregado
document.addEventListener('DOMContentLoaded', () => {
    // Delay pequeno para garantir que NexusIA carregou
    setTimeout(() => {
        window.NepHelp = new NepHelp();
    }, 1000);
});
