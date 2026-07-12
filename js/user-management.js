/**
 * NEP DELIVERY CONTROL - USER MANAGEMENT SERVICE
 * Serviço de Gestão de Usuários (CRUD)
 */

import {
    auth,
    db,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    createUserWithEmailAndPassword,
    updateEmail,
    deleteUser
} from './firebase-config.js';

const UserManagement = {
    COLLECTION: 'users',
    DEFAULT_PASSWORD: 'NEP2025@Temp',

    // Cargos disponíveis
    ROLES: [
        { key: 'ADMIN', label: 'Administrador', level: 99 },
        { key: 'DIRETOR', label: 'Diretor', level: 95 },
        { key: 'SUPERINTENDENTE', label: 'Superintendente', level: 5 },
        { key: 'GERENTE', label: 'Gerente', level: 4 },
        { key: 'CONSULTOR', label: 'Consultor', level: 3 },
        { key: 'COORDENADOR', label: 'Coordenador', level: 2 },
        { key: 'ANALISTA', label: 'Analista', level: 1 },
        { key: 'MONITOR', label: 'Monitor', level: 0 }
    ],

    /**
     * Criar novo usuário
     * @param {string} nome - Nome completo
     * @param {string} email - Email do usuário
     * @param {string} cargo - Cargo (ADMIN, GERENTE, etc)
     */
    async createUser(nome, email, cargo, extras = {}) {
        try {
            // Verificar permissão
            if (!window.NexusAuthService?.canManageUsers()) {
                throw new Error('Você não tem permissão para criar usuários');
            }

            // Validar dados
            if (!nome || nome.trim().length < 2) {
                throw new Error('Nome deve ter pelo menos 2 caracteres');
            }

            if (!email || !this.isValidEmail(email)) {
                throw new Error('Email inválido');
            }

            if (!cargo || !this.ROLES.find(r => r.key === cargo)) {
                throw new Error('Cargo inválido');
            }

            // Criar usuário no Firebase Auth
            // NOTA: Em produção, isso deveria ser feito via Cloud Functions
            // para não expor a criação de usuários no cliente
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                this.DEFAULT_PASSWORD
            );

            const newUser = userCredential.user;
            const executorUid = window.NexusAuthService?.currentUser?.uid || 'SISTEMA';

            // Criar documento no Firestore
            const userData = {
                nome: nome.trim(),
                email: email.toLowerCase().trim(),
                cargo: cargo,
                status: 'ATIVO',
                primeiro_acesso: true,
                data_criacao: serverTimestamp(),
                ultimo_login: null,
                criado_por: executorUid
            };

            // Campos opcionais (gestor direto e logos) gravados já na criação
            if (extras.gestor_uid) {
                userData.gestor_uid = extras.gestor_uid;
                userData.gestor_nome = extras.gestor_nome || '';
            }
            if (Array.isArray(extras.logos) && extras.logos.length > 0) {
                userData.logos = extras.logos;
                userData.setor = extras.logos[0]; // compatibilidade legada
            }

            await setDoc(doc(db, this.COLLECTION, newUser.uid), userData);

            // Registrar na auditoria
            if (window.AuditService) {
                await window.AuditService.log(
                    'CRIAR_USUARIO',
                    newUser.uid,
                    `Usuário criado: ${nome} (${email}) com cargo ${cargo}`
                );
            }

            // Fazer logout do usuário recém criado (para não deslogar o admin)
            // Em produção, usar Cloud Functions para evitar isso

            return {
                success: true,
                uid: newUser.uid,
                user: { uid: newUser.uid, ...userData }
            };

        } catch (error) {
            console.error('Erro ao criar usuário:', error);

            let errorMessage = error.message;

            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Este email já está em uso';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Email inválido';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Senha muito fraca';
            }

            throw new Error(errorMessage);
        }
    },

    /**
     * Listar todos os usuários
     */
    async listUsers() {
        try {
            const q = query(
                collection(db, this.COLLECTION),
                orderBy('data_criacao', 'desc')
            );

            const snapshot = await getDocs(q);

            return snapshot.docs
                .map(doc => ({
                    uid: doc.id,
                    ...doc.data(),
                    initials: this.getInitials(doc.data().nome),
                    data_criacao: this.formatDate(doc.data().data_criacao),
                    ultimo_login: this.formatDate(doc.data().ultimo_login)
                }))
                .filter(u => u.email !== 'teste.auto@nep.com'); // Hide ghost user

        } catch (error) {
            console.error('Erro ao listar usuários:', error);
            throw new Error('Erro ao carregar lista de usuários');
        }
    },

    /**
     * Buscar usuário por UID
     */
    async getUserById(uid) {
        try {
            const userDoc = await getDoc(doc(db, this.COLLECTION, uid));

            if (!userDoc.exists()) {
                return null;
            }

            return {
                uid: userDoc.id,
                ...userDoc.data(),
                initials: this.getInitials(userDoc.data().nome)
            };

        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            return null;
        }
    },

    /**
     * Atualizar nome do usuário
     */
    async updateUserName(uid, newName) {
        try {
            if (!window.NexusAuthService?.canManageUsers()) {
                throw new Error('Você não tem permissão para editar usuários');
            }

            if (!newName || newName.trim().length < 2) {
                throw new Error('Nome deve ter pelo menos 2 caracteres');
            }

            await updateDoc(doc(db, this.COLLECTION, uid), {
                nome: newName.trim()
            });

            if (window.AuditService) {
                await window.AuditService.log(
                    'EDITAR_NOME',
                    uid,
                    `Nome alterado para: ${newName}`
                );
            }

            return { success: true };

        } catch (error) {
            console.error('Erro ao atualizar nome:', error);
            throw new Error(error.message || 'Erro ao atualizar nome');
        }
    },

    /**
     * Atualizar email do usuário
     * NOTA: Isso requer que o usuário faça re-login
     */
    async updateUserEmail(uid, newEmail) {
        try {
            if (!window.NexusAuthService?.canManageUsers()) {
                throw new Error('Você não tem permissão para editar usuários');
            }

            if (!newEmail || !this.isValidEmail(newEmail)) {
                throw new Error('Email inválido');
            }

            // Atualizar no Firestore
            await updateDoc(doc(db, this.COLLECTION, uid), {
                email: newEmail.toLowerCase().trim()
            });

            // NOTA: Atualizar email no Firebase Auth requer que o usuário
            // esteja logado ou usar Admin SDK via Cloud Functions
            // Por enquanto, apenas atualizamos no Firestore

            if (window.AuditService) {
                await window.AuditService.log(
                    'EDITAR_EMAIL',
                    uid,
                    `Email alterado para: ${newEmail}`
                );
            }

            return { success: true };

        } catch (error) {
            console.error('Erro ao atualizar email:', error);
            throw new Error(error.message || 'Erro ao atualizar email');
        }
    },

    /**
     * Atualizar cargo do usuário
     */
    async updateUserRole(uid, newRole) {
        try {
            if (!window.NexusAuthService?.canManageUsers()) {
                throw new Error('Você não tem permissão para editar usuários');
            }

            if (!this.ROLES.find(r => r.key === newRole)) {
                throw new Error('Cargo inválido');
            }

            const oldUser = await this.getUserById(uid);
            const oldRole = oldUser?.cargo;

            await updateDoc(doc(db, this.COLLECTION, uid), {
                cargo: newRole
            });

            if (window.AuditService) {
                await window.AuditService.log(
                    'EDITAR_CARGO',
                    uid,
                    `Cargo alterado de ${oldRole} para ${newRole}`
                );
            }

            return { success: true };

        } catch (error) {
            console.error('Erro ao atualizar cargo:', error);
            throw new Error(error.message || 'Erro ao atualizar cargo');
        }
    },

    /**
     * Ativar usuário
     */
    async activateUser(uid) {
        try {
            if (!window.NexusAuthService?.canManageUsers()) {
                throw new Error('Você não tem permissão para ativar usuários');
            }

            await updateDoc(doc(db, this.COLLECTION, uid), {
                status: 'ATIVO'
            });

            if (window.AuditService) {
                await window.AuditService.log('ATIVAR_USUARIO', uid, 'Usuário ativado');
            }

            return { success: true };

        } catch (error) {
            console.error('Erro ao ativar usuário:', error);
            throw new Error('Erro ao ativar usuário');
        }
    },

    /**
     * Desativar usuário
     */
    async deactivateUser(uid) {
        try {
            if (!window.NexusAuthService?.canManageUsers()) {
                throw new Error('Você não tem permissão para desativar usuários');
            }

            // Não permitir desativar a si mesmo
            if (uid === window.NexusAuthService?.currentUser?.uid) {
                throw new Error('Você não pode desativar sua própria conta');
            }

            await updateDoc(doc(db, this.COLLECTION, uid), {
                status: 'INATIVO'
            });

            if (window.AuditService) {
                await window.AuditService.log('DESATIVAR_USUARIO', uid, 'Usuário desativado');
            }

            return { success: true };

        } catch (error) {
            console.error('Erro ao desativar usuário:', error);
            throw new Error(error.message || 'Erro ao desativar usuário');
        }
    },

    /**
     * Excluir usuário (exclusão lógica por padrão)
     */
    async deleteUser(uid, permanent = false) {
        try {
            if (!window.NexusAuthService?.canManageUsers()) {
                throw new Error('Você não tem permissão para excluir usuários');
            }

            // Não permitir excluir a si mesmo
            if (uid === window.NexusAuthService?.currentUser?.uid) {
                throw new Error('Você não pode excluir sua própria conta');
            }

            const user = await this.getUserById(uid);

            if (permanent) {
                // Exclusão física (remover do Firestore)
                await deleteDoc(doc(db, this.COLLECTION, uid));

                // NOTA: Para remover do Firebase Auth, precisaria usar Admin SDK

                if (window.AuditService) {
                    await window.AuditService.log(
                        'EXCLUIR_USUARIO',
                        uid,
                        `Usuário excluído permanentemente: ${user?.nome}`
                    );
                }
            } else {
                // Exclusão lógica (marcar como EXCLUIDO)
                await updateDoc(doc(db, this.COLLECTION, uid), {
                    status: 'EXCLUIDO',
                    data_exclusao: serverTimestamp()
                });

                if (window.AuditService) {
                    await window.AuditService.log(
                        'EXCLUIR_USUARIO',
                        uid,
                        `Usuário marcado como excluído: ${user?.nome}`
                    );
                }
            }

            return { success: true };

        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            throw new Error(error.message || 'Erro ao excluir usuário');
        }
    },

    /**
     * Resetar senha do usuário para a padrão
     */
    async resetUserPassword(uid) {
        try {
            if (!window.NexusAuthService?.canManageUsers()) {
                throw new Error('Você não tem permissão para resetar senhas');
            }

            // Marcar que precisa trocar senha no próximo login
            await updateDoc(doc(db, this.COLLECTION, uid), {
                primeiro_acesso: true
            });

            // NOTA: Para resetar a senha no Firebase Auth, usar sendPasswordResetEmail
            // ou Admin SDK via Cloud Functions

            if (window.AuditService) {
                await window.AuditService.log(
                    'RESET_SENHA',
                    uid,
                    'Senha resetada pelo administrador'
                );
            }

            return { success: true };

        } catch (error) {
            console.error('Erro ao resetar senha:', error);
            throw new Error('Erro ao resetar senha');
        }
    },

    /**
     * Buscar usuários por cargo
     */
    async getUsersByRole(role) {
        try {
            const q = query(
                collection(db, this.COLLECTION),
                where('cargo', '==', role),
                where('status', '==', 'ATIVO')
            );

            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data(),
                initials: this.getInitials(doc.data().nome)
            }));

        } catch (error) {
            console.error('Erro ao buscar usuários por cargo:', error);
            return [];
        }
    },

    /**
     * Buscar usuários ativos
     */
    async getActiveUsers() {
        try {
            const q = query(
                collection(db, this.COLLECTION),
                where('status', '==', 'ATIVO'),
                orderBy('nome')
            );

            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data(),
                initials: this.getInitials(doc.data().nome)
            }));

        } catch (error) {
            console.error('Erro ao buscar usuários ativos:', error);
            return [];
        }
    },

    /**
     * Criar usuário admin inicial (usado apenas na primeira configuração)
     */
    async createInitialAdmin(nome, email, uid) {
        try {
            const userDoc = await getDoc(doc(db, this.COLLECTION, uid));

            if (userDoc.exists()) {
                console.log('Usuário admin já existe');
                return { success: true, exists: true };
            }

            const userData = {
                nome: nome,
                email: email,
                cargo: 'ADMIN',
                status: 'ATIVO',
                primeiro_acesso: true,
                data_criacao: serverTimestamp(),
                ultimo_login: null,
                criado_por: 'SISTEMA'
            };

            await setDoc(doc(db, this.COLLECTION, uid), userData);

            console.log('Usuário admin inicial criado com sucesso');
            return { success: true, created: true };

        } catch (error) {
            console.error('Erro ao criar admin inicial:', error);
            throw error;
        }
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

    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    formatDate(timestamp) {
        if (!timestamp) return 'N/A';

        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000).toLocaleString('pt-BR');
        }

        if (timestamp instanceof Date) {
            return timestamp.toLocaleString('pt-BR');
        }

        return String(timestamp);
    },

    getRoleLabel(roleKey) {
        const role = this.ROLES.find(r => r.key === roleKey);
        return role?.label || roleKey;
    },

    getRoleLevel(roleKey) {
        const role = this.ROLES.find(r => r.key === roleKey);
        return role?.level || 0;
    }
};

// Expor globalmente
window.UserManagement = UserManagement;

export { UserManagement };
