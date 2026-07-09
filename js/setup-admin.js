/**
 * NEP DELIVERY CONTROL - SETUP INITIAL ADMIN
 * Script para criar/corrigir o usuário administrador inicial
 *
 * Projeto Firebase: ecossistema-nep (plano Spark)
 *
 * INSTRUÇÕES:
 * 1. O usuário já foi criado no Firebase Authentication:
 *    - Email: ecossistemanep@gmail.com
 *    - UID:   rRo82JOE1bUYJDSQUOnwSyzHRG32
 * 2. Acesse setup-admin.html e clique em "Criar Admin" (o UID já vem preenchido)
 * 3. O script cria o documento users/{uid} ou COMPLETA campos que faltarem
 *    (nome, cargo ADMIN, status ATIVO) sem apagar dados existentes
 */

import {
    db,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from './firebase-config.js';

const DEFAULT_ADMIN_UID = "rRo82JOE1bUYJDSQUOnwSyzHRG32";

const ADMIN_DATA = {
    nome: "Administrador Ecossistema NEP",
    email: "ecossistemanep@gmail.com",
    cargo: "ADMIN",
    status: "ATIVO",
    primeiro_acesso: true,
    data_criacao: serverTimestamp(),
    ultimo_login: null,
    criado_por: "SISTEMA"
};

async function setupInitialAdmin(uid) {
    try {
        const targetUid = uid || DEFAULT_ADMIN_UID;
        const userRef = doc(db, 'users', targetUid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const data = userDoc.data();
            // Documento existe mas pode estar sem os campos que o sistema
            // usa (nome/cargo/status) — completa com merge, sem sobrescrever
            const patch = {};
            if (!data.cargo) patch.cargo = 'ADMIN';
            if (!data.status) patch.status = 'ATIVO';
            if (!data.nome) patch.nome = data.displayName || ADMIN_DATA.nome;
            if (!data.email) patch.email = ADMIN_DATA.email;

            if (Object.keys(patch).length > 0) {
                await setDoc(userRef, patch, { merge: true });
                console.log('✅ Perfil admin existente corrigido:', patch);
                return { success: true, exists: true, patched: true };
            }

            console.log('✅ Usuário admin já existe no Firestore');
            return { success: true, exists: true };
        }

        // Criar documento
        await setDoc(userRef, ADMIN_DATA);

        console.log('✅ Usuário admin criado com sucesso!');
        console.log('📧 Email:', ADMIN_DATA.email);
        console.log('👤 Nome:', ADMIN_DATA.nome);

        return { success: true, created: true };

    } catch (error) {
        console.error('❌ Erro ao criar admin:', error);
        throw error;
    }
}

// Expor globalmente
window.setupInitialAdmin = setupInitialAdmin;
window.ADMIN_DATA = ADMIN_DATA;

export { setupInitialAdmin, ADMIN_DATA };
