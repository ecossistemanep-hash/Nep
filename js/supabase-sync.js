/**
 * SUPABASE SYNC SERVICE - NEP Delivery Control
 * Sincroniza dados do Firestore para o Supabase (PostgreSQL)
 * para permitir consultas complexas e relatórios executivos.
 */

const SupabaseSync = {
    /**
     * Sincroniza uma tarefa do Kanban para o Postgres
     * @param {Object} task - Objeto da tarefa vindo do Firestore
     */
    async syncTask(task) {
        if (!window.sb) return;

        const { data, error } = await window.sb
            .from('kanban_tasks')
            .upsert({
                id: task.id,
                title: task.title,
                owner: task.owner,
                unit: task.unit,
                status: task.status,
                priority: task.priority,
                complexity: task.complexity,
                deadline: task.deadline,
                points: task.points || 0,
                created_at: task.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('[SupabaseSync] ❌ Erro ao sincronizar tarefa:', error);
        } else {
            console.log('[SupabaseSync] ✅ Tarefa sincronizada com sucesso');
        }
    },

    /**
     * Sincroniza dados de férias
     * @param {Object} vacation - Registro de férias
     */
    async syncVacation(vacation) {
        if (!window.sb) return;

        const { data, error } = await window.sb
            .from('vacation_records')
            .upsert({
                id: vacation.id,
                user_name: vacation.nome,
                role: vacation.cargo,
                product: vacation.produto,
                start_date: vacation.inicio,
                end_date: vacation.fim,
                status: vacation.status,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('[SupabaseSync] ❌ Erro ao sincronizar férias:', error);
        }
    },

    /**
     * Sincroniza em massa um módulo (Bootstrap inicial)
     * @param {string} module - Nome do módulo
     * @param {Array} items - Lista de itens
     */
    async syncBatch(module, items) {
        if (!window.sb) return;

        console.log(`[SupabaseSync] 🔄 Iniciando sync em massa para ${module}...`);

        const tableName = this.getTableName(module);
        if (!tableName) return;

        const { error } = await window.sb
            .from(tableName)
            .upsert(items);

        if (error) {
            console.error(`[SupabaseSync] ❌ Erro no batch sync de ${module}:`, error);
        } else {
            console.log(`[SupabaseSync] ✅ ${items.length} itens sincronizados para ${module}`);
        }
    },

    getTableName(module) {
        const maps = {
            'kanban': 'kanban_tasks',
            'vacation': 'vacation_records',
            'okr': 'okr_deliveries'
        };
        return maps[module];
    }
};

window.SupabaseSync = SupabaseSync;
