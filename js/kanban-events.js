/**
 * NEP DELIVERY CONTROL - KANBAN MODULE (Part 2)
 * Event Listeners, Drag & Drop, Firebase Integration
 */

// Extend NepKanban with event handling
Object.assign(NepKanban, {

    setupEventListeners() {
        // New task button
        document.getElementById('btn-new-task')?.addEventListener('click', () => this.openNewTaskModal());

        // Close modals
        document.getElementById('btn-close-task')?.addEventListener('click', () => this.closeModal('modal-task'));
        document.getElementById('btn-cancel-task')?.addEventListener('click', () => this.closeModal('modal-task'));
        document.getElementById('btn-close-delivery')?.addEventListener('click', () => this.closeModal('modal-delivery'));
        document.getElementById('btn-cancel-delivery')?.addEventListener('click', () => this.closeModal('modal-delivery'));
        document.getElementById('btn-close-review')?.addEventListener('click', () => this.closeModal('modal-review'));

        // Save task
        document.getElementById('btn-save-task')?.addEventListener('click', () => this.saveTask());

        // Delivery
        document.getElementById('btn-confirm-delivery')?.addEventListener('click', () => this.confirmDelivery());

        // Review
        document.getElementById('btn-approve-review')?.addEventListener('click', () => this.approveTask());
        document.getElementById('btn-reject-review')?.addEventListener('click', () => this.rejectTask());
        document.getElementById('btn-add-comment')?.addEventListener('click', () => this.addComment());

        // Priority/Complexity buttons
        document.querySelectorAll('.p-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.selectedPriority = btn.dataset.val;
            });
        });

        document.querySelectorAll('.c-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.c-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.selectedComplexity = btn.dataset.val;
            });
        });

        // Templates
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => this.applyTemplate(parseInt(btn.dataset.template)));
        });

        // Subtasks
        document.getElementById('btn-add-subtask')?.addEventListener('click', () => this.addSubtask());
        document.getElementById('new-subtask')?.addEventListener('keypress', e => {
            if (e.key === 'Enter') { e.preventDefault(); this.addSubtask(); }
        });

        // Filters
        ['filter-unit', 'filter-owner', 'filter-status'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.renderBoard());
        });

        // Toggle archive
        document.getElementById('btn-toggle-archive')?.addEventListener('click', () => {
            this.showArchived = !this.showArchived;
            document.getElementById('txt-archive').textContent = this.showArchived ? '📋 Voltar' : '📁 Ver Arquivados';
            this.renderBoard();
        });

        // Export CSV
        document.getElementById('btn-export-csv')?.addEventListener('click', () => this.exportCSV());

        // Context menu
        document.addEventListener('click', e => {
            if (!e.target.closest('#context-menu')) {
                document.getElementById('context-menu')?.classList.add('hidden');
            }
        });

        document.getElementById('ctx-edit')?.addEventListener('click', () => {
            document.getElementById('context-menu')?.classList.add('hidden');
            const task = this.allTasks.find(t => t.id === this.contextMenuTargetId);
            if (task) this.openEditTaskModal(task);
        });

        document.getElementById('ctx-pomodoro')?.addEventListener('click', () => {
            document.getElementById('context-menu')?.classList.add('hidden');
            const task = this.allTasks.find(t => t.id === this.contextMenuTargetId);
            if (task) this.startPomodoro(task);
        });

        document.getElementById('ctx-archive')?.addEventListener('click', () => {
            document.getElementById('context-menu')?.classList.add('hidden');
            this.archiveTask(this.contextMenuTargetId);
        });

        document.getElementById('ctx-delete')?.addEventListener('click', () => {
            document.getElementById('context-menu')?.classList.add('hidden');
            this.deleteTask(this.contextMenuTargetId);
        });

        // Archive zone
        const archiveZone = document.getElementById('archive-zone');
        if (archiveZone) {
            archiveZone.addEventListener('dragover', e => {
                e.preventDefault();
                archiveZone.classList.add('drag-over');
            });
            archiveZone.addEventListener('dragleave', () => archiveZone.classList.remove('drag-over'));
            archiveZone.addEventListener('drop', e => {
                e.preventDefault();
                archiveZone.classList.remove('drag-over');
                if (this.draggedItem) {
                    this.archiveTask(this.draggedItem.dataset.id);
                }
            });
        }

        // Drag & drop on columns
        document.querySelectorAll('.column-track').forEach(track => {
            track.addEventListener('dragover', e => {
                e.preventDefault();
                track.classList.add('drag-over');
            });

            track.addEventListener('dragleave', () => track.classList.remove('drag-over'));

            track.addEventListener('drop', e => {
                e.preventDefault();
                track.classList.remove('drag-over');
                if (!this.draggedItem) return;

                const newStatus = track.dataset.status;
                const oldStatus = this.draggedItem.dataset.status;
                const taskId = this.draggedItem.dataset.id;

                if (newStatus === 'done' && oldStatus !== 'done') {
                    this.deliveryTaskId = taskId;
                    const user = NepAuth.getUser();
                    const btn = document.getElementById('btn-confirm-delivery');
                    if (btn) {
                        btn.textContent = user?.roleKey === 'superintendente' ? 'CONCLUIR (AUTOMÁTICO)' : 'ENVIAR PARA APROVAÇÃO';
                    }
                    document.getElementById('modal-delivery')?.classList.add('active');
                    return;
                }

                if (newStatus && newStatus !== oldStatus) {
                    this.updateTaskStatus(taskId, newStatus, oldStatus);
                }
            });
        });

        // SLA timer interval
        setInterval(() => this.updateSLATimers(), 1000);

        // Check alerts
        setInterval(() => this.checkAlerts(), 30000);
    },

    // Load tasks from Firebase (simulated with localStorage for now)
    loadTasks() {
        // For demo, load from localStorage
        const stored = localStorage.getItem('nep_tasks');
        if (stored) {
            try {
                this.allTasks = JSON.parse(stored);
            } catch (e) {
                this.allTasks = [];
            }
        } else {
            // Demo data
            this.allTasks = [
                {
                    id: 'demo1',
                    title: 'Calibrar equipe de monitoria',
                    unit: 'Qualidade',
                    segment: 'Monitoria',
                    requester: 'Fernando',
                    owner: 'Mariana',
                    ownerRole: 'COORDENADOR',
                    status: 'backlog',
                    priority: 'Média',
                    complexity: 'Baixa',
                    deadline: this.getDeadline(3),
                    createdAt: new Date().toISOString(),
                    creatorName: 'Fernando',
                    creatorRoleKey: 'coordenador',
                    creatorLevel: 2,
                    subtasks: [],
                    comments: [],
                    history: [{ date: new Date().toISOString(), action: 'Criado' }]
                },
                {
                    id: 'demo2',
                    title: 'Análise de rechamadas do mês',
                    unit: 'Operações',
                    segment: 'BI',
                    requester: 'Ana',
                    owner: 'Ana',
                    ownerRole: 'ANALISTA',
                    status: 'doing',
                    priority: 'Crítica',
                    complexity: 'Alta',
                    deadline: this.getDeadline(1),
                    createdAt: new Date().toISOString(),
                    creatorName: 'Fernando',
                    creatorRoleKey: 'coordenador',
                    creatorLevel: 2,
                    subtasks: [
                        { id: 's1', text: 'Extrair dados', done: true },
                        { id: 's2', text: 'Analisar padrões', done: false }
                    ],
                    comments: [],
                    history: [{ date: new Date().toISOString(), action: 'Criado' }]
                }
            ];
            this.saveTasks();
        }

        this.renderBoard();
        this.updateFilters();
        this.checkAlerts();
    },

    saveTasks() {
        localStorage.setItem('nep_tasks', JSON.stringify(this.allTasks));
    },

    // Filters
    getFilterVals() {
        return {
            unit: document.getElementById('filter-unit')?.value || 'all',
            owner: document.getElementById('filter-owner')?.value || 'all',
            status: document.getElementById('filter-status')?.value || 'all'
        };
    },

    updateFilters() {
        const visible = this.allTasks.filter(t => this.canSeeTask(t) && t.status !== 'archived');

        this.populateFilter('filter-unit', 'unit', visible);
        this.populateFilter('filter-unit', 'unit', visible);
        this.populateFilter('filter-owner', 'owner', visible);
    },

    populateFilter(elementId, field, tasks) {
        const select = document.getElementById(elementId);
        if (!select) return;

        const currentVal = select.value;
        const values = [...new Set(tasks.map(t => t[field]).filter(Boolean))].sort();

        const firstOpt = select.options[0];
        select.innerHTML = '';
        if (firstOpt) select.appendChild(firstOpt);

        values.forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            select.appendChild(opt);
        });

        if (values.includes(currentVal)) select.value = currentVal;
        else select.value = 'all';
    },

    getVisibleTasks() {
        const f = this.getFilterVals();

        return this.allTasks.filter(t => {
            if (!this.canSeeTask(t)) return false;

            if (this.showArchived) {
                if (t.status !== 'archived') return false;
            } else {
                if (t.status === 'archived') return false;
            }

            if (f.unit !== 'all' && t.unit !== f.unit) return false;
            if (f.unit !== 'all' && t.unit !== f.unit) return false;
            if (f.owner !== 'all' && t.owner !== f.owner) return false;
            if (f.status !== 'all' && t.status !== f.status) return false;

            return true;
        });
    },

    // Render board
    renderBoard() {
        if (this.draggedItem) return;

        const tracks = {
            backlog: document.getElementById('track-backlog'),
            doing: document.getElementById('track-doing'),
            pending: document.getElementById('track-pending'),
            done: document.getElementById('track-done')
        };

        Object.values(tracks).forEach(t => { if (t) t.innerHTML = ''; });

        const counts = { backlog: 0, doing: 0, pending: 0, done: 0 };
        const visible = this.getVisibleTasks();

        visible.forEach(task => {
            const card = this.createCard(task);
            const track = tracks[task.status];
            if (track) {
                track.appendChild(card);
                if (counts[task.status] !== undefined) counts[task.status]++;
            }
        });

        Object.keys(counts).forEach(status => {
            const el = document.getElementById(`count-${status}`);
            if (el) el.textContent = counts[status];
        });
    },

    createCard(task) {
        const user = NepAuth.getUser();
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.id = task.id;
        card.dataset.status = task.status;
        card.draggable = true;

        const assignedToMe = user?.name && this.norm(task.owner) === this.norm(user.name);
        const isNew = task.status === 'backlog' && !task.acknowledged && assignedToMe;

        if (isNew) card.classList.add('new-task');
        if (task.status === 'done') {
            card.classList.add(task.validated ? 'validated' : 'pending-validation');
        }

        // Subtasks progress
        let subtasksHTML = '';
        if (task.subtasks?.length) {
            const done = task.subtasks.filter(s => s.done).length;
            const total = task.subtasks.length;
            const pct = Math.round((done / total) * 100);
            subtasksHTML = `
        <div class="task-subtasks">
          <div class="subtask-progress">
            <span>${done}/${total}</span>
            <div class="subtask-bar"><div class="subtask-fill" style="width: ${pct}%"></div></div>
          </div>
        </div>
      `;
        }

        // SLA
        let slaHTML = '';
        if (task.status !== 'done' && task.status !== 'archived' && task.deadline) {
            slaHTML = `<div class="task-sla" id="sla-${task.id}"></div>`;
        }

        // New badge
        let newBadgeHTML = '';
        if (isNew) {
            newBadgeHTML = `
        <div class="task-new-badge">
          <i class="fa-solid fa-bell"></i>
          Nova demanda de ${task.creatorRoleKey || 'Gestor'}
        </div>
        <button class="btn-acknowledge" data-id="${task.id}">
          <i class="fa-solid fa-check"></i> RECEBI A DEMANDA
        </button>
      `;
        }

        // Validation
        let validationHTML = '';
        if (task.status === 'done') {
            if (task.validated) {
                validationHTML = `<div class="task-validation status-ok"><i class="fa-solid fa-check-double"></i> Concluída</div>`;
            } else {
                validationHTML = `<div class="task-validation status-warn"><i class="fa-solid fa-clock"></i> Aguardando validação</div>`;
                if (this.canValidateTask(task)) {
                    validationHTML += `<button class="btn-validate" data-id="${task.id}"><i class="fa-solid fa-magnifying-glass"></i> REVISAR</button>`;
                }
            }
        }

        // Comments count
        let commentsHTML = '';
        if (task.comments?.length) {
            commentsHTML = `<span class="task-comments"><i class="fa-regular fa-comment"></i> ${task.comments.length}</span>`;
        }

        const prioClass = task.priority === 'Urgente' ? 'p-urgente' : task.priority === 'Alto' ? 'p-alto' : task.priority === 'Médio' ? 'p-medio' : 'p-baixo';
        const compClass = task.complexity === 'Alta' ? 'c-alta' : task.complexity === 'Média' ? 'c-media' : 'c-baixa';

        card.innerHTML = `
      <div class="task-header">
        <span class="task-unit">${task.unit || 'Geral'}</span>
        <div class="task-actions">
          <button class="task-action-btn edit-btn" title="Editar"><i class="fa-solid fa-pen"></i></button>
          ${this.canDeleteTask(task) ? '<button class="task-action-btn danger del-btn" title="Excluir"><i class="fa-solid fa-trash"></i></button>' : ''}
        </div>
      </div>
      <div class="task-title">${task.title}</div>
      ${newBadgeHTML}
      ${slaHTML}
      ${subtasksHTML}
      ${validationHTML}
      <div class="task-meta">
        <div class="task-assignee"><i class="fa-solid fa-user-gear"></i> ${this.assigneeText(task)}</div>
        <div class="task-badges">
          <span class="priority-badge ${prioClass}">${task.priority || 'Baixo'}</span>
          <span class="complexity-badge ${compClass}">${task.complexity || 'Baixa'}</span>
          ${commentsHTML}
        </div>
      </div>
      <div class="task-date">${this.toBRDate(task.deadline)}</div>
    `;

        // Event listeners
        card.addEventListener('click', e => {
            if (e.target.closest('.btn-validate')) {
                this.openReviewModal(e.target.closest('.btn-validate').dataset.id);
                return;
            }
            if (e.target.closest('.btn-acknowledge')) {
                this.acknowledgeTask(e.target.closest('.btn-acknowledge').dataset.id);
                return;
            }
            if (!e.target.closest('.task-actions')) {
                this.openEditTaskModal(task);
            }
        });

        card.querySelector('.edit-btn')?.addEventListener('click', e => {
            e.stopPropagation();
            this.openEditTaskModal(task);
        });

        card.querySelector('.del-btn')?.addEventListener('click', e => {
            e.stopPropagation();
            this.deleteTask(task.id);
        });

        card.addEventListener('contextmenu', e => {
            e.preventDefault();
            this.showContextMenu(e.pageX, e.pageY, task.id);
        });

        card.addEventListener('dragstart', () => {
            this.draggedItem = card;
            card.classList.add('is-dragging');
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('is-dragging');
            this.draggedItem = null;
            document.getElementById('archive-zone')?.classList.remove('drag-over');
        });

        return card;
    },

    showContextMenu(x, y, taskId) {
        this.contextMenuTargetId = taskId;
        const menu = document.getElementById('context-menu');
        if (!menu) return;

        const task = this.allTasks.find(t => t.id === taskId);
        const delItem = document.getElementById('ctx-delete');
        if (delItem) delItem.style.display = this.canDeleteTask(task) ? 'flex' : 'none';

        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.classList.remove('hidden');
    },

    updateSLATimers() {
        this.allTasks.forEach(task => {
            if (task.status === 'done' || task.status === 'archived' || !task.deadline) return;

            const slaDiv = document.getElementById(`sla-${task.id}`);
            if (!slaDiv) return;

            const deadline = new Date(task.deadline + 'T23:59:59');
            const diff = deadline - new Date();

            if (diff < 0) {
                slaDiv.className = 'task-sla sla-danger';
                slaDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> EXPIRADO';
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor(diff / (1000 * 60 * 60));

                if (days > 1) {
                    slaDiv.className = 'task-sla sla-ok';
                    slaDiv.innerHTML = `<i class="fa-regular fa-clock"></i> ${days} DIAS`;
                } else {
                    slaDiv.className = hours < 4 ? 'task-sla sla-danger' : 'task-sla sla-warn';
                    slaDiv.innerHTML = `<i class="fa-solid fa-stopwatch"></i> ${hours}h`;
                }
            }
        });
    },

    closeModal(id) {
        document.getElementById(id)?.classList.remove('active');
    }
});
