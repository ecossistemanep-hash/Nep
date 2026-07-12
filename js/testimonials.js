/**
 * NEXUS TESTIMONIALS (NEP DEPOIMENTOS)
 * Módulo de Elogios e Reconhecimento com Sistema de Aprovação
 */

const NexusTestimonials = {
    // SEGURANÇA: escape anti-XSS — depoimentos podem vir de formulário público anônimo
    _esc(v) {
        if (window.escapeHtml) return window.escapeHtml(v);
        return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    db: null,
    unsubscribe: null,
    items: [],
    pendingItems: [],
    showingPending: false,
    cachedUsers: [],  // Cache de usuarios para autocomplete

    // Roles que podem aprovar depoimentos
    approverRoles: ['SUPERINTENDENTE', 'GERENTE', 'DIRETOR', 'ADMIN'],

    isAdmin() {
        const user = NepAuth?.getUser?.();
        if (!user) return false;
        if (user.isAdmin) return true;
        const cargo = (user.cargo || user.roleKey || '').toUpperCase();
        return cargo.includes('ADMIN');
    },

    init() {
        if (window.db) {
            this.db = window.db;
            this.setupStyles();
        } else {
            console.error('[Testimonials] Firestore não disponível');
        }
    },

    canApprove() {
        const user = NepAuth?.getUser?.();
        if (!user) return false;

        // Admin sempre pode
        if (user.isAdmin) return true;

        // Verifica cargo
        const cargo = (user.cargo || user.roleKey || '').toUpperCase();
        return this.approverRoles.some(role => cargo.includes(role));
    },

    render(container) {
        if (!this.db) this.init();
        const canApprove = this.canApprove();

        container.innerHTML = `
            <div class="testimonials-page animate-fade-in">
                <div class="tm-header">
                    <div>
                        <h2 class="tm-title">✨ NEP Depoimentos</h2>
                        <p class="tm-subtitle">Espaço para reconhecer e celebrar conquistas.</p>
                    </div>
                    <div class="tm-actions">
                    ${canApprove ? `
                        <button class="btn ${this.showingPending ? 'btn-warning' : 'btn-outline'}" id="btn-pending-tm">
                            <i class="fa-solid fa-clock"></i> 
                            Pendentes <span class="tm-badge" id="pending-count">0</span>
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" id="btn-share-externo">
                        <i class="fa-solid fa-user-tie"></i> Cliente Externo
                    </button>
                    <button class="btn btn-secondary" id="btn-share-interno">
                        <i class="fa-solid fa-building"></i> Interno AeC
                    </button>
                </div>
                </div>

                ${canApprove && this.showingPending ? `
                    <div class="tm-pending-section">
                        <div class="tm-pending-header">
                            <h3><i class="fa-solid fa-hourglass-half"></i> Aguardando Aprovação</h3>
                            <button class="btn btn-sm btn-secondary" id="btn-back-mural">
                                <i class="fa-solid fa-arrow-left"></i> Voltar ao Mural
                            </button>
                        </div>
                        <div class="tm-pending-grid" id="tm-pending-grid">
                            <div class="tm-loading">
                                <i class="fa-solid fa-spinner fa-spin"></i> Carregando pendentes...
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="tm-grid" id="tm-grid">
                        <div class="tm-loading">
                            <i class="fa-solid fa-spinner fa-spin"></i> Carregando Mural...
                        </div>
                    </div>
                `}
            </div>

            <!-- Modal de Novo Elogio Interno -->
            <div id="modal-tm" class="tm-modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Novo Elogio</h3>
                        <button class="btn-close-modal"><i class="fa-solid fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Para quem?</label>
                            <div class="tm-autocomplete-container">
                                <input type="text" id="tm-target" class="form-input" placeholder="Digite o nome do colega..." autocomplete="off">
                                <input type="hidden" id="tm-target-uid">
                                <div id="tm-user-dropdown" class="tm-user-dropdown"></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Mensagem</label>
                            <textarea id="tm-msg" class="form-input" rows="4" placeholder="Escreva algo inspirador..."></textarea>
                        </div>
                        <div class="form-group">
                            <label>Tags</label>
                            <div class="tags-grid" id="tm-tags-select">
                                <span class="tag-opt" onclick="this.classList.toggle('selected')">#Inovação</span>
                                <span class="tag-opt" onclick="this.classList.toggle('selected')">#TrabalhoEmEquipe</span>
                                <span class="tag-opt" onclick="this.classList.toggle('selected')">#FocoNoCliente</span>
                                <span class="tag-opt" onclick="this.classList.toggle('selected')">#Proatividade</span>
                                <span class="tag-opt" onclick="this.classList.toggle('selected')">#Liderança</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="btn-save-tm">Enviar 💙</button>
                    </div>
                </div>
            </div>

            <!-- Modal QR Code -->
            <div id="modal-qr" class="tm-modal-overlay">
                <div class="modal-content" style="max-width:380px; text-align:center;">
                    <div class="modal-header">
                        <h3 id="qr-modal-title"><i class="fa-solid fa-qrcode"></i> QR Code</h3>
                        <button class="btn-close-qr"><i class="fa-solid fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <p id="qr-modal-desc" style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1.2rem;"></p>
                        <div id="qr-canvas-container" style="display:flex;justify-content:center;align-items:center;padding:16px;background:#fff;border-radius:12px;margin:0 auto;width:fit-content;"></div>
                        <p id="qr-url-text" style="font-size:0.75rem;color:var(--text-dim);margin-top:1rem;word-break:break-all;"></p>
                    </div>
                    <div class="modal-footer" style="gap:0.75rem;">
                        <button class="btn btn-outline" id="btn-qr-copy"><i class="fa-solid fa-copy"></i> Copiar Link</button>
                        <button class="btn btn-primary" id="btn-qr-download"><i class="fa-solid fa-download"></i> Baixar QR</button>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.subscribe();
        this.loadUsers();
    },

    async loadUsers() {
        try {
            const snap = await this.db.collection('users').get();
            this.cachedUsers = snap.docs.map(doc => ({
                uid: doc.id,
                name: doc.data().nome || doc.data().name || doc.data().displayName || 'Sem nome',
                email: doc.data().email || '',
                logos: doc.data().logos || [],
                setor: doc.data().setor || ''
            })).filter(u => u.name && u.name !== 'Sem nome');
            console.log('[Testimonials] Carregados', this.cachedUsers.length, 'usuarios para autocomplete');
        } catch (e) {
            console.error('[Testimonials] Erro ao carregar usuarios:', e);
        }
    },

    subscribe() {
        if (this.unsubscribe) this.unsubscribe();

        // Buscar todos os depoimentos
        this.unsubscribe = this.db.collection('testimonials')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .onSnapshot(snapshot => {
                let filteredItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                if (window.LogoService && window.LogoService.shouldFilterByLogo()) {
                    filteredItems = filteredItems.filter(item => {
                        const checkUser = (uid, name) => {
                            let user = null;
                            if (uid) user = this.cachedUsers.find(u => u.uid === uid);
                            if (!user && name) {
                                const nameL = name.trim().toLowerCase();
                                user = this.cachedUsers.find(u => u.name.toLowerCase().includes(nameL) || nameL.includes(u.name.toLowerCase()));
                            }
                            return user ? window.LogoService.canSeeUser(user) : true;
                        };

                        return checkUser(item.toUid, item.toName) || checkUser(item.fromUid, item.fromName);
                    });
                }

                // Separar aprovados e pendentes
                this.items = filteredItems.filter(item => item.approved === true);
                this.pendingItems = filteredItems.filter(item => item.approved !== true && !item.rejected);

                // Atualizar contador de pendentes
                const badge = document.getElementById('pending-count');
                if (badge) {
                    badge.textContent = this.pendingItems.length;
                    badge.style.display = this.pendingItems.length > 0 ? 'inline-flex' : 'none';
                }

                if (this.showingPending) {
                    this.renderPendingGrid();
                } else {
                    this.renderGrid();
                }
            }, error => {
                console.error('[Testimonials] Erro:', error);
                const grid = document.getElementById('tm-grid') || document.getElementById('tm-pending-grid');
                if (grid) grid.innerHTML = '<p class="error">Erro ao carregar elogios.</p>';
            });
    },

    renderGrid() {
        const grid = document.getElementById('tm-grid');
        if (!grid) return;

        // Mostrar apenas aprovados no mural público
        const approvedItems = this.items.filter(item => item.approved !== false);

        if (approvedItems.length === 0) {
            grid.innerHTML = `
                <div class="tm-empty">
                    <i class="fa-regular fa-heart"></i>
                    <p>Ainda não há elogios aprovados. Seja o primeiro a reconhecer alguém!</p>
                </div>
            `;
            return;
        }

        const admin = this.isAdmin();
        grid.innerHTML = approvedItems.map(item => `
            <div class="tm-card animate-slide-up">
                <div class="tm-card-header">
                    <div class="tm-avatar">${this._esc(item.toName.charAt(0).toUpperCase())}</div>
                    <div class="tm-card-info">
                        <strong>Para: ${this._esc(item.toName)}</strong>
                        <span>De: ${this._esc(item.fromName) || 'Anônimo'}</span>
                    </div>
                    ${item.origin === 'public' ? '<span class="tm-origin-badge">🌐 Público</span>' : ''}
                </div>
                <div class="tm-card-body">
                    "${this._esc(item.message)}"
                </div>
                <div class="tm-card-footer">
                    <div class="tm-tags">
                        ${(item.tags || []).map(t => `<span class="tm-tag">${t}</span>`).join('')}
                    </div>
                    <span class="tm-date">${this.formatDate(item.createdAt)}</span>
                </div>
                ${admin ? `<div class="tm-delete-action"><button class="btn btn-sm btn-danger btn-delete-tm" data-id="${item.id}"><i class="fa-solid fa-trash"></i> Apagar</button></div>` : ''}
            </div>
        `).join('');

        // Bind delete events
        grid.querySelectorAll('.btn-delete-tm').forEach(btn => {
            btn.addEventListener('click', () => this.deleteTestimonial(btn.dataset.id));
        });
    },

    renderPendingGrid() {
        const grid = document.getElementById('tm-pending-grid');
        if (!grid) return;

        if (this.pendingItems.length === 0) {
            grid.innerHTML = `
                <div class="tm-empty">
                    <i class="fa-solid fa-check-circle"></i>
                    <p>Nenhum depoimento pendente de aprovação! 🎉</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.pendingItems.map(item => {
            const isExternal = item.origin === 'public';
            const userOptions = this.cachedUsers.map(u => `<option value="${u.uid}">${u.name}</option>`).join('');
            return `
            <div class="tm-card tm-card-pending animate-slide-up" data-id="${item.id}">
                <div class="tm-card-header">
                    <div class="tm-avatar pending">${this._esc((item.toName || '?').charAt(0).toUpperCase())}</div>
                    <div class="tm-card-info">
                        <strong>Para: ${this._esc(item.toName) || 'Não informado'}</strong>
                        <span>De: ${this._esc(item.fromName) || 'Anônimo'}</span>
                    </div>
                    <span class="tm-origin-badge ${isExternal ? 'public' : 'internal'}">
                        ${isExternal ? `👤 Cliente Externo: ${this._esc(item.fromName) || 'Anônimo'}` : '🏢 Interno'}
                    </span>
                </div>
                <div class="tm-card-body">
                    "${this._esc(item.message)}"
                </div>
                <div class="tm-card-footer">
                    <div class="tm-tags">
                        ${(item.tags || []).map(t => `<span class="tm-tag">${t}</span>`).join('')}
                    </div>
                    <span class="tm-date">${this.formatDate(item.createdAt)}</span>
                </div>
                <div class="tm-assign-user" style="padding-top:10px;border-top:1px solid var(--border-dim);margin-top:6px;">
                    <label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block;">Atribuir pontos a:</label>
                    <select class="form-input tm-assign-select" data-id="${item.id}" style="padding:8px 12px;border-radius:10px;font-size:13px;">
                        <option value="">Selecione o colaborador...</option>
                        ${userOptions}
                    </select>
                </div>
                <div class="tm-approval-actions">
                    <button class="btn btn-success btn-approve" data-id="${item.id}">
                        <i class="fa-solid fa-check"></i> Aprovar
                    </button>
                    <button class="btn btn-danger btn-reject" data-id="${item.id}">
                        <i class="fa-solid fa-times"></i> Rejeitar
                    </button>
                    ${this.isAdmin() ? `<button class="btn btn-sm btn-danger btn-delete-tm" data-id="${item.id}" title="Apagar permanentemente"><i class="fa-solid fa-trash"></i></button>` : ''}
                </div>
            </div>
            `;
        }).join('');

        // Bind approval + delete events
        grid.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', () => this.approveTestimonial(btn.dataset.id));
        });

        grid.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', () => this.rejectTestimonial(btn.dataset.id));
        });

        grid.querySelectorAll('.btn-delete-tm').forEach(btn => {
            btn.addEventListener('click', () => this.deleteTestimonial(btn.dataset.id));
        });
    },

    async approveTestimonial(id) {
        if (!confirm('Aprovar este depoimento para aparecer no mural?')) return;

        try {
            console.log('[Testimonials] Aprovando ID:', id);
            const user = NepAuth?.getUser?.();

            // Buscar dados do testimonial
            const doc = await this.db.collection('testimonials').doc(id).get();
            const data = doc.data() || {};
            const isExternal = data.origin === 'public';

            // Pegar UID do dropdown (disponível para todos os tipos)
            let toUid = data.toUid || null;
            let toName = data.toName || '';

            const selectEl = document.querySelector(`.tm-assign-select[data-id="${id}"]`);
            const selectedUid = selectEl?.value;
            if (selectedUid) {
                toUid = selectedUid;
                const selectedUser = this.cachedUsers.find(u => u.uid === selectedUid);
                toName = selectedUser ? selectedUser.name : toName;
            } else if (!toUid) {
                NexusApp?.showToast?.('Selecione o colaborador para atribuir os pontos!', 'warning');
                return;
            }

            // Atualizar documento
            await this.db.collection('testimonials').doc(id).update({
                approved: true,
                approvedBy: user?.name || 'Admin',
                approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                toUid: toUid || null,
                toName: toName
            });

            // GAMIFICAÇÃO — dar pontos ao destinatário
            if (toUid && window.NexusGamification) {
                try {
                    await NexusGamification.addPoints(toUid, 50, 'RECEIVE_TESTIMONIAL', `Recebeu elogio de ${data.fromName || 'Anônimo'}`);
                    if (window.NexusAchievements) await NexusAchievements.incrementStat(toUid, 'testimonials_received');
                    console.log('[Testimonials] +50 pts para destinatário:', toUid);
                } catch (ge) { console.error('[Testimonials] Erro gamificação destinatário:', ge); }
            }

            // GAMIFICAÇÃO — dar pontos ao remetente (se tiver UID)
            if (data.fromUid && window.NexusGamification) {
                try {
                    await NexusGamification.addPoints(data.fromUid, 10, 'SEND_TESTIMONIAL', `Elogiou ${toName}`);
                    if (window.NexusAchievements) await NexusAchievements.incrementStat(data.fromUid, 'testimonials_sent');
                    console.log('[Testimonials] +10 pts para remetente:', data.fromUid);
                } catch (ge) { console.error('[Testimonials] Erro gamificação remetente:', ge); }
            }

            // NOTIFICAÇÃO pessoal ao destinatário
            if (toUid) {
                this.db.collection('notifications').add({
                    titulo: 'Você recebeu um elogio! 💙',
                    mensagem: `${data.fromName || 'Alguém'} enviou um elogio para você! +50 pontos 🎉`,
                    destinatario_uid: toUid,
                    lida: false,
                    data: firebase.firestore.FieldValue.serverTimestamp(),
                    tipo: 'gamification',
                    referencia_tipo: 'testimonials'
                }).catch(e => console.error('Erro notificação', e));
            }

            // NOTIFICAÇÃO geral no mural
            this.db.collection('notifications').add({
                titulo: 'Novo Elogio no Mural! ✨',
                mensagem: `${data.fromName || 'Alguém'} elogiou ${toName}!`,
                destinatario_uid: 'ALL',
                lida: false,
                data: firebase.firestore.FieldValue.serverTimestamp(),
                tipo: 'sistema',
                referencia_tipo: 'testimonials'
            }).catch(e => console.error('Erro notificação', e));

            NexusApp?.showToast?.('✅ Depoimento aprovado! Pontos atribuídos.', 'success');
        } catch (e) {
            console.error('[Testimonials] Erro ao aprovar:', e.message, e);

            if (e.code === 'permission-denied' || e.message?.includes('permission')) {
                try {
                    const user = NepAuth?.getUser?.();
                    await this.db.collection('testimonials').doc(id).set({
                        approved: true,
                        approvedBy: user?.name || 'Admin',
                        approvedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    NexusApp?.showToast?.('✅ Depoimento aprovado!', 'success');
                    return;
                } catch (e2) {
                    console.error('[Testimonials] Erro set/merge:', e2);
                }
            }

            NexusApp?.showToast?.('Erro ao aprovar: ' + e.message, 'error');
        }
    },

    async rejectTestimonial(id) {
        if (!confirm('Rejeitar este depoimento?')) return;

        try {
            const user = NepAuth?.getUser?.();
            await this.db.collection('testimonials').doc(id).update({
                approved: false,
                rejected: true,
                rejectedBy: user?.name || 'Admin',
                rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            NexusApp?.showToast?.('Depoimento rejeitado', 'info');
        } catch (e) {
            console.error('[Testimonials] Erro ao rejeitar:', e);
            NexusApp?.showToast?.('Erro ao rejeitar: ' + e.message, 'error');
        }
    },

    async deleteTestimonial(id) {
        if (!confirm('Apagar este depoimento permanentemente? Esta ação não pode ser desfeita.')) return;
        try {
            await this.db.collection('testimonials').doc(id).delete();
            NexusApp?.showToast?.('🗑️ Depoimento apagado permanentemente', 'info');
        } catch (e) {
            console.error('[Testimonials] Erro ao apagar:', e);
            NexusApp?.showToast?.('Erro ao apagar: ' + e.message, 'error');
        }
    },

    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    },

    bindEvents() {
        // Modal logic - Move to body for proper centering
        const modal = document.getElementById('modal-tm');

        // Move modal to body if not already there
        if (modal && modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }

        document.querySelector('.btn-close-modal')?.addEventListener('click', () => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        });

        // Close on backdrop click
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // ═══ AUTOCOMPLETE ═══
        const tmTarget = document.getElementById('tm-target');
        const tmDropdown = document.getElementById('tm-user-dropdown');
        const tmTargetUid = document.getElementById('tm-target-uid');

        if (tmTarget && tmDropdown) {
            tmTarget.addEventListener('input', () => {
                const query = tmTarget.value.trim().toLowerCase();
                tmTargetUid.value = ''; // Reset UID ao digitar
                if (query.length < 1) {
                    tmDropdown.innerHTML = '';
                    tmDropdown.classList.remove('active');
                    return;
                }
                const filtered = this.cachedUsers.filter(u =>
                    u.name.toLowerCase().includes(query)
                ).slice(0, 8);

                if (filtered.length === 0) {
                    tmDropdown.innerHTML = '<div class="tm-dropdown-empty">Nenhum usuário encontrado</div>';
                    tmDropdown.classList.add('active');
                    return;
                }

                tmDropdown.innerHTML = filtered.map(u => `
                    <div class="tm-dropdown-item" data-uid="${u.uid}" data-name="${u.name}">
                        <div class="tm-dropdown-avatar">${u.name.charAt(0).toUpperCase()}</div>
                        <div class="tm-dropdown-info">
                            <div class="tm-dropdown-name">${u.name}</div>
                            ${u.email ? `<div class="tm-dropdown-email">${u.email}</div>` : ''}
                        </div>
                    </div>
                `).join('');
                tmDropdown.classList.add('active');

                // Bind click on items
                tmDropdown.querySelectorAll('.tm-dropdown-item').forEach(item => {
                    item.addEventListener('click', () => {
                        tmTarget.value = item.dataset.name;
                        tmTargetUid.value = item.dataset.uid;
                        tmDropdown.classList.remove('active');
                    });
                });
            });

            // Fechar dropdown ao clicar fora
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.tm-autocomplete-container')) {
                    tmDropdown.classList.remove('active');
                }
            });
        }

        // Toggle pending view
        document.getElementById('btn-pending-tm')?.addEventListener('click', () => {
            this.showingPending = true;
            this.render(document.getElementById('page-content'));
        });

        document.getElementById('btn-back-mural')?.addEventListener('click', () => {
            this.showingPending = false;
            this.render(document.getElementById('page-content'));
        });

        // ─── Helper: abre modal QR Code ─────────────────────────────────────────────
        const openQRModal = (title, desc, url) => {
            const modalQR = document.getElementById('modal-qr');
            if (!modalQR) return;

            document.getElementById('qr-modal-title').innerHTML = `<i class="fa-solid fa-qrcode"></i> ${title}`;
            document.getElementById('qr-modal-desc').textContent = desc;
            document.getElementById('qr-url-text').textContent = url;

            // Limpa o container e gera novo QR
            const container = document.getElementById('qr-canvas-container');
            container.innerHTML = '';

            const loadAndGenerate = () => {
                new QRCode(container, {
                    text: url,
                    width: 200,
                    height: 200,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });
            };

            // Carrega a lib QRCode.js se ainda não estiver na página
            if (typeof QRCode === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
                script.onload = loadAndGenerate;
                document.head.appendChild(script);
            } else {
                loadAndGenerate();
            }

            modalQR.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Armazena URL atual para o botão de copiar
            modalQR._currentUrl = url;
        };

        // Fechar modal QR
        document.querySelector('.btn-close-qr')?.addEventListener('click', () => {
            document.getElementById('modal-qr')?.classList.remove('active');
            document.body.style.overflow = '';
        });
        document.getElementById('modal-qr')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('modal-qr')) {
                document.getElementById('modal-qr').classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Copiar link do modal QR
        document.getElementById('btn-qr-copy')?.addEventListener('click', () => {
            const url = document.getElementById('modal-qr')?._currentUrl;
            if (!url) return;
            navigator.clipboard.writeText(url).then(() => {
                NexusApp?.showToast?.('✅ Link copiado!', 'success');
            });
        });

        // Baixar QR como PNG
        document.getElementById('btn-qr-download')?.addEventListener('click', () => {
            const canvas = document.querySelector('#qr-canvas-container canvas');
            if (!canvas) return;
            const link = document.createElement('a');
            link.download = 'qr-depoimento.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });

        // ─── Botão Cliente Externo ─────────────────────────────────────────────
        document.getElementById('btn-share-externo')?.addEventListener('click', () => {
            const url = window.location.origin + '/public-feedback.html';
            openQRModal(
                'Cliente Externo',
                'Compartilhe este QR Code com o cliente para que ele envie um elogio para a equipe.',
                url
            );
        });

        // ─── Botão Interno AeC ──────────────────────────────────────────────
        document.getElementById('btn-share-interno')?.addEventListener('click', () => {
            const url = window.location.origin + '/internal-feedback.html';
            openQRModal(
                'Interno AeC',
                'Compartilhe este QR Code com colaboradores internos da AeC para elogios entre equipes.',
                url
            );
        });

        // ═══ SAVE — ELOGIO INTERNO (aprovado automaticamente) ═══
        document.getElementById('btn-save-tm')?.addEventListener('click', async () => {
            const toName = document.getElementById('tm-target').value.trim();
            const toUid = document.getElementById('tm-target-uid').value;
            const msg = document.getElementById('tm-msg').value.trim();
            const tags = Array.from(document.querySelectorAll('#tm-tags-select .tag-opt.selected')).map(el => el.innerText);

            if (!toName || !msg) return alert('Preencha os campos obrigatórios.');
            if (!toUid) return alert('Selecione um colega da lista.');

            const user = NepAuth?.getUser?.();

            try {
                await this.db.collection('testimonials').add({
                    toName: toName,
                    toUid: toUid,
                    message: msg,
                    fromName: user ? user.name : 'Anônimo',
                    fromUid: user ? user.uid : null,
                    tags: tags,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    origin: 'internal',
                    approved: true,
                    public: true
                });

                // Notificação PESSOAL ao destinatário
                this.db.collection('notifications').add({
                    titulo: 'Você recebeu um elogio! 💙',
                    mensagem: `${user ? user.name : 'Alguém'} enviou um elogio para você! +50 pontos 🎉`,
                    destinatario_uid: toUid,
                    lida: false,
                    data: firebase.firestore.FieldValue.serverTimestamp(),
                    tipo: 'gamification',
                    referencia_tipo: 'testimonials'
                }).catch(e => console.error('Erro notificação', e));

                // Notificação GERAL no mural
                this.db.collection('notifications').add({
                    titulo: 'Novo Elogio no Mural! ✨',
                    mensagem: `${user ? user.name : 'Alguém'} elogiou ${toName}!`,
                    destinatario_uid: 'ALL',
                    lida: false,
                    data: firebase.firestore.FieldValue.serverTimestamp(),
                    tipo: 'sistema',
                    referencia_tipo: 'testimonials'
                }).catch(e => console.error('Erro notificação', e));

                // GAMIFICAÇÃO — pontos para QUEM ENVIOU
                if (window.NexusGamification && user && user.uid) {
                    try {
                        await NexusGamification.addPoints(user.uid, 10, 'SEND_TESTIMONIAL', `Elogiou ${toName}`);
                        if (window.NexusAchievements) await NexusAchievements.incrementStat(user.uid, 'testimonials_sent');
                    } catch (ge) { console.error('[Testimonials] Erro gamificação remetente:', ge); }
                }

                // GAMIFICAÇÃO — pontos para QUEM RECEBEU (via UID direto!)
                if (window.NexusGamification && toUid) {
                    try {
                        await NexusGamification.addPoints(toUid, 50, 'RECEIVE_TESTIMONIAL', `Recebeu elogio de ${user ? user.name : 'Anônimo'}`);
                        if (window.NexusAchievements) await NexusAchievements.incrementStat(toUid, 'testimonials_received');
                    } catch (ge) { console.error('[Testimonials] Erro gamificação destinatário:', ge); }
                }

                modal.classList.remove('active');
                document.body.style.overflow = '';
                NexusApp?.showToast?.('Elogio enviado! 🎉', 'success');

                // Clear form
                document.getElementById('tm-target').value = '';
                document.getElementById('tm-target-uid').value = '';
                document.getElementById('tm-msg').value = '';
                document.querySelectorAll('.tag-opt').forEach(el => el.classList.remove('selected'));

            } catch (e) {
                console.error(e);
                alert('Erro ao salvar.');
            }
        });
    },

    setupStyles() {
        if (document.getElementById('tm-styles')) return;
        const style = document.createElement('style');
        style.id = 'tm-styles';
        style.textContent = `
            .testimonials-page { padding: 2rem; max-width: 1400px; margin: 0 auto; }
            .tm-header { display: flex; justify-content: space-between; margin-bottom: 2rem; align-items: center; flex-wrap: wrap; gap: 1rem; }
            .tm-title { font-size: 2rem; font-family: 'Orbitron', sans-serif; background: linear-gradient(135deg, #00E0FF, #A855F7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
            .tm-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
            
            .tm-badge {
                background: #ef4444;
                color: white;
                font-size: 11px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 10px;
                margin-left: 6px;
            }
            
            .btn-outline {
                background: transparent;
                border: 1px solid var(--border-dim);
                color: var(--text-primary);
            }
            
            .btn-outline:hover {
                background: rgba(255,255,255,0.1);
                border-color: #f59e0b;
            }
            
            .btn-warning {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                border: none;
                color: white;
            }
            
            /* Pending Section */
            .tm-pending-section {
                background: var(--bg-card);
                border-radius: 16px;
                padding: 1.5rem;
                border: 2px solid rgba(245, 158, 11, 0.3);
            }
            
            .tm-pending-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid var(--border-dim);
            }
            
            .tm-pending-header h3 {
                margin: 0;
                color: #f59e0b;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .tm-pending-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                gap: 1.5rem;
            }
            
            .tm-card-pending {
                border: 2px solid rgba(245, 158, 11, 0.4) !important;
                background: rgba(245, 158, 11, 0.05) !important;
            }
            
            .tm-avatar.pending {
                background: linear-gradient(135deg, #f59e0b, #d97706) !important;
            }
            
            .tm-approval-actions {
                display: flex;
                gap: 12px;
                padding-top: 1rem;
                border-top: 1px solid var(--border-dim);
                margin-top: 1rem;
            }
            
            .tm-approval-actions .btn {
                flex: 1;
                padding: 12px;
                border-radius: 10px;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-success {
                background: linear-gradient(135deg, #22c55e, #16a34a);
                border: none;
                color: white;
            }
            
            .btn-success:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
            }
            
            .btn-danger {
                background: linear-gradient(135deg, #ef4444, #dc2626);
                border: none;
                color: white;
            }
            
            .btn-danger:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
            }
            
            .tm-origin-badge {
                font-size: 11px;
                padding: 4px 10px;
                border-radius: 12px;
                font-weight: 600;
            }
            
            .tm-origin-badge.public {
                background: rgba(0, 224, 255, 0.15);
                color: #00E0FF;
            }
            
            .tm-origin-badge.internal {
                background: rgba(139, 92, 246, 0.15);
                color: #A855F7;
            }
            
            .tm-grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
                gap: 1.5rem; 
            }

            .tm-card {
                background: var(--bg-card);
                border-radius: 16px;
                padding: 1.5rem;
                box-shadow: var(--shadow-md);
                border: 1px solid var(--border-dim);
                display: flex;
                flex-direction: column;
                gap: 1rem;
                transition: transform 0.2s, box-shadow 0.2s;
            }

            .tm-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: #00E0FF; }

            .tm-card-header { display: flex; gap: 1rem; align-items: center; }
            .tm-avatar { 
                width: 40px; height: 40px; 
                background: linear-gradient(135deg, #00E0FF, #A855F7); 
                color: white; border-radius: 50%; 
                display: flex; align-items: center; justify-content: center;
                font-weight: bold;
                flex-shrink: 0;
            }
            .tm-card-info { display: flex; flex-direction: column; flex: 1; }
            .tm-card-info strong { color: var(--text-primary); }
            .tm-card-info span { color: var(--text-secondary); font-size: 0.85rem; }

            .tm-card-body { 
                font-style: italic; 
                color: var(--text-primary); 
                line-height: 1.5;
                flex: 1;
            }

            .tm-card-footer { 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                border-top: 1px solid var(--border-dim);
                padding-top: 1rem;
            }

            .tm-tags { display: flex; gap: 0.5rem; flex-wrap: wrap; }
            .tm-tag { 
                font-size: 0.75rem; 
                color: #00E0FF; 
                background: rgba(0, 224, 255, 0.1); 
                padding: 2px 8px; 
                border-radius: 12px; 
            }
            .tm-date { font-size: 0.75rem; color: var(--text-tertiary); }

            .tm-empty { 
                grid-column: 1 / -1; 
                text-align: center; 
                padding: 4rem; 
                color: var(--text-secondary); 
                background: var(--bg-card);
                border-radius: 16px;
                border: 2px dashed var(--border-dim);
            }
            .tm-empty i { font-size: 3rem; margin-bottom: 1rem; color: #00E0FF; display: block; }

            /* Tags in Form */
            .tags-grid { display: flex; gap: 0.5rem; flex-wrap: wrap; }
            .tag-opt {
                padding: 0.4rem 0.8rem;
                border: 1px solid var(--border-dim);
                border-radius: 20px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.2s;
            }
            .tag-opt:hover { border-color: #00E0FF; }
            .tag-opt.selected { background: linear-gradient(135deg, #00E0FF, #A855F7); color: white; border-color: #00E0FF; }

            /* Modal Styles - Hidden by default */
            #modal-tm,
            .tm-modal-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.85) !important;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                z-index: 99999 !important;
                display: none;
                align-items: center !important;
                justify-content: center !important;
                padding: 1rem;
                margin: 0 !important;
                box-sizing: border-box !important;
            }
            
            #modal-tm.active,
            .tm-modal-overlay.active {
                display: flex !important;
            }

            #modal-tm .modal-content {
                background: #131B29 !important;
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 20px;
                width: 90% !important;
                max-width: 480px !important;
                margin: 0 auto !important;
                transform: scale(0.9) translateY(20px);
                transition: transform 0.3s ease;
                box-shadow: 0 25px 50px rgba(0,0,0,0.5);
                position: relative !important;
            }

            #modal-tm.active .modal-content {
                transform: scale(1) translateY(0);
            }

            #modal-tm .modal-header {
                padding: 1.5rem;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            #modal-tm .modal-header h3 {
                margin: 0;
                font-size: 1.25rem;
                background: linear-gradient(135deg, #00E0FF, #A855F7);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            #modal-tm .btn-close-modal {
                background: transparent;
                border: none;
                color: var(--text-secondary, #9CA3AF);
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 8px;
                transition: all 0.2s;
            }

            #modal-tm .btn-close-modal:hover {
                background: rgba(255,255,255,0.1);
                color: white;
            }

            #modal-tm .modal-body {
                padding: 1.5rem;
            }

            #modal-tm .modal-footer {
                padding: 1rem 1.5rem;
                border-top: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: flex-end;
            }

            #modal-tm #btn-save-tm {
                background: linear-gradient(135deg, #00E0FF, #A855F7);
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 12px;
                color: white;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                box-shadow: 0 4px 15px rgba(0, 224, 255, 0.3);
            }

            #modal-tm #btn-save-tm:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 224, 255, 0.4);
            }

            /* ═══ AUTOCOMPLETE DROPDOWN ═══ */
            .tm-autocomplete-container {
                position: relative;
            }
            .tm-user-dropdown {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #1a2332;
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 12px;
                max-height: 240px;
                overflow-y: auto;
                z-index: 100000;
                margin-top: 4px;
                box-shadow: 0 12px 40px rgba(0,0,0,0.5);
            }
            .tm-user-dropdown.active {
                display: block;
            }
            .tm-dropdown-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 14px;
                cursor: pointer;
                transition: background 0.15s;
            }
            .tm-dropdown-item:hover {
                background: rgba(0, 224, 255, 0.08);
            }
            .tm-dropdown-item:first-child {
                border-radius: 12px 12px 0 0;
            }
            .tm-dropdown-item:last-child {
                border-radius: 0 0 12px 12px;
            }
            .tm-dropdown-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: linear-gradient(135deg, #00E0FF, #A855F7);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 13px;
                font-weight: 700;
                color: white;
                flex-shrink: 0;
            }
            .tm-dropdown-name {
                font-size: 13px;
                font-weight: 500;
                color: var(--text-primary, #f1f5f9);
            }
            .tm-dropdown-email {
                font-size: 11px;
                color: var(--text-tertiary, #64748b);
            }
            .tm-dropdown-empty {
                padding: 14px;
                text-align: center;
                color: var(--text-secondary, #94a3b8);
                font-size: 13px;
            }`;
        document.head.appendChild(style);
    }
};

window.NexusTestimonials = NexusTestimonials;
