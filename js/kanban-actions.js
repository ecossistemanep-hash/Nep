/**
 * NEP DELIVERY CONTROL - KANBAN MODULE (Part 3)
 * Task Operations, Pomodoro, Alerts, Gamification
 */

Object.assign(NepKanban, {

    // Modal operations
    openNewTaskModal() {
        this.isEditing = false;
        this.editId = null;

        // Reset form
        document.getElementById('task-title').value = '';
        document.getElementById('task-requester').value = NepAuth.getUser()?.name || '';
        document.getElementById('task-unit').value = '';
        document.getElementById('task-segment').value = '';
        document.getElementById('task-deadline').value = this.getDeadline(3);
        document.getElementById('task-owner').value = '';
        document.getElementById('task-desc').value = '';

        // Setup owner role options
        this.setupOwnerRoleOptions();

        // Reset priority/complexity
        document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected'));
        document.querySelector('.p-btn[data-val="Baixo"]')?.classList.add('selected');
        this.selectedPriority = 'Baixo';

        document.querySelectorAll('.c-btn').forEach(b => b.classList.remove('selected'));
        document.querySelector('.c-btn[data-val="Baixa"]')?.classList.add('selected');
        this.selectedComplexity = 'Baixa';

        // Clear subtasks
        document.getElementById('subtasks-list').innerHTML = '';
        document.getElementById('audit-log').innerHTML = '<p style="color: var(--text-tertiary); font-size: 12px;">Novo registro</p>';

        document.getElementById('modal-task-title').textContent = 'Nova Demanda';
        document.getElementById('templates-grid').style.display = 'grid';
        document.getElementById('modal-task').classList.add('active');
    },

    openEditTaskModal(task) {
        this.isEditing = true;
        this.editId = task.id;

        document.getElementById('task-title').value = task.title || '';
        document.getElementById('task-requester').value = task.requester || '';
        document.getElementById('task-unit').value = task.unit || '';
        document.getElementById('task-segment').value = task.segment || '';
        document.getElementById('task-deadline').value = task.deadline || '';
        document.getElementById('task-owner').value = task.owner || '';
        document.getElementById('task-desc').value = task.description || '';

        this.setupOwnerRoleOptions();
        document.getElementById('task-owner-role').value = task.ownerRole || '';

        // Priority
        document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected'));
        document.querySelector(`.p-btn[data-val="${task.priority || 'Baixo'}"]`)?.classList.add('selected');
        this.selectedPriority = task.priority || 'Baixo';

        // Complexity
        document.querySelectorAll('.c-btn').forEach(b => b.classList.remove('selected'));
        document.querySelector(`.c-btn[data-val="${task.complexity || 'Baixa'}"]`)?.classList.add('selected');
        this.selectedComplexity = task.complexity || 'Baixa';

        // Subtasks
        this.renderSubtasks(task.subtasks || []);

        // Audit log
        const log = document.getElementById('audit-log');
        log.innerHTML = '';
        if (task.history?.length) {
            [...task.history].reverse().forEach(h => {
                const d = new Date(h.date).toLocaleString('pt-BR');
                const item = document.createElement('div');
                item.className = 'audit-item';
                item.innerHTML = `<span class="audit-time">${d}</span> ${h.action}`;
                log.appendChild(item);
            });
        }

        document.getElementById('modal-task-title').textContent = 'Editar Demanda';
        document.getElementById('templates-grid').style.display = 'none';
        document.getElementById('modal-task').classList.add('active');
    },

    setupOwnerRoleOptions() {
        const sel = document.getElementById('task-owner-role');
        if (!sel) return;

        sel.innerHTML = '<option value="">Selecione...</option>';

        const roles = [
            { key: 'superintendente', label: 'Superintendente' },
            { key: 'gerente', label: 'Gerente' },
            { key: 'consultor', label: 'Consultor' },
            { key: 'coordenador', label: 'Coordenador' },
            { key: 'analista', label: 'Analista' },
            { key: 'monitor', label: 'Monitor' }
        ];

        roles.forEach(r => {
            if (NepAuth.canDelegateTo(r.key)) {
                const opt = document.createElement('option');
                opt.value = r.label.toUpperCase();
                opt.textContent = r.label;
                sel.appendChild(opt);
            }
        });
    },

    applyTemplate(index) {
        const template = this.TEMPLATES[index];
        if (!template) return;

        document.getElementById('task-title').value = template.name;
        document.getElementById('task-segment').value = template.segment;
        document.getElementById('task-deadline').value = this.getDeadline(template.sla);

        document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected'));
        document.querySelector(`.p-btn[data-val="${template.priority}"]`)?.classList.add('selected');
        this.selectedPriority = template.priority;

        document.querySelectorAll('.c-btn').forEach(b => b.classList.remove('selected'));
        document.querySelector(`.c-btn[data-val="${template.complexity}"]`)?.classList.add('selected');
        this.selectedComplexity = template.complexity;

        NepApp?.showToast(`Template "${template.name}" aplicado!`, 'success');
    },

    // Subtasks
    renderSubtasks(subtasks) {
        const container = document.getElementById('subtasks-list');
        container.innerHTML = '';

        subtasks.forEach((st, idx) => {
            const item = document.createElement('div');
            item.className = 'subtask-item';
            item.innerHTML = `
        <input type="checkbox" ${st.done ? 'checked' : ''} data-idx="${idx}">
        <span class="subtask-text ${st.done ? 'done' : ''}">${st.text}</span>
        <button type="button" class="task-action-btn danger" data-idx="${idx}"><i class="fa-solid fa-times"></i></button>
      `;

            item.querySelector('input').addEventListener('change', e => {
                subtasks[idx].done = e.target.checked;
                this.renderSubtasks(subtasks);
            });

            item.querySelector('button').addEventListener('click', () => {
                subtasks.splice(idx, 1);
                this.renderSubtasks(subtasks);
            });

            container.appendChild(item);
        });

        container._subtasks = subtasks;
    },

    addSubtask() {
        const input = document.getElementById('new-subtask');
        const text = input.value.trim();
        if (!text) return;

        const container = document.getElementById('subtasks-list');
        const subtasks = container._subtasks || [];
        subtasks.push({ id: Date.now().toString(), text, done: false });

        this.renderSubtasks(subtasks);
        input.value = '';
    },

    // Save task
    saveTask() {
        const user = NepAuth.getUser();
        const title = document.getElementById('task-title').value.trim();

        if (!title) {
            NepApp?.showToast('Informe o título da demanda.', 'error');
            return;
        }

        const container = document.getElementById('subtasks-list');
        const subtasks = container._subtasks || [];

        const taskData = {
            title,
            requester: document.getElementById('task-requester').value.trim(),
            unit: document.getElementById('task-unit').value.trim(),
            segment: document.getElementById('task-segment').value.trim(),
            deadline: document.getElementById('task-deadline').value,
            ownerRole: document.getElementById('task-owner-role').value,
            owner: document.getElementById('task-owner').value.trim(),
            description: document.getElementById('task-desc').value.trim(),
            priority: this.selectedPriority,
            complexity: this.selectedComplexity,
            subtasks: subtasks
        };

        if (this.isEditing && this.editId) {
            const idx = this.allTasks.findIndex(t => t.id === this.editId);
            if (idx >= 0) {
                this.allTasks[idx] = { ...this.allTasks[idx], ...taskData };
                this.allTasks[idx].history.push({
                    date: new Date().toISOString(),
                    action: `Editado por ${user?.name || 'Usuário'}`
                });
            }
        } else {
            const newTask = {
                id: Date.now().toString(),
                ...taskData,
                status: 'backlog',
                createdAt: new Date().toISOString(),
                creatorName: user?.name || '',
                creatorRoleKey: user?.roleKey || '',
                creatorLevel: user?.level || 0,
                validated: false,
                acknowledged: false,
                comments: [],
                history: [{
                    date: new Date().toISOString(),
                    action: `Criado por ${user?.label || 'Usuário'} - ${user?.name || ''}`
                }]
            };
            this.allTasks.push(newTask);

            // Award points for creating task
            this.awardPoints(5, 'Demanda criada');
        }

        this.saveTasks();
        this.closeModal('modal-task');
        this.renderBoard();
        this.updateFilters();
        NepApp?.showToast('Demanda salva!', 'success');
    },

    // Task status updates
    async updateTaskStatus(taskId, newStatus, oldStatus) {
        const idx = this.allTasks.findIndex(t => t.id === taskId);
        if (idx < 0) return;

        this.allTasks[idx].status = newStatus;
        this.allTasks[idx].history.push({
            date: new Date().toISOString(),
            action: `Movido de ${oldStatus} para ${newStatus}`
        });

        this.saveTasks();
        this.renderBoard();
    },

    acknowledgeTask(taskId) {
        const idx = this.allTasks.findIndex(t => t.id === taskId);
        if (idx < 0) return;

        const user = NepAuth.getUser();
        this.allTasks[idx].acknowledged = true;
        this.allTasks[idx].history.push({
            date: new Date().toISOString(),
            action: `Demanda recebida por ${user?.name || 'Usuário'}`
        });

        this.saveTasks();
        this.renderBoard();
        NepApp?.showToast('Demanda reconhecida!', 'success');
    },

    confirmDelivery() {
        const evidence = document.getElementById('delivery-evidence').value.trim();
        const link = document.getElementById('delivery-link').value.trim();

        if (evidence.length < 3) {
            NepApp?.showToast('Descreva o que foi realizado.', 'error');
            return;
        }

        const idx = this.allTasks.findIndex(t => t.id === this.deliveryTaskId);
        if (idx < 0) return;

        const user = NepAuth.getUser();
        const isTop = user?.roleKey === 'superintendente';

        this.allTasks[idx].status = 'done';
        this.allTasks[idx].evidence = evidence;
        this.allTasks[idx].evidenceLink = link || null;
        this.allTasks[idx].deliveredAt = new Date().toISOString();
        this.allTasks[idx].validated = isTop;

        if (isTop) {
            this.allTasks[idx].validatedBy = `${user?.name} (${user?.label})`;
            this.allTasks[idx].validatedAt = new Date().toISOString();
        }

        this.allTasks[idx].history.push({
            date: new Date().toISOString(),
            action: isTop ? 'Entregue e validado automaticamente' : 'Entregue - Aguardando validação'
        });

        // Award points
        const task = this.allTasks[idx];
        const basePoints = task.priority === 'Urgente' ? 20 : task.priority === 'Alto' ? 15 : task.priority === 'Médio' ? 10 : 5;
        const complexityMultiplier = task.complexity === 'Alta' ? 2 : task.complexity === 'Média' ? 1.5 : 1;
        const points = Math.round(basePoints * complexityMultiplier);
        this.awardPoints(points, 'Demanda entregue');

        this.saveTasks();
        this.closeModal('modal-delivery');
        document.getElementById('delivery-evidence').value = '';
        document.getElementById('delivery-link').value = '';
        this.deliveryTaskId = null;
        this.renderBoard();

        NepApp?.showToast(isTop ? 'Demanda concluída!' : 'Entrega enviada para validação!', 'success');
    },

    openReviewModal(taskId) {
        this.reviewTaskId = taskId;
        const task = this.allTasks.find(t => t.id === taskId);
        if (!task) return;

        document.getElementById('review-text').textContent = task.evidence || 'Sem descrição.';

        const linkBox = document.getElementById('review-link');
        if (task.evidenceLink) {
            linkBox.innerHTML = `<a href="${task.evidenceLink}" target="_blank" class="btn btn-secondary" style="font-size: 12px;"><i class="fa-solid fa-external-link"></i> Ver Evidência</a>`;
        } else {
            linkBox.innerHTML = '<span style="color: var(--text-tertiary); font-size: 12px;">Nenhum link informado.</span>';
        }

        // Comments
        this.renderComments(task.comments || []);

        document.getElementById('modal-review').classList.add('active');
    },

    renderComments(comments) {
        const container = document.getElementById('review-comments');
        container.innerHTML = '';

        comments.forEach(c => {
            const item = document.createElement('div');
            item.className = 'comment-item';
            item.innerHTML = `
        <div class="comment-avatar" style="background: ${NepAuth.getAvatarGradient(c.author)}">${c.author.slice(0, 2).toUpperCase()}</div>
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-author">${c.author}</span>
            <span class="comment-time">${new Date(c.date).toLocaleString('pt-BR')}</span>
          </div>
          <div class="comment-text">${c.text}</div>
        </div>
      `;
            container.appendChild(item);
        });
    },

    addComment() {
        const input = document.getElementById('new-comment');
        const text = input.value.trim();
        if (!text) return;

        const idx = this.allTasks.findIndex(t => t.id === this.reviewTaskId);
        if (idx < 0) return;

        const user = NepAuth.getUser();
        if (!this.allTasks[idx].comments) this.allTasks[idx].comments = [];

        this.allTasks[idx].comments.push({
            id: Date.now().toString(),
            author: user?.name || 'Usuário',
            text,
            date: new Date().toISOString()
        });

        this.saveTasks();
        this.renderComments(this.allTasks[idx].comments);
        input.value = '';

        // Check for @mentions
        const mentions = text.match(/@(\w+)/g);
        if (mentions) {
            this.addAlert('info', 'Menção', `${user?.name} mencionou alguém em um comentário.`);
        }
    },

    approveTask() {
        const idx = this.allTasks.findIndex(t => t.id === this.reviewTaskId);
        if (idx < 0) return;

        const user = NepAuth.getUser();
        this.allTasks[idx].validated = true;
        this.allTasks[idx].validatedBy = `${user?.name} (${user?.label})`;
        this.allTasks[idx].validatedAt = new Date().toISOString();

        this.allTasks[idx].history.push({
            date: new Date().toISOString(),
            action: `Validado por ${user?.name}`
        });

        this.saveTasks();
        this.closeModal('modal-review');
        this.reviewTaskId = null;
        this.renderBoard();

        NepApp?.showToast('Demanda validada e concluída!', 'success');
    },

    rejectTask() {
        const idx = this.allTasks.findIndex(t => t.id === this.reviewTaskId);
        if (idx < 0) return;

        const user = NepAuth.getUser();
        this.allTasks[idx].status = 'pending';
        this.allTasks[idx].history.push({
            date: new Date().toISOString(),
            action: `Rejeitado por ${user?.name} - Solicita ajustes`
        });

        this.saveTasks();
        this.closeModal('modal-review');
        this.reviewTaskId = null;
        this.renderBoard();

        NepApp?.showToast('Ajustes solicitados.', 'warning');
    },

    archiveTask(taskId) {
        if (!confirm('Arquivar esta demanda?')) return;

        const idx = this.allTasks.findIndex(t => t.id === taskId);
        if (idx < 0) return;

        this.allTasks[idx].status = 'archived';
        this.allTasks[idx].history.push({
            date: new Date().toISOString(),
            action: 'Arquivado'
        });

        this.saveTasks();
        this.renderBoard();
        NepApp?.showToast('Demanda arquivada!', 'success');
    },

    deleteTask(taskId) {
        const task = this.allTasks.find(t => t.id === taskId);
        if (!task || !this.canDeleteTask(task)) {
            NepApp?.showToast('Sem permissão para excluir.', 'error');
            return;
        }

        if (!confirm('Excluir esta demanda?')) return;

        this.allTasks = this.allTasks.filter(t => t.id !== taskId);
        this.saveTasks();
        this.renderBoard();
        NepApp?.showToast('Demanda excluída!', 'success');
    },

    exportCSV() {
        let csv = 'ID,TITULO,SOLICITANTE,UNIDADE,SEGMENTO,RESPONSAVEL,STATUS,PRIORIDADE,COMPLEXIDADE,PRAZO\n';
        this.allTasks.forEach(t => {
            csv += `"${t.id}","${t.title}","${t.requester}","${t.unit}","${t.segment}","${t.owner}","${t.status}","${t.priority}","${t.complexity}","${t.deadline}"\n`;
        });

        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        a.download = `NEP_DATA_${this.todayKey()}.csv`;
        a.click();

        NepApp?.showToast('CSV exportado!', 'success');
    },

    // POMODORO
    startPomodoro(task) {
        this.pomodoroTask = task;
        this.pomodoroTime = 25 * 60;
        this.pomodoroRunning = false;

        const container = document.getElementById('pomodoro-container');
        container.innerHTML = `
      <div class="pomodoro-widget">
        <div class="pomodoro-header">
          <div class="pomodoro-title"><i class="fa-solid fa-stopwatch"></i> Pomodoro</div>
          <button class="pomodoro-close" id="pomodoro-close"><i class="fa-solid fa-times"></i></button>
        </div>
        <div class="pomodoro-timer working" id="pomodoro-display">25:00</div>
        <div class="pomodoro-task" id="pomodoro-task-title">${task.title}</div>
        <div class="pomodoro-controls">
          <button class="pomodoro-btn primary" id="pomodoro-start">▶ Iniciar</button>
          <button class="pomodoro-btn secondary" id="pomodoro-reset">↻ Reset</button>
        </div>
      </div>
    `;

        document.getElementById('pomodoro-close').addEventListener('click', () => {
            this.stopPomodoro();
        });

        document.getElementById('pomodoro-start').addEventListener('click', () => {
            if (this.pomodoroRunning) {
                this.pausePomodoro();
            } else {
                this.resumePomodoro();
            }
        });

        document.getElementById('pomodoro-reset').addEventListener('click', () => {
            this.pomodoroTime = 25 * 60;
            this.updatePomodoroDisplay();
        });
    },

    resumePomodoro() {
        this.pomodoroRunning = true;
        const btn = document.getElementById('pomodoro-start');
        if (btn) btn.textContent = '⏸ Pausar';

        this.pomodoroInterval = setInterval(() => {
            if (this.pomodoroTime > 0) {
                this.pomodoroTime--;
                this.updatePomodoroDisplay();
            } else {
                // Pomodoro complete
                this.pomodoroRunning = false;
                clearInterval(this.pomodoroInterval);
                this.awardPoints(2, 'Pomodoro completado');
                NepApp?.showToast('🍅 Pomodoro concluído! +2 pts', 'success');

                // Play sound (optional)
                try {
                    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==');
                    audio.play().catch(() => { });
                } catch (e) { }
            }
        }, 1000);
    },

    pausePomodoro() {
        this.pomodoroRunning = false;
        clearInterval(this.pomodoroInterval);
        const btn = document.getElementById('pomodoro-start');
        if (btn) btn.textContent = '▶ Continuar';
    },

    stopPomodoro() {
        this.pomodoroRunning = false;
        clearInterval(this.pomodoroInterval);
        this.pomodoroTask = null;
        document.getElementById('pomodoro-container').innerHTML = '';
    },

    updatePomodoroDisplay() {
        const mins = Math.floor(this.pomodoroTime / 60);
        const secs = this.pomodoroTime % 60;
        const display = document.getElementById('pomodoro-display');
        if (display) {
            display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
    },

    // SMART ALERTS
    checkAlerts() {
        const alerts = [];
        const now = new Date();
        const user = NepAuth.getUser();

        this.allTasks.forEach(task => {
            if (task.status === 'done' || task.status === 'archived') return;
            if (!this.canSeeTask(task)) return;

            // SLA critical
            if (task.deadline) {
                const deadline = new Date(task.deadline + 'T23:59:59');
                const diff = deadline - now;
                const hours = diff / (1000 * 60 * 60);

                if (hours < 0) {
                    alerts.push({ type: 'critical', title: 'SLA Expirado', desc: task.title });
                } else if (hours < 4) {
                    alerts.push({ type: 'critical', title: 'SLA Crítico', desc: `${task.title} - ${Math.round(hours)}h restantes` });
                }
            }

            // Stalled tasks
            const created = new Date(task.createdAt);
            const daysOld = (now - created) / (1000 * 60 * 60 * 24);
            if (task.status === 'backlog' && daysOld > 3) {
                alerts.push({ type: 'warning', title: 'Demanda Parada', desc: `${task.title} - ${Math.round(daysOld)} dias no backlog` });
            }

            // Pending approval too long
            if (task.status === 'done' && !task.validated) {
                const delivered = new Date(task.deliveredAt);
                const hoursWaiting = (now - delivered) / (1000 * 60 * 60);
                if (hoursWaiting > 24) {
                    alerts.push({ type: 'warning', title: 'Aprovação Pendente', desc: `${task.title} - ${Math.round(hoursWaiting)}h aguardando` });
                }
            }
        });

        // Check workload
        const myTasks = this.allTasks.filter(t =>
            this.norm(t.owner) === this.norm(user?.name) &&
            t.status !== 'done' &&
            t.status !== 'archived'
        );

        if (myTasks.length > 8) {
            alerts.push({ type: 'warning', title: 'Sobrecarga', desc: `Você tem ${myTasks.length} demandas ativas` });
        }

        this.renderAlerts(alerts.slice(0, 5));
    },

    renderAlerts(alerts) {
        const panel = document.getElementById('alerts-panel');
        if (!panel) return;

        panel.innerHTML = '';

        alerts.forEach(alert => {
            const el = document.createElement('div');
            el.className = `smart-alert ${alert.type}`;
            el.innerHTML = `
        <div class="alert-icon"><i class="fa-solid fa-${alert.type === 'critical' ? 'triangle-exclamation' : alert.type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i></div>
        <div class="alert-content">
          <div class="alert-title">${alert.title}</div>
          <div class="alert-desc">${alert.desc}</div>
        </div>
        <button class="alert-close"><i class="fa-solid fa-times"></i></button>
      `;

            el.querySelector('.alert-close').addEventListener('click', () => el.remove());

            panel.appendChild(el);
        });
    },

    addAlert(type, title, desc) {
        const panel = document.getElementById('alerts-panel');
        if (!panel) return;

        const el = document.createElement('div');
        el.className = `smart-alert ${type}`;
        el.innerHTML = `
      <div class="alert-icon"><i class="fa-solid fa-info-circle"></i></div>
      <div class="alert-content">
        <div class="alert-title">${title}</div>
        <div class="alert-desc">${desc}</div>
      </div>
      <button class="alert-close"><i class="fa-solid fa-times"></i></button>
    `;

        el.querySelector('.alert-close').addEventListener('click', () => el.remove());
        panel.appendChild(el);

        setTimeout(() => el.remove(), 5000);
    },

    // GAMIFICATION
    awardPoints(points, reason) {
        const user = NepAuth.getUser();
        if (!user) return;

        // Get current points
        let totalPoints = parseInt(localStorage.getItem('nep_user_points') || '0');
        totalPoints += points;
        localStorage.setItem('nep_user_points', totalPoints);

        // Track streak
        const today = this.todayKey();
        const lastActive = localStorage.getItem('nep_last_active');
        let streak = parseInt(localStorage.getItem('nep_streak') || '0');

        if (lastActive !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

            if (lastActive === yesterdayKey) {
                streak++;
            } else {
                streak = 1;
            }

            localStorage.setItem('nep_streak', streak);
            localStorage.setItem('nep_last_active', today);
        }

        console.log(`+${points} pts: ${reason}. Total: ${totalPoints}. Streak: ${streak} dias`);
    },

    getStats() {
        return {
            points: parseInt(localStorage.getItem('nep_user_points') || '0'),
            streak: parseInt(localStorage.getItem('nep_streak') || '0'),
            tasksCompleted: this.allTasks.filter(t => t.status === 'done' && t.validated).length,
            tasksInProgress: this.allTasks.filter(t => t.status === 'doing').length
        };
    }
});
