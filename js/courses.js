/**
 * NEP DELIVERY CONTROL - COURSES MODULE
 * Módulo de Cursos e Treinamentos com Provas e Pontuação
 * Integrado com Firestore
 */

const NepCourses = {
  courses: [],
  userProgress: {},

  SAMPLE_COURSES: [
    {
      id: 'python-colab-fundamentos',
      title: 'Fundamentos do Python no Google Colab',
      desc: 'Aprenda Python do zero usando o Google Colab. Passo a passo completo desde a criação da conta até análise de dados.',
      duration: '5h 00m',
      points: 100,
      icon: '🐍',
      color: '#3776AB',
      modules: [
        {
          id: 'm1',
          title: '1. Introdução ao Google Colab',
          lessons: 4,
          content: [
            'O que é o Google Colab e por que usar',
            'Criando sua conta Google (se necessário)',
            'Acessando colab.research.google.com',
            'Interface do Colab: células de código e texto'
          ]
        },
        {
          id: 'm2',
          title: '2. Primeiros Passos com Python',
          lessons: 5,
          content: [
            'Executando sua primeira linha: print("Olá, Mundo!")',
            'Variáveis e tipos de dados (int, float, str, bool)',
            'Operações matemáticas básicas (+, -, *, /, **)',
            'Comentários no código (#)',
            'Inserindo dados com input()'
          ]
        },
        {
          id: 'm3',
          title: '3. Estruturas de Dados',
          lessons: 5,
          content: [
            'Listas: criação, acesso e métodos (append, remove)',
            'Dicionários: chave-valor para organizar dados',
            'Tuplas: sequências imutáveis',
            'Fatiamento (slicing) de listas',
            'Exercício: lista de tarefas simples'
          ]
        },
        {
          id: 'm4',
          title: '4. Controle de Fluxo',
          lessons: 4,
          content: [
            'Condicionais: if, elif, else',
            'Operadores de comparação (==, !=, <, >, <=, >=)',
            'Operadores lógicos (and, or, not)',
            'Loops: for e while'
          ]
        },
        {
          id: 'm5',
          title: '5. Funções',
          lessons: 4,
          content: [
            'Criando funções com def',
            'Parâmetros e argumentos',
            'Retorno de valores (return)',
            'Funções úteis: len(), sum(), max(), min()'
          ]
        },
        {
          id: 'm6',
          title: '6. Trabalhando com Dados no Colab',
          lessons: 5,
          content: [
            'Instalando bibliotecas: !pip install',
            'Importando pandas e numpy',
            'Carregando arquivos CSV do Drive ou URL',
            'Visualizando dados com df.head() e df.info()',
            'Estatísticas básicas com df.describe()'
          ]
        },
        {
          id: 'm7',
          title: '7. Projeto Final: Análise Simples',
          lessons: 3,
          content: [
            'Importando um dataset público',
            'Limpeza básica de dados',
            'Gerando estatísticas e insights'
          ]
        },
        { id: 'm8', title: 'Prova Final', lessons: 1, isExam: true }
      ],
      exam: {
        passingScore: 70,
        questions: [
          {
            q: 'Qual comando exibe texto na tela em Python?',
            options: ['echo()', 'print()', 'display()', 'show()'],
            correct: 1
          },
          {
            q: 'Como você cria uma lista em Python?',
            options: ['{}', '()', '[]', '<>'],
            correct: 2
          },
          {
            q: 'Qual biblioteca é usada para manipular dados tabulares?',
            options: ['numpy', 'pandas', 'matplotlib', 'sklearn'],
            correct: 1
          },
          {
            q: 'Como você define uma função em Python?',
            options: ['function nome():', 'def nome():', 'func nome():', 'define nome():'],
            correct: 1
          },
          {
            q: 'Qual método mostra as primeiras linhas de um DataFrame?',
            options: ['df.first()', 'df.head()', 'df.top()', 'df.start()'],
            correct: 1
          }
        ]
      }
    },
    {
      id: 'tipos-graficos-usos',
      title: 'Tipos de Gráficos e Seus Usos',
      desc: 'Aprenda a escolher o gráfico certo para cada tipo de dado. Guia completo para comunicação visual efetiva.',
      duration: '3h 30m',
      points: 80,
      icon: '📊',
      color: '#E97132',
      modules: [
        {
          id: 'm1',
          title: '1. Fundamentos da Visualização',
          lessons: 3,
          content: [
            'Por que visualizar dados?',
            'Princípios de design visual (clareza, precisão, eficiência)',
            'Erros comuns em gráficos'
          ]
        },
        {
          id: 'm2',
          title: '2. Gráficos de Comparação',
          lessons: 4,
          content: [
            'Gráfico de Barras: comparar categorias (vendas por região)',
            'Gráfico de Barras Empilhadas: comparar partes dentro de categorias',
            'Gráfico de Barras Agrupadas: múltiplas séries lado a lado',
            'Quando NÃO usar barras (dados contínuos)'
          ]
        },
        {
          id: 'm3',
          title: '3. Gráficos de Proporção',
          lessons: 4,
          content: [
            'Gráfico de Pizza: composição de um todo (máx. 5-6 fatias)',
            'Gráfico de Rosca (Donut): alternativa moderna à pizza',
            'Treemap: hierarquias e proporções complexas',
            'Gráfico de Área 100%: evolução de proporções no tempo'
          ]
        },
        {
          id: 'm4',
          title: '4. Gráficos de Tendência',
          lessons: 4,
          content: [
            'Gráfico de Linhas: evolução temporal (vendas mensais)',
            'Gráfico de Área: volume ao longo do tempo',
            'Sparklines: tendências compactas em dashboards',
            'Múltiplas linhas: comparando tendências'
          ]
        },
        {
          id: 'm5',
          title: '5. Gráficos de Distribuição',
          lessons: 4,
          content: [
            'Histograma: distribuição de frequências',
            'Boxplot: quartis, mediana e outliers',
            'Violin Plot: distribuição + densidade',
            'Gráfico de Densidade: curva suave de distribuição'
          ]
        },
        {
          id: 'm6',
          title: '6. Gráficos de Correlação',
          lessons: 3,
          content: [
            'Gráfico de Dispersão (Scatter): relação entre duas variáveis',
            'Bubble Chart: dispersão com terceira dimensão (tamanho)',
            'Matriz de Correlação (Heatmap): múltiplas correlações'
          ]
        },
        {
          id: 'm7',
          title: '7. Gráficos Especiais',
          lessons: 4,
          content: [
            'Gráfico de Radar: comparar múltiplas métricas',
            'Waterfall: decomposição de mudanças',
            'Gauge/Velocímetro: KPIs e metas',
            'Mapas Geográficos: dados por localização'
          ]
        },
        {
          id: 'm8',
          title: '8. Guia de Decisão',
          lessons: 3,
          content: [
            'Árvore de decisão: qual gráfico usar?',
            'Matriz: objetivo × tipo de dado',
            'Checklist de revisão antes de publicar'
          ]
        },
        { id: 'm9', title: 'Prova Final', lessons: 1, isExam: true }
      ],
      exam: {
        passingScore: 70,
        questions: [
          {
            q: 'Qual gráfico é melhor para mostrar evolução de vendas ao longo do tempo?',
            options: ['Pizza', 'Barras', 'Linhas', 'Dispersão'],
            correct: 2
          },
          {
            q: 'Gráfico de Pizza é recomendado para quantas categorias no máximo?',
            options: ['3', '5-6', '10', '15'],
            correct: 1
          },
          {
            q: 'Qual gráfico mostra a relação entre duas variáveis numéricas?',
            options: ['Barras', 'Pizza', 'Dispersão (Scatter)', 'Área'],
            correct: 2
          },
          {
            q: 'Boxplot é usado para visualizar:',
            options: ['Tendências temporais', 'Distribuição e outliers', 'Proporções', 'Comparação de categorias'],
            correct: 1
          },
          {
            q: 'Qual gráfico é ideal para mostrar composição de um todo (ex: market share)?',
            options: ['Linhas', 'Dispersão', 'Pizza ou Donut', 'Histograma'],
            correct: 2
          }
        ]
      }
    },
    {
      id: 'nep-logica-basica',
      title: 'Lógica Básica de Negócios NEP',
      desc: 'Domine as métricas fundamentais de qualidade e operação: NPS, Recall, Estatística Básica e Probabilidade.',
      duration: '4h 00m',
      points: 120,
      icon: '🧠',
      color: '#9c5cff',
      modules: [
        {
          id: 'ml1',
          title: '1. NPS (Net Promoter Score)',
          lessons: 3,
          content: [
            'O que é NPS e como calcular (0-10)',
            'Classificação: Promotores (9-10), Neutros (7-8), Detratores (0-6)',
            'Impacto financeiro de cada grupo'
          ]
        },
        {
          id: 'ml2',
          title: '2. Recall e FCR',
          lessons: 4,
          content: [
            'Entendendo o Recall (Rechamada)',
            'Conceito de FCR (First Contact Resolution)',
            'A correlação inversa: Alta eficiência = Baixo Recall',
            'Custos ocultos do retrabalho'
          ]
        },
        {
          id: 'ml3',
          title: '3. Correlação Matemática',
          lessons: 3,
          content: [
            'Volume x Qualidade',
            'Como o Recall impacta a projeção de NPS',
            'Simulando cenários de crise'
          ]
        },
        {
          id: 'ml4',
          title: '4. Estatística para Gestão',
          lessons: 4,
          content: [
            'Média vs Mediana: entendendo a diferença',
            'Identificando Outliers (pontos fora da curva)',
            'Quando usar cada métrica para relatórios',
            'Viés de análise em amostras pequenas'
          ]
        },
        {
          id: 'ml5',
          title: '5. Probabilidade e Risco',
          lessons: 3,
          content: [
            'Método de Monte Carlo (Simulação)',
            'Calculando risco de falha em massa',
            'Impacto do risco no cliente final'
          ]
        },
        { id: 'ml_exam', title: 'Prova de Lógica', lessons: 1, isExam: true }
      ],
      exam: {
        passingScore: 80,
        questions: [
          {
            q: 'Um cliente deu nota 8. Como ele é classificado no NPS?',
            options: ['Promotor', 'Neutro', 'Detrator', 'Passivo'],
            correct: 1
          },
          {
            q: 'Qual métrica indica que o problema foi resolvido no primeiro contato?',
            options: ['NPS', 'Churn', 'FCR', 'Recall'],
            correct: 2
          },
          {
            q: 'Se a média é muito menor que a mediana, o que isso indica?',
            options: ['Distribuição Normal', 'Outliers negativos puxando a média', 'Outliers positivos puxando a média', 'Erro de cálculo'],
            correct: 1
          },
          {
            q: 'O que o NPS mede principalmente?',
            options: ['Lucro', 'Lealdade do Cliente', 'Tempo de Atendimento', 'Produtividade'],
            correct: 1
          },
          {
            q: 'Detratores são clientes que deram notas entre:',
            options: ['0 e 6', '0 e 5', '6 e 8', '1 e 5'],
            correct: 0
          }
        ]
      }
    },
    {
      id: 'nep-tech-langs',
      title: 'Arquitetura e Linguagens de Programação',
      desc: 'Guia estratégico para escolher a tecnologia certa. Do Web ao Mobile, do Backend ao Baixo Nível.',
      duration: '6h 30m',
      points: 150,
      icon: '💻',
      color: '#10b981',
      modules: [
        {
          id: 'mt1',
          title: '1. O Ecossistema Web',
          lessons: 3,
          content: [
            'HTML5: A estrutura não-negociável',
            'CSS3: Design e Responsividade',
            'JavaScript: A linguagem onipresente da Web'
          ]
        },
        {
          id: 'mt2',
          title: '2. Backend Corporativo',
          lessons: 4,
          content: [
            'Java: O padrão Enterprise robusto',
            'C# (.NET): A potência do ecossistema Microsoft',
            'Quando usar linguagens tipadas e estáticas',
            'Escalabilidade vertical vs horizontal'
          ]
        },
        {
          id: 'mt3',
          title: '3. Backend Moderno & Cloud',
          lessons: 4,
          content: [
            'Go (Golang): Performance para microsserviços',
            'Node.js: Unificando stack (JS no server)',
            'Python: Simplicidade e velocidade de desenvolvimento',
            'Serverless e Funções'
          ]
        },
        {
          id: 'mt4',
          title: '4. Dados e I.A.',
          lessons: 3,
          content: [
            'Python: O rei da Ciência de Dados',
            'R: Estatística pura e acadêmica',
            'SQL: A linguagem universal dos dados'
          ]
        },
        {
          id: 'mt5',
          title: '5. Mobile & Nativo',
          lessons: 4,
          content: [
            'Kotlin (Android) e Swift (iOS): O caminho nativo',
            'Flutter e React Native: O caminho híbrido/cross-platform',
            'Trade-offs de performance vs produtividade'
          ]
        },
        {
          id: 'mt6',
          title: '6. Baixo Nível (Systems)',
          lessons: 3,
          content: [
            'C: O controle total do hardware',
            'Rust: Performance com segurança de memória',
            'Quando descer para o baixo nível?'
          ]
        },
        { id: 'mt_exam', title: 'Prova de Arquitetura', lessons: 1, isExam: true }
      ],
      exam: {
        passingScore: 75,
        questions: [
          {
            q: 'Qual linguagem é considerada o padrão para Ciência de Dados hoje?',
            options: ['Java', 'C++', 'Python', 'Go'],
            correct: 2
          },
          {
            q: 'Para máxima performance em microsserviços cloud-native, qual é a recomendação moderna?',
            options: ['PHP', 'Go (Golang)', 'Ruby', 'Visual Basic'],
            correct: 1
          },
          {
            q: 'Qual destas NÃO é uma linguagem de Backend?',
            options: ['Java', 'HTML', 'Python', 'C#'],
            correct: 1
          },
          {
            q: 'Flutter permite desenvolver para:',
            options: ['Apenas Android', 'Apenas iOS', 'Android e iOS com um código', 'Apenas Web'],
            correct: 2
          },
          {
            q: 'Qual técnica o Rust usa para garantir segurança de memória?',
            options: ['Garbage Collector', 'Ownership & Borrowing', 'Ponteiros manuais', 'Virtual Machine'],
            correct: 1
          }
        ]
      }
    }
  ],

  async init() {
    // Carregar cursos do Firestore ou usar sample
    try {
      if (window.firebase && firebase.firestore) {
        const db = firebase.firestore();
        const snapshot = await db.collection('courses').get();
        if (!snapshot.empty) {
          this.courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
          this.courses = this.SAMPLE_COURSES;
        }
      } else {
        this.courses = this.SAMPLE_COURSES;
      }
    } catch (e) {
      console.warn('[Courses] Usando dados de exemplo:', e);
      this.courses = this.SAMPLE_COURSES;
    }

    // Carregar progresso do usuário
    const uid = localStorage.getItem('nep_user_uid');
    if (uid) {
      try {
        const progressKey = `nep_course_progress_${uid}`;
        this.userProgress = JSON.parse(localStorage.getItem(progressKey) || '{}');
      } catch (e) {
        this.userProgress = {};
      }
    }
  },

  async render(container) {
    await this.init();

    const completedCount = Object.values(this.userProgress).filter(p => p.completed).length;

    container.innerHTML = `
          <div class="courses-container animate-fade-in">
            <div class="courses-header">
              <div>
                <h1 class="courses-title">Cursos & Treinamentos</h1>
                <p class="courses-subtitle">Desenvolva suas habilidades e ganhe pontos</p>
              </div>
              <div class="courses-stats">
                <span class="stat-badge">🎓 ${this.courses.length} Cursos</span>
                <span class="stat-badge success">✅ ${completedCount} Concluídos</span>
              </div>
            </div>

            <div class="courses-grid" id="courses-grid">
              ${this.courses.map(course => this.renderCourseCard(course)).join('')}
            </div>
          </div>
        `;

    this.injectStyles();
    this.attachEvents();
  },

  renderCourseCard(course) {
    const progress = this.userProgress[course.id] || { progress: 0, completed: false };
    const isCompleted = progress.completed;
    const progressPercent = progress.progress || 0;

    return `
          <div class="course-card ${isCompleted ? 'completed' : ''}" data-id="${course.id}" style="--course-color: ${course.color}">
            <div class="course-header">
              <div class="course-icon">${course.icon}</div>
              <div class="course-points">${isCompleted ? '✅ Concluído' : `+${course.points} pts`}</div>
            </div>
            <div class="course-body">
              <h3 class="course-title">${course.title}</h3>
              <p class="course-desc">${course.desc}</p>
              <div class="course-meta">
                <span>🕘 ${course.duration}</span>
                <span>📚 ${course.modules.length} Módulos</span>
              </div>
              ${progressPercent > 0 && !isCompleted ? `
                <div class="course-progress">
                  <div class="course-progress-bar" style="width: ${progressPercent}%"></div>
                </div>
                <div class="course-progress-text">${progressPercent}% concluído</div>
              ` : ''}
              <button class="course-action" data-id="${course.id}">
                ${isCompleted ? 'Revisar Curso' : progressPercent > 0 ? 'Continuar' : 'Iniciar Curso'}
              </button>
            </div>
          </div>
        `;
  },

  attachEvents() {
    document.querySelectorAll('.course-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const courseId = btn.dataset.id;
        const course = this.courses.find(c => c.id === courseId);
        if (course) this.openCourseModal(course);
      });
    });
  },

  openCourseModal(course) {
    document.getElementById('course-modal')?.remove();

    const progress = this.userProgress[course.id] || { progress: 0, completed: false, modulesCompleted: [] };

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'course-modal';
    modal.innerHTML = `
            <div class="modal-container" style="max-width: 600px;">
                <div class="modal-header" style="background: linear-gradient(135deg, ${course.color}, ${course.color}88); color: white;">
                    <h3>${course.icon} ${course.title}</h3>
                    <button class="modal-close" onclick="document.getElementById('course-modal').remove()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">${course.desc}</p>
                    
                    <h4 style="margin-bottom: 12px;">📚 Módulos do Curso</h4>
                    <div class="modules-list">
                        ${course.modules.map((mod, idx) => {
      const isCompleted = (progress.modulesCompleted || []).includes(mod.id);
      return `
                                <div class="module-item ${isCompleted ? 'completed' : ''} ${mod.isExam ? 'exam' : ''}" data-module="${mod.id}">
                                    <span class="module-number">${idx + 1}</span>
                                    <div class="module-info">
                                        <div class="module-title">${mod.title}</div>
                                        <div class="module-meta">${mod.isExam ? '📝 Prova' : `${mod.lessons} aulas`}</div>
                                    </div>
                                    <span class="module-status">
                                        ${isCompleted ? '✅' : mod.isExam ? '📝' : '▶️'}
                                    </span>
                                </div>
                            `;
    }).join('')}
                    </div>

                    <div style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="btn btn-secondary" onclick="document.getElementById('course-modal').remove()">Fechar</button>
                        ${course.exam && !progress.completed ? `
                            <button class="btn btn-primary" id="btn-start-exam" data-course="${course.id}">
                                <i class="fa-solid fa-file-pen"></i> Fazer Prova Final
                            </button>
                        ` : ''}
                        ${!progress.completed ? `
                            <button class="btn btn-success" id="btn-complete-module" data-course="${course.id}">
                                <i class="fa-solid fa-check"></i> Marcar Módulo Concluído
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Eventos
    modal.querySelector('#btn-start-exam')?.addEventListener('click', () => {
      modal.remove();
      this.openExamModal(course);
    });

    modal.querySelector('#btn-complete-module')?.addEventListener('click', () => {
      this.completeNextModule(course);
      modal.remove();
      this.render(document.getElementById('page-content'));
    });

    document.querySelectorAll('.module-item').forEach(item => {
      item.addEventListener('click', () => {
        const modId = item.dataset.module;
        const mod = course.modules.find(m => m.id === modId);
        if (mod?.isExam && course.exam) {
          modal.remove();
          this.openExamModal(course);
        } else if (mod?.content) {
          // Abrir modal de conteúdo do módulo
          this.openModuleContentModal(course, mod);
        } else {
          NexusApp?.showToast?.(`Abrindo: ${mod?.title}`, 'info');
        }
      });
    });
  },

  openModuleContentModal(course, mod) {
    document.getElementById('module-content-modal')?.remove();

    const contentModal = document.createElement('div');
    contentModal.className = 'modal-overlay';
    contentModal.id = 'module-content-modal';
    contentModal.innerHTML = `
      <div class="modal-container" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
        <div class="modal-header" style="background: linear-gradient(135deg, ${course.color}, ${course.color}88); color: white;">
          <h3>${mod.title}</h3>
          <button class="modal-close" onclick="document.getElementById('module-content-modal').remove()">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="module-content-info" style="margin-bottom: 20px;">
            <span style="color: var(--text-tertiary);">📚 ${mod.lessons} aulas</span>
          </div>
          
          <h4 style="margin-bottom: 16px;">📋 Conteúdo do Módulo</h4>
          <div class="module-lessons-list" style="display: flex; flex-direction: column; gap: 12px;">
            ${mod.content.map((lesson, idx) => `
              <div class="lesson-item" style="display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: var(--surface-elevated); border-radius: 10px; border-left: 4px solid ${course.color};">
                <span style="width: 28px; height: 28px; background: ${course.color}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; flex-shrink: 0;">${idx + 1}</span>
                <div style="flex: 1;">
                  <div style="font-weight: 500; margin-bottom: 4px;">${lesson}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="margin-top: 24px; display: flex; gap: 10px;">
            <button class="btn btn-secondary" onclick="document.getElementById('module-content-modal').remove()">Fechar</button>
            <button class="btn btn-success" id="btn-complete-this-module" style="flex: 1;">
              <i class="fa-solid fa-check"></i> Marcar como Concluído
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(contentModal);

    // Evento para marcar módulo como concluído
    contentModal.querySelector('#btn-complete-this-module')?.addEventListener('click', () => {
      this.completeSpecificModule(course, mod.id);
      contentModal.remove();
      document.getElementById('course-modal')?.remove();
      this.render(document.getElementById('page-content'));
    });

    // Fechar ao clicar fora
    contentModal.addEventListener('click', (e) => {
      if (e.target === contentModal) contentModal.remove();
    });
  },

  completeSpecificModule(course, modId) {
    const uid = localStorage.getItem('nep_user_uid');
    if (!uid) return;

    const progress = this.userProgress[course.id] || { progress: 0, completed: false, modulesCompleted: [] };

    if (!progress.modulesCompleted.includes(modId)) {
      progress.modulesCompleted.push(modId);
    }

    const nonExamModules = course.modules.filter(m => !m.isExam);
    progress.progress = Math.round((progress.modulesCompleted.length / nonExamModules.length) * 100);

    this.userProgress[course.id] = progress;
    this.saveProgress(uid);

    NexusApp?.showToast?.('Módulo concluído! +5 pts', 'success');

    // Gamificação
    if (window.NexusGamification) {
      window.NexusGamification.addPoints(uid, 5, 'MODULE_COMPLETED', 'Módulo concluído');
      if (window.NexusAchievements) window.NexusAchievements.incrementStat(uid, 'modules_completed');
    }
  },

  completeNextModule(course) {
    const uid = localStorage.getItem('nep_user_uid');
    if (!uid) return;

    const progress = this.userProgress[course.id] || { progress: 0, completed: false, modulesCompleted: [] };
    const nonExamModules = course.modules.filter(m => !m.isExam);

    // Encontrar próximo módulo não concluído
    for (const mod of nonExamModules) {
      if (!progress.modulesCompleted.includes(mod.id)) {
        progress.modulesCompleted.push(mod.id);
        break;
      }
    }

    // Calcular progresso
    progress.progress = Math.round((progress.modulesCompleted.length / nonExamModules.length) * 100);

    this.userProgress[course.id] = progress;
    this.saveProgress(uid);

    NexusApp?.showToast?.('Módulo concluído!', 'success');
  },

  openExamModal(course) {
    if (!course.exam) return;

    const questions = course.exam.questions;
    let currentQuestion = 0;
    let answers = [];

    const renderQuestion = () => {
      const q = questions[currentQuestion];
      return `
                <div class="exam-question">
                    <div class="exam-progress">
                        Questão ${currentQuestion + 1} de ${questions.length}
                    </div>
                    <h3 class="exam-question-text">${q.q}</h3>
                    <div class="exam-options">
                        ${q.options.map((opt, idx) => `
                            <button class="exam-option" data-idx="${idx}">${opt}</button>
                        `).join('')}
                    </div>
                </div>
            `;
    };

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'exam-modal';
    modal.innerHTML = `
            <div class="modal-container" style="max-width: 500px;">
                <div class="modal-header" style="background: linear-gradient(135deg, ${course.color}, ${course.color}88); color: white;">
                    <h3>📝 Prova: ${course.title}</h3>
                </div>
                <div class="modal-body" id="exam-content">
                    ${renderQuestion()}
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    const attachOptionEvents = () => {
      document.querySelectorAll('.exam-option').forEach(opt => {
        opt.addEventListener('click', () => {
          answers[currentQuestion] = parseInt(opt.dataset.idx);
          currentQuestion++;

          if (currentQuestion < questions.length) {
            document.getElementById('exam-content').innerHTML = renderQuestion();
            attachOptionEvents();
          } else {
            // Calcular resultado
            let correct = 0;
            questions.forEach((q, idx) => {
              if (answers[idx] === q.correct) correct++;
            });
            const score = Math.round((correct / questions.length) * 100);
            const passed = score >= course.exam.passingScore;

            document.getElementById('exam-content').innerHTML = `
                            <div class="exam-result ${passed ? 'passed' : 'failed'}">
                                <div class="result-icon">${passed ? '🎉' : '😔'}</div>
                                <h3>${passed ? 'Parabéns!' : 'Não foi dessa vez'}</h3>
                                <div class="result-score">${score}%</div>
                                <p>${passed ? `Você passou! +${course.points} pontos` : `Mínimo: ${course.exam.passingScore}%. Tente novamente!`}</p>
                                <button class="btn btn-primary" id="btn-close-exam">
                                    ${passed ? 'Concluir Curso' : 'Tentar Novamente'}
                                </button>
                            </div>
                        `;

            document.getElementById('btn-close-exam').addEventListener('click', async () => {
              if (passed) {
                await this.completeCourse(course);
              }
              modal.remove();
              this.render(document.getElementById('page-content'));
            });
          }
        });
      });
    };

    attachOptionEvents();
  },

  async completeCourse(course) {
    const uid = localStorage.getItem('nep_user_uid');
    if (!uid) return;

    // Marcar como concluído
    this.userProgress[course.id] = {
      progress: 100,
      completed: true,
      completedAt: new Date().toISOString(),
      modulesCompleted: course.modules.map(m => m.id)
    };

    this.saveProgress(uid);

    // Creditar pontos via NexusGamification (sistema unificado)
    if (window.NexusGamification) {
      await window.NexusGamification.addPoints(uid, course.points, 'COURSE_COMPLETED', `Curso concluído: ${course.title}`);
      if (window.NexusAchievements) window.NexusAchievements.incrementStat(uid, 'courses_completed');
    }

    NexusApp?.showToast?.(`Curso concluído! +${course.points} pontos`, 'success');
  },

  saveProgress(uid) {
    const progressKey = `nep_course_progress_${uid}`;
    localStorage.setItem(progressKey, JSON.stringify(this.userProgress));
  },

  injectStyles() {
    if (document.getElementById('courses-style')) return;

    const style = document.createElement('style');
    style.id = 'courses-style';
    style.textContent = `
            .courses-container { max-width: 1200px; margin: 0 auto; }
            .courses-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
            .courses-title { font-size: 28px; font-weight: 700; }
            .courses-subtitle { color: var(--text-secondary); margin-top: 5px; }
            .courses-stats { display: flex; gap: 10px; }
            .stat-badge { background: rgba(47, 111, 237, 0.1); color: #2f6fed; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 13px; }
            .stat-badge.success { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
            
            .courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
            .course-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 16px; overflow: hidden; transition: all 0.2s; }
            .course-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
            .course-card.completed { border-color: #22c55e; }
            
            .course-header { height: 120px; background: linear-gradient(135deg, rgba(15,23,41,0.9), rgba(15,23,41,0.6)), var(--course-color); display: flex; align-items: center; justify-content: center; position: relative; }
            .course-icon { font-size: 48px; }
            .course-points { position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.4); color: #fff; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }
            
            .course-body { padding: 20px; }
            .course-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
            .course-desc { font-size: 14px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5; }
            .course-meta { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-tertiary); margin-bottom: 16px; }
            
            .course-progress { height: 6px; background: var(--surface-elevated); border-radius: 3px; margin-bottom: 8px; overflow: hidden; }
            .course-progress-bar { height: 100%; background: linear-gradient(90deg, #3b82f6, #9c5cff); border-radius: 3px; }
            .course-progress-text { font-size: 12px; color: var(--text-tertiary); margin-bottom: 12px; }
            
            .course-action { width: 100%; padding: 10px; background: rgba(47, 111, 237, 0.1); border: 1px solid rgba(47, 111, 237, 0.2); color: #2f6fed; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
            .course-action:hover { background: #2f6fed; color: #fff; }
            
            .modules-list { display: flex; flex-direction: column; gap: 8px; }
            .module-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-elevated); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
            .module-item:hover { background: var(--surface-hover); }
            .module-item.completed { opacity: 0.7; }
            .module-item.exam { border: 1px solid #f59e0b; }
            .module-number { width: 28px; height: 28px; background: var(--primary-500); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; }
            .module-info { flex: 1; }
            .module-title { font-weight: 500; }
            .module-meta { font-size: 12px; color: var(--text-tertiary); }
            
            .exam-question { text-align: center; }
            .exam-progress { font-size: 13px; color: var(--text-tertiary); margin-bottom: 20px; }
            .exam-question-text { font-size: 18px; margin-bottom: 24px; }
            .exam-options { display: flex; flex-direction: column; gap: 10px; }
            .exam-option { padding: 14px; background: var(--surface-elevated); border: 1px solid var(--surface-border); border-radius: 10px; cursor: pointer; font-size: 15px; transition: all 0.2s; text-align: left; }
            .exam-option:hover { background: var(--primary-500); color: white; border-color: var(--primary-500); }
            
            .exam-result { text-align: center; padding: 30px 0; }
            .exam-result .result-icon { font-size: 64px; margin-bottom: 16px; }
            .exam-result .result-score { font-size: 48px; font-weight: 700; margin: 16px 0; }
            .exam-result.passed .result-score { color: #22c55e; }
            .exam-result.failed .result-score { color: #ef4444; }
        `;
    document.head.appendChild(style);
  }
};

window.NepCourses = NepCourses;
