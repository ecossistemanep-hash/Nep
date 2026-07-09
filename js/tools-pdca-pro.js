/**
 * PDCA PRO - Ciclo de Melhoria Contínua Profissional
 * Com status, responsáveis, prazos, progresso visual e integração IA
 */

const PDCAPro = {
  data: {
    title: '',
    description: '',
    createdAt: null,
    plan: [],
    do: [],
    check: [],
    act: []
  },

  phaseConfig: {
    plan: {
      label: 'Plan',
      fullLabel: 'Planejar',
      icon: 'fa-clipboard-list',
      color: '#3b82f6',
      desc: 'Identifique o problema, analise causas raiz e defina plano de ação'
    },
    do: {
      label: 'Do',
      fullLabel: 'Executar',
      icon: 'fa-play',
      color: '#22c55e',
      desc: 'Execute o plano de ação conforme planejado'
    },
    check: {
      label: 'Check',
      fullLabel: 'Verificar',
      icon: 'fa-magnifying-glass-chart',
      color: '#f59e0b',
      desc: 'Verifique os resultados e compare com o esperado'
    },
    act: {
      label: 'Act',
      fullLabel: 'Agir',
      icon: 'fa-rotate',
      color: '#ef4444',
      desc: 'Padronize as melhorias ou inicie novo ciclo'
    }
  },

  init() {
    this.load();
  },

  load() {
    try {
      const saved = localStorage.getItem('nexus_pdca_pro');
      if (saved) {
        this.data = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[PDCA Pro] Erro ao carregar:', e);
    }
  },

  save() {
    localStorage.setItem('nexus_pdca_pro', JSON.stringify(this.data));
    // Salvar no Supabase se disponível
    if (typeof ToolsService !== 'undefined') {
      ToolsService.savePDCA(this.data).catch(e => console.warn('[PDCA Pro] Erro Supabase:', e));
    }
  },

  getProgress() {
    const phases = ['plan', 'do', 'check', 'act'];
    let total = 0, completed = 0;

    phases.forEach(phase => {
      const items = this.data[phase] || [];
      total += items.length;
      completed += items.filter(i => i.status === 'completed').length;
    });

    return total === 0 ? 0 : Math.round((completed / total) * 100);
  },

  getPhaseProgress(phase) {
    const items = this.data[phase] || [];
    if (items.length === 0) return 0;
    const completed = items.filter(i => i.status === 'completed').length;
    return Math.round((completed / items.length) * 100);
  },

  render() {
    this.load();
    const progress = this.getProgress();
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (progress / 100) * circumference;

    return `
      <div class="tool-pro-container">
        <!-- Header -->
        <div class="tool-pro-header">
          <div class="tool-pro-header-left">
            <div class="tool-pro-icon" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
              <i class="fa-solid fa-arrows-spin"></i>
            </div>
            <div class="tool-pro-title">
              <h2>Ciclo PDCA</h2>
              <p>Plan → Do → Check → Act | Melhoria Contínua</p>
            </div>
          </div>
          <div class="tool-pro-actions">
            <button class="quality-btn quality-btn-ai" id="pdca-pro-ai-suggest">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Sugerir com IA
            </button>
            <button class="quality-btn quality-btn-secondary" id="pdca-pro-export">
              <i class="fa-solid fa-download"></i> Exportar
            </button>
            <button class="quality-btn quality-btn-secondary" id="pdca-pro-history">
              <i class="fa-solid fa-clock-rotate-left"></i> Histórico
            </button>
          </div>
        </div>

        <!-- Meta Info -->
        <div class="pdca-pro-meta">
          <div class="pdca-pro-meta-field">
            <label>Título do Ciclo PDCA</label>
            <input type="text" id="pdca-pro-title" placeholder="Ex: Redução de retrabalho no setor X" 
                   value="${this.data.title || ''}" />
          </div>
          <div class="pdca-pro-meta-field">
            <label>Descrição do Problema</label>
            <textarea id="pdca-pro-desc" rows="2" placeholder="Descreva o problema que será abordado...">${this.data.description || ''}</textarea>
          </div>
        </div>

        <!-- Progress Ring -->
        <div class="pdca-pro-progress">
          <div class="pdca-pro-progress-ring">
            <svg class="pdca-pro-progress-circle" width="140" height="140">
              <circle class="pdca-pro-progress-bg" cx="70" cy="70" r="54" />
              <circle class="pdca-pro-progress-fill" cx="70" cy="70" r="54"
                      stroke-dasharray="${circumference}"
                      stroke-dashoffset="${offset}"
                      style="stroke: ${progress >= 100 ? '#22c55e' : progress >= 50 ? '#3b82f6' : '#f59e0b'};" />
            </svg>
            <div class="pdca-pro-progress-text">
              <div class="pdca-pro-progress-value">${progress}%</div>
              <div class="pdca-pro-progress-label">Concluído</div>
            </div>
          </div>
        </div>

        <!-- PDCA Grid -->
        <div class="pdca-pro-grid">
          ${Object.entries(this.phaseConfig).map(([key, config]) => this.renderPhase(key, config)).join('')}
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="quality-btn quality-btn-primary" id="pdca-pro-save">
            <i class="fa-solid fa-save"></i> Salvar Ciclo
          </button>
          <button class="quality-btn quality-btn-danger" id="pdca-pro-clear">
            <i class="fa-solid fa-trash"></i> Limpar Tudo
          </button>
        </div>
      </div>

      <!-- Item Modal -->
      <div class="pdca-pro-item-modal" id="pdca-pro-modal" style="display: none;">
        <div class="pdca-pro-item-modal-content">
          <div class="pdca-pro-item-modal-header">
            <h3 id="pdca-modal-title">Editar Item</h3>
            <button class="quality-btn quality-btn-secondary quality-btn-sm" id="pdca-modal-close">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
          <div class="pdca-pro-item-modal-body">
            <div class="pdca-pro-meta-field">
              <label>Descrição</label>
              <textarea id="pdca-modal-text" rows="3"></textarea>
            </div>
            <div class="pdca-pro-meta-field">
              <label>Responsável</label>
              <input type="text" id="pdca-modal-owner" placeholder="Nome do responsável" />
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="pdca-pro-meta-field">
                <label>Prazo</label>
                <input type="date" id="pdca-modal-deadline" />
              </div>
              <div class="pdca-pro-meta-field">
                <label>Status</label>
                <select id="pdca-modal-status">
                  <option value="pending">Pendente</option>
                  <option value="in-progress">Em Andamento</option>
                  <option value="completed">Concluído</option>
                </select>
              </div>
            </div>
          </div>
          <div class="pdca-pro-item-modal-footer">
            <button class="quality-btn quality-btn-secondary" id="pdca-modal-cancel">Cancelar</button>
            <button class="quality-btn quality-btn-primary" id="pdca-modal-save">Salvar</button>
          </div>
        </div>
      </div>
    `;
  },

  renderPhase(phase, config) {
    const items = this.data[phase] || [];
    const phaseProgress = this.getPhaseProgress(phase);

    return `
      <div class="pdca-pro-phase">
        <div class="pdca-pro-phase-header ${phase}">
          <div class="pdca-pro-phase-title">
            <div class="pdca-pro-phase-icon ${phase}">
              <i class="fa-solid ${config.icon}"></i>
            </div>
            <div>
              <div class="pdca-pro-phase-name">${config.label}</div>
              <div style="font-size: 11px; color: var(--text-tertiary);">${config.fullLabel}</div>
            </div>
          </div>
          <div class="pdca-pro-phase-count">${items.length} itens • ${phaseProgress}%</div>
        </div>
        
        <div class="pdca-pro-phase-items" id="pdca-items-${phase}">
          ${items.length === 0 ? `
            <div class="quality-empty-state" style="padding: 20px;">
              <i class="fa-solid fa-inbox" style="font-size: 24px;"></i>
              <p style="margin-top: 8px; font-size: 12px;">Nenhum item ainda</p>
            </div>
          ` : items.map((item, idx) => this.renderItem(phase, item, idx)).join('')}
        </div>

        <div class="pdca-pro-phase-add">
          <input type="text" id="pdca-input-${phase}" placeholder="Novo item para ${config.label}..." />
          <button data-phase="${phase}" class="pdca-pro-add-btn">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    `;
  },

  renderItem(phase, item, idx) {
    const isOverdue = item.deadline && new Date(item.deadline) < new Date() && item.status !== 'completed';
    const statusLabels = {
      'pending': 'Pendente',
      'in-progress': 'Em Andamento',
      'completed': 'Concluído'
    };

    return `
      <div class="pdca-pro-item ${item.status === 'completed' ? 'completed' : ''}" data-phase="${phase}" data-idx="${idx}">
        <div class="pdca-pro-item-header">
          <div class="pdca-pro-item-check ${item.status === 'completed' ? 'checked' : ''}" 
               data-phase="${phase}" data-idx="${idx}">
            ${item.status === 'completed' ? '<i class="fa-solid fa-check"></i>' : ''}
          </div>
          <div class="pdca-pro-item-text">${item.text}</div>
          <span class="pdca-pro-status-badge ${item.status}">${statusLabels[item.status] || 'Pendente'}</span>
          <button class="pdca-pro-item-delete" data-phase="${phase}" data-idx="${idx}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
        ${(item.owner || item.deadline) ? `
          <div class="pdca-pro-item-meta">
            ${item.owner ? `
              <div class="pdca-pro-item-meta-field">
                <i class="fa-solid fa-user"></i> ${item.owner}
              </div>
            ` : ''}
            ${item.deadline ? `
              <div class="pdca-pro-item-meta-field ${isOverdue ? 'overdue' : ''}">
                <i class="fa-solid fa-calendar"></i> ${new Date(item.deadline).toLocaleDateString('pt-BR')}
                ${isOverdue ? ' (Atrasado!)' : ''}
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  },

  bindEvents() {
    // Meta fields auto-save
    const titleInput = document.getElementById('pdca-pro-title');
    const descInput = document.getElementById('pdca-pro-desc');

    if (titleInput) {
      titleInput.addEventListener('blur', () => {
        this.data.title = titleInput.value;
        this.save();
      });
    }

    if (descInput) {
      descInput.addEventListener('blur', () => {
        this.data.description = descInput.value;
        this.save();
      });
    }

    // Add items
    document.querySelectorAll('.pdca-pro-add-btn').forEach(btn => {
      btn.addEventListener('click', () => this.addItem(btn.dataset.phase));
    });

    // Enter to add
    ['plan', 'do', 'check', 'act'].forEach(phase => {
      const input = document.getElementById(`pdca-input-${phase}`);
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this.addItem(phase);
        });
      }
    });

    // Toggle complete
    document.querySelectorAll('.pdca-pro-item-check').forEach(el => {
      el.addEventListener('click', (e) => {
        const phase = e.currentTarget.dataset.phase;
        const idx = parseInt(e.currentTarget.dataset.idx);
        this.toggleComplete(phase, idx);
      });
    });

    // Delete items
    document.querySelectorAll('.pdca-pro-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const phase = btn.dataset.phase;
        const idx = parseInt(btn.dataset.idx);
        this.deleteItem(phase, idx);
      });
    });

    // Click on item to edit
    document.querySelectorAll('.pdca-pro-item').forEach(item => {
      item.addEventListener('dblclick', () => {
        const phase = item.dataset.phase;
        const idx = parseInt(item.dataset.idx);
        this.openEditModal(phase, idx);
      });
    });

    // Modal events
    const modal = document.getElementById('pdca-pro-modal');
    const closeBtn = document.getElementById('pdca-modal-close');
    const cancelBtn = document.getElementById('pdca-modal-cancel');
    const saveBtn = document.getElementById('pdca-modal-save');

    if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());
    if (saveBtn) saveBtn.addEventListener('click', () => this.saveModalItem());
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal();
      });
    }

    // Action buttons
    document.getElementById('pdca-pro-save')?.addEventListener('click', () => {
      this.save();
      NexusApp?.showToast?.('Ciclo PDCA salvo!', 'success');
    });

    document.getElementById('pdca-pro-clear')?.addEventListener('click', () => {
      if (confirm('Limpar todo o ciclo PDCA? Esta ação não pode ser desfeita.')) {
        this.clear();
      }
    });

    document.getElementById('pdca-pro-export')?.addEventListener('click', () => this.showExportOptions());

    document.getElementById('pdca-pro-ai-suggest')?.addEventListener('click', () => this.aiSuggest());
  },

  addItem(phase) {
    const input = document.getElementById(`pdca-input-${phase}`);
    const text = input?.value?.trim();
    if (!text) return;

    if (!this.data[phase]) this.data[phase] = [];

    this.data[phase].push({
      id: Date.now(),
      text,
      status: 'pending',
      owner: '',
      deadline: '',
      createdAt: new Date().toISOString()
    });

    input.value = '';
    this.save();
    this.refresh();
    NexusApp?.showToast?.('Item adicionado!', 'success');
  },

  toggleComplete(phase, idx) {
    const item = this.data[phase]?.[idx];
    if (!item) return;

    item.status = item.status === 'completed' ? 'pending' : 'completed';
    if (item.status === 'completed') {
      item.completedAt = new Date().toISOString();
    }

    this.save();
    this.refresh();
  },

  deleteItem(phase, idx) {
    if (!confirm('Excluir este item?')) return;
    this.data[phase].splice(idx, 1);
    this.save();
    this.refresh();
  },

  openEditModal(phase, idx) {
    const item = this.data[phase]?.[idx];
    if (!item) return;

    this.editingPhase = phase;
    this.editingIdx = idx;

    document.getElementById('pdca-modal-text').value = item.text || '';
    document.getElementById('pdca-modal-owner').value = item.owner || '';
    document.getElementById('pdca-modal-deadline').value = item.deadline || '';
    document.getElementById('pdca-modal-status').value = item.status || 'pending';
    document.getElementById('pdca-modal-title').textContent = `Editar Item - ${this.phaseConfig[phase].label}`;

    document.getElementById('pdca-pro-modal').style.display = 'flex';
  },

  closeModal() {
    document.getElementById('pdca-pro-modal').style.display = 'none';
    this.editingPhase = null;
    this.editingIdx = null;
  },

  saveModalItem() {
    if (this.editingPhase === null || this.editingIdx === null) return;

    const item = this.data[this.editingPhase]?.[this.editingIdx];
    if (!item) return;

    item.text = document.getElementById('pdca-modal-text').value.trim();
    item.owner = document.getElementById('pdca-modal-owner').value.trim();
    item.deadline = document.getElementById('pdca-modal-deadline').value;
    item.status = document.getElementById('pdca-modal-status').value;

    this.save();
    this.closeModal();
    this.refresh();
    NexusApp?.showToast?.('Item atualizado!', 'success');
  },

  clear() {
    this.data = {
      title: '',
      description: '',
      createdAt: null,
      plan: [],
      do: [],
      check: [],
      act: []
    };
    this.save();
    this.refresh();
    NexusApp?.showToast?.('Ciclo PDCA limpo!', 'info');
  },

  refresh() {
    const container = document.getElementById('page-content');
    if (container && NexusTools.currentTool === 'pdca') {
      NexusTools.render(container);
    }
  },

  showExportOptions() {
    if (typeof QualityExport !== 'undefined') {
      QualityExport.showExportModal({
        title: 'PDCA',
        onPDF: () => QualityExport.toPDF('.tool-pro-container', `pdca_${Date.now()}.pdf`, `PDCA - ${this.data.title || 'Ciclo'}`),
        onPNG: () => QualityExport.toPNG('.tool-pro-container', `pdca_${Date.now()}.png`),
        onTXT: () => this.exportPDCA()
      });
    } else {
      this.exportPDCA();
    }
  },

  exportPDCA() {
    let content = '═══════════════════════════════════════════════════════════\n';
    content += '                       CICLO PDCA\n';
    content += '═══════════════════════════════════════════════════════════\n\n';

    if (this.data.title) content += `📋 TÍTULO: ${this.data.title}\n`;
    if (this.data.description) content += `📝 PROBLEMA: ${this.data.description}\n`;
    content += `📊 PROGRESSO: ${this.getProgress()}%\n`;
    content += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n\n`;

    Object.entries(this.phaseConfig).forEach(([phase, config]) => {
      const items = this.data[phase] || [];
      content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      content += `  ${config.label.toUpperCase()} - ${config.fullLabel} (${items.length} itens)\n`;
      content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (items.length === 0) {
        content += '  (nenhum item)\n\n';
      } else {
        items.forEach((item, i) => {
          const status = item.status === 'completed' ? '✅' : item.status === 'in-progress' ? '🔄' : '⏳';
          content += `  ${status} ${i + 1}. ${item.text}\n`;
          if (item.owner) content += `      👤 Responsável: ${item.owner}\n`;
          if (item.deadline) content += `      📅 Prazo: ${new Date(item.deadline).toLocaleDateString('pt-BR')}\n`;
          content += '\n';
        });
      }
    });

    content += '\n═══════════════════════════════════════════════════════════\n';
    content += `Exportado pelo NEP Delivery Control em ${new Date().toLocaleString('pt-BR')}\n`;

    this.downloadText(content, `pdca_${this.data.title?.replace(/\s+/g, '_') || 'export'}_${Date.now()}.txt`);
  },

  downloadText(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  async aiSuggest() {
    const problem = this.data.description || this.data.title;
    if (!problem) {
      NexusApp?.showToast?.('Preencha o título ou descrição do problema primeiro', 'error');
      return;
    }

    NexusApp?.showToast?.('🤖 Consultando IA...', 'info');

    try {
      const PPLX_API_KEY = NexusTools.PPLX_API_KEY;
      if (!PPLX_API_KEY) throw new Error('API key não configurada');

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PPLX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{
            role: 'user',
            content: `Para o seguinte problema empresarial: "${problem}"

Sugira um ciclo PDCA completo e estruturado em formato JSON com a seguinte estrutura:
{
  "plan": ["ação 1", "ação 2", "ação 3"],
  "do": ["ação 1", "ação 2"],
  "check": ["verificação 1", "verificação 2"],
  "act": ["padronização 1", "melhoria 1"]
}

Responda APENAS com o JSON, sem explicações.`
          }],
          max_tokens: 1000
        })
      });

      if (!response.ok) throw new Error('API retornou erro');

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        this.applySuggestions(JSON.parse(jsonMatch[0]));
      } else {
        throw new Error('Resposta inválida');
      }
    } catch (error) {
      console.warn('[PDCA Pro] API Error:', error.message);
      // Fallback para sugestões offline
      if (typeof AIFallback !== 'undefined') {
        this.applySuggestions(AIFallback.pdca);
      } else {
        NexusApp?.showToast?.('IA indisponível. Tente novamente mais tarde.', 'warning');
      }
    }
  },

  applySuggestions(suggestions) {
    ['plan', 'do', 'check', 'act'].forEach(phase => {
      if (Array.isArray(suggestions[phase])) {
        suggestions[phase].forEach(text => {
          if (!this.data[phase]) this.data[phase] = [];
          this.data[phase].push({
            id: Date.now() + Math.random(),
            text: text,
            status: 'pending',
            owner: '',
            deadline: '',
            createdAt: new Date().toISOString(),
            aiGenerated: true
          });
        });
      }
    });
    this.save();
    this.refresh();
    NexusApp?.showToast?.('✨ Sugestões adicionadas!', 'success');
  }
};

// Exportar para uso global
window.PDCAPro = PDCAPro;
