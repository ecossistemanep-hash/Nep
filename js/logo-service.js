/**
 * NEP PLATFORM - LOGO SERVICE
 * Serviço centralizado para gestão de Logos (multi-tenancy)
 * 
 * Logos = Clientes/Produtos (ex: NUBANK, VIVO, etc)
 * Cada usuário pode pertencer a múltiplas logos.
 * ADMIN e DIRETOR veem tudo; demais veem só suas logos.
 */

const LogoService = {
    COLLECTION: 'logos',
    _cache: null,
    _cacheTime: 0,
    CACHE_TTL: 60000, // 1 min

    // ═══════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════

    _getDb() {
        return window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
    },

    _getTimestamp() {
        if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
            return firebase.firestore.FieldValue.serverTimestamp();
        }
        return new Date();
    },

    // ═══════════════════════════════════════════
    // LOGOS DO USUÁRIO LOGADO
    // ═══════════════════════════════════════════

    /**
     * Retorna as logos do usuário logado (do localStorage)
     * @returns {string[]} Array de logos
     */
    getMyLogos() {
        try {
            const raw = localStorage.getItem('nep_user_logos');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) { }
        // Fallback: tentar campo setor antigo
        const setor = localStorage.getItem('nep_user_setor');
        return setor ? [setor] : [];
    },

    /**
     * Retorna o cargo do usuário logado
     * @returns {string}
     */
    getMyRole() {
        return (localStorage.getItem('nep_user_role_key') || 'analista').toUpperCase();
    },

    /**
     * Verifica se o usuário logado é ADMIN ou DIRETOR (vê tudo)
     * @returns {boolean}
     */
    isGlobalViewer() {
        const role = this.getMyRole();
        return role === 'ADMIN' || role === 'DIRETOR' || role === 'SUPERINTENDENTE';
    },

    /**
     * Verifica se o sistema deve filtrar por logo para o usuário logado
     * @returns {boolean} true se precisa filtrar
     */
    shouldFilterByLogo() {
        return !this.isGlobalViewer();
    },

    // ═══════════════════════════════════════════
    // FILTRAGEM DE ENTIDADES
    // ═══════════════════════════════════════════

    /**
     * Verifica se uma entidade é visível para o usuário logado.
     * A entidade pode ter `logo` (string) ou `logos` (array).
     * Se a entidade não tiver logo, é visível para todos.
     * 
     * @param {Object} entity - Objeto com campo `logo` ou `logos`
     * @returns {boolean}
     */
    canSeeEntity(entity) {
        if (!this.shouldFilterByLogo()) return true;

        const entityLogos = this._getEntityLogos(entity);
        if (!entityLogos || entityLogos.length === 0) {
            // Semi-Trust (Fallback Legado): Se a tarefa/entidade NÃO tem dono explícito, todos da unidade veem.
            return true;
        }

        const myLogos = this.getMyLogos();
        // Se a entidade TEM dono explícito (ex: NUBANK), mas eu NÃO tenho uma logo assinalada (conta sem migração), eu NÃO vejo.
        // Assim NUBANK não vaza para quem não tem.
        if (!myLogos || myLogos.length === 0) return false;

        const normMyLogos = myLogos.map(l => String(l).toUpperCase().trim());
        const normEntityLogos = entityLogos.map(l => String(l).toUpperCase().trim());

        return normEntityLogos.some(l => normMyLogos.includes(l));
    },

    /**
     * Verifica se um usuário pertence a alguma das minhas logos.
     * Útil para filtrar tarefas por owner.
     * 
     * @param {Object} user - Objeto do usuário com `logos` ou `setor`
     * @returns {boolean}
     */
    canSeeUser(user) {
        if (!this.shouldFilterByLogo()) return true;

        const userLogos = this._getUserLogos(user);

        // Semi-Trust (Fallback Legado): Se o funcionário-alvo NÃO pertence a uma Logo de Fato (não preencheu), TODOS o enxergam para transferências.
        // Isso impede do modal sumir com o corpo de analistas e coordenadores clássicos.
        if (!userLogos || userLogos.length === 0) return true;

        const myLogos = this.getMyLogos();

        // Se o ator-alvo TEM uma logo (ex NUBANK), e *EU* ainda não tenho NENHUMA logo preenchida, não vejo ele.
        if (!myLogos || myLogos.length === 0) return false;

        const normMyLogos = myLogos.map(l => String(l).toUpperCase().trim());
        const normUserLogos = userLogos.map(l => String(l).toUpperCase().trim());

        const isVisible = normUserLogos.some(l => normMyLogos.includes(l));

        // DEBUG LOG PARA ACHAR O PROBLEMA DO COORDENADOR
        if (normMyLogos.includes('VIVO') || normMyLogos.includes('HUB')) {
            console.log(`[CanSeeUser] Avaliando: ${user.nome} | UserLogos:`, normUserLogos, `| MyLogos:`, normMyLogos, `| Result: ${isVisible}`);
        }

        // Somente se houver compatibilidade explícita de Logo
        return isVisible;
    },

    /**
     * Filtra um array de entidades pelas logos do usuário logado.
     * 
     * @param {Array} list - Array de entidades
     * @returns {Array} Lista filtrada
     */
    filterByLogo(list) {
        if (!this.shouldFilterByLogo()) return list;
        return list.filter(e => this.canSeeEntity(e));
    },

    /**
     * Filtra um array de usuários pelas logos do usuário logado.
     * 
     * @param {Array} users - Array de usuários
     * @returns {Array} Lista filtrada
     */
    filterUsersByLogo(users) {
        if (!this.shouldFilterByLogo()) return users;
        return users.filter(u => this.canSeeUser(u));
    },

    /**
     * Extrai logos de uma entidade genérica
     * @private
     */
    _getEntityLogos(entity) {
        if (!entity) return [];
        let rawLogos = [];
        if (Array.isArray(entity.logos) && entity.logos.length > 0) rawLogos = entity.logos;
        else if (entity.logo) rawLogos = [entity.logo];
        else if (entity.setor) rawLogos = [entity.setor];
        else if (entity.produto) rawLogos = [entity.produto];

        // Remove valores nulos, undefined ou strings vazias/apenas espaços
        return [...new Set(rawLogos.map(l => String(l || '').trim()).filter(l => l !== ''))];
    },

    /**
     * Extrai logos de um objeto de usuário
     * @private
     */
    _getUserLogos(user) {
        if (!user) return [];
        let rawLogos = [];
        if (Array.isArray(user.logos) && user.logos.length > 0) rawLogos = user.logos;
        else if (user.setor) rawLogos = [user.setor];
        else if (user.produto) rawLogos = [user.produto];

        // Remove valores nulos, undefined ou strings vazias/apenas espaços
        return [...new Set(rawLogos.map(l => String(l || '').trim()).filter(l => l !== ''))];
    },

    // ═══════════════════════════════════════════
    // CRUD DE LOGOS (Collection Firestore)
    // ═══════════════════════════════════════════

    /**
     * Listar todas as logos disponíveis
     * @returns {Promise<Array>}
     */
    async listLogos(forceRefresh = false) {
        const db = this._getDb();
        if (!db) return [];

        // Cache
        if (!forceRefresh && this._cache && (Date.now() - this._cacheTime) < this.CACHE_TTL) {
            return this._cache;
        }

        try {
            const snap = await db.collection(this.COLLECTION).orderBy('name').get();
            const logos = [];
            snap.forEach(doc => logos.push({ id: doc.id, ...doc.data() }));
            this._cache = logos;
            this._cacheTime = Date.now();
            return logos;
        } catch (error) {
            console.error('[LogoService] Erro ao listar logos:', error);
            return [];
        }
    },

    /**
     * Criar nova logo
     * @param {string} name - Nome da logo (ex: "NUBANK")
     * @param {string} [color] - Cor hex opcional
     * @returns {Promise<Object>}
     */
    async createLogo(name, color = null) {
        const db = this._getDb();
        if (!db) throw new Error('Banco de dados não disponível');

        const normalizedName = name.trim().toUpperCase();

        // Verificar duplicata
        const existing = await db.collection(this.COLLECTION)
            .where('name', '==', normalizedName).get();
        if (!existing.empty) {
            throw new Error(`Logo "${normalizedName}" já existe`);
        }

        const docData = {
            name: normalizedName,
            color: color || this._generateColor(normalizedName),
            active: true,
            created_at: this._getTimestamp(),
            created_by: localStorage.getItem('nep_user_uid') || 'SISTEMA'
        };

        const ref = await db.collection(this.COLLECTION).add(docData);
        this._cache = null; // Invalidar cache

        console.log(`[LogoService] Logo criada: ${normalizedName}`);
        return { id: ref.id, ...docData };
    },

    /**
     * Excluir uma logo
     * @param {string} logoId - ID do doc
     */
    async deleteLogo(logoId) {
        const db = this._getDb();
        if (!db) throw new Error('Banco de dados não disponível');

        await db.collection(this.COLLECTION).doc(logoId).delete();
        this._cache = null;
        console.log(`[LogoService] Logo excluída: ${logoId}`);
    },

    // ═══════════════════════════════════════════
    // ATRIBUIÇÃO DE LOGOS A USUÁRIOS
    // ═══════════════════════════════════════════

    /**
     * Definir logos de um usuário (substitui todas)
     * @param {string} uid - UID do usuário
     * @param {string[]} logos - Array de nomes de logos
     */
    async setUserLogos(uid, logos) {
        const db = this._getDb();
        if (!db) throw new Error('Banco de dados não disponível');

        const normalized = logos.map(l => l.trim().toUpperCase()).filter(Boolean);

        await db.collection('users').doc(uid).update({
            logos: normalized,
            setor: normalized[0] || '' // Manter compatibilidade
        });

        console.log(`[LogoService] Logos de ${uid} atualizadas:`, normalized);
        return { success: true };
    },

    /**
     * Obter logos de um usuário específico
     * @param {string} uid
     * @returns {Promise<string[]>}
     */
    async getUserLogos(uid) {
        const db = this._getDb();
        if (!db) return [];

        try {
            const docSnap = await db.collection('users').doc(uid).get();
            if (!docSnap.exists) return [];
            return this._getUserLogos(docSnap.data());
        } catch (error) {
            console.error('[LogoService] Erro ao obter logos do usuário:', error);
            return [];
        }
    },

    // ═══════════════════════════════════════════
    // LOGOS ACESSÍVEIS (para filtros dropdown)
    // ═══════════════════════════════════════════

    /**
     * Retorna as logos que o usuário pode ver nos filtros.
     * ADMIN/DIRETOR veem todas; demais veem só suas.
     * @returns {Promise<Array>}
     */
    async getAccessibleLogos() {
        const allLogos = await this.listLogos();

        if (this.isGlobalViewer()) {
            return allLogos;
        }

        let myLogos = this.getMyLogos();

        // Fallback: Se o LocalStorage estiver obsoleto e sinto que está vazio, leio do Firestore para garantir
        if ((!myLogos || myLogos.length === 0) && window.db) {
            const myUid = localStorage.getItem('nep_user_uid');
            if (myUid) {
                try {
                    const doc = await window.db.collection('users').doc(myUid).get();
                    if (doc.exists) {
                        const data = doc.data();
                        myLogos = this._getUserLogos(data);
                        // Atualiza o cache silenciosamente pro resto usar
                        if (myLogos.length > 0) {
                            localStorage.setItem('nep_user_logos', JSON.stringify(myLogos));
                        }
                    }
                } catch (e) {
                    console.warn('[LogoService] Fallback db falhou', e);
                }
            }
        }

        if (!myLogos || myLogos.length === 0) return []; // Retorna vazio se não tiver logo nenhuma alocada pra mim.

        const normMyLogos = myLogos.map(l => String(l).toUpperCase().trim());
        return allLogos.filter(l => normMyLogos.includes(String(l.name).toUpperCase().trim()));
    },

    // ═══════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════

    /**
     * Gera uma cor baseada no nome
     * @private
     */
    _generateColor(name) {
        const colors = [
            '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
            '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
            '#f97316', '#6366f1', '#14b8a6', '#a855f7'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    },

    /**
     * Mapa de usuários por logo (útil para admin analytics)
     * @param {Array} users - Lista de usuários
     * @returns {Object} { logoName: [users] }
     */
    groupUsersByLogo(users) {
        const groups = {};
        for (const user of users) {
            const logos = this._getUserLogos(user);
            if (logos.length === 0) {
                if (!groups['Sem Logo']) groups['Sem Logo'] = [];
                groups['Sem Logo'].push(user);
            } else {
                for (const logo of logos) {
                    if (!groups[logo]) groups[logo] = [];
                    groups[logo].push(user);
                }
            }
        }
        return groups;
    }
};

// Expor globalmente
window.LogoService = LogoService;
