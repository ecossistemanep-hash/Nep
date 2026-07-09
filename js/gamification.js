/**
 * NEXUS GAMIFICATION SERVICE
 * Sistema de Pontos, Níveis e Ranking
 */

const NexusGamification = {
    SECTION_POINTS: 'user_points',
    SECTION_TRANSACTIONS: 'points_transactions',

    // Configuração de Pontos
    POINTS_RULES: {
        SEND_TESTIMONIAL: 10,  // Enviar elogio
        RECEIVE_TESTIMONIAL: 50, // Receber elogio
        COMPLETE_TASK: 20,      // Tarefa Kanban
        LOGIN_STREAK: 5         // Login diário (futuro)
    },

    // Cálculo de Nível (Sincronizado com PointsService)
    calculateLevel(points) {
        if (!points) return 1;
        if (points < 50) return 1;
        if (points < 150) return 2;
        if (points < 300) return 3;
        if (points < 500) return 4;
        if (points < 800) return 5;
        if (points < 1200) return 6;
        if (points < 1700) return 7;
        if (points < 2500) return 8;
        if (points < 3500) return 9;
        return 10;
    },

    getNextLevelPoints(currentLevel) {
        return Math.pow(currentLevel + 1, 2) * 100;
    },

    /**
     * Adicionar pontos a um usuário
     * @param {string} uid ID do usuário
     * @param {number} amount Quantidade de pontos
     * @param {string} type Tipo de transação (ex: 'SEND_TESTIMONIAL')
     * @param {string} description Descrição para o histórico
     */
    async addPoints(uid, amount, type, description) {
        if (!uid) {
            console.warn('[Gamification] UID não fornecido!');
            return;
        }

        // Validação: UID deve parecer um ID real (não um nome de pessoa)
        if (uid.includes(' ') || uid.length > 128) {
            console.error('[Gamification] ❌ UID inválido (parece ser um nome, não um ID):', uid);
            return;
        }

        const db = window.db;
        if (!db) {
            console.error('[Gamificacao] DB não disponível');
            return;
        }

        try {
            const userRef = db.collection(this.SECTION_POINTS).doc(uid);

            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(userRef);
                let currentPoints = 0;
                let currentName = 'Usuário'; // Fallback name

                if (doc.exists) {
                    currentPoints = doc.data().total_points || 0;
                    currentName = doc.data().name || currentName;
                } else {
                    // Se não existe doc de pontos, tenta pegar nome do perfil de usuário
                    const userProfile = await transaction.get(db.collection('users').doc(uid));
                    if (userProfile.exists) {
                        currentName = userProfile.data().nome;
                    }
                }

                const newPoints = currentPoints + amount;
                const newLevel = this.calculateLevel(newPoints);
                const oldLevel = this.calculateLevel(currentPoints);

                // Atualizar Saldo
                transaction.set(userRef, {
                    uid: uid,
                    name: currentName,
                    total_points: newPoints,
                    level: newLevel,
                    last_updated: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // Registrar Transação (campos compatíveis com PointsService)
                const transRef = db.collection(this.SECTION_TRANSACTIONS).doc();
                transaction.set(transRef, {
                    uid: uid,
                    amount: amount,
                    points: amount,
                    type: type,
                    action_type: type,
                    action_label: description,
                    description: description,
                    balance_after: newPoints,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    created_at: firebase.firestore.FieldValue.serverTimestamp()
                });



                // Verificar Level Up
                if (newLevel > oldLevel) {

                    // Poderíamos disparar notificação de Level Up aqui
                    this.notifyLevelUp(uid, newLevel);
                }
            });

            console.log(`[Gamificacao] ✅ +${amount} pts para ${uid} (${type})`);

            // Mostrar toast se disponível
            if (window.NepApp && window.NepApp.showToast) {
                window.NepApp.showToast(`+${amount} pontos! 🚀`, 'success');
            } else if (window.showToast) {
                window.showToast(`+${amount} pontos! 🚀`, 'success');
            }

        } catch (error) {
            console.error('[Gamificacao] ❌ Erro ao adicionar pontos:', error);
            console.error('[Gamificacao] Stack:', error.stack);
        }
    },

    notifyLevelUp(uid, newLevel) {
        // Notificação de sistema para o próprio usuário
        if (!window.db) return;
        window.db.collection('notifications').add({
            titulo: 'Level Up! 🎉',
            mensagem: `Parabéns! Você alcançou o Nível ${newLevel}!`,
            destinatario_uid: uid,
            lida: false,
            data: firebase.firestore.FieldValue.serverTimestamp(),
            tipo: 'gamification', // Icone troféu
            referencia_tipo: 'profile'
        });
    },

    /**
     * Buscar Ranking (Top X)
     */
    async getLeaderboard(limit = 10) {
        if (!window.db) return [];
        try {
            const snapshot = await window.db.collection(this.SECTION_POINTS)
                .orderBy('total_points', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map((doc, index) => ({
                rank: index + 1,
                ...doc.data()
            }));
        } catch (e) {
            console.error('[Gamificacao] Erro leaderboard:', e);
            return [];
        }
    },

    /**
     * Renderizar Página de Ranking
     */
    async renderRanking(container) {
        container.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-trophy fa-spin"></i> Carregando Ranking...</div>';

        const leaderboard = await this.getLeaderboard(20);
        const currentUser = NepAuth.getUser();

        let userRankHtml = '';
        if (currentUser) {
            // Tentar achar usuário na lista ou buscar avulso se não estiver no top 20
            // Para simplificar, mostramos apenas se estiver no top ou buscamos saldo dele
            const myStatsSpec = leaderboard.find(u => u.uid === currentUser.uid);
            // Se não estiver no top, precisaríamos buscar separado. MVP: Mostra se estiver no top.
        }

        container.innerHTML = `
            <div class="ranking-page animate-fade-in" style="padding: 2rem; max-width: 1000px; margin: 0 auto;">
                <div class="ranking-header" style="text-align: center; margin-bottom: 3rem;">
                    <h1 style="font-family: 'Orbitron', sans-serif; font-size: 2.5rem; color: #fbbf24; text-shadow: 0 0 20px rgba(251, 191, 36, 0.3);">
                        <i class="fa-solid fa-trophy"></i> Ranking NEP
                    </h1>
                    <p style="color: var(--text-secondary);">Os heróis da produtividade e colaboração</p>
                </div>

                <!-- PODIUM (Top 3) -->
                ${this.renderPodium(leaderboard.slice(0, 3))}

                <!-- LISTA (Restante) -->
                <div class="ranking-list" style="background: var(--bg-card); border-radius: 16px; padding: 1rem; border: 1px solid var(--border-dim);">
                    ${leaderboard.slice(3).map(user => `
                        <div class="ranking-item animate-slide-up" style="display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border-dim);">
                            <div class="rank-number" style="width: 40px; font-weight: bold; color: var(--text-secondary); font-size: 1.2rem;">#${user.rank}</div>
                            <div class="rank-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-primary); display: flex; align-items: center; justify-content: center; margin-right: 1rem; border: 2px solid var(--border-dim);">
                                ${user.name ? user.name.charAt(0) : '?'}
                            </div>
                            <div class="rank-info" style="flex: 1;">
                                <div class="rank-name" style="font-weight: 600; color: var(--text-primary);">${user.name}</div>
                                <div class="rank-level" style="font-size: 0.8rem; color: var(--text-tertiary);">Nível ${user.level || 0}</div>
                            </div>
                            <div class="rank-points" style="font-family: 'Orbitron'; color: #fbbf24; font-size: 1.1rem;">
                                ${user.total_points || 0} pts
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderPodium(top3) {
        if (top3.length === 0) return '';

        const positions = [
            { place: 2, class: 'silver', height: '140px', color: '#94a3b8' }, // 2nd place left
            { place: 1, class: 'gold', height: '180px', color: '#fbbf24' },   // 1st place center
            { place: 3, class: 'bronze', height: '120px', color: '#b45309' }  // 3rd place right
        ];

        // Mapear dados para posições (certificando que existem dados suficientes)
        const podiumData = [
            top3[1] || null, // 2nd
            top3[0] || null, // 1st
            top3[2] || null  // 3rd
        ];

        return `
            <div class="podium-container" style="display: flex; justify-content: center; align-items: flex-end; gap: 1rem; margin-bottom: 3rem; height: 260px;">
                ${podiumData.map((user, idx) => {
            const style = positions[idx];
            if (!user) return `<div style="width: 100px;"></div>`; // Placeholder vazio

            return `
                        <div class="podium-item animate-slide-up" style="display: flex; flex-direction: column; align-items: center; width: 120px;">
                            <div class="podium-avatar" style="
                                width: 60px; height: 60px; border-radius: 50%; 
                                background: var(--bg-card); border: 3px solid ${style.color};
                                display: flex; align-items: center; justify-content: center;
                                font-weight: bold; font-size: 1.2rem; background-image: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,0,0,0.2));
                                margin-bottom: 10px; position: relative;
                            ">
                                ${user.name.charAt(0)}
                                <div class="podium-badge" style="
                                    position: absolute; bottom: -10px; background: ${style.color}; color: #000;
                                    width: 24px; height: 24px; border-radius: 50%; font-size: 0.8rem;
                                    display: flex; align-items: center; justify-content: center; font-weight: bold;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                                ">${style.place}</div>
                            </div>
                            <div class="podium-name" style="font-size: 0.9rem; font-weight: 600; margin-bottom: 5px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${user.name.split(' ')[0]}</div>
                            <div class="podium-block" style="
                                width: 100%; height: ${style.height}; 
                                background: linear-gradient(to bottom, ${style.color}cc, ${style.color}33);
                                border-top-left-radius: 8px; border-top-right-radius: 8px;
                                border: 1px solid ${style.color}; border-bottom: none;
                                display: flex; align-items: flex-start; justify-content: center; padding-top: 10px;
                                font-family: 'Orbitron'; font-weight: bold; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                            ">
                                ${user.total_points}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    // ==========================================
    // HELPERS PARA PERFIL (Compatibilidade)
    // ==========================================

    async getUserPoints(uid) {
        if (!uid || !window.db) return { total_points: 0, level: 1 };
        try {
            const doc = await window.db.collection(this.SECTION_POINTS).doc(uid).get();
            if (doc.exists) return doc.data();
            return { total_points: 0, level: 1 };
        } catch (e) {
            console.error(e);
            return { total_points: 0, level: 1 };
        }
    },

    async getUserTransactions(uid, limit = 10) {
        if (!uid || !window.db) return [];
        try {
            const snap = await window.db.collection(this.SECTION_TRANSACTIONS)
                .where('uid', '==', uid)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snap.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    points: data.amount, // Adaptador de nome
                    action_label: data.description,
                    created_at: data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString('pt-BR') : 'Hoje'
                };
            });
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    getLevelBadge(level) {
        const badges = {
            1: { name: 'Iniciante', color: '#6b7280', icon: '🌱' },
            2: { name: 'Aprendiz', color: '#22c55e', icon: '📚' },
            3: { name: 'Praticante', color: '#3b82f6', icon: '⚡' },
            4: { name: 'Especialista', color: '#8b5cf6', icon: '🎯' },
            5: { name: 'Veterano', color: '#f59e0b', icon: '🏆' },
            6: { name: 'Mestre', color: '#ef4444', icon: '👑' },
            7: { name: 'Grandmestre', color: '#ec4899', icon: '💎' },
            8: { name: 'Lenda', color: '#06b6d4', icon: '✨' },
            9: { name: 'Mítico', color: '#d946ef', icon: '🌟' },
            10: { name: 'Supremo', color: '#ffd700', icon: '🔥' }
        };
        return badges[level] || badges[1];
    },

    getNextLevelInfo(points) {
        const thresholds = [0, 50, 150, 300, 500, 800, 1200, 1700, 2500, 3500, Infinity];
        const currentLevel = this.calculateLevel(points);

        if (currentLevel >= 10) {
            return { nextLevel: 10, pointsNeeded: 0, remaining: 0, progress: 100 };
        }

        const nextThreshold = thresholds[currentLevel];
        const prevThreshold = thresholds[currentLevel - 1];
        const pointsInLevel = points - prevThreshold;
        const pointsForLevel = nextThreshold - prevThreshold;
        const progress = Math.round((pointsInLevel / pointsForLevel) * 100);

        return {
            nextLevel: currentLevel + 1,
            pointsNeeded: nextThreshold - points,
            remaining: nextThreshold - points,
            progress: Math.min(100, Math.max(0, progress))
        };
    }
};

window.NexusGamification = NexusGamification;
// Alias para compatibilidade com Profile anterior se houver
// Alias removido para evitar conflito com points-service.js original
// window.PointsService = NexusGamification;
