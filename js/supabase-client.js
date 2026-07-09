/**
 * SUPABASE CLIENT - NEP Delivery Control
 * Configuração do cliente Supabase para Storage
 * 
 * Credenciais configuradas para o projeto: ecossistemaanep-hash's Project
 */

const SupabaseConfig = {
  // ============================================
  // 🔧 CREDENCIAIS DO PROJETO
  // ============================================

  // URL do projeto Supabase
  url: 'https://kwmhmurddlxuewbyobgr.supabase.co',

  // Chave pública (anon/publishable key) - SEGURO expor no frontend
  anonKey: 'sb_publishable_hMzgx7vSIY2M3k5xDT13Rg_Z1f4UY0P',

  // ============================================
  // Buckets configurados
  // ============================================
  buckets: {
    avatars: 'avatars',           // Fotos de perfil (público)
    attachments: 'attachments'    // Anexos gerais (autenticado)
  }
};

/**
 * Cliente Supabase Singleton
 */
const SupabaseClient = {
  _client: null,
  _initialized: false,

  /**
   * Inicializa o cliente Supabase
   * @returns {Object} Cliente Supabase
   */
  init() {
    if (this._client) return this._client;

    // Verifica se o SDK foi carregado
    if (typeof supabase === 'undefined') {
      console.error('[Supabase] SDK não carregado. Verifique se o script foi incluído no HTML.');
      return null;
    }

    // Verifica credenciais
    if (SupabaseConfig.url.includes('SEU_PROJETO') || SupabaseConfig.anonKey.includes('SUA_ANON')) {
      console.warn('[Supabase] ⚠️ Credenciais não configuradas! Edite js/supabase-client.js');
      return null;
    }

    try {
      this._client = supabase.createClient(SupabaseConfig.url, SupabaseConfig.anonKey);
      this._initialized = true;
      window.sb = this._client; // Shortcut
      window.supabaseClient = this._client; // Standard expected by modules
      console.log('[Supabase] ✅ Cliente inicializado com sucesso!');
      return this._client;
    } catch (error) {
      console.error('[Supabase] ❌ Erro ao inicializar:', error);
      return null;
    }
  },

  /**
   * Retorna se o cliente está configurado e pronto
   */
  get isReady() {
    return this._initialized && this._client !== null;
  },

  /**
   * Retorna o cliente Supabase
   */
  get client() {
    if (!this._client) this.init();
    return this._client;
  },

  /**
   * Atalho para o módulo de Storage
   */
  get storage() {
    const client = this.client;
    return client ? client.storage : null;
  },

  /**
   * Retorna a configuração de buckets
   */
  get buckets() {
    return SupabaseConfig.buckets;
  },

  /**
   * Verifica se as credenciais estão configuradas
   */
  isConfigured() {
    return !SupabaseConfig.url.includes('SEU_PROJETO') &&
      !SupabaseConfig.anonKey.includes('SUA_ANON');
  }
};

// Expor globalmente
window.SupabaseConfig = SupabaseConfig;
window.SupabaseClient = SupabaseClient;

// Auto-inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  if (SupabaseClient.isConfigured()) {
    SupabaseClient.init();
  } else {
    console.info('[Supabase] 💡 Para ativar o storage, configure suas credenciais em js/supabase-client.js');
  }
});

console.log('[Supabase] 📦 Módulo carregado');
