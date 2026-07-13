/**
 * PARETO PRO - Diagrama de Pareto Profissional
 * Com classificação ABC, insights avançados e gráfico interativo
 */

const ParetoPro = {
    data: [],
    chart: null,

    init() {
        this.load();
    },

    load() {
        try {
            const saved = localStorage.getItem('nexus_pareto_pro');
            if (saved) {
                this.data = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('[Pareto Pro] Erro ao carregar:', e);
        }
    },

    save() {
        localStorage.setItem('nexus_pareto_pro', JSON.stringify(this.data));
        if (typeof ToolsService !== 'undefined') {
            ToolsService.savePareto(this.data).catch(e => console.warn('[Pareto Pro] Erro Supabase:', e));
        }
    },

    getTotal() {
        return this.data.reduce((sum, item) => sum + item.value, 0);
    },

    getABCClassification() {
        if (this.data.length === 0) return { A: [], B: [], C: [] };

        const sorted = [...this.data].sort((a, b) => b.value - a.value);
        const total = this.getTotal();
        let cumulative = 0;

        const result = { A: [], B: [], C: [] };

        sorted.forEach(item => {
            cumulative += item.value;
            const percent = (cumulative / total) * 100;

            if (percent <= 80) {
                result.A.push({ ...item, cumPercent: percent });
            } else if (percent <= 95) {
                result.B.push({ ...item, cumPercent: percent });
            } else {
                result.C.push({ ...item, cumPercent: percent });
            }
        });

        return result;
    },

    render() {
        this.load();
        const abc = this.getABCClassification();
        const total = this.getTotal();

        return `
      <div class="tool-pro-container">
        <!-- Header -->
        <div class="tool-pro-header">
          <div class="tool-pro-header-left">
            <div class="tool-pro-icon" style="background: linear-gradient(135deg, #14b8a6, #0d9488);">
              <i class="fa-solid fa-chart-bar"></i>
            </div>
            <div class="tool-pro-title">
              <h2>Diagrama de Pareto</h2>
              <p>Análise 80/20 | Classificação ABC</p>
            </div>
          </div>
          <div class="tool-pro-actions">
            <button class="quality-btn quality-btn-secondary" id="pareto-pro-import">
              <i class="fa-solid fa-file-import"></i> Importar Excel
            </button>
            <button class="quality-btn quality-btn-secondary" id="pareto-pro-export">
              <i class="fa-solid fa-download"></i> Exportar
            </button>
          </div>
        </div>

        <!-- Input -->
        <div class="pareto-pro-input-card">
          <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 16px; align-items: end;">
            <div class="pdca-pro-meta-field">
              <label>Categoria / Defeito / Causa</label>
              <input type="text" id="pareto-pro-cat" placeholder="Ex: Defeito de solda, Atraso de entrega..." />
            </div>
            <div class="pdca-pro-meta-field">
              <label>Quantidade / Frequência</label>
              <input type="number" id="pareto-pro-val" placeholder="0" min="1" />
            </div>
            <button class="quality-btn quality-btn-primary" id="pareto-pro-add">
              <i class="fa-solid fa-plus"></i> Adicionar
            </button>
          </div>
          
          <div class="pareto-pro-data-list" id="pareto-data-list">
            ${this.data.length === 0 ? `
              <span style="color: var(--text-tertiary); font-size: 13px;">
                Nenhum dado adicionado. Adicione pelo menos 2 categorias para gerar o gráfico.
              </span>
            ` : this.data.map((item, i) => `
              <div class="pareto-pro-data-tag">
                ${item.category}: <span>${item.value}</span>
                <button data-idx="${i}"><i class="fa-solid fa-times"></i></button>
              </div>
            `).join('')}
          </div>
        </div>

        ${this.data.length >= 2 ? `
          <!-- Chart -->
          <div class="pareto-pro-chart-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h4 style="display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-chart-column"></i> Diagrama de Pareto
              </h4>
              <button class="quality-btn quality-btn-sm quality-btn-secondary" id="pareto-regenerate">
                <i class="fa-solid fa-refresh"></i> Atualizar
              </button>
            </div>
            <div style="height: 350px;">
              <canvas id="pareto-chart"></canvas>
            </div>
          </div>

          <!-- ABC Classification -->
          <div style="margin-bottom: 24px;">
            <h4 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-layer-group"></i> Classificação ABC
            </h4>
            <div class="pareto-pro-insights">
              <div class="pareto-pro-insight-card highlight">
                <div class="pareto-pro-insight-icon" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white;">
                  A
                </div>
                <div class="pareto-pro-insight-value">${abc.A.length}</div>
                <div class="pareto-pro-insight-label">
                  Classe A (≤80%)<br>
                  <small style="color: var(--text-tertiary);">${abc.A.map(i => i.category).join(', ') || '-'}</small>
                </div>
              </div>
              <div class="pareto-pro-insight-card">
                <div class="pareto-pro-insight-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white;">
                  B
                </div>
                <div class="pareto-pro-insight-value">${abc.B.length}</div>
                <div class="pareto-pro-insight-label">
                  Classe B (80-95%)<br>
                  <small style="color: var(--text-tertiary);">${abc.B.map(i => i.category).join(', ') || '-'}</small>
                </div>
              </div>
              <div class="pareto-pro-insight-card">
                <div class="pareto-pro-insight-icon" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white;">
                  C
                </div>
                <div class="pareto-pro-insight-value">${abc.C.length}</div>
                <div class="pareto-pro-insight-label">
                  Classe C (>95%)<br>
                  <small style="color: var(--text-tertiary);">${abc.C.map(i => i.category).join(', ') || '-'}</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Insights -->
          <div class="gut-pro-input-card" style="background: linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(13, 148, 136, 0.05)); border-color: rgba(20, 184, 166, 0.3);">
            <h4 style="margin-bottom: 12px; color: #14b8a6;">
              <i class="fa-solid fa-lightbulb"></i> Insights da Análise 80/20
            </h4>
            <p style="color: var(--text-secondary); line-height: 1.8;">
              ${abc.A.length > 0 ? `
                <strong>${abc.A.length} categorias</strong> (${Math.round(abc.A.length / this.data.length * 100)}% do total) 
                representam aproximadamente <strong>80% dos problemas</strong>.<br><br>
                <strong>👉 Recomendação:</strong> Concentre seus esforços nas categorias: 
                <strong style="color: var(--text-primary);">${abc.A.map(i => i.category).join(', ')}</strong>
              ` : 'Adicione mais dados para gerar insights.'}
            </p>
          </div>
        ` : `
          <div class="quality-empty-state" style="padding: 80px;">
            <i class="fa-solid fa-chart-bar"></i>
            <h3 style="margin-top: 16px; color: var(--text-primary);">Aguardando dados</h3>
            <p>Adicione pelo menos 2 categorias para gerar o diagrama de Pareto</p>
          </div>
        `}

        <!-- Actions -->
        <div style="display: flex; gap: 12px; justify-content: center; margin-top: 24px;">
          <button class="quality-btn quality-btn-danger" id="pareto-pro-clear">
            <i class="fa-solid fa-trash"></i> Limpar Dados
          </button>
        </div>
        
        <!-- Hidden file input -->
        <input type="file" id="pareto-file-input" accept=".xlsx,.xls,.csv" style="display: none;" />
      </div>
    `;
    },

    bindEvents() {
        // Add item
        document.getElementById('pareto-pro-add')?.addEventListener('click', () => this.addItem());
        document.getElementById('pareto-pro-cat')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addItem();
        });
        document.getElementById('pareto-pro-val')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addItem();
        });

        // Delete items
        document.querySelectorAll('.pareto-pro-data-tag button').forEach(btn => {
            btn.addEventListener('click', () => this.deleteItem(parseInt(btn.dataset.idx)));
        });

        // Import
        const fileInput = document.getElementById('pareto-file-input');
        document.getElementById('pareto-pro-import')?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', (e) => this.importFile(e.target.files[0]));

        // Export & Clear
        document.getElementById('pareto-pro-export')?.addEventListener('click', () => this.export());
        document.getElementById('pareto-pro-clear')?.addEventListener('click', () => {
            if (confirm('Limpar todos os dados?')) this.clear();
        });

        // Regenerate
        document.getElementById('pareto-regenerate')?.addEventListener('click', () => this.renderChart());

        // Render chart
        if (this.data.length >= 2) {
            setTimeout(() => this.renderChart(), 100);
        }
    },

    addItem() {
        const catInput = document.getElementById('pareto-pro-cat');
        const valInput = document.getElementById('pareto-pro-val');

        const category = catInput?.value?.trim();
        const value = parseInt(valInput?.value);

        if (!category || isNaN(value) || value <= 0) {
            NexusApp?.showToast?.('Preencha categoria e quantidade válida', 'error');
            return;
        }

        // Check duplicate
        const existing = this.data.find(i => i.category.toLowerCase() === category.toLowerCase());
        if (existing) {
            existing.value += value;
        } else {
            this.data.push({ id: Date.now(), category, value });
        }

        catInput.value = '';
        valInput.value = '';
        this.save();
        this.refresh();
        NexusApp?.showToast?.('Item adicionado!', 'success');
    },

    deleteItem(idx) {
        this.data.splice(idx, 1);
        this.save();
        this.refresh();
    },

    clear() {
        this.data = [];
        this.save();
        this.refresh();
    },

    refresh() {
        const container = document.getElementById('page-content');
        if (container && NexusTools.currentTool === 'pareto') {
            NexusTools.render(container);
        }
    },

    renderChart() {
        const ctx = document.getElementById('pareto-chart');
        if (!ctx || this.data.length < 2) return;

        if (this.chart) this.chart.destroy();

        const sorted = [...this.data].sort((a, b) => b.value - a.value);
        const total = this.getTotal();

        let cumulative = 0;
        const cumulativeData = sorted.map(item => {
            cumulative += item.value;
            return (cumulative / total) * 100;
        });

        const abc = this.getABCClassification();
        const colors = sorted.map(item => {
            if (abc.A.find(i => i.category === item.category)) return 'rgba(239, 68, 68, 0.7)';
            if (abc.B.find(i => i.category === item.category)) return 'rgba(245, 158, 11, 0.7)';
            return 'rgba(34, 197, 94, 0.7)';
        });

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(item => item.category),
                datasets: [
                    {
                        type: 'bar',
                        label: 'Quantidade',
                        data: sorted.map(item => item.value),
                        backgroundColor: colors,
                        borderColor: colors.map(c => c.replace('0.7', '1')),
                        borderWidth: 2,
                        borderRadius: 6
                    },
                    {
                        type: 'line',
                        label: '% Acumulado',
                        data: cumulativeData,
                        borderColor: '#7555e8',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.2,
                        yAxisID: 'y1',
                        pointRadius: 4,
                        pointBackgroundColor: '#7555e8'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { color: 'rgba(255,255,255,0.7)' }
                    },
                    tooltip: {
                        callbacks: {
                            afterBody: (ctx) => {
                                const idx = ctx[0].dataIndex;
                                const item = sorted[idx];
                                const percent = ((item.value / total) * 100).toFixed(1);
                                return `Representa ${percent}% do total`;
                            }
                        }
                    },
                    annotation: {
                        annotations: {
                            line80: {
                                type: 'line',
                                yMin: 80,
                                yMax: 80,
                                yScaleID: 'y1',
                                borderColor: 'rgba(239, 68, 68, 0.5)',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                label: {
                                    display: true,
                                    content: '80%',
                                    position: 'end'
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: 'rgba(255,255,255,0.6)', maxRotation: 45, minRotation: 45 }
                    },
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: { display: true, text: 'Quantidade', color: 'rgba(255,255,255,0.6)' },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: 'rgba(255,255,255,0.6)' }
                    },
                    y1: {
                        beginAtZero: true,
                        max: 100,
                        position: 'right',
                        title: { display: true, text: '% Acumulado', color: 'rgba(255,255,255,0.6)' },
                        grid: { drawOnChartArea: false },
                        ticks: {
                            color: 'rgba(255,255,255,0.6)',
                            callback: (val) => val + '%'
                        }
                    }
                }
            }
        });
    },

    async importFile(file) {
        if (!file) return;

        NexusApp?.showToast?.('Importando arquivo...', 'info');

        try {
            // Carregar SheetJS se não estiver disponível
            if (typeof XLSX === 'undefined') {
                await this.loadScript('https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js');
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                // Espera formato: Categoria, Valor
                let imported = 0;
                data.slice(1).forEach(row => {
                    if (row[0] && !isNaN(parseInt(row[1]))) {
                        const existing = this.data.find(i => i.category.toLowerCase() === row[0].toString().toLowerCase());
                        if (existing) {
                            existing.value += parseInt(row[1]);
                        } else {
                            this.data.push({
                                id: Date.now() + Math.random(),
                                category: row[0].toString(),
                                value: parseInt(row[1])
                            });
                        }
                        imported++;
                    }
                });

                this.save();
                this.refresh();
                NexusApp?.showToast?.(`${imported} itens importados!`, 'success');
            };
            reader.readAsBinaryString(file);
        } catch (error) {
            console.error('[Pareto Pro] Import error:', error);
            NexusApp?.showToast?.('Erro ao importar arquivo', 'error');
        }
    },

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    export() {
        const sorted = [...this.data].sort((a, b) => b.value - a.value);
        const total = this.getTotal();
        const abc = this.getABCClassification();

        let content = '═══════════════════════════════════════════════════════════\n';
        content += '                    DIAGRAMA DE PARETO\n';
        content += '                   Análise 80/20 (ABC)\n';
        content += '═══════════════════════════════════════════════════════════\n\n';
        content += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
        content += `📊 Total de categorias: ${this.data.length}\n`;
        content += `📈 Soma total: ${total}\n\n`;

        let cumulative = 0;
        content += '─────────────────────────────────────────────────────────────\n';
        content += ' #  │ CATEGORIA                    │ VALOR │   %   │  CUM  │ CL\n';
        content += '─────────────────────────────────────────────────────────────\n';

        sorted.forEach((item, i) => {
            cumulative += item.value;
            const percent = ((item.value / total) * 100).toFixed(1);
            const cumPercent = ((cumulative / total) * 100).toFixed(1);
            const cls = abc.A.find(x => x.category === item.category) ? 'A' :
                abc.B.find(x => x.category === item.category) ? 'B' : 'C';

            const cat = item.category.substring(0, 25).padEnd(25);
            content += ` ${(i + 1).toString().padStart(2)} │ ${cat} │ ${item.value.toString().padStart(5)} │ ${percent.padStart(5)}% │ ${cumPercent.padStart(5)}% │ ${cls}\n`;
        });

        content += '─────────────────────────────────────────────────────────────\n\n';

        content += '📊 CLASSIFICAÇÃO ABC:\n';
        content += `  Classe A (≤80%): ${abc.A.length} categorias (${abc.A.map(i => i.category).join(', ')})\n`;
        content += `  Classe B (80-95%): ${abc.B.length} categorias (${abc.B.map(i => i.category).join(', ')})\n`;
        content += `  Classe C (>95%): ${abc.C.length} categorias (${abc.C.map(i => i.category).join(', ')})\n\n`;

        content += `\nExportado pelo NEP Delivery Control em ${new Date().toLocaleString('pt-BR')}\n`;

        this.downloadText(content, `pareto_${Date.now()}.txt`);
        NexusApp?.showToast?.('Pareto exportado!', 'success');
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

window.ParetoPro = ParetoPro;
