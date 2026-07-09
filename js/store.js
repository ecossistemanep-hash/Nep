/**
 * NEXUS PLATFORM - STORE
 * Estado Global e Dados Mock
 */

const NexusStore = {
  // =========================================
  // USUÁRIOS
  // =========================================
  users: [
    {
      id: 'u1',
      name: 'Samuel Rosa',
      email: 'samuel@teste.com',
      role: 'Superintendente de Qualidade',
      roleKey: 'superintendente',
      segment: 'Qualidade',
      avatar: null,
      initials: 'SR',
      points: 5000,
      level: 5,
      isAdmin: true,
      badges: ['pioneer', 'leader', 'expert'],
      tasksCompleted: 200,
      forumPosts: 45,
      joinedAt: '2024-01-01'
    },
    {
      id: 'u2',
      name: 'Ana Costa',
      email: 'ana.costa@nexus.com',
      role: 'Analista de Processos',
      avatar: null,
      initials: 'AC',
      points: 1890,
      level: 'silver',
      badges: ['fast-learner', 'collaborator'],
      tasksCompleted: 65,
      forumPosts: 45,
      joinedAt: '2024-02-20'
    },
    {
      id: 'u3',
      name: 'Carlos Mendes',
      email: 'carlos.mendes@nexus.com',
      role: 'Supervisor Operacional',
      avatar: null,
      initials: 'CM',
      points: 3210,
      level: 'diamond',
      badges: ['pioneer', 'expert', 'leader', 'innovator'],
      tasksCompleted: 142,
      forumPosts: 67,
      joinedAt: '2023-11-05'
    },
    {
      id: 'u4',
      name: 'Mariana Oliveira',
      email: 'mariana.oliveira@nexus.com',
      role: 'Coordenadora de Treinamento',
      avatar: null,
      initials: 'MO',
      points: 1560,
      level: 'silver',
      badges: ['mentor', 'educator'],
      tasksCompleted: 52,
      forumPosts: 89,
      joinedAt: '2024-03-10'
    },
    {
      id: 'u5',
      name: 'Ricardo Santos',
      email: 'ricardo.santos@nexus.com',
      role: 'Analista de Qualidade',
      avatar: null,
      initials: 'RS',
      points: 980,
      level: 'bronze',
      badges: ['fast-learner'],
      tasksCompleted: 34,
      forumPosts: 12,
      joinedAt: '2024-06-01'
    },
    {
      id: 'u6',
      name: 'Juliana Ferreira',
      email: 'juliana.ferreira@nexus.com',
      role: 'Especialista em Compliance',
      avatar: null,
      initials: 'JF',
      points: 2100,
      level: 'gold',
      badges: ['expert', 'guardian'],
      tasksCompleted: 78,
      forumPosts: 34,
      joinedAt: '2024-01-28'
    }
  ],

  // =========================================
  // TAREFAS (KANBAN)
  // =========================================
  tasks: [
    {
      id: 't1',
      title: 'Revisar procedimento de atendimento',
      description: 'Atualizar o SOP de atendimento ao cliente conforme novas diretrizes',
      status: 'backlog',
      priority: 'high',
      assigneeId: 'u1',
      createdBy: 'u3',
      points: 15,
      dueDate: '2024-12-30',
      tags: ['processos', 'qualidade'],
      createdAt: '2024-12-20',
      comments: 2
    },
    {
      id: 't2',
      title: 'Análise de rechamadas do mês',
      description: 'Consolidar dados de rechamadas e identificar padrões',
      status: 'in-progress',
      priority: 'critical',
      assigneeId: 'u2',
      createdBy: 'u1',
      points: 20,
      dueDate: '2024-12-28',
      tags: ['análise', 'kpi'],
      createdAt: '2024-12-18',
      comments: 5
    },
    {
      id: 't3',
      title: 'Criar treinamento sobre novo sistema',
      description: 'Desenvolver material de treinamento para o novo CRM',
      status: 'in-progress',
      priority: 'medium',
      assigneeId: 'u4',
      createdBy: 'u3',
      points: 25,
      dueDate: '2025-01-05',
      tags: ['treinamento', 'sistema'],
      createdAt: '2024-12-15',
      comments: 8
    },
    {
      id: 't4',
      title: 'Mapear jornada do cliente',
      description: 'Documentar todas as etapas da jornada do cliente no canal digital',
      status: 'review',
      priority: 'high',
      assigneeId: 'u6',
      createdBy: 'u1',
      points: 30,
      dueDate: '2024-12-27',
      tags: ['processos', 'cx'],
      createdAt: '2024-12-10',
      comments: 12
    },
    {
      id: 't5',
      title: 'Implementar checklist de qualidade',
      description: 'Criar checklist padronizado para monitoria de chamadas',
      status: 'done',
      priority: 'high',
      assigneeId: 'u1',
      createdBy: 'u3',
      points: 20,
      dueDate: '2024-12-22',
      tags: ['qualidade', 'monitoria'],
      createdAt: '2024-12-05',
      completedAt: '2024-12-21',
      comments: 6
    },
    {
      id: 't6',
      title: 'Analisar satisfação do cliente',
      description: 'Compilar resultados do NPS do último trimestre',
      status: 'done',
      priority: 'medium',
      assigneeId: 'u2',
      createdBy: 'u1',
      points: 15,
      dueDate: '2024-12-20',
      tags: ['análise', 'nps'],
      createdAt: '2024-12-01',
      completedAt: '2024-12-19',
      comments: 4
    },
    {
      id: 't7',
      title: 'Calibrar equipe de monitoria',
      description: 'Realizar sessão de calibração com todos os monitores',
      status: 'backlog',
      priority: 'medium',
      assigneeId: 'u4',
      createdBy: 'u1',
      points: 10,
      dueDate: '2025-01-10',
      tags: ['qualidade', 'equipe'],
      createdAt: '2024-12-22',
      comments: 1
    },
    {
      id: 't8',
      title: 'Atualizar dashboard gerencial',
      description: 'Incluir novos KPIs no painel de gestão',
      status: 'backlog',
      priority: 'low',
      assigneeId: 'u5',
      createdBy: 'u2',
      points: 10,
      dueDate: '2025-01-15',
      tags: ['dashboard', 'kpi'],
      createdAt: '2024-12-23',
      comments: 0
    }
  ],

  // =========================================
  // FÓRUM
  // =========================================
  forumCategories: [
    { id: 'cat1', name: 'Processos', icon: '📋', color: 'primary' },
    { id: 'cat2', name: 'Qualidade', icon: '✅', color: 'success' },
    { id: 'cat3', name: 'Operações', icon: '⚙️', color: 'warning' },
    { id: 'cat4', name: 'Geral', icon: '💬', color: 'accent' }
  ],

  forumTopics: [
    {
      id: 'topic1',
      title: 'Como reduzir tempo de espera sem perder qualidade?',
      content: 'Estamos enfrentando um desafio: precisamos reduzir o TMA em 15% mas mantendo o índice de qualidade acima de 85%. Alguém já passou por situação similar? Quais estratégias funcionaram?',
      categoryId: 'cat3',
      authorId: 'u3',
      createdAt: '2024-12-20T10:30:00',
      views: 234,
      replies: 12,
      solved: true,
      solvedReplyId: 'reply3',
      pinned: true
    },
    {
      id: 'topic2',
      title: 'Novo checklist de monitoria - Feedback',
      content: 'Acabamos de implementar o novo checklist de monitoria. Gostaria de ouvir o feedback de todos sobre os critérios e a usabilidade.',
      categoryId: 'cat2',
      authorId: 'u1',
      createdAt: '2024-12-22T14:15:00',
      views: 156,
      replies: 8,
      solved: false,
      pinned: false
    },
    {
      id: 'topic3',
      title: 'Melhores práticas para calibração de equipe',
      content: 'Vou realizar uma sessão de calibração na próxima semana. Quais são as melhores práticas que vocês recomendam para garantir alinhamento entre os monitores?',
      categoryId: 'cat2',
      authorId: 'u4',
      createdAt: '2024-12-23T09:00:00',
      views: 89,
      replies: 5,
      solved: false,
      pinned: false
    },
    {
      id: 'topic4',
      title: 'Integração com novo CRM - Dúvidas',
      content: 'O novo CRM será implementado em janeiro. Alguém já teve acesso ao ambiente de homologação? Como está a experiência?',
      categoryId: 'cat1',
      authorId: 'u5',
      createdAt: '2024-12-24T11:45:00',
      views: 67,
      replies: 3,
      solved: false,
      pinned: false
    },
    {
      id: 'topic5',
      title: 'Sugestão: Gamificação nas metas diárias',
      content: 'E se criássemos um sistema de pontos para as metas diárias? Poderia aumentar o engajamento da equipe. O que acham?',
      categoryId: 'cat4',
      authorId: 'u2',
      createdAt: '2024-12-25T08:30:00',
      views: 145,
      replies: 15,
      solved: false,
      pinned: false
    }
  ],

  forumReplies: [
    {
      id: 'reply1',
      topicId: 'topic1',
      authorId: 'u1',
      content: 'Já passamos por isso na célula anterior. Uma estratégia que funcionou foi criar scripts mais objetivos e treinar a equipe em técnicas de escuta ativa.',
      createdAt: '2024-12-20T11:00:00',
      likes: 8,
      isSolution: false
    },
    {
      id: 'reply2',
      topicId: 'topic1',
      authorId: 'u4',
      content: 'Complementando o Fernando, também implementamos pausas programadas de 5 segundos antes de respostas complexas. Reduziu erros e curiosamente o TMA também caiu.',
      createdAt: '2024-12-20T11:30:00',
      likes: 12,
      isSolution: false
    },
    {
      id: 'reply3',
      topicId: 'topic1',
      authorId: 'u6',
      content: 'Nossa experiência mostrou que o segredo está na base de conhecimento. Criamos FAQs dinâmicas baseadas nas principais dúvidas. TMA caiu 18% e qualidade subiu para 89%.',
      createdAt: '2024-12-20T14:00:00',
      likes: 24,
      isSolution: true
    },
    {
      id: 'reply4',
      topicId: 'topic2',
      authorId: 'u2',
      content: 'Gostei muito do novo formato! Ficou mais objetivo e fácil de preencher. Sugiro apenas adicionar um campo para observações qualitativas.',
      createdAt: '2024-12-22T15:00:00',
      likes: 5,
      isSolution: false
    },
    {
      id: 'reply5',
      topicId: 'topic2',
      authorId: 'u3',
      content: 'Concordo com a Ana. O campo de observações é importante para capturar contextos que os critérios objetivos não conseguem.',
      createdAt: '2024-12-22T16:30:00',
      likes: 7,
      isSolution: false
    }
  ],

  // =========================================
  // PONTUAÇÃO E RANKING
  // =========================================
  pointsConfig: {
    taskCompleted: 10,
    taskHighPriority: 5,
    taskCritical: 10,
    forumPost: 5,
    forumReply: 3,
    forumSolution: 15,
    forumLikeReceived: 1
  },

  levels: [
    { name: 'bronze', minPoints: 0, maxPoints: 999, icon: '🥉' },
    { name: 'silver', minPoints: 1000, maxPoints: 1999, icon: '🥈' },
    { name: 'gold', minPoints: 2000, maxPoints: 2999, icon: '🥇' },
    { name: 'diamond', minPoints: 3000, maxPoints: Infinity, icon: '💎' }
  ],

  badges: [
    { id: 'pioneer', name: 'Pioneiro', description: 'Primeiro a adotar a plataforma', icon: '🚀' },
    { id: 'problem-solver', name: 'Solucionador', description: '10+ soluções no fórum', icon: '💡' },
    { id: 'mentor', name: 'Mentor', description: 'Ajudou 20+ colegas', icon: '🎓' },
    { id: 'fast-learner', name: 'Aprendiz Rápido', description: 'Completou 10 tarefas em 7 dias', icon: '⚡' },
    { id: 'collaborator', name: 'Colaborador', description: '50+ respostas no fórum', icon: '🤝' },
    { id: 'expert', name: 'Especialista', description: '100+ tarefas completadas', icon: '🏆' },
    { id: 'leader', name: 'Líder', description: 'Top 3 do ranking por 30 dias', icon: '👑' },
    { id: 'innovator', name: 'Inovador', description: 'Sugeriu melhoria implementada', icon: '✨' },
    { id: 'educator', name: 'Educador', description: 'Criou conteúdo de treinamento', icon: '📚' },
    { id: 'guardian', name: 'Guardião', description: 'Zero não-conformidades por 90 dias', icon: '🛡️' }
  ],

  pointsHistory: [
    { id: 'ph1', oduserId: 'u1', action: 'task_completed', points: 10, description: 'Completou tarefa: Implementar checklist de qualidade', date: '2024-12-21T16:00:00' },
    { id: 'ph2', userId: 'u1', action: 'task_high_priority', points: 5, description: 'Bônus: Tarefa de alta prioridade', date: '2024-12-21T16:00:00' },
    { id: 'ph3', userId: 'u1', action: 'forum_reply', points: 3, description: 'Respondeu no fórum: Como reduzir tempo de espera', date: '2024-12-20T11:00:00' },
    { id: 'ph4', userId: 'u2', action: 'task_completed', points: 10, description: 'Completou tarefa: Analisar satisfação do cliente', date: '2024-12-19T14:30:00' },
    { id: 'ph5', userId: 'u3', action: 'forum_post', points: 5, description: 'Criou tópico: Como reduzir tempo de espera', date: '2024-12-20T10:30:00' },
    { id: 'ph6', userId: 'u6', action: 'forum_solution', points: 15, description: 'Resposta marcada como solução', date: '2024-12-20T15:00:00' }
  ],

  // =========================================
  // MÉTRICAS E KPIs
  // =========================================
  metrics: {
    tasksCompleted: { current: 156, previous: 142, target: 180 },
    avgCompletionTime: { current: 2.3, previous: 2.8, target: 2.0, unit: 'dias' },
    qualityScore: { current: 87.5, previous: 84.2, target: 90, unit: '%' },
    forumEngagement: { current: 78, previous: 65, target: 80, unit: '%' },
    activeUsers: { current: 45, previous: 42, target: 50 },
    totalPoints: { current: 12190, previous: 10500, target: 15000 }
  },

  performanceData: {
    weekly: [
      { week: 'Sem 1', tasks: 32, quality: 85, engagement: 72 },
      { week: 'Sem 2', tasks: 38, quality: 86, engagement: 75 },
      { week: 'Sem 3', tasks: 41, quality: 88, engagement: 78 },
      { week: 'Sem 4', tasks: 45, quality: 87, engagement: 80 }
    ],
    monthly: [
      { month: 'Jul', tasks: 120, quality: 82, engagement: 65 },
      { month: 'Ago', tasks: 135, quality: 84, engagement: 68 },
      { month: 'Set', tasks: 142, quality: 85, engagement: 72 },
      { month: 'Out', tasks: 148, quality: 86, engagement: 75 },
      { month: 'Nov', tasks: 152, quality: 87, engagement: 77 },
      { month: 'Dez', tasks: 156, quality: 88, engagement: 78 }
    ]
  },

  tasksByStatus: {
    backlog: 12,
    'in-progress': 8,
    review: 5,
    done: 156
  },

  tasksByArea: [
    { area: 'Qualidade', count: 45, percentage: 28 },
    { area: 'Processos', count: 38, percentage: 24 },
    { area: 'Treinamento', count: 32, percentage: 20 },
    { area: 'Operações', count: 28, percentage: 18 },
    { area: 'Outros', count: 16, percentage: 10 }
  ],

  // =========================================
  // CURRENT USER (SESSÃO)
  // =========================================
  currentUser: null,

  // =========================================
  // MÉTODOS
  // =========================================

  init() {
    // Definir usuário atual (simulando login)
    this.currentUser = this.users[0]; // Fernando Silva
    this.loadFromStorage();
  },

  loadFromStorage() {
    try {
      const savedTasks = localStorage.getItem('nexus_tasks');
      if (savedTasks) {
        this.tasks = JSON.parse(savedTasks);
      }

      const savedTopics = localStorage.getItem('nexus_topics');
      if (savedTopics) {
        this.forumTopics = JSON.parse(savedTopics);
      }

      const savedReplies = localStorage.getItem('nexus_replies');
      if (savedReplies) {
        this.forumReplies = JSON.parse(savedReplies);
      }

      const savedUsers = localStorage.getItem('nexus_users');
      if (savedUsers) {
        this.users = JSON.parse(savedUsers);
        this.currentUser = this.users[0];
      }
    } catch (e) {
      console.log('Usando dados padrão');
    }
  },

  saveToStorage() {
    try {
      localStorage.setItem('nexus_tasks', JSON.stringify(this.tasks));
      localStorage.setItem('nexus_topics', JSON.stringify(this.forumTopics));
      localStorage.setItem('nexus_replies', JSON.stringify(this.forumReplies));
      localStorage.setItem('nexus_users', JSON.stringify(this.users));
    } catch (e) {
      console.error('Erro ao salvar:', e);
    }
  },

  // Task Methods
  getTasksByStatus(status) {
    return this.tasks.filter(t => t.status === status);
  },

  getTaskById(id) {
    return this.tasks.find(t => t.id === id);
  },

  addTask(task) {
    const newTask = {
      id: 't' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
      comments: 0,
      ...task
    };
    this.tasks.push(newTask);
    this.saveToStorage();
    return newTask;
  },

  updateTask(id, updates) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      const oldStatus = this.tasks[index].status;
      this.tasks[index] = { ...this.tasks[index], ...updates };

      // Award points if task completed
      if (oldStatus !== 'done' && updates.status === 'done') {
        this.awardPoints(this.tasks[index].assigneeId, 'task_completed', this.tasks[index].points || 10);
        this.tasks[index].completedAt = new Date().toISOString().split('T')[0];
      }

      this.saveToStorage();
    }
  },

  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveToStorage();
  },

  // User Methods
  getUserById(id) {
    return this.users.find(u => u.id === id);
  },

  getRanking() {
    return [...this.users].sort((a, b) => b.points - a.points);
  },

  getUserLevel(points) {
    return this.levels.find(l => points >= l.minPoints && points <= l.maxPoints);
  },

  awardPoints(userId, action, points) {
    const user = this.getUserById(userId);
    if (user) {
      user.points += points;
      // Update level
      const newLevel = this.getUserLevel(user.points);
      if (newLevel) {
        user.level = newLevel.name;
      }
      this.saveToStorage();
    }
  },

  // Forum Methods
  getTopicsByCategory(categoryId) {
    if (!categoryId || categoryId === 'all') {
      return this.forumTopics;
    }
    return this.forumTopics.filter(t => t.categoryId === categoryId);
  },

  getTopicById(id) {
    return this.forumTopics.find(t => t.id === id);
  },

  getRepliesByTopic(topicId) {
    return this.forumReplies.filter(r => r.topicId === topicId);
  },

  addTopic(topic) {
    const newTopic = {
      id: 'topic' + Date.now(),
      authorId: this.currentUser.id,
      createdAt: new Date().toISOString(),
      views: 0,
      replies: 0,
      solved: false,
      pinned: false,
      ...topic
    };
    this.forumTopics.unshift(newTopic);
    this.awardPoints(this.currentUser.id, 'forum_post', this.pointsConfig.forumPost);
    this.saveToStorage();
    return newTopic;
  },

  addReply(topicId, content) {
    const newReply = {
      id: 'reply' + Date.now(),
      topicId,
      authorId: this.currentUser.id,
      content,
      createdAt: new Date().toISOString(),
      likes: 0,
      isSolution: false
    };
    this.forumReplies.push(newReply);

    // Update topic reply count
    const topic = this.getTopicById(topicId);
    if (topic) {
      topic.replies++;
    }

    this.awardPoints(this.currentUser.id, 'forum_reply', this.pointsConfig.forumReply);
    this.saveToStorage();
    return newReply;
  },

  markAsSolution(replyId) {
    const reply = this.forumReplies.find(r => r.id === replyId);
    if (reply) {
      // Remove previous solution mark
      this.forumReplies
        .filter(r => r.topicId === reply.topicId)
        .forEach(r => r.isSolution = false);

      reply.isSolution = true;

      const topic = this.getTopicById(reply.topicId);
      if (topic) {
        topic.solved = true;
        topic.solvedReplyId = replyId;
      }

      this.awardPoints(reply.authorId, 'forum_solution', this.pointsConfig.forumSolution);
      this.saveToStorage();
    }
  },

  likeReply(replyId) {
    const reply = this.forumReplies.find(r => r.id === replyId);
    if (reply) {
      reply.likes++;
      this.awardPoints(reply.authorId, 'like_received', this.pointsConfig.forumLikeReceived);
      this.saveToStorage();
    }
  },

  incrementTopicViews(topicId) {
    const topic = this.getTopicById(topicId);
    if (topic) {
      topic.views++;
      this.saveToStorage();
    }
  }
};

// Inicializar store
NexusStore.init();
window.NexusStore = NexusStore;
