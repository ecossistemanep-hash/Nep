/**
 * NEP DELIVERY CONTROL - AUDIT SERVICE
 * Serviço de Auditoria e Logs
 */

import {
    db,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    serverTimestamp,
    Timestamp
} from './firebase-config.js';

const AuditService = {
    COLLECTION: 'audit_logs',

    // Tipos de ações auditáveis
    ACTIONS: {
        // Autenticação
        LOGIN: 'LOGIN',
        LOGOUT: 'LOGOUT',
        FALHA_LOGIN: 'FALHA_LOGIN',
        RESET_SENHA: 'RESET_SENHA',
        TROCA_SENHA: 'TROCA_SENHA',

        // Gestão de Usuários
        CRIAR_USUARIO: 'CRIAR_USUARIO',
        EDITAR_EMAIL: 'EDITAR_EMAIL',
        EDITAR_CARGO: 'EDITAR_CARGO',
        EDITAR_NOME: 'EDITAR_NOME',
        ATIVAR_USUARIO: 'ATIVAR_USUARIO',
        DESATIVAR_USUARIO: 'DESATIVAR_USUARIO',
        EXCLUIR_USUARIO: 'EXCLUIR_USUARIO',

        // Sistema
        ACESSO_ADMIN: 'ACESSO_ADMIN',
        ALTERACAO_CONFIG: 'ALTERACAO_CONFIG'
    },

    /**
     * Registrar ação de auditoria
     * @param {string} acao - Tipo de ação (usar ACTIONS)
     * @param {string|null} uidAlvo - UID do usuário afetado
     * @param {string} detalhe - Detalhes adicionais
     */
    async log(acao, uidAlvo = null, detalhe = '') {
        try {
            const currentUser = window.NexusAuthService?.currentUser;

            const logEntry = {
                uid_alvo: uidAlvo,
                uid_executor: currentUser?.uid || 'SISTEMA',
                executor_email: currentUser?.email || 'SISTEMA',
                acao: acao,
                detalhe: detalhe,
                timestamp: serverTimestamp(),
                ip: await this.getClientIP(),
                user_agent: navigator.userAgent
            };

            await addDoc(collection(db, this.COLLECTION), logEntry);

            // Log local para debugging
            console.log(`[AUDIT] ${acao}:`, detalhe);

            return true;
        } catch (error) {
            console.error('[AUDIT ERROR]', error);
            // Não lançar erro para não interromper o fluxo principal
            return false;
        }
    },

    /**
     * Buscar logs de auditoria por usuário alvo
     */
    async getLogsByUser(uid, limit = 50) {
        try {
            const q = query(
                collection(db, this.COLLECTION),
                where('uid_alvo', '==', uid),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: this.formatTimestamp(doc.data().timestamp)
            }));
        } catch (error) {
            console.error('Erro ao buscar logs por usuário:', error);
            return [];
        }
    },

    /**
     * Buscar logs de auditoria por executor
     */
    async getLogsByExecutor(uid, limit = 50) {
        try {
            const q = query(
                collection(db, this.COLLECTION),
                where('uid_executor', '==', uid),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: this.formatTimestamp(doc.data().timestamp)
            }));
        } catch (error) {
            console.error('Erro ao buscar logs por executor:', error);
            return [];
        }
    },

    /**
     * Buscar logs de auditoria por tipo de ação
     */
    async getLogsByAction(action, limit = 50) {
        try {
            const q = query(
                collection(db, this.COLLECTION),
                where('acao', '==', action),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: this.formatTimestamp(doc.data().timestamp)
            }));
        } catch (error) {
            console.error('Erro ao buscar logs por ação:', error);
            return [];
        }
    },

    /**
     * Buscar todos os logs recentes
     */
    async getRecentLogs(limit = 100) {
        try {
            const q = query(
                collection(db, this.COLLECTION),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(q);
            const logs = snapshot.docs.slice(0, limit).map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: this.formatTimestamp(doc.data().timestamp)
            }));

            return logs;
        } catch (error) {
            console.error('Erro ao buscar logs recentes:', error);
            return [];
        }
    },

    /**
     * Buscar logs de login/logout recentes
     */
    async getAuthLogs(limit = 50) {
        try {
            const authActions = [
                this.ACTIONS.LOGIN,
                this.ACTIONS.LOGOUT,
                this.ACTIONS.FALHA_LOGIN,
                this.ACTIONS.RESET_SENHA
            ];

            const allLogs = await this.getRecentLogs(limit * 2);
            return allLogs.filter(log => authActions.includes(log.acao)).slice(0, limit);
        } catch (error) {
            console.error('Erro ao buscar logs de autenticação:', error);
            return [];
        }
    },

    /**
     * Helpers
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';

        if (timestamp instanceof Timestamp) {
            return timestamp.toDate().toLocaleString('pt-BR');
        }

        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000).toLocaleString('pt-BR');
        }

        return String(timestamp);
    },

    async getClientIP() {
        try {
            // Usando serviço gratuito para obter IP público
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return 'unknown';
        }
    },

    /**
     * Obter label amigável para ação
     */
    getActionLabel(action) {
        const labels = {
            'LOGIN': '🔓 Login',
            'LOGOUT': '🔒 Logout',
            'FALHA_LOGIN': '⚠️ Falha de Login',
            'RESET_SENHA': '🔑 Reset de Senha',
            'TROCA_SENHA': '🔐 Troca de Senha',
            'CRIAR_USUARIO': '👤 Criar Usuário',
            'EDITAR_EMAIL': '📧 Editar Email',
            'EDITAR_CARGO': '🏷️ Editar Cargo',
            'EDITAR_NOME': '✏️ Editar Nome',
            'ATIVAR_USUARIO': '✅ Ativar Usuário',
            'DESATIVAR_USUARIO': '🚫 Desativar Usuário',
            'EXCLUIR_USUARIO': '🗑️ Excluir Usuário',
            'ACESSO_ADMIN': '🛡️ Acesso Admin',
            'ALTERACAO_CONFIG': '⚙️ Alteração de Config'
        };

        return labels[action] || action;
    },

    /**
     * Obter cor para tipo de ação
     */
    getActionColor(action) {
        const colors = {
            'LOGIN': 'var(--success-500)',
            'LOGOUT': 'var(--text-secondary)',
            'FALHA_LOGIN': 'var(--error-500)',
            'RESET_SENHA': 'var(--warning-500)',
            'TROCA_SENHA': 'var(--accent-500)',
            'CRIAR_USUARIO': 'var(--primary-500)',
            'EDITAR_EMAIL': 'var(--accent-400)',
            'EDITAR_CARGO': 'var(--accent-400)',
            'EDITAR_NOME': 'var(--accent-400)',
            'ATIVAR_USUARIO': 'var(--success-500)',
            'DESATIVAR_USUARIO': 'var(--warning-500)',
            'EXCLUIR_USUARIO': 'var(--error-500)',
            'ACESSO_ADMIN': 'var(--warning-500)',
            'ALTERACAO_CONFIG': 'var(--accent-500)'
        };

        return colors[action] || 'var(--text-secondary)';
    }
};

// Expor globalmente
window.AuditService = AuditService;

export { AuditService };
