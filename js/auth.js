/**
 * NEP DELIVERY CONTROL - AUTH
 * Sistema de Autenticação Unificado
 * Compatível com Firebase Auth e sistema Kanban original
 */

const NepAuth = {
    ROLE_LEVELS: {
        admin: 99,
        superintendente: 5,
        gerente: 4,
        consultor: 3,
        coordenador: 2,
        analista: 1,
        monitor: 0
    },

    ROLE_LABELS: {
        superintendente: "SUPERINTENDENTE",
        gerente: "GERENTE",
        consultor: "CONSULTOR",
        coordenador: "COORDENADOR",
        analista: "ANALISTA",
        monitor: "MONITOR",
        admin: "ADMINISTRADOR"
    },

    isLoggedIn() {
        // Verificar primeiro o serviço Firebase, depois localStorage
        if (window.NexusAuthService?.isLoggedIn()) {
            return true;
        }
        return localStorage.getItem('nep_logged_in') === 'true';
    },

    isAdmin() {
        if (window.NexusAuthService?.isAdmin()) {
            return true;
        }
        return localStorage.getItem('nep_is_admin') === 'true';
    },

    getUser() {
        // Tentar obter do serviço Firebase primeiro
        if (window.NexusAuthService?.isLoggedIn()) {
            return window.NexusAuthService.getUser();
        }

        // Fallback para localStorage
        if (!this.isLoggedIn()) return null;

        const name = localStorage.getItem('nep_user_name') || 'Usuário';
        const roleKey = localStorage.getItem('nep_user_role_key') || 'monitor';
        const level = parseInt(localStorage.getItem('nep_user_level') || '0');
        const label = localStorage.getItem('nep_user_label') || 'MONITOR';
        const uid = localStorage.getItem('nep_user_uid') || null;

        return {
            uid,
            name,
            role: roleKey,
            roleKey,
            level,
            label,
            isAdmin: this.isAdmin(),
            initials: this.getInitials(name)
        };
    },

    getInitials(name) {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    },

    hasPermission(minLevel) {
        if (window.NexusAuthService?.hasPermission) {
            return window.NexusAuthService.hasPermission(minLevel);
        }

        const user = this.getUser();
        if (!user) return false;
        if (user.isAdmin) return true;
        return user.level >= minLevel;
    },

    canValidate(creatorLevel) {
        if (window.NexusAuthService?.canValidate) {
            return window.NexusAuthService.canValidate(creatorLevel);
        }

        const user = this.getUser();
        if (!user) return false;
        if (user.isAdmin) return true;
        if (user.roleKey === 'superintendente') return true;
        return user.level > creatorLevel;
    },

    canDelete(creatorLevel, isCreator) {
        if (window.NexusAuthService?.canDelete) {
            return window.NexusAuthService.canDelete(creatorLevel, isCreator);
        }

        const user = this.getUser();
        if (!user) return false;
        if (user.isAdmin) return true;
        if (user.roleKey === 'superintendente') return true;
        if (isCreator) return true;
        return user.level > creatorLevel;
    },

    canDelegateTo(targetRoleKey) {
        if (window.NexusAuthService?.canDelegateTo) {
            return window.NexusAuthService.canDelegateTo(targetRoleKey);
        }

        const user = this.getUser();
        if (!user) return false;
        if (user.isAdmin) return true;

        const targetLevel = this.ROLE_LEVELS[targetRoleKey];
        if (targetLevel === undefined) return false;

        if (user.roleKey === 'monitor') {
            return targetRoleKey === 'monitor';
        }

        if (user.roleKey === 'analista') {
            return targetLevel <= this.ROLE_LEVELS.coordenador;
        }

        return true;
    },

    canExportCSV() {
        if (window.NexusAuthService?.canExportCSV) {
            return window.NexusAuthService.canExportCSV();
        }

        const user = this.getUser();
        if (!user) return false;
        if (user.isAdmin) return true;
        return user.roleKey === 'superintendente' || user.roleKey === 'gerente';
    },

    canAccessAdmin() {
        if (window.NexusAuthService?.canAccessAdmin) {
            return window.NexusAuthService.canAccessAdmin();
        }
        return this.isAdmin();
    },

    canManageUsers() {
        if (window.NexusAuthService?.canManageUsers) {
            return window.NexusAuthService.canManageUsers();
        }
        return this.isAdmin();
    },

    async logout() {
        // Tentar logout via Firebase primeiro
        if (window.NexusAuthService?.logout) {
            try {
                await window.NexusAuthService.logout();
            } catch (e) {
                console.error('Erro no logout Firebase:', e);
            }
        }

        // Limpar localStorage
        localStorage.removeItem('nep_logged_in');
        localStorage.removeItem('nep_user_name');
        localStorage.removeItem('nep_user_role');
        localStorage.removeItem('nep_user_role_key');
        localStorage.removeItem('nep_user_level');
        localStorage.removeItem('nep_user_label');
        localStorage.removeItem('nep_is_admin');
        localStorage.removeItem('nep_user_uid');
        localStorage.removeItem('nep_user_email');

        window.location.href = 'login.html';
    },

    protectPage() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    getAvatarGradient(identifier) {
        const gradients = [
            'linear-gradient(135deg, #2f6fed 0%, #1c4ed8 100%)',
            'linear-gradient(135deg, #9c5cff 0%, #6d28d9 100%)',
            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
            'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
        ];

        let hash = 0;
        const str = String(identifier);
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return gradients[Math.abs(hash) % gradients.length];
    }
};

// Aliases para compatibilidade
const NexusAuth = NepAuth;

// Export for global use
window.NepAuth = NepAuth;
window.NexusAuth = NexusAuth;
