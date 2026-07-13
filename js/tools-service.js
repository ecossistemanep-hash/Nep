/**
 * TOOLS SERVICE - NEP Delivery Control
 * Serviço centralizado para CRUD de ferramentas com Supabase + Fallback localStorage
 * 
 * Ferramentas com persistência:
 * - PDCA, DMAIC, Ishikawa, GUT, Pareto, 5 Porquês, Carta de Controle
 */

const ToolsService = {
  // ============================================
  // CONFIGURAÇÃO
  // ============================================

  TOOLS_CONFIG: {
    pdca: { name: 'Estruturador PDCA', icon: 'fa-arrows-spin', category: 'Qualidade', color: '#3b82f6' },
    dmaic: { name: 'Estruturador DMAIC', icon: 'fa-diagram-project', category: 'Qualidade', color: '#ef4444' },
    ishikawa: { name: 'Diagrama de Ishikawa', icon: 'fa-fish', category: 'Qualidade', color: '#0ea5e9' },
    gut: { name: 'Matriz GUT', icon: 'fa-ranking-star', category: 'Qualidade', color: '#7555e8' },
    pareto: { name: 'Diagrama de Pareto', icon: 'fa-chart-bar', category: 'Análise', color: '#14b8a6' },
    cincoporques: { name: '5 Porquês', icon: 'fa-question', category: 'Qualidade', color: '#84cc16' },
    cartacontrole: { name: 'Carta de Controle', icon: 'fa-chart-line', category: 'CEP', color: '#7555e8' },
    correlacao: { name: 'NEP Correlação', icon: 'fa-chart-line', category: 'Estatística', color: '#9c5cff' },
    factibilidade: { name: 'Calculadora de Factibilidade', icon: 'fa-calculator', category: 'Metas', color: '#22c55e' },
    senha: { name: 'Gerador de Senha', icon: 'fa-key', category: 'Segurança', color: '#f59e0b' },
    compressor: { name: 'Compressor de Vídeo', icon: 'fa-video', category: 'Multimídia', color: '#ec4899' },
    cronometro: { name: 'Cronômetro/Pomodoro', icon: 'fa-stopwatch', category: 'Produtividade', color: '#f43f5e' },
    news_br: { name: 'NEP News Brasil', icon: 'fa-newspaper', category: 'API', color: '#ef4444' },
    news_world: { name: 'NEP Mundo Updates', icon: 'fa-globe', category: 'API', color: '#9c5cff' },
    dict: { name: 'NEP Dicionário', icon: 'fa-book-bookmark', category: 'API', color: '#10b981' },
    brasil: { name: 'NEP Brasil Data', icon: 'fa-flag', category: 'API', color: '#f59e0b' },
    fluxograma: { name: 'Criador de Fluxograma', icon: 'fa-diagram-project', category: 'Visualização', color: '#06b6d4' },
    geradorgraficos: { name: 'Gerador de Gráficos', icon: 'fa-chart-pie', category: 'Visualização', color: '#f97316' },
    nexus: { name: 'NEP Nexus', icon: 'fa-atom', category: 'Visualização', color: '#06b6d4' }
  },

  // Ferramentas que usam Supabase para persistência
  SUPABASE_TOOLS: ['pdca', 'dmaic', 'ishikawa', 'gut', 'pareto', 'cincoporques', 'cartacontrole'],

  // Cache de permissões
  _permissions: null,
  _permissionsLoaded: false,

  // ============================================
  // PERMISSÕES (Firestore)
  // ============================================

  /**
   * Carrega permissões de ferramentas do Supabase
   * @returns {Promise<Object>} Mapa de permissões por ferramenta
   */
  async loadPermissions() {
    if (this._permissionsLoaded && this._permissions) {
      return this._permissions;
    }

    try {
      const sb = this._getSupabase();
      if (!sb) {
        console.warn('[ToolsService] Supabase não disponível, usando defaults');
        return this._getDefaultPermissions();
      }

      const { data, error } = await sb.from('tool_permissions').select('*');

      if (error) throw error;

      this._permissions = {};

      // Mapear do DB (snake_case) para App (camelCase)
      data.forEach(row => {
        this._permissions[row.tool_id] = {
          id: row.tool_id,
          enabled: row.enabled,
          allowedRoles: row.allowed_roles,
          updatedAt: row.updated_at
        };
      });

      // Se não houver nada no banco, inicializar defaults
      if (Object.keys(this._permissions).length === 0) {
        this._permissions = this._getDefaultPermissions();
        await this.initializeDefaultPermissions();
      } else {
        // Garantir que novas ferramentas (que não estão no banco) apareçam com default
        const defaults = this._getDefaultPermissions();
        for (const [key, val] of Object.entries(defaults)) {
          if (!this._permissions[key]) {
            this._permissions[key] = val;
            // Opcional: Salvar este novo default no banco
          }
          // Merge de dados estáticos (nome, icone) com dados do banco (permissões)
          this._permissions[key] = { ...val, ...this._permissions[key] };
        }
      }

      this._permissionsLoaded = true;
      console.log('[ToolsService] ✅ Permissões carregadas (Supabase):', Object.keys(this._permissions).length);
      return this._permissions;

    } catch (error) {
      console.error('[ToolsService] Erro ao carregar permissões:', error);
      return this._getDefaultPermissions();
    }
  },

  /**
   * Retorna permissões default (todas habilitadas para todos)
   */
  _getDefaultPermissions() {
    const defaults = {};
    const allRoles = ['ADMIN', 'DIRETOR', 'SUPERINTENDENTE', 'GERENTE', 'CONSULTOR', 'COORDENADOR', 'ANALISTA', 'MONITOR'];

    for (const [toolId, config] of Object.entries(this.TOOLS_CONFIG)) {
      defaults[toolId] = {
        id: toolId,
        name: config.name,
        icon: config.icon,
        category: config.category,
        color: config.color,
        enabled: true,
        allowedRoles: allRoles
      };
    }
    return defaults;
  },

  /**
   * Inicializa permissões default no Supabase
   */
  async initializeDefaultPermissions() {
    try {
      const sb = this._getSupabase();
      if (!sb) return;

      const defaults = this._getDefaultPermissions();
      const rows = [];

      for (const [toolId, config] of Object.entries(defaults)) {
        rows.push({
          tool_id: toolId,
          enabled: config.enabled,
          allowed_roles: config.allowedRoles,
          updated_at: new Date().toISOString()
        });
      }

      const { error } = await sb.from('tool_permissions').upsert(rows);

      if (error) throw error;

      console.log('[ToolsService] ✅ Permissões default inicializadas no Supabase');
    } catch (error) {
      console.error('[ToolsService] Erro ao inicializar permissões:', error);
    }
  },

  /**
   * Atualiza permissão de uma ferramenta
   * @param {string} toolId - ID da ferramenta
   * @param {Object} updates - Campos a atualizar
   */
  async updatePermission(toolId, updates) {
    try {
      const sb = this._getSupabase();
      if (!sb) throw new Error('Supabase não disponível');

      const dbUpdates = {
        updated_at: new Date().toISOString()
      };

      if (typeof updates.enabled !== 'undefined') dbUpdates.enabled = updates.enabled;
      if (updates.allowedRoles) dbUpdates.allowed_roles = updates.allowedRoles;

      const { error } = await sb.from('tool_permissions').upsert({
        tool_id: toolId,
        ...dbUpdates
      });

      if (error) throw error;

      // Atualiza cache local
      if (this._permissions && this._permissions[toolId]) {
        Object.assign(this._permissions[toolId], updates);
      } else if (this._permissions) {
        // Se não existia no cache
        this._permissions[toolId] = { id: toolId, ...updates };
      }

      console.log(`[ToolsService] ✅ Permissão atualizada: ${toolId}`);
      return true;

    } catch (error) {
      console.error('[ToolsService] Erro ao atualizar permissão:', error);
      throw error;
    }
  },

  /**
   * Verifica se usuário pode acessar uma ferramenta
   * @param {string} toolId - ID da ferramenta
   * @param {string} userRole - Cargo do usuário
   * @returns {boolean}
   */
  canAccessTool(toolId, userRole) {
    if (!this._permissions || !this._permissions[toolId]) {
      return true; // Default: permite acesso
    }

    const perm = this._permissions[toolId];

    if (!perm.enabled) return false;
    if (!perm.allowedRoles || perm.allowedRoles.length === 0) return true;

    return perm.allowedRoles.includes(userRole?.toUpperCase());
  },

  /**
   * Retorna lista de ferramentas visíveis para o usuário
   * @param {string} userRole - Cargo do usuário
   * @returns {Array}
   */
  getVisibleTools(userRole) {
    const visible = [];

    for (const [toolId, config] of Object.entries(this.TOOLS_CONFIG)) {
      if (this.canAccessTool(toolId, userRole)) {
        visible.push({ id: toolId, ...config });
      }
    }

    return visible;
  },

  // ============================================
  // CRUD SUPABASE - GENÉRICO
  // ============================================

  /**
   * Helper para obter cliente Supabase
   */
  _getSupabase() {
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isReady) {
      return SupabaseClient.client;
    }
    return null;
  },

  /**
   * Helper para obter ID do usuário atual
   */
  _getCurrentUserId() {
    if (typeof auth !== 'undefined' && auth.currentUser) {
      return auth.currentUser.uid;
    }
    if (typeof getCurrentUser === 'function') {
      const user = getCurrentUser();
      return user?.uid;
    }
    return null;
  },

  /**
   * Salva dados de uma ferramenta
   * @param {string} tool - Nome da ferramenta (pdca, dmaic, etc)
   * @param {Object} data - Dados a salvar
   * @param {string} id - ID opcional (para updates)
   */
  async save(tool, data, id = null) {
    const userId = this._getCurrentUserId();
    if (!userId) {
      console.warn('[ToolsService] Usuário não autenticado, usando localStorage');
      return this._saveLocal(tool, data, id);
    }

    const sb = this._getSupabase();
    if (!sb) {
      console.warn('[ToolsService] Supabase não disponível, usando localStorage');
      return this._saveLocal(tool, data, id);
    }

    const tableName = `tool_${tool}`;
    const record = {
      ...data,
      user_id: userId,
      updated_at: new Date().toISOString()
    };

    try {
      let result;

      if (id) {
        // Update
        result = await sb.from(tableName).update(record).eq('id', id).select().single();
      } else {
        // Insert
        record.created_at = new Date().toISOString();
        result = await sb.from(tableName).insert(record).select().single();
      }

      if (result.error) throw result.error;

      console.log(`[ToolsService] ✅ ${tool} salvo:`, result.data.id);
      return result.data;

    } catch (error) {
      console.error(`[ToolsService] Erro ao salvar ${tool}:`, error);
      // Fallback para localStorage
      return this._saveLocal(tool, data, id);
    }
  },

  /**
   * Carrega dados de uma ferramenta
   * @param {string} tool - Nome da ferramenta
   * @param {string} id - ID do registro (opcional)
   */
  async load(tool, id = null) {
    const userId = this._getCurrentUserId();
    const sb = this._getSupabase();

    if (!sb || !userId) {
      return this._loadLocal(tool, id);
    }

    const tableName = `tool_${tool}`;

    try {
      let query = sb.from(tableName).select('*').eq('user_id', userId);

      if (id) {
        query = query.eq('id', id).single();
      } else {
        query = query.order('updated_at', { ascending: false });
      }

      const result = await query;

      if (result.error) throw result.error;
      return result.data;

    } catch (error) {
      console.error(`[ToolsService] Erro ao carregar ${tool}:`, error);
      return this._loadLocal(tool, id);
    }
  },

  /**
   * Lista todos os registros de uma ferramenta do usuário
   * @param {string} tool - Nome da ferramenta
   */
  async list(tool) {
    const userId = this._getCurrentUserId();
    const sb = this._getSupabase();

    if (!sb || !userId) {
      return this._listLocal(tool);
    }

    const tableName = `tool_${tool}`;

    try {
      const result = await sb
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (result.error) throw result.error;
      return result.data || [];

    } catch (error) {
      console.error(`[ToolsService] Erro ao listar ${tool}:`, error);
      return this._listLocal(tool);
    }
  },

  /**
   * Deleta um registro
   * @param {string} tool - Nome da ferramenta
   * @param {string} id - ID do registro
   */
  async delete(tool, id) {
    const sb = this._getSupabase();

    if (!sb) {
      return this._deleteLocal(tool, id);
    }

    const tableName = `tool_${tool}`;

    try {
      const result = await sb.from(tableName).delete().eq('id', id);

      if (result.error) throw result.error;
      console.log(`[ToolsService] ✅ ${tool} deletado:`, id);
      return true;

    } catch (error) {
      console.error(`[ToolsService] Erro ao deletar ${tool}:`, error);
      return this._deleteLocal(tool, id);
    }
  },

  // ============================================
  // FALLBACK localStorage
  // ============================================

  _getLocalKey(tool) {
    return `nep_tool_${tool}`;
  },

  _saveLocal(tool, data, id = null) {
    const key = this._getLocalKey(tool);
    let records = JSON.parse(localStorage.getItem(key) || '[]');

    const record = {
      ...data,
      id: id || `local_${Date.now()}`,
      updated_at: new Date().toISOString()
    };

    if (id) {
      const idx = records.findIndex(r => r.id === id);
      if (idx >= 0) {
        records[idx] = record;
      } else {
        records.push(record);
      }
    } else {
      record.created_at = new Date().toISOString();
      records.push(record);
    }

    localStorage.setItem(key, JSON.stringify(records));
    console.log(`[ToolsService] 💾 ${tool} salvo localmente:`, record.id);
    return record;
  },

  _loadLocal(tool, id = null) {
    const key = this._getLocalKey(tool);
    const records = JSON.parse(localStorage.getItem(key) || '[]');

    if (id) {
      return records.find(r => r.id === id) || null;
    }
    return records;
  },

  _listLocal(tool) {
    const key = this._getLocalKey(tool);
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  _deleteLocal(tool, id) {
    const key = this._getLocalKey(tool);
    let records = JSON.parse(localStorage.getItem(key) || '[]');
    records = records.filter(r => r.id !== id);
    localStorage.setItem(key, JSON.stringify(records));
    return true;
  },

  // ============================================
  // MÉTODOS ESPECÍFICOS POR FERRAMENTA
  // ============================================

  // PDCA
  async savePDCA(data) { return this.save('pdca', data, data.id); },
  async loadPDCA(id) { return this.load('pdca', id); },
  async listPDCAs() { return this.list('pdca'); },
  async deletePDCA(id) { return this.delete('pdca', id); },

  // DMAIC
  async saveDMAIC(data) { return this.save('dmaic', data, data.id); },
  async loadDMAIC(id) { return this.load('dmaic', id); },
  async listDMAICs() { return this.list('dmaic'); },
  async deleteDMAIC(id) { return this.delete('dmaic', id); },

  // Ishikawa
  async saveIshikawa(data) { return this.save('ishikawa', data, data.id); },
  async loadIshikawa(id) { return this.load('ishikawa', id); },
  async listIshikawas() { return this.list('ishikawa'); },
  async deleteIshikawa(id) { return this.delete('ishikawa', id); },

  // GUT
  async saveGUT(data) { return this.save('gut', data, data.id); },
  async loadGUT(id) { return this.load('gut', id); },
  async listGUTs() { return this.list('gut'); },
  async deleteGUT(id) { return this.delete('gut', id); },

  // Pareto
  async savePareto(data) { return this.save('pareto', data, data.id); },
  async loadPareto(id) { return this.load('pareto', id); },
  async listParetos() { return this.list('pareto'); },
  async deletePareto(id) { return this.delete('pareto', id); },

  // 5 Porquês
  async save5Porques(data) { return this.save('cincoporques', data, data.id); },
  async load5Porques(id) { return this.load('cincoporques', id); },
  async list5Porques() { return this.list('cincoporques'); },
  async delete5Porques(id) { return this.delete('cincoporques', id); },

  // Carta de Controle
  async saveCartaControle(data) { return this.save('cartacontrole', data, data.id); },
  async loadCartaControle(id) { return this.load('cartacontrole', id); },
  async listCartasControle() { return this.list('cartacontrole'); },
  async deleteCartaControle(id) { return this.delete('cartacontrole', id); }
};

// Expor globalmente
window.ToolsService = ToolsService;

console.log('[ToolsService] 🛠️ Módulo carregado');
