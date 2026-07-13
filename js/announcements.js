/**
 * NEP DELIVERY CONTROL - ANNOUNCEMENTS
 * Módulo de Avisos completo e funcional
 * Funciona para todos os usuários com Firestore + Fallback Local
 */

const AnnouncementsService = {
    // SEGURANÇA: escape anti-XSS
    _esc(v) {
        if (window.escapeHtml) return window.escapeHtml(v);
        return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    COLLECTION: 'announcements',
    LOCAL_KEY: 'nep_announcements_local',

    ROLES: ['ADMIN', 'SUPERINTENDENTE', 'GERENTE', 'CONSULTOR', 'COORDENADOR', 'ANALISTA', 'MONITOR'],

    /**
     * Verificar se Firestore está disponível
     */
    isFirestoreAvailable() {
        return window.firebase && window.firebase.firestore;
    },

    /**
     * Obter instância do Firestore
     */
    getDb() {
        if (this.isFirestoreAvailable()) {
            return window.firebase.firestore();
        }
        return null;
    },

    /**
     * Criar novo aviso
     */
    async create(titulo, conteudo, alcance = 'TODOS', prioridade = 'normal') {
        const aviso = {
            titulo,
            conteudo,
            alcance, // 'TODOS' ou array de cargos
            prioridade, // 'alta', 'normal', 'baixa'
            autor_uid: localStorage.getItem('nep_user_uid') || 'unknown',
            autor_nome: localStorage.getItem('nep_user_name') || 'Admin',
            autor_cargo: localStorage.getItem('nep_user_label') || 'Sistema',
            ativo: true,
            lido_por: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const db = this.getDb();
        let avisoId = null;

        if (db) {
            try {
                const docRef = await db.collection(this.COLLECTION).add({
                    ...aviso,
                    created_at: firebase.firestore.FieldValue.serverTimestamp(),
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
                avisoId = docRef.id;
            } catch (error) {
                console.warn('[Announcements] Firestore falhou, usando local:', error);
            }
        }

        // Fallback local
        if (!avisoId) {
            const localAvisos = this.getLocalAvisos();
            aviso.id = 'local_' + Date.now();
            avisoId = aviso.id;
            localAvisos.unshift(aviso);
            this.saveLocalAvisos(localAvisos);
        }

        // Disparar notificação para usuários do alcance
        if (window.NexusNotifications) {
            const iconePrioridade = prioridade === 'alta' ? '🔴' : prioridade === 'normal' ? '🟡' : '🟢';
            const notifData = {
                tipo: 'aviso',
                titulo: `${iconePrioridade} Novo Aviso: ${titulo}`,
                mensagem: conteudo.substring(0, 100) + (conteudo.length > 100 ? '...' : ''),
                referencia_tipo: 'aviso',
                referencia_id: avisoId
            };

            if (alcance === 'TODOS') {
                // Broadcast para todos
                await NexusNotifications.notifyAll(notifData);
            } else if (Array.isArray(alcance)) {
                // Notificar cada cargo específico
                for (const cargo of alcance) {
                    await NexusNotifications.notifyRole(cargo, notifData);
                }
            }
        }

        return { success: true, id: avisoId };
    },


    /**
     * Listar avisos visíveis para o cargo atual
     */
    async listForUser(cargoAtual = null) {
        // Usar nep_cargo (key como ADMIN) em vez de nep_user_label (label como Administrador)
        const cargo = (cargoAtual || localStorage.getItem('nep_cargo') || localStorage.getItem('nep_user_role_key') || 'MONITOR').toUpperCase();
        const isAdmin = localStorage.getItem('nep_is_admin') === 'true';
        let avisos = [];

        const db = this.getDb();
        if (db) {
            try {
                const snapshot = await db.collection(this.COLLECTION)
                    .where('ativo', '==', true)
                    .orderBy('created_at', 'desc')
                    .limit(50)
                    .get();

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const alcance = data.alcance;

                    // Admin vê todos os avisos; outros veem 'TODOS' ou seu cargo específico
                    const canSee = isAdmin ||
                        alcance === 'TODOS' ||
                        (Array.isArray(alcance) && alcance.includes(cargo));

                    if (canSee) {
                        avisos.push({
                            id: doc.id,
                            ...data,
                            created_at: data.created_at?.toDate?.()?.toLocaleString('pt-BR') || data.created_at || 'N/A'
                        });
                    }
                });

                return avisos;
            } catch (error) {
                console.warn('[Announcements] Firestore falhou, usando local:', error);
            }
        }

        // Fallback local
        return this.getLocalAvisos().filter(a => {
            if (!a.ativo) return false;
            if (isAdmin) return true;
            if (a.alcance === 'TODOS') return true;
            if (Array.isArray(a.alcance) && a.alcance.includes(cargo)) return true;
            return false;
        });
    },

    /**
     * Inscrever para atualizações em tempo real
     */
    subscribeForUser(callback) {
        const cargo = (localStorage.getItem('nep_cargo') || localStorage.getItem('nep_user_role_key') || 'MONITOR').toUpperCase();
        const isAdmin = localStorage.getItem('nep_is_admin') === 'true';
        const db = this.getDb();

        if (!db) {
            // Fallback para local sem realtime
            callback(this.listForUserLocalOnly(cargo, isAdmin));
            return () => { };
        }

        try {
            // Firestore não suporta OR em queries complexas facilmente, 
            // então vamos ouvir todos os ativos e filtrar no cliente
            // Isso consome um pouco mais de leitura mas garante RT
            const query = db.collection(this.COLLECTION)
                .where('ativo', '==', true)
                .orderBy('created_at', 'desc')
                .limit(50);

            return query.onSnapshot(snapshot => {
                const avisos = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const alcance = data.alcance;

                    // Filtragem de permissão
                    const canSee = isAdmin ||
                        alcance === 'TODOS' ||
                        (Array.isArray(alcance) && alcance.includes(cargo));

                    if (canSee) {
                        avisos.push({
                            id: doc.id,
                            ...data,
                            created_at: data.created_at?.toDate?.()?.toLocaleString('pt-BR') || 'N/A'
                        });
                    }
                });
                callback(avisos);
            }, error => {
                console.warn('[Announcements] Erro no listener:', error);
                callback(this.listForUserLocalOnly(cargo, isAdmin));
            });
        } catch (error) {
            console.warn('[Announcements] Erro ao criar subscription:', error);
            callback(this.listForUserLocalOnly(cargo, isAdmin));
            return () => { };
        }
    },

    listForUserLocalOnly(cargo, isAdmin) {
        return this.getLocalAvisos().filter(a => {
            if (!a.ativo) return false;
            if (isAdmin) return true;
            if (a.alcance === 'TODOS') return true;
            if (Array.isArray(a.alcance) && a.alcance.includes(cargo)) return true;
            return false;
        });
    },

    /**
     * Listar todos os avisos (para admin)
     */
    async listAll() {
        const db = this.getDb();
        if (db) {
            try {
                const snapshot = await db.collection(this.COLLECTION)
                    .orderBy('created_at', 'desc')
                    .limit(100)
                    .get();

                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    created_at: doc.data().created_at?.toDate?.()?.toLocaleString('pt-BR') || 'N/A'
                }));
            } catch (error) {
                console.warn('[Announcements] Firestore falhou:', error);
            }
        }

        return this.getLocalAvisos();
    },

    /**
     * Marcar aviso como lido
     */
    async markAsRead(avisoId) {
        const uid = localStorage.getItem('nep_user_uid');
        if (!uid) return { success: false };

        const db = this.getDb();
        if (db && !avisoId.startsWith('local_')) {
            try {
                const docRef = db.collection(this.COLLECTION).doc(avisoId);
                const docSnap = await docRef.get();

                if (docSnap.exists) {
                    const lidoPor = docSnap.data().lido_por || [];
                    if (!lidoPor.includes(uid)) {
                        await docRef.update({
                            lido_por: firebase.firestore.FieldValue.arrayUnion(uid)
                        });
                    }
                }
                return { success: true };
            } catch (error) {
                console.warn('[Announcements] Erro ao marcar como lido:', error);
            }
        }

        // Fallback local
        const localAvisos = this.getLocalAvisos();
        const aviso = localAvisos.find(a => a.id === avisoId);
        if (aviso && !aviso.lido_por.includes(uid)) {
            aviso.lido_por.push(uid);
            this.saveLocalAvisos(localAvisos);
        }
        return { success: true };
    },

    /**
     * Obter contagem de não lidos
     */
    async getUnreadCount() {
        const avisos = await this.listForUser();
        const uid = localStorage.getItem('nep_user_uid');
        return avisos.filter(a => !(a.lido_por || []).includes(uid)).length;
    },

    /**
     * Atualizar aviso
     */
    async update(avisoId, updates) {
        const db = this.getDb();
        if (db && !avisoId.startsWith('local_')) {
            try {
                await db.collection(this.COLLECTION).doc(avisoId).update({
                    ...updates,
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
                return { success: true };
            } catch (error) {
                console.warn('[Announcements] Erro ao atualizar:', error);
            }
        }

        // Fallback local
        const localAvisos = this.getLocalAvisos();
        const idx = localAvisos.findIndex(a => a.id === avisoId);
        if (idx !== -1) {
            localAvisos[idx] = { ...localAvisos[idx], ...updates, updated_at: new Date().toISOString() };
            this.saveLocalAvisos(localAvisos);
        }
        return { success: true };
    },

    /**
     * Desativar aviso (soft delete)
     */
    async deactivate(avisoId) {
        return this.update(avisoId, { ativo: false });
    },

    /**
     * Excluir aviso permanentemente
     */
    async delete(avisoId) {
        const db = this.getDb();
        if (db && !avisoId.startsWith('local_')) {
            try {
                await db.collection(this.COLLECTION).doc(avisoId).delete();
                return { success: true };
            } catch (error) {
                console.warn('[Announcements] Erro ao excluir:', error);
            }
        }

        // Fallback local
        const localAvisos = this.getLocalAvisos().filter(a => a.id !== avisoId);
        this.saveLocalAvisos(localAvisos);
        return { success: true };
    },

    // Helpers locais
    getLocalAvisos() {
        try {
            return JSON.parse(localStorage.getItem(this.LOCAL_KEY) || '[]');
        } catch {
            return [];
        }
    },

    saveLocalAvisos(avisos) {
        localStorage.setItem(this.LOCAL_KEY, JSON.stringify(avisos));
    }
};

// UI Component
const NexusAnnouncements = {
    avisos: [],
    isAdmin: false,
    unsubscribe: null,

    async render(container) {
        this.isAdmin = localStorage.getItem('nep_is_admin') === 'true';
        // Cargos que podem criar avisos
        const canCreateRoles = ['ADMIN', 'SUPERINTENDENTE', 'GERENTE', 'COORDENADOR', 'CONSULTOR'];
        const userRole = (localStorage.getItem('nep_cargo') || localStorage.getItem('nep_user_role_key') || '').toUpperCase();
        const canCreate = this.isAdmin || canCreateRoles.includes(userRole);

        container.innerHTML = `
            <div class="announcements-page animate-fade-in">
                <div class="ann-header">
                    <div>
                        <h1 class="ann-title">📢 Avisos</h1>
                        <p class="ann-subtitle">Comunicados importantes da equipe</p>
                    </div>
                    ${canCreate ? `
                        <button class="btn btn-primary" id="btn-new-announcement">
                            <i class="fa-solid fa-plus"></i> Novo Aviso
                        </button>
                    ` : ''}
                </div>

                <div class="ann-filters">
                    <button class="ann-filter active" data-filter="all">Todos</button>
                    <button class="ann-filter" data-filter="unread">Não lidos</button>
                    ${this.isAdmin ? `<button class="ann-filter" data-filter="mine">Meus avisos</button>` : ''}
                </div>

                <div class="ann-list" id="announcements-list">
                    <div class="ann-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando avisos...</div>
                </div>
            </div>
        `;

        this.injectStyles();

        // Limpar subscription anterior se houver
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        // Iniciar subscription
        this.unsubscribe = AnnouncementsService.subscribeForUser((avisos) => {
            this.avisos = avisos;
            this.renderList();
        });

        this.attachEvents();
    },

    // Método helper para renderizar lista com base no estado atual e filtros
    renderList(filter = null) {
        const container = document.getElementById('announcements-list');
        if (!container) return;

        // Se filtro não foi passado, tenta pegar o ativo da UI, ou default 'all'
        if (!filter) {
            const activeBtn = document.querySelector('.ann-filter.active');
            filter = activeBtn ? activeBtn.dataset.filter : 'all';
        }

        const currentUid = localStorage.getItem('nep_user_uid');

        // Aplicar filtro
        let filteredAvisos = this.avisos;
        if (filter === 'unread') {
            filteredAvisos = this.avisos.filter(a => !(a.lido_por || []).includes(currentUid));
        } else if (filter === 'mine') {
            filteredAvisos = this.avisos.filter(a => a.autor_uid === currentUid);
        }

        if (!filteredAvisos.length) {
            container.innerHTML = `
                <div class="ann-empty">
                    <div class="ann-empty-icon">📭</div>
                    <h3>Nenhum aviso</h3>
                    <p>${filter === 'unread' ? 'Você leu todos os avisos!' : 'Não há avisos para exibir.'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredAvisos.map(aviso => this.renderAnnouncementCard(aviso, currentUid)).join('');

        // Marcar como lido automaticamente após 2 segundos
        setTimeout(() => {
            filteredAvisos.filter(a => !(a.lido_por || []).includes(currentUid)).forEach(aviso => {
                AnnouncementsService.markAsRead(aviso.id);
            });
        }, 3000);

        this.attachCardEvents();
    },

    loadAnnouncements(filter = 'all') {
        // Legacy method adapter - just calls renderList now since updates are automatic
        this.renderList(filter);
    },

    renderAnnouncementCard(aviso, currentUid) {
        const isRead = (aviso.lido_por || []).includes(currentUid);
        const isOwner = aviso.autor_uid === currentUid;
        const prioridadeClass = aviso.prioridade === 'alta' ? 'high-priority' : '';
        const initials = (aviso.autor_nome || 'A').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

        return `
            <div class="ann-card ${isRead ? 'read' : 'unread'} ${prioridadeClass}" data-id="${aviso.id}">
                ${aviso.prioridade === 'alta' ? '<div class="ann-priority-badge">🔴 Urgente</div>' : ''}
                <div class="ann-card-header">
                    <div class="ann-author">
                        <div class="ann-avatar">${initials}</div>
                        <div class="ann-author-info">
                            <span class="ann-author-name">${aviso.autor_nome || 'Autor'}</span>
                            <span class="ann-author-meta">${aviso.autor_cargo || 'N/A'} • ${aviso.created_at}</span>
                        </div>
                    </div>
                    ${!isRead ? '<span class="ann-new-badge">Novo</span>' : ''}
                </div>
                
                <h3 class="ann-card-title">${this._esc(aviso.titulo)}</h3>
                <p class="ann-card-content">${this._esc(aviso.conteudo)}</p>
                
                <div class="ann-card-footer">
                    <span class="ann-scope">
                        <i class="fa-solid fa-users"></i>
                        ${aviso.alcance === 'TODOS' ? 'Todos' : Array.isArray(aviso.alcance) ? aviso.alcance.join(', ') : aviso.alcance}
                    </span>
                    
                    ${this.isAdmin || isOwner ? `
                        <div class="ann-actions">
                            <button class="ann-action-btn" data-action="edit" data-id="${aviso.id}" title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="ann-action-btn danger" data-action="delete" data-id="${aviso.id}" title="Excluir">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    attachEvents() {
        // Novo aviso
        document.getElementById('btn-new-announcement')?.addEventListener('click', () => this.showModal());

        // Filtros
        document.querySelectorAll('.ann-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.ann-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadAnnouncements(btn.dataset.filter);
            });
        });
    },

    attachCardEvents() {
        // Edit
        document.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const aviso = this.avisos.find(a => a.id === btn.dataset.id);
                if (aviso) this.showModal(aviso);
            });
        });

        // Delete
        document.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Tem certeza que deseja excluir este aviso?')) {
                    await AnnouncementsService.delete(btn.dataset.id);
                    NexusApp?.showToast?.('Aviso excluído!', 'success');
                    this.loadAnnouncements();
                }
            });
        });
    },

    showModal(aviso = null) {
        document.getElementById('ann-modal')?.remove();

        const isEdit = aviso !== null;
        const titulo = aviso?.titulo || '';
        const conteudo = aviso?.conteudo || '';
        const alcance = aviso?.alcance || 'TODOS';
        const prioridade = aviso?.prioridade || 'normal';
        const selectedRoles = Array.isArray(alcance) ? alcance : [];
        const isTodos = alcance === 'TODOS';

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'ann-modal';
        modal.innerHTML = `
            <div class="modal-container" style="max-width: 550px;">
                <div class="modal-header">
                    <h3><i class="fa-solid fa-bullhorn"></i> ${isEdit ? 'Editar Aviso' : 'Novo Aviso'}</h3>
                    <button class="modal-close" id="ann-modal-close"><i class="fa-solid fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Título *</label>
                        <input type="text" id="ann-titulo" class="form-input" value="${titulo}" placeholder="Título do aviso">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Conteúdo *</label>
                        <textarea id="ann-conteudo" class="form-input" rows="5" placeholder="Escreva o conteúdo do aviso...">${conteudo}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Prioridade</label>
                        <select id="ann-prioridade" class="form-input">
                            <option value="baixa" ${prioridade === 'baixa' ? 'selected' : ''}>🟢 Baixa</option>
                            <option value="normal" ${prioridade === 'normal' ? 'selected' : ''}>🟡 Normal</option>
                            <option value="alta" ${prioridade === 'alta' ? 'selected' : ''}>🔴 Alta (Urgente)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Quem deve ver este aviso?</label>
                        <div class="ann-scope-options">
                            <label class="ann-scope-option ${isTodos ? 'selected' : ''}">
                                <input type="radio" name="ann-alcance-tipo" value="todos" ${isTodos ? 'checked' : ''}>
                                <span><i class="fa-solid fa-globe"></i> Todos</span>
                            </label>
                            <label class="ann-scope-option ${!isTodos ? 'selected' : ''}">
                                <input type="radio" name="ann-alcance-tipo" value="especifico" ${!isTodos ? 'checked' : ''}>
                                <span><i class="fa-solid fa-filter"></i> Cargos específicos</span>
                            </label>
                        </div>
                        
                        <div class="ann-roles-grid" id="ann-roles-container" style="${isTodos ? 'display: none;' : ''}">
                            ${AnnouncementsService.ROLES.map(role => `
                                <label class="ann-role-checkbox">
                                    <input type="checkbox" class="ann-role" value="${role}" ${selectedRoles.includes(role) ? 'checked' : ''}>
                                    <span>${role}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="ann-cancel-btn">Cancelar</button>
                    <button class="btn btn-primary" id="ann-save-btn">
                        <i class="fa-solid fa-paper-plane"></i> ${isEdit ? 'Salvar' : 'Publicar'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Eventos do modal
        document.getElementById('ann-modal-close').addEventListener('click', () => modal.remove());
        document.getElementById('ann-cancel-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        // Toggle tipo de alcance
        document.querySelectorAll('[name="ann-alcance-tipo"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.querySelectorAll('.ann-scope-option').forEach(opt => opt.classList.remove('selected'));
                e.target.closest('.ann-scope-option').classList.add('selected');
                document.getElementById('ann-roles-container').style.display = e.target.value === 'todos' ? 'none' : 'flex';
            });
        });

        // Salvar
        document.getElementById('ann-save-btn').addEventListener('click', async () => {
            const tituloVal = document.getElementById('ann-titulo').value.trim();
            const conteudoVal = document.getElementById('ann-conteudo').value.trim();
            const prioridadeVal = document.getElementById('ann-prioridade').value;
            const isTodosVal = document.querySelector('[name="ann-alcance-tipo"]:checked').value === 'todos';
            const rolesVal = Array.from(document.querySelectorAll('.ann-role:checked')).map(cb => cb.value);

            if (!tituloVal || !conteudoVal) {
                NexusApp?.showToast?.('Preencha título e conteúdo', 'error');
                return;
            }

            if (!isTodosVal && rolesVal.length === 0) {
                NexusApp?.showToast?.('Selecione pelo menos um cargo', 'error');
                return;
            }

            const alcanceVal = isTodosVal ? 'TODOS' : rolesVal;

            try {
                if (isEdit) {
                    await AnnouncementsService.update(aviso.id, {
                        titulo: tituloVal,
                        conteudo: conteudoVal,
                        alcance: alcanceVal,
                        prioridade: prioridadeVal
                    });
                    NexusApp?.showToast?.('Aviso atualizado!', 'success');
                } else {
                    await AnnouncementsService.create(tituloVal, conteudoVal, alcanceVal, prioridadeVal);
                    NexusApp?.showToast?.('Aviso publicado!', 'success');
                }
                modal.remove();
                this.loadAnnouncements();
            } catch (err) {
                NexusApp?.showToast?.('Erro ao salvar: ' + err.message, 'error');
            }
        });
    },

    injectStyles() {
        if (document.getElementById('announcements-styles')) return;

        const style = document.createElement('style');
        style.id = 'announcements-styles';
        style.textContent = `
            .announcements-page { max-width: 800px; margin: 0 auto; }
            
            .ann-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
            .ann-title { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
            .ann-subtitle { color: var(--text-secondary); }
            
            .ann-filters { display: flex; gap: 8px; margin-bottom: 24px; }
            .ann-filter { padding: 8px 16px; background: var(--surface-elevated); border: 1px solid var(--surface-border); border-radius: 20px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
            .ann-filter:hover { background: var(--surface-hover); }
            .ann-filter.active { background: var(--primary-500); color: white; border-color: var(--primary-500); }
            
            .ann-list { display: flex; flex-direction: column; gap: 16px; }
            .ann-loading { text-align: center; padding: 40px; color: var(--text-secondary); }
            .ann-error { text-align: center; padding: 40px; color: var(--error-500); }
            .ann-empty { text-align: center; padding: 60px 20px; }
            .ann-empty-icon { font-size: 64px; margin-bottom: 16px; }
            .ann-empty h3 { margin-bottom: 8px; }
            .ann-empty p { color: var(--text-secondary); }
            
            .ann-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 16px; padding: 20px; transition: all 0.2s; position: relative; }
            .ann-card.unread { border-left: 4px solid var(--accent-500); }
            .ann-card.high-priority { border-left: 4px solid var(--error-500); background: rgba(239, 68, 68, 0.05); }
            .ann-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
            
            .ann-priority-badge { position: absolute; top: 12px; right: 12px; font-size: 11px; font-weight: 600; }
            
            .ann-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
            .ann-author { display: flex; gap: 12px; align-items: center; }
            .ann-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #9c5cff); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px; }
            .ann-author-name { font-weight: 600; display: block; }
            .ann-author-meta { font-size: 12px; color: var(--text-tertiary); }
            .ann-new-badge { background: var(--accent-500); color: white; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
            
            .ann-card-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
            .ann-card-content { color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px; white-space: pre-wrap; }
            
            .ann-card-footer { display: flex; justify-content: space-between; align-items: center; }
            .ann-scope { font-size: 12px; color: var(--text-tertiary); display: flex; align-items: center; gap: 6px; }
            .ann-actions { display: flex; gap: 8px; }
            .ann-action-btn { width: 32px; height: 32px; border-radius: 8px; background: var(--surface-elevated); border: 1px solid var(--surface-border); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
            .ann-action-btn:hover { background: var(--surface-hover); }
            .ann-action-btn.danger:hover { background: rgba(239, 68, 68, 0.1); color: var(--error-500); }
            
            /* Modal styles */
            .ann-scope-options { display: flex; gap: 12px; margin-bottom: 16px; }
            .ann-scope-option { flex: 1; padding: 12px; border: 1px solid var(--surface-border); border-radius: 10px; cursor: pointer; text-align: center; transition: all 0.2s; }
            .ann-scope-option input { display: none; }
            .ann-scope-option span { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 13px; }
            .ann-scope-option span i { font-size: 20px; }
            .ann-scope-option:hover { border-color: var(--primary-400); }
            .ann-scope-option.selected { background: rgba(47, 111, 237, 0.1); border-color: var(--primary-500); color: var(--primary-500); }
            
            .ann-roles-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
            .ann-role-checkbox { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--surface-elevated); border-radius: 8px; cursor: pointer; font-size: 12px; transition: all 0.2s; }
            .ann-role-checkbox:hover { background: var(--surface-hover); }
            .ann-role-checkbox input:checked + span { color: var(--primary-500); font-weight: 600; }
            
            @media (max-width: 600px) {
                .ann-header { flex-direction: column; gap: 16px; }
                .ann-scope-options { flex-direction: column; }
            }
        `;
        document.head.appendChild(style);
    }
};

// Expor globalmente
window.AnnouncementsService = AnnouncementsService;
window.NexusAnnouncements = NexusAnnouncements;
