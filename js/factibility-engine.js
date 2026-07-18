/**
 * STATISTICAL ENGINE FOR FEASIBILITY CALCULATOR
 * Funções para análise estatística avançada de metas e resultados
 */

const FactibilityEngine = {
    /**
     * Calcula estatística descritiva completa
     * @param {number[]} data - Array de valores numéricos
     * @returns {object} Estatísticas descritivas
     */
    calcDescriptiveStats(data) {
        if (!data || data.length === 0) return null;

        const sorted = [...data].sort((a, b) => a - b);
        const n = data.length;

        // Média
        const mean = data.reduce((sum, val) => sum + val, 0) / n;

        // Mediana
        const median = n % 2 === 0
            ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
            : sorted[Math.floor(n / 2)];

        // Moda (valor mais frequente)
        const frequency = {};
        let maxFreq = 0;
        let mode = null;

        data.forEach(val => {
            frequency[val] = (frequency[val] || 0) + 1;
            if (frequency[val] > maxFreq) {
                maxFreq = frequency[val];
                mode = val;
            }
        });

        // Se todos têm frequência 1, não há moda
        if (maxFreq === 1) mode = null;

        // Variância e Desvio Padrão
        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
        const stdDev = Math.sqrt(variance);

        // Coeficiente de Variação
        const cv = (stdDev / mean) * 100;

        // Min e Max
        const min = sorted[0];
        const max = sorted[n - 1];

        // Amplitude
        const range = max - min;

        return {
            n,
            mean: parseFloat(mean.toFixed(2)),
            median: parseFloat(median.toFixed(2)),
            mode: mode ? parseFloat(mode.toFixed(2)) : null,
            variance: parseFloat(variance.toFixed(2)),
            stdDev: parseFloat(stdDev.toFixed(2)),
            cv: parseFloat(cv.toFixed(2)),
            min: parseFloat(min.toFixed(2)),
            max: parseFloat(max.toFixed(2)),
            range: parseFloat(range.toFixed(2))
        };
    },

    /**
     * Calcula quartis e classificação por quartil
     * @param {number[]} data - Array de valores numéricos
     * @returns {Object} Quartis e distribuição
    */
    calcQuartiles(data) {
        if (!data || data.length === 0) return null;

        const sorted = [...data].sort((a, b) => a - b);
        const n = data.length;

        // Cálculo de percentil
        const percentile = (p) => {
            const index = (p / 100) * (n - 1);
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            const weight = index - lower;

            return sorted[lower] + weight * (sorted[upper] - sorted[lower]);
        };

        const Q1 = percentile(25);
        const Q2 = percentile(50); // Mediana
        const Q3 = percentile(75);

        // IQR (Interquartile Range)
        const IQR = Q3 - Q1;

        // Classificar cada valor por quartil
        const classification = data.map(val => {
            if (val <= Q1) return 'Q1 (Baixo)';
            if (val <= Q2) return 'Q2 (Médio-Baixo)';
            if (val <= Q3) return 'Q3 (Médio-Alto)';
            return 'Q4 (Alto)';
        });

        // Contar distribuição por quartil
        const distribution = {
            Q1: data.filter(v => v <= Q1).length,
            Q2: data.filter(v => v > Q1 && v <= Q2).length,
            Q3: data.filter(v => v > Q2 && v <= Q3).length,
            Q4: data.filter(v => v > Q3).length
        };

        return {
            Q1: parseFloat(Q1.toFixed(2)),
            Q2: parseFloat(Q2.toFixed(2)),
            Q3: parseFloat(Q3.toFixed(2)),
            IQR: parseFloat(IQR.toFixed(2)),
            distribution,
            classification
        };
    },

    /**
     * Calcula probabilidade de atingir a meta e análises
     * @param {number[]} data - Dados históricos
     * @param {number} meta - Meta desejada
     * @returns {Object} Análise de probabilidade
     */
    calcProbability(data, meta) {
        if (!data || data.length === 0 || meta == null) return null;

        // Probabilidade histórica de atingir meta
        const timesAboveMeta = data.filter(v => v >= meta).length;
        const probAboveMeta = (timesAboveMeta / data.length) * 100;
        const probBelowMeta = 100 - probAboveMeta;

        // Calcular distância da meta em relação à média e desvio padrão
        const stats = this.calcDescriptiveStats(data);
        const zScore = stats.stdDev > 0 ? (meta - stats.mean) / stats.stdDev : 0;

        // Probabilidade MODELADA (distribuição normal): assumindo o processo
        // estável com média e desvio históricos, P(X ≥ meta) = 1 − Φ(z).
        // Complementa a probabilidade empírica (que só usa os pontos observados
        // e tem granularidade limitada), e permite estimar mesmo além do
        // intervalo já visto. Se as duas divergirem muito, os dados não são normais.
        const probAboveMetaNormal = stats.stdDev > 0
            ? (1 - this.normalCDF(zScore)) * 100
            : (meta <= stats.mean ? 100 : 0);

        // Cenários de previsão
        const scenarios = this.generateScenarios(data);

        return {
            probAboveMeta: parseFloat(probAboveMeta.toFixed(2)),
            probAboveMetaNormal: parseFloat(probAboveMetaNormal.toFixed(2)),
            probBelowMeta: parseFloat(probBelowMeta.toFixed(2)),
            timesAboveMeta,
            timesBelowMeta: data.length - timesAboveMeta,
            zScore: parseFloat(zScore.toFixed(2)),
            scenarios
        };
    },

    // Função de distribuição acumulada da normal padrão Φ(z),
    // via aproximação de erf (Abramowitz & Stegun 7.1.26), erro < 1,5e-7.
    normalCDF(z) {
        const sign = z < 0 ? -1 : 1;
        const x = Math.abs(z) / Math.SQRT2;
        const t = 1 / (1 + 0.3275911 * x);
        const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
        const erf = sign * y;
        return 0.5 * (1 + erf);
    },

    /**
     * Gera cenários conservador, realista e agressivo
     * @param {number[]} data - Dados históricos
     * @returns {Object} Cenários de previsão
     */
    generateScenarios(data) {
        const stats = this.calcDescriptiveStats(data);
        const quartiles = this.calcQuartiles(data);

        return {
            conservador: {
                valor: quartiles.Q1,
                descricao: 'Cenário pessimista (Q1)',
                probabilidade: 75 // 75% de chance de superar Q1
            },
            realista: {
                valor: stats.median,
                descricao: 'Cenário provável (Mediana)',
                probabilidade: 50 // 50% de chance de superar mediana
            },
            agressivo: {
                valor: quartiles.Q3,
                descricao: 'Cenário otimista (Q3)',
                probabilidade: 25 // 25% de chance de superar Q3
            }
        };
    },

    /**
     * Classifica a meta como Factível, Desafiadora ou Irrealista
     * @param {number} meta - Meta desejada
     * @param {Object} stats - Estatísticas descritivas
     * @param {Object} quartiles - Quartis
     * @returns {Object} Classificação da meta
     */
    classifyGoal(meta, stats, quartiles) {
        if (!meta || !stats || !quartiles) return null;

        const distanceFromMean = meta - stats.mean;
        const distanceInStdDev = distanceFromMean / stats.stdDev;

        let classification, color, icon, description, riskLevel;

        // Lógica de classificação baseada em distância estatística
        if (meta <= quartiles.Q2) {
            // Meta abaixo da mediana - FACTÍVEL
            classification = 'Factível';
            color = '#22c55e';
            icon = '✓';
            description = 'Meta atingível com base no histórico. Probabilidade alta de sucesso.';
            riskLevel = 'Baixo';
        } else if (meta <= quartiles.Q3) {
            // Meta entre mediana e Q3 - DESAFIADORA
            classification = 'Desafiadora';
            color = '#f59e0b';
            icon = '⚠';
            description = 'Meta exigirá esforço consistente. Possível, mas requer monitoramento.';
            riskLevel = 'Médio';
        } else if (distanceInStdDev <= 2) {
            // Meta acima de Q3 mas dentro de 2 desvios padrão - DESAFIADORA
            classification = 'Desafiadora';
            color = '#f59e0b';
            icon = '⚠';
            description = 'Meta ambiciosa. Alcançável em condições favoráveis.';
            riskLevel = 'Médio-Alto';
        } else {
            // Meta além de 2 desvios padrão - IRREALISTA
            classification = 'Irrealista';
            color = '#ef4444';
            icon = '✗';
            description = 'Meta estatisticamente improvável. Considere revisão.';
            riskLevel = 'Alto';
        }

        return {
            classification,
            color,
            icon,
            description,
            riskLevel,
            distanceFromMean: parseFloat(distanceFromMean.toFixed(2)),
            distanceInStdDev: parseFloat(distanceInStdDev.toFixed(2))
        };
    },

    /**
     * Detecta outliers usando método IQR
     * @param {number[]} data - Dados
     * @param {Object} quartiles - Quartis calculados
     * @returns {Object} Análise de outliers
     */
    detectOutliers(data, quartiles) {
        if (!data || !quartiles) return null;

        const { Q1, Q3, IQR } = quartiles;
        const lowerBound = Q1 - 1.5 * IQR;
        const upperBound = Q3 + 1.5 * IQR;

        const outliers = data.filter(v => v < lowerBound || v > upperBound);
        const outlierIndices = data.map((v, i) =>
            (v < lowerBound || v > upperBound) ? i : -1
        ).filter(i => i !== -1);

        return {
            count: outliers.length,
            percentage: parseFloat(((outliers.length / data.length) * 100).toFixed(2)),
            values: outliers,
            indices: outlierIndices,
            lowerBound: parseFloat(lowerBound.toFixed(2)),
            upperBound: parseFloat(upperBound.toFixed(2)),
            impact: outliers.length > 0 ? 'Presente' : 'Ausente'
        };
    },

    /**
     * Gera insights executivos baseados na análise completa
     * @param {Object} results - Resultados completos da análise
     * @returns {Array} Lista de insights
     */
    generateInsights(results) {
        const insights = [];
        const { stats, quartiles, probability, classification, outliers } = results;

        // Insight 1: Estabilidade
        if (stats.cv < 10) {
            insights.push({
                type: 'success',
                icon: '📊',
                title: 'Alta Previsibilidade',
                message: `Coeficiente de variação de ${stats.cv}% indica resultados muito consistentes. Baixo risco de oscilações.`
            });
        } else if (stats.cv > 20) {
            insights.push({
                type: 'warning',
                icon: '⚠️',
                title: 'Alta Variabilidade',
                message: `Coeficiente de variação de ${stats.cv}% indica resultados inconsistentes. Requer ações de estabilização.`
            });
        }

        // Insight 2: Performance vs Meta
        if (probability.probAboveMeta < 30) {
            insights.push({
                type: 'critical',
                icon: '🎯',
                title: 'Meta Desafiadora',
                message: `Apenas ${probability.probAboveMeta}% dos resultados históricos atingiram essa meta. Considere ajuste ou plano de mitigação.`
            });
        } else if (probability.probAboveMeta > 70) {
            insights.push({
                type: 'success',
                icon: '🚀',
                title: 'Meta Atingível',
                message: `${probability.probAboveMeta}% dos resultados históricos superaram essa meta. Considere meta mais ambiciosa.`
            });
        }

        // Insight 3: Outliers
        if (outliers.count > 0) {
            insights.push({
                type: 'info',
                icon: '📈',
                title: 'Outliers Detectados',
                message: `${outliers.count} valores (${outliers.percentage}%) estão fora do padrão. Investigue causas especiais.`
            });
        }

        // Insight 4: Distribuição
        const q4Count = quartiles.distribution.Q4;
        const q1Count = quartiles.distribution.Q1;
        if (q4Count > q1Count * 2) {
            insights.push({
                type: 'success',
                icon: '📈',
                title: 'Tendência Positiva',
                message: `Maioria dos resultados no quartil superior (Q4). Performance consistentemente alta.`
            });
        } else if (q1Count > q4Count * 2) {
            insights.push({
                type: 'warning',
                icon: '📉',
                title: 'Tendência de Baixa Performance',
                message: `Maioria dos resultados no quartil inferior (Q1). Considere ações corretivas.`
            });
        }

        return insights;
    },

    /**
     * Gera recomendações executivas baseadas na análise
     * @param {Object} results - Resultados completos
     * @returns {Array} Lista de recomendações
     */
    generateRecommendations(results) {
        const recommendations = [];
        const { classification, probability, stats, outliers } = results;

        // Recomendação 1: Baseada na classificação
        if (classification.classification === 'Irrealista') {
            recommendations.push({
                priority: 'Alta',
                action: 'Ajustar Meta',
                detail: `Meta atual está ${Math.abs(classification.distanceInStdDev).toFixed(1)} desvios padrão da média. Sugerimos meta de ${stats.median} (realista) ou ${results.quartiles.Q3} (desafiadora).`
            });
        }

        // Recomendação 2: Baseada em variabilidade
        if (stats.cv > 15) {
            recommendations.push({
                priority: 'Média',
                action: 'Reduzir Variabilidade',
                detail: 'Implementar controles de processo para estabilizar resultados. Alta variabilidade dificulta previsão.'
            });
        }

        // Recomendação 3: Baseada em outliers
        if (outliers.count > results.stats.n * 0.1) {
            recommendations.push({
                priority: 'Média',
                action: 'Investigar Causa Especial',
                detail: `${outliers.count} outliers detectados. Identifique e trate causas especiais.`
            });
        }

        // Recomendação 4: Plano de mitigação
        if (probability.probAboveMeta < 50) {
            recommendations.push({
                priority: 'Alta',
                action: 'Plano de Mitigação',
                detail: `Probabilidade de atingir meta é ${probability.probAboveMeta}%. Desenvolva plano de ação com marcos intermediários.`
            });
        }

        return recommendations;
    }
};

// Exportar para uso global
window.FactibilityEngine = FactibilityEngine;
