/**
 * Módulo de Gestão de Chamados (Ticket Management)
 * Firestore (dados) + Supabase Storage (apenas anexos de arquivo)
 */

window.TicketManagement = {
    currentTab: 'received', // 'received' | 'created'
    tickets: [],
    usersCache: [],
    currentTicketId: null,

    async init() {
        // CSS já carregado no index.html
        await this.loadUsers();
    },

    getDb() {
        if (window.db) return window.db;
        if (typeof firebase !== 'undefined' && firebase.firestore) return firebase.firestore();
        return null;
    },

    async loadUsers() {
        // 1. Tentar pegar do UserManagement (Modulo ES)
        if (window.UserManagement && typeof window.UserManagement.getAllUsers === 'function') {
            try {
                const users = await window.UserManagement.getAllUsers();
                if (users && users.length > 0) {
                    this.usersCache = users;
                    console.log('[Tickets] Users loaded via UserManagement:', users.length);
                    return;
                }
            } catch (e) { console.warn('UserManagement fetch failed:', e); }
        }

        // 2. Fallback: Firestore Compat SDK (window.db)
        const db = this.getDb();
        if (db) {
            try {
                const snap = await db.collection('users').get();
                this.usersCache = [];
                snap.forEach(d => this.usersCache.push({ uid: d.id, ...d.data() }));
                console.log('[Tickets] Users loaded via Firestore:', this.usersCache.length);
            } catch (e) {
                console.warn('Firestore User Load Error:', e);
            }
        }

        if (this.usersCache.length === 0) {
            NexusApp.showToast('Aviso: Não foi possível carregar a lista de usuários.', 'warning');
        }
    },

    async loadTickets() {
        const db = this.getDb();
        const user = window.NepAuth?.getUser();
        if (!user || !db) return;

        try {
            const [createdSnap, assignedSnap] = await Promise.all([
                db.collection('tickets').where('created_by', '==', user.uid).get(),
                db.collection('tickets').where('assigned_to', '==', user.uid).get()
            ]);

            const byId = new Map();
            createdSnap.forEach(d => byId.set(d.id, { id: d.id, ...d.data() }));
            assignedSnap.forEach(d => byId.set(d.id, { id: d.id, ...d.data() }));

            this.tickets = Array.from(byId.values()).sort((a, b) => {
                const ta = a.created_at?.toMillis ? a.created_at.toMillis() : new Date(a.created_at || 0).getTime();
                const tb = b.created_at?.toMillis ? b.created_at.toMillis() : new Date(b.created_at || 0).getTime();
                return tb - ta;
            });

            console.log(`[Tickets] Carregados ${this.tickets.length} chamados.`);
        } catch (e) {
            console.error('[Tickets] Erro ao carregar:', e);
            NexusApp.showToast('Erro ao carregar chamados: ' + (e.message || 'Erro desconhecido'), 'error');
        }
    },

    render(container) {
        const db = this.getDb();
        if (!db) {
            container.innerHTML = '<div class="empty-state"><h3>Firestore não conectado</h3><p>Verifique a configuração do Firebase.</p></div>';
            return;
        }

        this.loadTickets().then(() => {
            this.renderUI(container);
        });
    },
    renderUI(container) {
        const user = window.NepAuth.getUser();
        const myCreated = this.tickets.filter(t => t.created_by === user.uid);
        const myReceived = this.tickets.filter(t => t.assigned_to === user.uid);

        const displayed = this.currentTab === 'created' ? myCreated : myReceived;

        container.innerHTML = `
          <div class="tickets-container animate-fade-in">
              <div class="tickets-header">
                  <div>
                      <h1 class="page-title"><i class="fa-solid fa-headset"></i> Gestão de Chamados</h1>
                      <p class="page-description">Central de solicitações e pendências</p>
                  </div>
                  <button class="btn btn-primary" onclick="TicketManagement.openNewTicketModal()">
                      <i class="fa-solid fa-plus"></i> Novo Chamado
                  </button>
              </div>

              <div class="tickets-stats">
                  <div class="tkt-stat-card">
                      <div class="tkt-stat-icon" style="color: #3b82f6;"><i class="fa-solid fa-inbox"></i></div>
                      <div class="tkt-stat-info">
                          <span class="tkt-stat-value">${myReceived.filter(t => t.status === 'new').length}</span>
                          <span class="tkt-stat-label">Pendentes (Recebidos)</span>
                      </div>
                  </div>
                  <div class="tkt-stat-card">
                      <div class="tkt-stat-icon" style="color: #f59e0b;"><i class="fa-solid fa-rotate-left"></i></div>
                      <div class="tkt-stat-info">
                          <span class="tkt-stat-value">${myCreated.filter(t => t.status === 'returned').length}</span>
                          <span class="tkt-stat-label">Devolvidos (Ação Necessária)</span>
                      </div>
                  </div>
                  <div class="tkt-stat-card">
                      <div class="tkt-stat-icon" style="color: #10b981;"><i class="fa-solid fa-check-circle"></i></div>
                      <div class="tkt-stat-info">
                          <span class="tkt-stat-value">${this.tickets.filter(t => t.status === 'resolved').length}</span>
                          <span class="tkt-stat-label">Total Resolvidos</span>
                      </div>
                  </div>
              </div>

              <div class="tkt-tabs">
                  <button class="tkt-tab ${this.currentTab === 'received' ? 'active' : ''}"
                          onclick="TicketManagement.switchTab('received')">
                      Recebidos (${myReceived.length})
                  </button>
                  <button class="tkt-tab ${this.currentTab === 'created' ? 'active' : ''}"
                          onclick="TicketManagement.switchTab('created')">
                      Criados por Mim (${myCreated.length})
                  </button>
              </div>

              <div class="tkt-list">
                  ${displayed.length === 0 ?
                `<div class="empty-state">
                          <div class="empty-state-icon">📭</div>
                          <p>Nenhum chamado encontrado nesta categoria.</p>
                      </div>` :
                displayed.map(t => this.renderTicketItem(t)).join('')
            }
              </div>
          </div>

          ${this.renderModals()}
      `;
    },

    renderTicketItem(t) {
        const assignee = this.usersCache.find(u => u.uid === t.assigned_to)?.nome || 'Usuário';
        const author = this.usersCache.find(u => u.uid === t.created_by)?.nome || 'Usuário';
        const isMine = t.created_by === window.NepAuth.getUser().uid;

        const statusMap = {
            'new': { l: 'Aguardando', c: 'badge-new' },
            'approved': { l: 'Aprovado', c: 'badge-approved' },
            'in_progress': { l: 'Em Andamento', c: 'badge-progress' },
            'returned': { l: 'Devolvido', c: 'badge-returned' },
            'resolved': { l: 'Resolvido', c: 'badge-done' },
            'closed': { l: 'Fechado', c: 'badge-closed' }
        };

        const st = statusMap[t.status] || { l: t.status, c: '' };
        const priorityLabel = { 'low': 'Baixa', 'medium': 'Média', 'high': 'Alta', 'critical': 'Crítica' }[t.priority];
        const priorityClass = `prio-${t.priority}`;
        const createdAt = t.created_at?.toDate ? t.created_at.toDate() : new Date(t.created_at || Date.now());

        return `
          <div class="tkt-item" onclick="TicketManagement.openTicketDetail('${t.id}')">
              <span class="tkt-id">#${t.ticket_number}</span>
              <div class="tkt-main">
                  <span class="tkt-title">${t.title}</span>
                  <span class="tkt-desc-preview">${t.description}</span>
              </div>
              <div class="tkt-meta">
                  <i class="fa-solid fa-${isMine ? 'user-tag' : 'user'}"></i>
                  ${isMine ? `Para: ${assignee}` : `De: ${author}`}
              </div>
              <span class="tkt-badge ${st.c}">${st.l}</span>
              <span class="${priorityClass}">${priorityLabel}</span>
              <span class="tkt-meta">${createdAt.toLocaleDateString()}</span>
          </div>
      `;
    },

    renderModals() {
        return `
          <!-- New Ticket Modal -->
          <div class="modal-backdrop" id="tkt-modal-new">
              <div class="modal">
                  <div class="modal-header">
                      <h3 class="modal-title">Novo Chamado</h3>
                      <button class="btn-icon" onclick="document.getElementById('tkt-modal-new').classList.remove('active')">✕</button>
                  </div>
                  <div class="modal-body">
                      <div class="form-group">
                          <label class="form-label">Destinatário <span style="color:red">*</span></label>
                          <select id="tkt-new-assignee" class="form-input form-select">
                              <option value="">Selecione um responsável...</option>
                              ${this.usersCache
                .filter(u => u.uid !== window.NepAuth.getUser().uid)
                .map(u => `<option value="${u.uid}">${u.nome} - ${u.setor || ''}</option>`)
                .join('')}
                          </select>
                      </div>
                      <div class="form-group">
                          <label class="form-label">Título <span style="color:red">*</span></label>
                          <input type="text" id="tkt-new-title" class="form-input" placeholder="Resumo do problema">
                      </div>
                      <div class="form-group">
                          <label class="form-label">Prioridade</label>
                          <select id="tkt-new-prio" class="form-input form-select">
                              <option value="low">Baixa</option>
                              <option value="medium" selected>Média</option>
                              <option value="high">Alta</option>
                              <option value="critical">Crítica 🔥</option>
                          </select>
                      </div>
                      <div class="form-group">
                          <label class="form-label">Descrição Detalhada <span style="color:red">*</span></label>
                          <textarea id="tkt-new-desc" class="form-input" rows="5" placeholder="Descreva a solicitação em detalhes..."></textarea>
                      </div>
                      <div class="form-group">
                          <label class="form-label">Prazo Ideal</label>
                          <input type="date" id="tkt-new-deadline" class="form-input">
                      </div>
                      <div class="form-group">
                          <label class="form-label">Anexos (PDF/Img - Max 2MB)</label>
                          <input type="file" id="tkt-new-file" class="form-input">
                      </div>
                  </div>
                  <div class="modal-footer">
                      <button class="btn btn-ghost" onclick="document.getElementById('tkt-modal-new').classList.remove('active')">Cancelar</button>
                      <button class="btn btn-primary" onclick="TicketManagement.createTicket()">Criar Chamado</button>
                  </div>
              </div>
          </div>

          <!-- Detail Modal -->
          <div class="modal-backdrop" id="tkt-modal-detail">
              <div class="modal" style="max-width: 900px; width: 95%;">
                  <div class="modal-header">
                      <h3 class="modal-title" id="tkt-detail-title">Chamado #...</h3>
                      <button class="btn-icon" onclick="document.getElementById('tkt-modal-detail').classList.remove('active')">✕</button>
                  </div>
                  <div class="modal-body" id="tkt-detail-body">
                      <!-- Populated dynamically -->
                  </div>
              </div>
          </div>
      `;
    },

    switchTab(tab) {
        this.currentTab = tab;
        this.render(document.getElementById('page-content'));
    },

    openNewTicketModal() {
        // Recarregar usuários se cache estiver vazio
        if (!this.usersCache || this.usersCache.length === 0) {
            this.loadUsers().then(() => {
                this.populateAssigneeSelect();
            });
        } else {
            this.populateAssigneeSelect();
        }
        document.getElementById('tkt-modal-new').classList.add('active');
    },

    populateAssigneeSelect() {
        const select = document.getElementById('tkt-new-assignee');
        if (!select) return;

        const currentUid = window.NepAuth.getUser()?.uid;
        const options = this.usersCache
            .filter(u => u.uid !== currentUid)
            .map(u => `<option value="${u.uid}">${u.nome} - ${u.setor || ''}</option>`)
            .join('');

        select.innerHTML = '<option value="">Selecione um responsável...</option>' + options;
    },

    async createTicket() {
        const assignee = document.getElementById('tkt-new-assignee').value;
        const title = document.getElementById('tkt-new-title').value.trim();
        const desc = document.getElementById('tkt-new-desc').value.trim();
        const prio = document.getElementById('tkt-new-prio').value;
        const deadline = document.getElementById('tkt-new-deadline').value;
        const fileInput = document.getElementById('tkt-new-file');
        const file = fileInput.files[0];

        if (!assignee || !title || !desc) {
            NexusApp.showToast('Preencha os campos obrigatórios.', 'error');
            return;
        }

        if (file && file.size > 2 * 1024 * 1024) {
            NexusApp.showToast('O arquivo excede o limite de 2MB.', 'error');
            return;
        }

        // Generate Ticket Number
        const num = 'NEP-' + Math.floor(1000 + Math.random() * 9000);

        try {
            NexusApp.showToast('Criando chamado...', 'info');
            const user = window.NepAuth.getUser();
            const db = this.getDb();
            if (!db) throw new Error('Firestore não inicializado.');

            // Anexo: continua usando Supabase Storage (arquivo binário), só o registro vai para o Firestore
            let attachmentUrl = null;
            if (file) {
                const client = window.sb || window.SupabaseClient?.client;
                if (!client) throw new Error('Storage de anexos (Supabase) não configurado.');

                const { error } = await client.storage
                    .from('tickets')
                    .upload(`${num}/${file.name}`, file);

                if (error) throw error;
                const { data: publicUrl } = client.storage.from('tickets').getPublicUrl(`${num}/${file.name}`);
                attachmentUrl = publicUrl.publicUrl;
            }

            await db.collection('tickets').add({
                ticket_number: num,
                title,
                description: desc,
                created_by: user.uid,
                assigned_to: assignee,
                status: 'new',
                priority: prio,
                deadline: deadline || null,
                attachment_url: attachmentUrl,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            NexusApp.showToast('Chamado criado com sucesso!', 'success');
            document.getElementById('tkt-modal-new').classList.remove('active');
            this.loadTickets().then(() => this.render(document.getElementById('page-content'))); // Refresh

            // Notificar o destinatário
            if (window.NexusNotifications) {
                window.NexusNotifications.add({
                    tipo: 'tarefa',
                    titulo: '🎫 Novo Chamado',
                    mensagem: `${user.nome || 'Alguém'} abriu um chamado para você: "${title}"`,
                    destinatario_uid: assignee,
                    referencia_tipo: 'ticket',
                    referencia_id: num
                });
            }

            // Gamification: Pontos por criar chamado (+5)
            if (window.NexusGamification) {
                window.NexusGamification.addPoints(user.uid, 5, 'TICKET_CREATED', `Criou chamado #${num}`);
            }

        } catch (e) {
            console.error(e);
            NexusApp.showToast('Erro ao criar chamado: ' + e.message, 'error');
        }
    },

    async openTicketDetail(id) {
        this.currentTicketId = id;
        const ticket = this.tickets.find(t => t.id === id);
        if (!ticket) return;

        const user = window.NepAuth.getUser();
        const isMyReceived = ticket.assigned_to === user.uid;
        const isMyCreated = ticket.created_by === user.uid;
        const deadlineDate = ticket.deadline ? new Date(ticket.deadline).toLocaleDateString() : 'Não definido';

        // HTML do corpo do modal
        const body = `
          <div class="tkt-modal-grid">
              <div class="tkt-details-main">
                  <div>
                      <span class="tkt-badge ${this.getStatusClass(ticket.status)}">${this.getStatusLabel(ticket.status)}</span>
                      <h2 style="margin-top:10px;">${ticket.title}</h2>
                  </div>

                  <div class="msg-bubble">
                      <p><strong>Descrição:</strong></p>
                      <p>${ticket.description}</p>
                  </div>

                  ${ticket.attachment_url ? `
                      <div class="attachment-box">
                          <i class="fa-solid fa-download"></i>
                          <a href="${ticket.attachment_url}" target="_blank" download>Baixar Anexo</a>
                      </div>
                  ` : ''}

                  <!-- History/Comments Placeholders (v2 impl) -->
                  <div class="tkt-timeline">
                      <h4>Histórico</h4>
                      <div class="timeline-placeholder" style="color:#666; font-size:12px;">Nenhum evento registrado ainda.</div>
                  </div>
              </div>

              <div class="tkt-details-sidebar">
                   <div class="form-group">
                       <label class="form-label">Prioridade</label>
                       <span class="prio-${ticket.priority}"><strong>${ticket.priority.toUpperCase()}</strong></span>
                   </div>
                   <div class="form-group">
                       <label class="form-label">Prazo</label>
                       <span>${deadlineDate}</span>
                   </div>

                   <!-- ACTIONS -->
                   <div class="action-bar-vertical">
                       ${this.renderActions(ticket, isMyReceived, isMyCreated)}
                   </div>
              </div>
          </div>
      `;

        document.getElementById('tkt-detail-title').innerText = `#${ticket.ticket_number}`;
        document.getElementById('tkt-detail-body').innerHTML = body;
        document.getElementById('tkt-modal-detail').classList.add('active');
    },

    renderActions(ticket, isReceiver, isCreator) {
        let buttons = '';

        if (isReceiver) {
            if (ticket.status === 'new' || ticket.status === 'returned') {
                buttons += `<button class="btn btn-success full" onclick="TicketManagement.updateStatus('${ticket.id}', 'approved')">Aprovar & Iniciar</button>`;
                buttons += `<button class="btn btn-warning full" onclick="TicketManagement.returnTicket('${ticket.id}')">Devolver</button>`;
            } else if (ticket.status === 'approved' || ticket.status === 'in_progress') {
                buttons += `<button class="btn btn-primary full" onclick="TicketManagement.updateStatus('${ticket.id}', 'resolved')">Marcar como Resolvido</button>`;
            }
        }

        if (isCreator) {
            if (ticket.status === 'resolved') {
                buttons += `<button class="btn btn-secondary full" onclick="TicketManagement.updateStatus('${ticket.id}', 'closed')">Fechar Chamado</button>`;
                buttons += `<button class="btn btn-warning full" onclick="TicketManagement.updateStatus('${ticket.id}', 'in_progress')">Reabrir</button>`;
            }
            if (ticket.status === 'returned') {
                buttons += `<button class="btn btn-primary full" style="margin-top:10px;">Editar e Reenviar</button>`;
            }
        }

        const isAdmin = localStorage.getItem('nep_is_admin') === 'true';

        // Botão de Excluir (Admin ou Criador)
        if (isCreator || isAdmin) {
            buttons += `<button class="btn btn-ghost full" style="margin-top:10px; color: #ef4444; border-color: #ef4444;" onclick="TicketManagement.deleteTicket('${ticket.id}')"><i class="fa-solid fa-trash"></i> Excluir Chamado</button>`;
        }

        return buttons;
    },

    async updateStatus(id, newStatus) {
        try {
            const db = this.getDb();
            await db.collection('tickets').doc(id).update({
                status: newStatus,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            NexusApp.showToast(`Status atualizado para: ${this.getStatusLabel(newStatus)}`, 'success');

            // Notificações de Status
            if (window.NexusNotifications) {
                const ticket = this.tickets.find(t => t.id === id);
                if (ticket) {
                    const currentUser = window.NepAuth.getUser();
                    let targetUid = null;
                    let msg = '';

                    // Se quem alterou foi o responsável -> Notifica o criador
                    if (currentUser.uid === ticket.assigned_to) {
                        targetUid = ticket.created_by;
                        msg = `Seu chamado #${ticket.ticket_number} foi atualizado para: ${this.getStatusLabel(newStatus)}`;
                    }
                    // Se quem alterou foi o criador (ex: reabriu) -> Notifica o responsável
                    else if (currentUser.uid === ticket.created_by) {
                        targetUid = ticket.assigned_to;
                        msg = `O chamado #${ticket.ticket_number} foi atualizado pelo solicitante.`;
                    }

                    if (targetUid) {
                        window.NexusNotifications.add({
                            tipo: 'sistema',
                            titulo: '🎫 Atualização de Chamado',
                            mensagem: msg,
                            destinatario_uid: targetUid,
                            referencia_tipo: 'ticket',
                            referencia_id: ticket.ticket_number
                        });
                    }

                    // Gamification: Pontos por Resolver (+15)
                    if (window.NexusGamification && newStatus === 'resolved') {
                        // Quem ganha é quem resolveu (atribuído)
                        window.NexusGamification.addPoints(ticket.assigned_to, 15, 'TICKET_RESOLVED', `Resolvido chamado #${ticket.ticket_number}`);
                    }
                }
            }

            this.loadTickets().then(() => {
                document.getElementById('tkt-modal-detail').classList.remove('active');
                this.render(document.getElementById('page-content'));
            });
        } catch (e) {
            console.error(e);
            NexusApp.showToast('Erro ao atualizar status', 'error');
        }
    },

    async deleteTicket(id) {
        if (!confirm('Tem certeza que deseja excluir este chamado? Esta ação não pode ser desfeita.')) return;

        try {
            const db = this.getDb();
            await db.collection('tickets').doc(id).delete();

            NexusApp.showToast('Chamado excluído com sucesso.', 'success');
            document.getElementById('tkt-modal-detail').classList.remove('active');

            // Refresh
            this.loadTickets().then(() => {
                this.render(document.getElementById('page-content'));
            });

        } catch (e) {
            console.error(e);
            NexusApp.showToast('Erro ao excluir chamado: ' + e.message, 'error');
        }
    },

    returnTicket(id) {
        const reason = prompt("Motivo da devolução:");
        if (reason) {
            // Idealmente salvar o comentário no histórico
            this.updateStatus(id, 'returned');
            // TODO: Append comment logic
        }
    },

    getStatusLabel(s) {
        const map = { 'new': 'Aguardando', 'approved': 'Aprovado', 'in_progress': 'Em Andamento', 'returned': 'Devolvido', 'resolved': 'Resolvido', 'closed': 'Fechado' };
        return map[s] || s;
    },

    getStatusClass(s) {
        const map = { 'new': 'badge-new', 'approved': 'badge-approved', 'in_progress': 'badge-progress', 'returned': 'badge-returned', 'resolved': 'badge-done', 'closed': 'badge-closed' };
        return map[s] || '';
    }
};
