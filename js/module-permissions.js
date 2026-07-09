/**
 * Módulo de Permissões (Dummy)
 * Criado para resolver erro de carregamento 404
 */

export const ModulePermissions = {
    checkContext: (context) => true,
    validateAccess: (level) => true
};

export default ModulePermissions;
