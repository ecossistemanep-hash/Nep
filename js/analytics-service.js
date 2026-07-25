/**
 * NEP PLATFORM - ANALYTICS SERVICE
 * Sistema de tracking e métricas de uso
 */

import {
    db,
    collection,
    doc,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp
} from './firebase-config.js';

const AnalyticsService = {
    COLLECTION: 'user_analytics',

    // Tipos de eventos
    EVENTS: {
        MODULE_VIEW: 'MODULE_VIEW',
        FEATURE_USE: 'FEATURE_USE',
        COURSE_START: 'COURSE_START',
        COURSE_COMPLETE: 'COURSE_COMPLETE',
        PODCAST_PLAY: 'PODCAST_PLAY',
        PODCAST_COMPLETE: 'PODCAST_COMPLETE',
        TASK_CREATE: 'TASK_CREATE',
        TASK_COMPLETE: 'TASK_COMPLETE',
        TOOL_USE: 'TOOL_USE',
        LOGIN: 'LOGIN',
        LOGOUT: 'LOGOUT'
    },

    // Cache de estatísticas — chaveado por parâmetros, senão dois pedidos com
    // filtros diferentes (ex.: "7 dias" e "90 dias") receberiam o mesmo
    // snapshot cacheado do primeiro que pediu.
    statsCache: null,
    statsCacheKey: null,
    statsCacheTime: 0,
    STATS_CACHE_DURATION: 30000, // 30 segundos

    /**
     * Registrar evento de analytics
     */
    async track(eventType, moduleId, metadata = {}) {
        try {
            const currentUser = window.NexusAuthService?.currentUser;
            const userData = window.NexusAuthService?.currentUserData;

            await addDoc(collection(db, this.COLLECTION), {
                uid: currentUser?.uid || 'anonymous',
                user_name: userData?.nome || 'Anônimo',
                user_role: userData?.cargo || 'N/A',
                event_type: eventType,
                module_id: moduleId,
                metadata: metadata,
                timestamp: serverTimestamp(),
                date: new Date().toISOString().split('T')[0], // YYYY-MM-DD para queries
                user_agent: navigator.userAgent
            });

            console.log(`[Analytics] ${eventType}: ${moduleId}`);
        } catch (error) {
            console.error('[Analytics] Erro ao registrar evento:', error);
            // Não lançar erro para não interromper a UX
        }
    },

    /**
     * Registrar visualização de módulo
     */
    async trackModuleView(moduleId) {
        return this.track(this.EVENTS.MODULE_VIEW, moduleId);
    },

    /**
     * Registrar uso de ferramenta
     */
    async trackToolUse(toolName) {
        return this.track(this.EVENTS.TOOL_USE, 'tools', { tool_name: toolName });
    },

    /**
     * Registrar início de curso
     */
    async trackCourseStart(courseId, courseName) {
        return this.track(this.EVENTS.COURSE_START, 'courses', {
            course_id: courseId,
            course_name: courseName
        });
    },

    /**
     * Registrar conclusão de curso
     */
    async trackCourseComplete(courseId, courseName, score) {
        return this.track(this.EVENTS.COURSE_COMPLETE, 'courses', {
            course_id: courseId,
            course_name: courseName,
            score: score
        });
    },

    /**
     * Registrar play de podcast
     */
    async trackPodcastPlay(seasonId, episodeId) {
        return this.track(this.EVENTS.PODCAST_PLAY, 'podcast', {
            season_id: seasonId,
            episode_id: episodeId
        });
    },

    /**
     * Obter estatísticas gerais.
     *
     * Sem argumentos: lê a coleção inteira (comportamento histórico, usado
     * por getModuleRanking/getToolRanking/getUnusedModules — que precisam
     * de todo o histórico, não só dos últimos dias, senão um módulo usado
     * mês passado apareceria como "nunca usado").
     *
     * Com `days` e/ou `uid`: filtra no próprio Firestore. É o que o
     * Dashboard usa para os cards "IA Help"/"Acessos por Módulo"/
     * "Transações em Tempo Real" respeitarem os mesmos filtros de
     * período/usuário dos outros gráficos — antes esses três sempre
     * mostravam a base inteira, ignorando os seletores da tela.
     */
    async getOverallStats({ days = null, uid = null } = {}) {
        try {
            const cacheKey = `${days ?? 'all'}|${uid ?? 'all'}`;
            if (this.statsCache && this.statsCacheKey === cacheKey
                && (Date.now() - this.statsCacheTime) < this.STATS_CACHE_DURATION) {
                return this.statsCache;
            }

            let ref = collection(db, this.COLLECTION);
            const clauses = [];
            if (days !== null) {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);
                clauses.push(where('timestamp', '>', startDate));
            }
            if (uid) {
                clauses.push(where('uid', '==', uid));
            }
            if (clauses.length > 0) {
                ref = query(ref, ...clauses);
            }

            const snapshot = await getDocs(ref);

            const stats = {
                totalEvents: 0,
                todayEvents: 0,
                uniqueUsers: new Set(),
                todayUsers: new Set(),
                moduleViews: {},
                toolUsage: {},
                eventsByType: {},
                recentActivity: []
            };

            const today = new Date().toISOString().split('T')[0];

            snapshot.forEach(doc => {
                const data = doc.data();
                stats.totalEvents++;

                // Contagem de hoje
                if (data.date === today) {
                    stats.todayEvents++;
                    if (data.uid) stats.todayUsers.add(data.uid);
                }

                // Usuários únicos
                if (data.uid) stats.uniqueUsers.add(data.uid);

                // Eventos por tipo
                stats.eventsByType[data.event_type] =
                    (stats.eventsByType[data.event_type] || 0) + 1;

                // Visualizações por módulo
                if (data.event_type === 'MODULE_VIEW') {
                    stats.moduleViews[data.module_id] =
                        (stats.moduleViews[data.module_id] || 0) + 1;
                }

                // Uso de ferramentas
                if (data.event_type === 'TOOL_USE' && data.metadata?.tool_name) {
                    stats.toolUsage[data.metadata.tool_name] =
                        (stats.toolUsage[data.metadata.tool_name] || 0) + 1;
                }

                // Atividade recente (últimos 50)
                if (stats.recentActivity.length < 50) {
                    stats.recentActivity.push({
                        id: doc.id,
                        ...data,
                        timestamp: data.timestamp?.toDate?.() || new Date()
                    });
                }
            });

            // Converter Sets para números
            stats.uniqueUsersCount = stats.uniqueUsers.size;
            stats.todayUsersCount = stats.todayUsers.size;
            delete stats.uniqueUsers;
            delete stats.todayUsers;

            // Ordenar atividade recente
            stats.recentActivity.sort((a, b) => b.timestamp - a.timestamp);

            // Módulo mais usado
            const moduleEntries = Object.entries(stats.moduleViews);
            stats.mostUsedModule = moduleEntries.length > 0
                ? moduleEntries.sort((a, b) => b[1] - a[1])[0]
                : ['N/A', 0];

            // Módulo menos usado
            stats.leastUsedModule = moduleEntries.length > 0
                ? moduleEntries.sort((a, b) => a[1] - b[1])[0]
                : ['N/A', 0];

            // Atualizar cache
            this.statsCache = stats;
            this.statsCacheKey = cacheKey;
            this.statsCacheTime = Date.now();

            return stats;

        } catch (error) {
            console.error('[Analytics] Erro ao obter estatísticas:', error);
            return {
                totalEvents: 0,
                todayEvents: 0,
                uniqueUsersCount: 0,
                todayUsersCount: 0,
                moduleViews: {},
                toolUsage: {},
                eventsByType: {},
                recentActivity: [],
                mostUsedModule: ['N/A', 0],
                leastUsedModule: ['N/A', 0]
            };
        }
    },

    /**
     * Obter atividade por módulo
     */
    async getModuleActivity(moduleId, limitCount = 50) {
        try {
            const q = query(
                collection(db, this.COLLECTION),
                where('module_id', '==', moduleId),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate?.()?.toLocaleString('pt-BR') || 'N/A'
            }));

        } catch (error) {
            console.error('[Analytics] Erro ao obter atividade do módulo:', error);
            return [];
        }
    },

    /**
     * Obter atividade de um usuário
     */
    async getUserActivity(uid, limitCount = 50) {
        try {
            const q = query(
                collection(db, this.COLLECTION),
                where('uid', '==', uid),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate?.()?.toLocaleString('pt-BR') || 'N/A'
            }));

        } catch (error) {
            console.error('[Analytics] Erro ao obter atividade do usuário:', error);
            return [];
        }
    },

    /**
     * Obter ranking de módulos
     */
    async getModuleRanking() {
        const stats = await this.getOverallStats();
        const ranking = Object.entries(stats.moduleViews)
            .map(([module, count]) => ({ module, count }))
            .sort((a, b) => b.count - a.count);
        return ranking;
    },

    /**
     * Obter ranking de ferramentas
     */
    async getToolRanking() {
        const stats = await this.getOverallStats();
        const ranking = Object.entries(stats.toolUsage)
            .map(([tool, count]) => ({ tool, count }))
            .sort((a, b) => b.count - a.count);
        return ranking;
    },

    /**
     * Obter módulos não utilizados
     */
    async getUnusedModules() {
        const stats = await this.getOverallStats();
        const allModules = window.ModulePermissionService?.MODULES || [];
        const usedModules = Object.keys(stats.moduleViews);

        return allModules
            .filter(m => !usedModules.includes(m.id))
            .map(m => m.id);
    },

    /**
     * Limpar cache
     */
    clearCache() {
        this.statsCache = null;
        this.statsCacheTime = 0;
    }
};

// Expor globalmente
window.AnalyticsService = AnalyticsService;

export { AnalyticsService };
