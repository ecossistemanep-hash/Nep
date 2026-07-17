/**
 * 5 PORQUÊS PRO - Análise de Causa Raiz Visual
 * Com árvore visual, ramificações múltiplas e integração IA
 */

const CincoPorquesPro = {
  data: {
    problem: '',
    levels: ['', '', '', '', ''],
    rootCause: '',
    validated: false
  },

  init() {
    this.load();
  },

  load() {
    try {
      const saved = localStorage.getItem('nexus_5porques_pro');
      if (saved) {
        this.data = { ...this.data, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('[5 Porquês Pro] Erro ao carregar:', e);
    }
  },

  save() {
    localStorage.setItem('nexus_5porques_pro', JSON.stringify(this.data));
    if (typeof ToolsService !== 'undefined') {
      ToolsService.save5Porques(this.data).catch(e => console.warn('[5 Porquês Pro] Erro Supabase:', e));
    }
  },

  getFilledCount() {
    return this.data.levels.filter(l => l && l.trim()).length;
  },

  render() {
    this.load();
    const filledCount = this.getFilledCount();
    const hasRootCause = this.data.levels[4] && this.data.levels[4].trim();

    return `
      <div class="tool-pro-container">
        <!-- Header -->
        <div class="tool-pro-header">
          <div class="tool-pro-header-left">
            <div class="tool-pro-icon" style="background: linear-gradient(135deg, #84cc16, #65a30d);">
              <i class="fa-solid fa-question"></i>
            </div>
            <div class="tool-pro-title">
              <h2>5 Porquês</h2>
              <p>Técnica de Análise de Causa Raiz</p>
            </div>
          </div>
          <div class="tool-pro-actions">
            <button class="quality-btn quality-btn-secondary" id="5porques-export">
              <i class="fa-solid fa-download"></i> Exportar
            </button>
          </div>
        </div>

        <!-- Problem Statement -->
        <div class="porques-pro-problem">
          <div class="pdca-pro-meta-field">
            <label style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-crosshairs" style="color: var(--error-400);"></i>
              Problema / Sintoma Observado
            </label>
            <input type="text" id="5porques-problem" 
                   placeholder="Descreva claramente o problema que será analisado..."
                   value="${this.data.problem || ''}" 
                   style="font-size: 16px; padding: 16px;" />
          </div>
        </div>

        <!-- 5 Why Tree -->
        <div class="porques-pro-tree">
          ${[1, 2, 3, 4, 5].map(level => `
            <div class="porques-pro-level">
              <div class="porques-pro-level-marker l${level}">
                ${level}º
              </div>
              <div class="porques-pro-level-content">
                <div class="porques-pro-level-label">
                  Por que ${level === 1 ? 'isso acontece' : 'isso ocorre'}?
                </div>
                <input type="text" class="porques-pro-level-input" 
                       id="5porques-level-${level}"
                       placeholder="Porque..."
                       value="${this.data.levels[level - 1] || ''}" />
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Root Cause -->
        ${hasRootCause ? `
          <div class="porques-pro-root-cause">
            <div class="porques-pro-root-icon">🎯</div>
            <div class="porques-pro-root-label">Causa Raiz Identificada</div>
            <div class="porques-pro-root-text">${this.data.levels[4]}</div>
            
            <div style="margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 12px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" id="5porques-validated" ${this.data.validated ? 'checked' : ''} 
                       style="width: 20px; height: 20px;" />
                <span style="font-size: 14px;">Causa raiz validada pela equipe</span>
              </label>
            </div>
          </div>
        ` : `
          <div class="quality-empty-state" style="padding: 40px; background: var(--quality-card-bg); 
                      border-radius: 16px; border: 1px dashed var(--quality-card-border);">
            <i class="fa-solid fa-arrow-down" style="font-size: 32px; animation: bounce 1s infinite;"></i>
            <p style="margin-top: 12px;">Responda às perguntas para identificar a causa raiz</p>
          </div>
        `}

        <!-- Stats -->
        <div class="cep-pro-stats" style="margin-top: 24px;">
          <div class="cep-pro-stat-card">
            <div class="cep-pro-stat-label">Níveis Preenchidos</div>
            <div class="cep-pro-stat-value">${filledCount}/5</div>
          </div>
          <div class="cep-pro-stat-card">
            <div class="cep-pro-stat-label">Profundidade</div>
            <div class="cep-pro-stat-value ${filledCount >= 5 ? 'good' : filledCount >= 3 ? 'warning' : ''}">
              ${filledCount >= 5 ? 'Completa' : filledCount >= 3 ? 'Parcial' : 'Inicial'}
            </div>
          </div>
          <div class="cep-pro-stat-card">
            <div class="cep-pro-stat-label">Causa Raiz</div>
            <div class="cep-pro-stat-value ${hasRootCause ? 'good' : ''}">
              ${hasRootCause ? 'Identificada' : 'Pendente'}
            </div>
          </div>
          <div class="cep-pro-stat-card">
            <div class="cep-pro-stat-label">Validação</div>
            <div class="cep-pro-stat-value ${this.data.validated ? 'good' : ''}">
              ${this.data.validated ? 'Validada' : 'Não validada'}
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 12px; justify-content: center; margin-top: 24px;">
          <button class="quality-btn quality-btn-primary" id="5porques-save">
            <i class="fa-solid fa-save"></i> Salvar
          </button>
          <button class="quality-btn quality-btn-secondary" id="5porques-ishikawa">
            <i class="fa-solid fa-fish"></i> Abrir no Ishikawa
          </button>
          <button class="quality-btn quality-btn-danger" id="5porques-clear">
            <i class="fa-solid fa-trash"></i> Limpar
          </button>
        </div>
      </div>

      <style>
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      </style>
    `;
  },

  bindEvents() {
    // Problem input
    document.getElementById('5porques-problem')?.addEventListener('blur', (e) => {
      this.data.problem = e.target.value;
      this.save();
    });

    // Level inputs
    [1, 2, 3, 4, 5].forEach(level => {
      const input = document.getElementById(`5porques-level-${level}`);
      if (input) {
        input.addEventListener('blur', (e) => {
          this.data.levels[level - 1] = e.target.value;
          this.save();
        });
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && level < 5) {
            document.getElementById(`5porques-level-${level + 1}`)?.focus();
          }
        });
      }
    });

    // Validation checkbox
    document.getElementById('5porques-validated')?.addEventListener('change', (e) => {
      this.data.validated = e.target.checked;
      this.save();
      if (e.target.checked) {
        NexusApp?.showToast?.('✅ Causa raiz validada!', 'success');
      }
    });

    // Actions
    document.getElementById('5porques-save')?.addEventListener('click', () => {
      this.saveAll();
      NexusApp?.showToast?.('5 Porquês salvo!', 'success');
    });

    document.getElementById('5porques-export')?.addEventListener('click', () => this.showExportOptions());

    document.getElementById('5porques-ishikawa')?.addEventListener('click', () => {
      // Transferir a causa raiz para o Ishikawa
      if (this.data.levels[4]) {
        IshikawaPro.data.problem = this.data.problem;
        IshikawaPro.save();
      }
      NexusTools.currentTool = 'ishikawa';
      NexusTools.render(document.getElementById('page-content'));
    });

    document.getElementById('5porques-clear')?.addEventListener('click', () => {
      if (confirm('Limpar toda a análise?')) this.clear();
    });
  },

  saveAll() {
    this.data.problem = document.getElementById('5porques-problem')?.value || '';
    [1, 2, 3, 4, 5].forEach(level => {
      this.data.levels[level - 1] = document.getElementById(`5porques-level-${level}`)?.value || '';
    });
    this.save();
  },

  clear() {
    this.data = {
      problem: '',
      levels: ['', '', '', '', ''],
      rootCause: '',
      validated: false
    };
    this.save();
    this.refresh();
  },

  refresh() {
    const container = document.getElementById('page-content');
    if (container && NexusTools.currentTool === 'cincoporques') {
      NexusTools.render(container);
    }
  },

  showExportOptions() {
    if (typeof QualityExport !== 'undefined') {
      QualityExport.showExportModal({
        title: '5 Porquês',
        onPDF: () => QualityExport.toPDF('.tool-pro-container', `5porques_${Date.now()}.pdf`, '5 Porquês - Análise'),
        onPNG: () => QualityExport.toPNG('.tool-pro-container', `5porques_${Date.now()}.png`),
        onTXT: () => this.export()
      });
    } else {
      this.export();
    }
  },

  export() {
    let content = '═══════════════════════════════════════════════════════════\n';
    content += '                    5 PORQUÊS\n';
    content += '               Análise de Causa Raiz\n';
    content += '═══════════════════════════════════════════════════════════\n\n';

    content += `🎯 PROBLEMA: ${this.data.problem || '(não definido)'}\n\n`;

    content += '─────────────────────────────────────────────────────────────\n';
    this.data.levels.forEach((level, i) => {
      const marker = level ? '✓' : '○';
      content += `\n${marker} POR QUÊ ${i + 1}?\n`;
      content += `  ↳ ${level || '(não respondido)'}\n`;
    });
    content += '\n─────────────────────────────────────────────────────────────\n';

    if (this.data.levels[4]) {
      content += `\n🎯 CAUSA RAIZ IDENTIFICADA:\n`;
      content += `   "${this.data.levels[4]}"\n`;
      content += `   Status: ${this.data.validated ? '✅ VALIDADA' : '⏳ Pendente validação'}\n`;
    }

    content += `\n\nExportado pelo NEP Delivery Control em ${new Date().toLocaleString('pt-BR')}\n`;

    this.downloadText(content, `5_porques_${Date.now()}.txt`);
    NexusApp?.showToast?.('5 Porquês exportado!', 'success');
  },

  downloadText(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};

window.CincoPorquesPro = CincoPorquesPro;
