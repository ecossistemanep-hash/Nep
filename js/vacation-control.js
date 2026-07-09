/**
 * NEXUS PLATFORM - CONTROLE DE FÉRIAS
 * Enterprise Edition - Design System Corporativo
 * Benchmark: Workday, SAP Fiori, Linear App
 */

const NexusVacation = {
    vacations: [],
    statusFilter: 'all',

    init() {
        console.log('[NexusVacation] Módulo inicializado - Enterprise Edition v2');
        // CSS loaded via link tag in index.html
    },

    // Styles injection removed in favor of css/vacation-enterprise.css

    getSystemRoles() {
        if (window.NexusAuthService && window.NexusAuthService.ROLE_CONFIG) {
            return Object.entries(window.NexusAuthService.ROLE_CONFIG).map(([key, config]) => ({
                value: config.label, // Using label as value to match existing data format if possible, or key if strict
                label: config.label
            }));
        }
        // Fallback if service not ready
        return [
            { value: 'Coordenador', label: 'COORDENADOR' },
            { value: 'Gerente', label: 'GERENTE' },
            { value: 'Analista', label: 'ANALISTA' },
            { value: 'Assistente', label: 'ASSISTENTE' }
        ];
    },


    async render(container) {
        container.innerHTML = `
            <div class="vacation-enterprise animate-fade-in">
                <!-- Header -->
                <header class="vac-header">
                    <div class="vac-header-left">
                        <span class="vac-module-tag">RH & Gestão de Pessoas</span>
                        <h1 class="vac-title">Controle de Férias</h1>
                        <p class="vac-subtitle">Gestão estratégica de ausências, previsões de retorno e indicadores de compliance trabalhista.</p>
                    </div>
                    <div class="vac-header-actions">
                        <button class="btn-enterprise btn-secondary-enterprise" onclick="NexusVacation.exportToCSV()">
                            <i class="fa-solid fa-arrow-down-to-line"></i>
                            Exportar
                        </button>
                        <button class="btn-enterprise btn-primary-enterprise" onclick="NexusVacation.openFormModal()">
                            <i class="fa-solid fa-plus"></i>
                            Novo Registro
                        </button>
                    </div>
                </header>

                <!-- KPI Cards -->
                <div class="kpi-grid-enterprise">
                    <div class="kpi-card-enterprise">
                        <div class="kpi-header">
                            <div class="kpi-icon blue"><i class="fa-solid fa-umbrella-beach"></i></div>
                            <span class="kpi-label">Em Férias Agora</span>
                        </div>
                        <div class="kpi-value" id="kpi-active">0</div>
                        <div class="kpi-meta" id="kpi-active-meta">Nenhum impacto operacional</div>
                    </div>

                    <div class="kpi-card-enterprise">
                        <div class="kpi-header">
                            <div class="kpi-icon purple"><i class="fa-solid fa-calendar-days"></i></div>
                            <span class="kpi-label">Próximos 30 Dias</span>
                        </div>
                        <div class="kpi-value" id="kpi-upcoming">0</div>
                        <div class="kpi-meta" id="kpi-upcoming-meta">Colaboradores agendados</div>
                    </div>

                    <div class="kpi-card-enterprise">
                        <div class="kpi-header">
                            <div class="kpi-icon amber"><i class="fa-solid fa-coins"></i></div>
                            <span class="kpi-label">Dias Vendidos</span>
                        </div>
                        <div class="kpi-value" id="kpi-sold">0</div>
                        <div class="kpi-meta" id="kpi-sold-meta">Total acumulado</div>
                    </div>

                    <div class="kpi-card-enterprise">
                        <div class="kpi-header">
                            <div class="kpi-icon emerald"><i class="fa-solid fa-users"></i></div>
                            <span class="kpi-label">Total de Registros</span>
                        </div>
                        <div class="kpi-value" id="kpi-total">0</div>
                        <div class="kpi-meta" id="kpi-total-meta">Histórico completo</div>
                    </div>
                </div>

                </div>

                <!-- Filters -->
                <div class="filter-bar-enterprise">
                    <div style="display: flex; gap: 1rem; flex: 1;">
                        <div class="search-enterprise" style="flex: 2;">
                            <i class="fa-solid fa-magnifying-glass"></i>
                            <input type="text" id="vacation-search" placeholder="Buscar por nome..." onkeyup="NexusVacation.filterTable()">
                        </div>
                        <select id="filter-role" class="form-select" style="flex: 1; max-width: 150px; height: 42px;" onchange="NexusVacation.filterTable()">
                            <option value="">Cargo (Todos)</option>
                            ${this.getSystemRoles().map(role => `<option value="${role.value}">${role.label}</option>`).join('')}
                        </select>
                        <select id="filter-product" class="form-select" style="flex: 1; max-width: 150px; height: 42px;" onchange="NexusVacation.filterTable()">
                            <option value="">Logo (Todas)</option>
                            <!-- Populado dinamicamente -->
                        </select>
                    </div>
                    
                    <div class="filter-tabs-enterprise">
                        <button class="filter-tab-enterprise active" onclick="NexusVacation.setFilter('all', this)">Todos</button>
                        <button class="filter-tab-enterprise" onclick="NexusVacation.setFilter('SCHEDULED', this)">Agendados</button>
                        <button class="filter-tab-enterprise" onclick="NexusVacation.setFilter('ON_VACATION', this)">Em Curso</button>
                        <button class="filter-tab-enterprise" onclick="NexusVacation.setFilter('RETURNED', this)">Concluídos</button>
                    </div>
                </div>

                <!-- Data Table -->
                <div class="table-container-enterprise">
                    <table class="table-enterprise">
                        <thead>
                            <tr>
                                <th style="width: 25%;">Colaborador / Produto</th>
                                <th style="width: 15%;">Cargo / Local</th>
                                <th style="width: 20%;">Período</th>
                                <th style="width: 12%;">Dias</th>
                                <th style="width: 12%;">Status</th>
                                <th style="width: 16%; text-align: right;">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="vacation-table-body">
                            <tr>
                                <td colspan="6">
                                    <div class="loading-enterprise">
                                        <i class="fa-solid fa-circle-notch fa-spin"></i>
                                        Carregando registros...
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadVacations();
        this._populateLogoFilters();
    },

    async _populateLogoFilters() {
        if (!window.LogoService) return;
        try {
            const accessibleLogos = await window.LogoService.getAccessibleLogos();
            const filterSelect = document.getElementById('filter-product');
            if (filterSelect) {
                accessibleLogos.forEach(logo => {
                    const opt = document.createElement('option');
                    opt.value = logo.name;
                    opt.textContent = logo.name;
                    filterSelect.appendChild(opt);
                });
            }
        } catch (e) {
            console.warn('[Vacation] Erro ao popular logos:', e);
        }
    },

    async loadVacations() {
        try {
            const snapshot = await window.db.collection('vacations').orderBy('startDate', 'desc').get();
            let loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filtro por logo (produto)
            if (window.LogoService && window.LogoService.shouldFilterByLogo()) {
                loaded = loaded.filter(v => window.LogoService.canSeeEntity({ logos: v.product ? [v.product] : [] }));
            }

            this.vacations = loaded;
            console.log(`[Vacation] Carregadas ${this.vacations.length} férias do Firestore`);
            this.renderTable(this.vacations);
            this.updateKPIs();
        } catch (error) {
            console.warn('Error loading vacations:', error);
            // Inicializar array vazio para evitar erros
            this.vacations = [];

            // Fallback para localStorage
            const saved = localStorage.getItem('nep_vacations');
            if (saved) {
                try {
                    this.vacations = JSON.parse(saved);
                    console.log(`[Vacation] Carregadas ${this.vacations.length} férias do localStorage (fallback)`);
                } catch (e) {
                    console.error('[Vacation] Erro ao parsear localStorage:', e);
                }
            }

            // Renderizar mesmo que vazio
            this.renderTable(this.vacations);

            // Só atualizar KPIs se os elementos existirem
            if (document.getElementById('kpi-active')) {
                this.updateKPIs();
            }

            // Mostrar toast apenas se não conseguiu carregar de lugar nenhum
            if (this.vacations.length === 0) {
                NexusApp.showToast('Nenhuma féria encontrada. Erro: ' + error.message, 'warning');
            }
        }
    },

    renderTable(data) {
        const tbody = document.getElementById('vacation-table-body');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state-enterprise">
                            <div class="icon">📋</div>
                            <h3>Nenhum registro encontrado</h3>
                            <p>Não há férias cadastradas para os filtros selecionados.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(item => {
            const startDate = new Date(item.startDate).toLocaleDateString('pt-BR');
            const endDate = new Date(item.endDate).toLocaleDateString('pt-BR');
            const nextVacation = this.calculateNextVacation(item.endDate);

            // Status badge
            let statusBadge = '';
            if (item.status === 'SCHEDULED') {
                statusBadge = `<span class="status-badge scheduled"><span class="status-icon">⏳</span> Agendada</span>`;
            } else if (item.status === 'ON_VACATION') {
                statusBadge = `<span class="status-badge active"><span class="status-icon">✓</span> Em Curso</span>`;
            } else {
                statusBadge = `<span class="status-badge returned"><span class="status-icon">✓</span> Concluída</span>`;
            }

            // Actions based on status
            let actions = '';
            if (item.status === 'SCHEDULED') {
                actions = `
                    <button class="action-btn start" onclick="NexusVacation.updateStatus('${item.id}', 'ON_VACATION')" title="Iniciar férias">
                        <i class="fa-solid fa-play"></i>
                    </button>
                    <button class="action-btn edit" onclick="NexusVacation.openFormModal('${item.id}')" title="Editar">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                `;
            } else if (item.status === 'ON_VACATION') {
                actions = `
                    <button class="action-btn return" onclick="NexusVacation.updateStatus('${item.id}', 'RETURNED')" title="Marcar retorno">
                        <i class="fa-solid fa-check"></i>
                    </button>
                `;
            } else {
                actions = `
                    <button class="action-btn edit" onclick="NexusVacation.openFormModal('${item.id}')" title="Ver detalhes">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                `;
            }

            actions += `
                <button class="action-btn delete" onclick="NexusVacation.deleteVacation('${item.id}')" title="Excluir">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;

            return `
                <tr>
                    <td>
                        <div class="employee-cell">
                            <div class="employee-avatar" style="background: ${NexusApp.getAvatarGradient(item.employeeName)};">
                                ${item.employeeName.charAt(0)}
                            </div>
                            <div class="employee-info">
                                <h4>${item.employeeName}</h4>
                                <span style="display:inline-flex; align-items:center; gap:4px; margin-top:4px;">
                                    <span class="status-badge" style="padding: 2px 8px; font-size: 0.65rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8;">${item.product || 'N/A'}</span>
                                </span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="font-medium">${item.role}</div>
                        <div class="text-xs text-secondary">${item.city}</div>
                    </td>
                    <td>
                        <div class="font-medium">${startDate} → ${endDate}</div>
                        <div class="text-xs text-secondary">Próx. férias: ${nextVacation}</div>
                    </td>
                    <td>
                        <div class="font-medium">${item.daysCount} dias</div>
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
                            ${item.soldDays > 0 ? `<span class="info-pill highlight"><i class="fa-solid fa-coins"></i> ${item.soldDays}d vendidos</span>` : ''}
                            ${item.advanced13th ? `<span class="info-pill success"><i class="fa-solid fa-check"></i> 13º</span>` : ''}
                        </div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="action-cell">${actions}</div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    updateKPIs() {
        const now = new Date();

        // Active Vacations
        const activeVar = this.vacations.filter(v => v.status === 'ON_VACATION').length;

        // Upcoming in next 30 days
        const upcomingVar = this.vacations.filter(v => {
            if (v.status !== 'SCHEDULED') return false;
            const start = new Date(v.startDate);
            const diffDays = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 30;
        }).length;

        // Sold Days Total
        const soldVar = this.vacations.reduce((acc, curr) => acc + (parseInt(curr.soldDays) || 0), 0);

        // Total Records
        const totalVar = this.vacations.length;

        // Update values - com verificação de segurança
        const kpiActive = document.getElementById('kpi-active');
        const kpiUpcoming = document.getElementById('kpi-upcoming');
        const kpiSold = document.getElementById('kpi-sold');
        const kpiTotal = document.getElementById('kpi-total');
        const kpiActiveMeta = document.getElementById('kpi-active-meta');
        const kpiUpcomingMeta = document.getElementById('kpi-upcoming-meta');

        if (kpiActive) kpiActive.textContent = activeVar;
        if (kpiUpcoming) kpiUpcoming.textContent = upcomingVar;
        if (kpiSold) kpiSold.textContent = soldVar;
        if (kpiTotal) kpiTotal.textContent = totalVar;

        // Update meta descriptions
        if (kpiActiveMeta) {
            kpiActiveMeta.textContent = activeVar === 0 ? 'Nenhum impacto operacional' : `${activeVar} colaborador(es) ausente(s)`;
        }
        if (kpiUpcomingMeta) {
            kpiUpcomingMeta.textContent = upcomingVar === 0 ? 'Nenhum agendamento próximo' : `${upcomingVar} férias previstas`;
        }
    },

    setFilter(status, element) {
        this.statusFilter = status;

        document.querySelectorAll('.filter-tab-enterprise').forEach(el => el.classList.remove('active'));
        if (element) element.classList.add('active');

        this.filterTable();
    },

    filterTable() {
        const term = document.getElementById('vacation-search')?.value?.toLowerCase() || '';

        const filtered = this.vacations.filter(item => {
            const matchesTerm = (
                item.employeeName?.toLowerCase().includes(term) ||
                item.role?.toLowerCase().includes(term)
            );

            const roleFilter = document.getElementById('filter-role').value;
            const productFilter = document.getElementById('filter-product').value;

            const matchesRole = roleFilter === '' || item.role === roleFilter;
            const matchesProduct = productFilter === '' || item.product === productFilter;
            const matchesStatus = this.statusFilter === 'all' || item.status === this.statusFilter;

            return matchesTerm && matchesStatus && matchesRole && matchesProduct;
        });

        this.renderTable(filtered);
    },

    exportToCSV() {
        if (!this.vacations || this.vacations.length === 0) {
            NexusApp.showToast('Sem dados para exportar', 'info');
            return;
        }

        const headers = ['Nome', 'Produto', 'Cargo', 'Cidade', 'Início', 'Fim', 'Dias', 'Dias Vendidos', 'Adiantamento 13º', 'Status'];

        const rows = this.vacations.map(v => [
            v.employeeName,
            v.product || '',
            v.role,
            v.city,
            new Date(v.startDate).toLocaleDateString('pt-BR'),
            new Date(v.endDate).toLocaleDateString('pt-BR'),
            v.daysCount,
            v.soldDays || 0,
            v.advanced13th ? 'Sim' : 'Não',
            v.status === 'SCHEDULED' ? 'Agendada' : v.status === 'ON_VACATION' ? 'Em Férias' : 'Concluída'
        ]);

        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ferias_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        NexusApp.showToast('Relatório exportado com sucesso', 'success');
    },

    calculateNextVacation(endDateStr) {
        if (!endDateStr) return '-';
        const endDate = new Date(endDateStr);
        endDate.setFullYear(endDate.getFullYear() + 1);
        return endDate.toLocaleDateString('pt-BR');
    },

    async updateStatus(id, newStatus) {
        try {
            // Primeiro buscar dados da férias para notificação
            const vacation = this.vacations.find(v => v.id === id);

            await window.db.collection('vacations').doc(id).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            NexusApp.showToast('Status atualizado', 'success');

            // Notificar o colaborador sobre a mudança
            if (vacation && window.NexusNotifications) {
                const statusLabels = {
                    'SCHEDULED': 'agendadas',
                    'APPROVED': 'aprovadas',
                    'IN_PROGRESS': 'iniciadas',
                    'COMPLETED': 'concluídas',
                    'CANCELLED': 'canceladas'
                };
                await window.NexusNotifications.notifyAll({
                    tipo: 'sistema',
                    titulo: `🏖️ Férias ${statusLabels[newStatus] || 'atualizadas'}`,
                    mensagem: `Férias de ${vacation.employeeName} foram ${statusLabels[newStatus] || 'atualizadas'}.`,
                    referencia_tipo: 'vacation',
                    referencia_id: id
                });
            }

            if (vacation && window.SupabaseSync) {
                window.SupabaseSync.syncVacation({ ...vacation, status: newStatus });
            }

            await this.loadVacations();
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            NexusApp.showToast('Erro ao atualizar', 'error');
        }
    },

    async deleteVacation(id) {
        if (!confirm('Excluir este registro permanentemente?')) return;

        try {
            await window.db.collection('vacations').doc(id).delete();
            NexusApp.showToast('Registro excluído', 'success');
            await this.loadVacations();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            NexusApp.showToast('Erro ao excluir', 'error');
        }
    },

    openFormModal(id = null) {
        const item = id ? this.vacations.find(v => v.id === id) : null;
        const isEdit = !!item;

        const modalHtml = `
            <div class="modal-overlay" id="vacation-modal" onclick="if(event.target === this) this.remove()">
                <div class="enterprise-form">
                    <div class="form-header">
                        <h3>${isEdit ? 'Editar Registro' : 'Novo Registro de Férias'}</h3>
                        <button onclick="document.getElementById('vacation-modal').remove()" style="background:none;border:none;color:#94a3b8;cursor:pointer;">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                    <form onsubmit="event.preventDefault(); NexusVacation.submitForm('${id || ''}')">
                        <div class="form-body">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Nome Completo</label>
                                    <input type="text" id="v-name" class="form-input" required value="${item?.employeeName || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Logo / Produto</label>
                                    <select id="v-product" class="form-select" required>
                                        <option value="">Selecione...</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Cargo</label>
                                    <select id="v-role" class="form-select" required>
                                        <option value="">Selecione...</option>
                                        ${this.getSystemRoles().map(r => `
                                            <option value="${r.value}" ${item?.role === r.value ? 'selected' : ''}>${r.label}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Cidade / Unidade</label>
                                    <input type="text" id="v-city" class="form-input" required value="${item?.city || ''}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Data Início</label>
                                    <input type="date" id="v-start" class="form-input" required value="${item?.startDate || ''}" onchange="NexusVacation.calcDays()">
                                </div>
                                <div class="form-group">
                                    <label>Data Fim</label>
                                    <input type="date" id="v-end" class="form-input" required value="${item?.endDate || ''}" onchange="NexusVacation.calcDays()">
                                </div>
                            </div>
                            <div class="form-row" style="grid-template-columns: 1fr 1fr 1fr;">
                                <div class="form-group">
                                    <label>Dias (Calc)</label>
                                    <input type="number" id="v-days" class="form-input" readonly value="${item?.daysCount || 0}">
                                </div>
                                <div class="form-group">
                                    <label>Vendeu (Dias)</label>
                                    <input type="number" id="v-sold" class="form-input" min="0" max="10" placeholder="0" value="${item?.soldDays || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Adiant. 13º</label>
                                    <select id="v-13th" class="form-select">
                                        <option value="false" ${!item?.advanced13th ? 'selected' : ''}>Não</option>
                                        <option value="true" ${item?.advanced13th ? 'selected' : ''}>Sim</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="form-footer">
                            <button type="button" class="btn-enterprise btn-secondary-enterprise" onclick="document.getElementById('vacation-modal').remove()">Cancelar</button>
                            <button type="submit" class="btn-enterprise btn-primary-enterprise">Salvar Registro</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Preencher logos no select de form
        if (window.LogoService) {
            window.LogoService.listLogos().then(logos => {
                const select = document.getElementById('v-product');
                if (select) {
                    logos.forEach(logo => {
                        const opt = document.createElement('option');
                        opt.value = logo.name;
                        opt.textContent = logo.name;
                        if (item?.product === logo.name) opt.selected = true;
                        select.appendChild(opt);
                    });
                }
            });
        }
    },

    calcDays() {
        const start = document.getElementById('v-start').value;
        const end = document.getElementById('v-end').value;
        if (start && end) {
            const d1 = new Date(start);
            const d2 = new Date(end);
            const diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
            document.getElementById('v-days').value = diffDays > 0 ? diffDays : 0;
        }
    },

    async submitForm(id) {
        const data = {
            employeeName: document.getElementById('v-name').value,
            product: document.getElementById('v-product').value,
            role: document.getElementById('v-role').value,
            city: document.getElementById('v-city').value,
            startDate: document.getElementById('v-start').value,
            endDate: document.getElementById('v-end').value,
            daysCount: parseInt(document.getElementById('v-days').value),
            soldDays: parseInt(document.getElementById('v-sold').value) || 0,
            advanced13th: document.getElementById('v-13th').value === 'true',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (id) {
                await window.db.collection('vacations').doc(id).update(data);
                NexusApp.showToast('Registro atualizado', 'success');
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                data.status = 'SCHEDULED';
                const docRef = await window.db.collection('vacations').add(data);
                NexusApp.showToast('Registro criado', 'success');

                // Notificar RH sobre nova programação de férias
                if (window.NexusNotifications) {
                    await window.NexusNotifications.notifyRole('GERENTE', {
                        tipo: 'sistema',
                        titulo: '🏖️ Nova Programação de Férias',
                        mensagem: `${data.employeeName} programou férias de ${data.startDate} a ${data.endDate}.`,
                        referencia_tipo: 'vacation',
                        referencia_id: docRef.id
                    });
                }
            }

            document.getElementById('vacation-modal').remove();

            if (window.SupabaseSync) {
                const finalData = { ...data, id: id || 'new-sync-pending' };
                // Se for novo, o ideal seria pegar o ID do docRef, mas loadVacations() vai resolver no próximo ciclo.
                // Para sync imediato:
                if (!id && typeof docRef !== 'undefined') finalData.id = docRef.id;
                window.SupabaseSync.syncVacation(finalData);
            }

            await this.loadVacations();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            NexusApp.showToast('Erro ao salvar', 'error');
        }
    }
};

window.NexusVacation = NexusVacation;
