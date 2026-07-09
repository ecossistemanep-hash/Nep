/**
 * NEXUS ADVANCED CHART ENGINE
 * Módulo de geração de gráficos de alta performance para o Ecossistema NEP.
 * 
 * Dependências:
 * - Plotly.js (Renderização)
 * - SheetJS/XLSX (Parsing de Excel)
 * - html2canvas (Exportação)
 */

class NexusChartEngine {
    constructor(containerId) {
        this.containerId = containerId;
        this.data = [];
        this.headers = [];
        this.chartInstance = null;

        // Configurações padrão
        this.config = {
            type: 'bar',
            theme: 'dark', // 'dark', 'light', 'corporate'
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'],
            font: 'Inter, sans-serif',
            showGrid: true,
            showLegend: true,
            title: 'Análise de Dados',
            subtitle: '',
            xAxis: '',
            yAxis: '',
            orientation: 'v', // 'v' or 'h'
            isStacked: false,
            showTrendline: false,
            showAverage: false
        };

        this.themes = {
            dark: {
                bg: '#1e293b',
                paper: '#1e293b',
                text: '#e2e8f0',
                grid: '#334155'
            },
            light: {
                bg: '#ffffff',
                paper: '#ffffff',
                text: '#1e293b',
                grid: '#e2e8f0'
            },
            corporate: {
                bg: '#f8fafc',
                paper: '#ffffff',
                text: '#0f172a',
                grid: '#cbd5e1'
            }
        };

        this.init();
    }

    init() {
        console.log('[NexusChartEngine] Initialized');
        // Lazy load de dependências se necessário
        this.loadDependencies();
    }

    async loadDependencies() {
        if (typeof Plotly === 'undefined') {
            await this.loadScript('https://cdn.plot.ly/plotly-2.27.0.min.js');
        }
        if (typeof XLSX === 'undefined') {
            await this.loadScript('https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js');
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // ==========================================
    // DATA PARSING
    // ==========================================

    processInput(rawData, type = 'manual') {
        try {
            if (type === 'manual') {
                this.parseManualData(rawData);
            } else if (type === 'csv') {
                this.parseCSV(rawData);
            } else if (type === 'json') {
                this.data = JSON.parse(rawData);
                this.headers = Object.keys(this.data[0]);
            }

            // Auto-detect columns
            this.detectColumns();
            return { success: true, headers: this.headers, count: this.data.length };
        } catch (error) {
            console.error('Data processing error:', error);
            return { success: false, error: error.message };
        }
    }

    parseManualData(text) {
        // Tenta detectar separador (tab ou vírgula)
        const lines = text.trim().split('\n');
        if (lines.length < 2) throw new Error('Dados insuficientes (mínimo 2 linhas)');

        const firstLine = lines[0];
        const separator = firstLine.includes('\t') ? '\t' : (firstLine.includes(',') ? ',' : ';');

        this.headers = lines[0].split(separator).map(h => h.trim());
        this.data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(separator);
            const row = {};
            this.headers.forEach((header, index) => {
                let val = values[index]?.trim();
                // Tentar converter número
                if (val && !isNaN(val.replace(',', '.'))) {
                    val = parseFloat(val.replace(',', '.'));
                }
                row[header] = val;
            });
            this.data.push(row);
        }
    }

    async processFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

                    if (jsonData.length === 0) throw new Error('Arquivo vazio');

                    this.data = jsonData;
                    this.headers = Object.keys(jsonData[0]);
                    this.detectColumns();
                    resolve({ success: true, headers: this.headers, count: this.data.length });
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    detectColumns() {
        // Classificar colunas em Numéricas e Categóricas
        this.columnTypes = {};
        this.headers.forEach(header => {
            const sample = this.data.slice(0, 10).map(row => row[header]);
            const numCount = sample.filter(v => typeof v === 'number').length;
            this.columnTypes[header] = numCount > sample.length * 0.5 ? 'numeric' : 'categorical';
        });

        // Tentar adivinhar X e Y padrão
        if (!this.config.xAxis) {
            this.config.xAxis = this.headers.find(h => this.columnTypes[h] === 'categorical') || this.headers[0];
        }
        if (!this.config.yAxis) {
            this.config.yAxis = this.headers.find(h => this.columnTypes[h] === 'numeric') || this.headers[1];
        }
    }

    // ==========================================
    // CHART RENDERING (PLOTLY)
    // ==========================================

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const { xData, yData, seriesData } = this.prepareData();
        const traces = this.buildTraces(xData, yData, seriesData);
        const layout = this.buildLayout();
        const config = { responsive: true, displayModeBar: false };

        Plotly.newPlot(this.containerId, traces, layout, config);

        this.currentTraces = traces; // Guardar para análise
    }

    prepareData() {
        // Simples por enquanto: X e Y diretos
        // Futuro: Suporte a agregação (sum, avg) se X tiver duplicatas
        const xCol = this.config.xAxis;
        const yCol = this.config.yAxis; // Pode ser array para múltiplas séries

        const xData = this.data.map(row => row[xCol]);

        let yData = [];
        let seriesData = []; // Para agrupamento por cor

        // Se yAxis for um array (Multiplas Séries selecionadas)
        if (Array.isArray(yCol)) {
            // TODO: Multi-series implementation
            // Por enquanto assume string única
        } else {
            yData = this.data.map(row => row[yCol]);
        }

        return { xData, yData };
    }

