/**
 * NEP DELIVERY CONTROL - POINTS SERVICE
 * Sistema centralizado de pontuação
 */

import {
    db,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from './firebase-config.js';

const PointsService = {
    COLLECTION_POINTS: 'user_points',
    COLLECTION_TRANSACTIONS: 'points_transactions',

    // Tipos de ações e pontos
    POINT_ACTIONS: {
        TASK_COMPLETED: { points: 10, label: 'Tarefa concluída' },
        TASK_VALIDATED: { points: 5, label: 'Tarefa validada' },
        FORUM_POST: { points: 5, label: 'Post no fórum' },
        FORUM_REPLY: { points: 3, label: 'Resposta no fórum' },
        COURSE_COMPLETED: { points: 20, label: 'Curso concluído' },
        QUIZ_PASSED: { points: 15, label: 'Prova aprovada' },
        DAILY_LOGIN: { points: 2, label: 'Login diário' },
        ACHIEVEMENT: { points: 10, label: 'Conquista desbloqueada' }
    },

    /**
     * Obter pontos totais de um usuário
     */
    async getUserPoints(uid) {
        try {
            const docRef = doc(db, this.COLLECTION_POINTS, uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data();
            }

            // Criar registro inicial
            const initialData = {
                uid,
                total_points: 0,
                level: 1,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
            };
            await setDoc(docRef, initialData);
            return { ...initialData, total_points: 0 };
        } catch (error) {
            console.error('[PointsService] Erro ao obter pontos:', error);
            return { total_points: 0, level: 1 };
        }
    },

    /**
     * Adicionar pontos (PROXY → NexusGamification)
     * Delega para NexusGamification.addPoints que usa transação atômica.
     * Mantido para retrocompatibilidade com módulos que chamam PointsService.addPoints.
     */
    async addPoints(uid, actionType, customPoints = null, metadata = {}) {
        // Delegar para NexusGamification (escritor atômico com db.runTransaction)
        if (window.NexusGamification) {
            const action = this.POINT_ACTIONS[actionType];
            const points = customPoints !== null ? customPoints : (action?.points || 0);
            const label = metadata?.task_title || action?.label || actionType;
            await window.NexusGamification.addPoints(uid, points, actionType, label);
            return { success: true, points_added: points };
        }

        // Fallback: se NexusGamification não carregou, usa escrita direta
        console.warn('[PointsService] NexusGamification não disponível, usando fallback direto');
        try {
            const action = this.POINT_ACTIONS[actionType];
            const points = customPoints !== null ? customPoints : (action?.points || 0);
            if (points <= 0) return { success: false, message: 'Pontos inválidos' };

            const userPointsRef = doc(db, this.COLLECTION_POINTS, uid);
            const userPointsSnap = await getDoc(userPointsRef);
            let currentPoints = userPointsSnap.exists() ? (userPointsSnap.data().total_points || 0) : 0;
            const newTotal = currentPoints + points;
            const newLevel = this.calculateLevel(newTotal);

            await setDoc(userPointsRef, {
                uid, total_points: newTotal, level: newLevel, updated_at: serverTimestamp()
            }, { merge: true });

            await addDoc(collection(db, this.COLLECTION_TRANSACTIONS), {
                uid, action_type: actionType, type: actionType,
                action_label: action?.label || 'Pontos',
                description: action?.label || 'Pontos',
                points, amount: points, balance_after: newTotal,
                created_at: serverTimestamp(), timestamp: serverTimestamp()
            });

            return { success: true, points_added: points, new_total: newTotal, new_level: newLevel };
        } catch (error) {
            console.error('[PointsService] Erro ao adicionar pontos:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Adicionar pontos customizados para tarefas Kanban (PROXY)
     */
    async addTaskPoints(uid, taskId, taskTitle, points) {
        return this.addPoints(uid, 'TASK_COMPLETED', points, {
            task_id: taskId,
            task_title: taskTitle
        });
    },

    /**
     * Calcular nível baseado em pontos
     */
    calculateLevel(points) {
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

    /**
     * Obter próximo nível e pontos necessários
     */
    getNextLevelInfo(currentPoints) {
        const thresholds = [0, 50, 150, 300, 500, 800, 1200, 1700, 2500, 3500, Infinity];
        const currentLevel = this.calculateLevel(currentPoints);

        if (currentLevel >= 10) {
            return { nextLevel: 10, pointsNeeded: 0, progress: 100 };
        }

        const nextThreshold = thresholds[currentLevel];
        const prevThreshold = thresholds[currentLevel - 1];
        const pointsInLevel = currentPoints - prevThreshold;
        const pointsForLevel = nextThreshold - prevThreshold;
        const progress = Math.round((pointsInLevel / pointsForLevel) * 100);

        return {
            nextLevel: currentLevel + 1,
            pointsNeeded: nextThreshold - currentPoints,
            remaining: nextThreshold - currentPoints,
            progress
        };
    },

    /**
     * Obter ranking de usuários
     */
    /**
     * Obter ranking de usuários (Otimizado com Cache e Parallel Fetch)
     */
    async getRanking(limitCount = 50) {
        try {
            // 1. Verificar Cache Memory (5 minutos)
            const CACHE_KEY = `ranking_${limitCount}`;
            const cached = this._memoryCache?.[CACHE_KEY];
            const now = Date.now();

            if (cached && (now - cached.timestamp < 1000 * 30)) {
                console.log('[PointsService] Ranking retornado do cache ⚡');
                return cached.data;
            }

            // 2. Buscar Pontos (Rápido)
            const q = query(
                collection(db, this.COLLECTION_POINTS),
                orderBy('total_points', 'desc'),
                limit(limitCount)
            );
            const snapshot = await getDocs(q);

            // 3. Preparar requisições em paralelo para dados de usuário faltantes
            const rankingPromises = snapshot.docs.map(async (docSnap, index) => {
                const data = docSnap.data();
                const position = index + 1;

                // MAS APENAS SE tiver foto e logos! Se não, busca do cadastro para garantir foto e logos atualizados
                if (data.name && data.photoURL && data.logos !== undefined) {
                    return {
                        position,
                        uid: data.uid,
                        nome: data.name,
                        cargo: data.role || 'Membro',
                        email: '',
                        photoURL: data.photoURL,
                        logos: data.logos,
                        setor: data.setor || '',
                        total_points: data.total_points || 0,
                        level: data.level || 1,
                        initials: this.getInitials(data.name)
                    };
                }

                // Se não tiver, busca do perfil de usuários (Lento, mas necessário)
                try {
                    const userRef = doc(db, 'users', data.uid);
                    const userSnap = await getDoc(userRef);
                    const userData = userSnap.exists() ? userSnap.data() : null;

                    // Estratégia de Fallback para nome
                    let displayName = 'Usuário';
                    if (userData) {
                        displayName = userData.nome || userData.name || userData.displayName || userData.full_name || userData.email?.split('@')[0] || 'Usuário';
                    }

                    return {
                        position,
                        uid: data.uid,
                        nome: displayName,
                        cargo: userData?.cargo || userData?.role || 'Membro',
                        email: userData?.email || '',
                        photoURL: userData?.photoURL || userData?.avatarUrl || null,
                        logos: userData?.logos || [],
                        setor: userData?.setor || '',
                        total_points: data.total_points || 0,
                        level: data.level || 1,
                        initials: this.getInitials(displayName)
                    };
                } catch (err) {
                    console.warn(`Erro ao buscar user pro ranking: ${data.uid}`, err);
                    return {
                        position,
                        uid: data.uid,
                        nome: 'Usuário (Erro)',
                        total_points: data.total_points || 0,
                        level: data.level || 1,
                        initials: '?'
                    };
                }
            });

            // 4. Aguardar todas as resoluções
            const allResults = await Promise.all(rankingPromises);

            // Filtrar usuários inválidos, excluídos ou ADMINs
            const ranking = allResults.filter(u => {
                const lowerName = (u.nome || '').toLowerCase();
                const lowerEmail = (u.email || '').toLowerCase();

                // Filtros de Teste (Usuários fantasmas ou teste)
                if (lowerName === 'teste' || lowerName.includes('teste automacao')) return false;
                if (lowerEmail.startsWith('teste')) return false;

                // Filtro de Admin
                if (u.cargo === 'ADMIN' || u.cargo === 'Administrador' || u.role === 'ADMIN') return false;

                return true;
            });

            // 5. Salvar no Cache
            if (!this._memoryCache) this._memoryCache = {};
            this._memoryCache[CACHE_KEY] = {
                timestamp: now,
                data: ranking
            };

            return ranking;
        } catch (error) {
            console.error('[PointsService] Erro ao obter ranking:', error);
            return [];
        }
    },

    /**
     * Obter histórico de transações de um usuário
     */
    async getUserTransactions(uid, limitCount = 20) {
        try {
            const q = query(
                collection(db, this.COLLECTION_TRANSACTIONS),
                where('uid', '==', uid),
                orderBy('created_at', 'desc'),
                limit(limitCount)
            );
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate?.()?.toLocaleString('pt-BR') || 'N/A'
            }));
        } catch (error) {
            console.error('[PointsService] Erro ao obter transações:', error);
            return [];
        }
    },

    /**
     * Helper - Iniciais do nome
     */
    getInitials(name) {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    },

    /**
     * Obter badge de nível
     */
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
    }
};

// Expor globalmente
window.PointsService = PointsService;

export { PointsService };
