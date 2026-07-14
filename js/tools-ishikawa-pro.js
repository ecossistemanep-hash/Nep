/**
 * ISHIKAWA PRO - Diagrama de Causa e Efeito Profissional
 * Com visualização SVG, votação por causa, e análise IA
 */

const IshikawaPro = {
  data: {
    problem: '',
    causes: {
      metodo: [],
      maquina: [],
      maoDeObra: [],
      material: [],
      medicao: [],
      meioAmbiente: []
    }
  },

  categories: {
    metodo: { label: 'MÉTODO', icon: 'fa-clipboard-list', color: '#6366f1', desc: 'Processos, procedimentos, rotinas' },
    maquina: { label: 'MÁQUINA', icon: 'fa-cog', color: '#3b82f6', desc: 'Equipamentos, ferramentas, tecnologia' },
    maoDeObra: { label: 'MÃO DE OBRA', icon: 'fa-users', color: '#22c55e', desc: 'Pessoas, capacitação, motivação' },
    material: { label: 'MATERIAL', icon: 'fa-boxes-stacked', color: '#f59e0b', desc: 'Insumos, matéria-prima, fornecedores' },
    medicao: { label: 'MEDIÇÃO', icon: 'fa-ruler', color: '#ef4444', desc: 'Indicadores, métricas, controles' },
    meioAmbiente: { label: 'MEIO AMBIENTE', icon: 'fa-leaf', color: '#8b5cf6', desc: 'Ambiente físico, condições de trabalho' }
  },

  init() {
    this.load();
  },

  load() {
    try {
      const saved = localStorage.getItem('nexus_ishikawa_pro');
      if (saved) {
        this.data = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[Ishikawa Pro] Erro ao carregar:', e);
    }
  },

  save() {
    localStorage.setItem('nexus_ishikawa_pro', JSON.stringify(this.data));
    if (typeof ToolsService !== 'undefined') {
      ToolsService.saveIshikawa(this.data).catch(e => console.warn('[Ishikawa Pro] Erro Supabase:', e));
    }
  },

  getTotalCauses() {
    return Object.values(this.data.causes).reduce((sum, arr) => sum + arr.length, 0);
  },

  getTopCauses(limit = 3) {
    const allCauses = [];
    Object.entries(this.data.causes).forEach(([cat, causes]) => {
      causes.forEach(cause => {
        allCauses.push({ ...cause, category: cat });
      });
    });
    return allCauses.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, limit);
  },

  render() {
    this.load();
    const topCauses = this.getTopCauses();
    const leftCategories = ['metodo', 'maquina', 'maoDeObra'];
    const rightCategories = ['material', 'medicao', 'meioAmbiente'];

    return `
      <div class="tool-pro-container">
        <!-- Header -->
        <div class="tool-pro-header">
          <div class="tool-pro-header-left">
            <div class="tool-pro-icon" style="background: linear-gradient(135deg, #0ea5e9, #0284c7);">
              <i class="fa-solid fa-fish"></i>
            </div>
            <div class="tool-pro-title">
              <h2>Diagrama de Ishikawa</h2>
              <p>Espinha de Peixe | Análise de Causa Raiz (6M)</p>
            </div>
          </div>
          <div class="tool-pro-actions">
            <button class="quality-btn quality-btn-ai" id="ishi-pro-ai">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Analisar com IA
            </button>
            <button class="quality-btn quality-btn-secondary" id="ishi-pro-export-png">
              <i class="fa-solid fa-image"></i> Exportar PNG
            </button>
            <button class="quality-btn quality-btn-secondary" id="ishi-pro-export">
              <i class="fa-solid fa-download"></i> Exportar
            </button>
          </div>
        </div>

        <!-- Problem Input -->
        <div class="ishi-pro-problem-input">
          <i class="fa-solid fa-crosshairs"></i>
          <input type="text" id="ishi-pro-problem" 
                 placeholder="Digite o PROBLEMA ou EFEITO a ser analisado..."
                 value="${this.data.problem || ''}" />
        </div>

        <!-- Visual Diagram -->
        <div class="ishi-pro-canvas" id="ishi-canvas">
          <div class="ishi-pro-diagram">
            <!-- Left Categories -->
            <div class="ishi-pro-causes-left">
              ${leftCategories.map(cat => this.renderCategory(cat)).join('')}
            </div>
            
            <!-- Spine -->
            <div class="ishi-pro-spine"></div>
            
            <!-- Effect Box -->
            <div class="ishi-pro-effect-box">
              <div class="ishi-pro-effect-label">EFEITO</div>
              <div class="ishi-pro-effect-text" id="ishi-effect-display">
                ${this.data.problem || 'Problema a resolver'}
              </div>
            </div>
            
            <!-- Right Categories -->
            <div class="ishi-pro-causes-right">
              ${rightCategories.map(cat => this.renderCategory(cat)).join('')}
            </div>
          </div>
        </div>

        <!-- Top Causes -->
        ${topCauses.length > 0 ? `
          <div style="margin-bottom: 24px;">
            <h4 style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-star" style="color: #fbbf24;"></i> Causas Raiz Mais Votadas
            </h4>
            <div class="pareto-pro-insights">
              ${topCauses.map((cause, i) => `
                <div class="pareto-pro-insight-card ${i === 0 ? 'highlight' : ''}">
                  <div class="pareto-pro-insight-icon" style="background: ${this.categories[cause.category].color}; color: white;">
                    <i class="fa-solid ${this.categories[cause.category].icon}"></i>
                  </div>
                  <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-top: 8px;">
                    ${cause.text}
                  </div>
                  <div class="pareto-pro-insight-label" style="margin-top: 4px;">
                    ${this.categories[cause.category].label} • ${'⭐'.repeat(cause.rating || 1)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Stats -->
        <div class="cep-pro-stats" style="margin-bottom: 24px;">
          <div class="cep-pro-stat-card">
            <div class="cep-pro-stat-label">Total de Causas</div>
            <div class="cep-pro-stat-value">${this.getTotalCauses()}</div>
          </div>
          ${Object.entries(this.categories).map(([key, cat]) => `
            <div class="cep-pro-stat-card">
              <div class="cep-pro-stat-label">${cat.label}</div>
              <div class="cep-pro-stat-value" style="color: ${cat.color};">
                ${(this.data.causes[key] || []).length}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="quality-btn quality-btn-primary" id="ishi-pro-save">
            <i class="fa-solid fa-save"></i> Salvar
          </button>
          <button class="quality-btn quality-btn-danger" id="ishi-pro-clear">
            <i class="fa-solid fa-trash"></i> Limpar Tudo
          </button>
        </div>
      </div>
    `;
  },

  renderCategory(cat) {
    const config = this.categories[cat];
    const causes = this.data.causes[cat] || [];

    return `
      <div class="ishi-pro-category">
        <div class="ishi-pro-cat-header ${cat}">
          <div class="ishi-pro-cat-icon ${cat}">
            <i class="fa-solid ${config.icon}"></i>
          </div>
          <span>${config.label}</span>
          <span class="ishi-pro-cat-count">${causes.length}</span>
        </div>
        <div class="ishi-pro-cat-body">
          ${causes.map((cause, idx) => `
            <div class="ishi-pro-cause">
              <span class="ishi-pro-cause-text">${cause.text}</span>
              <div class="ishi-pro-cause-rating">
                ${[1, 2, 3, 4, 5].map(star => `
                  <i class="fa-solid fa-star ishi-pro-cause-star ${(cause.rating || 0) >= star ? 'active' : ''}"
                     data-cat="${cat}" data-idx="${idx}" data-rating="${star}"></i>
                `).join('')}
              </div>
              <button class="ishi-pro-cause-delete" data-cat="${cat}" data-idx="${idx}">
                <i class="fa-solid fa-times"></i>
              </button>
            </div>
          `).join('')}
          <div class="ishi-pro-cat-add">
            <input type="text" id="ishi-input-${cat}" placeholder="Nova causa..." />
            <button data-cat="${cat}" class="ishi-add-btn">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  bindEvents() {
    // Problem input
    const problemInput = document.getElementById('ishi-pro-problem');
    if (problemInput) {
      problemInput.addEventListener('input', () => {
        this.data.problem = problemInput.value;
        document.getElementById('ishi-effect-display').textContent = problemInput.value || 'Problema a resolver';
      });
      problemInput.addEventListener('blur', () => this.save());
    }

    // Add causes
    document.querySelectorAll('.ishi-add-btn').forEach(btn => {
      btn.addEventListener('click', () => this.addCause(btn.dataset.cat));
    });

    // Enter to add
    Object.keys(this.categories).forEach(cat => {
      const input = document.getElementById(`ishi-input-${cat}`);
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this.addCause(cat);
        });
      }
    });

    // Delete causes
    document.querySelectorAll('.ishi-pro-cause-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        this.deleteCause(btn.dataset.cat, parseInt(btn.dataset.idx));
      });
    });

    // Star ratings
    document.querySelectorAll('.ishi-pro-cause-star').forEach(star => {
      star.addEventListener('click', () => {
        this.rateCause(star.dataset.cat, parseInt(star.dataset.idx), parseInt(star.dataset.rating));
      });
    });

    // Actions
    document.getElementById('ishi-pro-save')?.addEventListener('click', () => {
      this.save();
      NexusApp?.showToast?.('Ishikawa salvo!', 'success');
    });

    document.getElementById('ishi-pro-clear')?.addEventListener('click', () => {
      if (confirm('Limpar todo o diagrama?')) this.clear();
    });

    document.getElementById('ishi-pro-export')?.addEventListener('click', () => this.showExportOptions());
    document.getElementById('ishi-pro-export-png')?.addEventListener('click', () => this.exportPNG());
    document.getElementById('ishi-pro-ai')?.addEventListener('click', () => this.aiAnalyze());
  },

  addCause(cat) {
    const input = document.getElementById(`ishi-input-${cat}`);
    const text = input?.value?.trim();
    if (!text) return;

    if (!this.data.causes[cat]) this.data.causes[cat] = [];

    this.data.causes[cat].push({
      id: Date.now(),
      text,
      rating: 0,
      createdAt: new Date().toISOString()
    });

    input.value = '';
    this.save();
    this.refresh();
    NexusApp?.showToast?.('Causa adicionada!', 'success');
  },

  deleteCause(cat, idx) {
    this.data.causes[cat].splice(idx, 1);
    this.save();
    this.refresh();
  },

  rateCause(cat, idx, rating) {
    const cause = this.data.causes[cat]?.[idx];
    if (cause) {
      cause.rating = rating;
      this.save();
      this.refresh();
    }
  },

  clear() {
    this.data = {
      problem: '',
      causes: {
        metodo: [],
        maquina: [],
        maoDeObra: [],
        material: [],
        medicao: [],
        meioAmbiente: []
      }
    };
    this.save();
    this.refresh();
    NexusApp?.showToast?.('Diagrama limpo!', 'info');
  },

  refresh() {
    const container = document.getElementById('page-content');
    if (container && NexusTools.currentTool === 'ishikawa') {
      NexusTools.render(container);
    }
  },

  showExportOptions() {
    if (typeof QualityExport !== 'undefined') {
      QualityExport.showExportModal({
        title: 'Ishikawa',
        onPDF: () => QualityExport.toPDF('.tool-pro-container', `ishikawa_${Date.now()}.pdf`, 'Diagrama de Ishikawa'),
        onPNG: () => this.exportPNG(),
        onTXT: () => this.export()
      });
    } else {
      this.export();
    }
  },

  export() {
    let content = '═══════════════════════════════════════════════════════════\n';
    content += '               DIAGRAMA DE ISHIKAWA (6M)\n';
    content += '                 Análise de Causa Raiz\n';
    content += '═══════════════════════════════════════════════════════════\n\n';

    content += `🎯 PROBLEMA/EFEITO: ${this.data.problem || '(não definido)'}\n\n`;
    content += `📊 Total de causas identificadas: ${this.getTotalCauses()}\n\n`;

    Object.entries(this.categories).forEach(([key, config]) => {
      const causes = this.data.causes[key] || [];
      content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      content += `  📁 ${config.label} (${causes.length} causas)\n`;
      content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

      if (causes.length === 0) {
        content += '  (nenhuma causa identificada)\n';
      } else {
        causes.sort((a, b) => (b.rating || 0) - (a.rating || 0)).forEach((cause, i) => {
          const stars = '⭐'.repeat(cause.rating || 0) || '☆';
          content += `  ${i + 1}. ${cause.text} ${stars}\n`;
        });
      }
      content += '\n';
    });

    const top = this.getTopCauses();
    if (top.length > 0) {
      content += '\n🏆 TOP CAUSAS RAIZ (mais votadas):\n';
      top.forEach((cause, i) => {
        content += `  ${i + 1}º ${cause.text} (${this.categories[cause.category].label})\n`;
      });
    }

    content += `\n\nExportado pelo NEP Delivery Control em ${new Date().toLocaleString('pt-BR')}\n`;

    this.downloadText(content, `ishikawa_${Date.now()}.txt`);
    NexusApp?.showToast?.('Ishikawa exportado!', 'success');
  },

  async exportPNG() {
    try {
      const canvas = document.getElementById('ishi-canvas');
      if (!canvas) return;

      // Usar html2canvas se disponível
      if (typeof html2canvas !== 'undefined') {
        const canvasImg = await html2canvas(canvas, { backgroundColor: '#0a0f1e' });
        const link = document.createElement('a');
        link.download = `ishikawa_${Date.now()}.png`;
        link.href = canvasImg.toDataURL();
        link.click();
        NexusApp?.showToast?.('PNG exportado!', 'success');
      } else {
        NexusApp?.showToast?.('Exportação PNG não disponível', 'warning');
      }
    } catch (e) {
      console.error('[Ishikawa Pro] Export PNG error:', e);
      NexusApp?.showToast?.('Erro ao exportar PNG', 'error');
    }
  },

  async aiAnalyze() {
    if (!this.data.problem) {
      NexusApp?.showToast?.('Defina o problema primeiro', 'error');
      return;
    }

    NexusApp?.showToast?.('🤖 Analisando com IA...', 'info');

    try {
      const PPLX_API_KEY = NexusTools.PPLX_API_KEY || (window.getPplxApiKey ? window.getPplxApiKey() : '');

      const currentCauses = Object.entries(this.data.causes)
        .map(([cat, causes]) => `${this.categories[cat].label}: ${causes.map(c => c.text).join(', ') || 'nenhuma'}`)
        .join('\n');

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
            content: `Analise este problema empresarial usando o diagrama Ishikawa (6M):

PROBLEMA: ${this.data.problem}

Causas já identificadas:
${currentCauses}

Sugira causas adicionais para cada categoria que ainda não foram mencionadas. 
Responda em JSON assim:
{
  "metodo": ["causa 1", "causa 2"],
  "maquina": ["causa 1"],
  "maoDeObra": ["causa 1", "causa 2"],
  "material": ["causa 1"],
  "medicao": ["causa 1"],
  "meioAmbiente": ["causa 1"]
}

Responda APENAS com o JSON, sem explicações.`
          }],
          max_tokens: 1000
        })
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        let added = 0;

        Object.keys(this.categories).forEach(cat => {
          if (Array.isArray(suggestions[cat])) {
            suggestions[cat].forEach(text => {
              // Evitar duplicatas
              const exists = this.data.causes[cat]?.some(c => c.text.toLowerCase() === text.toLowerCase());
              if (!exists) {
                if (!this.data.causes[cat]) this.data.causes[cat] = [];
                this.data.causes[cat].push({
                  id: Date.now() + Math.random(),
                  text,
                  rating: 0,
                  createdAt: new Date().toISOString(),
                  aiGenerated: true
                });
                added++;
              }
            });
          }
        });

        this.save();
        this.refresh();
        NexusApp?.showToast?.(`✨ ${added} causas sugeridas pela IA!`, 'success');
      }
    } catch (error) {
      console.warn('[Ishikawa Pro] API Error:', error.message);
      // Fallback to offline suggestions
      if (typeof AIFallback !== 'undefined') {
        const suggestions = AIFallback.ishikawa;
        let added = 0;
        Object.keys(suggestions).forEach(cat => {
          if (Array.isArray(suggestions[cat])) {
            suggestions[cat].forEach(text => {
              const exists = this.data.causes[cat]?.some(c => c.text.toLowerCase() === text.toLowerCase());
              if (!exists) {
                if (!this.data.causes[cat]) this.data.causes[cat] = [];
                this.data.causes[cat].push({ id: Date.now() + Math.random(), text, rating: 0, aiGenerated: true });
                added++;
              }
            });
          }
        });
        this.save();
        this.refresh();
        NexusApp?.showToast?.(`📝 ${added} sugestões offline adicionadas`, 'info');
      } else {
        NexusApp?.showToast?.('IA indisponível', 'warning');
      }
    }
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

window.IshikawaPro = IshikawaPro;
