/**
 * NEXUS PLATFORM - RESULTS
 * Camada Estratégica de Resultados com Links PowerBI
 */

const NexusResults = {
  dashboards: [
    { id: 'book', name: 'Book de Resultados', icon: '📊', url: 'https://contactcenter6.aec.com.br/Orbi/modulo-relatorios/visualizar/empresarial-qualidade-vivo-nep-book-unificado-powerbi', description: 'Visão consolidada de todos os indicadores' },
    { id: 'synapse', name: 'Synapse Monitoria IA', icon: '🤖', url: 'https://contactcenter6.aec.com.br/Orbi/modulo-relatorios/visualizar/empresarial-qualidade-vivo-nep-synapse-powerbi', description: 'Análises de IA para monitoria' },
    { id: 'tdna', name: 'Book de TDNA', icon: '📈', url: 'https://contactcenter6.aec.com.br/Orbi/modulo-relatorios/visualizar/empresarial-qualidade-vivo-nep-book-de-tdna-powerbi', description: 'Taxa de não atendimento' },
    { id: 'nota', name: 'NEP Nota de Qualidade', icon: '⭐', url: 'https://contactcenter6.aec.com.br/Orbi/modulo-relatorios/visualizar/empresarial-qualidade-vivo-nep-nota-de-qualidade-powerbi', description: 'Notas e avaliações de qualidade' },
    { id: 'mensageria', name: 'NEP Mensageria', icon: '💬', url: 'https://contactcenter6.aec.com.br/Orbi/modulo-relatorios/visualizar/empresarial-qualidade-vivo-nep-mensagerias-powerbi', description: 'Métricas de canais digitais' },
    { id: 'termometro', name: 'NEP Termômetro', icon: '🌡️', url: 'https://contactcenter6.aec.com.br/Orbi/modulo-relatorios/visualizar/empresarial-qualidade-vivo-nep-term%C3%B4metro-movimentacao-powerbi', description: 'Movimentações e tendências' },
    { id: 'causa', name: 'NEP Análise de Causa', icon: '🔍', url: 'https://contactcenter6.aec.com.br/Orbi/modulo-relatorios/visualizar/empresarial-qualidade-vivo-nep-analise-de-causa-powerbi', description: 'Root cause analysis' }
  ],

  render(container) {
    const kpis = this.getKPIs();

    container.innerHTML = `
      <div class="results-page animate-fade-in">
        <header class="results-header">
          <div>
            <h1 class="page-title">Resultados Operacionais</h1>
            <p class="page-description">Camada estratégica de indicadores e análises</p>
          </div>
        </header>

        <!-- KPIs Estratégicos -->
        <div class="strategic-kpis">
          ${kpis.map(kpi => `
            <div class="strategic-kpi ${kpi.trend}">
              <div class="kpi-header">
                <span class="kpi-icon">${kpi.icon}</span>
                <span class="kpi-trend-badge ${kpi.trend}">
                  <i class="fa-solid fa-arrow-${kpi.trend === 'up' ? 'up' : kpi.trend === 'down' ? 'down' : 'right'}"></i>
                  ${kpi.change}
                </span>
              </div>
              <div class="kpi-value">${kpi.value}</div>
              <div class="kpi-name">${kpi.name}</div>
              <div class="kpi-insight">${kpi.insight}</div>
            </div>
          `).join('')}
        </div>

        <!-- Alertas Estratégicos -->
        <div class="strategic-alerts">
          <h3><i class="fa-solid fa-bell"></i> Alertas de Decisão</h3>
          <div class="alerts-grid">
            <div class="alert-card success">
              <span class="alert-icon">📉</span>
              <div class="alert-content">
                <strong>Rechamada em queda!</strong>
                <p>Redução de 2.1% vs. mês anterior. Ação: manter estratégia atual.</p>
              </div>
              <a href="${this.dashboards[0].url}" target="_blank" class="alert-link">Ver Detalhes →</a>
            </div>
            <div class="alert-card warning">
              <span class="alert-icon">⚠️</span>
              <div class="alert-content">
                <strong>NPS em observação</strong>
                <p>Variação de -1.5 pontos. Requer monitoramento próxima semana.</p>
              </div>
              <a href="${this.dashboards[3].url}" target="_blank" class="alert-link">Analisar →</a>
            </div>
          </div>
        </div>

        <!-- Dashboards PowerBI -->
        <div class="dashboards-section">
          <h3><i class="fa-solid fa-chart-line"></i> Dashboards Analíticos</h3>
          <div class="dashboards-grid">
            ${this.dashboards.map(d => `
              <a href="${d.url}" target="_blank" class="dashboard-card">
                <span class="dashboard-icon">${d.icon}</span>
                <div class="dashboard-info">
                  <h4>${d.name}</h4>
                  <p>${d.description}</p>
                </div>
                <i class="fa-solid fa-external-link"></i>
              </a>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  getKPIs() {
    return [
      { icon: '📞', name: 'Rechamada', value: '8.7%', change: '-2.1%', trend: 'down', insight: 'Tendência positiva. Meta: < 10%' },
      { icon: '⭐', name: 'NPS', value: '58', change: '-1.5', trend: 'stable', insight: 'Em observação. Meta: > 55' },
      { icon: '✅', name: 'Qualidade', value: '92.4%', change: '+3.2%', trend: 'up', insight: 'Acima da meta! Meta: > 90%' }
    ];
  }
};

// Results Styles
const resultsStyles = document.createElement('style');
resultsStyles.textContent = `
  .results-page { max-width: 1200px; margin: 0 auto; }
  .results-header { margin-bottom: var(--space-6); }
  
  .strategic-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); margin-bottom: var(--space-6); }
  
  .strategic-kpi {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
    position: relative;
    overflow: hidden;
  }
  
  .strategic-kpi::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
  }
  
  .strategic-kpi.up::before { background: var(--success-500); }
  .strategic-kpi.down::before { background: var(--error-500); }
  .strategic-kpi.stable::before { background: var(--warning-500); }
  
  .kpi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); }
  .kpi-icon { font-size: 24px; }
  
  .kpi-trend-badge {
    font-size: var(--text-xs);
    font-weight: var(--font-bold);
    padding: 4px 10px;
    border-radius: var(--radius-full);
  }
  
  .kpi-trend-badge.up { background: rgba(46, 204, 113, 0.2); color: var(--success-500); }
  .kpi-trend-badge.down { background: rgba(239, 68, 68, 0.2); color: var(--error-500); }
  .kpi-trend-badge.stable { background: rgba(245, 158, 11, 0.2); color: var(--warning-500); }
  
  .kpi-value { font-size: 40px; font-weight: var(--font-bold); color: var(--text-primary); }
  .kpi-name { font-size: var(--text-base); font-weight: var(--font-semibold); color: var(--text-secondary); margin-bottom: var(--space-2); }
  .kpi-insight { font-size: var(--text-sm); color: var(--text-tertiary); font-style: italic; }
  
  .strategic-alerts { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-xl); padding: var(--space-5); margin-bottom: var(--space-6); }
  .strategic-alerts h3 { margin-bottom: var(--space-4); display: flex; align-items: center; gap: var(--space-2); }
  
  .alerts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }
  
  .alert-card {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    border: 1px solid;
  }
  
  .alert-card.success { background: rgba(46, 204, 113, 0.1); border-color: rgba(46, 204, 113, 0.3); }
  .alert-card.warning { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3); }
  
  .alert-icon { font-size: 24px; flex-shrink: 0; }
  .alert-content { flex: 1; }
  .alert-content strong { display: block; margin-bottom: var(--space-1); }
  .alert-content p { font-size: var(--text-sm); color: var(--text-secondary); margin: 0; }
  
  .alert-link {
    font-size: var(--text-sm);
    color: var(--primary-400);
    text-decoration: none;
    white-space: nowrap;
    font-weight: var(--font-medium);
  }
  
  .alert-link:hover { text-decoration: underline; }
  
  .dashboards-section { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-xl); padding: var(--space-5); }
  .dashboards-section h3 { margin-bottom: var(--space-4); display: flex; align-items: center; gap: var(--space-2); }
  
  .dashboards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-4); }
  
  .dashboard-card {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--surface-elevated);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    text-decoration: none;
    transition: all var(--transition-fast);
  }
  
  .dashboard-card:hover {
    border-color: var(--primary-500);
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(47, 111, 237, 0.2);
  }
  
  .dashboard-icon { font-size: 32px; }
  .dashboard-info { flex: 1; }
  .dashboard-info h4 { font-size: var(--text-base); margin-bottom: var(--space-1); color: var(--text-primary); }
  .dashboard-info p { font-size: var(--text-sm); color: var(--text-secondary); margin: 0; }
  .dashboard-card i { color: var(--text-tertiary); }
  
  @media (max-width: 768px) {
    .strategic-kpis, .alerts-grid { grid-template-columns: 1fr; }
  }
`;
document.head.appendChild(resultsStyles);

window.NexusResults = NexusResults;