    buildTraces(xData, yData) {
        const type = this.config.type;
        const traces = [];
        const color = this.config.colors[0];

        // Format values for text labels
        const textValues = yData.map(v => {
            if (typeof v === 'number') {
                return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
            }
            return v;
        });

        // Base Trace
        let trace = {
            x: xData,
            y: yData,
            name: this.config.yAxis,
            marker: { color: color },
            text: textValues,
            textposition: 'auto'
        };

        switch (type) {
            case 'bar':
                trace.type = 'bar';
                trace.textposition = 'auto'; // Inside or outside
                trace.textfont = { color: 'white' }; // Better contrast
                if (this.config.orientation === 'h') {
                    trace.x = yData;
                    trace.y = xData;
                    trace.text = textValues;
                    trace.orientation = 'h';
                }
                break;
            case 'line':
                trace.type = 'scatter';
                trace.mode = 'lines+markers+text';
                trace.textposition = 'top center';
                trace.line = { shape: 'spline', width: 3 };
                break;
            case 'area':
                trace.type = 'scatter';
                trace.mode = 'lines+text';
                trace.fill = 'tozeroy';
                trace.textposition = 'top center';
                break;
            case 'pie':
                trace = {
                    labels: xData,
                    values: yData,
                    type: 'pie',
                    marker: { colors: this.config.colors },
                    textinfo: 'label+percent+value',
                    hole: 0
                };
                break;
            case 'donut':
                trace = {
                    labels: xData,
                    values: yData,
                    type: 'pie',
                    marker: { colors: this.config.colors },
                    textinfo: 'percent+value',
                    hole: 0.6
                };
                break;
            case 'scatter':
                trace.type = 'scatter';
                trace.mode = 'markers+text';
                trace.textposition = 'top center';
                trace.marker = { size: 10, opacity: 0.7 };
                break;
            case 'heatmap':
                // Requer matriz Z
                trace.type = 'heatmap';
                trace.z = [yData]; // Simplificação
                break;
            case 'radar':
                trace = {
                    type: 'scatterpolar',
                    r: yData,
                    theta: xData,
                    fill: 'toself'
                };
                break;
            case 'pareto':
                // Pareto simplificado
                trace.type = 'bar';
                break;
        }

        traces.push(trace);

        // ANALYTICS LAYER
        if (this.config.showAverage && ['bar', 'line', 'scatter'].includes(type) && this.config.orientation === 'v') {
            const sum = yData.reduce((a, b) => a + (parseFloat(b) || 0), 0);
            const avg = sum / yData.length;

            traces.push({
                x: [xData[0], xData[xData.length - 1]],
                y: [avg, avg],
                mode: 'lines',
                name: 'Média',
                line: { color: '#ef4444', dash: 'dash', width: 2 },
                hoverinfo: 'y'
            });
        }

        if (this.config.showTrendline && ['scatter', 'line'].includes(type) && this.config.orientation === 'v') {
            // Linear Regression calc simplificado
            // Necessário mapear X para numérico se for data/cat
            // (Pendente implementação robusta)
        }

        return traces;
    }

    buildLayout() {
        const theme = this.themes[this.config.theme];

        return {
            title: this.config.title ? {
                text: this.config.title + (this.config.subtitle ? `<br><span style="font-size:12px">${this.config.subtitle}</span>` : ''),
                font: { family: this.config.font, size: 20, color: theme.text }
            } : undefined,
            paper_bgcolor: 'rgba(0,0,0,0)', // Transparent
            plot_bgcolor: theme.paper === '#ffffff' ? '#f8fafc' : 'rgba(255,255,255,0.02)',
            font: { family: this.config.font, color: theme.text },
            showlegend: this.config.showLegend,
            margin: { t: 50, l: 50, r: 30, b: 50 },
            xaxis: {
                title: { text: this.config.xAxis },
                showgrid: this.config.showGrid,
                gridcolor: theme.grid,
                color: theme.text,
                automargin: true // Fix cut-off labels
            },
            yaxis: {
                title: { text: this.config.yAxis },
                showgrid: this.config.showGrid,
                gridcolor: theme.grid,
                color: theme.text,
                automargin: true // Fix cut-off labels
            },
            autosize: true
        };
    }

    // ==========================================
    // EXPORT
    // ==========================================

    async exportImage(format = 'png', scale = 2) {
        return Plotly.downloadImage(this.containerId, {
            format: format,
            width: 1920,
            height: 1080,
            filename: 'nep_data_export',
            scale: scale // High Res (300 DPI equiv in scale)
        });
    }

    generateInsight() {
        // Análise básica
        if (!this.currentTraces || !this.currentTraces[0].y) return '';

        const values = this.currentTraces[0].y.map(v => parseFloat(v)).filter(v => !isNaN(v));
        const max = Math.max(...values);
        const min = Math.min(...values);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;

        // Tentar achar labels
        const labels = this.currentTraces[0].x || [];
        const maxLabel = labels[values.indexOf(max)];

        return `
            <div class="insight-card">
                <h4><i class="fa-solid fa-lightbulb"></i> Insights Automáticos</h4>
                <ul>
                    <li><strong>Valor Máximo:</strong> ${max.toLocaleString()} (${maxLabel})</li>
                    <li><strong>Média Geral:</strong> ${avg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</li>
                    <li><strong>Total Acumulado:</strong> ${sum.toLocaleString()}</li>
                </ul>
                <p>O ponto de maior destaque ocorreu em <strong>${maxLabel}</strong>, representando ${(max / sum * 100).toFixed(1)}% do total.</p>
            </div>
        `;
    }
}

// Expor globalmente
window.NexusChartEngine = NexusChartEngine;
