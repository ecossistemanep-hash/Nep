/**
 * NEP DELIVERY CONTROL - ONBOARDING / DEMO DE FERRAMENTAS
 * Mostra um guia rápido na primeira vez que cada ferramenta é aberta,
 * com passos de uso e um botão "Carregar exemplo" que popula dados reais
 * para o usuário ver a ferramenta funcionando na hora.
 *
 * Também deixa um botão de ajuda ("Como usar") sempre disponível para
 * reabrir o guia depois.
 */

const ToolsOnboarding = {
  STORAGE_PREFIX: 'nep_tooldemo_seen_',

  // Registro de funções de "carregar exemplo" por ferramenta.
  // Cada ferramenta pode registrar a sua via ToolsOnboarding.registerDemo(id, fn).
  demoLoaders: {},

  registerDemo(toolId, fn) {
    this.demoLoaders[toolId] = fn;
  },

  // ============ CONTEÚDO DOS GUIAS ============
  guides: {
    correlacao: {
      title: 'Matriz de Correlação',
      what: 'Descobre quais indicadores andam juntos: quando um sobe, o outro sobe (ou cai) também.',
      steps: [
        'Baixe/prepare uma planilha Excel com uma coluna por indicador (ex.: TMA, TME, Satisfação, Aderência).',
        'Faça upload do arquivo.',
        'A matriz mostra o coeficiente de Pearson (−1 a +1) entre cada par de indicadores.',
        'Valores perto de +1 ou −1 = forte relação; perto de 0 = sem relação.'
      ],
      tip: 'Correlação não é causa. Use como pista para investigar, não como prova.'
    },
    factibilidade: {
      title: 'Calculadora de Factibilidade',
      what: 'Avalia se uma meta é realista comparando o resultado atual (baseline) com a capacidade do processo.',
      steps: [
        'Informe o baseline (resultado atual) e a meta desejada.',
        'Informe a capacidade histórica (melhor resultado já atingido de forma estável).',
        'A calculadora indica o gap e classifica a meta como factível, desafiadora ou irreal.'
      ],
      tip: 'Metas muito acima da capacidade histórica costumam frustrar a equipe. Use dados, não achismo.'
    },
    senha: {
      title: 'Gerador de Senha',
      what: 'Cria senhas fortes e aleatórias, com controle de tamanho e tipos de caractere.',
      steps: [
        'Escolha o tamanho e quais caracteres incluir (maiúsculas, números, símbolos).',
        'Clique em gerar.',
        'Copie a senha e use em um gerenciador de senhas.'
      ],
      tip: 'Senha forte tem 16+ caracteres, mistura tipos e nunca é reutilizada.'
    },
    pdca: {
      title: 'Estruturador PDCA',
      what: 'Organiza um ciclo de melhoria contínua em 4 fases: Planejar, Fazer, Checar, Agir.',
      steps: [
        'Defina o problema/objetivo.',
        'Adicione ações em cada fase (Plan, Do, Check, Act).',
        'Marque responsáveis e prazos.',
        'Acompanhe o status até fechar o ciclo.'
      ],
      tip: 'Um PDCA só termina quando o "Act" padroniza o que deu certo — ou reinicia o ciclo.'
    },
    dmaic: {
      title: 'Estruturador DMAIC',
      what: 'Roteiro Six Sigma para projetos de melhoria: Define, Measure, Analyze, Improve, Control.',
      steps: [
        'Define: escreva o problema e a meta.',
        'Measure: registre os dados atuais.',
        'Analyze: identifique as causas raiz.',
        'Improve: proponha e teste soluções.',
        'Control: padronize e monitore.'
      ],
      tip: 'A fase que mais se pula é a Control — sem ela, o problema volta.'
    },
    compressor: {
      title: 'Compressor de Vídeo',
      what: 'Reduz o tamanho de arquivos de vídeo direto no navegador, mantendo qualidade aceitável.',
      steps: [
        'Selecione o vídeo.',
        'Escolha o nível de compressão.',
        'Baixe o arquivo reduzido.'
      ],
      tip: 'Tudo acontece no seu navegador — o vídeo não é enviado para nenhum servidor.'
    },
    pareto: {
      title: 'Diagrama de Pareto',
      what: 'Aplica a regra 80/20: mostra quais poucas causas respondem pela maior parte dos problemas.',
      steps: [
        'Liste as categorias de problema e a frequência (quantidade) de cada uma.',
        'O gráfico ordena da maior para a menor e traça a linha de acumulado.',
        'Foque nas categorias até a linha cruzar ~80%.'
      ],
      tip: 'Resolver as 2-3 primeiras barras geralmente elimina a maioria dos casos.'
    },
    ishikawa: {
      title: 'Diagrama de Ishikawa (Espinha de Peixe)',
      what: 'Organiza as possíveis causas de um problema em 6 categorias (6M): Método, Máquina, Mão de obra, Material, Medição, Meio ambiente.',
      steps: [
        'Escreva o problema (a "cabeça do peixe").',
        'Adicione causas prováveis em cada categoria 6M.',
        'Discuta com a equipe quais causas são mais relevantes.'
      ],
      tip: 'Combine com os 5 Porquês: pegue a causa mais provável e pergunte "por quê?" 5 vezes.'
    },
    gut: {
      title: 'Matriz GUT',
      what: 'Prioriza problemas por Gravidade × Urgência × Tendência (cada um de 1 a 5).',
      steps: [
        'Liste os problemas.',
        'Dê nota 1-5 para Gravidade, Urgência e Tendência de cada um.',
        'A matriz multiplica (G×U×T) e ordena do mais crítico para o menos.'
      ],
      tip: 'Score máximo é 125 (5×5×5). Ataque primeiro os de maior pontuação.'
    },
    cronometro: {
      title: 'Cronômetro / Pomodoro',
      what: 'Técnica de foco: blocos de trabalho concentrado com pausas curtas.',
      steps: [
        'Inicie um bloco de foco (padrão 25 min).',
        'Trabalhe sem interrupções até o alarme.',
        'Faça a pausa curta e repita.'
      ],
      tip: 'A cada 4 blocos, faça uma pausa longa (15-30 min).'
    },
    fluxograma: {
      title: 'Criador de Fluxograma',
      what: 'Monta fluxogramas de processo arrastando formas e conectando as etapas.',
      steps: [
        'Arraste as formas (início, processo, decisão) para a área de trabalho.',
        'Conecte as etapas puxando das bordas.',
        'Edite os textos e exporte como imagem.'
      ],
      tip: 'Losango = decisão, com saídas "Sim" e "Não". Use para mapear processos antes de melhorá-los.'
    },
    cincoporques: {
      title: '5 Porquês',
      what: 'Chega à causa raiz de um problema perguntando "por quê?" sucessivamente.',
      steps: [
        'Escreva o problema.',
        'Pergunte "por que isso acontece?" e registre a resposta.',
        'Repita sobre cada resposta, geralmente ~5 vezes.',
        'A última resposta costuma ser a causa raiz a atacar.'
      ],
      tip: 'Se a resposta for "falta de gente/tempo/dinheiro", provavelmente parou cedo demais.'
    },
    cartacontrole: {
      title: 'Carta de Controle (CEP)',
      what: 'Monitora se um processo está estável ao longo do tempo, separando variação normal de sinais de problema.',
      steps: [
        'Registre as medições em ordem (uma por ponto: TMA por dia, defeitos por lote, etc.).',
        'A carta calcula a média e os limites de controle (±3σ).',
        'Pontos fora dos limites ou padrões suspeitos (regras Western Electric) acendem alertas.',
        'Informe LSL/USL (opcional) para ver a capacidade Cp/Cpk.'
      ],
      tip: 'Limites de controle vêm do próprio processo (voz do processo). Especificação (LSL/USL) vem do cliente. São coisas diferentes.'
    },
    geradorgraficos: {
      title: 'Gerador de Gráficos',
      what: 'Cria gráficos (barra, linha, pizza, etc.) a partir dos seus dados e exporta como imagem.',
      steps: [
        'Escolha o tipo de gráfico.',
        'Insira os rótulos e valores.',
        'Personalize cores e título.',
        'Exporte para usar em apresentações.'
      ],
      tip: 'Barra para comparar categorias, linha para evolução no tempo, pizza só quando há poucas fatias.'
    },
    estatistica: {
      title: 'Estatística Avançada',
      what: 'Análise estatística completa de um conjunto de dados: média, mediana, quartis, desvio, detecção de anomalias.',
      steps: [
        'Cole ou envie seus dados numéricos.',
        'A ferramenta calcula as principais estatísticas descritivas.',
        'Anomalias (outliers) são destacadas.'
      ],
      tip: 'A mediana é mais confiável que a média quando há valores extremos.'
    },
    nexus: {
      title: 'NEP Nexus',
      what: 'Visualização interativa do ecossistema NEP em formato de mandala orbital.',
      steps: ['Explore os módulos girando a mandala.', 'Clique nos nós para ver detalhes.'],
      tip: 'É uma visão panorâmica de como as partes do NEP se conectam.'
    },
    grafo: {
      title: 'Grafo do NEP',
      what: 'Mapa interativo de todos os módulos, conexões e fluxos de dados do sistema.',
      steps: ['Arraste os nós para reorganizar.', 'Passe o mouse para ver descrições.'],
      tip: 'Útil para entender dependências entre módulos.'
    }
  },

  // ============ FLUXO PRINCIPAL ============
  seen(toolId) {
    return localStorage.getItem(this.STORAGE_PREFIX + toolId) === 'true';
  },

  markSeen(toolId) {
    localStorage.setItem(this.STORAGE_PREFIX + toolId, 'true');
  },

  // Chamado após renderizar uma ferramenta. Mostra o guia se for a 1ª vez.
  maybeShow(toolId) {
    if (!this.guides[toolId]) return;
    this.injectHelpButton(toolId);
    if (!this.seen(toolId)) {
      this.show(toolId);
      this.markSeen(toolId);
    }
  },

  // Botão flutuante "Como usar" dentro do header da ferramenta
  injectHelpButton(toolId) {
    setTimeout(() => {
      const header = document.querySelector('.tools-header');
      if (!header || document.getElementById('tool-help-btn')) return;
      const btn = document.createElement('button');
      btn.id = 'tool-help-btn';
      btn.className = 'tool-help-btn';
      btn.innerHTML = '<i class="fa-solid fa-circle-question"></i> Como usar';
      btn.addEventListener('click', () => this.show(toolId));
      header.appendChild(btn);
    }, 50);
  },

  show(toolId) {
    const g = this.guides[toolId];
    if (!g) return;
    document.getElementById('tool-onboarding-modal')?.remove();

    const hasDemo = typeof this.demoLoaders[toolId] === 'function';
    const modal = document.createElement('div');
    modal.id = 'tool-onboarding-modal';
    modal.className = 'tool-onb-backdrop';
    modal.innerHTML = `
      <div class="tool-onb-card">
        <button class="tool-onb-close" aria-label="Fechar"><i class="fa-solid fa-times"></i></button>
        <div class="tool-onb-badge"><i class="fa-solid fa-graduation-cap"></i> Guia rápido</div>
        <h2 class="tool-onb-title">${g.title}</h2>
        <p class="tool-onb-what">${g.what}</p>
        <div class="tool-onb-steps-title">Como usar</div>
        <ol class="tool-onb-steps">
          ${g.steps.map(s => `<li>${s}</li>`).join('')}
        </ol>
        ${g.tip ? `<div class="tool-onb-tip"><i class="fa-solid fa-lightbulb"></i><span>${g.tip}</span></div>` : ''}
        <div class="tool-onb-actions">
          ${hasDemo ? `<button class="tool-onb-btn-demo"><i class="fa-solid fa-flask"></i> Carregar exemplo</button>` : ''}
          <button class="tool-onb-btn-start">Começar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));

    const close = () => {
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 200);
    };
    modal.querySelector('.tool-onb-close').addEventListener('click', close);
    modal.querySelector('.tool-onb-btn-start').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    if (hasDemo) {
      modal.querySelector('.tool-onb-btn-demo').addEventListener('click', () => {
        try { this.demoLoaders[toolId](); } catch (e) { console.warn('[Onboarding] demo falhou:', e); }
        close();
      });
    }
  },

  injectStyles() {
    if (document.getElementById('tool-onboarding-style')) return;
    const s = document.createElement('style');
    s.id = 'tool-onboarding-style';
    s.textContent = `
      .tool-help-btn {
        margin-left: auto; display: inline-flex; align-items: center; gap: 6px;
        background: var(--surface-elevated); border: 1px solid var(--surface-border);
        color: var(--text-secondary); font-size: 12px; font-weight: 600;
        padding: 7px 12px; border-radius: 8px; cursor: pointer; transition: all .2s;
      }
      .tool-help-btn:hover { color: var(--primary-400); border-color: var(--primary-500); }
      .tool-onb-backdrop {
        position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center;
        justify-content: center; padding: 20px; background: rgba(3, 6, 16, 0.55);
        backdrop-filter: blur(4px); opacity: 0; transition: opacity .2s;
      }
      .tool-onb-backdrop.open { opacity: 1; }
      .tool-onb-card {
        position: relative; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto;
        background: var(--surface-card); border: 1px solid var(--surface-border);
        border-radius: 18px; padding: 28px; box-shadow: 0 24px 60px rgba(0,0,0,0.4);
        transform: translateY(12px) scale(0.98); transition: transform .2s;
      }
      .tool-onb-backdrop.open .tool-onb-card { transform: translateY(0) scale(1); }
      .tool-onb-close {
        position: absolute; top: 16px; right: 16px; background: none; border: none;
        color: var(--text-tertiary); font-size: 18px; cursor: pointer; padding: 4px;
      }
      .tool-onb-close:hover { color: var(--text-primary); }
      .tool-onb-badge {
        display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;
        text-transform: uppercase; letter-spacing: .5px; color: var(--primary-400);
        background: rgba(117, 85, 232, 0.12); padding: 5px 10px; border-radius: 20px; margin-bottom: 14px;
      }
      .tool-onb-title { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0 0 8px; }
      .tool-onb-what { font-size: 14px; color: var(--text-secondary); line-height: 1.55; margin: 0 0 20px; }
      .tool-onb-steps-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-tertiary); margin-bottom: 10px; }
      .tool-onb-steps { margin: 0 0 18px; padding-left: 20px; display: flex; flex-direction: column; gap: 8px; }
      .tool-onb-steps li { font-size: 13.5px; color: var(--text-primary); line-height: 1.5; }
      .tool-onb-tip {
        display: flex; gap: 10px; align-items: flex-start; background: rgba(240, 172, 50, 0.10);
        border: 1px solid rgba(240, 172, 50, 0.25); border-radius: 10px; padding: 12px 14px; margin-bottom: 22px;
      }
      .tool-onb-tip i { color: #f0ac32; margin-top: 2px; }
      .tool-onb-tip span { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
      .tool-onb-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
      .tool-onb-btn-demo, .tool-onb-btn-start {
        height: 42px; padding: 0 20px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer;
        display: inline-flex; align-items: center; gap: 8px; border: 1px solid transparent;
      }
      .tool-onb-btn-demo { background: var(--surface-elevated); border-color: var(--surface-border); color: var(--text-primary); }
      .tool-onb-btn-demo:hover { border-color: var(--primary-500); color: var(--primary-400); }
      .tool-onb-btn-start { background: linear-gradient(135deg, var(--primary-500), var(--accent-500)); color: #fff; }
      .tool-onb-btn-start:hover { filter: brightness(1.08); }
    `;
    document.head.appendChild(s);
  }
};

ToolsOnboarding.injectStyles();
window.ToolsOnboarding = ToolsOnboarding;

// ============ EXEMPLOS (dados de demonstração) ============
// Registrados aqui porque este arquivo carrega depois das ferramentas Pro.

// Carta de Controle (CEP): TMA (min) de 20 dias, processo estável com 1 pico
// de causa especial (dia 13) — ideal para ver os limites e o alerta funcionando.
if (typeof CartaControlePro !== 'undefined') {
  ToolsOnboarding.registerDemo('cartacontrole', () => {
    CartaControlePro.data = [5.0, 4.9, 5.1, 4.8, 5.2, 5.0, 4.7, 5.1, 4.9, 5.0, 5.2, 4.8, 6.6, 5.1, 4.9, 5.0, 4.8, 5.2, 5.0, 4.9];
    CartaControlePro.chartType = 'individual';
    CartaControlePro.specs = { lsl: 4.0, usl: 6.0 };
    CartaControlePro.save();
    CartaControlePro.refresh();
    NexusApp?.showToast?.('Exemplo carregado: TMA de 20 dias com 1 ponto fora de controle', 'success');
  });
}

// Pareto: motivos de reclamação (regra 80/20)
if (typeof ParetoPro !== 'undefined') {
  ToolsOnboarding.registerDemo('pareto', () => {
    ParetoPro.data = [
      { id: 1, category: 'Falta de informação', value: 42 },
      { id: 2, category: 'Sistema lento', value: 28 },
      { id: 3, category: 'Erro de cadastro', value: 15 },
      { id: 4, category: 'Retrabalho', value: 9 },
      { id: 5, category: 'Outros', value: 6 }
    ];
    ParetoPro.save();
    ParetoPro.refresh();
    NexusApp?.showToast?.('Exemplo carregado: motivos de reclamação', 'success');
  });
}

// Matriz GUT: 4 problemas priorizados
if (typeof GUTPro !== 'undefined') {
  ToolsOnboarding.registerDemo('gut', () => {
    const mk = (problem, g, u, t) => ({ id: Date.now() + Math.random(), problem, g, u, t, gut: g * u * t, createdAt: new Date().toISOString() });
    GUTPro.data = [
      mk('Fila de chamados acima do SLA', 5, 5, 4),
      mk('Retrabalho por cadastro errado', 4, 3, 4),
      mk('Falta de treinamento em novos analistas', 3, 3, 5),
      mk('Relatório mensal manual e lento', 2, 2, 2)
    ];
    GUTPro.save();
    GUTPro.refresh();
    NexusApp?.showToast?.('Exemplo carregado: 4 problemas priorizados por GUT', 'success');
  });
}

// 5 Porquês: exemplo de causa raiz
if (typeof CincoPorquesPro !== 'undefined') {
  ToolsOnboarding.registerDemo('cincoporques', () => {
    CincoPorquesPro.data = {
      problem: 'Os chamados estão estourando o prazo de atendimento (SLA).',
      levels: [
        'Porque a fila acumula no início do turno.',
        'Porque poucos analistas começam no horário de pico.',
        'Porque a escala não considera o volume por faixa de horário.',
        'Porque a escala é feita só pela quantidade total do dia.',
        'Porque não há dado de volume por hora para planejar a escala. (causa raiz)'
      ]
    };
    CincoPorquesPro.save();
    CincoPorquesPro.refresh();
    NexusApp?.showToast?.('Exemplo carregado: análise de SLA de chamados', 'success');
  });
}
