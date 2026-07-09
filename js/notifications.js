/**
 * NEP DELIVERY CONTROL - NOTIFICATIONS
 * Sistema de Notificações com Firestore + Hierarquia
 */

const NexusNotifications = {
  COLLECTION: 'notifications',
  notifications: [],
  unsubscribe: null,
  isInitialLoad: true,

  // Hierarquia de cargos (level maior = mais permissões)
  ROLE_HIERARCHY: {
    'ADMIN': 100,
    'DIRETOR': 95,
    'SUPERINTENDENTE': 90,
    'GERENTE': 70,
    'CONSULTOR': 60,
    'COORDENADOR': 50,
    'ANALISTA': 30,
    'MONITOR': 10
  },

  /**
   * Inicialização - conecta listener Firestore
   */
  init() {
    this.loadFromFirestore();
    this.renderBadge();
  },

  /**
   * Verifica se Firestore está disponível
   */
  isFirestoreAvailable() {
    return window.firebase && window.firebase.firestore;
  },

  /**
   * Obtém instância do Firestore
   */
  getDb() {
    // Primeiro tenta window.db (inicializado no index.html)
    if (window.db) return window.db;
    // Fallback para firebase.firestore()
    if (window.firebase && window.firebase.firestore) {
      return window.firebase.firestore();
    }
    return null;
  },

  /**
   * Obtém dados do usuário atual
   */
  getCurrentUser() {
    return {
      uid: localStorage.getItem('nep_user_uid') || 'unknown',
      nome: localStorage.getItem('nep_user_name') || 'Usuário',
      cargo: (localStorage.getItem('nep_cargo') || localStorage.getItem('nep_user_role_key') || 'MONITOR').toUpperCase(),
      isAdmin: localStorage.getItem('nep_is_admin') === 'true'
    };
  },

  /**
   * Carrega notificações do Firestore com listener em tempo real
   */
  async loadFromFirestore() {
    const db = this.getDb();
    const user = this.getCurrentUser();

    if (!db || !user.uid || user.uid === 'unknown') {
      // Fallback para localStorage se não tiver Firestore ou user
      this.loadFromLocalStorage();
      return;
    }

    try {
      // Limpar listener anterior
      if (this.unsubscribe) {
        this.unsubscribe();
      }

      // Query simplificada: buscar notificações recentes e filtrar no cliente
      // (Firestore tem limitações com 'in' + 'orderBy' em campos diferentes)
      const query = db.collection(this.COLLECTION)
        .orderBy('created_at', 'desc')
        .limit(100);

      // Listener em tempo real
      this.unsubscribe = query.onSnapshot(snapshot => {
        let hasChanges = false;

        // Processar mudanças
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const notif = {
              id: change.doc.id,
              ...data,
              createdAt: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString()
            };

            // Verificar se é relevante para o usuário
            if (this.isRelevantForUser(notif, user)) {
              // Verificar se já existe (evitar duplicatas)
              if (!this.notifications.some(n => n.id === notif.id)) {
                this.notifications.unshift(notif);
                hasChanges = true;

                // Disparar push apenas se não for carregamento inicial e não for minha própria ação
                // E apenas se a notificação for recente (< 1 hora) para evitar spam de coisas antigas
                if (!snapshot.metadata.hasPendingWrites && notif.remetente_uid !== user.uid) {
                  const isRecent = (new Date() - new Date(notif.createdAt)) < 60 * 60 * 1000;

                  if (!this.isInitialLoad && isRecent) {
                    this.triggerPushNotification(notif);
                  }
                }
              }
            }
          }
          // Handle modifications (e.g. read status update)
          if (change.type === 'modified') {
            const data = change.doc.data();
            const index = this.notifications.findIndex(n => n.id === change.doc.id);
            if (index !== -1) {
              this.notifications[index] = { ...this.notifications[index], ...data };
              hasChanges = true;
            }
          }
        });

        if (hasChanges || this.notifications.length === 0) {
          // Re-ordenar e limitar
          this.notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          this.notifications = this.notifications.slice(0, 50);
          this.renderBadge();
          // Atualizar UI se o painel estiver aberto (opcional, mas bom ter um evento)
          window.dispatchEvent(new CustomEvent('nexus-notifications-updated'));
        }

        // Após o primeiro carregamento completo, desativa a flag se vier do servidor
        if (this.isInitialLoad && !snapshot.metadata.fromCache) {
          this.isInitialLoad = false;
        }

      }, error => {
        console.warn('[Notifications] Erro no listener:', error);
        this.loadFromLocalStorage();
        this.isInitialLoad = false; // Ensure flag is reset on error
      });

    } catch (error) {
      console.warn('[Notifications] Firestore falhou, usando local:', error);
      this.loadFromLocalStorage();
      this.isInitialLoad = false; // Ensure flag is reset on error
    }
  },

  /**
   * Verificar se notificação é relevante para o usuário
   */
  isRelevantForUser(n, user) {
    // Admin vê tudo
    if (user.isAdmin) return true;

    // Próprias notificações (destinatário é meu UID)
    if (n.destinatario_uid === user.uid) return true;

    // Broadcast para todos
    if (n.destinatario_uid === 'ALL') return true;

    // Para meu cargo específico
    if (n.destinatario_uid === user.cargo) return true;

    // Hierarquia: vejo notificações de cargos com nivel <= ao meu
    if (n.destinatario_cargo) {
      const meuNivel = this.ROLE_HIERARCHY[user.cargo] || 0;
      const nivelNotif = this.ROLE_HIERARCHY[n.destinatario_cargo] || 0;
      if (nivelNotif <= meuNivel) return true;
    }

    return false;
  },

  /**
   * Fallback: carrega de localStorage
   */
  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('nexus_notifications');
      this.notifications = saved ? JSON.parse(saved) : [];
    } catch (e) {
      this.notifications = [];
    }
    this.renderBadge();
  },

  /**
   * Salva localmente (backup)
   */
  saveToLocalStorage() {
    try {
      localStorage.setItem('nexus_notifications', JSON.stringify(this.notifications.slice(0, 50)));
    } catch (e) {
      console.warn('[Notifications] Erro ao salvar local:', e);
    }
  },

  /**
   * Conta notificações não lidas
   */
  getUnreadCount() {
    const user = this.getCurrentUser();
    return this.notifications.filter(n => {
      const lidoPor = n.lido_por || [];
      return !lidoPor.includes(user.uid) && n.lido !== true;
    }).length;
  },

  /**
   * Atualiza badge no sino
   */
  renderBadge() {
    const unread = this.getUnreadCount();
    const badge = document.getElementById('notification-badge');
    if (badge) {
      badge.textContent = unread > 9 ? '9+' : unread;
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }
  },

  /**
   * Adiciona nova notificação
   * @param {Object} notification - Dados da notificação
   * @param {string} notification.tipo - 'demanda' | 'aviso' | 'mencao' | 'validacao' | 'sistema'
   * @param {string} notification.titulo - Título
   * @param {string} notification.mensagem - Mensagem detalhada
   * @param {string} notification.destinatario_uid - UID do destinatário ou 'ALL' para broadcast
   * @param {string} notification.destinatario_cargo - Cargo do destinatário (para hierarquia)
   * @param {string} notification.referencia_tipo - 'task' | 'aviso' | 'forum' | null
   * @param {string} notification.referencia_id - ID do item relacionado
   */
  async add(notification) {
    const user = this.getCurrentUser();
    const db = this.getDb();

    const newNotif = {
      tipo: notification.tipo || 'sistema',
      titulo: notification.titulo || notification.title || 'Notificação',
      mensagem: notification.mensagem || notification.message || '',
      destinatario_uid: notification.destinatario_uid || user.uid,
      destinatario_cargo: notification.destinatario_cargo || null,
      remetente_uid: user.uid,
      remetente_nome: user.nome,
      referencia_tipo: notification.referencia_tipo || null,
      referencia_id: notification.referencia_id || null,
      lido: false,
      lido_por: [],
      created_at: new Date()
    };

    if (db) {
      try {
        await db.collection(this.COLLECTION).add({
          ...newNotif,
          created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('[Notifications] Notificação criada no Firestore');

        // NÃO disparar push aqui - o listener vai fazer isso para evitar duplicatas
        // this.triggerPushNotification(newNotif);

        return { success: true };
      } catch (error) {
        console.warn('[Notifications] Erro ao criar no Firestore:', error);
      }
    }

    // Fallback local
    this.notifications.unshift({
      id: 'local_' + Date.now(),
      ...newNotif,
      createdAt: new Date().toISOString()
    });
    this.saveToLocalStorage();
    this.renderBadge();
    return { success: true };
  },

  /**
   * Dispara push notification local
   */
  triggerPushNotification(notification) {
    // Only trigger if PWA module is available and permission granted
    if (window.NexusPWA && window.NexusPWA.pushPermission === 'granted') {
      try {
        const iconMap = {
          'sistema': '🔔',
          'tarefa': '📋',
          'forum': '💬',
          'conquista': '🏆',
          'validacao': '✅',
          'aviso': '📢'
        };

        const icon = iconMap[notification.tipo] || '🔔';

        window.NexusPWA.showLocalNotification(
          `${icon} ${notification.titulo}`,
          {
            body: notification.mensagem,
            tag: `nep-${notification.tipo}-${Date.now()}`,
            data: {
              referencia_tipo: notification.referencia_tipo,
              referencia_id: notification.referencia_id
            },
            requireInteraction: notification.tipo === 'tarefa' || notification.tipo === 'validacao'
          }
        );
      } catch (error) {
        console.warn('[Notifications] Push notification failed:', error);
      }
    }
  },

  /**
   * Notifica múltiplos usuários (ex: ao criar aviso)
   */
  async notifyUsers(userIds, notification) {
    for (const uid of userIds) {
      await this.add({
        ...notification,
        destinatario_uid: uid
      });
    }
  },

  /**
   * Notifica por cargo (broadcast para todos de um cargo)
   */
  async notifyRole(cargo, notification) {
    await this.add({
      ...notification,
      destinatario_uid: cargo.toUpperCase(),
      destinatario_cargo: cargo.toUpperCase()
    });
  },

  /**
   * Broadcast para todos os usuários
   */
  async notifyAll(notification) {
    await this.add({
      ...notification,
      destinatario_uid: 'ALL'
    });
  },

  /**
   * Marca notificação como lida
   */
  async markAsRead(id) {
    const user = this.getCurrentUser();
    const db = this.getDb();

    if (db && !id.startsWith('local_')) {
      try {
        await db.collection(this.COLLECTION).doc(id).update({
          lido_por: firebase.firestore.FieldValue.arrayUnion(user.uid)
        });
      } catch (error) {
        console.warn('[Notifications] Erro ao marcar como lida:', error);
      }
    }

    // Atualizar local também
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.lido_por = notif.lido_por || [];
      if (!notif.lido_por.includes(user.uid)) {
        notif.lido_por.push(user.uid);
      }
      this.saveToLocalStorage();
      this.renderBadge();
    }
  },

  /**
   * Marca todas como lidas
   */
  async markAllAsRead() {
    const user = this.getCurrentUser();
    const db = this.getDb();
    const batch = db ? db.batch() : null;

    for (const notif of this.notifications) {
      if (db && !notif.id.startsWith('local_')) {
        try {
          const ref = db.collection(this.COLLECTION).doc(notif.id);
          batch?.update(ref, {
            lido_por: firebase.firestore.FieldValue.arrayUnion(user.uid)
          });
        } catch (e) { }
      }
      notif.lido_por = notif.lido_por || [];
      if (!notif.lido_por.includes(user.uid)) {
        notif.lido_por.push(user.uid);
      }
    }

    if (batch) {
      try {
        await batch.commit();
      } catch (e) {
        console.warn('[Notifications] Erro no batch:', e);
      }
    }

    this.saveToLocalStorage();
    this.renderBadge();
  },

  /**
   * Renderiza dropdown de notificações
   */
  renderDropdown() {
    const user = this.getCurrentUser();
    const unread = this.getUnreadCount();
    const icons = {
      demanda: '📋',
      aviso: '📢',
      mencao: '💬',
      validacao: '✅',
      sistema: 'ℹ️',
      task: '📋',
      mention: '💬',
      update: '🔄'
    };

    const isRead = (n) => {
      if (n.lido === true) return true;
      if (n.lido_por && n.lido_por.includes(user.uid)) return true;
      if (n.read === true) return true;
      return false;
    };

    return `
      <div class="notifications-dropdown" id="notifications-dropdown">
        <div class="notif-header">
          <span class="notif-title">Notificações</span>
          ${unread > 0 ? `<button class="btn btn-sm btn-ghost" id="mark-all-read">Marcar todas</button>` : ''}
        </div>
        <div class="notif-list">
          ${this.notifications.length === 0 ? `
            <div class="notif-empty">
              <i class="fa-solid fa-bell-slash" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i>
              <div>Nenhuma notificação</div>
            </div>
          ` : this.notifications.slice(0, 15).map(n => `
            <div class="notif-item ${isRead(n) ? 'read' : 'unread'}" data-notif-id="${n.id}" data-ref-tipo="${n.referencia_tipo || ''}" data-ref-id="${n.referencia_id || ''}">
              <span class="notif-icon">${icons[n.tipo] || icons[n.type] || 'ℹ️'}</span>
              <div class="notif-content">
                <div class="notif-item-title">${n.titulo || n.title || 'Notificação'}</div>
                <div class="notif-message">${n.mensagem || n.message || ''}</div>
                <div class="notif-time">${this.formatTime(n.createdAt || n.created_at)}</div>
              </div>
              ${!isRead(n) ? '<span class="notif-dot"></span>' : ''}
            </div>
          `).join('')}
        </div>
        ${this.notifications.length > 0 ? `
          <div class="notif-footer">
            <button class="btn btn-sm btn-ghost" onclick="NepApp.navigate('announcements'); document.getElementById('notifications-dropdown')?.remove();">
              Ver todos os avisos
            </button>
          </div>
        ` : ''}
      </div>
    `;
  },

  /**
   * Formata tempo relativo
   */
  formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d atrás`;
    return date.toLocaleDateString('pt-BR');
  },

  /**
   * Anexa eventos no dropdown
   */
  attachDropdownEvents() {
    document.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.notifId;
        const refTipo = item.dataset.refTipo;
        const refId = item.dataset.refId;

        this.markAsRead(id);
        document.getElementById('notifications-dropdown')?.remove();

        // Navegar para o item referenciado
        if (refTipo && refId) {
          if (refTipo === 'task') {
            NepApp?.navigate?.('kanban');
          } else if (refTipo === 'aviso') {
            NepApp?.navigate?.('announcements');
          } else if (refTipo === 'forum') {
            NepApp?.navigate?.('forum');
          }
        }
      });
    });

    document.getElementById('mark-all-read')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.markAllAsRead();
      document.getElementById('notifications-dropdown')?.remove();
    });
  },

  /**
   * Limpa listener ao sair
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
};

// Notification Styles
const notifStyles = document.createElement('style');
notifStyles.textContent = `
  .notification-btn { position: relative; }
  #notification-badge {
    position: absolute; top: -4px; right: -4px;
    min-width: 18px; height: 18px;
    background: var(--error-500); color: white;
    font-size: 10px; font-weight: bold;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  .notifications-dropdown {
    position: absolute; top: 100%; right: 0;
    width: 380px; max-height: 480px;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    overflow: hidden; z-index: 1000;
  }
  .notif-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: var(--space-4);
    border-bottom: 1px solid var(--surface-border);
    background: var(--surface-elevated);
  }
  .notif-title { font-weight: var(--font-semibold); font-size: var(--text-base); }
  .notif-list { max-height: 380px; overflow-y: auto; }
  .notif-item {
    display: flex; gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    cursor: pointer; position: relative;
    transition: all var(--transition-fast);
    border-bottom: 1px solid var(--surface-border);
  }
  .notif-item:last-child { border-bottom: none; }
  .notif-item:hover { background: var(--surface-hover); }
  .notif-item.unread { background: rgba(47, 111, 237, 0.08); border-left: 3px solid var(--primary-500); }
  .notif-item.read { opacity: 0.7; }
  .notif-icon { font-size: var(--text-xl); flex-shrink: 0; }
  .notif-content { flex: 1; min-width: 0; }
  .notif-item-title { font-size: var(--text-sm); font-weight: var(--font-medium); }
  .notif-message { 
    font-size: var(--text-xs); 
    color: var(--text-secondary); 
    margin: 2px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .notif-time { font-size: 10px; color: var(--text-tertiary); }
  .notif-dot { 
    width: 8px; height: 8px; 
    background: var(--primary-500); 
    border-radius: 50%; 
    flex-shrink: 0;
    animation: pulse 2s infinite;
  }
  .notif-empty { 
    padding: var(--space-8); 
    text-align: center; 
    color: var(--text-tertiary);
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .notif-footer {
    padding: var(--space-3);
    border-top: 1px solid var(--surface-border);
    text-align: center;
    background: var(--surface-elevated);
  }
`;
document.head.appendChild(notifStyles);

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => NexusNotifications.init());

window.NexusNotifications = NexusNotifications;
