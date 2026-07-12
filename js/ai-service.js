/**
 * NEXUS AI SERVICE - GEMINI v2.5 Flash
 * Serviço de IA usando Google Gemini para geração estruturada de conteúdo
 * Suporta JSON Mode para output confiável de slides
 */

const NexusIA = {
    // Chave configurada pelo admin — NUNCA cravar no código-fonte.
    // Para configurar: Console do navegador (F12) → window.setGeminiApiKey('sua-chave')
    get API_KEY() { return window.getGeminiApiKey ? window.getGeminiApiKey() : ''; },
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',

    // Schema para PPT Generation (força output estruturado)
    PPT_SCHEMA: {
        type: "object",
        properties: {
            type: { type: "string", enum: ["PPT_GENERATION"] },
            title: { type: "string" },
            subtitle: { type: "string" },
            slides: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        type: { type: "string", enum: ["content", "kpis", "chartBar", "chartPie", "chartLine", "twoColumn", "quote"] },
                        title: { type: "string" },
                        content: { type: "array", items: { type: "string" } },
                        kpis: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    label: { type: "string" },
                                    value: { type: "string" },
                                    icon: { type: "string" }
                                }
                            }
                        },
                        chartData: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    labels: { type: "array", items: { type: "string" } },
                                    values: { type: "array", items: { type: "number" } }
                                }
                            }
                        },
                        leftTitle: { type: "string" },
                        leftContent: { type: "array", items: { type: "string" } },
                        rightTitle: { type: "string" },
                        rightContent: { type: "array", items: { type: "string" } },
                        quote: { type: "string" },
                        author: { type: "string" }
                    },
                    required: ["type", "title"]
                }
            }
        },
        required: ["type", "title", "slides"]
    },

    /**
     * Chat principal - detecta se é pedido de PPT ou conversa normal
     */
    async chat(messages, contextConfig = { kanban: true, calendar: true, dashboard: true }) {
        try {
            const contextData = await this.gatherContext(contextConfig);
            const lastMessage = messages[messages.length - 1]?.content || '';

            // Detectar se é pedido de PPT/apresentação
            const isPPTRequest = this.isPPTRequest(lastMessage);

            if (isPPTRequest) {
                return await this.generatePPT(lastMessage, contextData);
            } else {
                return await this.generateText(messages, contextData);
            }
        } catch (error) {
            console.error('[NexusIA Gemini] Erro:', error);
            return `Desculpe, tive um problema ao processar sua solicitação. Erro: ${error.message}`;
        }
    },

    /**
     * Detecta se o prompt é um pedido de apresentação
     */
    isPPTRequest(text) {
        const keywords = ['ppt', 'apresentação', 'apresentacao', 'slides', 'powerpoint', 'slide'];
        const lower = text.toLowerCase();
        return keywords.some(kw => lower.includes(kw));
    },

    /**
     * Geração de PPT com JSON (prompt-based)
     */
    async generatePPT(prompt, contextData) {
        const systemPrompt = `Você é um especialista em criar apresentações executivas profissionais.
Analise os dados do contexto e crie uma apresentação em formato JSON.

DADOS DO SISTEMA:
${JSON.stringify(contextData, null, 2)}

FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
Responda APENAS com um JSON válido, sem texto extra, no seguinte formato:
{
  "type": "PPT_GENERATION",
  "title": "Título da Apresentação",
  "subtitle": "Subtítulo opcional",
  "slides": [
    { "type": "content", "title": "Titulo do Slide", "content": ["Bullet 1", "Bullet 2"] },
    { "type": "kpis", "title": "Indicadores", "kpis": [
      { "label": "Total", "value": "100", "icon": "📊" }
    ]},
    { "type": "chartBar", "title": "Gráfico", "chartData": [
      { "name": "Dados", "labels": ["A", "B", "C"], "values": [10, 20, 30] }
    ]}
  ]
}

TIPOS DE SLIDES DISPONÍVEIS:
- content: bullets de texto
- kpis: cards com métricas (max 4)
- chartBar: gráfico de barras
- chartPie: gráfico de pizza
- twoColumn: duas colunas comparativas
- quote: citação destacada

REGRAS:
1. Máximo 6 bullets por slide
2. Crie 4-6 slides relevantes
3. Use dados reais do contexto
4. Responda APENAS com o JSON, nada mais

PEDIDO: ${prompt}`;

        console.log('[NexusIA] Chamando Gemini para PPT...');

        const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 4096
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[NexusIA] Erro API:', error);
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('[NexusIA] Resposta Gemini:', data);

        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!jsonText) {
            throw new Error('Resposta vazia do Gemini');
        }

        console.log('[NexusIA] Texto retornado:', jsonText.substring(0, 200));

        // Retornar como bloco JSON para o estagiario.js processar
        return '```json\n' + jsonText + '\n```';
    },

    /**
     * Geração de Código HTML (Ferramenta Creator)
     */
    async generateHTMLCode(prompt, contextStr, fileContext = '') {
        const systemPrompt = `Você é um Desenvolvedor Frontend Sênior Especialista em UX/UI.
Sua tarefa é criar soluções web completas em UM ÚNICO ARQUIVO HTML (Single File Component).

OBJETIVO:
Criar uma ferramenta/página HTML baseada no pedido do usuário.
O código deve ser:
1. Autossuficiente (HTML + CSS + JS no mesmo arquivo).
2. Moderno e Bonito (Use fontes de sistema, sombras suaves, bordas arredondadas).
3. Responsivo.
4. Funcional (Se for checklist, deve marcar; Se for calculadora, deve calcular).

CONTEXTO DA CONVERSA:
${contextStr}

CONTEXTO DO ARQUIVO ANEXO (DADOS PARA USO):
${fileContext ? fileContext.substring(0, 10000) : 'Nenhum arquivo anexado.'}

REGRAS TÉCNICAS:
- Use CSS Grid/Flexbox.
- Use cores modernas (Indigo/Blue/Emerald) estilo Tailwind, mas com CSS puro.
- Evite bibliotecas externas desnecessárias.
- O código deve ser bem estruturado.

PEDIDO ATUAL DO USUÁRIO:
${prompt}

RESPOSTA ESPERADA:
Retorne APENAS o código HTML completo, iniciando com <!DOCTYPE html>.
Não coloque markdown em volta (ex: não use \`\`\`html).
Retorne o código puro.`;

        console.log('[NexusIA] Gerando HTML...');

        const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 8192 // Maior limite para código
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        let html = data.candidates?.[0]?.content?.parts?.[0]?.text;

        // Limpeza de segurança caso a IA use markdown
        if (html) {
            html = html.replace(/```html/g, '').replace(/```/g, '').trim();
        }

        return html;
    },

    /**
     * Geração de texto normal (conversa)
     */
    async generateText(messages, contextData) {
        const systemPrompt = `Você é o "Neuronio", o assistente inteligente da plataforma NEP.
Seu objetivo é ajudar o usuário a navegar, entender e utilizar o sistema com maestria.

CONHECIMENTO DO SISTEMA:
${this.getSystemKnowledge()}

DADOS ATUAIS DA OPERAÇÃO:
${JSON.stringify(contextData, null, 2)}

DIRETRIZES:
1. Seja ultra-útil: Se perguntarem "como faço X", dê o passo a passo exato.
2. Use os dados: Se perguntarem "como está o kanban?", analise o JSON de contexto.
3. Tom: Profissional, técnico mas acessível.
4. Formatação: Use Markdown (bold, listas) para facilitar a leitura.
5. Se pedirem algo fora do escopo do sistema, tente relacionar com alguma ferramenta existente (ex: "Não tenho isso, mas o 'Tools > 5 Porquês' pode ajudar...").`;

        // Construir histórico de mensagens para o Gemini
        const contents = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        // Adicionar system instruction como primeira mensagem
        contents.unshift({
            role: 'user',
            parts: [{ text: systemPrompt }]
        });
        contents.splice(1, 0, {
            role: 'model',
            parts: [{ text: 'Entendido! Estou pronto para ajudar com análises e insights sobre a operação.' }]
        });

        const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 2048
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Não consegui gerar uma resposta.';
    },

    /**
     * Coleta contexto do sistema
     */
    async gatherContext(config) {
        const context = {
            timestamp: new Date().toLocaleString('pt-BR'),
            sistema: 'NEP Delivery Control'
        };

        // Identificar usuário logado para filtrar dados
        const currentUser = window.NepAuth?.getUser?.();
        const myUid = currentUser?.uid || null;
        const myName = currentUser?.name || '';
        const isAdmin = currentUser?.isAdmin || false;
        const cargo = (currentUser?.cargo || currentUser?.roleKey || '').toUpperCase();
        const isManager = isAdmin || ['SUPERINTENDENTE', 'GERENTE', 'DIRETOR', 'ADMIN'].some(r => cargo.includes(r));

        // Adicionar info do usuário ao contexto
        context.usuario_logado = {
            nome: myName,
            cargo: currentUser?.cargo || currentUser?.roleKey || 'N/A',
            perfil: isManager ? 'Gestor/Admin' : 'Colaborador'
        };

        // Filtrar tarefas: gestores veem tudo, colaboradores veem apenas as suas
        const allTasks = window.NexusKanban?.allTasks || [];
        const userTasks = isManager ? allTasks : allTasks.filter(t =>
            t.ownerUid === myUid || (myName && t.owner === myName)
        );

        // Dashboard KPIs
        if (config.dashboard) {
            context.resumo = {
                total_tarefas: userTasks.length,
                concluidas: userTasks.filter(t => t.status === 'done').length,
                em_andamento: userTasks.filter(t => t.status === 'doing').length,
                bloqueadas: userTasks.filter(t => t.status === 'pending').length,
                backlog: userTasks.filter(t => t.status === 'backlog').length,
                taxa_conclusao: userTasks.length > 0
                    ? Math.round((userTasks.filter(t => t.status === 'done').length / userTasks.length) * 100) + '%'
                    : '0%',
                visao: isManager ? 'Todas as tarefas (visão gestão)' : 'Apenas suas tarefas'
            };
        }

        // Kanban detalhado
        if (config.kanban && window.NexusKanban) {
            context.kanban = {
                urgentes: userTasks.filter(t => t.priority === 'Urgente' && t.status !== 'done')
                    .slice(0, 5).map(t => ({ titulo: t.title, responsavel: t.owner, prazo: t.deadline })),
                recentes_concluidas: userTasks.filter(t => t.status === 'done')
                    .slice(0, 5).map(t => t.title),
                por_unidade: this.groupBy(userTasks, 'unit'),
                por_responsavel: this.groupBy(userTasks, 'owner'),
                riscos: userTasks.filter(t => t.status !== 'done' && t.deadline).map(t => {
                    const deadline = new Date(t.deadline + 'T23:59:59');
                    const diff = deadline - new Date();
                    const hours = diff / (1000 * 60 * 60);
                    if (hours < 0) return { titulo: t.title, risco: 'CRÍTICO (Expirado)', responsavel: t.owner };
                    if (hours < 24) return { titulo: t.title, risco: 'ALTO (Menos de 24h)', responsavel: t.owner };
                    if (hours < 72) return { titulo: t.title, risco: 'MÉDIO (Menos de 3 dias)', responsavel: t.owner };
                    return null;
                }).filter(Boolean)
            };
        }

        // Agendas
        if (config.calendar && window.NexusCalendar) {
            const agendas = window.NexusCalendar.agendas || [];
            context.agendas = {
                proximas: agendas.filter(a => !a.archived && a.status === 'Planejada')
                    .slice(0, 3).map(a => ({ data: a.date, titulo: a.title, responsavel: a.responsible })),
                ultimas_atas: agendas.filter(a => a.minute)
                    .slice(0, 2).map(a => ({ titulo: a.title, resumo: a.minute?.substring(0, 150) + '...' }))
            };
        }

        // Dados do arquivo carregado (se houver)
        if (window.NexusDataAnalyzer?.currentData) {
            context.arquivo_carregado = {
                nome: window.NexusDataAnalyzer.currentFileName,
                linhas: window.NexusDataAnalyzer.currentData.raw?.length || 0,
                colunas: window.NexusDataAnalyzer.currentData.headers || [],
                insights: window.NexusDataAnalyzer.generateSummary()?.insights?.slice(0, 5) || []
            };
        }

        // Futura Integração: Supabase Vector Search (RAG)
        // Permite que a IA consulte manuais e PDFs longos via pgvector
        // if (useSupabaseRAG) { const docs = await this.querySupabaseVectors(prompt); context.techMemory = docs; }

        return context;
    },

    /**
     * BASE DE CONHECIMENTO COMPLETA DO SISTEMA (NEP ECOSYSTEM)
     * Manual do Usuário integrado para o assistente responder todas as dúvidas.
     */
    getSystemKnowledge() {
        return `
# 📘 NEP DELIVERY CONTROL - BASE DE CONHECIMENTO COMPLETA

Você é o NEP Help, o assistente virtual inteligente do Ecossistema NEP. Você conhece TUDO sobre o sistema e deve responder de forma clara, amigável e em português brasileiro.

---

## 🌐 COMO ACESSAR O SISTEMA

1. **Acesse o link:** https://ecossistema-nep.web.app
2. **Faça login** com e-mail e senha cadastrados.
3. Após entrar, você verá o **Dashboard** (painel principal).

---

## 🧭 MENU DE NAVEGAÇÃO (Barra Lateral)

O menu fica do lado esquerdo da tela. Os módulos são:

### Seção Principal:
- **Dashboard** - Painel executivo com KPIs e gráficos
- **Kanban** - Gestão de tarefas em quadro visual
- **Ranking** - Pontuação e conquistas
- **Rotina ADM** - Checklist diário
- **Agendas** - Reuniões executivas
- **Resultados** - Dashboards PowerBI
- **Ferramentas** - Caixa de ferramentas de qualidade

### Seção Aprendizado:
- **Podcast** - Plataforma de podcast educacional (abre em nova aba)
- **Cursos** - Treinamentos com provas e pontuação
- **Fórum** - Comunidade para dúvidas e discussões
- **Neuronyo** - Assistente avançado com análise de dados e geração de PPT

### Seção Gestão:
- **Avisos** - Comunicados importantes
- **Férias** - Controle de férias
- **OKR/Entregas** - Gestão de entregas e feedback
- **Relatórios** - Criação de relatórios
- **Meu Perfil** - Informações pessoais e progresso

---

## 📊 DASHBOARD (Painel Executivo)

**Onde acessar:** Menu > Dashboard

### Propósito:
Central de comando que mostra resumo visual de tudo que está acontecendo.

### Funcionalidades:
- **KPIs:** Total de tarefas, concluídas, em progresso, taxa de conclusão, atraso médio
- **Gráficos:** Status das tarefas, prioridade, carga por pessoa
- **Mini-Ranking:** Top 5 colaboradores
- **Alertas:** Tarefas atrasadas ou urgentes

---

## 📋 KANBAN (Gestão de Tarefas)

**Onde acessar:** Menu > Kanban

### Propósito:
Coração da gestão de entregas. Quadro visual para criar, acompanhar e finalizar tarefas.

### Colunas do Quadro:
- **Backlog** - Tarefas planejadas, aguardando início
- **Em Progresso** - Alguém está trabalhando
- **Revisão** - Pronto, aguardando validação do gestor
- **Concluído** - Finalizado e aprovado
- **Arquivado** - Concluídas e arquivadas

### Como criar uma tarefa:
1. Clique em **"+ Nova Tarefa"**
2. Preencha título, descrição, responsável, prioridade, complexidade e prazo
3. Clique em **"Salvar"**

### Como entregar uma tarefa:
1. Mova o card para **"Revisão"**
2. Clique no card e use **"Entregar"**
3. Adicione descrição do que foi feito (evidência)

### Gamificação (Pontos):
- Ao concluir tarefas, você ganha **pontos**
- Pontuação depende de **prioridade** e **complexidade**
- Entregar antes do prazo dá bônus, atrasar penaliza

### Filtros:
- Filtre por status, prioridade, responsável ou busca por texto

---

## 🏆 RANKING (Pontuação e Conquistas)

**Onde acessar:** Menu > Ranking

### Propósito:
Veja quem são os colaboradores mais engajados e suas conquistas.

### Abas:
1. **Ranking** - Lista por pontos. Top 3 no pódio
2. **Conquistas** - Medalhas e badges desbloqueáveis
3. **Histórico** - Transações de pontos

### Dica:
Foque em tarefas de alta prioridade para subir mais rápido.

---

## ✅ ROTINA ADM (Checklist Diário)

**Onde acessar:** Menu > Rotina ADM

### Propósito:
Lista de verificação de tarefas rotineiras do dia.

### Como usar:
- Marque itens conforme concluir
- Adicione novos itens com **"+ Adicionar Item"**
- Reinicia diariamente

---

## 📅 AGENDAS (Reuniões Executivas)

**Onde acessar:** Menu > Agendas

### Propósito:
Organize, execute e documente reuniões.

### Funcionalidades:
1. **Dashboard de Agendas** - Reuniões agendadas, em andamento, concluídas
2. **Criar Nova Agenda** - Título, data/hora, participantes
3. **Executar Reunião** - Check-in, discussões, decisões, pendências
4. **Gerar Ata com IA** - Cria documento automaticamente

### Dica:
Adicione pendências com responsável e prazo. Baixe ou copie a ata para enviar.

---

## 📈 RESULTADOS (Dashboards PowerBI)

**Onde acessar:** Menu > Resultados

### Propósito:
Acesse painéis estratégicos com dados do PowerBI.

### Dashboards disponíveis:
- **Book de Resultados** - Visão consolidada
- **NEP ao Vivo** - Tempo real
- **JPS** - Jornada de Percepção
- **NEP Inspeção** - Qualidade
- **Detratores** - Clientes detratores
- **Análise de Causa** - Causa raiz

### Como usar:
Clique no card desejado. Abre nova aba com relatório.

---

## 🧰 FERRAMENTAS (Caixa de Ferramentas)

**Onde acessar:** Menu > Ferramentas

### Ferramentas de Produtividade:
- **Cronômetro/Pomodoro** - Controle de tempo com técnica Pomodoro
- **Gerador de Senha** - Cria senhas fortes

### Ferramentas de Qualidade & Análise:
- **PDCA** - Plan-Do-Check-Act
- **DMAIC** - Six Sigma
- **Pareto** - Gráfico 80/20
- **Ishikawa** - Espinha de peixe (causa e efeito)
- **GUT** - Gravidade, Urgência, Tendência
- **Fluxograma** - Criar fluxogramas visuais
- **NEP Correlação** - Análise de correlação
- **Calculadora Factibilidade** - Viabilidade de projetos

### APIs Externas:
- **NEP Clima** - Previsão do tempo (Open-Meteo)
- **Brasil Updates** - Notícias nacionais
- **Mundo em Foco** - Notícias internacionais
- **NEP Dicionário** - Significado de palavras
- **Brasil Data** - Consulta CEP, CNPJ, bancos, feriados

---

## 🎧 PODCAST

**Onde acessar:** Menu > Podcast (abre em nova aba)

### Propósito:
Plataforma de podcast educacional.

### Funcionalidades:
- Episódios por temporadas
- Conteúdo em áudio, texto e vídeo
- Provas para validar aprendizado
- Certificados de conclusão

---

## 🎓 CURSOS (Treinamentos)

**Onde acessar:** Menu > Cursos

### Propósito:
Cursos e treinamentos internos com provas e gamificação.

### Cursos disponíveis (exemplos):
- **Fundamentos do Python no Google Colab** - 100 pontos
- **Tipos de Gráficos e Seus Usos** - 80 pontos
- **Lógica Básica de Negócios NEP** - 120 pontos

### Como funciona:
1. Selecione um curso
2. Estude os módulos na ordem
3. Faça a **Prova Final**
4. Acertando 70%+, ganha os pontos

---

## 💬 FÓRUM (Comunidade)

**Onde acessar:** Menu > Fórum

### Propósito:
Tirar dúvidas, compartilhar conhecimento, discutir ideias.

### Categorias:
- 📢 **Novidades**
- 📚 **Conhecimento**
- ❓ **Dúvidas**
- 💡 **Sugestões**
- 💬 **Geral**

### Funcionalidades:
- Criar tópicos
- Responder
- Curtir respostas
- Marcar solução

---

## 🤖 ESTAGIÁRIO IA (Assistente Avançado)

**Onde acessar:** Menu > Neuronyo

### Propósito:
Assistente inteligente para tarefas complexas.

### Capacidades:
- **Responder perguntas** - Qualquer assunto
- **Analisar dados** - Envie Excel, CSV
- **Gerar apresentações (PPT)** - Slides sobre um tema
- **Resumir informações** - Textos longos

### Como usar:
1. Digite pergunta ou comando
2. Anexe arquivo se necessário
3. Envie e aguarde resposta

---

## 📢 AVISOS

**Onde acessar:** Menu > Avisos

### Propósito:
Comunicados importantes da gestão.

### Funcionalidades:
- Ver todos os avisos
- Filtrar por categoria
- Marcar como lido
- Criar novos avisos (com permissão)

---

## 🏖️ FÉRIAS (Controle de Férias)

**Onde acessar:** Menu > Férias

### Propósito:
Gerencie solicitações de férias.

### Funcionalidades:
- **KPIs** - Total, em gozo, aprovados, pendentes
- **Filtros** - Status, cargo, produto
- **Tabela** - Todos os registros
- **Formulário** - Registrar novas férias ou 13º

### Como solicitar férias:
1. Clique em **"+ Nova Programação"**
2. Preencha dados (nome, cargo, produto, período, tipo)
3. Clique em **"Salvar"**

### Status possíveis:
- Pendente, Aprovado, Em Gozo, Concluído, Cancelado

---

## 🎯 OKR / ENTREGAS

**Onde acessar:** Menu > OKR / Entregas

### Propósito:
Gestão de entregas individuais com feedback da gestão.

### Abas:
1. **Minhas Entregas** - Registrar entregas
2. **Avaliar Equipe** - Para gestores
3. **Dashboard** - Desempenho do mês
4. **PDI** - Desenvolvimento individual
5. **Base de Conhecimento** - Materiais de apoio

### Como registrar entrega:
1. Clique em **"+ Nova Entrega"**
2. Preencha título, descrição, tipo, evidências
3. Envie para avaliação

---

## 📊 RELATÓRIOS

**Onde acessar:** Menu > Relatórios

### Propósito:
Criar e gerenciar relatórios.

### Tipos:
- Diário, Semanal, Mensal, Incidente, Personalizados

### Como criar:
1. Clique em **"+ Novo Relatório"** ou use template
2. Preencha título e conteúdo
3. Anexe arquivos se necessário
4. Salve como rascunho ou concluído

---

## 👤 MEU PERFIL

**Onde acessar:** Menu > Meu Perfil

### Propósito:
Informações pessoais e progresso.

### Funcionalidades:
- Foto, nome, cargo, e-mail
- Nível e XP de gamificação
- Estatísticas e conquistas
- Histórico de pontos
- Hierarquia de níveis

### Alterar foto:
1. Clique no ícone de edição sobre a foto
2. Selecione imagem
3. Salva automaticamente

---

## ❓ PERGUNTAS FREQUENTES (FAQ)

### Esqueci minha senha:
Na tela de login, clique em **"Esqueci minha senha"** e siga instruções no e-mail.

### Tarefas não aparecem no Kanban:
Verifique se está logado com e-mail correto. Atualize a página (Ctrl+F5).

### Como ganhar mais pontos:
- Complete tarefas no Kanban
- Conclua cursos e provas
- Participe do Fórum

### Neuronyo não responde:
Pode haver lentidão na API. Aguarde e tente novamente.

### Notícias não carregam:
Limitação da API de notícias. Tente mais tarde.

### Contato com suporte:
Fale com seu gestor ou use o Fórum na categoria **Dúvidas**.

---

## 🚀 DICAS PARA NOVOS USUÁRIOS

1. Comece pelo **Dashboard** para entender o cenário
2. Explore o **Kanban** e crie sua primeira tarefa
3. Faça um **curso** para ganhar pontos
4. Use o **Neuronyo** para dúvidas
5. Participe do **Fórum** para se conectar

---

## INSTRUÇÕES DO ASSISTENTE NEP HELP

Você é o NEP Help, assistente virtual especialista do Ecossistema NEP. Suas diretrizes são:

1. **Seja amigável e claro** - Responda em português brasileiro, de forma simples
2. **Seja preciso** - Use as informações acima para responder corretamente
3. **Indique onde acessar** - Sempre diga em qual menu encontrar a funcionalidade
4. **Passo a passo** - Quando pedirem como fazer algo, dê instruções numeradas
5. **Use emojis** - Para deixar as respostas mais amigáveis
6. **Contexto** - Se receber dados JSON de contexto, use-os para análises
7. **Seja proativo** - Sugira funcionalidades relacionadas quando apropriado
8. **Admita limitações** - Se não souber algo, diga e sugira alternativas
        `;
    },

    /**
     * Helper: agrupa array por campo
     */
    groupBy(arr, field) {
        const result = {};
        arr.forEach(item => {
            const key = item[field] || 'Outros';
            result[key] = (result[key] || 0) + 1;
        });
        return result;
    }
};

// Expor globalmente
window.NexusIA = NexusIA;
