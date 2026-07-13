/**
 * NEP DELIVERY CONTROL - AUTH FIREBASE SERVICE
 * Serviço de Autenticação com Firebase
 */

import {
    auth,
    db,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from './firebase-config.js';

const NexusAuthService = {
    currentUser: null,
    currentUserData: null,
    authStateListeners: [],
    loginAttempts: {},
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutos

    // =========================================
    // ROLE CONFIGURATION
    // =========================================
    ROLE_CONFIG: {
        'ADMIN': { level: 99, label: 'ADMINISTRADOR', canManageUsers: true },
        'DIRETOR': { level: 95, label: 'DIRETOR', canManageUsers: false },
        'SUPERINTENDENTE': { level: 5, label: 'SUPERINTENDENTE', canManageUsers: false },
        'GERENTE': { level: 4, label: 'GERENTE', canManageUsers: false },
        'CONSULTOR': { level: 3, label: 'CONSULTOR', canManageUsers: false },
        'COORDENADOR': { level: 2, label: 'COORDENADOR', canManageUsers: false },
        'ANALISTA': { level: 1, label: 'ANALISTA', canManageUsers: false },
        'MONITOR': { level: 0, label: 'MONITOR', canManageUsers: false }
    },

    // =========================================
    // INICIALIZAÇÃO
    // =========================================
    init() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserData(user.uid);
                this.notifyListeners(true);
            } else {
                this.currentUser = null;
                this.currentUserData = null;
                this.clearLocalSession();
                this.notifyListeners(false);
            }
        });
    },

    // =========================================
    // LOGIN
    // =========================================
    async login(email, password) {
        try {
            // Verificar bloqueio por tentativas
            if (this.isLockedOut(email)) {
                const remainingTime = this.getRemainingLockoutTime(email);
                throw new Error(`Conta bloqueada. Tente novamente em ${Math.ceil(remainingTime / 60000)} minutos.`);
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Carregar dados do usuário do Firestore
            const userData = await this.loadUserData(user.uid);

            if (!userData) {
                await signOut(auth);
                throw new Error('Usuário não encontrado no sistema. Contate o administrador.');
            }

            // Verificar se usuário está ativo
            if (userData.status !== 'ATIVO') {
                await signOut(auth);
                throw new Error('Sua conta está desativada. Contate o administrador.');
            }

            // Limpar tentativas de login
            this.clearLoginAttempts(email);

            // Atualizar último login
            await this.updateLastLogin(user.uid);

            // Registrar na auditoria
            if (window.AuditService) {
                await window.AuditService.log('LOGIN', user.uid, 'Login realizado com sucesso');
            }

            // Salvar sessão local
            this.saveLocalSession(userData);

            return {
                success: true,
                user: userData,
                requirePasswordChange: userData.primeiro_acesso === true
            };

        } catch (error) {
            // Registrar tentativa falha
            this.recordFailedAttempt(email);

            // Log de auditoria para falha
            if (window.AuditService) {
                await window.AuditService.log('FALHA_LOGIN', null, `Tentativa de login falha para: ${email}`);
            }

            let errorMessage = 'Erro ao fazer login';

            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = 'Email ou senha incorretos';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Conta desativada. Contate o administrador.';
                    break;
                default:
                    errorMessage = error.message || 'Erro ao fazer login';
            }

            throw new Error(errorMessage);
        }
    },

    // =========================================
    // LOGOUT
    // =========================================
    async logout() {
        try {
            const uid = this.currentUser?.uid;

            if (window.AuditService && uid) {
                await window.AuditService.log('LOGOUT', uid, 'Logout realizado');
            }

            await signOut(auth);
            this.clearLocalSession();

            return { success: true };
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            throw new Error('Erro ao fazer logout');
        }
    },

    // =========================================
    // RESET DE SENHA
    // =========================================
    async sendPasswordReset(email) {
        try {
            await sendPasswordResetEmail(auth, email);

            if (window.AuditService) {
                await window.AuditService.log('RESET_SENHA', null, `Solicitação de reset de senha para: ${email}`);
            }

            return { success: true };
        } catch (error) {
            let errorMessage = 'Erro ao enviar email de recuperação';

            if (error.code === 'auth/user-not-found') {
                // Não revelar se o email existe ou não (segurança)
                return { success: true };
            }

            throw new Error(errorMessage);
        }
    },

    // =========================================
    // TROCA DE SENHA
    // =========================================
    async changePassword(currentPassword, newPassword) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Usuário não autenticado');

            // Reautenticar antes de trocar senha
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Atualizar senha
            await updatePassword(user, newPassword);

            // Marcar que não é mais primeiro acesso
            await updateDoc(doc(db, 'users', user.uid), {
                primeiro_acesso: false
            });

            // Atualizar dados locais
            if (this.currentUserData) {
                this.currentUserData.primeiro_acesso = false;
            }

            if (window.AuditService) {
                await window.AuditService.log('TROCA_SENHA', user.uid, 'Senha alterada com sucesso');
            }

            return { success: true };
        } catch (error) {
            let errorMessage = 'Erro ao trocar senha';

            if (error.code === 'auth/wrong-password') {
                errorMessage = 'Senha atual incorreta';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'A nova senha é muito fraca. Use pelo menos 6 caracteres.';
            }

            throw new Error(errorMessage);
        }
    },

    // =========================================
    // DADOS DO USUÁRIO
    // =========================================
    async loadUserData(uid) {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));

            if (userDoc.exists()) {
                const data = userDoc.data();
                this.currentUserData = {
                    uid,
                    ...data,
                    initials: this.getInitials(data.nome)
                };
                return this.currentUserData;
            }

            return null;
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            return null;
        }
    },

    async updateLastLogin(uid) {
        try {
            await updateDoc(doc(db, 'users', uid), {
                ultimo_login: serverTimestamp()
            });
        } catch (error) {
            console.error('Erro ao atualizar último login:', error);
        }
    },

    // =========================================
    // VERIFICAÇÕES DE PERMISSÃO
    // =========================================
    isLoggedIn() {
        return this.currentUser !== null && this.currentUserData !== null;
    },

    isAdmin() {
        return this.currentUserData?.cargo === 'ADMIN';
    },

    canManageUsers() {
        return this.ROLE_CONFIG[this.currentUserData?.cargo]?.canManageUsers === true;
    },

    getLevel() {
        const cargo = this.currentUserData?.cargo;
        return this.ROLE_CONFIG[cargo]?.level || 0;
    },

    hasPermission(minLevel) {
        if (this.isAdmin()) return true;
        return this.getLevel() >= minLevel;
    },

    canValidate(creatorLevel) {
        if (this.isAdmin()) return true;
        if (this.currentUserData?.cargo === 'SUPERINTENDENTE') return true;
        return this.getLevel() > creatorLevel;
    },

    canDelete(creatorLevel, isCreator) {
        if (this.isAdmin()) return true;
        if (this.currentUserData?.cargo === 'SUPERINTENDENTE') return true;
        if (isCreator) return true;
        return this.getLevel() > creatorLevel;
    },

    canDelegateTo(targetRoleKey) {
        if (this.isAdmin()) return true;
        const targetLevel = this.ROLE_CONFIG[targetRoleKey?.toUpperCase()]?.level;
        if (targetLevel === undefined) return false;
        return true;
    },

    canExportCSV() {
        if (this.isAdmin()) return true;
        const cargo = this.currentUserData?.cargo;
        return cargo === 'SUPERINTENDENTE' || cargo === 'GERENTE';
    },

    canAccessAdmin() {
        return this.isAdmin();
    },

    // =========================================
    // SESSÃO LOCAL
    // =========================================
    saveLocalSession(userData) {
        localStorage.setItem('nep_logged_in', 'true');
        localStorage.setItem('nep_user_name', userData.nome);
        localStorage.setItem('nep_user_email', userData.email);
        localStorage.setItem('nep_user_role_key', userData.cargo.toLowerCase());
        localStorage.setItem('nep_user_level', this.ROLE_CONFIG[userData.cargo]?.level || 0);
        localStorage.setItem('nep_user_label', this.ROLE_CONFIG[userData.cargo]?.label || userData.cargo);
        localStorage.setItem('nep_is_admin', userData.cargo === 'ADMIN' ? 'true' : 'false');
        localStorage.setItem('nep_user_uid', userData.uid);
        // Logos (multi-tenancy)
        if (Array.isArray(userData.logos) && userData.logos.length > 0) {
            localStorage.setItem('nep_user_logos', JSON.stringify(userData.logos));
        } else if (userData.setor) {
            localStorage.setItem('nep_user_logos', JSON.stringify([userData.setor]));
        } else {
            localStorage.removeItem('nep_user_logos');
        }
        if (userData.setor) {
            localStorage.setItem('nep_user_setor', userData.setor);
        }
    },

    clearLocalSession() {
        localStorage.removeItem('nep_logged_in');
        localStorage.removeItem('nep_user_name');
        localStorage.removeItem('nep_user_email');
        localStorage.removeItem('nep_user_role_key');
        localStorage.removeItem('nep_user_level');
        localStorage.removeItem('nep_user_label');
        localStorage.removeItem('nep_is_admin');
        localStorage.removeItem('nep_user_uid');
    },

    // =========================================
    // CONTROLE DE TENTATIVAS DE LOGIN
    // =========================================
    recordFailedAttempt(email) {
        if (!this.loginAttempts[email]) {
            this.loginAttempts[email] = { count: 0, lastAttempt: 0, lockedUntil: 0 };
        }

        this.loginAttempts[email].count++;
        this.loginAttempts[email].lastAttempt = Date.now();

        if (this.loginAttempts[email].count >= this.MAX_LOGIN_ATTEMPTS) {
            this.loginAttempts[email].lockedUntil = Date.now() + this.LOCKOUT_DURATION;
        }
    },

    isLockedOut(email) {
        const attempts = this.loginAttempts[email];
        if (!attempts) return false;

        if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
            return true;
        }

        // Reset se passou do tempo de bloqueio
        if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
            this.clearLoginAttempts(email);
        }

        return false;
    },

    getRemainingLockoutTime(email) {
        const attempts = this.loginAttempts[email];
        if (!attempts || !attempts.lockedUntil) return 0;
        return Math.max(0, attempts.lockedUntil - Date.now());
    },

    clearLoginAttempts(email) {
        delete this.loginAttempts[email];
    },

    // =========================================
    // LISTENERS
    // =========================================
    addAuthStateListener(callback) {
        this.authStateListeners.push(callback);
    },

    removeAuthStateListener(callback) {
        this.authStateListeners = this.authStateListeners.filter(cb => cb !== callback);
    },

    notifyListeners(isLoggedIn) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(isLoggedIn, this.currentUserData);
            } catch (e) {
                console.error('Error in auth state listener:', e);
            }
        });
    },

    // =========================================
    // HELPERS
    // =========================================
    getInitials(name) {
        if (!name) return '??';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    },

    getUser() {
        if (!this.isLoggedIn()) return null;

        return {
            uid: this.currentUserData.uid,
            name: this.currentUserData.nome,
            email: this.currentUserData.email,
            role: this.currentUserData.cargo.toLowerCase(),
            roleKey: this.currentUserData.cargo.toLowerCase(),
            level: this.getLevel(),
            label: this.ROLE_CONFIG[this.currentUserData.cargo]?.label || this.currentUserData.cargo,
            isAdmin: this.isAdmin(),
            initials: this.currentUserData.initials
        };
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

// Inicializar o serviço
NexusAuthService.init();

// Expor globalmente
window.NexusAuthService = NexusAuthService;

export { NexusAuthService };
