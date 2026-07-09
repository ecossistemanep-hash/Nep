/**
 * NEXUS PLATFORM - REPORTS
 * Sistema de Geração de Relatórios
 */

const NexusReports = {
  reports: [],
  currentReport: null,
  loading: false,
  container: null,
  initialized: false,

  init() {
    this.loadReports();
  },

  async loadReports() {
    if (this.loading) return;

    this.loading = true;
    if (this.container) {
      try { this.render(this.container); } catch (e) { }
    }

    try {
      // 1. Check/Wait for DB
      let attempts = 0;
      while (!window.db && attempts < 15) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
      }

      if (!window.db) throw new Error("Firestore unavailable (timeout)");

      // 2. Fetch Data (Robust: Compat vs Modular)
      let reportsData = [];
      const collectionName = 'reports';

      const fetchPromise = async () => {
        if (window.db.collection) {
          // Compat SDK
          const snap = await window.db.collection(collectionName).get();
          snap.forEach(doc => reportsData.push({ id: doc.id, ...doc.data() }));
        } else if (window.getDocs && window.collection) {
          // Modular SDK exposed on window
          const q = window.query(window.collection(window.db, collectionName));
          const snap = await window.getDocs(q);
          snap.forEach(doc => reportsData.push({ id: doc.id, ...doc.data() }));
        } else {
          throw new Error("Firestore SDK methods not found");
        }
      };

      // Race against 10s timeout
      await Promise.race([
        fetchPromise(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout retrieving reports from DB')), 10000))
      ]);

      this.reports = reportsData;
      console.log(`[Reports] Loaded ${this.reports.length} reports.`);

    } catch (e) {
      console.error('[Reports] Load error:', e);
      // Fallback to defaults if empty or error
      if (this.reports.length === 0) {
        this.reports = this.getDefaultReports();
      }
      NexusApp.showToast('Nota: Usando dados locais devido a erro de conexão.', 'info');
    } finally {
      this.loading = false;
      this.initialized = true;
      if (this.container) {
        try {
          this.render(this.container);
        } catch (renderErr) {
          console.error("Render catch:", renderErr);
          this.container.innerHTML = `<div class="error-state">
                  <h3>Erro de Visualização</h3>
                  <p>${renderErr.message}</p>
                  <button class="btn btn-primary" onclick="NexusReports.init()">Tentar Novamente</button>
              </div>`;
        }
      }
    }
  },

  async saveReports() {
    // This is now just a helper or triggers a UI refresh, 
    // individual create/update actions should call Firestore directly.
    // For compatibility with existing code calling this:
    console.log('[Reports] Local updates only. Use saveReportToCloud() for persistence.');
  },

  async saveReportToCloud(report) {
    try {
      if (!report.id) report.id = Date.now().toString();

      if (window.db && window.db.collection) {
        // Compat
        await window.db.collection('reports').doc(report.id).set(report);
      } else if (window.setDoc && window.doc) {
        // Modular
        await window.setDoc(window.doc(window.db, "reports", report.id), report);
      } else {
        throw new Error("Firestore unavailable");
      }

      console.log('[Reports] Saved to cloud:', report.id);
      this.loadReports();
    } catch (e) {
      console.error('[Reports] Save failed:', e);
      NexusApp.showToast('Erro ao salvar na nuvem: ' + e.message, 'error');
    }
  },

  async deleteReportFromCloud(id) {
    try {
      if (!window.db) throw new Error("Firestore unavailable");
      await window.deleteDoc(window.doc(window.db, "reports", id));
      console.log('[Reports] Deleted from cloud:', id);
      this.loadReports();
    } catch (e) {
      console.error('[Reports] Delete failed:', e);
      NexusApp.showToast('Erro ao deletar: ' + e.message, 'error');
    }
  },

  getDefaultReports() {
    return [
      {
        id: '1',
        title: 'Relatório Mensal de Qualidade',
        type: 'monthly',
        status: 'completed',
        createdAt: new Date().toISOString(),
        createdBy: NepAuth?.getUser()?.name || 'Sistema',
        description: 'Análise consolidada dos indicadores de qualidade do mês.',
        attachments: [],
        content: 'Resumo executivo das métricas de qualidade operacional...'
      },
      {
        id: '2',
        title: 'Análise de Rechamada - Semana 52',
        type: 'weekly',
        status: 'draft',
        createdAt: new Date().toISOString(),
        createdBy: NepAuth?.getUser()?.name || 'Sistema',
        description: 'Análise detalhada das taxa de rechamada e transferência.',
        attachments: [],
        content: ''
      }
    ];
  },

  render(container) {
    this.container = container;

    // Auto-load only once
    if (!this.initialized && !this.loading) {
      this.loadReports();
    }

    if (this.loading) {
      container.innerHTML = `
        <div class="loading-state" style="text-align: center; padding: 40px;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: var(--primary-500);"></i>
            <p style="margin-top: 10px; color: var(--text-secondary);">Carregando relatórios...</p>
        </div>`;
      return;
    }

    try {
      if (this.currentReport) {
        this.renderReportEditor(container);
      } else {
        this.renderReportsList(container);
      }
    } catch (e) {
      console.error("Render catch:", e);
      container.innerHTML = `<div class="error-state">Erro ao renderizar: ${e.message}</div>`;
    }
  },

  renderReportsList(container) {
    container.innerHTML = `
      <div class="reports-page animate-fade-in">
        <div class="reports-header">
          <div class="reports-header-left">
            <h1 class="page-title">Relatórios</h1>
            <p class="page-description">Crie e gerencie seus relatórios executivos</p>
          </div>
          <button class="btn btn-primary" id="btn-new-report">
            <i class="fa-solid fa-plus"></i> Novo Relatório
          </button>
        </div>

        <div class="reports-stats">
          <div class="report-stat-card">
            <div class="stat-icon">📄</div>
            <div class="stat-info">
              <span class="stat-value">${this.reports.length}</span>
              <span class="stat-label">Total de Relatórios</span>
            </div>
          </div>
          <div class="report-stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <span class="stat-value">${this.reports.filter(r => r.status === 'completed').length}</span>
              <span class="stat-label">Concluídos</span>
            </div>
          </div>
          <div class="report-stat-card">
            <div class="stat-icon">📝</div>
            <div class="stat-info">
              <span class="stat-value">${this.reports.filter(r => r.status === 'draft').length}</span>
              <span class="stat-label">Rascunhos</span>
            </div>
          </div>
        </div>

        <div class="reports-filter">
          <div class="filter-tabs">
            <button class="filter-tab active" data-filter="all">Todos</button>
            <button class="filter-tab" data-filter="completed">Concluídos</button>
            <button class="filter-tab" data-filter="draft">Rascunhos</button>
          </div>
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input type="text" class="form-input search-input" placeholder="Buscar relatórios...">
          </div>
        </div>

        <div class="reports-grid">
          ${this.reports.map(report => this.renderReportCard(report)).join('')}
          ${this.reports.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon">📋</div>
              <h3 class="empty-state-title">Nenhum relatório</h3>
              <p class="empty-state-description">Crie seu primeiro relatório para começar!</p>
            </div>
          ` : ''}
        </div>

        ${this.renderReportModal()}
      </div>
    `;

    this.attachEvents();
  },

  renderReportCard(report) {
    const typeLabels = {
      monthly: { label: 'Mensal', color: 'primary' },
      weekly: { label: 'Semanal', color: 'accent' },
      daily: { label: 'Diário', color: 'success' },
      custom: { label: 'Personalizado', color: 'warning' }
    };
    const type = typeLabels[report.type] || typeLabels.custom;

    return `
      <div class="report-card ${report.status}" data-report-id="${report.id}">
        <div class="report-card-header">
          <span class="report-type badge badge-${type.color}">${type.label}</span>
          <span class="report-status ${report.status}">
            ${report.status === 'completed' ? '✓ Concluído' : '📝 Rascunho'}
          </span>
        </div>
        <h3 class="report-title">${report.title}</h3>
        <p class="report-description">${report.description || 'Sem descrição'}</p>
        <div class="report-meta">
          <span class="report-author">
            <i class="fa-solid fa-user"></i> ${report.createdBy}
          </span>
          <span class="report-date">
            <i class="fa-solid fa-calendar"></i> ${new Date(report.createdAt).toLocaleDateString('pt-BR')}
          </span>
        </div>
        <div class="report-attachments">
          <i class="fa-solid fa-paperclip"></i>
          ${report.attachments?.length || 0} anexo(s)
        </div>
        <div class="report-actions">
          <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${report.id}">
            <i class="fa-solid fa-pen"></i> Editar
          </button>
          <button class="btn btn-sm btn-ghost" data-action="delete" data-id="${report.id}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  },

  renderReportEditor(container) {
    const report = this.reports.find(r => r.id === this.currentReport) || {
      id: '',
      title: '',
      type: 'custom',
      status: 'draft',
      description: '',
      content: '',
      attachments: []
    };

    const currentUser = window.NepAuth?.getUser()?.name || '';
    const isAdmin = localStorage.getItem('nep_is_admin') === 'true';
    const isOwner = !report.id || report.createdBy === currentUser || isAdmin;
    const disabledAttr = isOwner ? '' : 'disabled style="opacity: 0.7; pointer-events: none; background: #e2e8f010;"';


    container.innerHTML = `
      <div class="report-editor animate-fade-in">
        <div class="editor-header">
          <button class="btn btn-ghost" id="btn-back-reports">
            <i class="fa-solid fa-arrow-left"></i> Voltar
          </button>
            <div class="editor-actions">
              ${isOwner ? `
              <button class="btn btn-secondary" id="btn-save-draft">
                <i class="fa-solid fa-save"></i> Salvar Rascunho
              </button>
              <button class="btn btn-primary" id="btn-publish-report">
                <i class="fa-solid fa-check"></i> Concluir Relatório
              </button>
              ` : '<div class="badge badge-warning">Modo Leitura (Somente Proprietário)</div>'}
            </div>
          </div>

          <div class="editor-content">
            <div class="editor-main">
              <input type="hidden" id="report-id" value="${report.id}">
              
              <input type="text" class="editor-title" id="report-title" 
                     value="${report.title}" placeholder="Título do Relatório" ${disabledAttr}>
              
              <div class="editor-meta-row">
                <div class="form-group">
                  <label class="form-label">Tipo</label>
                  <select class="form-input form-select" id="report-type" ${disabledAttr}>
                    <option value="daily" ${report.type === 'daily' ? 'selected' : ''}>Diário</option>
                    <option value="weekly" ${report.type === 'weekly' ? 'selected' : ''}>Semanal</option>
                    <option value="monthly" ${report.type === 'monthly' ? 'selected' : ''}>Mensal</option>
                    <option value="custom" ${report.type === 'custom' ? 'selected' : ''}>Personalizado</option>
                  </select>
                </div>
                <div class="form-group" style="flex: 2;">
                  <label class="form-label">Descrição/Sentido</label>
                  <input type="text" class="form-input" id="report-description" 
                         value="${report.description}" placeholder="Qual o objetivo deste relatório?" ${disabledAttr}>
                </div>
              </div>

              <div class="editor-body">
                <label class="form-label">Conteúdo</label>
                <textarea class="form-input editor-textarea" id="report-content" 
                          placeholder="Digite o conteúdo do relatório..." ${disabledAttr}>${report.content}</textarea>
              </div>

            <div class="editor-attachments">
              <div class="attachments-header">
                <label class="form-label">Anexos</label>
                ${isOwner ? `
                <div class="attachment-buttons">
                  <label class="btn btn-sm btn-secondary">
                    <i class="fa-solid fa-image"></i> Imagem
                    <input type="file" accept="image/*" id="attach-image" hidden>
                  </label>
                  <label class="btn btn-sm btn-secondary">
                    <i class="fa-solid fa-file-pdf"></i> PDF
                    <input type="file" accept=".pdf" id="attach-pdf" hidden>
                  </label>
                </div>
                ` : ''}
              </div>
              <div class="attachments-list" id="attachments-list">
                ${(report.attachments || []).map((att, idx) => `
                  <div class="attachment-item" data-index="${idx}" title="Clique para abrir">
                    <span class="attachment-icon">${att.type === 'image' ? '🖼️' : '📄'}</span>
                    <span class="attachment-name">${att.name}</span>
                    <span class="attachment-size">${this.formatSize(att.size)}</span>
                    <span class="attachment-storage" title="${att.storage === 'supabase' ? 'Salvo na nuvem' : 'Salvo localmente (temporário)'}">
                      ${att.storage === 'supabase' ? '☁️' : '💾'}
                    </span>
                    <button class="btn btn-icon btn-ghost btn-sm remove-attachment" data-index="${idx}" ${isOwner ? '' : 'style="display:none;"'}>
                      <i class="fa-solid fa-times"></i>
                    </button>
                  </div>
                `).join('')}
                ${(report.attachments || []).length === 0 ? `
                  <div class="no-attachments">Nenhum anexo adicionado</div>
                ` : ''}
              </div>
              <div class="attachment-hint">
                <i class="fa-solid fa-info-circle"></i>
                Tamanho máximo por arquivo: 10MB | Clique no anexo para visualizar
              </div>

            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEditorEvents();
  },

  renderReportModal() {
    return `
      <div class="modal-backdrop" id="report-modal">
        <div class="modal" style="max-width: 500px;">
          <div class="modal-header">
            <h3 class="modal-title">Novo Relatório</h3>
            <button class="modal-close" id="report-modal-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="report-templates">
              <div class="template-card" data-template="monthly">
                <div class="template-icon">📊</div>
                <div class="template-info">
                  <div class="template-name">Relatório Mensal</div>
                  <div class="template-desc">Análise consolidada do mês</div>
                </div>
              </div>
              <div class="template-card" data-template="weekly">
                <div class="template-icon">📈</div>
                <div class="template-info">
                  <div class="template-name">Relatório Semanal</div>
                  <div class="template-desc">Resumo da semana</div>
                </div>
              </div>
              <div class="template-card" data-template="daily">
                <div class="template-icon">📋</div>
                <div class="template-info">
                  <div class="template-name">Relatório Diário</div>
                  <div class="template-desc">Registro do dia</div>
                </div>
              </div>
              <div class="template-card" data-template="custom">
                <div class="template-icon">✏️</div>
                <div class="template-info">
                  <div class="template-name">Personalizado</div>
                  <div class="template-desc">Formato livre</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  attachEvents() {
    document.getElementById('btn-new-report')?.addEventListener('click', () => {
      document.getElementById('report-modal').classList.add('active');
    });

    document.getElementById('report-modal-close')?.addEventListener('click', () => {
      document.getElementById('report-modal').classList.remove('active');
    });

    document.getElementById('report-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'report-modal') {
        document.getElementById('report-modal').classList.remove('active');
      }
    });

    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.template;
        const newReport = {
          id: Date.now().toString(),
          title: '',
          type: type,
          status: 'draft',
          createdAt: new Date().toISOString(),
          createdBy: NepAuth?.getUser()?.name || 'Usuário',
          description: '',
          content: '',
          attachments: []
        };
        this.reports.push(newReport);
        this.saveReportToCloud(newReport);
        this.currentReport = newReport.id;
        document.getElementById('report-modal').classList.remove('active');
        this.render(document.getElementById('page-content'));
      });
    });

    document.querySelectorAll('.report-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        this.currentReport = card.dataset.reportId;
        this.render(document.getElementById('page-content'));
      });
    });

    document.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.currentReport = btn.dataset.id;
        this.render(document.getElementById('page-content'));
      });
    });

    document.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Excluir este relatório?')) {
          await this.deleteReportFromCloud(btn.dataset.id);
          this.render(document.getElementById('page-content'));
          NexusApp.showToast('Relatório excluído', 'success');
        }
      });
    });
  },

  attachEditorEvents() {
    document.getElementById('btn-back-reports')?.addEventListener('click', () => {
      this.currentReport = null;
      this.render(document.getElementById('page-content'));
    });

    document.getElementById('btn-save-draft')?.addEventListener('click', () => {
      this.saveCurrentReport('draft');
    });

    document.getElementById('btn-publish-report')?.addEventListener('click', () => {
      this.saveCurrentReport('completed');
    });

    // File attachments - Integrado com Supabase Storage
    const handleFile = async (file, type) => {
      // Validações
      if (file.size > 10 * 1024 * 1024) {
        NexusApp.showToast('Arquivo muito grande! Máximo 10MB', 'error');
        return;
      }

      const report = this.reports.find(r => r.id === this.currentReport);
      if (!report) return;

      report.attachments = report.attachments || [];

      // Mostra loading na lista de anexos
      const attachList = document.getElementById('attachments-list');
      const loadingEl = document.createElement('div');
      loadingEl.className = 'attachment-item uploading';
      loadingEl.innerHTML = `
                <span class="attachment-icon"><i class="fa-solid fa-spinner fa-spin"></i></span>
                <span class="attachment-name">Enviando ${file.name}...</span>
                <span class="attachment-size">${this.formatSize(file.size)}</span>
            `;
      attachList?.appendChild(loadingEl);

      try {
        let attachmentData;

        // Tenta usar Supabase Storage se disponível
        if (window.StorageService && window.SupabaseClient?.isReady) {
          const result = await StorageService.uploadAttachment('reports', report.id, file);

          attachmentData = {
            id: result.id,
            name: file.name,
            size: file.size,
            type: type,
            url: result.url,
            path: result.path,
            uploadedAt: result.uploadedAt,
            storage: 'supabase' // Marca como armazenado no Supabase
          };

          console.log('[Reports] ✅ Anexo salvo no Supabase:', result.url);
          NexusApp.showToast('Anexo enviado para a nuvem! ☁️', 'success');

        } else {
          // Fallback para URL local (temporária)
          attachmentData = {
            id: Date.now().toString(),
            name: file.name,
            size: file.size,
            type: type,
            url: URL.createObjectURL(file),
            storage: 'local' // Marca como local (temporário)
          };

          console.log('[Reports] ℹ️ Anexo salvo localmente (Supabase não configurado)');
          NexusApp.showToast('Anexo adicionado! (local)', 'success');
        }

        report.attachments.push(attachmentData);
        this.saveReportToCloud(report);

      } catch (error) {
        console.error('[Reports] Erro no upload:', error);
        NexusApp.showToast('Erro ao enviar anexo: ' + error.message, 'error');
      }

      // Re-renderiza para mostrar o anexo
      this.render(document.getElementById('page-content'));
    };

    document.getElementById('attach-image')?.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFile(e.target.files[0], 'image');
    });

    document.getElementById('attach-pdf')?.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFile(e.target.files[0], 'pdf');
    });

    // Remover anexos - também remove do Supabase se aplicável
    document.querySelectorAll('.remove-attachment').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.index);
        const report = this.reports.find(r => r.id === this.currentReport);

        if (report && report.attachments) {
          const attachment = report.attachments[idx];

          // Se está no Supabase, deleta de lá também
          if (attachment?.storage === 'supabase' && attachment.path) {
            try {
              if (window.StorageService && window.SupabaseClient?.isReady) {
                await StorageService.delete(SupabaseClient.buckets.attachments, attachment.path);
                console.log('[Reports] 🗑️ Anexo removido do Supabase:', attachment.path);
              }
            } catch (e) {
              console.warn('[Reports] Não foi possível remover do Supabase:', e);
            }
          }

          report.attachments.splice(idx, 1);
          this.saveReportToCloud(report);
          this.render(document.getElementById('page-content'));
          NexusApp.showToast('Anexo removido', 'success');
        }
      });
    });

    // Preview/download de anexos
    document.querySelectorAll('.attachment-item[data-index]').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.remove-attachment')) return;

        const idx = parseInt(item.dataset.index);
        const report = this.reports.find(r => r.id === this.currentReport);
        const attachment = report?.attachments?.[idx];

        if (attachment?.url) {
          window.open(attachment.url, '_blank');
        }
      });
    });
  },

  saveCurrentReport(status) {
    const id = document.getElementById('report-id').value;
    const title = document.getElementById('report-title').value.trim();
    const type = document.getElementById('report-type').value;
    const description = document.getElementById('report-description').value.trim();
    const content = document.getElementById('report-content').value.trim();

    if (!title) {
      NexusApp.showToast('Digite um título para o relatório', 'error');
      return;
    }

    const report = this.reports.find(r => r.id === id);
    if (report) {
      report.title = title;
      report.type = type;
      report.description = description;
      report.content = content;
      report.status = status;
      report.updatedAt = new Date().toISOString();
      this.saveReportToCloud(report);
      // Gamificação: pontuar relatório concluído
      if (status === 'completed') {
        const uid = localStorage.getItem('nep_user_uid');
        if (uid && window.NexusGamification) {
          window.NexusGamification.addPoints(uid, 10, 'REPORT_SENT', `Relatório: ${title}`);
          if (window.NexusAchievements) window.NexusAchievements.incrementStat(uid, 'reports_sent');
        }
      }
      NexusApp.showToast(status === 'completed' ? 'Relatório concluído! +10 pts 🎉' : 'Rascunho salvo!', 'success');
    }
  },

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
};

