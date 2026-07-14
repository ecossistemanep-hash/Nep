/**
 * CARTA DE CONTROLE PRO - Controle Estatístico de Processo (CEP)
 * Com cálculo automático de limites, regras Western Electric e Cp/Cpk
 */

const CartaControlePro = {
    data: [],
    chartType: 'individual', // individual, xbar-r, xbar-s
    specs: { lsl: null, usl: null },
    chart: null,

    init() {
        this.load();
    },

    load() {
        try {
            const saved = localStorage.getItem('nexus_cep_pro');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.data = parsed.data || [];
                this.chartType = parsed.chartType || 'individual';
                this.specs = parsed.specs || { lsl: null, usl: null };
            }
        } catch (e) {
            console.warn('[CEP Pro] Erro ao carregar:', e);
        }
    },

    save() {
        localStorage.setItem('nexus_cep_pro', JSON.stringify({
            data: this.data,
            chartType: this.chartType,
            specs: this.specs
        }));
        if (typeof ToolsService !== 'undefined') {
            ToolsService.saveCartaControle({ data: this.data, chartType: this.chartType, specs: this.specs })
                .catch(e => console.warn('[CEP Pro] Erro Supabase:', e));
        }
    },

    // Estatísticas básicas
    getMean() {
        if (this.data.length === 0) return 0;
        return this.data.reduce((a, b) => a + b, 0) / this.data.length;
    },

    getStdDev() {
        if (this.data.length < 2) return 0;
        const mean = this.getMean();
        const squaredDiffs = this.data.map(x => Math.pow(x - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (this.data.length - 1));
    },

    getRange() {
        if (this.data.length === 0) return { min: 0, max: 0, range: 0 };
        const min = Math.min(...this.data);
        const max = Math.max(...this.data);
        return { min, max, range: max - min };
    },

    // Limites de controle (3 sigma)
    getControlLimits() {
        const mean = this.getMean();
        const std = this.getStdDev();
        return {
            ucl: mean + 3 * std,  // Upper Control Limit
            cl: mean,              // Center Line
            lcl: mean - 3 * std,   // Lower Control Limit
            uwl: mean + 2 * std,   // Upper Warning Limit
            lwl: mean - 2 * std    // Lower Warning Limit
        };
    },

    // Índices de capacidade
    getCpk() {
        if (!this.specs.lsl || !this.specs.usl) return null;
        const mean = this.getMean();
        const std = this.getStdDev();
        if (std === 0) return null;

        const cpu = (this.specs.usl - mean) / (3 * std);
        const cpl = (mean - this.specs.lsl) / (3 * std);
        const cpk = Math.min(cpu, cpl);
        const cp = (this.specs.usl - this.specs.lsl) / (6 * std);

        return { cp, cpk, cpu, cpl };
    },

    // Detecção de pontos fora de controle
    getOutOfControlPoints() {
        const limits = this.getControlLimits();
        const ooc = [];

        this.data.forEach((val, idx) => {
            const reasons = [];

            // Regra 1: Ponto fora de 3σ
            if (val > limits.ucl || val < limits.lcl) {
                reasons.push('Fora de 3σ');
            }

            // Regra 2: 2 de 3 pontos consecutivos fora de 2σ
            if (idx >= 2) {
                const last3 = this.data.slice(idx - 2, idx + 1);
                const outsideWarning = last3.filter(v => v > limits.uwl || v < limits.lwl);
                if (outsideWarning.length >= 2) {
                    reasons.push('2 de 3 fora de 2σ');
                }
            }

            // Regra 3: 8 pontos consecutivos do mesmo lado
            if (idx >= 7) {
                const last8 = this.data.slice(idx - 7, idx + 1);
                if (last8.every(v => v > limits.cl) || last8.every(v => v < limits.cl)) {
                    reasons.push('8 pontos do mesmo lado');
                }
            }

            // Regra 4: 6 pontos com tendência crescente ou decrescente
            if (idx >= 5) {
                const last6 = this.data.slice(idx - 5, idx + 1);
                let increasing = true, decreasing = true;
                for (let i = 1; i < last6.length; i++) {
                    if (last6[i] <= last6[i - 1]) increasing = false;
                    if (last6[i] >= last6[i - 1]) decreasing = false;
                }
                if (increasing) reasons.push('Tendência crescente');
                if (decreasing) reasons.push('Tendência decrescente');
            }

            if (reasons.length > 0) {
                ooc.push({ index: idx, value: val, reasons });
            }
        });

        return ooc;
    },

    render() {
        this.load();
        const mean = this.getMean();
        const std = this.getStdDev();
        const limits = this.getControlLimits();
        const cpkData = this.getCpk();
        const oocPoints = this.getOutOfControlPoints();
        const range = this.getRange();

        return `
      <div class="tool-pro-container">
        <!-- Header -->
        <div class="tool-pro-header">
          <div class="tool-pro-header-left">
            <div class="tool-pro-icon" style="background: linear-gradient(135deg, #ec4899, #db2777);">
              <i class="fa-solid fa-chart-line"></i>
            </div>
            <div class="tool-pro-title">
              <h2>Carta de Controle</h2>
              <p>Controle Estatístico de Processo (CEP) | Western Electric Rules</p>
            </div>
          </div>
          <div class="tool-pro-actions">
            <button class="quality-btn quality-btn-secondary" id="cep-import">
              <i class="fa-solid fa-file-import"></i> Importar
            </button>
            <button class="quality-btn quality-btn-secondary" id="cep-export">
              <i class="fa-solid fa-download"></i> Exportar
            </button>
          </div>
        </div>

        <!-- Input Section -->
        <div class="cep-pro-input">
          <div class="cep-pro-input-header">
            <h4 style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-plus-circle"></i> Adicionar Dados
            </h4>
            <div class="cep-pro-chart-type">
              <button class="${this.chartType === 'individual' ? 'active' : ''}" data-type="individual">Individual</button>
              <button class="${this.chartType === 'xbar-r' ? 'active' : ''}" data-type="xbar-r">X̄-R</button>
            </div>
          </div>
          
          <div class="cep-pro-data-input">
            <div class="pdca-pro-meta-field" style="flex: 1;">
              <label>Valor (separar múltiplos por vírgula)</label>
              <input type="text" id="cep-value-input" placeholder="Ex: 10.5 ou 10.2, 10.5, 10.3" />
            </div>
            <button class="quality-btn quality-btn-primary" id="cep-add" style="align-self: end;">
              <i class="fa-solid fa-plus"></i> Adicionar
            </button>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
            <div class="pdca-pro-meta-field">
              <label>LSL (Limite Inferior de Especificação)</label>
              <input type="number" id="cep-lsl" step="0.01" placeholder="Opcional" 
                     value="${this.specs.lsl || ''}" />
            </div>
            <div class="pdca-pro-meta-field">
              <label>USL (Limite Superior de Especificação)</label>
              <input type="number" id="cep-usl" step="0.01" placeholder="Opcional"
                     value="${this.specs.usl || ''}" />
            </div>
          </div>

          <div class="cep-pro-data-list">
            ${this.data.length === 0 ? `
              <span style="color: var(--text-tertiary);">Nenhum dado. Adicione valores para gerar a carta.</span>
            ` : this.data.map((val, i) => {
            const isOOC = oocPoints.some(p => p.index === i);
            return `
                <div class="cep-pro-data-point ${isOOC ? 'out-of-control' : ''}" data-idx="${i}">
                  ${i + 1}: ${val.toFixed(2)}
                  ${isOOC ? '<i class="fa-solid fa-exclamation-triangle"></i>' : ''}
                  <button onclick="CartaControlePro.deletePoint(${i})">×</button>
                </div>
              `;
        }).join('')}
          </div>
        </div>

        ${this.data.length >= 3 ? `
          <!-- Chart -->
          <div class="cep-pro-chart-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h4><i class="fa-solid fa-chart-area"></i> Carta de Controle</h4>
              <div style="display: flex; gap: 12px; font-size: 12px;">
                <span style="color: #ef4444;">UCL: ${limits.ucl.toFixed(2)}</span>
                <span style="color: #22c55e;">CL: ${limits.cl.toFixed(2)}</span>
                <span style="color: #ef4444;">LCL: ${limits.lcl.toFixed(2)}</span>
              </div>
            </div>
            <div style="height: 300px;">
              <canvas id="cep-chart"></canvas>
            </div>
          </div>

          <!-- Alerts -->
          ${oocPoints.length > 0 ? `
            <div class="cep-pro-alerts" style="margin-bottom: 24px;">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <div class="cep-pro-alerts-text">
                <strong>${oocPoints.length} ponto(s) fora de controle detectado(s)</strong><br>
                <small>${oocPoints.map(p => `#${p.index + 1}: ${p.reasons.join(', ')}`).join(' | ')}</small>
              </div>
            </div>
          ` : `
            <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); 
                        border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
              <i class="fa-solid fa-check-circle" style="color: #22c55e; font-size: 20px;"></i>
              <span>Processo sob controle estatístico (Western Electric Rules)</span>
            </div>
          `}

          <!-- Statistics -->
          <div class="cep-pro-stats">
            <div class="cep-pro-stat-card">
              <div class="cep-pro-stat-label">Média (X̄)</div>
              <div class="cep-pro-stat-value">${mean.toFixed(3)}</div>
            </div>
            <div class="cep-pro-stat-card">
              <div class="cep-pro-stat-label">Desvio Padrão (σ)</div>
              <div class="cep-pro-stat-value">${std.toFixed(3)}</div>
            </div>
            <div class="cep-pro-stat-card">
              <div class="cep-pro-stat-label">Amplitude</div>
              <div class="cep-pro-stat-value">${range.range.toFixed(3)}</div>
            </div>
            <div class="cep-pro-stat-card">
              <div class="cep-pro-stat-label">N (amostras)</div>
              <div class="cep-pro-stat-value">${this.data.length}</div>
            </div>
          </div>

          ${cpkData ? `
            <div class="cep-pro-stats" style="margin-top: 16px;">
              <div class="cep-pro-stat-card">
                <div class="cep-pro-stat-label">Cp</div>
                <div class="cep-pro-stat-value ${cpkData.cp >= 1.33 ? 'good' : cpkData.cp >= 1 ? 'warning' : 'bad'}">
                  ${cpkData.cp.toFixed(2)}
                </div>
              </div>
              <div class="cep-pro-stat-card">
                <div class="cep-pro-stat-label">Cpk</div>
                <div class="cep-pro-stat-value ${cpkData.cpk >= 1.33 ? 'good' : cpkData.cpk >= 1 ? 'warning' : 'bad'}">
                  ${cpkData.cpk.toFixed(2)}
                </div>
              </div>
              <div class="cep-pro-stat-card">
                <div class="cep-pro-stat-label">Cpu</div>
                <div class="cep-pro-stat-value">${cpkData.cpu.toFixed(2)}</div>
              </div>
              <div class="cep-pro-stat-card">
                <div class="cep-pro-stat-label">Cpl</div>
                <div class="cep-pro-stat-value">${cpkData.cpl.toFixed(2)}</div>
              </div>
            </div>
            
            <div class="gut-pro-input-card" style="margin-top: 16px; background: linear-gradient(135deg, 
                        ${cpkData.cpk >= 1.33 ? 'rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.05)' :
                        cpkData.cpk >= 1 ? 'rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05)' :
                            'rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)'}); 
                        border-color: ${cpkData.cpk >= 1.33 ? 'rgba(34, 197, 94, 0.3)' :
                        cpkData.cpk >= 1 ? 'rgba(245, 158, 11, 0.3)' :
                            'rgba(239, 68, 68, 0.3)'};">
              <h4 style="margin-bottom: 8px; color: ${cpkData.cpk >= 1.33 ? '#22c55e' : cpkData.cpk >= 1 ? '#f59e0b' : '#ef4444'};">
                ${cpkData.cpk >= 1.33 ? '✅ Processo Capaz' : cpkData.cpk >= 1 ? '⚠️ Processo Aceitável' : '❌ Processo Incapaz'}
              </h4>
              <p style="color: var(--text-secondary); line-height: 1.6;">
                ${cpkData.cpk >= 1.33 ?
                        'O processo é capaz de atender às especificações com margem de segurança. Continue monitorando.' :
                        cpkData.cpk >= 1 ?
                            'O processo atende às especificações, mas com pouca margem. Considere melhorias.' :
                            'O processo não é capaz de atender às especificações de forma consistente. Ação corretiva necessária.'}
              </p>
            </div>
          ` : ''}
        ` : `
          <div class="quality-empty-state" style="padding: 60px;">
            <i class="fa-solid fa-chart-line"></i>
            <h3 style="margin-top: 16px;">Aguardando Dados</h3>
            <p>Adicione pelo menos 3 valores para gerar a carta de controle</p>
          </div>
        `}

        <!-- Actions -->
        <div style="display: flex; gap: 12px; justify-content: center; margin-top: 24px;">
          <button class="quality-btn quality-btn-danger" id="cep-clear">
            <i class="fa-solid fa-trash"></i> Limpar Dados
          </button>
        </div>
        
        <input type="file" id="cep-file-input" accept=".csv,.txt" style="display: none;" />
      </div>
    `;
    },

    bindEvents() {
        // Chart type buttons
        document.querySelectorAll('.cep-pro-chart-type button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.chartType = btn.dataset.type;
                this.save();
                this.refresh();
            });
        });

        // Add data
        document.getElementById('cep-add')?.addEventListener('click', () => this.addData());
        document.getElementById('cep-value-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addData();
        });

        // Specs
        document.getElementById('cep-lsl')?.addEventListener('blur', (e) => {
            this.specs.lsl = e.target.value ? parseFloat(e.target.value) : null;
            this.save();
            this.refresh();
        });
        document.getElementById('cep-usl')?.addEventListener('blur', (e) => {
            this.specs.usl = e.target.value ? parseFloat(e.target.value) : null;
            this.save();
            this.refresh();
        });

        // Import / Export
        const fileInput = document.getElementById('cep-file-input');
        document.getElementById('cep-import')?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', (e) => this.importFile(e.target.files[0]));
        document.getElementById('cep-export')?.addEventListener('click', () => this.export());

        // Clear
        document.getElementById('cep-clear')?.addEventListener('click', () => {
            if (confirm('Limpar todos os dados?')) this.clear();
        });

        // Render chart
        if (this.data.length >= 3) {
            setTimeout(() => this.renderChart(), 100);
        }
    },

    addData() {
        const input = document.getElementById('cep-value-input');
        const rawValue = input?.value?.trim();
        if (!rawValue) return;

        const values = rawValue.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
        if (values.length === 0) {
            NexusApp?.showToast?.('Digite valores numéricos válidos', 'error');
            return;
        }

        this.data.push(...values);
        input.value = '';
        this.save();
        this.refresh();
        NexusApp?.showToast?.(`${values.length} valor(es) adicionado(s)!`, 'success');
    },

    deletePoint(idx) {
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
        if (container && NexusTools.currentTool === 'cartacontrole') {
            NexusTools.render(container);
        }
    },

    renderChart() {
        const ctx = document.getElementById('cep-chart');
        if (!ctx || this.data.length < 3) return;

        if (this.chart) this.chart.destroy();

        const limits = this.getControlLimits();
        const oocPoints = this.getOutOfControlPoints();

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.data.map((_, i) => i + 1),
                datasets: [
                    {
                        label: 'Valor',
                        data: this.data,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        pointRadius: this.data.map((_, i) => oocPoints.some(p => p.index === i) ? 8 : 4),
                        pointBackgroundColor: this.data.map((_, i) =>
                            oocPoints.some(p => p.index === i) ? '#ef4444' : '#8b5cf6'
                        ),
                        pointBorderColor: this.data.map((_, i) =>
                            oocPoints.some(p => p.index === i) ? '#dc2626' : '#7c3aed'
                        ),
                        pointBorderWidth: this.data.map((_, i) => oocPoints.some(p => p.index === i) ? 3 : 1)
                    },
                    {
                        label: 'UCL',
                        data: Array(this.data.length).fill(limits.ucl),
                        borderColor: '#ef4444',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'CL',
                        data: Array(this.data.length).fill(limits.cl),
                        borderColor: '#22c55e',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'LCL',
                        data: Array(this.data.length).fill(limits.lcl),
                        borderColor: '#ef4444',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
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
                                const ooc = oocPoints.find(p => p.index === idx);
                                if (ooc) return `⚠️ ${ooc.reasons.join(', ')}`;
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Amostra', color: 'rgba(255,255,255,0.6)' },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: 'rgba(255,255,255,0.5)' }
                    },
                    y: {
                        title: { display: true, text: 'Valor', color: 'rgba(255,255,255,0.6)' },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: 'rgba(255,255,255,0.5)' }
                    }
                }
            }
        });
    },

    importFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const lines = e.target.result.split('\n');
            const values = [];

            lines.forEach(line => {
                const nums = line.split(/[,;\t\s]+/).map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
                values.push(...nums);
            });

            if (values.length > 0) {
                this.data.push(...values);
                this.save();
                this.refresh();
                NexusApp?.showToast?.(`${values.length} valores importados!`, 'success');
            }
        };
        reader.readAsText(file);
    },

    export() {
        const limits = this.getControlLimits();
        const cpkData = this.getCpk();
        const oocPoints = this.getOutOfControlPoints();

        let content = '═══════════════════════════════════════════════════════════\n';
        content += '                  CARTA DE CONTROLE (CEP)\n';
        content += '              Controle Estatístico de Processo\n';
        content += '═══════════════════════════════════════════════════════════\n\n';

        content += `📊 ESTATÍSTICAS BÁSICAS\n`;
        content += `─────────────────────────────────────────────────────────────\n`;
        content += `  Número de amostras: ${this.data.length}\n`;
        content += `  Média (X̄): ${this.getMean().toFixed(4)}\n`;
        content += `  Desvio Padrão (σ): ${this.getStdDev().toFixed(4)}\n`;
        content += `  Amplitude: ${this.getRange().range.toFixed(4)}\n\n`;

        content += `📏 LIMITES DE CONTROLE (3σ)\n`;
        content += `─────────────────────────────────────────────────────────────\n`;
        content += `  UCL (Limite Superior): ${limits.ucl.toFixed(4)}\n`;
        content += `  CL (Linha Central): ${limits.cl.toFixed(4)}\n`;
        content += `  LCL (Limite Inferior): ${limits.lcl.toFixed(4)}\n\n`;

        if (cpkData) {
            content += `📐 ÍNDICES DE CAPACIDADE\n`;
            content += `─────────────────────────────────────────────────────────────\n`;
            content += `  Cp: ${cpkData.cp.toFixed(3)} ${cpkData.cp >= 1.33 ? '✅' : cpkData.cp >= 1 ? '⚠️' : '❌'}\n`;
            content += `  Cpk: ${cpkData.cpk.toFixed(3)} ${cpkData.cpk >= 1.33 ? '✅' : cpkData.cpk >= 1 ? '⚠️' : '❌'}\n`;
            content += `  Cpu: ${cpkData.cpu.toFixed(3)}\n`;
            content += `  Cpl: ${cpkData.cpl.toFixed(3)}\n\n`;
        }

        if (oocPoints.length > 0) {
            content += `⚠️ PONTOS FORA DE CONTROLE\n`;
            content += `─────────────────────────────────────────────────────────────\n`;
            oocPoints.forEach(p => {
                content += `  #${p.index + 1}: ${p.value.toFixed(3)} - ${p.reasons.join(', ')}\n`;
            });
            content += '\n';
        }

        content += `📋 DADOS\n`;
        content += `─────────────────────────────────────────────────────────────\n`;
        this.data.forEach((val, i) => {
            const isOOC = oocPoints.some(p => p.index === i);
            content += `  ${(i + 1).toString().padStart(3)}: ${val.toFixed(4)} ${isOOC ? '⚠️' : ''}\n`;
        });

        content += `\n\nExportado pelo NEP Delivery Control em ${new Date().toLocaleString('pt-BR')}\n`;

        this.downloadText(content, `carta_controle_${Date.now()}.txt`);
        NexusApp?.showToast?.('Carta de Controle exportada!', 'success');
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

window.CartaControlePro = CartaControlePro;
