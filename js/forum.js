/**
 * NEXUS PLATFORM - FORUM
 * Fórum Colaborativo com Supabase
 * Migrado de Firestore para Supabase
 */

const NexusForum = {
  // SEGURANÇA: escape anti-XSS para conteúdo de tópicos/respostas
  _esc(v) {
    if (window.escapeHtml) return window.escapeHtml(v);
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  currentCategory: 'all',
  currentTopic: null,
  searchQuery: '',
  topics: [],
  replies: [],

  // Supabase client reference
  supabase: null,

  // ATTACHMENTS STATE & HELPERS
  fileState: { topic: [], reply: [] },

  // Categories
  categories: [
    { id: 'processos', name: 'Processos', icon: '📋', color: 'primary' },
    { id: 'qualidade', name: 'Qualidade', icon: '✅', color: 'success' },
    { id: 'operacoes', name: 'Operações', icon: '⚙️', color: 'warning' },
    { id: 'duvidas', name: 'Dúvidas', icon: '❓', color: 'info' },
    { id: 'sugestoes', name: 'Sugestões', icon: '💡', color: 'accent' },
    { id: 'geral', name: 'Geral', icon: '💬', color: 'secondary' }
  ],

  // Initialize Supabase
  init() {
    if (window.supabaseClient) {
      this.supabase = window.supabaseClient;
      console.log('[Forum] Supabase inicializado');
      return true;
    }
    console.warn('[Forum] Supabase não disponível');
    return false;
  },

  getCurrentUser() {
    const user = NepAuth?.getUser?.();
    if (user) {
      return {
        uid: user.id || user.uid || localStorage.getItem('nep_user_uid') || 'unknown',
        nome: user.name || user.nome || localStorage.getItem('nep_user_name') || 'Usuário',
        cargo: user.cargo || user.roleKey || localStorage.getItem('nep_user_label') || 'Colaborador',
        initials: (user.name || user.nome || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      };
    }
    return {
      uid: localStorage.getItem('nep_user_uid') || 'unknown',
      nome: localStorage.getItem('nep_user_name') || 'Usuário',
      cargo: localStorage.getItem('nep_user_label') || 'Colaborador',
      initials: (localStorage.getItem('nep_user_name') || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    };
  },

  // ============ FILE HANDLING ============
  handleFileSelect(type, input) {
    if (input.files && input.files.length > 0) {
      Array.from(input.files).forEach(f => {
        if (f.size > 5 * 1024 * 1024) {
          NexusApp?.showToast?.(`Arquivo ${f.name} excede 5MB`, 'error');
          return;
        }
        if (!this.fileState[type].some(exist => exist.name === f.name)) {
          this.fileState[type].push(f);
        }
      });
      this.renderAttachmentsPreview(type);
    }
    input.value = '';
  },

  fileRemove(type, index) {
    this.fileState[type].splice(index, 1);
    this.renderAttachmentsPreview(type);
  },

  renderAttachmentsPreview(type) {
    const containerId = type === 'topic' ? 'topic-attachments-preview' : 'reply-attachments-preview';
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    const files = this.fileState[type];

    if (files.length === 0) return;

    files.forEach((file, idx) => {
      const div = document.createElement('div');
      div.className = 'forum-attach-preview-item';
      div.innerHTML = `
        <span>${file.name}</span>
        <button onclick="NexusForum.fileRemove('${type}', ${idx})" type="button" style="background:none; border:none; color:#ef4444; cursor:pointer;">&times;</button>
      `;
      container.appendChild(div);
    });
  },

  async uploadAttachments(type, parentId) {
    const files = this.fileState[type];
    console.log('[Forum] uploadAttachments chamado:', { type, parentId, filesCount: files.length });

    if (files.length === 0) {
      console.log('[Forum] Sem arquivos para upload');
      return false;
    }

    if (!this.supabase) {
      console.error('[Forum] Supabase não disponível!');
      NexusApp?.showToast?.('Erro: Supabase não conectado', 'error');
      return false;
    }

    const user = this.getCurrentUser();
    let uploaded = false;

    for (const file of files) {
      try {
        console.log('[Forum] Enviando arquivo:', file.name, file.size, 'bytes');

        const fileExt = file.name.split('.').pop();
        const fileName = `${parentId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        console.log('[Forum] Path do arquivo:', fileName);

        // Upload to Supabase Storage
        const { data, error } = await this.supabase.storage
          .from('forum-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('[Forum] Erro no upload storage:', error);
          NexusApp?.showToast?.(`Erro storage: ${error.message}`, 'error');
          throw error;
        }

        console.log('[Forum] Upload storage OK:', data);

        // Get public URL
        const { data: urlData } = this.supabase.storage
          .from('forum-attachments')
          .getPublicUrl(fileName);

        console.log('[Forum] URL pública:', urlData?.publicUrl);

        // Save attachment record
        const { data: insertData, error: insertError } = await this.supabase
          .from('forum_attachments')
          .insert({
            parent_type: type,
            parent_id: parentId,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user.uid
          })
          .select();

        if (insertError) {
          console.error('[Forum] Erro ao salvar registro:', insertError);
          NexusApp?.showToast?.(`Erro ao registrar: ${insertError.message}`, 'error');
        } else {
          console.log('[Forum] Registro salvo:', insertData);
          uploaded = true;
          NexusApp?.showToast?.(`📎 ${file.name} enviado!`, 'success');
        }
      } catch (e) {
        console.error('[Forum] Erro upload completo:', e);
        NexusApp?.showToast?.(`Erro ao enviar ${file.name}: ${e.message}`, 'error');
      }
    }

    this.fileState[type] = [];
    this.renderAttachmentsPreview(type);
    return uploaded;
  },

  async renderAttachmentsList(parentId, container) {
    if (!this.supabase || !container) return;

    try {
      const { data: attachments, error } = await this.supabase
        .from('forum_attachments')
        .select('*')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });

      if (error || !attachments || attachments.length === 0) return;

      let html = `<div class="forum-attachments-list">`;
      attachments.forEach(f => {
        const isImg = f.file_name.match(/\.(jpg|jpeg|png|webp|gif)$/i);
        if (isImg) {
          html += `
            <a href="${f.file_url}" target="_blank" class="forum-attach-img-card" title="${f.file_name}">
              <img src="${f.file_url}" alt="${f.file_name}">
            </a>
          `;
        } else {
          html += `
            <a href="${f.file_url}" target="_blank" class="forum-attach-file-card" title="${f.file_name}">
              <i class="fa-solid fa-paperclip"></i>
              <span>${f.file_name}</span>
            </a>
          `;
        }
      });
      html += `</div>`;
      container.innerHTML += html;
    } catch (e) {
      console.error('[Forum] Erro ao listar anexos:', e);
    }
  },

  // ============ MAIN RENDER ============
  async render(container) {
    if (!this.supabase) this.init();

    try {
      await this.loadTopics();

      if (this.currentTopic) {
        await this.renderTopicView(container);
      } else {
        this.renderForumList(container);
      }
    } catch (error) {
      console.error('[Forum] Erro ao renderizar:', error);
      container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 60px;">
          <div style="font-size: 64px; margin-bottom: 16px;">⚠️</div>
          <h3>Erro ao carregar Fórum</h3>
          <p style="color: var(--text-secondary);">${error.message}</p>
          <button class="btn btn-primary" style="margin-top: 24px;" onclick="NexusForum.render(document.getElementById('page-content'))">Tentar Novamente</button>
        </div>
      `;
    }
  },

  // ============ LOAD DATA & FILTERS ============
  async loadTopics() {
    if (!this.supabase) {
      this.loadFromLocalStorage();
      return;
    }

    try {
      let query = this.supabase
        .from('forum_topics')
        .select('*');

      // Ordenação baseada no filtro
      if (this.currentCategory === 'populares') {
        query = query.order('views', { ascending: false });
      } else if (this.currentCategory === 'sem_resposta') {
        query = query.eq('replies_count', 0);
      } else if (this.currentCategory === 'meus') {
        const user = this.getCurrentUser();
        query = query.eq('author_uid', user.uid);
      } else if (this.currentCategory !== 'all' && !['populares', 'sem_resposta', 'meus'].includes(this.currentCategory)) {
        query = query.eq('category_id', this.currentCategory);
      }

      // Default sort
      query = query.order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(100);

      const { data, error } = await query;
      if (error) throw error;

      this.topics = data.map(t => ({
        ...t,
        categoryId: t.category_id,
        authorUid: t.author_uid,
        authorNome: t.author_nome,
        authorCargo: t.author_cargo,
        replies: t.replies_count || 0,
        createdAt: t.created_at
      }));

    } catch (error) {
      console.warn('[Forum] Erro ao carregar:', error);
      NexusApp?.showToast?.('Erro ao carregar tópicos.', 'error');
    }
  },

  async loadReplies(topicId) {
    if (!this.supabase) {
      this.replies = [];
      return;
    }

    try {
      const { data, error } = await this.supabase
        .from('forum_replies')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      this.replies = data.map(r => ({
        ...r,
        topicId: r.topic_id,
        authorUid: r.author_uid,
        authorNome: r.author_nome,
        authorCargo: r.author_cargo,
        isSolution: r.is_solution,
        liked_by: r.liked_by || [],
        createdAt: r.created_at
      }));

      console.log(`[Forum] ${this.replies.length} respostas carregadas`);
    } catch (error) {
      console.warn('[Forum] Erro ao carregar respostas:', error);
      this.replies = [];
    }
  },

  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('nep_forum_topics');
      this.topics = saved ? JSON.parse(saved) : [];
    } catch {
      this.topics = [];
    }
  },

  saveToLocalStorage() {
    try {
      localStorage.setItem('nep_forum_topics', JSON.stringify(this.topics));
    } catch (e) {
      console.warn('[Forum] Erro ao salvar local:', e);
    }
  },

  // ============ SAVE TOPIC ============
  async saveTopic() {
    const categoryId = document.getElementById('topic-category').value;
    const titulo = document.getElementById('topic-title').value.trim();
    const conteudo = document.getElementById('topic-content').value.trim();

    if (!titulo || !conteudo) {
      NexusApp?.showToast?.('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    const btnSave = document.getElementById('topic-modal-save');
    const originalText = btnSave.innerHTML;
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publicando...';

    const user = this.getCurrentUser();

    try {
      if (this.supabase) {
        // Insert to Supabase
        const { data, error } = await this.supabase
          .from('forum_topics')
          .insert({
            category_id: categoryId,
            titulo,
            conteudo,
            author_uid: user.uid,
            author_nome: user.nome,
            author_cargo: user.cargo
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[Forum] Tópico criado:', data.id);

        // Upload attachments
        if (this.fileState.topic.length > 0) {
          await this.uploadAttachments('topic', data.id);
          await this.supabase
            .from('forum_topics')
            .update({ has_attachments: true })
            .eq('id', data.id);
        }

        // Gamification (Safe check)
        if (window.NexusGamification) {
          try {
            const user = this.getCurrentUser();
            if (user && user.uid) {
              window.NexusGamification.addPoints(user.uid, 5, 'FORUM_TOPIC', 'Novo tópico criado');
              if (window.NexusAchievements) window.NexusAchievements.incrementStat(user.uid, 'forum_topics');
            }
          } catch (e) { console.warn('[Forum] Gamification error:', e); }
        }

        NexusApp?.showToast?.('Tópico publicado! +5 pontos 🎉', 'success');
      } else {
        // Local fallback
        const newTopic = {
          id: 'local_' + Date.now(),
          categoryId,
          titulo,
          conteudo,
          authorUid: user.uid,
          authorNome: user.nome,
          authorCargo: user.cargo,
          views: 0,
          replies: 0,
          solved: false,
          pinned: false,
          createdAt: new Date().toISOString()
        };
        this.topics.unshift(newTopic);
        this.saveToLocalStorage();
        NexusApp?.showToast?.('Tópico salvo localmente!', 'success');
      }
    } catch (error) {
      console.error('[Forum] Erro ao criar tópico:', error);
      NexusApp?.showToast?.('Erro ao publicar: ' + error.message, 'error');
    }

    btnSave.disabled = false;
    btnSave.innerHTML = originalText;
    document.getElementById('topic-modal').classList.remove('active');
    document.getElementById('topic-form')?.reset();
    this.fileState.topic = [];

    this.render(document.getElementById('page-content'));
  },

  // ============ ADD REPLY ============
  async addReply(topicId, conteudo) {
    const user = this.getCurrentUser();
    const btnSubmit = document.getElementById('btn-submit-reply');

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
    }

    try {
      if (this.supabase) {
        const { data, error } = await this.supabase
          .from('forum_replies')
          .insert({
            topic_id: topicId,
            conteudo,
            author_uid: user.uid,
            author_nome: user.nome,
            author_cargo: user.cargo
          })
          .select()
          .single();

        if (error) throw error;

        // Upload attachments
        if (this.fileState.reply.length > 0) {
          await this.uploadAttachments('reply', data.id);
          await this.supabase
            .from('forum_replies')
            .update({ has_attachments: true })
            .eq('id', data.id);
        }

        // Gamification (Safe Check)
        if (window.NexusGamification) {
          try {
            const user = this.getCurrentUser();
            if (user && user.uid) {
              window.NexusGamification.addPoints(user.uid, 3, 'FORUM_REPLY', 'Resposta no fórum');
              if (window.NexusAchievements) window.NexusAchievements.incrementStat(user.uid, 'forum_replies');
            }
          } catch (e) { }
        }

        NexusApp?.showToast?.('Resposta publicada! +3 pontos', 'success');

        // Notification: Reply on Topic
        if (window.NexusNotifications) {
          const topic = this.topics.find(t => t.id === topicId);
          // Notify topic author if it's not me
          if (topic && topic.authorUid && topic.authorUid !== user.uid) {
            window.NexusNotifications.add({
              tipo: 'forum',
              titulo: '💬 Nova Resposta',
              mensagem: `${user.nome} respondeu seu tópico "${topic.titulo}"`,
              destinatario_uid: topic.authorUid,
              referencia_tipo: 'forum_topic',
              referencia_id: topicId
            }).catch(console.error);
          }
        }
      }
    } catch (error) {
      console.error('[Forum] Erro ao criar resposta:', error);
      NexusApp?.showToast?.('Erro ao responder: ' + error.message, 'error');
    }

    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Resposta';
    }

    this.fileState.reply = [];
  },

  // ============ ACTIONS: LIKE & DELETE ============

  async deleteTopic(topicId) {
    if (!confirm('Tem certeza que deseja excluir este tópico? Todas as respostas serão perdidas.')) return;

    try {
      // Deletar anexos e respostas cascateiam se configurado no SQL, 
      // mas vamos deletar o tópico direto
      const { error } = await this.supabase.from('forum_topics').delete().eq('id', topicId);

      if (error) throw error;

      NexusApp?.showToast?.('Tópico excluído com sucesso.', 'success');
      this.currentTopic = null;
      this.render(document.getElementById('page-content'));

    } catch (e) {
      console.error(e);
      NexusApp?.showToast?.('Erro ao excluir: ' + e.message, 'error');
    }
  },

  async deleteReply(replyId) {
    if (!confirm('Excluir esta resposta?')) return;

    try {
      const { error } = await this.supabase.from('forum_replies').delete().eq('id', replyId);
      if (error) throw error;

      NexusApp?.showToast?.('Resposta excluída.', 'success');
      this.render(document.getElementById('page-content')); // Recarrega view do tópico
    } catch (e) {
      console.error(e);
      NexusApp?.showToast?.('Erro ao excluir: ' + e.message, 'error');
    }
  },

  async likeReply(replyId) {
    const user = this.getCurrentUser();
    const btn = document.querySelector(`.reply-like[data-reply-id="${replyId}"]`);

    // Otimista UI Update
    if (btn) btn.disabled = true;

    try {
      // Usar a RPC criada no SQL Upgrade
      const { data: liked, error } = await this.supabase.rpc('toggle_forum_like', {
        reply_uuid: replyId,
        user_uid: user.uid
      });

      if (error) throw error;

      // Update Local State
      const reply = this.replies.find(r => r.id === replyId);
      if (reply) {
        if (liked) {
          reply.likes = (reply.likes || 0) + 1;
          reply.liked_by.push(user.uid);
          NexusApp?.showToast?.('Curtido! ❤️', 'success');

          // Notification: Like on Reply
          if (window.NexusNotifications && reply.authorUid && reply.authorUid !== user.uid) {
            // Find topic title for context
            const topic = this.topics.find(t => t.id === reply.topicId);
            const topicTitle = topic ? ` no tópico "${topic.titulo}"` : '';

            window.NexusNotifications.add({
              tipo: 'curtida',
              titulo: '❤️ Nova Curtida',
              mensagem: `${user.nome} curtiu sua resposta${topicTitle}.`,
              destinatario_uid: reply.authorUid,
              referencia_tipo: 'forum_topic',
              referencia_id: reply.topicId
            }).catch(console.error);
          }
        } else {
          reply.likes = Math.max(0, (reply.likes || 0) - 1);
          reply.liked_by = reply.liked_by.filter(id => id !== user.uid);
          NexusApp?.showToast?.('Curtida removida.', 'info');
        }
      }

      // Re-render só a lista de replies ou atualizar botão
      this.renderTopicView(document.getElementById('page-content'));

    } catch (error) {
      console.error('[Forum] Erro like RPC:', error);
      NexusApp?.showToast?.('Erro ao curtir', 'error');
      if (btn) btn.disabled = false;
    }
  },

  // ============ MARK AS SOLUTION ============
  async markAsSolution(topicId, replyId) {
    try {
      if (this.supabase) {
        // Update topic
        await this.supabase
          .from('forum_topics')
          .update({ solved: true, solution_reply_id: replyId })
          .eq('id', topicId);

        // Update reply
        await this.supabase
          .from('forum_replies')
          .update({ is_solution: true })
          .eq('id', replyId);

        // Gamification for answer author
        if (window.NexusGamification) {
          const reply = this.replies.find(r => r.id === replyId);
          const replyAuthorUid = reply?.authorUid || reply?.author_uid;
          if (replyAuthorUid) {
            NexusGamification.addPoints(replyAuthorUid, 15, 'FORUM_SOLUTION', 'Resposta marcada como solução');
            if (window.NexusAchievements) window.NexusAchievements.incrementStat(replyAuthorUid, 'forum_solutions');
          }
        }

        NexusApp?.showToast?.('Solução marcada! +15 pontos para o autor', 'success');
      }
    } catch (error) {
      console.error('[Forum] Erro ao marcar solução:', error);
    }
  },

  // ============ INCREMENT VIEWS ============
  async incrementViews(topicId) {
    const topic = this.topics.find(t => t.id === topicId);
    if (topic) {
      topic.views = (topic.views || 0) + 1;
    }

    try {
      if (this.supabase && topicId && !topicId.startsWith('local_')) {
        await this.supabase.rpc('increment_forum_views', { topic_id: topicId });
      }
    } catch (error) {
      // Silent fail for views
    }
  },

  // ============ FILTER TOPICS ============
  getFilteredTopics() {
    let topics = this.topics;

    if (this.currentCategory && this.currentCategory !== 'all' && !['populares', 'sem_resposta', 'meus'].includes(this.currentCategory)) {
      topics = topics.filter(t => t.categoryId === this.currentCategory || t.category_id === this.currentCategory);
    }
    // The actual filtering for 'populares', 'sem_resposta', 'meus' is now done in loadTopics()

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      topics = topics.filter(t =>
        (t.titulo || '').toLowerCase().includes(query) ||
        (t.conteudo || '').toLowerCase().includes(query)
      );
    }

    // Default sort is now handled in loadTopics(), but we keep this for local fallback or if search reorders
    return topics.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at);
    });
  },

  // ============ HELPERS ============
  getAvatarGradient(id) {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    let hash = 0;
    const str = String(id || 'user');
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d atrás`;
    return date.toLocaleDateString('pt-BR');
  },

  isBestAnswer(reply, topic) {
    if (topic.solved && topic.solution_reply_id) return reply.id === topic.solution_reply_id;
    const repliesWithLikes = this.replies.filter(r => (r.likes || 0) > 0);
    if (repliesWithLikes.length === 0) return false;
    const sorted = [...repliesWithLikes].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    return sorted[0]?.id === reply.id;
  },

  // ============ RENDER UPDATES ============

  renderForumList(container) {
    // Atualizar categorias para incluir os Filtros Especiais no Sidebar
    const user = this.getCurrentUser();

    // ... (Manter sidebar existente e adicionar os links abaixo das categorias)

    container.innerHTML = `
      <div class="forum-page animate-fade-in">
        <div class="forum-header">
          <div class="forum-header-left">
            <h1 class="page-title">💬 Fórum Colaborativo</h1>
            <p class="page-description">Compartilhe conhecimento e construa a memória organizacional</p>
          </div>
          <button class="btn btn-primary" id="btn-new-topic">
            <i class="fa-solid fa-plus"></i> Novo Tópico
          </button>
        </div>

        <div class="forum-layout">
          <aside class="forum-sidebar">
             <!-- BUSCA -->
            <div class="search-input-wrapper mb-4" style="position: relative;">
               <i class="fa-solid fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary);"></i>
               <input type="text" class="form-input" id="forum-search" placeholder="Buscar tópicos..." value="${this.searchQuery}" style="padding-left: 40px; width:100%;">
            </div>

            <!-- FILTROS ESPECIAIS -->
            <div class="nav-section-title mt-4">Filtros</div>
            <div class="forum-category-item ${this.currentCategory === 'all' ? 'active' : ''}" data-category="all">
                <span class="forum-category-icon">📁</span> <span class="forum-category-name">Todos</span>
            </div>
            <div class="forum-category-item ${this.currentCategory === 'populares' ? 'active' : ''}" data-category="populares">
                <span class="forum-category-icon">🔥</span> <span class="forum-category-name">Populares</span>
            </div>
            <div class="forum-category-item ${this.currentCategory === 'meus' ? 'active' : ''}" data-category="meus">
                <span class="forum-category-icon">👤</span> <span class="forum-category-name">Meus Tópicos</span>
            </div>
            <div class="forum-category-item ${this.currentCategory === 'sem_resposta' ? 'active' : ''}" data-category="sem_resposta">
                <span class="forum-category-icon">🆘</span> <span class="forum-category-name">Sem Resposta</span>
            </div>

            <!-- CATEGORIAS -->
            <div class="nav-section-title mt-6">Categorias</div>
            ${this.categories.map(cat => `
                <div class="forum-category-item ${this.currentCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
                  <span class="forum-category-icon">${cat.icon}</span>
                  <span class="forum-category-name">${cat.name}</span>
                </div>
              `).join('')}
          </aside>

          <main class="forum-main">
             ${this.topics.length === 0 ? this.renderEmptyState() :
        `<div class="forum-topics-list">
                  ${this.topics.map(topic => this.renderTopicCard(topic)).join('')}
                </div>`
      }
          </main>
        </div>
      </div>
      ${this.renderTopicModal()}
    `;
    this.attachEvents();
  },

  renderEmptyState() {
    return `
        <div class="empty-state" style="text-align: center; padding: 60px;">
          <div style="font-size: 64px; margin-bottom: 16px;">💬</div>
          <h3>Nenhum tópico encontrado</h3>
          <p style="color: var(--text-secondary);">Tente mudar o filtro ou crie um novo tópico.</p>
        </div>
     `;
  },

  renderTopicCard(topic) {
    const category = this.categories.find(c => c.id === (topic.categoryId || topic.category_id)) || { icon: '💬', name: 'Geral', color: 'secondary' };
    const authorInitials = (topic.authorNome || topic.author_nome || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const user = this.getCurrentUser();
    const isOwner = user.uid === (topic.authorUid || topic.author_uid) || ['admin', 'gestor'].includes(user.cargo.toLowerCase());

    return `
      <div class="forum-topic-card ${topic.pinned ? 'pinned' : ''}" data-topic-id="${topic.id}">
        ${topic.pinned ? '<div class="topic-pin">📌</div>' : ''}
        
        <div class="topic-avatar" style="background: ${this.getAvatarGradient(topic.authorUid || topic.author_uid || topic.id)}">${authorInitials}</div>
        
        <div class="topic-content">
          <div class="topic-header">
            <span class="badge badge-${category.color}">${category.icon} ${category.name}</span>
            ${topic.solved ? '<span class="badge badge-success">✓ Resolvido</span>' : ''}
            ${Number(topic.replies) === 0 ? '<span class="badge badge-error" style="font-size:10px; padding:2px 6px;">Novo</span>' : ''}
          </div>
          
          <h3 class="topic-title">${this._esc(topic.titulo)}</h3>
          <p class="topic-preview">${this._esc((topic.conteudo || '').substring(0, 140))}...</p>
          
          <div class="topic-meta">
            <span class="topic-author" style="${isOwner ? 'color:var(--primary-400); font-weight:600;' : ''}">
                ${this._esc(topic.authorNome || topic.author_nome) || 'Autor'}
                ${isOwner && topic.authorUid === user.uid ? '(Você)' : ''}
            </span>
            <span class="topic-date">📅 ${this.formatDate(topic.createdAt || topic.created_at)}</span>
          </div>
        </div>
        
        <div class="topic-stats">
          <div class="topic-stat">
            <span class="topic-stat-value">${topic.replies || 0}</span>
            <span class="topic-stat-label">respostas</span>
          </div>
          <div class="topic-stat">
            <span class="topic-stat-value">${topic.views || 0}</span>
            <span class="topic-stat-label">views</span>
          </div>
        </div>
      </div>
    `;
  },

  // Atualiza renderReply para mostrar botão DELETE apenas pro dono
  renderReply(reply, topic) {
    const user = this.getCurrentUser();
    const isTopicAuthor = (topic.authorUid || topic.author_uid) === user.uid;
    const isReplyAuthor = (reply.authorUid || reply.author_uid) === user.uid;
    const isAdmin = ['admin', 'gestor', 'lider'].some(role => (user.cargo || '').toLowerCase().includes(role));

    // Quem pode apagar? Dono da resposta ou Admin
    const canDelete = isReplyAuthor || isAdmin;

    const canMarkSolution = isTopicAuthor && !topic.solved;
    const authorInitials = (reply.authorNome || reply.author_nome || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const likedBy = reply.liked_by || [];
    const alreadyLiked = likedBy.includes(user.uid);
    const likesCount = reply.likes || likedBy.length || 0;
    const isBestAnswer = this.isBestAnswer(reply, topic);

    return `
      <div class="reply-card ${reply.isSolution || reply.is_solution || isBestAnswer ? 'solution' : ''}" id="reply-${reply.id}" style="padding: 16px; background: var(--surface-elevated); border: 1px solid ${reply.isSolution || reply.is_solution || isBestAnswer ? 'var(--success-500)' : 'var(--surface-border)'}; border-radius: 12px; margin-bottom: 12px; position: relative; transition: all 0.2s;">
        
        ${reply.isSolution || reply.is_solution || isBestAnswer ? '<div style="position: absolute; top: -10px; right: 16px; background: var(--success-500); color: white; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 12px;">✓ Melhor Resposta</div>' : ''}
        
        <!-- Header da Resposta -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: ${this.getAvatarGradient(reply.authorUid || reply.author_uid || reply.id)}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 13px;">${authorInitials}</div>
            <div>
              <div style="font-weight: 600; font-size: 14px; color: ${isReplyAuthor ? 'var(--primary-400)' : 'inherit'};">
                 ${this._esc(reply.authorNome || reply.author_nome) || 'Autor'} 
                 ${isReplyAuthor ? '(Você)' : ''}
                 ${(topic.authorUid || topic.author_uid) === (reply.authorUid || reply.author_uid) ? '<span style="font-size:10px; background:var(--surface-card); padding:2px 6px; border-radius:4px; margin-left:4px; border:1px solid var(--surface-border);">Autor</span>' : ''}
              </div>
              <div style="font-size: 11px; color: var(--text-tertiary);">${reply.authorCargo || reply.author_cargo || ''}</div>
            </div>
          </div>
          
          <div style="display:flex; align-items:center; gap:8px;">
             <div style="font-size: 11px; color: var(--text-tertiary);">${this.formatDate(reply.createdAt || reply.created_at)}</div>
             ${canDelete ? `
               <button onclick="event.stopPropagation(); NexusForum.deleteReply('${reply.id}')" class="btn-icon-danger" title="Excluir" style="background:none; border:none; color:var(--error-400); cursor:pointer; padding:4px;">
                 <i class="fa-solid fa-trash"></i>
               </button>
             ` : ''}
          </div>
        </div>

        <div style="font-size: 14px; line-height: 1.6; margin-bottom: 12px; white-space: pre-wrap;">${this._esc(reply.conteudo) || ''}</div>
        
        <div id="reply-attach-${reply.id}"></div>
        
        <div style="display: flex; gap: 12px; align-items: center; margin-top:12px;">
          <button class="btn btn-ghost btn-sm reply-like ${alreadyLiked ? 'liked' : ''}" data-reply-id="${reply.id}" style="font-size: 12px; ${alreadyLiked ? 'color: #ef4444; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2);' : ''}">
            ${alreadyLiked ? '❤️' : '🤍'} ${likesCount} ${likesCount === 1 ? 'curtida' : 'curtidas'}
          </button>
          
          ${canMarkSolution && !(reply.isSolution || reply.is_solution) && !isBestAnswer ? `
            <button class="btn btn-ghost btn-sm reply-mark-solution" data-reply-id="${reply.id}" style="font-size: 12px; color: var(--success-500);">
              ✓ Marcar como Solução
            </button>
          ` : ''}
        </div>
      </div>
    `;
  },

  // Atualiza renderTopicView para botão DELETE do Tópico
  async renderTopicView(container) {
    const topic = this.topics.find(t => t.id === this.currentTopic);
    if (!topic) {
      this.currentTopic = null;
      this.renderForumList(container);
      return;
    }

    // ... (Load replies and setup vars logic similar to previous)
    await this.loadReplies(topic.id);

    const category = this.categories.find(c => c.id === (topic.categoryId || topic.category_id)) || { icon: '💬', name: 'Geral', color: 'secondary' };
    const authorInitials = (topic.authorNome || topic.author_nome || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    const user = this.getCurrentUser();
    const isOwner = user.uid === (topic.authorUid || topic.author_uid) || ['admin'].includes((user.cargo || '').toLowerCase());

    // Cabeçalho e Body
    // Adicionar botão Delete no Header se isOwner

    container.innerHTML = `
        <div class="forum-page animate-fade-in">
           <div class="topic-view-header" style="display:flex; justify-content:space-between; align-items:center;">
              <button class="btn btn-ghost" id="btn-back-forum"><i class="fa-solid fa-arrow-left"></i> Voltar</button>
              
              ${isOwner ? `
                <button onclick="NexusForum.deleteTopic('${topic.id}')" class="btn btn-danger btn-sm">
                   <i class="fa-solid fa-trash"></i> Excluir Tópico
                </button>
              ` : ''}
           </div>
           
           <!-- Resto do template (Article, Replies, Form) igual ao anterior, 
                garantindo chamar renderReply atualizado -->
           
           <article class="topic-article">
             <div class="topic-article-header">
               <div class="topic-badges">
                 <span class="badge badge-${category.color}">${category.icon} ${category.name}</span>
                 ${topic.solved ? '<span class="badge badge-success">✓ Resolvido</span>' : ''}
                 ${topic.pinned ? '<span class="badge badge-warning">📌 Fixado</span>' : ''}
               </div>
               <h1 class="topic-article-title">${topic.titulo}</h1>
               <div class="topic-article-meta">
                 <div class="topic-article-author">
                   <div class="avatar avatar-sm" style="background: ${this.getAvatarGradient(topic.authorUid || topic.author_uid || topic.id)}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">${authorInitials}</div>
                   <div>
                     <div class="topic-author-name" style="font-weight: 600;">${this._esc(topic.authorNome || topic.author_nome) || 'Autor'}</div>
                     <div class="topic-author-role" style="font-size: 12px; color: var(--text-tertiary);">${topic.authorCargo || topic.author_cargo || ''}</div>
                   </div>
                 </div>
                 <div class="topic-article-stats" style="display: flex; gap: 16px; color: var(--text-secondary); font-size: 13px;">
                   <span>👁️ ${topic.views || 0} visualizações</span>
                   <span>💬 ${this.replies.length} respostas</span>
                   <span>📅 ${this.formatDate(topic.createdAt || topic.created_at)}</span>
                 </div>
               </div>
             </div>

             <div class="topic-article-body" style="line-height: 1.7; white-space: pre-wrap;">
               ${this._esc(topic.conteudo) || ''}
               <div id="topic-view-attachments"></div>
             </div>
           </article>

           <section class="replies-section">
              <h3 class="replies-title">Respostas (${this.replies.length})</h3>
              <div class="replies-list">
                 ${this.replies.map(r => this.renderReply(r, topic)).join('')}
              </div>
              <!-- Reply Form -->
              <div class="reply-form" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--surface-border);">
                <h4 style="margin-bottom: 12px;">Sua Resposta</h4>
                <textarea class="form-input" id="reply-content" placeholder="Compartilhe seu conhecimento ou experiência..." rows="4" style="width: 100%; resize: vertical;"></textarea>
                
                <div id="reply-attachments-preview" style="margin-top:8px;"></div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <label for="reply-file" class="btn btn-secondary btn-sm" title="Anexar arquivo" style="cursor:pointer;"><i class="fa-solid fa-paperclip"></i> Anexar</label>
                    <input type="file" id="reply-file" multiple style="display:none" onchange="NexusForum.handleFileSelect('reply', this)">
                    <span style="font-size: 12px; color: var(--text-tertiary);">💡 Respostas úteis ganham pontos!</span>
                  </div>
                  
                  <button class="btn btn-primary" id="btn-submit-reply">
                    <i class="fa-solid fa-paper-plane"></i> Enviar Resposta
                  </button>
                </div>
              </div>
           </section>
        </div>
     `;

    this.attachTopicViewEvents(topic);
    this.incrementViews(topic.id);
    this.renderAttachmentsList(topic.id, document.getElementById('topic-view-attachments'));

    this.replies.forEach(r => {
      const el = document.getElementById(`reply-attach-${r.id}`);
      if (el) this.renderAttachmentsList(r.id, el);
    });
  },

  renderTopicModal() {
    return `
      <div class="modal-backdrop" id="topic-modal">
        <div class="modal" style="max-width: 600px;">
          <div class="modal-header">
            <h3 class="modal-title"><i class="fa-solid fa-plus"></i> Novo Tópico</h3>
            <button class="modal-close" id="topic-modal-close"><i class="fa-solid fa-times"></i></button>
          </div>
          <div class="modal-body">
            <form id="topic-form">
              <div class="form-group">
                <label class="form-label">Categoria *</label>
                <select class="form-input" id="topic-category" required>
                  ${this.categories.map(cat => `
                    <option value="${cat.id}">${cat.icon} ${cat.name}</option>
                  `).join('')}
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input type="text" class="form-input" id="topic-title" required placeholder="Ex: Como melhorar a taxa de resolução?">
              </div>
              
              <div class="form-group">
                <label class="form-label">Conteúdo *</label>
                <textarea class="form-input" id="topic-content" required placeholder="Descreva sua dúvida, ideia ou discussão em detalhes..." rows="6" style="resize: vertical;"></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Anexos (Opcional)</label>
                <div style="display:flex; gap:10px; align-items:center;">
                  <label for="topic-file" class="btn btn-secondary btn-sm" style="cursor:pointer; font-size:12px; padding:6px 12px;">
                    <i class="fa-solid fa-cloud-arrow-up"></i> Adicionar Arquivos
                  </label>
                  <span style="font-size:11px; color:var(--text-tertiary);">Imagens, PDF, Doc... (max 5MB)</span>
                </div>
                <input type="file" id="topic-file" multiple style="display:none" onchange="NexusForum.handleFileSelect('topic', this)">
                <div id="topic-attachments-preview" style="margin-top:8px;"></div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="topic-modal-cancel">Cancelar</button>
            <button class="btn btn-primary" id="topic-modal-save">
              <i class="fa-solid fa-paper-plane"></i> Publicar Tópico
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ============ EVENT HANDLERS ============
  attachEvents() {
    document.querySelectorAll('.forum-category-item').forEach(item => {
      item.addEventListener('click', () => {
        this.currentCategory = item.dataset.category;
        this.render(document.getElementById('page-content'));
      });
    });

    document.getElementById('forum-search')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.render(document.getElementById('page-content'));
      }, 300);
    });

    document.querySelectorAll('.forum-topic-card').forEach(card => {
      card.addEventListener('click', () => {
        this.currentTopic = card.dataset.topicId;
        this.render(document.getElementById('page-content'));
      });
    });

    document.getElementById('btn-new-topic')?.addEventListener('click', () => {
      document.getElementById('topic-modal').classList.add('active');
      document.getElementById('topic-title')?.focus();
    });

    document.getElementById('topic-modal-close')?.addEventListener('click', () => {
      document.getElementById('topic-modal').classList.remove('active');
    });
    document.getElementById('topic-modal-cancel')?.addEventListener('click', () => {
      document.getElementById('topic-modal').classList.remove('active');
    });
    document.getElementById('topic-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'topic-modal') {
        document.getElementById('topic-modal').classList.remove('active');
      }
    });
    document.getElementById('topic-modal-save')?.addEventListener('click', () => this.saveTopic());
  },

  attachTopicViewEvents(topic) {
    document.getElementById('btn-back-forum')?.addEventListener('click', () => {
      this.currentTopic = null;
      this.render(document.getElementById('page-content'));
    });

    document.getElementById('btn-submit-reply')?.addEventListener('click', async () => {
      const content = document.getElementById('reply-content').value.trim();
      if (content) {
        await this.addReply(topic.id, content);
        this.render(document.getElementById('page-content'));
      } else {
        NexusApp?.showToast?.('Digite sua resposta', 'warning');
      }
    });

    document.querySelectorAll('.reply-like').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.likeReply(btn.dataset.replyId);
        this.render(document.getElementById('page-content'));
      });
    });

    document.querySelectorAll('.reply-mark-solution').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.markAsSolution(topic.id, btn.dataset.replyId);
        this.render(document.getElementById('page-content'));
      });
    });
  }
};

