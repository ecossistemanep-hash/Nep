/**
 * NEP DELIVERY CONTROL - ACHIEVEMENTS v2.0
 * Sistema de 44 Conquistas com Firebase
 * Categorias: Kanban, Fórum, Social, Streak, Pontos, Explorador, Gestão, Ranking
 */

const NexusAchievements = {
    COLLECTION: 'achievements',
    USER_ACHIEVEMENTS_COLLECTION: 'user_achievements',

    // ==========================================
    // 50 CONQUISTAS
    // ==========================================
    ACHIEVEMENTS: {
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 📋 KANBAN (8 conquistas)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        'first_task': {
            icon: '🎯', name: 'Primeiro Passo',
            description: 'Completar sua primeira demanda no Kanban',
            category: 'kanban', condition: { type: 'tasks_completed', value: 1 },
            points: 10, rarity: 'comum'
        },
        'task_5': {
            icon: '📋', name: 'Executor',
            description: 'Completar 5 demandas',
            category: 'kanban', condition: { type: 'tasks_completed', value: 5 },
            points: 20, rarity: 'comum'
        },
        'task_25': {
            icon: '⚙️', name: 'Máquina de Demandas',
            description: 'Completar 25 demandas',
            category: 'kanban', condition: { type: 'tasks_completed', value: 25 },
            points: 40, rarity: 'raro'
        },
        'task_100': {
            icon: '🏛️', name: 'Centurião',
            description: 'Completar 100 demandas',
            category: 'kanban', condition: { type: 'tasks_completed', value: 100 },
            points: 80, rarity: 'épico'
        },
        'task_creator': {
            icon: '📝', name: 'Criador Nato',
            description: 'Criar 50 demandas no sistema',
            category: 'kanban', condition: { type: 'tasks_created', value: 50 },
            points: 30, rarity: 'incomum'
        },
        'on_time_champion': {
            icon: '⏰', name: 'Pontualidade',
            description: 'Entregar 10 tarefas dentro do prazo',
            category: 'kanban', condition: { type: 'on_time_deliveries', value: 10 },
            points: 35, rarity: 'incomum'
        },
        'speed_demon': {
            icon: '⚡', name: 'Relâmpago',
            description: 'Entregar uma tarefa em menos de 24 horas',
            category: 'kanban', condition: { type: 'fast_delivery', value: 1 },
            points: 25, rarity: 'incomum'
        },
        'validator': {
            icon: '✅', name: 'Validador',
            description: 'Validar 25 entregas como gestor',
            category: 'kanban', condition: { type: 'validations', value: 25 },
            points: 50, rarity: 'raro'
        },



        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 💬 FÓRUM (6 conquistas)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        'first_topic': {
            icon: '💬', name: 'Comunicador',
            description: 'Criar seu primeiro tópico no fórum',
            category: 'forum', condition: { type: 'forum_topics', value: 1 },
            points: 10, rarity: 'comum'
        },
        'topic_10': {
            icon: '📢', name: 'Debatedor',
            description: 'Criar 10 tópicos no fórum',
            category: 'forum', condition: { type: 'forum_topics', value: 10 },
            points: 30, rarity: 'incomum'
        },
        'topic_50': {
            icon: '📣', name: 'Influencer',
            description: 'Criar 50 tópicos no fórum',
            category: 'forum', condition: { type: 'forum_topics', value: 50 },
            points: 60, rarity: 'épico'
        },
        'first_solution': {
            icon: '💡', name: 'Solucionador',
            description: 'Ter uma resposta marcada como solução',
            category: 'forum', condition: { type: 'forum_solutions', value: 1 },
            points: 20, rarity: 'incomum'
        },
        'solution_5': {
            icon: '🧩', name: 'Guru do Fórum',
            description: 'Ter 5 respostas marcadas como solução',
            category: 'forum', condition: { type: 'forum_solutions', value: 5 },
            points: 50, rarity: 'raro'
        },
        'reply_100': {
            icon: '📚', name: 'Enciclopédia',
            description: 'Escrever 100 respostas no fórum',
            category: 'forum', condition: { type: 'forum_replies', value: 100 },
            points: 70, rarity: 'épico'
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ❤️ SOCIAL (5 conquistas)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        'first_testimonial': {
            icon: '❤️', name: 'Colega Legal',
            description: 'Enviar seu primeiro depoimento',
            category: 'social', condition: { type: 'testimonials_sent', value: 1 },
            points: 10, rarity: 'comum'
        },
        'testimonial_received': {
            icon: '🌟', name: 'Popular',
            description: 'Receber seu primeiro depoimento',
            category: 'social', condition: { type: 'testimonials_received', value: 1 },
            points: 15, rarity: 'comum'
        },
        'testimonial_5_received': {
            icon: '🤩', name: 'Celebridade',
            description: 'Receber 5 depoimentos',
            category: 'social', condition: { type: 'testimonials_received', value: 5 },
            points: 40, rarity: 'raro'
        },
        'testimonial_10_sent': {
            icon: '💌', name: 'Motivador',
            description: 'Enviar 10 depoimentos para colegas',
            category: 'social', condition: { type: 'testimonials_sent', value: 10 },
            points: 35, rarity: 'incomum'
        },
        'testimonial_25_received': {
            icon: '👏', name: 'Influenciador Social',
            description: 'Receber 25 depoimentos',
            category: 'social', condition: { type: 'testimonials_received', value: 25 },
            points: 80, rarity: 'épico'
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 🔥 STREAK (5 conquistas)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        'streak_3': {
            icon: '🔥', name: 'Aquecendo',
            description: 'Manter um streak de 3 dias consecutivos',
            category: 'streak', condition: { type: 'streak', value: 3 },
            points: 15, rarity: 'comum'
        },
        'streak_7': {
            icon: '🔥🔥', name: 'Semana de Fogo',
            description: 'Manter um streak de 7 dias consecutivos',
            category: 'streak', condition: { type: 'streak', value: 7 },
            points: 35, rarity: 'incomum'
        },
        'streak_15': {
            icon: '🌋', name: 'Quinzenista',
            description: 'Manter um streak de 15 dias consecutivos',
            category: 'streak', condition: { type: 'streak', value: 15 },
            points: 60, rarity: 'raro'
        },
        'streak_30': {
            icon: '🔥🔥🔥', name: 'Mês Insano',
            description: 'Manter um streak de 30 dias consecutivos',
            category: 'streak', condition: { type: 'streak', value: 30 },
            points: 100, rarity: 'lendário'
        },
        'comeback_king': {
            icon: '👑', name: 'Rei do Retorno',
            description: 'Recuperar um streak perdido',
            category: 'streak', condition: { type: 'streak_recovered', value: 1 },
            points: 20, rarity: 'incomum'
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 🏆 PONTOS & NÍVEIS (6 conquistas)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        'points_100': {
            icon: '💯', name: 'Centenário',
            description: 'Alcançar 100 pontos',
            category: 'pontos', condition: { type: 'total_points', value: 100 },
            points: 10, rarity: 'comum'
        },
        'points_500': {
            icon: '🥈', name: 'Quinhentos',
            description: 'Alcançar 500 pontos',
            category: 'pontos', condition: { type: 'total_points', value: 500 },
            points: 25, rarity: 'incomum'
        },
        'points_1000': {
            icon: '🥇', name: 'Milhar',
            description: 'Alcançar 1.000 pontos',
            category: 'pontos', condition: { type: 'total_points', value: 1000 },
            points: 50, rarity: 'raro'
        },
        'points_2500': {
            icon: '💎', name: 'Veterano',
            description: 'Alcançar 2.500 pontos',
            category: 'pontos', condition: { type: 'total_points', value: 2500 },
            points: 75, rarity: 'épico'
        },
        'points_5000': {
            icon: '🌟', name: 'Lendário',
            description: 'Alcançar 5.000 pontos',
            category: 'pontos', condition: { type: 'total_points', value: 5000 },
            points: 100, rarity: 'lendário'
        },
        'points_10000': {
            icon: '🌌', name: 'Transcendente',
            description: 'Alcançar 10.000 pontos',
            category: 'pontos', condition: { type: 'total_points', value: 10000 },
            points: 150, rarity: 'lendário'
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 🔍 EXPLORADOR (6 conquistas)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        'explorer_3': {
            icon: '🔍', name: 'Curioso',
            description: 'Acessar 3 módulos diferentes',
            category: 'explorador', condition: { type: 'modules_visited', value: 3 },
            points: 10, rarity: 'comum'
        },
        'explorer_5': {
            icon: '🗺️', name: 'Aventureiro',
            description: 'Acessar 5 módulos diferentes',
            category: 'explorador', condition: { type: 'modules_visited', value: 5 },
            points: 20, rarity: 'comum'
        },
        'explorer_8': {
            icon: '🧭', name: 'Desbravador',
            description: 'Acessar 8 módulos diferentes',
            category: 'explorador', condition: { type: 'modules_visited', value: 8 },
            points: 35, rarity: 'incomum'
        },
        'explorer_all': {
            icon: '🌍', name: 'Explorador Master',
            description: 'Acessar todos os 10+ módulos do sistema',
            category: 'explorador', condition: { type: 'modules_visited', value: 10 },
            points: 60, rarity: 'raro'
        },
        'tool_user': {
            icon: '🔧', name: 'Multitarefa',
            description: 'Usar 5 ferramentas diferentes',
            category: 'explorador', condition: { type: 'tools_used', value: 5 },
            points: 25, rarity: 'incomum'
        },
        'tool_master': {
            icon: '🛠️', name: 'Super Ferramenteiro',
            description: 'Usar 15 ferramentas diferentes',
            category: 'explorador', condition: { type: 'tools_used', value: 15 },
            points: 60, rarity: 'épico'
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 📊 GESTÃO (5 conquistas)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        'report_5': {
            icon: '📝', name: 'Disciplinado',
            description: 'Enviar 5 relatórios',
            category: 'gestao', condition: { type: 'reports_sent', value: 5 },
            points: 25, rarity: 'incomum'
        },
        'report_20': {
            icon: '📊', name: 'Relatador Profissional',
            description: 'Enviar 20 relatórios',
            category: 'gestao', condition: { type: 'reports_sent', value: 20 },
            points: 50, rarity: 'raro'
        },
        'routine_10': {
            icon: '📅', name: 'Rotineiro',
            description: 'Completar 10 checklists diários',
            category: 'gestao', condition: { type: 'routines_completed', value: 10 },
            points: 30, rarity: 'incomum'
        },
        'routine_30': {
            icon: '🗓️', name: 'Rotineiro Master',
            description: 'Completar 30 checklists diários',
            category: 'gestao', condition: { type: 'routines_completed', value: 30 },
            points: 60, rarity: 'raro'
        },
        'event_creator': {
            icon: '📌', name: 'Organizador',
            description: 'Criar 5 eventos na agenda',
            category: 'gestao', condition: { type: 'events_created', value: 5 },
            points: 20, rarity: 'incomum'
        },

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 👑 RANKING (3 conquistas)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        'top_10': {
            icon: '🏅', name: 'Top 10',
            description: 'Entrar no Top 10 do ranking',
            category: 'ranking', condition: { type: 'best_rank', value: 10, operator: '<=' },
            points: 30, rarity: 'incomum'
        },
        'top_3': {
            icon: '🥉', name: 'Pódio',
            description: 'Entrar no Top 3 do ranking',
            category: 'ranking', condition: { type: 'best_rank', value: 3, operator: '<=' },
            points: 60, rarity: 'raro'
        },
        'champion': {
            icon: '🥇', name: 'Campeão',
            description: 'Ser o #1 do ranking',
            category: 'ranking', condition: { type: 'best_rank', value: 1, operator: '==' },
            points: 100, rarity: 'épico'
        }
    },

    // ==========================================
    // CATEGORIAS (para UI)
    // ==========================================
    CATEGORIES: {
        kanban: { name: 'Kanban', icon: '📋', color: '#3B82F6' },
        forum: { name: 'Fórum', icon: '💬', color: '#10B981' },
        social: { name: 'Social', icon: '❤️', color: '#EC4899' },
        streak: { name: 'Streak', icon: '🔥', color: '#F97316' },
        pontos: { name: 'Pontos & Níveis', icon: '🏆', color: '#F59E0B' },
        explorador: { name: 'Explorador', icon: '🔍', color: '#06B6D4' },
        gestao: { name: 'Gestão', icon: '📊', color: '#7555e8' },
        ranking: { name: 'Ranking', icon: '👑', color: '#EF4444' }
    },

    // Ligas Semanais
    LEAGUES: [
        { id: 'bronze', name: 'Bronze', icon: '🥉', color: '#CD7F32', minPoints: 0 },
        { id: 'silver', name: 'Prata', icon: '🥈', color: '#C0C0C0', minPoints: 500 },
        { id: 'gold', name: 'Ouro', icon: '🥇', color: '#FFD700', minPoints: 1500 },
        { id: 'platinum', name: 'Platina', icon: '💎', color: '#E5E4E2', minPoints: 3500 },
        { id: 'diamond', name: 'Diamante', icon: '💠', color: '#B9F2FF', minPoints: 7000 },
        { id: 'master', name: 'Mestre', icon: '👑', color: '#9B59B6', minPoints: 15000 }
    ],

    // Cores por raridade
    RARITY_COLORS: {
        'comum': '#9CA3AF',
        'incomum': '#10B981',
        'raro': '#3B82F6',
        'épico': '#9c5cff',
        'lendário': '#F59E0B'
    },

    db: null,

    init() {
        this.db = window.db || (window.firebase?.firestore?.());
        console.log(`[Achievements] Inicializado com ${Object.keys(this.ACHIEVEMENTS).length} conquistas`);
    },

    // ==========================================
    // DADOS DO USUÁRIO
    // ==========================================

    // Stats iniciais padrão
    getDefaultStats() {
        return {
            tasks_created: 0,
            tasks_completed: 0,
            on_time_deliveries: 0,
            late_deliveries: 0,
            validations: 0,
            fast_delivery: 0,
            podcasts_listened: 0,
            forum_topics: 0,
            forum_replies: 0,
            forum_solutions: 0,
            testimonials_sent: 0,
            testimonials_received: 0,
            routines_completed: 0,
            reports_sent: 0,
            modules_visited: 0,
            tools_used: 0,
            events_created: 0,
            total_points: 0,
            streak: 0,
            best_streak: 0,
            streak_recovered: 0,
            best_rank: 999
        };
    },

    // Obter conquistas do usuário
    async getUserAchievements(uid) {
        if (!this.db || !uid) return { unlocked: [], stats: this.getDefaultStats() };

        try {
            const doc = await this.db.collection(this.USER_ACHIEVEMENTS_COLLECTION).doc(uid).get();
            if (doc.exists) {
                const data = doc.data();
                // Merge com defaults para garantir que novas stats existam
                data.stats = { ...this.getDefaultStats(), ...(data.stats || {}) };
                return data;
            }
            // Criar documento inicial
            const initial = {
                unlocked: [],
                stats: this.getDefaultStats(),
                streak_freeze: 1,
                last_activity: null,
                league: 'bronze'
            };
            await this.db.collection(this.USER_ACHIEVEMENTS_COLLECTION).doc(uid).set(initial);
            return initial;
        } catch (e) {
            console.error('[Achievements] Erro ao buscar:', e);
            return { unlocked: [], stats: this.getDefaultStats() };
        }
    },

    // ==========================================
    // INCREMENTAR STATS
    // ==========================================

    async incrementStat(uid, statType, amount = 1) {
        if (!this.db || !uid) return [];

        try {
            const userRef = this.db.collection(this.USER_ACHIEVEMENTS_COLLECTION).doc(uid);
            const doc = await userRef.get();

            let data = doc.exists ? doc.data() : await this.getUserAchievements(uid);
            // Merge com defaults
            data.stats = { ...this.getDefaultStats(), ...(data.stats || {}) };

            // Incrementar stat
            data.stats[statType] = (data.stats[statType] || 0) + amount;
            data.last_activity = new Date().toISOString();

            // Sincronizar total_points diretamente do Firestore (sem cache)
            // Evita usar PointsService que tem cache de 30s e pode retornar valor defasado
            if (window.db) {
                try {
                    const pointsDoc = await window.db.collection('user_points').doc(uid).get();
                    if (pointsDoc.exists) {
                        data.stats.total_points = pointsDoc.data().total_points || 0;
                    }
                } catch (e) { /* silently ignore */ }
            } else if (window.PointsService) {
                // Fallback para PointsService se window.db não estiver disponível
                try {
                    const pointsData = await window.PointsService.getUserPoints(uid);
                    data.stats.total_points = pointsData?.total_points || 0;
                } catch (e) { /* silently ignore */ }
            }

            // Verificar conquistas
            const newAchievements = this._checkAchievements(data);

            // Salvar
            await userRef.set(data, { merge: true });

            // Notificar e dar pontos para novas conquistas
            for (const ach of newAchievements) {
                if (window.NexusGamification) {
                    await window.NexusGamification.addPoints(uid, ach.points, 'ACHIEVEMENT', `🏆 ${ach.name}`);
                }
                if (window.NexusNotifications) {
                    await window.NexusNotifications.add({
                        tipo: 'sistema',
                        titulo: '🏆 Conquista Desbloqueada!',
                        mensagem: `${ach.icon} ${ach.name}: ${ach.description}`,
                        destinatario_uid: uid
                    });
                }
                // Mostrar modal celebratório
                this.showAchievementUnlockedModal(ach);
            }

            return newAchievements;
        } catch (e) {
            console.error('[Achievements] Erro ao incrementar:', e);
            return [];
        }
    },

    // Checar todas as conquistas e retornar as novas desbloqueadas
    _checkAchievements(data) {
        const newAchievements = [];

        for (const [key, achievement] of Object.entries(this.ACHIEVEMENTS)) {
            if (data.unlocked.includes(key)) continue;

            const { type, value, operator } = achievement.condition;
            const currentValue = data.stats[type] || 0;

            let unlocked = false;
            if (operator === '<=') unlocked = currentValue <= value;
            else if (operator === '==') unlocked = currentValue === value;
            else unlocked = currentValue >= value;

            if (unlocked) {
                data.unlocked.push(key);
                newAchievements.push({ key, ...achievement });
                console.log(`[Achievements] 🏆 Desbloqueado: ${achievement.name}`);
            }
        }

        return newAchievements;
    },

    // ==========================================
    // STREAK
    // ==========================================

    async updateStreak(uid) {
        if (!this.db || !uid) return { streak: 0, frozen: false };

        try {
            const userRef = this.db.collection(this.USER_ACHIEVEMENTS_COLLECTION).doc(uid);
            const doc = await userRef.get();
            let data = doc.exists ? doc.data() : await this.getUserAchievements(uid);
            data.stats = { ...this.getDefaultStats(), ...(data.stats || {}) };

            const today = new Date().toISOString().split('T')[0];
            const lastActivity = data.last_activity?.split('T')[0];

            if (lastActivity === today) {
                return { streak: data.stats.streak, frozen: false };
            }

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastActivity === yesterdayStr) {
                data.stats.streak++;
                if (data.stats.streak > data.stats.best_streak) {
                    data.stats.best_streak = data.stats.streak;
                }
            } else if (lastActivity) {
                if (data.streak_freeze > 0) {
                    data.streak_freeze--;
                } else {
                    const oldStreak = data.stats.streak;
                    data.stats.streak = 1;
                    if (oldStreak > 3) {
                        data.stats.streak_recovered = (data.stats.streak_recovered || 0) + 1;
                    }
                }
            } else {
                data.stats.streak = 1;
            }

            data.last_activity = new Date().toISOString();
            await userRef.set(data, { merge: true });

            // Verificar conquistas de streak
            await this.incrementStat(uid, 'streak', 0);

            return { streak: data.stats.streak, frozen: data.streak_freeze === 0 };
        } catch (e) {
            console.error('[Achievements] Erro ao atualizar streak:', e);
            return { streak: 0, frozen: false };
        }
    },

    // ==========================================
    // RETROATIVIDADE - Calcula stats de dados históricos
    // ==========================================

    async calculateRetroactiveStats(uid) {
        if (!this.db || !uid) return;

        console.log(`[Achievements] 🔄 Calculando conquistas retroativas para ${uid}...`);

        try {
            const stats = this.getDefaultStats();

            // 1. Contar transações de pontos existentes
            const txSnap = await this.db.collection('points_transactions')
                .where('uid', '==', uid).get();

            txSnap.forEach(doc => {
                const tx = doc.data();
                const type = tx.type || tx.action_type || '';
                switch (type) {
                    case 'TASK_COMPLETED': stats.tasks_completed++; break;
                    case 'TASK_CREATED': stats.tasks_created++; break;
                    case 'SEND_TESTIMONIAL': stats.testimonials_sent++; break;
                    case 'RECEIVE_TESTIMONIAL': stats.testimonials_received++; break;
                    case 'FORUM_TOPIC': stats.forum_topics++; break;
                    case 'FORUM_REPLY': stats.forum_replies++; break;
                    case 'FORUM_SOLUTION': stats.forum_solutions++; break;
                    case 'COURSE_COMPLETED': stats.courses_completed++; break;
                    case 'LESSON_COMPLETED': stats.lessons_completed++; break;
                    case 'PODCAST_EPISODE': stats.podcasts_listened++; break;
                    case 'ROUTINE_COMPLETED': stats.routines_completed++; break;
                    case 'REPORT_SENT': stats.reports_sent++; break;
                }
            });

            // 2. Buscar total de pontos atual
            const pointsDoc = await this.db.collection('user_points').doc(uid).get();
            if (pointsDoc.exists) {
                stats.total_points = pointsDoc.data().total_points || 0;
            }

            // 3. Contar tarefas concluídas (backup via collection tasks)
            try {
                const tasksSnap = await this.db.collection('tasks')
                    .where('owner', '==', localStorage.getItem('nep_user_name'))
                    .where('status', '==', 'done').get();
                const taskCount = tasksSnap.size;
                if (taskCount > stats.tasks_completed) {
                    stats.tasks_completed = taskCount;
                }
            } catch (e) { /* pode não ter permissão, ok */ }

            // 4. Merge com dados existentes (não sobrescrever stats maiores)
            const userRef = this.db.collection(this.USER_ACHIEVEMENTS_COLLECTION).doc(uid);
            const existingDoc = await userRef.get();
            let data = existingDoc.exists ? existingDoc.data() : { unlocked: [], stats: {}, streak_freeze: 1, league: 'bronze' };
            data.stats = { ...this.getDefaultStats(), ...(data.stats || {}) };

            // Usar o maior valor entre existente e calculado
            for (const key of Object.keys(stats)) {
                data.stats[key] = Math.max(data.stats[key] || 0, stats[key]);
            }

            // 5. Checar conquistas
            const newAchievements = this._checkAchievements(data);

            // 6. Salvar
            data.last_activity = data.last_activity || new Date().toISOString();
            await userRef.set(data, { merge: true });

            console.log(`[Achievements] ✅ Retroativo: ${Object.keys(stats).filter(k => stats[k] > 0).length} stats, ${newAchievements.length} novas conquistas`);
            return { stats: data.stats, newAchievements };
        } catch (e) {
            console.error('[Achievements] Erro retroativo:', e);
        }
    },

    // ==========================================
    // HELPERS
    // ==========================================

    getLeague(totalPoints) {
        let currentLeague = this.LEAGUES[0];
        for (const league of this.LEAGUES) {
            if (totalPoints >= league.minPoints) {
                currentLeague = league;
            }
        }
        return currentLeague;
    },

    getDailyChallenge() {
        const challenges = [
            { type: 'tasks', target: 2, description: 'Entregue 2 demandas hoje', bonus: 20 },
            { type: 'courses', target: 1, description: 'Complete 1 aula de curso', bonus: 15 },
            { type: 'forum', target: 1, description: 'Participe do fórum', bonus: 10 },
            { type: 'tasks', target: 3, description: 'Entregue 3 demandas hoje', bonus: 35 },
            { type: 'login', target: 1, description: 'Faça login no sistema', bonus: 5 },
            { type: 'reports', target: 1, description: 'Envie um relatório', bonus: 15 },
            { type: 'routine', target: 1, description: 'Complete o checklist diário', bonus: 20 }
        ];
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        return challenges[dayOfYear % challenges.length];
    },

    // ==========================================
    // UI RENDERING
    // ==========================================

    renderAchievementCard(key, isUnlocked = false) {
        const ach = this.ACHIEVEMENTS[key];
        if (!ach) return '';

        const rarityColor = this.RARITY_COLORS[ach.rarity] || '#9CA3AF';
        const catInfo = this.CATEGORIES[ach.category] || { name: ach.category, icon: '🏅' };

        return `
      <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}" data-achievement="${key}" title="${ach.description}">
        <div class="achievement-icon" style="background: ${isUnlocked ? `linear-gradient(135deg, ${rarityColor}33, ${rarityColor}66)` : '#1e293b'}">
          ${isUnlocked ? ach.icon : '🔒'}
        </div>
        <div class="achievement-info">
          <div class="achievement-name">${ach.name}</div>
          <div class="achievement-desc">${ach.description}</div>
          <div class="achievement-meta">
            <span class="achievement-category" style="color: ${catInfo.color || '#9CA3AF'}">${catInfo.icon} ${catInfo.name}</span>
            <span class="achievement-rarity" style="color: ${rarityColor}">${ach.rarity.toUpperCase()}</span>
            <span class="achievement-points">+${ach.points} pts</span>
          </div>
        </div>
      </div>
    `;
    },

    showXPAnimation(points, element = null) {
        const xpEl = document.createElement('div');
        xpEl.className = 'xp-animation';
        xpEl.innerHTML = `<span class="xp-value">+${points} XP</span>`;

        if (element) {
            const rect = element.getBoundingClientRect();
            xpEl.style.left = `${rect.left + rect.width / 2}px`;
            xpEl.style.top = `${rect.top}px`;
        } else {
            xpEl.style.left = '50%';
            xpEl.style.top = '50%';
        }

        document.body.appendChild(xpEl);
        setTimeout(() => xpEl.classList.add('animate'), 50);
        setTimeout(() => xpEl.remove(), 1500);
    },

    showAchievementUnlockedModal(achievement) {
        const modal = document.createElement('div');
        modal.className = 'achievement-modal-overlay';
        const rarityColor = this.RARITY_COLORS[achievement.rarity] || '#9CA3AF';
        modal.innerHTML = `
      <div class="achievement-modal">
        <div class="confetti-container"></div>
        <div class="achievement-unlocked-icon">${achievement.icon}</div>
        <h2>🎉 Conquista Desbloqueada!</h2>
        <h3>${achievement.name}</h3>
        <p>${achievement.description}</p>
        <div class="achievement-rarity-label" style="color: ${rarityColor}; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">${achievement.rarity}</div>
        <div class="achievement-reward">+${achievement.points} XP</div>
        <button class="achievement-close-btn">Continuar</button>
      </div>
    `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('visible'), 50);

        modal.querySelector('.achievement-close-btn').addEventListener('click', () => {
            modal.classList.remove('visible');
            setTimeout(() => modal.remove(), 300);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('visible');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }
};

// ==========================================
// ESTILOS
// ==========================================
const achievementStyles = document.createElement('style');
achievementStyles.textContent = `
  .achievement-card { display: flex; gap: 14px; padding: 14px; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; transition: all 0.2s; }
  .achievement-card:hover { transform: translateY(-2px); border-color: #334155; }
  .achievement-card.locked { opacity: 0.5; filter: grayscale(0.3); }
  .achievement-card.unlocked { border-color: #9c5cff; box-shadow: 0 0 20px rgba(139, 92, 246, 0.15); }
  .achievement-icon { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 28px; border-radius: 12px; flex-shrink: 0; }
  .achievement-info { flex: 1; min-width: 0; }
  .achievement-name { font-weight: 600; color: #e5e7eb; margin-bottom: 4px; }
  .achievement-desc { font-size: 12px; color: #64748b; margin-bottom: 8px; }
  .achievement-meta { display: flex; gap: 12px; font-size: 11px; flex-wrap: wrap; }
  .achievement-category { font-weight: 500; }
  .achievement-rarity { font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .achievement-points { color: #9c5cff; font-weight: 600; }
  
  .xp-animation { position: fixed; transform: translate(-50%, -50%); z-index: 10000; pointer-events: none; }
  .xp-value { display: inline-block; font-size: 24px; font-weight: 800; color: #10b981; text-shadow: 0 2px 10px rgba(16, 185, 129, 0.5); opacity: 0; transform: translateY(20px); transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
  .xp-animation.animate .xp-value { opacity: 1; transform: translateY(-40px); }
  
  .achievement-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; }
  .achievement-modal-overlay.visible { opacity: 1; }
  .achievement-modal { background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 24px; padding: 40px; text-align: center; max-width: 400px; transform: scale(0.8); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  .achievement-modal-overlay.visible .achievement-modal { transform: scale(1); }
  .achievement-unlocked-icon { font-size: 80px; margin-bottom: 20px; animation: bounce 0.6s ease-out; }
  @keyframes bounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
  .achievement-modal h2 { font-size: 18px; color: #f59e0b; margin-bottom: 10px; }
  .achievement-modal h3 { font-size: 24px; color: #fff; margin-bottom: 10px; }
  .achievement-modal p { color: #94a3b8; margin-bottom: 20px; }
  .achievement-reward { font-size: 28px; font-weight: 800; color: #10b981; margin-bottom: 24px; }
  .achievement-close-btn { background: linear-gradient(135deg, #9c5cff, #7555e8); border: none; color: white; padding: 12px 32px; border-radius: 30px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
  .achievement-close-btn:hover { transform: scale(1.05); }
  
  .streak-widget { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #f97316, #ea580c); padding: 8px 16px; border-radius: 30px; }
  .streak-widget .fire { font-size: 20px; }
  .streak-widget .count { font-size: 18px; font-weight: 800; color: white; }
  .streak-widget .label { font-size: 11px; color: rgba(255,255,255,0.8); }
  
  .league-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
`;
document.head.appendChild(achievementStyles);

// Inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NexusAchievements.init());
} else {
    NexusAchievements.init();
}

window.NexusAchievements = NexusAchievements;
