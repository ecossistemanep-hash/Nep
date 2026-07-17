/**
 * NEP PLATFORM - MODULE PERMISSION SERVICE (MIME)
 * Sistema de controle de permissões por módulo/cargo
 * 
 * NOTA: Usa window.db (Firebase Compat SDK) para compatibilidade com restante do sistema
 * NOTA2: Usa new Date() ao invés de serverTimestamp() para evitar problemas de escopo em módulos ES6
 */

const ModulePermissionService = {
    COLLECTION: 'module_permissions',

    // Cache local para performance
    permissionsCache: null,
    cacheTimestamp: 0,
    CACHE_DURATION: 60000, // 1 minuto

    // Lista de todos os módulos do sistema
    MODULES: [
        { id: 'dashboard', name: 'Dashboard', icon: '🏠', category: 'core' },
        { id: 'kanban', name: 'Kanban (Rotinas)', icon: '📋', category: 'core' },
        { id: 'checklist', name: 'Rotina ADM', icon: '✅', category: 'core' },
        { id: 'tools', name: 'Ferramentas', icon: '🧰', category: 'core' },
        { id: 'tickets', name: 'Chamados', icon: '🎫', category: 'core' },

        { id: 'results', name: 'Resultados', icon: '📈', category: 'performance' },
        { id: 'ranking', name: 'Ranking', icon: '🏆', category: 'performance' },

        { id: 'paineis', name: 'Painéis Corporativos', icon: '🛰️', category: 'gestao' },
        { id: 'teams-calendar', name: 'Calendário Teams', icon: '📅', category: 'gestao' },
        { id: 'vacation', name: 'Controle de Férias', icon: '🏖️', category: 'gestao' },
        { id: 'admin', name: 'Admin', icon: '⚙️', category: 'gestao' },

        { id: 'testimonials', name: 'NEP Depoimentos', icon: '💙', category: 'aprendizado' },
        { id: 'forum', name: 'Fórum', icon: '💬', category: 'aprendizado' },
        { id: 'announcements', name: 'Avisos', icon: '📢', category: 'colaboracao' },
        { id: 'chat', name: 'Chat Geral', icon: '💭', category: 'colaboracao' },
        { id: 'profile', name: 'Perfil', icon: '👤', category: 'usuario' }
    ],

    // Cargos disponíveis
    ROLES: ['ADMIN', 'DIRETOR', 'SUPERINTENDENTE', 'GERENTE', 'CONSULTOR', 'COORDENADOR', 'ANALISTA', 'MONITOR'],

    // Helper para obter timestamp (compatível com módulos ES6)
    _getTimestamp() {
        // Tenta usar firebase compat se disponível, senão usa Date
        if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
            return firebase.firestore.FieldValue.serverTimestamp();
        }
        return new Date();
    },

    /**
     * Inicializar permissões padrão no Firestore
     */
    async initializeDefaultPermissions() {
        try {
            if (!window.db) {
                console.warn('[MIME] window.db não disponível, aguardando...');
                return;
            }

            for (const module of this.MODULES) {
                const docRef = window.db.collection(this.COLLECTION).doc(module.id);
                const docSnap = await docRef.get();

                if (!docSnap.exists) {
                    await docRef.set({
                        module_id: module.id,
                        module_name: module.name,
                        icon: module.icon,
                        category: module.category,
                        enabled: true,
                        disabled_for_all: false,
                        allowed_roles: module.id === 'admin' ? ['ADMIN'] : [...this.ROLES],
                        created_at: this._getTimestamp(),
                        updated_at: this._getTimestamp(),
                        updated_by: 'SISTEMA'
                    });
                    console.log(`[MIME] Permissão criada para: ${module.id}`);
                }
            }
            console.log('[MIME] Permissões inicializadas com sucesso');
        } catch (error) {
            console.error('[MIME] Erro ao inicializar permissões:', error);
        }
    },

    /**
     * Obter todas as permissões
     */
    async getAllPermissions(forceRefresh = false) {
        try {
            if (!window.db) {
                console.warn('[MIME] window.db não disponível');
                return {};
            }

            // Verificar cache
            if (!forceRefresh && this.permissionsCache &&
                (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION) {
                return this.permissionsCache;
            }

            const snapshot = await window.db.collection(this.COLLECTION).get();
            const permissions = {};

            snapshot.forEach(doc => {
                permissions[doc.id] = { id: doc.id, ...doc.data() };
            });

            // Atualizar cache
            this.permissionsCache = permissions;
            this.cacheTimestamp = Date.now();

            return permissions;
        } catch (error) {
            console.error('[MIME] Erro ao obter permissões:', error);
            return {};
        }
    },

    /**
     * Verificar se um cargo pode acessar um módulo
     */
    async checkAccess(moduleId, userRole) {
        try {
            const normalizedRole = userRole ? userRole.toUpperCase() : 'MONITOR';

            // Admin sempre tem acesso
            if (normalizedRole === 'ADMIN') return true;

            const permissions = await this.getAllPermissions();
            const modulePermission = permissions[moduleId];

            if (!modulePermission) {
                // Se não existe permissão definida, permite acesso
                return true;
            }

            // Verificar se módulo está desativado para todos
            if (modulePermission.disabled_for_all || !modulePermission.enabled) {
                return false;
            }

            // Verificar se cargo está na lista de permitidos
            const allowedRoles = modulePermission.allowed_roles || [];
            return allowedRoles.some(r => r.toUpperCase() === normalizedRole);

        } catch (error) {
            console.error('[MIME] Erro ao verificar acesso:', error);
            return true; // Em caso de erro, permite acesso
        }
    },

    /**
     * Atualizar permissão de um módulo
     */
    async updateModulePermission(moduleId, updates) {
        try {
            const currentUser = window.NexusAuthService?.currentUser;
            if (!window.NexusAuthService?.isAdmin()) {
                throw new Error('Apenas administradores podem alterar permissões');
            }

            if (!window.db) {
                throw new Error('Banco de dados não disponível');
            }

            const docRef = window.db.collection(this.COLLECTION).doc(moduleId);
            const moduleInfo = this.MODULES.find(m => m.id === moduleId) || {};

            await docRef.set({
                module_id: moduleId,
                module_name: moduleInfo.name || moduleId,
                icon: moduleInfo.icon || '📦',
                category: moduleInfo.category || 'core',
                ...updates,
                updated_at: this._getTimestamp(),
                updated_by: currentUser?.uid || 'SISTEMA'
            }, { merge: true });

            // Limpar cache
            this.permissionsCache = null;

            // Registrar auditoria
            if (window.AuditService) {
                await window.AuditService.log(
                    'ALTERACAO_PERMISSAO',
                    null,
                    `Permissão do módulo ${moduleId} alterada: ${JSON.stringify(updates)}`
                );
            }

            console.log(`[MIME] Permissão atualizada: ${moduleId}`);
            return { success: true };

        } catch (error) {
            console.error('[MIME] Erro ao atualizar permissão:', error);
            throw error;
        }
    },

    /**
     * Ativar/Desativar módulo para todos
     */
    async toggleModuleForAll(moduleId, enabled) {
        return this.updateModulePermission(moduleId, {
            enabled: enabled,
            disabled_for_all: !enabled
        });
    },

    /**
     * Definir cargos permitidos para um módulo
     */
    async setAllowedRoles(moduleId, roles) {
        return this.updateModulePermission(moduleId, {
            allowed_roles: roles
        });
    },

    /**
     * Adicionar/Remover um cargo específico
     */
    async toggleRoleAccess(moduleId, role, allowed) {
        try {
            const permissions = await this.getAllPermissions();
            const current = permissions[moduleId]?.allowed_roles || [...this.ROLES];
            const normalizedRole = role.toUpperCase();

            let newRoles;
            if (allowed) {
                newRoles = current.some(r => r.toUpperCase() === normalizedRole) ? current : [...current, role];
            } else {
                newRoles = current.filter(r => r.toUpperCase() !== normalizedRole);
            }

            return this.updateModulePermission(moduleId, {
                allowed_roles: newRoles
            });

        } catch (error) {
            console.error('[MIME] Erro ao toggle cargo:', error);
            throw error;
        }
    },

    /**
     * Obter módulos acessíveis para o cargo atual
     */
    async getAccessibleModules(userRole) {
        try {
            const normalizedRole = userRole ? userRole.toUpperCase() : 'MONITOR';
            const permissions = await this.getAllPermissions();
            const accessible = [];

            for (const module of this.MODULES) {
                const perm = permissions[module.id];

                // Admin sempre tem acesso
                if (normalizedRole === 'ADMIN') {
                    accessible.push(module.id);
                    continue;
                }

                // Verificar permissão
                if (!perm || (!perm.disabled_for_all && perm.enabled)) {
                    const allowedRoles = perm?.allowed_roles || this.ROLES;
                    if (allowedRoles.some(r => r.toUpperCase() === normalizedRole)) {
                        accessible.push(module.id);
                    }
                }
            }

            return accessible;

        } catch (error) {
            console.error('[MIME] Erro ao obter módulos acessíveis:', error);
            return this.MODULES.map(m => m.id); // Fallback: todos
        }
    },

    /**
     * Sincronizar módulos (Forçar verificação de novos módulos)
     */
    async syncModules() {
        console.log('[MIME] Sincronizando módulos...');
        let added = 0;

        if (!window.db) {
            throw new Error('Banco de dados não disponível');
        }

        try {
            for (const module of this.MODULES) {
                const docRef = window.db.collection(this.COLLECTION).doc(module.id);
                const docSnap = await docRef.get();

                if (!docSnap.exists) {
                    await docRef.set({
                        module_id: module.id,
                        module_name: module.name,
                        icon: module.icon,
                        category: module.category,
                        enabled: true,
                        disabled_for_all: false,
                        allowed_roles: module.id === 'admin' ? ['ADMIN'] : [...this.ROLES],
                        created_at: this._getTimestamp(),
                        updated_at: this._getTimestamp(),
                        updated_by: 'SYNC'
                    });
                    added++;
                    console.log(`[MIME] Novo módulo registrado: ${module.id}`);
                }
            }
            // Limpar cache
            this.permissionsCache = null;
            console.log(`[MIME] Sincronização concluída. ${added} módulos adicionados.`);
            return { success: true, added };
        } catch (error) {
            console.error('[MIME] Erro na sincronização:', error);
            throw error;
        }
    },

    /**
     * Obter lista de módulos com status
     */
    async getModulesWithStatus() {
        // Tenta sync rápido em background se cache estiver vazio
        if (!this.permissionsCache) {
            this.syncModules().catch(err => console.warn('[MIME] Background sync failed:', err));
        }

        const permissions = await this.getAllPermissions();

        return this.MODULES.map(module => {
            const perm = permissions[module.id] || {};
            // Se permissão não existe no banco, assume defaults do código
            const isNew = !permissions[module.id];

            return {
                ...module,
                enabled: isNew ? true : (perm.enabled !== false),
                disabled_for_all: isNew ? false : (perm.disabled_for_all === true),
                allowed_roles: isNew ? (module.id === 'admin' ? ['ADMIN'] : [...this.ROLES]) : (perm.allowed_roles || [...this.ROLES])
            };
        });
    }
};

// Expor globalmente
window.ModulePermissionService = ModulePermissionService;

// Export para módulos que usam import
export { ModulePermissionService };