// Reports Styles
const reportsStyles = document.createElement('style');
reportsStyles.textContent = `
  .reports-page { max-width: 1400px; margin: 0 auto; }
  
  .reports-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-6);
  }
  
  .reports-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }
  
  .report-stat-card {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
  }
  
  .stat-icon { font-size: 32px; }
  .stat-value { font-size: var(--text-2xl); font-weight: var(--font-bold); display: block; }
  .stat-label { font-size: var(--text-sm); color: var(--text-secondary); }
  
  .reports-filter {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-6);
    flex-wrap: wrap;
    gap: var(--space-4);
  }
  
  .filter-tabs {
    display: flex;
    gap: var(--space-2);
    background: var(--surface-card);
    padding: var(--space-1);
    border-radius: var(--radius-lg);
    border: 1px solid var(--surface-border);
  }
  
  .filter-tab {
    padding: var(--space-2) var(--space-4);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .filter-tab:hover { color: var(--text-primary); }
  .filter-tab.active { background: var(--primary-500); color: white; }
  
  .reports-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-4);
  }
  
  .report-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .report-card:hover {
    border-color: var(--primary-500);
    transform: translateY(-2px);
  }
  
  .report-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
  }
  
  .report-status {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }
  
  .report-status.completed { color: var(--success-500); }
  
  .report-title {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    margin-bottom: var(--space-2);
  }
  
  .report-description {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin-bottom: var(--space-3);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .report-meta {
    display: flex;
    gap: var(--space-4);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    margin-bottom: var(--space-3);
  }
  
  .report-attachments {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    margin-bottom: var(--space-4);
  }
  
  .report-actions {
    display: flex;
    gap: var(--space-2);
  }
  
  /* Report Editor */
  .report-editor { max-width: 900px; margin: 0 auto; }
  
  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-6);
  }
  
  .editor-actions { display: flex; gap: var(--space-2); }
  
  .editor-content {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    padding: var(--space-6);
  }
  
  .editor-title {
    width: 100%;
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    background: transparent;
    border: none;
    border-bottom: 2px solid var(--surface-border);
    padding: var(--space-3) 0;
    margin-bottom: var(--space-4);
    color: var(--text-primary);
  }
  
  .editor-title:focus {
    outline: none;
    border-color: var(--primary-500);
  }
  
  .editor-meta-row {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }
  
  .editor-body { margin-bottom: var(--space-4); }
  
  .editor-textarea {
    min-height: 300px;
    resize: vertical;
    font-family: inherit;
    line-height: 1.7;
  }
  
  .editor-attachments {
    border-top: 1px solid var(--surface-border);
    padding-top: var(--space-4);
  }
  
  .attachments-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
  }
  
  .attachment-buttons { display: flex; gap: var(--space-2); }
  
  .attachments-list {
    background: var(--surface-elevated);
    border-radius: var(--radius-lg);
    padding: var(--space-3);
    min-height: 60px;
  }
  
  .attachment-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2);
    border-radius: var(--radius-md);
  }
  
  .attachment-item:hover { background: var(--surface-hover); }
  
  .attachment-name { flex: 1; font-size: var(--text-sm); }
  .attachment-size { font-size: var(--text-xs); color: var(--text-tertiary); }
  
  .no-attachments {
    text-align: center;
    color: var(--text-tertiary);
    font-size: var(--text-sm);
    padding: var(--space-4);
  }
  
  .attachment-hint {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    margin-top: var(--space-2);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  
  /* Templates */
  .report-templates {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }
  
  .template-card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--surface-elevated);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .template-card:hover {
    border-color: var(--primary-500);
    background: var(--surface-hover);
  }
  
  .template-icon { font-size: 28px; }
  .template-name { font-weight: var(--font-medium); }
  .template-desc { font-size: var(--text-xs); color: var(--text-tertiary); }
  
  @media (max-width: 768px) {
    .reports-stats { grid-template-columns: 1fr; }
    .report-templates { grid-template-columns: 1fr; }
    .editor-meta-row { flex-direction: column; }
  }
`;
document.head.appendChild(reportsStyles);

window.NexusReports = NexusReports;
