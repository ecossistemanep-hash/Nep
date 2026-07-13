/**
 * ADVANCED ANALYTICS MODULE
 * Vis analíticas avançadas para Admin Dashboard
 */

Object.assign(NexusAdmin, {

    /**
     * Renderiza Analytics Avançado com todas as visões
     */
    async renderAdvancedAnalytics(container) {
        try {
            const db = firebase.firestore();
            const now = new Date();
            const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            // Carregar dados
            const [
                usersSnap,
                analyticsSnap,
                tasksSnap,
                pointsSnap,
                deliveriesSnap
            ] = await Promise.all([
                db.collection('users').get(),
                db.collection('user_analytics').where('timestamp', '>', last30d).get(),
                db.collection('tasks').get(),
                db.collection('points').get(),
                db.collection('deliveries').get()
            ]);

            const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const analytics = analyticsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const points = pointsSnap.docs.map(d => d.data());
            const deliveries = deliveriesSnap.docs.map(d => d.data());

            // Cálculos
            const insights = this.calculateAdvancedInsights(users, analytics, tasks, points, deliveries, now);

            container.innerHTML = `
        <div class="admin-section">
          <div class="admin-section-header">
            <div>
              <h3><i class="fa-solid fa-chart-mixed"></i> Analytics Avançado</h3>
              <p style="font-size: 12px; color: var(--text-tertiary);">Visões estratégicas e detecção de anomalias</p>
            </div>
            <div style="display: flex; gap: 10px;">
              <select id="analytics-period" class="form-select" style="width: auto;">
                <option value="7">Últimos 7 dias</option>
                <option value="30" selected>Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
              </select>
              <button class="btn btn-ghost" onclick="NexusAdmin.loadTabContent();">
                <i class="fa-solid fa-sync"></i> Refresh
              </button>
            </div>
          </div>

          <!-- Big Numbers Resumo -->
          <div class="analytics-kpis" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px;">
            ${this.renderBigNumbers(insights)}
          </div>

          <!-- Grid Principal -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <!-- Mapa de Calor -->
            <div class="analytics-card">
              <h4><i class="fa-solid fa-fire"></i> Mapa de Calor de Atividade</h4>
              <p style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 16px;">Quando os usuários estão mais ativos</p>
              ${this.renderHeatmap(insights.heatmap)}
            </div>

            <!-- Gráfico de Crescimento -->
            <div class="analytics-card">
              <h4><i class="fa-solid fa-chart-line"></i> Tendência de Crescimento</h4>
              <p style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 16px;">Evolução de usuários e tarefas</p>
              <canvas id="growth-chart" style="max-height: 250px;"></canvas>
            </div>
          </div>

          <!-- Alertas Inteligentes -->
          ${insights.alerts.length > 0 ? `
            <div class="analytics-card" style="margin-bottom: 20px; border-left: 4px solid #ef4444;">
              <h4 style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Alertas & Anomalias (${insights.alerts.length})</h4>
              <div style="display: grid; gap: 10px; margin-top: 12px;">
                ${insights.alerts.map(alert => `
                  <div style="padding: 12px; background: rgba(239, 68, 68, 0.05); border-radius: 8px; font-size: 13px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                      <span style="font-size: 18px;">${alert.icon}</span>
                      <strong style="color: ${alert.color};">${alert.title}</strong>
                    </div>
                    <p style="margin: 0; opacity: 0.9;">${alert.message}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Segunda Linha -->
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 20px;">
            <!-- Churn & Retenção -->
            <div class="analytics-card">
              <h4><i class="fa-solid fa-user-clock"></i> Análise de Churn & Retenção</h4>
              ${this.renderChurnAnalysis(insights.churn)}
            </div>

            <!-- Performance de Módulos -->
            <div class="analytics-card">
              <h4><i class="fa-solid fa-tachometer-alt"></i> Performance de Módulos</h4>
              ${this.renderModulePerformance(insights.modulePerformance)}
            </div>
          </div>

          <!-- Terceira Linha -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <!-- Funil de Conversão -->
            <div class="analytics-card">
              <h4><i class="fa-solid fa-filter"></i> Funil de Conversão</h4>
              ${this.renderConversionFunnel(insights.funnel)}
            </div>

            <!-- ROI Gamificação -->
            <div class="analytics-card">
              <h4><i class="fa-solid fa-trophy"></i> ROI de Gamificação</h4>
              ${this.renderGamificationROI(insights.gamificationROI)}
            </div>
          </div>

          <!-- Comparativo Entre Setores -->
          <div class="analytics-card">
            <h4><i class="fa-solid fa-building"></i> Comparativo Entre Setores</h4>
            ${this.renderSectorComparison(insights.sectorComparison)}
          </div>

        </div>
      `;

            // Renderizar gráficos Chart.js
            this.renderGrowthChart(insights.growthData);

        } catch (error) {
            console.error('[Admin] Erro em Advanced Analytics:', error);
            container.innerHTML = `
        <div class="admin-section">
          <div class="alert alert-error">
            <strong>Erro ao carregar analytics:</strong> ${error.message}
          </div>
        </div>
      `;
        }
    },

    /**
     * Calcula todos os insights avançados
     */
    calculateAdvancedInsights(users, analytics, tasks, points, deliveries, now) {
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Big Numbers
        const activeUsers30d = new Set(analytics.map(a => a.uid)).size;
        const activeUsers7d = new Set(analytics.filter(a => a.timestamp?.toDate() > last7d).map(a => a.uid)).size;
        const totalUsers = users.length;
        const churnRate = ((totalUsers - activeUsers30d) / totalUsers * 100).toFixed(1);
        const tasksCompleted30d = tasks.filter(t => t.status === 'Concluído' && t.updated_at?.toDate() > last30d).length;
        const avgTasksPerUser = (tasksCompleted30d / activeUsers30d || 0).toFixed(1);

        // Mapa de Calor (24h x 7 dias)
        const heatmap = this.generateHeatmapData(analytics);

        // Tendência de Crescimento
        const growthData = this.generateGrowthData(users, tasks, analytics);

        // Alertas Inteligentes
        const alerts = this.detectAnomalies(users, analytics, tasks, activeUsers7d, activeUsers30d);

        // Churn Analysis
        const churn = this.analyzeChurn(users, analytics, now);

        // Performance de Módulos
        const modulePerformance = this.analyzeModulePerformance(analytics);

        // Funil de Conversão
        const funnel = this.analyzeFunnel(users, analytics, tasks);

        // ROI Gamificação
        const gamificationROI = this.analyzeGamificationROI(points, tasks, deliveries);

        // Comparativo Setores
        const sectorComparison = this.analyzeSectorComparison(users, tasks, deliveries);

        return {
            bigNumbers: {
                activeUsers30d,
                activeUsers7d,
                churnRate,
                tasksCompleted30d,
                avgTasksPerUser,
                totalUsers
            },
            heatmap,
            growthData,
            alerts,
            churn,
            modulePerformance,
            funnel,
            gamificationROI,
            sectorComparison
        };
    },

    /**
     * Renderiza Big Numbers
     */
    renderBigNumbers(insights) {
        const bn = insights.bigNumbers;
        return `
      <div class="analytics-kpi highlight">
        <div class="analytics-kpi-value">${bn.activeUsers7d}</div>
        <div class="analytics-kpi-label">Ativos 7d</div>
        <div style="font-size: 10px; opacity: 0.8;">de ${bn.totalUsers} total</div>
      </div>
      <div class="analytics-kpi ${parseFloat(bn.churnRate) > 30 ? 'warning' : 'success'}">
        <div class="analytics-kpi-value">${bn.churnRate}%</div>
        <div class="analytics-kpi-label">Taxa de Churn</div>
        <div style="font-size: 10px; opacity: 0.8;">Últimos 30d</div>
      </div>
      <div class="analytics-kpi active">
        <div class="analytics-kpi-value">${bn.tasksCompleted30d}</div>
        <div class="analytics-kpi-label">Tarefas Finalizadas</div>
        <div style="font-size: 10px; opacity: 0.8;">Últimos 30d</div>
      </div>
      <div class="analytics-kpi info">
        <div class="analytics-kpi-value">${bn.avgTasksPerUser}</div>
        <div class="analytics-kpi-label">Média p/ Usuário</div>
        <div style="font-size: 10px; opacity: 0.8;">Tarefas/pessoa</div>
      </div>
      <div class="analytics-kpi success">
        <div class="analytics-kpi-value">${((bn.activeUsers30d / bn.totalUsers) * 100).toFixed(0)}%</div>
        <div class="analytics-kpi-label">Engajamento</div>
        <div style="font-size: 10px; opacity: 0.8;">Ativos/Total</div>
      </div>
    `;
    },

    /**
     * Gera dados do mapa de calor
     */
    generateHeatmapData(analytics) {
        const heatmap = Array(7).fill(null).map(() => Array(24).fill(0));

        analytics.forEach(a => {
            if (!a.timestamp) return;
            const date = a.timestamp.toDate();
            const day = date.getDay(); // 0 = domingo
            const hour = date.getHours();
            heatmap[day][hour]++;
        });

        return heatmap;
    },

    /**
     * Renderiza mapa de calor
     */
    renderHeatmap(heatmap) {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const maxValue = Math.max(...heatmap.flat());

        return `
      <div style="overflow-x: auto;">
        <table style="border-collapse: separate; border-spacing: 2px; font-size: 10px;">
          <thead>
            <tr>
              <th style="min-width: 40px;"></th>
              ${Array.from({ length: 24 }, (_, h) => `<th style="padding: 4px; text-align: center;">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${heatmap.map((dayData, dayIdx) => `
              <tr>
                <td style="padding: 4px; font-weight: 600;">${days[dayIdx]}</td>
                ${dayData.map(count => {
            const intensity = maxValue > 0 ? count / maxValue : 0;
            const color = intensity === 0 ? '#1e293b' :
                `rgba(99, 102, 241, ${0.2 + intensity * 0.8})`;
            return `<td style="background: ${color}; width: 20px; height: 20px; border-radius: 3px;" title="${count} atividades"></td>`;
        }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 11px;">
        <span>Menos</span>
        <div style="display: flex; gap: 2px;">
          ${[0, 0.25, 0.5, 0.75, 1].map(intensity =>
            `<div style="width: 14px; height: 14px; background: ${intensity === 0 ? '#1e293b' : `rgba(99, 102, 241, ${0.2 + intensity * 0.8})`}; border-radius: 2px;"></div>`
        ).join('')}
        </div>
        <span>Mais</span>
      </div>
    `;
    },

    /**
     * Gera dados de crescimento
     */
    generateGrowthData(users, tasks, analytics) {
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            return date;
        });

        const userGrowth = last30Days.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            return users.filter(u => {
                const createdAt = u.created_at?.toDate?.() || u.criado_em?.toDate?.();
                if (!createdAt) return false;
                return createdAt.toISOString().split('T')[0] <= dateStr;
            }).length;
        });

        const tasksGrowth = last30Days.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            return tasks.filter(t => {
                const createdAt = t.created_at?.toDate?.();
                if (!createdAt) return false;
                return createdAt.toISOString().split('T')[0] === dateStr && t.status === 'Concluído';
            }).length;
        });

        return {
            labels: last30Days.map(d => `${d.getDate()}/${d.getMonth() + 1}`),
            userGrowth,
            tasksGrowth
        };
    },

    /**
     * Renderiza gráfico de crescimento
     */
    renderGrowthChart(growthData) {
        setTimeout(() => {
            const ctx = document.getElementById('growth-chart');
            if (!ctx) return;

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: growthData.labels,
                    datasets: [
                        {
                            label: 'Usuários Acumulados',
                            data: growthData.userGrowth,
                            borderColor: '#7555e8',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            tension: 0.4,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Tarefas Concluídas/Dia',
                            data: growthData.tasksGrowth,
                            borderColor: '#22c55e',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            tension: 0.4,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 11 } } }
                    },
                    scales: {
                        y: { type: 'linear', position: 'left', title: { display: true, text: 'Usuários' } },
                        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Tarefas' } }
                    }
                }
            });
        }, 100);
    },

    /**
     * Detecta anomalias e gera alertas
     */
    detectAnomalies(users, analytics, tasks, activeUsers7d, activeUsers30d) {
        const alerts = [];
        const totalUsers = users.length;

        // Alerta 1: Queda de engajamento
        const engagementDrop = activeUsers7d < (activeUsers30d * 0.5);
        if (engagementDrop) {
            alerts.push({
                icon: '⚠️',
                title: 'Queda de Engajamento',
                message: `Apenas ${activeUsers7d} usuários ativos nos últimos 7 dias (vs ${activeUsers30d} nos 30 dias). Possível problema!`,
                color: '#ef4444'
            });
        }

        // Alerta 2: Alto churn
        const churnRate = (totalUsers - activeUsers30d) / totalUsers;
        if (churnRate > 0.3) {
            alerts.push({
                icon: '🚨',
                title: 'Taxa de Churn Alta',
                message: `${(churnRate * 100).toFixed(0)}% dos usuários inativos há +30 dias. Ação de reengajamento necessária.`,
                color: '#f59e0b'
            });
        }

        // Alerta 3: Tarefas paradas
        const stuckTasks = tasks.filter(t => {
            const updatedAt = t.updated_at?.toDate?.();
            if (!updatedAt) return false;
            const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
            return t.status !== 'Concluído' && daysSinceUpdate > 5;
        }).length;

        if (stuckTasks > 10) {
            alerts.push({
                icon: '⏰',
                title: 'Tarefas Estagnadas',
                message: `${stuckTasks} tarefas sem atualização há +5 dias. Revisar fluxo de trabalho.`,
                color: '#ef4444'
            });
        }

        // Alerta 4: Usuários pendentes
        const pendingUsers = users.filter(u => u.status === 'PENDENTE').length;
        if (pendingUsers > 5) {
            alerts.push({
                icon: '👤',
                title: 'Aprovações Pendentes',
                message: `${pendingUsers} usuários aguardando aprovação. Moderação necessária.`,
                color: '#f59e0b'
            });
        }

        return alerts;
    },

    /**
     * Analisa churn e retenção
     */
    analyzeChurn(users, analytics, now) {
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const activeUIDs = new Set(analytics.map(a => a.uid));
        const recentActiveUIDs = new Set(analytics.filter(a => a.timestamp?.toDate() > last7d).map(a => a.uid));

        const churned = users.filter(u => !activeUIDs.has(u.uid)).length;
        const atRisk = users.filter(u => activeUIDs.has(u.uid) && !recentActiveUIDs.has(u.uid)).length;
        const healthy = users.filter(u => recentActiveUIDs.has(u.uid)).length;

        return { churned, atRisk, healthy, total: users.length };
    },

    /**
     * Renderiza análise de churn
     */
    renderChurnAnalysis(churn) {
        const churnPct = ((churn.churned / churn.total) * 100).toFixed(1);
        const riskPct = ((churn.atRisk / churn.total) * 100).toFixed(1);
        const healthyPct = ((churn.healthy / churn.total) * 100).toFixed(1);

        return `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px;">
        <div style="text-align: center; padding: 16px; background: rgba(34, 197, 94, 0.1); border-radius: 8px;">
          <div style="font-size: 28px; font-weight: 700; color: #22c55e;">${churn.healthy}</div>
          <div style="font-size: 11px; margin-top: 4px;">Saudáveis</div>
          <div style="font-size: 10px; opacity: 0.7;">${healthyPct}%</div>
        </div>
        <div style="text-align: center; padding: 16px; background: rgba(245, 158, 11, 0.1); border-radius: 8px;">
          <div style="font-size: 28px; font-weight: 700; color: #f59e0b;">${churn.atRisk}</div>
          <div style="font-size: 11px; margin-top: 4px;">Em Risco</div>
          <div style="font-size: 10px; opacity: 0.7;">${riskPct}%</div>
        </div>
        <div style="text-align: center; padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
          <div style="font-size: 28px; font-weight: 700; color: #ef4444;">${churn.churned}</div>
          <div style="font-size: 11px; margin-top: 4px;">Inativos</div>
          <div style="font-size: 10px; opacity: 0.7;">${churnPct}%</div>
        </div>
      </div>
      <p style="font-size: 11px; margin-top: 12px; opacity: 0.8;">
        <strong>Saudáveis:</strong> Ativos últimos 7d | <strong>Em Risco:</strong> Sem atividade 7-30d | <strong>Inativos:</strong> +30d sem login
      </p>
    `;
    },

    /**
     * Analisa performance dos módulos
     */
    analyzeModulePerformance(analytics) {
        const moduleCount = {};
        analytics.forEach(a => {
            const module = a.module || a.page || 'unknown';
            moduleCount[module] = (moduleCount[module] || 0) + 1;
        });

        return Object.entries(moduleCount)
            .map(([module, count]) => ({ module, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    },

    /**
     * Renderiza performance de módulos
     */
    renderModulePerformance(modulePerformance) {
        const moduleLabels = {
            dashboard: '🏠 Dashboard',
            kanban: '📋 Kanban',
            calendar: '📅 Agendas',
            forum: '💬 Fórum',
            tools: '🛠️ Ferramentas',
            reports: '📊 Relatórios',
            profile: '👤 Perfil',
            admin: '⚙️ Admin'
        };

        if (modulePerformance.length === 0) {
            return '<p class="text-muted">Aguardando dados...</p>';
        }

        const maxCount = modulePerformance[0].count;

        return `
      <div style="display: grid; gap: 10px; margin-top: 12px;">
        ${modulePerformance.map(m => {
            const percentage = (m.count / maxCount * 100);
            return `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                <span>${moduleLabels[m.module] || m.module}</span>
                <span style="font-weight: 600;">${m.count}</span>
              </div>
              <div style="background: rgba(99, 102, 241, 0.1); border-radius: 4px; height: 6px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #7555e8, #9c5cff); width: ${percentage}%; height: 100%; transition: width 0.3s;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    },

    /**
     * Analisa funil de conversão
     */
    analyzeFunnel(users, analytics, tasks) {
        const totalUsers = users.length;
        const usersWithActivity = new Set(analytics.map(a => a.uid)).size;
        const usersWithTasks = new Set(tasks.map(t => t.created_by || t.executor_uid)).size;
        const usersWithCompletedTasks = new Set(
            tasks.filter(t => t.status === 'Concluído').map(t => t.executor_uid)
        ).size;

        return {
            cadastro: totalUsers,
            primeiroAcesso: usersWithActivity,
            criarTarefa: usersWithTasks,
            concluirTarefa: usersWithCompletedTasks
        };
    },

    /**
     * Renderiza funil de conversão
     */
    renderConversionFunnel(funnel) {
        const stages = [
            { label: 'Cadastro', value: funnel.cadastro, color: '#7555e8' },
            { label: 'Primeiro Acesso', value: funnel.primeiroAcesso, color: '#9c5cff' },
            { label: 'Criar Tarefa', value: funnel.criarTarefa, color: '#22c55e' },
            { label: 'Concluir Tarefa', value: funnel.concluirTarefa, color: '#10b981' }
        ];

        const maxValue = stages[0].value;

        return `
      <divstyle="display: grid; gap: 12px; margin-top: 12px;">
        ${stages.map((stage, idx) => {
            const percentage = (stage.value / maxValue * 100).toFixed(1);
            const dropoff = idx > 0 ? ((stages[idx - 1].value - stage.value) / stages[idx - 1].value * 100).toFixed(1) : 0;

            return `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                <span style="font-weight: 600;">${stage.label}</span>
                <div style="display: flex; gap: 12px;">
                  <span>${stage.value} usuários</span>
                  ${idx > 0 ? `<span style="color: #ef4444; font-size: 11px;">-${dropoff}%</span>` : ''}
                </div>
              </div>
              <div style="background: rgba(99, 102, 241, 0.1); border-radius: 6px; height: ${40 - idx * 5}px; overflow: hidden;">
                <div style="background: ${stage.color}; width: ${percentage}%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 600;">
                  ${percentage}%
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    },

    /**
     * Analisa ROI de gamificação
     */
    analyzeGamificationROI(points, tasks, deliveries) {
        const usersWithPoints = points.filter(p => p.total_points > 0);
        const avgPoints = usersWithPoints.reduce((sum, p) => sum + (p.total_points || 0), 0) / (usersWithPoints.length || 1);

        const topPerformers = usersWithPoints.sort((a, b) => b.total_points - a.total_points).slice(0, 10);
        const topPerformerUIDs = new Set(topPerformers.map(p => p.uid));

        const tasksFromTopPerformers = tasks.filter(t => topPerformerUIDs.has(t.executor_uid)).length;
        const totalTasks = tasks.length;
        const contributionPct = (tasksFromTopPerformers / totalTasks * 100).toFixed(1);

        return {
            usersWithPoints: usersWithPoints.length,
            avgPoints: avgPoints.toFixed(0),
            topPerformersContribution: contributionPct,
            tasksFromTop: tasksFromTopPerformers
        };
    },

    /**
     * Renderiza ROI de gamificação
     */
    renderGamificationROI(roi) {
        return `
      <div style="display: grid; gap: 16px; margin-top: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div style="text-align: center; padding: 16px; background: var(--surface-elevated); border-radius: 8px;">
            <div style="font-size: 24px; font-weight: 700; color: #7555e8;">${roi.usersWithPoints}</div>
            <div style="font-size: 11px; margin-top: 4px;">Usuários com XP</div>
          </div>
          <div style="text-align: center; padding: 16px; background: var(--surface-elevated); border-radius: 8px;">
            <div style="font-size: 24px; font-weight: 700; color: #9c5cff;">${roi.avgPoints}</div>
            <div style="font-size: 11px; margin-top: 4px;">XP Médio</div>
          </div>
        </div>
        
        <div style="padding: 16px; background: rgba(139, 92, 246, 0.1); border-radius: 8px; border-left: 4px solid #9c5cff;">
          <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">💡 Insight</div>
          <p style="margin: 0; font-size: 12px;">
            Top 10 ranqueados são responsáveis por <strong>${roi.topPerformersContribution}%</strong> das tarefas (${roi.tasksFromTop} de ${roi.tasksFromTop + 100}).
            Gamificação está <strong>${parseFloat(roi.topPerformersContribution) > 30 ? 'funcionando bem' : 'precisando ajustes'}</strong>.
          </p>
        </div>
      </div>
    `;
    },

    /**
     * Analisa comparativo entre setores
     */
    analyzeSectorComparison(users, tasks, deliveries) {
        const sectorStats = {};

        users.forEach(u => {
            const sector = u.setor || 'Sem Setor';
            if (!sectorStats[sector]) {
                sectorStats[sector] = { users: 0, tasks: 0, avgScore: 0, deliveries: 0 };
            }
            sectorStats[sector].users++;
        });

        tasks.forEach(t => {
            const user = users.find(u => u.uid === t.executor_uid);
            if (user) {
                const sector = user.setor || 'Sem Setor';
                if (sectorStats[sector] && t.status === 'Concluído') {
                    sectorStats[sector].tasks++;
                }
            }
        });

        deliveries.forEach(d => {
            const user = users.find(u => u.uid === d.uid);
            if (user && d.finalScore) {
                const sector = user.setor || 'Sem Setor';
                if (sectorStats[sector]) {
                    sectorStats[sector].deliveries++;
                    sectorStats[sector].avgScore += parseFloat(d.finalScore);
                }
            }
        });

        Object.keys(sectorStats).forEach(sector => {
            if (sectorStats[sector].deliveries > 0) {
                sectorStats[sector].avgScore = (sectorStats[sector].avgScore / sectorStats[sector].deliveries).toFixed(1);
            }
        });

        return Object.entries(sectorStats)
            .map(([sector, stats]) => ({ sector, ...stats }))
            .filter(s => s.users > 0)
            .sort((a, b) => b.tasks - a.tasks);
    },

    /**
     * Renderiza comparativo entre setores
     */
    renderSectorComparison(sectors) {
        if (sectors.length === 0) {
            return '<p class="text-muted">Nenhum setor configurado</p>';
        }

        return `
      <div style="overflow-x: auto; margin-top: 12px;">
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border);">
              <th style="padding: 10px; text-align: left;">Setor</th>
              <th style="padding: 10px; text-align: center;">Usuários</th>
              <th style="padding: 10px; text-align: center;">Tarefas Concluídas</th>
              <th style="padding: 10px; text-align: center;">Média/Pessoa</th>
              <th style="padding: 10px; text-align: center;">Score OKR Médio</th>
            </tr>
          </thead>
          <tbody>
            ${sectors.map(s => `
              <tr style="border-bottom: 1px solid var(--border-dim);">
                <td style="padding: 10px; font-weight: 600;">${s.sector}</td>
                <td style="padding: 10px; text-align: center;">${s.users}</td>
                <td style="padding: 10px; text-align: center;">${s.tasks}</td>
                <td style="padding: 10px; text-align: center;">${(s.tasks / s.users).toFixed(1)}</td>
                <td style="padding: 10px; text-align: center;">
                  <span style="background: ${parseFloat(s.avgScore) >= 8 ? 'rgba(34, 197, 94, 0.2)' : parseFloat(s.avgScore) >= 6 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; 
                                padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                    ${s.avgScore || 'N/A'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    }

});

console.log('[Admin] Advanced Analytics module loaded');
