/**
 * NEP FEEDBACK WIDGET
 * Botão flutuante para reportar bugs e solicitar melhorias
 */

const NexusFeedbackWidget = {
    db: null,

    init() {
        this.db = window.db || firebase.firestore();
        this.injectStyles();
        this.injectButton();
    },

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
/* Floating Feedback Button */
.nfb-float-btn {
    position: fixed;
    bottom: 24px;
    left: 24px;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(0, 224, 255, 0.15), rgba(168, 85, 247, 0.15));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #12bcd4;
    font-size: 22px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    z-index: 9000;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    opacity: 0.7;
}
.nfb-float-btn:hover {
    opacity: 1;
    transform: scale(1.1);
    box-shadow: 0 6px 28px rgba(0, 224, 255, 0.3);
    border-color: rgba(0, 224, 255, 0.4);
}

/* Modal Overlay */
.nfb-overlay {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 9500;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
}
.nfb-overlay.active { display: flex; }

/* --- Modal --- */
.nfb-modal {
    width: 100%;
    max-width: 480px;
    background: var(--surface-card, rgba(11, 17, 26, 0.95));
    backdrop-filter: blur(20px);
    border: 1px solid var(--surface-border, rgba(255,255,255,0.1));
    border-radius: 20px;
    padding: 32px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
    animation: nfbSlideUp 0.3s ease-out;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
}
.nfb-modal::-webkit-scrollbar { width: 4px; }
.nfb-modal::-webkit-scrollbar-thumb { background: var(--surface-border-light, #333); border-radius: 4px; }

@keyframes nfbSlideUp {
    from { opacity: 0; transform: translateY(30px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

.nfb-modal::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, #12bcd4, #7555e8, #10B981);
    border-radius: 20px 20px 0 0;
}

.nfb-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
}

.nfb-header h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary, #f9fafb);
}

.nfb-close {
    width: 32px; height: 32px;
    border-radius: 8px;
    background: var(--surface-elevated, rgba(255,255,255,0.05));
    border: 1px solid var(--surface-border, rgba(255,255,255,0.1));
    color: var(--text-secondary, #9CA3AF);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    font-size: 14px;
}
.nfb-close:hover { background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }

.nfb-form-group {
    margin-bottom: 18px;
}

.nfb-label {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary, #9CA3AF);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Inputs */
.nfb-input, .nfb-textarea, .nfb-select {
    width: 100%;
    padding: 12px 14px;
    background: var(--surface-elevated, rgba(19, 27, 41, 0.8));
    border: 1px solid var(--surface-border, rgba(255,255,255,0.1));
    border-radius: 10px;
    color: var(--text-primary, #f9fafb);
    font-family: inherit;
    font-size: 14px;
    transition: all 0.3s;
}
.nfb-input::placeholder, .nfb-textarea::placeholder { color: var(--text-tertiary, #4B5563); }
.nfb-input:focus, .nfb-textarea:focus, .nfb-select:focus {
    border-color: #12bcd4;
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 224, 255, 0.12);
    background: var(--surface-elevated);
}
.nfb-select option {
    background: var(--surface-card, #0b111a);
    color: var(--text-primary, #f9fafb);
}

/* Type Picker */
.nfb-types {
    display: flex;
    gap: 8px;
}

.nfb-type-btn {
    flex: 1;
    padding: 12px 8px;
    background: var(--surface-elevated, rgba(19, 27, 41, 0.8));
    border: 1px solid var(--surface-border, rgba(255,255,255,0.1));
    border-radius: 10px;
    color: var(--text-secondary, #9CA3AF);
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.3s;
    text-align: center;
}
.nfb-type-btn:hover { border-color: #12bcd4; color: #12bcd4; }
.nfb-type-btn.active {
    background: linear-gradient(135deg, rgba(0, 224, 255, 0.15), rgba(168, 85, 247, 0.15));
    border-color: #12bcd4;
    color: #12bcd4;
    font-weight: 600;
}

.nfb-type-icon { font-size: 20px; display: block; margin-bottom: 4px; }

.nfb-submit {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #12bcd4, #7555e8);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 4px;
    box-shadow: 0 4px 15px rgba(0, 224, 255, 0.25);
}
.nfb-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.nfb-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 224, 255, 0.35); }

/* Success */
.nfb-success {
    display: none;
    text-align: center;
    padding: 20px 0;
}
.nfb-success.active { display: block; }
.nfb-success-icon { font-size: 48px; margin-bottom: 12px; display: block; }
.nfb-success h4 { color: var(--text-primary, #f9fafb); margin-bottom: 6px; font-size: 18px; }
.nfb-success p { color: var(--text-secondary, #9CA3AF); font-size: 13px; }

/* ====== LIGHT MODE OVERRIDES ====== */
[data-theme="light"] .nfb-float-btn {
    border-color: rgba(0,0,0,0.12);
}
[data-theme="light"] .nfb-modal {
    box-shadow: 0 12px 40px rgba(0,0,0,0.15);
}
[data-theme="light"] .nfb-type-btn.active {
    background: linear-gradient(135deg, rgba(0,160,200,0.12), rgba(120,60,200,0.12));
}

@media (max-width: 600px) {
    .nfb-float-btn { bottom: 16px; left: 16px; width: 46px; height: 46px; font-size: 18px; }
    .nfb-modal { padding: 24px; }
}
        `;
        document.head.appendChild(style);
    },

    injectButton() {
        // Modal overlay only — trigger is in the header bar (index.html)
        const overlay = document.createElement('div');
        overlay.className = 'nfb-overlay';
        overlay.id = 'nfb-overlay';
        overlay.innerHTML = `
            <div class="nfb-modal" id="nfb-modal">
                <div id="nfb-form-view">
                    <div class="nfb-header">
                        <h3>📬 Enviar Feedback</h3>
                        <button class="nfb-close" id="nfb-close"><i class="fa-solid fa-times"></i></button>
                    </div>

                    <div class="nfb-form-group">
                        <label class="nfb-label">Tipo</label>
                        <div class="nfb-types">
                            <button type="button" class="nfb-type-btn active" data-type="bug">
                                <span class="nfb-type-icon">🐛</span> Bug
                            </button>
                            <button type="button" class="nfb-type-btn" data-type="feature">
                                <span class="nfb-type-icon">💡</span> Melhoria
                            </button>
                            <button type="button" class="nfb-type-btn" data-type="suggestion">
                                <span class="nfb-type-icon">📝</span> Sugestão
                            </button>
                        </div>
                    </div>

                    <div class="nfb-form-group">
                        <label class="nfb-label">Título</label>
                        <input type="text" class="nfb-input" id="nfb-title" placeholder="Resumo do que aconteceu ou do que deseja...">
                    </div>

                    <div class="nfb-form-group">
                        <label class="nfb-label">Descrição</label>
                        <textarea class="nfb-textarea" id="nfb-desc" rows="4" placeholder="Descreva com detalhes. Para bugs, inclua o que fez antes do erro..."></textarea>
                    </div>

                    <div class="nfb-form-group">
                        <label class="nfb-label">Prioridade</label>
                        <select class="nfb-select" id="nfb-priority">
                            <option value="low">🟢 Baixa - Quando puder</option>
                            <option value="medium" selected>🟡 Média - Em breve</option>
                            <option value="high">🔴 Alta - Urgente</option>
                        </select>
                    </div>

                    <div class="nfb-form-group">
                        <label class="nfb-label">Módulo relacionado (opcional)</label>
                        <select class="nfb-select" id="nfb-module">
                            <option value="">Selecione...</option>
                            <option value="dashboard">Dashboard</option>
                            <option value="kanban">Kanban</option>
                            <option value="forum">Fórum</option>
                            <option value="courses">Cursos</option>
                            <option value="calendar">Agendas</option>
                            <option value="testimonials">Depoimentos</option>
                            <option value="ranking">Ranking</option>
                            <option value="okr">OKR / Entregas</option>
                            <option value="tools">Ferramentas</option>
                            <option value="reports">Relatórios</option>
                            <option value="vacation">Férias</option>
                            <option value="announcements">Avisos</option>
                            <option value="estagiario">Neuronyo</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>

                    <button class="nfb-submit" id="nfb-submit">
                        <i class="fa-solid fa-paper-plane"></i> Enviar Feedback
                    </button>
                </div>

                <div class="nfb-success" id="nfb-success">
                    <span class="nfb-success-icon">✅</span>
                    <h4>Feedback Enviado!</h4>
                    <p>Obrigado pela contribuição. Nossa equipe irá analisar em breve.</p>
                    <button class="nfb-submit" style="margin-top: 20px; background: rgba(255,255,255,0.08); box-shadow: none;"
                        id="nfb-new">Enviar Outro</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Events
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });
        document.getElementById('nfb-close').addEventListener('click', () => this.close());
        document.getElementById('nfb-new').addEventListener('click', () => this.reset());

        // Type buttons
        overlay.querySelectorAll('.nfb-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.querySelectorAll('.nfb-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Submit
        document.getElementById('nfb-submit').addEventListener('click', () => this.submit());

        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('nfb-overlay')?.classList.contains('active')) {
                this.close();
            }
        });
    },

    open() {
        document.getElementById('nfb-overlay')?.classList.add('active');
    },

    close() {
        document.getElementById('nfb-overlay')?.classList.remove('active');
    },

    reset() {
        document.getElementById('nfb-form-view').style.display = 'block';
        document.getElementById('nfb-success').classList.remove('active');
        document.getElementById('nfb-title').value = '';
        document.getElementById('nfb-desc').value = '';
        document.getElementById('nfb-priority').value = 'medium';
        document.getElementById('nfb-module').value = '';
        const btns = document.querySelectorAll('.nfb-type-btn');
        btns.forEach(b => b.classList.remove('active'));
        btns[0]?.classList.add('active');
        const submit = document.getElementById('nfb-submit');
        submit.disabled = false;
        submit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Feedback';
    },

    async submit() {
        const title = document.getElementById('nfb-title')?.value.trim();
        const desc = document.getElementById('nfb-desc')?.value.trim();
        const priority = document.getElementById('nfb-priority')?.value || 'medium';
        const module = document.getElementById('nfb-module')?.value || '';
        const typeBtn = document.querySelector('.nfb-type-btn.active');
        const type = typeBtn?.dataset.type || 'bug';

        if (!title) {
            NexusApp?.showToast?.('Preencha o título do feedback', 'warning');
            return;
        }

        const submitBtn = document.getElementById('nfb-submit');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

        try {
            const userName = localStorage.getItem('nep_user_name') || 'Anônimo';
            const userUid = localStorage.getItem('nep_uid') || '';
            const userCargo = localStorage.getItem('nep_cargo') || '';
            const currentPage = window.NepApp?.currentPage || '';

            await this.db.collection('feedback_requests').add({
                type,
                title,
                description: desc,
                priority,
                module: module || currentPage,
                status: 'new',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: userName,
                createdByUid: userUid,
                createdByCargo: userCargo,
                currentUrl: window.location.hash || ''
            });

            // Notify admins
            try {
                const typeLabels = { bug: '🐛 Bug', feature: '💡 Melhoria', suggestion: '📝 Sugestão' };
                await this.db.collection('notifications').add({
                    titulo: `Novo Feedback: ${typeLabels[type] || type}`,
                    mensagem: `${userName} enviou: "${title}"`,
                    destinatario_uid: 'ADMIN',
                    lida: false,
                    data: firebase.firestore.FieldValue.serverTimestamp(),
                    tipo: 'sistema',
                    referencia_tipo: 'feedback'
                });
            } catch (e) {
                console.warn('[FeedbackWidget] Erro ao notificar:', e);
            }

            // Show success
            document.getElementById('nfb-form-view').style.display = 'none';
            document.getElementById('nfb-success').classList.add('active');

        } catch (e) {
            console.error('[FeedbackWidget] Erro ao enviar:', e);
            NexusApp?.showToast?.('Erro ao enviar feedback: ' + e.message, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Feedback';
        }
    }
};

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => NexusFeedbackWidget.init(), 1000);
});

window.NexusFeedbackWidget = NexusFeedbackWidget;