// ============ STYLES ============
const forumStyles = document.createElement('style');
forumStyles.textContent = `
  .forum-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: var(--space-6);
  }

  .forum-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: var(--space-6);
  }

  @media (max-width: 1024px) {
    .forum-layout {
      grid-template-columns: 1fr;
    }
    .forum-sidebar {
      display: none;
    }
  }

  .forum-categories {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    padding: var(--space-4);
  }

  .forum-category-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .forum-category-item:hover {
    background: var(--surface-elevated);
  }

  .forum-category-item.active {
    background: rgba(59, 130, 246, 0.1);
    border-left: 3px solid var(--primary-500);
  }

  .forum-category-name {
    flex: 1;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
  }

  .forum-category-count {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    background: var(--surface-elevated);
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }

  .forum-stats {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    padding: var(--space-4);
  }

  .forum-stat-item {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--surface-border);
  }

  .forum-stat-item:last-child {
    border-bottom: none;
  }

  .forum-topic-card {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    margin-bottom: var(--space-3);
  }

  .forum-topic-card:hover {
    border-color: var(--primary-500);
    transform: translateX(4px);
  }

  .forum-topic-card.pinned {
    border-color: var(--warning-500);
    background: rgba(255, 152, 0, 0.05);
  }

  .topic-pin {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
  }

  .topic-avatar {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: var(--font-semibold);
    color: white;
    flex-shrink: 0;
  }

  .topic-content {
    flex: 1;
    min-width: 0;
  }

  .topic-header {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .topic-title {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    margin-bottom: var(--space-2);
    color: var(--text-primary);
  }

  .topic-preview {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin-bottom: var(--space-2);
  }

  .topic-meta {
    display: flex;
    gap: var(--space-3);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .topic-stats {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    text-align: center;
    flex-shrink: 0;
  }

  .topic-stat-value {
    font-size: var(--text-lg);
    font-weight: var(--font-bold);
    color: var(--text-primary);
  }

  .topic-stat-label {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .topic-article {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    padding: var(--space-6);
    margin-bottom: var(--space-6);
  }

  .topic-article-title {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    margin: var(--space-4) 0;
  }

  .topic-article-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-4);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--surface-border);
    margin-bottom: var(--space-4);
  }

  .topic-article-author {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .topic-article-body {
    font-size: var(--text-base);
    color: var(--text-primary);
  }

  .replies-section {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    padding: var(--space-6);
  }

  .replies-title {
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--surface-border);
  }

  .forum-attachments-list {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 12px;
  }

  .forum-attach-img-card img {
    max-width: 150px;
    max-height: 100px;
    border-radius: 8px;
    object-fit: cover;
  }

  .forum-attach-file-card {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--surface-elevated);
    border-radius: 8px;
    font-size: 12px;
    color: var(--text-secondary);
    text-decoration: none;
  }

  .forum-attach-preview-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    background: var(--surface-elevated);
    border-radius: 6px;
    font-size: 12px;
    margin-bottom: 4px;
  }
`;
document.head.appendChild(forumStyles);
