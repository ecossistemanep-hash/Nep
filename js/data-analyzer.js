/**
 * NEXUS DATA ANALYZER
 * Módulo para análise de dados (CSV, JSON) e geração de insights
 * Processa arquivos enviados pelo usuário e prepara dados para PPT
 */

const NexusDataAnalyzer = {
    // Dados carregados atualmente
    currentData: null,
    currentFileName: null,

    /**
     * Parseia um arquivo CSV
     * @param {string} csvText - Conteúdo do CSV
     * @returns {Object} - { headers: [], rows: [[]], raw: [] }
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length === 0) return { headers: [], rows: [], raw: [] };

        // Detectar separador (vírgula ou ponto-e-vírgula)
        const firstLine = lines[0];
        const separator = firstLine.includes(';') ? ';' : ',';

        const headers = this.parseCSVLine(lines[0], separator);
        const rows = [];
        const raw = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = this.parseCSVLine(lines[i], separator);
                rows.push(values);

                // Criar objeto com headers como chaves
                const obj = {};
                headers.forEach((h, idx) => {
                    obj[h] = values[idx] || '';
                });
                raw.push(obj);
            }
        }

        return { headers, rows, raw, separator };
    },

    /**
     * Parseia uma linha CSV respeitando aspas
     */
    parseCSVLine(line, separator = ',') {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === separator && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());

        return result;
    },

    /**
     * Carrega um arquivo do input file
     * @param {File} file - Objeto File do input
     * @returns {Promise<Object>} - Dados parseados
     */
    async loadFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const content = e.target.result;
                const extension = file.name.split('.').pop().toLowerCase();

                let data;
                try {
                    if (extension === 'csv') {
                        data = this.parseCSV(content);
                    } else if (extension === 'json') {
                        const jsonData = JSON.parse(content);
                        data = this.normalizeJSON(jsonData);
                    } else {
                        throw new Error('Formato não suportado. Use CSV ou JSON.');
                    }

                    this.currentData = data;
                    this.currentFileName = file.name;

                    resolve({
                        success: true,
                        fileName: file.name,
                        rowCount: data.rows?.length || data.raw?.length || 0,
                        columns: data.headers || Object.keys(data.raw?.[0] || {}),
                        preview: data.raw?.slice(0, 5) || []
                    });
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsText(file);
        });
    },

    /**
     * Normaliza dados JSON para o formato padrão
     */
    normalizeJSON(jsonData) {
        let raw = [];

        if (Array.isArray(jsonData)) {
            raw = jsonData;
        } else if (jsonData.data && Array.isArray(jsonData.data)) {
            raw = jsonData.data;
        } else if (typeof jsonData === 'object') {
            raw = [jsonData];
        }

        const headers = raw.length > 0 ? Object.keys(raw[0]) : [];
        const rows = raw.map(obj => headers.map(h => obj[h]));

        return { headers, rows, raw };
    },

    /**
     * Analisa uma coluna numérica
     * @param {string} columnName - Nome da coluna
     * @returns {Object} - Estatísticas (min, max, avg, sum, count)
     */
    analyzeNumericColumn(columnName) {
        if (!this.currentData?.raw) return null;

        const values = this.currentData.raw
            .map(row => parseFloat(String(row[columnName]).replace(',', '.')))
            .filter(v => !isNaN(v));

        if (values.length === 0) return null;

        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        return {
            column: columnName,
            count: values.length,
            sum: Math.round(sum * 100) / 100,
            avg: Math.round(avg * 100) / 100,
            min,
            max
        };
    },

    /**
     * Analisa uma coluna categórica (conta frequência)
     * @param {string} columnName - Nome da coluna
     * @returns {Object} - { categories: [], counts: [], total: number }
     */
    analyzeCategoricalColumn(columnName) {
        if (!this.currentData?.raw) return null;

        const freq = {};
        this.currentData.raw.forEach(row => {
            const value = String(row[columnName] || 'N/A').trim();
            freq[value] = (freq[value] || 0) + 1;
        });

        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

        return {
            column: columnName,
            categories: sorted.map(x => x[0]),
            counts: sorted.map(x => x[1]),
            total: this.currentData.raw.length,
            topValue: sorted[0]?.[0],
            topCount: sorted[0]?.[1]
        };
    },

    /**
     * Detecta o tipo de cada coluna (numeric, categorical, date)
     */
    detectColumnTypes() {
        if (!this.currentData?.headers || !this.currentData?.raw) return {};

        const types = {};

        this.currentData.headers.forEach(col => {
            const sampleValues = this.currentData.raw
                .slice(0, 20)
                .map(row => row[col])
                .filter(v => v != null && v !== '');

            if (sampleValues.length === 0) {
                types[col] = 'empty';
                return;
            }

            // Testar se é numérico
            const numericCount = sampleValues.filter(v => {
                const num = parseFloat(String(v).replace(',', '.'));
                return !isNaN(num);
            }).length;

            if (numericCount / sampleValues.length > 0.8) {
                types[col] = 'numeric';
            } else {
                types[col] = 'categorical';
            }
        });

        return types;
    },

    /**
     * Gera um resumo completo dos dados
     * @returns {Object} - Resumo analítico
     */
    generateSummary() {
        if (!this.currentData) return null;

        const types = this.detectColumnTypes();
        const summary = {
            fileName: this.currentFileName,
            totalRows: this.currentData.raw?.length || 0,
            totalColumns: this.currentData.headers?.length || 0,
            columns: [],
            insights: []
        };

        this.currentData.headers.forEach(col => {
            const colType = types[col];
            let analysis = { name: col, type: colType };

            if (colType === 'numeric') {
                const stats = this.analyzeNumericColumn(col);
                analysis = { ...analysis, ...stats };

                // Gerar insight
                if (stats) {
                    summary.insights.push(`A coluna "${col}" tem média de ${stats.avg} (min: ${stats.min}, max: ${stats.max})`);
                }
            } else if (colType === 'categorical') {
                const stats = this.analyzeCategoricalColumn(col);
                analysis = { ...analysis, uniqueValues: stats?.categories?.length || 0, topValue: stats?.topValue };

                if (stats && stats.categories.length <= 10) {
                    summary.insights.push(`"${col}" tem ${stats.categories.length} categorias, sendo "${stats.topValue}" a mais frequente (${stats.topCount}x)`);
                }
            }

            summary.columns.push(analysis);
        });

        return summary;
    },

    /**
     * Prepara dados para gráfico de barras
     * @param {string} categoryCol - Coluna de categorias (eixo X)
     * @param {string} valueCol - Coluna de valores (eixo Y) - se null, conta frequência
     * @returns {Array} - Formato para PptxGenJS chart
     */
    prepareBarChartData(categoryCol, valueCol = null) {
        if (!this.currentData?.raw) return [];

        if (valueCol) {
            // Soma valores por categoria
            const aggregated = {};
            this.currentData.raw.forEach(row => {
                const cat = String(row[categoryCol] || 'Outros');
                const val = parseFloat(String(row[valueCol]).replace(',', '.')) || 0;
                aggregated[cat] = (aggregated[cat] || 0) + val;
            });

            return [{
                name: valueCol,
                labels: Object.keys(aggregated).slice(0, 10),
                values: Object.values(aggregated).slice(0, 10).map(v => Math.round(v * 100) / 100)
            }];
        } else {
            // Conta frequência
            const freq = this.analyzeCategoricalColumn(categoryCol);
            return [{
                name: 'Frequência',
                labels: freq?.categories?.slice(0, 10) || [],
                values: freq?.counts?.slice(0, 10) || []
            }];
        }
    },

    /**
     * Prepara dados para gráfico de pizza
     * @param {string} categoryCol - Coluna de categorias
     * @returns {Array} - Formato para PptxGenJS chart
     */
    preparePieChartData(categoryCol) {
        const freq = this.analyzeCategoricalColumn(categoryCol);
        if (!freq) return [];

        return [{
            name: categoryCol,
            labels: freq.categories.slice(0, 6),
            values: freq.counts.slice(0, 6)
        }];
    },

    /**
     * Prepara dados para gráfico de linha (série temporal)
     * @param {string} xCol - Coluna do eixo X (geralmente data/período)
     * @param {string} yCol - Coluna do eixo Y (valores)
     * @returns {Array} - Formato para PptxGenJS chart
     */
    prepareLineChartData(xCol, yCol) {
        if (!this.currentData?.raw) return [];

        const labels = [];
        const values = [];

        this.currentData.raw.forEach(row => {
            const x = String(row[xCol] || '');
            const y = parseFloat(String(row[yCol]).replace(',', '.')) || 0;
            labels.push(x);
            values.push(y);
        });

        return [{
            name: yCol,
            labels: labels.slice(0, 20),
            values: values.slice(0, 20)
        }];
    },

    /**
     * Gera texto de insights para enviar à IA
     */
    getInsightsText() {
        const summary = this.generateSummary();
        if (!summary) return 'Nenhum dado carregado.';

        let text = `📊 **Análise do arquivo: ${summary.fileName}**\n`;
        text += `- Total de registros: ${summary.totalRows}\n`;
        text += `- Total de colunas: ${summary.totalColumns}\n\n`;
        text += `**Insights automáticos:**\n`;

        summary.insights.forEach((insight, i) => {
            text += `${i + 1}. ${insight}\n`;
        });

        return text;
    },

    /**
     * Limpa os dados carregados
     */
    clear() {
        this.currentData = null;
        this.currentFileName = null;
    }
};

// Expor globalmente
window.NexusDataAnalyzer = NexusDataAnalyzer;
