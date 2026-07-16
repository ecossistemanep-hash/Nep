/**
 * NEP DELIVERY CONTROL - CHAT GERAL
 * Chat em tempo real (Firebase Realtime Database) + contador de presença.
 * Sem histórico permanente (mensagens com +24h são apagadas automaticamente)
 * e sem anexos — apenas texto.
 */

const NexusChat = {
  MAX_MESSAGE_LENGTH: 500,
  MESSAGE_TTL_MS: 24 * 60 * 60 * 1000, // 24h
  MAX_MESSAGES_SHOWN: 100,

  messagesRef: null,
  presenceRef: null,
  onlineCount: 0,
  messages: [],
  presenceInitialized: false,

  getCurrentUser() {
    return {
      uid: localStorage.getItem('nep_user_uid') || null,
      nome: localStorage.getItem('nep_user_name') || 'Usuário'
    };
  },

  // ============ PRESENÇA (chamado uma vez, no início do app) ============
  initPresence() {
    if (this.presenceInitialized) return;
    const rtdb = window.rtdb;
    const user = this.getCurrentUser();
    if (!rtdb || !user.uid) return;

    this.presenceInitialized = true;
    const myPresenceRef = rtdb.ref(`presence/${user.uid}`);
    const connectedRef = rtdb.ref('.info/connected');

    connectedRef.on('value', (snap) => {
      if (snap.val() !== true) return;
      myPresenceRef.onDisconnect().remove().then(() => {
        myPresenceRef.set({
          nome: user.nome,
          lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
      });
    });

    rtdb.ref('presence').on('value', (snap) => {
      this.onlineCount = snap.numChildren();
      const badge = document.getElementById('chat-online-count');
      if (badge) badge.textContent = this.onlineCount;
    });
  },

  // ============ RENDER DA PÁGINA ============
  render(container) {
    if (!window.rtdb) {
      container.innerHTML = `
        <div class="empty-state" style="text-align:center; padding:60px;">
          <div style="font-size:48px; margin-bottom:16px;">💭</div>
          <h3>Chat indisponível</h3>
          <p style="color:var(--text-secondary);">Não foi possível conectar ao Realtime Database.</p>
        </div>`;
      return;
    }

    this.initPresence();

    container.innerHTML = `
      <div class="chat-geral-page animate-fade-in">
        <div class="chat-header">
          <div>
            <h1 class="page-title">💭 Chat Geral</h1>
            <p class="page-description">Converse com o time em tempo real — sem histórico permanente, sem anexos.</p>
          </div>
          <div class="chat-online-badge">
            <span class="chat-online-dot"></span>
            <span id="chat-online-count">${this.onlineCount}</span> online
          </div>
        </div>

        <div class="chat-box">
          <div class="chat-messages" id="chat-messages">
            <p class="text-muted text-center" style="padding: 30px;">Carregando mensagens...</p>
          </div>
          <div class="chat-input-row">
            <input type="text" id="chat-input" class="form-input" placeholder="Escreva uma mensagem..." maxlength="${this.MAX_MESSAGE_LENGTH}">
            <button class="btn btn-primary" id="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
    this.listenMessages();
  },

  attachEvents() {
    document.getElementById('chat-send-btn')?.addEventListener('click', () => this.sendMessage());
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  },

  listenMessages() {
    const rtdb = window.rtdb;
    if (this.messagesRef) this.messagesRef.off();

    this.messagesRef = rtdb.ref('chat_geral/messages').limitToLast(this.MAX_MESSAGES_SHOWN);
    this.messagesRef.on('value', (snap) => {
      this.messages = [];
      snap.forEach(child => {
        this.messages.push({ id: child.key, ...child.val() });
      });
      this.renderMessages();
      this.pruneOldMessages();
    });
  },

  renderMessages() {
    const list = document.getElementById('chat-messages');
    if (!list) return;

    const user = this.getCurrentUser();
    const wasNearBottom = (list.scrollHeight - list.scrollTop - list.clientHeight) < 80;

    if (this.messages.length === 0) {
      list.innerHTML = '<p class="text-muted text-center" style="padding: 30px;">Nenhuma mensagem ainda. Seja o primeiro a falar!</p>';
      return;
    }

    list.innerHTML = this.messages.map(m => {
      const isMine = m.uid === user.uid;
      const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      return `
        <div class="chat-message ${isMine ? 'mine' : ''}">
          <div class="chat-message-author">${window.escapeHtml(m.nome || 'Alguém')} <span class="chat-message-time">${time}</span></div>
          <div class="chat-message-text">${window.escapeHtml(m.texto || '')}</div>
        </div>
      `;
    }).join('');

    if (wasNearBottom) list.scrollTop = list.scrollHeight;
  },

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const texto = input?.value.trim();
    if (!texto) return;

    const user = this.getCurrentUser();
    if (!user.uid) return;

    try {
      await window.rtdb.ref('chat_geral/messages').push({
        uid: user.uid,
        nome: user.nome,
        texto: texto.slice(0, this.MAX_MESSAGE_LENGTH),
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
      input.value = '';
    } catch (e) {
      console.error('[Chat] Erro ao enviar mensagem:', e);
      if (typeof NexusApp !== 'undefined') NexusApp.showToast('Erro ao enviar mensagem', 'error');
    }
  },

  // Limpeza best-effort: qualquer cliente que carregar o chat apaga
  // mensagens com mais de 24h (permitido pelas regras do RTDB)
  pruneOldMessages() {
    const cutoff = Date.now() - this.MESSAGE_TTL_MS;
    this.messages
      .filter(m => m.timestamp && m.timestamp < cutoff)
      .forEach(m => {
        window.rtdb.ref(`chat_geral/messages/${m.id}`).remove().catch(() => { });
      });
  }
};

// ============ STYLES ============
const chatStyles = document.createElement('style');
chatStyles.textContent = `
  .chat-geral-page { padding: 20px; max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; height: calc(100vh - 140px); }
  .chat-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--space-4); flex-wrap: wrap; gap: 10px; }
  .chat-online-badge { display: flex; align-items: center; gap: 8px; background: var(--surface-elevated); border: 1px solid var(--surface-border); border-radius: 20px; padding: 8px 16px; font-size: 13px; font-weight: 600; color: var(--text-secondary); }
  .chat-online-dot { width: 8px; height: 8px; border-radius: 50%; background: #2ecc71; box-shadow: 0 0 6px #2ecc71; }
  .chat-box { flex: 1; display: flex; flex-direction: column; background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-xl); overflow: hidden; min-height: 0; }
  .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
  .chat-message { max-width: 75%; background: var(--surface-elevated); border-radius: 12px; padding: 10px 14px; align-self: flex-start; }
  .chat-message.mine { align-self: flex-end; background: rgba(47, 111, 237, 0.15); border: 1px solid rgba(47, 111, 237, 0.25); }
  .chat-message-author { font-size: 11px; font-weight: 700; color: var(--primary-400); margin-bottom: 4px; }
  .chat-message-time { font-weight: 400; color: var(--text-tertiary); margin-left: 6px; }
  .chat-message-text { font-size: 14px; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; }
  .chat-input-row { display: flex; gap: 10px; padding: 16px; border-top: 1px solid var(--surface-border); background: var(--surface-elevated); }
  .chat-input-row .form-input { flex: 1; }
`;
document.head.appendChild(chatStyles);

window.NexusChat = NexusChat;
