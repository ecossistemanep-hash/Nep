/**
 * SCRIPT DE RECONCILIAÇÃO COMPLETA V4 - NEP
 * 
 * Este script faz a reconciliação DEFINITIVA de pontos para TODOS os usuários.
 * 
 * PROCESSO:
 * FASE 1: Carrega todos os dados (users, tasks, transactions)
 * FASE 2: Cria transações FALTANTES de Kanban (tarefas validadas sem transação)
 * FASE 3: Recalcula total_points = soma de TODAS as transações
 * FASE 4: Recalcula stats de conquistas a partir dos dados reais
 * FASE 5: Desbloqueia conquistas retroativas E cria transações para elas
 * FASE 6: Recalcula totais FINAIS (incluindo pontos de conquistas)
 * 
 * SEGURANÇA CONTRA DUPLICAÇÃO:
 * - Kanban: verifica se já existe transação com o título da tarefa
 * - Conquistas: verifica se conquista já foi desbloqueada e se já tem transação ACHIEVEMENT
 * - Totais: sempre recalcula a partir da soma real das transações
 * 
 * USO: No console do navegador (logado como admin):
 *   await runFullReconciliation()
 */

async function runFullReconciliation() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   RECONCILIAÇÃO COMPLETA DE PONTOS - NEP V4     ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('📅 Iniciado em:', new Date().toLocaleString('pt-BR'));

    const db = window.db;
    if (!db) {
        alert('❌ Banco de dados não disponível. Faça login primeiro.');
        return;
    }

    // Constantes
    const PRIORITY_POINTS = { 'Baixo': 5, 'Médio': 10, 'Alto': 15, 'Urgente': 25 };
    const COMPLEXITY_MULTIPLIER = { 'Baixa': 1, 'Média': 1.5, 'Alta': 2 };
    const DELAY_PENALTY = { 1: -5, 2: -10, 3: -15 };
    const EXCLUDED_TX_TYPES = ['PODCAST_EPISODE', 'QUIZ_PASSED'];

    function calculateKanbanPoints(task) {
        let pts = Math.round((PRIORITY_POINTS[task.priority] || 5) * (COMPLEXITY_MULTIPLIER[task.complexity] || 1));
        if (task.deadline && task.deliveredAt) {
            const deadline = new Date(task.deadline + 'T23:59:59');
            const delivered = new Date(task.deliveredAt);
            const daysLate = Math.floor((delivered - deadline) / (1000 * 60 * 60 * 24));
            if (daysLate > 0) {
                if (daysLate === 1) pts += DELAY_PENALTY[1];
                else if (daysLate === 2) pts += DELAY_PENALTY[2];
                else pts += DELAY_PENALTY[3];
                pts = Math.max(1, pts);
            }
        }
        return pts;
    }

    function calculateLevel(points) {
        if (!points || points < 50) return 1;
        if (points < 150) return 2;
        if (points < 300) return 3;
        if (points < 500) return 4;
        if (points < 800) return 5;
        if (points < 1200) return 6;
        if (points < 1700) return 7;
        if (points < 2500) return 8;
        if (points < 3500) return 9;
        return 10;
    }

    const report = {
        users: 0,
        kanbanTxCreated: 0,
        kanbanTxSkipped: 0,
        achievementsUnlocked: 0,
        achievementTxCreated: 0,
        pointsCorrected: 0,
        errors: [],
        userDetails: []
    };

    try {
        // ═══════════════════════════════════════════
        // FASE 1: CARREGAR TODOS OS DADOS
        // ═══════════════════════════════════════════
        console.log('\n📥 FASE 1: Carregando dados...');

        const [usersSnap, tasksSnap, txSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('tasks').get(),
            db.collection('points_transactions').get()
        ]);

        const users = [];
        usersSnap.forEach(d => users.push({ uid: d.id, ...d.data() }));

        const tasks = [];
        tasksSnap.forEach(d => tasks.push({ id: d.id, ...d.data() }));

        const allTx = [];
        txSnap.forEach(d => allTx.push({ id: d.id, ...d.data() }));

        // Index: transações por UID
        const txByUid = {};
        for (const t of allTx) {
            if (!t.uid) continue;
            if (!txByUid[t.uid]) txByUid[t.uid] = [];
            txByUid[t.uid].push(t);
        }

        // Tarefas validadas
        const validatedTasks = tasks.filter(t => t.validated === true && t.status === 'done');

        console.log(`  ✅ ${users.length} usuários`);
        console.log(`  ✅ ${validatedTasks.length} tarefas validadas`);
        console.log(`  ✅ ${allTx.length} transações existentes`);

        // ═══════════════════════════════════════════
        // FASE 2: CRIAR TRANSAÇÕES FALTANTES DE KANBAN
        // ═══════════════════════════════════════════
        console.log('\n📋 FASE 2: Verificando transações de Kanban...');

        for (const task of validatedTasks) {
            const uid = task.ownerUid;
            if (!uid) continue;

            const userTxList = txByUid[uid] || [];
            const alreadyExists = userTxList.some(tx => {
                const type = tx.type || tx.action_type || '';
                if (type !== 'COMPLETE_TASK' && type !== 'TASK_COMPLETED' && type !== 'TASK_VALIDATED') return false;
                const desc = tx.description || tx.action_label || '';
                return desc.includes(task.title);
            });

            if (alreadyExists) {
                report.kanbanTxSkipped++;
                continue;
            }

            const points = calculateKanbanPoints(task);
            const txData = {
                uid,
                type: 'COMPLETE_TASK',
                action_type: 'COMPLETE_TASK',
                amount: points,
                points: points,
                description: `[RETROATIVO] Conclusão: "${task.title}"`,
                action_label: `[RETROATIVO] Conclusão: "${task.title}"`,
                balance_after: 0, // Será recalculado na fase 6
                timestamp: task.validatedAt
                    ? firebase.firestore.Timestamp.fromDate(new Date(task.validatedAt))
                    : firebase.firestore.FieldValue.serverTimestamp(),
                created_at: task.validatedAt
                    ? firebase.firestore.Timestamp.fromDate(new Date(task.validatedAt))
                    : firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('points_transactions').add(txData);
            // Adicionar à lista local para cálculo correto depois
            if (!txByUid[uid]) txByUid[uid] = [];
            txByUid[uid].push(txData);

            report.kanbanTxCreated++;
            console.log(`  ➕ Kanban: "${task.title}" → +${points} pts para ${uid}`);
        }

        console.log(`  📊 ${report.kanbanTxCreated} transações criadas, ${report.kanbanTxSkipped} já existiam`);

        // ═══════════════════════════════════════════
        // FASE 3-6: PROCESSAR CADA USUÁRIO
        // ═══════════════════════════════════════════
        console.log('\n👥 FASES 3-6: Processando usuários...');

        for (const user of users) {
            const uid = user.uid;
            const userName = user.nome || user.name || 'Usuário';

            try {
                const userTx = txByUid[uid] || [];

                // ── FASE 3: RECALCULAR TOTAL A PARTIR DAS TRANSAÇÕES ──
                let totalFromTx = 0;
                for (const t of userTx) {
                    const type = t.type || t.action_type || '';
                    if (EXCLUDED_TX_TYPES.includes(type)) continue;
                    const pts = Number(t.amount || t.points || 0);
                    if (!isNaN(pts)) totalFromTx += pts;
                }

                // ── FASE 4: RECALCULAR STATS PARA CONQUISTAS ──
                const stats = {
                    total_points: totalFromTx,
                    tasks_completed: 0,
                    tasks_created: 0,
                    on_time_deliveries: 0,
                    fast_delivery: 0,
                    validations: 0,
                    forum_topics: 0,
                    forum_replies: 0,
                    forum_solutions: 0,
                    testimonials_sent: 0,
                    testimonials_received: 0,
                    reports_sent: 0,
                    routines_completed: 0,
                    modules_visited: 0,
                    tools_used: 0,
                    events_created: 0,
                    streak: 0,
                    best_streak: 0,
                    streak_recovered: 0,
                    best_rank: 999
                };

                // Stats do Kanban (dados reais das tarefas)
                for (const task of tasks) {
                    const isOwner = task.ownerUid === uid || task.owner === userName;
                    const isCreator = task.creatorUid === uid;

                    if (isCreator) stats.tasks_created++;

                    if (isOwner && task.status === 'done' && task.validated === true) {
                        stats.tasks_completed++;
                        if (task.deadline && task.deliveredAt) {
                            const deadline = new Date(task.deadline + 'T23:59:59');
                            const delivered = new Date(task.deliveredAt);
                            if (delivered <= deadline) stats.on_time_deliveries++;
                            const hoursToComplete = (delivered - new Date(task.createdAt)) / (1000 * 60 * 60);
                            if (hoursToComplete < 24 && hoursToComplete > 0) stats.fast_delivery++;
                        }
                    }

                    // Validações feitas por este usuário
                    if (task.validatedBy === uid && task.validated === true) {
                        stats.validations++;
                    }
                }

                // Stats das transações
                for (const t of userTx) {
                    const type = t.type || t.action_type || '';
                    switch (type) {
                        case 'FORUM_TOPIC': stats.forum_topics++; break;
                        case 'FORUM_REPLY': stats.forum_replies++; break;
                        case 'FORUM_SOLUTION': stats.forum_solutions++; break;
                        case 'SEND_TESTIMONIAL': stats.testimonials_sent++; break;
                        case 'RECEIVE_TESTIMONIAL': stats.testimonials_received++; break;
                        case 'REPORT_SENT': stats.reports_sent++; break;
                        case 'ROUTINE_COMPLETED': stats.routines_completed++; break;
                        case 'TICKET_CREATED': case 'TICKET_RESOLVED': break; // tracked but no separate stat
                    }
                }

                // ── FASE 5: DESBLOQUEAR CONQUISTAS + CRIAR TRANSAÇÕES ──
                const achRef = db.collection('user_achievements').doc(uid);
                const achSnap = await achRef.get();
                let achData = achSnap.exists ? achSnap.data() : { unlocked: [], stats: {}, streak_freeze: 1, league: 'bronze' };
                if (!achData.unlocked) achData.unlocked = [];

                // Preservar streak existente (maior valor)
                const existingStats = achData.stats || {};
                stats.streak = Math.max(existingStats.streak || 0, stats.streak);
                stats.best_streak = Math.max(existingStats.best_streak || 0, stats.best_streak);
                stats.streak_recovered = Math.max(existingStats.streak_recovered || 0, stats.streak_recovered);
                stats.modules_visited = Math.max(existingStats.modules_visited || 0, stats.modules_visited);
                stats.tools_used = Math.max(existingStats.tools_used || 0, stats.tools_used);
                stats.events_created = Math.max(existingStats.events_created || 0, stats.events_created);
                stats.best_rank = Math.min(existingStats.best_rank || 999, stats.best_rank);

                achData.stats = stats;

                // Verificar conquistas
                let newAchievements = [];
                if (window.NexusAchievements && window.NexusAchievements.ACHIEVEMENTS) {
                    const ACHIEVEMENTS = window.NexusAchievements.ACHIEVEMENTS;

                    for (const [key, ach] of Object.entries(ACHIEVEMENTS)) {
                        if (achData.unlocked.includes(key)) continue;

                        const { type, value, operator } = ach.condition;
                        const currentValue = stats[type] || 0;
                        let unlocked = false;

                        if (operator === '<=') unlocked = currentValue <= value;
                        else if (operator === '==') unlocked = currentValue === value;
                        else unlocked = currentValue >= value;

                        if (unlocked) {
                            achData.unlocked.push(key);
                            newAchievements.push({ key, ...ach });
                        }
                    }
                }

                // Criar transações de conquistas retroativas (sem duplicar)
                const existingAchTx = userTx.filter(t => (t.type || t.action_type) === 'ACHIEVEMENT');
                let achPointsAdded = 0;

                for (const ach of newAchievements) {
                    // Verificar se já existe transação para esta conquista
                    const alreadyHasTx = existingAchTx.some(t => {
                        const desc = t.description || t.action_label || '';
                        return desc.includes(ach.name);
                    });

                    if (!alreadyHasTx) {
                        const achTxData = {
                            uid,
                            type: 'ACHIEVEMENT',
                            action_type: 'ACHIEVEMENT',
                            amount: ach.points,
                            points: ach.points,
                            description: `🏆 ${ach.name}`,
                            action_label: `🏆 ${ach.name}`,
                            balance_after: 0,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            created_at: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        await db.collection('points_transactions').add(achTxData);
                        achPointsAdded += ach.points;
                        report.achievementTxCreated++;
                        console.log(`  🏆 ${userName}: "${ach.name}" → +${ach.points} pts`);
                    }
                }

                report.achievementsUnlocked += newAchievements.length;

                // Salvar achievements
                achData.last_activity = achData.last_activity || new Date().toISOString();
                await achRef.set(achData, { merge: true });

                // ── FASE 6: RECALCULAR TOTAL FINAL ──
                const finalTotal = totalFromTx + achPointsAdded;
                const finalLevel = calculateLevel(finalTotal);

                // Atualizar stats com total final
                achData.stats.total_points = finalTotal;
                await achRef.set({ stats: { total_points: finalTotal } }, { merge: true });

                // Verificar se precisa atualizar user_points
                const currentPointsDoc = await db.collection('user_points').doc(uid).get();
                const currentTotal = currentPointsDoc.exists ? (currentPointsDoc.data().total_points || 0) : 0;

                if (currentTotal !== finalTotal || !currentPointsDoc.exists) {
                    await db.collection('user_points').doc(uid).set({
                        uid,
                        name: userName,
                        total_points: finalTotal,
                        level: finalLevel,
                        last_updated: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    report.pointsCorrected++;
                }

                if (finalTotal > 0 || newAchievements.length > 0) {
                    report.userDetails.push({
                        name: userName,
                        oldTotal: currentTotal,
                        newTotal: finalTotal,
                        diff: finalTotal - currentTotal,
                        level: finalLevel,
                        tasksCompleted: stats.tasks_completed,
                        achievementsTotal: achData.unlocked.length,
                        newAchievements: newAchievements.length
                    });

                    if (finalTotal !== currentTotal) {
                        console.log(`  👤 ${userName}: ${currentTotal} → ${finalTotal} pts (${finalTotal - currentTotal >= 0 ? '+' : ''}${finalTotal - currentTotal}) | Nível ${finalLevel} | ${achData.unlocked.length} conquistas`);
                    }
                }

                report.users++;

            } catch (err) {
                console.error(`  ❌ Erro: ${userName}:`, err);
                report.errors.push({ user: userName, error: err.message });
            }
        }

        // ═══════════════════════════════════════════
        // RELATÓRIO FINAL
        // ═══════════════════════════════════════════
        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║              RELATÓRIO FINAL                     ║');
        console.log('╚══════════════════════════════════════════════════╝');
        console.log(`👥 Usuários processados:         ${report.users}`);
        console.log(`📋 Transações Kanban criadas:    ${report.kanbanTxCreated}`);
        console.log(`📋 Transações Kanban existentes: ${report.kanbanTxSkipped}`);
        console.log(`🏆 Conquistas desbloqueadas:     ${report.achievementsUnlocked}`);
        console.log(`🏆 Transações conquista criadas:  ${report.achievementTxCreated}`);
        console.log(`🔄 Usuários com pontos corrigidos: ${report.pointsCorrected}`);
        if (report.errors.length > 0) {
            console.warn(`⚠️  Erros: ${report.errors.length}`);
            report.errors.forEach(e => console.warn(`   - ${e.user}: ${e.error}`));
        }

        // Top 10 com diferença
        const changed = report.userDetails
            .filter(u => u.diff !== 0)
            .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

        if (changed.length > 0) {
            console.log('\n📊 USUÁRIOS COM PONTOS CORRIGIDOS:');
            changed.forEach(u => {
                console.log(`  ${u.name}: ${u.oldTotal} → ${u.newTotal} (${u.diff >= 0 ? '+' : ''}${u.diff} pts) | Nível ${u.level}`);
            });
        }

        // Ranking final
        const ranking = report.userDetails
            .sort((a, b) => b.newTotal - a.newTotal)
            .slice(0, 15);

        if (ranking.length > 0) {
            console.log('\n🏅 RANKING ATUALIZADO (Top 15):');
            ranking.forEach((u, i) => {
                console.log(`  ${i + 1}. ${u.name}: ${u.newTotal} pts (Nível ${u.level}) | ${u.achievementsTotal} conquistas`);
            });
        }

        alert(
            `✅ RECONCILIAÇÃO V4 CONCLUÍDA!\n\n` +
            `Usuários: ${report.users}\n` +
            `Transações Kanban criadas: ${report.kanbanTxCreated}\n` +
            `Conquistas desbloqueadas: ${report.achievementsUnlocked}\n` +
            `Transações conquista: ${report.achievementTxCreated}\n` +
            `Pontos corrigidos: ${report.pointsCorrected} usuários\n` +
            `${report.errors.length > 0 ? `Erros: ${report.errors.length}\n` : ''}` +
            `\nRecarregue (F5) para ver o Ranking atualizado.`
        );

        return report;

    } catch (error) {
        console.error('❌ ERRO FATAL:', error);
        alert('Erro na reconciliação: ' + error.message);
        return null;
    }
}

// Expor globalmente
window.runFullReconciliation = runFullReconciliation;

console.log('✅ [Reconciliação V4] Carregado. Execute: await runFullReconciliation()');
