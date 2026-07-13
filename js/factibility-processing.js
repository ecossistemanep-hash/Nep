/**
 * FACTIBILITY PROCESSING AND RENDERING
 * Funções para processar Excel e renderizar resultados
 */

// Adicionar ao NexusTools object
Object.assign(NexusTools, {

    /**
     * Processa arquivo Excel/CSV uploadado
     */
    processFactibilidadeFile(file) {
        const fileName = file.name;
        document.getElementById('fact-file-name').textContent = `📄 ${fileName}`;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    window.NepApp?.showToast?.('Planilha vazia!', 'error');
                    return;
                }

                // Detectar colunas numéricas
                const firstRow = jsonData[0];
                const numericColumns = [];

                Object.keys(firstRow).forEach(key => {
                    const value = firstRow[key];
                    if (typeof value === 'number' || !isNaN(parseFloat(value))) {
                        numericColumns.push(key);
                    }
                });

                if (numericColumns.length === 0) {
                    window.NepApp?.showToast?.('Nenhuma coluna numérica encontrada!', 'error');
                    return;
                }

                // Armazenar dados
                this.factibilidadeData.rawData = jsonData;

                // Preencher select de variáveis
                const variableSelect = document.getElementById('fact-variable');
                variableSelect.innerHTML = '<option value="">Selecione...</option>' +
                    numericColumns.map(col => `<option value="${col}">${col}</option>`).join('');

                // Mostrar inputs
                document.getElementById('fact-meta-input').style.display = 'block';
                window.NepApp?.showToast?.('Arquivo carregado! Defina a meta e variable.', 'success');

            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                window.NepApp?.showToast?.('Erro ao processar arquivo!', 'error');
            }
        };

        reader.readAsArrayBuffer(file);
    },

    /**
     * Analisa factibilidade com engine estatístico
     */
    analyzeFactibilidade() {
        const meta = parseFloat(document.getElementById('fact-meta-value').value);
        const variable = document.getElementById('fact-variable').value;

        if (!meta || !variable) {
            window.NepApp?.showToast?.('Preencha meta e variável!', 'error');
            return;
        }

        if (!this.factibilidadeData.rawData || this.factibilidadeData.rawData.length === 0) {
            window.NepApp?.showToast?.('Nenhum arquivo carregado!', 'error');
            return;
        }

        // Extrair dados numéricos da variável
        const data = this.factibilidadeData.rawData
            .map(row => parseFloat(row[variable]))
            .filter(val => !isNaN(val));

        if (data.length === 0) {
            window.NepApp?.showToast?.('Variável não contém dados numéricos!', 'error');
            return;
        }

        // Calcular estatísticas usando engine
        const stats = window.FactibilityEngine.calcDescriptiveStats(data);
        const quartiles = window.FactibilityEngine.calcQuartiles(data);
        const probability = window.FactibilityEngine.calcProbability(data, meta);
        const classification = window.FactibilityEngine.classifyGoal(meta, stats, quartiles);
        const outliers = window.FactibilityEngine.detectOutliers(data, quartiles);

        const results = { stats, quartiles, probability, classification, outliers, meta, variable };

        const insights = window.FactibilityEngine.generateInsights(results);
        const recommendations = window.FactibilityEngine.generateRecommendations(results);

        // Renderizar resultados
        this.renderFactibilidadeResults({ ...results, insights, recommendations });
    },

    /**
     * Renderiza todos os resultados
     */
    renderFactibilidadeResults(results) {
        const { stats, quartiles, probability, classification, outliers, insights, recommendations, meta } = results;

        // Mostrar seção de resultados
        document.getElementById('fact-results').style.display = 'block';

        // Big Numbers KPIs
        document.getElementById('fact-kpis').innerHTML = `
      <div class="kpi-card" style="background: linear-gradient(135deg, #7555e8, #9c5cff); color: white; padding: 16px; border-radius: 12px; text-align: center;">
        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">Média</div>
        <div style="font-size: 28px; font-weight: 700;">${stats.mean}</div>
      </div>
      <div class="kpi-card" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 16px; border-radius: 12px; text-align: center;">
        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">Mediana</div>
        <div style="font-size: 28px; font-weight: 700;">${stats.median}</div>
      </div>
      <div class="kpi-card" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 16px; border-radius: 12px; text-align: center;">
        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">Desvio Padrão</div>
        <div style="font-size: 28px; font-weight: 700;">${stats.stdDev}</div>
      </div>
      <div class="kpi-card" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 16px; border-radius: 12px; text-align: center;">
        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">CV (%)</div>
        <div style="font-size: 28px; font-weight: 700;">${stats.cv}%</div>
      </div>
      <div class="kpi-card" style="background: linear-gradient(135deg, ${classification.color}, ${classification.color}dd); color: white; padding: 16px; border-radius: 12px; text-align: center;">
        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">Prob. Meta</div>
        <div style="font-size: 28px; font-weight: 700;">${probability.probAboveMeta}%</div>
      </div>
    `;

        // Goal Classification
        document.getElementById('fact-classification').innerHTML = `
      <div style="background: ${classification.color}15; border: 2px solid ${classification.color}; border-radius: 12px; padding: 20px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="font-size: 32px;">${classification.icon}</div>
          <div>
            <div style="font-size: 20px; font-weight: 700; color: ${classification.color};">${classification.classification}</div>
            <div style="font-size: 14px; opacity: 0.8;">Risco: ${classification.riskLevel}</div>
          </div>
        </div>
        <p style="margin: 0; font-size: 14px;">${classification.description}</p>
        <p style="margin: 8px 0 0; font-size: 13px; opacity: 0.7;">Meta está ${Math.abs(classification.distanceInStdDev).toFixed(1)} desvios padrão da média</p>
      </div>
    `;

        // Stats Table
        document.getElementById('fact-stats-table').innerHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: var(--surface-elevated); border-bottom: 2px solid var(--border);">
            <th style="padding: 12px; text-align: left;">Métrica</th>
            <th style="padding: 12px; text-align: right;">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid var(--border-dim);"><td style="padding: 10px;">Amostras (n)</td><td style="padding: 10px; text-align: right; font-weight: 600;">${stats.n}</td></tr>
          <tr style="border-bottom: 1px solid var(--border-dim);"><td style="padding: 10px;">Média</td><td style="padding: 10px; text-align: right; font-weight: 600;">${stats.mean}</td></tr>
          <tr style="border-bottom: 1px solid var(--border-dim);"><td style="padding: 10px;">Mediana</td><td style="padding: 10px; text-align: right; font-weight: 600;">${stats.median}</td></tr>
          <tr style="border-bottom: 1px solid var(--border-dim);"><td style="padding: 10px;">Moda</td><td style="padding: 10px; text-align: right; font-weight: 600;">${stats.mode || 'N/A'}</td></tr>
          <tr style="border-bottom: 1px solid var(--border-dim);"><td style="padding: 10px;">Variância</td><td style="padding: 10px; text-align: right; font-weight: 600;">${stats.variance}</td></tr>
          <tr style="border-bottom: 1px solid var(--border-dim);"><td style="padding: 10px;">Desvio Padrão</td><td style="padding: 10px; text-align: right; font-weight: 600;">${stats.stdDev}</td></tr>
          <tr style="border-bottom: 1px solid var(--border-dim);"><td style="padding: 10px;">Coef. Variação</td><td style="padding: 10px; text-align: right; font-weight: 600;">${stats.cv}%</td></tr>
          <tr style="border-bottom: 1px solid var(--border-dim);"><td style="padding: 10px;">Mínimo</td><td style="padding: 10px; text-align: right; font-weight: 600;">${stats.min}</td></tr>
          <tr><td style="padding: 10px;">Máximo</td><td style="padding: 10px; text-align: right; font-weight: 600;">${stats.max}</td></tr>
        </tbody>
      </table>
    `;

        // Quartiles
        document.getElementById('fact-quartiles').innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px;">
        <div style="background: var(--surface-elevated); padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">Q1 (25%)</div>
          <div style="font-size: 22px; font-weight: 700; color: #ef4444;">${quartiles.Q1}</div>
          <div style="font-size: 10px; margin-top: 4px;">${quartiles.distribution.Q1} valores</div>
        </div>
        <div style="background: var(--surface-elevated); padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">Q2 (50%)</div>
          <div style="font-size: 22px; font-weight: 700; color: #f59e0b;">${quartiles.Q2}</div>
          <div style="font-size: 10px; margin-top: 4px;">${quartiles.distribution.Q2} valores</div>
        </div>
        <div style="background: var(--surface-elevated); padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">Q3 (75%)</div>
          <div style="font-size: 22px; font-weight: 700; color: #22c55e;">${quartiles.Q3}</div>
          <div style="font-size: 10px; margin-top: 4px;">${quartiles.distribution.Q3} valores</div>
        </div>
        <div style="background: var(--surface-elevated); padding: 16px; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">Q4 (100%)</div>
          <div style="font-size: 22px; font-weight: 700; color: #7555e8;">${stats.max}</div>
          <div style="font-size: 10px; margin-top: 4px;">${quartiles.distribution.Q4} valores</div>
        </div>
      </div>
      <p style="font-size: 13px; margin: 0; opacity: 0.8;">IQR (Amplitude Interquartil): ${quartiles.IQR}</p>
      <p style="font-size: 13px; margin: 4px 0 0; opacity: 0.8;">Outliers: ${outliers.count} valores (${outliers.percentage}%)</p>
    `;

        // Scenarios
        document.getElementById('fact-scenarios').innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
        ${['conservador', 'realista', 'agressivo'].map(key => {
            const scenario = probability.scenarios[key];
            const colors = { conservador: '#ef4444', realista: '#f59e0b', agressivo: '#22c55e' };
            return `
            <div style="background: ${colors[key]}10; border: 2px solid ${colors[key]}; border-radius: 12px; padding: 16px;">
              <div style="font-size: 12px; font-weight: 600; color: ${colors[key]}; text-transform: uppercase; margin-bottom: 8px;">${key}</div>
              <div style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">${scenario.valor}</div>
              <div style="font-size: 11px; opacity: 0.8; margin-bottom: 8px;">${scenario.descricao}</div>
              <div style="font-size: 12px; font-weight: 600;">Prob: ${scenario.probabilidade}%</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

        // Insights
        const insightIcons = { success: '✓', warning: '⚠', critical: '⚠️', info: 'ℹ' };
        const insightColors = { success: '#22c55e', warning: '#f59e0b', critical: '#ef4444', info: '#3b82f6' };

        document.getElementById('fact-insights').innerHTML = insights.map(ins => `
      <div style="background: ${insightColors[ins.type]}10; border-left: 4px solid ${insightColors[ins.type]}; padding: 16px; margin-bottom: 12px; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="font-size: 20px;">${ins.icon}</span>
          <strong style="font-size: 14px;">${ins.title}</strong>
        </div>
        <p style="margin: 0; font-size: 13px; opacity: 0.9;">${ins.message}</p>
      </div>
    `).join('');

        // Recommendations
        const priorityColors = { Alta: '#ef4444', Média: '#f59e0b', Baixa: '#22c55e' };

        document.getElementById('fact-recommendations').innerHTML = recommendations.map(rec => `
      <div style="background: var(--surface-elevated); borderpadding: 16px; margin-bottom: 12px; border-radius: 8px; border-left: 4px solid ${priorityColors[rec.priority]};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 14px;">${rec.action}</strong>
          <span style="background: ${priorityColors[rec.priority]}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600;">
            ${rec.priority}
          </span>
        </div>
        <p style="margin: 0; font-size: 13px; opacity: 0.9;">${rec.detail}</p>
      </div>
    `).join('');

        // Scroll para resultados
        document.getElementById('fact-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.NepApp?.showToast?.('Análise concluída!', 'success');
    }
});

console.log('[Factibility] Funções de processamento carregadas');
