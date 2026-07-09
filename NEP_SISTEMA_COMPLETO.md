# NEP - NARRATIVA ESTRUTURADA DE PROCESSOS
## SISTEMA: NEP DELIVERY CONTROL v2.0

**Data:** 25/01/2026  
**Responsável:** Arquitetura de Processos NEP  
**Versão:** 2.0 (Profissional Exaustiva)  
**Status:** Auditável | 100% Fiel ao Código

---

## NÍVEL 1: IDENTIFICAÇÃO DO SISTEMA

| Atributo | Valor |
|----------|-------|
| **Nome** | NEP Delivery Control |
| **URL** | https://ecossistema-nep.web.app |
| **Arquitetura** | Frontend SPA + Firebase (Auth, Firestore, Storage) |
| **Tecnologias** | HTML5, CSS3, JavaScript ES6+, Chart.js, html2canvas, PptxGenJS |
| **Usuários** | Analistas, Monitores, Coordenadores, Consultores, Gerentes, Superintendentes, Administradores |

### 1.1 ATORES DO SISTEMA

| ID | Ator | Descrição |
|----|------|-----------|
| A1 | Usuário | Qualquer pessoa autenticada no sistema |
| A2 | Gestor | Coordenador/Gerente com permissão de aprovação |
| A3 | Admin | Acesso total ao painel administrativo |
| A4 | Frontend | Interface web (JavaScript) |
| A5 | Backend | Firebase Firestore + Cloud Functions |
| A6 | Serviços Externos | APIs: ViaCEP, BrasilAPI, HG Brasil, GNews, Perplexity AI |

---

## NÍVEL 2: MENUS E MÓDULOS

### MAPA HIERÁRQUICO COMPLETO

```
SISTEMA NEP
├── MENU PRINCIPAL
│   ├── Dashboard (NepDashboard)
│   ├── Kanban (NexusKanban)
│   ├── Ranking (NexusGamification)
│   ├── Agendas (NexusCalendar)
│   ├── Resultados (NexusResults)
│   └── Ferramentas (NexusTools) ─┬─ NEP Correlação
│                                 ├─ Calculadora Factibilidade
│                                 ├─ Gerador de Senha
│                                 ├─ Estruturador PDCA
│                                 ├─ Estruturador DMAIC
│                                 ├─ Compressor de Vídeo
│                                 ├─ Diagrama de Pareto
│                                 ├─ Diagrama de Ishikawa
│                                 ├─ Matriz GUT
│                                 ├─ Cronômetro/Pomodoro
│                                 ├─ NEP Clima (API)
│                                 ├─ NEP News Brasil (API)
│                                 ├─ NEP Mundo Updates (API)
│                                 ├─ NEP Dicionário (API)
│                                 ├─ NEP Brasil Data (API)
│                                 ├─ Criador de Fluxograma
│                                 ├─ 5 Porquês
│                                 ├─ Carta de Controle
│                                 ├─ Gerador de Gráficos
│                                 └─ NEP Nexus (Mandala)
├── MENU APRENDIZADO
│   ├── Podcast (NexusPodcast)
│   ├── Cursos (NexusCourses)
│   ├── Fórum (NexusForum)
│   └── Estagiário IA (NexusEstagiario)
├── MENU GESTÃO
│   ├── Avisos (NexusAnnouncements)
│   ├── Controle de Férias (NexusVacation)
│   ├── OKR & Entregas (NexusOKR)
│   ├── Relatórios (NexusReports)
│   └── Perfil (NexusProfile)
└── MENU ADMINISTRAÇÃO
    └── Painel Admin (NexusAdmin)
```

---

## NÍVEL 3: PROCESSOS DETALHADOS POR MÓDULO

### 3.1 MÓDULO: DASHBOARD (NepDashboard)

**Arquivo:** `dashboard.js` (515 linhas)

#### PROCESSO: Renderização do Dashboard

**Pré-condição:** Usuário autenticado com sessão válida.

| Passo | Ação | Detalhe Técnico |
|-------|------|-----------------|
| 1 | Sistema exibe skeleton loading | `renderSkeleton()` mostra 6 KPI placeholders + 3 chart placeholders |
| 2 | Sistema obtém usuário logado | `NepAuth.getUser()` ou `localStorage.nep_user_name` |
| 3 | Sistema carrega tarefas | `db.collection('tasks').orderBy('createdAt','desc').limit(100)` |
| 4 | Sistema calcula estatísticas | `calculateStats(tasks)` → backlog, doing, pending, done, onTimeRate |
| 5 | Sistema carrega pontos do usuário | `PointsService.getUserPoints(uid)` com timeout de 3000ms |
| 6 | Sistema carrega Top 5 ranking | `PointsService.getRanking(5)` com timeout de 2000ms |
| 7 | Sistema identifica tarefas atrasadas | Filtra onde `deadline < now` e `status !== 'done'` |
| 8 | Sistema renderiza UI completa | Header + 6 KPIs + 4 gráficos + ranking + alertas |
| 9 | Sistema inicializa gráficos Chart.js | `createStatusChart`, `createPriorityChart`, `createWorkloadChart`, `createTrendChart` |

**KPIs Exibidos:**
- Total Demandas
- Em Andamento
- Aguardando
- Concluídas
- Taxa On-Time (%)
- Pontos do Usuário (Nível)

**Gráficos:**
1. **Doughnut - Status**: Backlog, Em Andamento, Revisão, Concluído
2. **Bar Horizontal - SLA por Prioridade**: Urgente, Alto, Médio, Baixo
3. **Bar Vertical - Carga de Trabalho**: Demandas por responsável
4. **Line Area - Tendência Semanal**: Criadas vs Concluídas (7 dias)

---

### 3.2 MÓDULO: KANBAN (NexusKanban)

**Arquivo:** `kanban.js` (1096 linhas, 52 funções)

#### PROCESSO: Ciclo de Vida de uma Tarefa

```
[CRIAR] → [BACKLOG] → [A FAZER] → [EM ANDAMENTO] → [REVISÃO] → [CONCLUÍDO] → [ARQUIVADO]
```

#### SUBPROCESSO 3.2.1: Criar Nova Tarefa

| Passo | Ação | Detalhe Técnico |
|-------|------|-----------------|
| 1 | Usuário clica em "+" ou "Nova Demanda" | `openNewModal()` |
| 2 | Sistema abre modal de criação | Campos: título, descrição, unidade, responsável, prazo, prioridade, complexidade |
| 3 | Sistema calcula preview de pontos | `calculatePoints(priority, complexity)` |
| 4 | Usuário preenche e clica "Salvar" | Trigger: `saveTask()` |
| 5 | Sistema valida campos obrigatórios | Se inválido: `showToast('Erro', 'error')` |
| 6 | Sistema grava no Firestore | `db.collection('tasks').add(data)` → retorna `docRef.id` |
| 7 | Sistema adiciona metadados | `createdAt`, `createdBy`, `createdByName`, `status: 'backlog'`, `acknowledged: false` |
| 8 | Sistema envia notificação ao responsável | `NexusNotifications.add({ tipo: 'demanda', destinatario_uid: owner_uid })` |
| 9 | Sistema atualiza UI | `renderBoard()` → card aparece na coluna Backlog |

**Pontuação por Prioridade:**
| Prioridade | Pontos Base |
|------------|-------------|
| Baixo | 5 |
| Médio | 10 |
| Alto | 15 |
| Urgente | 25 |

**Multiplicador por Complexidade:**
| Complexidade | Multiplicador |
|--------------|---------------|
| Baixa | 1.0x |
| Média | 1.5x |
| Alta | 2.0x |

**Penalidade por Atraso:**
| Dias de Atraso | Penalidade |
|----------------|------------|
| 1 dia | -5 pts |
| 2 dias | -10 pts |
| 3+ dias | -15 pts |

#### SUBPROCESSO 3.2.2: Mover Tarefa (Drag & Drop)

| Passo | Ação | Detalhe Técnico |
|-------|------|-----------------|
| 1 | Usuário arrasta card | Evento `dragstart` com `draggable="true"` |
| 2 | Usuário solta em nova coluna | Evento `drop` captura `e.dataTransfer.getData('taskId')` |
| 3 | Sistema valida transição | Verifica se usuário tem permissão (`canSeeTask`, `isOwnerMe`) |
| 4 | Sistema atualiza status | `updateTaskInFirebase(taskId, { status: newStatus })` |
| 5 | **DECISÃO: Coluna = "Revisão"?** | |
| 5a | SE SIM: Abre modal de entrega | `openDeliveryModal()` → usuário adiciona comentário |
| 5b | SE NÃO: Apenas move | UI atualiza imediatamente |
| 6 | Sistema registra log | `AuditService.log('TASK_MOVED', { oldStatus, newStatus })` |

#### SUBPROCESSO 3.2.3: Validar Tarefa (Gestor)

| Passo | Ação | Detalhe Técnico |
|-------|------|-----------------|
| 1 | Gestor vê tarefa na coluna "Revisão" | Status = `pending` |
| 2 | Gestor clica no ícone de check | `openReviewModal(taskId)` |
| 3 | Sistema exibe detalhes da entrega | Comentário, data entrega, responsável |
| 4 | **DECISÃO: Aprovado?** | |
| 4a | SE SIM: `approveTask()` | → `status: 'done'`, `validated: true`, `validatedAt`, `validatedBy` |
| 4a.1 | Sistema calcula pontos finais | `calculateFinalPoints(task)` considera prazo, complexidade, atraso |
| 4a.2 | Sistema credita pontos | `PointsService.addPoints(uid, points, 'TASK_COMPLETE', desc)` |
| 4a.3 | Sistema exibe confete | Animação CSS + `showGameToast('+30 pontos!')` |
| 4a.4 | Sistema notifica responsável | `NexusNotifications.add({ tipo: 'validacao', titulo: 'Demanda aprovada!' })` |
| 4b | SE NÃO: `rejectTask()` | → `status: 'doing'`, `rejectionReason`, `rejectedAt` |
| 4b.1 | Sistema notifica responsável | `NexusNotifications.add({ tipo: 'validacao', titulo: 'Demanda devolvida' })` |

#### SUBPROCESSO 3.2.4: Arquivar/Deletar Tarefa

| Ação | Permissão | Comportamento |
|------|-----------|---------------|
| Arquivar | Qualquer dono/criador | `status: 'archived'` (soft delete) |
| Restaurar | Qualquer um | `status: 'backlog'` |
| Deletar | Apenas Admin ou Criador | `db.collection('tasks').doc(id).delete()` (hard delete) |

---

### 3.3 MÓDULO: FERRAMENTAS (NexusTools)

**Arquivo:** `tools.js` (3296 linhas)

#### FERRAMENTA 3.3.1: NEP Correlação

**Objetivo:** Análise estatística de correlação entre indicadores via upload de Excel.

| Passo | Ação | Detalhe Técnico |
|-------|------|-----------------|
| 1 | Usuário clica em "NEP Correlação" | `renderCorrelacao()` |
| 2 | Sistema exibe área de upload | Drag & drop ou click para selecionar `.xlsx` |
| 3 | Usuário faz upload de planilha | Evento `change` em `<input type="file" accept=".xlsx">` |
| 4 | Sistema processa arquivo | Biblioteca SheetJS (xlsx.js) → extrai colunas numéricas |
| 5 | Sistema calcula matriz de correlação | Fórmula de Pearson: r = Σ[(xi-x̄)(yi-ȳ)] / √[Σ(xi-x̄)²Σ(yi-ȳ)²] |
| 6 | Sistema renderiza heatmap | Tabela colorida: verde (positiva), vermelho (negativa) |
| 7 | Usuário clica em célula | Sistema exibe scatter plot (dispersão) dos dois indicadores |
| 8 | Sistema exibe insights | "Correlação forte (r≥0.70): Ação prioritária" |

**Classificação:**
| Intervalo | Classificação |
|-----------|---------------|
| |r| ≥ 0.70 | Forte |
| 0.30 ≤ |r| < 0.70 | Moderada |
| |r| < 0.30 | Fraca |

#### FERRAMENTA 3.3.2: Calculadora de Factibilidade

**Objetivo:** Avaliar viabilidade de atingir uma meta com base em dados históricos.

| Passo | Ação | Detalhe Técnico |
|-------|------|-----------------|
| 1 | Usuário insere Baseline Atual (%) | Ex: 85% |
| 2 | Usuário insere Meta Desejada (%) | Ex: 95% |
| 3 | Usuário insere Desvio Padrão Histórico | Ex: 3.5 |
| 4 | Usuário insere Prazo (meses) | Ex: 6 |
| 5 | Usuário clica "Calcular" | `calcFactibilidade()` |
| 6 | Sistema calcula Gap | `gap = meta - baseline` |
| 7 | Sistema calcula Z-Score | `z = gap / desvio` |
| 8 | Sistema estima probabilidade | Tabela Normal → P(z) |
| 9 | Sistema exibe resultado | "Factibilidade: 78% - Viável com esforço" |

**Faixas de Factibilidade:**
| Probabilidade | Status |
|---------------|--------|
| ≥ 80% | Alta factibilidade ✅ |
| 50-79% | Factibilidade moderada ⚠️ |
| < 50% | Baixa factibilidade ❌ |

#### FERRAMENTA 3.3.3: Gerador de Senha Segura

| Passo | Ação | Detalhe Técnico |
|-------|------|-----------------|
| 1 | Usuário ajusta tamanho | Slider: 8-64 caracteres |
| 2 | Usuário seleciona opções | Checkboxes: Maiúsculas, Minúsculas, Números, Símbolos |
| 3 | Usuário clica "Gerar" | `generatePassword()` |
| 4 | Sistema monta charset | Concatena alfabetos selecionados |
| 5 | Sistema gera string aleatória | `crypto.getRandomValues()` ou `Math.random()` |
| 6 | Sistema exibe resultado e força | "Senha: X7@kL...s9" + Barra de força |
| 7 | Usuário clica "Copiar" | `navigator.clipboard.writeText()` + Toast "Copiado!" |

**Força da Senha:**
| Critérios | Classificação |
|-----------|---------------|
| < 12 chars, 1 tipo | Fraca 🔴 |
| 12-16 chars, 2 tipos | Média 🟡 |
| 16+ chars, 3+ tipos | Forte 🟢 |
| 20+ chars, 4 tipos, símbolos | Excelente 💪 |

#### FERRAMENTA 3.3.4: Estruturador PDCA

**Objetivo:** Organizar ciclo de melhoria contínua.

| Fase | Descrição | Campos |
|------|-----------|--------|
| **P** (Plan) | Identificar problema, definir meta | Lista de itens (multi-input) |
| **D** (Do) | Executar ações planejadas | Lista de itens |
| **C** (Check) | Verificar resultados | Lista de itens |
| **A** (Act) | Padronizar ou corrigir | Lista de itens |

**Fluxo:**
1. Usuário adiciona itens em cada fase via input + botão "+"
2. Sistema persiste no `localStorage` key `nexus_pdca`
3. Usuário pode exportar para TXT: `exportPDCA()` → download automático
4. Usuário pode limpar tudo: `clearPDCA()` com confirmação

#### FERRAMENTA 3.3.5: Estruturador DMAIC (Six Sigma)

| Fase | Descrição |
|------|-----------|
| **D** (Define) | Definir problema, escopo e objetivos |
| **M** (Measure) | Medir desempenho atual |
| **A** (Analyze) | Analisar causas raiz |
| **I** (Improve) | Implementar melhorias |
| **C** (Control) | Controlar e sustentar ganhos |

**Fluxo:** Similar ao PDCA, mas com textareas para cada fase. Persistência: `localStorage.nexus_dmaic`.

#### FERRAMENTA 3.3.6: Diagrama de Pareto

| Passo | Ação |
|-------|------|
| 1 | Usuário adiciona categorias com valores (ex: "Atraso: 45", "Erro Manual: 30") |
| 2 | Sistema ordena por valor decrescente |
| 3 | Sistema calcula % acumulado |
| 4 | Sistema renderiza gráfico Bar + Line (Chart.js combo) |
| 5 | Sistema identifica categorias que representam 80% do total |
| 6 | Sistema exibe insight: "3 categorias = 80% dos problemas" |

#### FERRAMENTA 3.3.7: Diagrama de Ishikawa (Espinha de Peixe)

**6M Categories:**
| Categoria | Descrição |
|-----------|-----------|
| Método | Processos, procedimentos |
| Máquina | Equipamentos, sistemas |
| Mão de Obra | Pessoas, treinamento |
| Material | Insumos, dados |
| Medição | Métricas, indicadores |
| Meio Ambiente | Condições externas |

**Fluxo:**
1. Usuário define o problema central
2. Usuário adiciona causas em cada categoria (lista)
3. Sistema persiste em `localStorage.nexus_ishikawa`
4. Exportação: TXT estruturado por categoria

#### FERRAMENTA 3.3.8: Matriz GUT

**Critérios:**
| Critério | Escala (1-5) |
|----------|--------------|
| **G** (Gravidade) | 1=Mínima, 5=Gravíssima |
| **U** (Urgência) | 1=Pode esperar, 5=Imediata |
| **T** (Tendência) | 1=Melhora, 5=Piora rápido |

**Fluxo:**
1. Usuário adiciona problema com notas G, U, T
2. Sistema calcula GUT = G × U × T (1 a 125)
3. Sistema ordena lista por GUT decrescente
4. Visualização: Tabela com ranking de prioridade

#### FERRAMENTA 3.3.9: Cronômetro/Pomodoro

**Modos:**
| Modo | Comportamento |
|------|---------------|
| Cronômetro | Conta para cima (stopwatch) |
| Pomodoro | Ciclos de 25min foco + 5min pausa (configurável) |

**Fluxo Pomodoro:**
1. Usuário define tempo de foco (default 25min) e pausa (default 5min)
2. Usuário clica "Iniciar"
3. Timer decrementa a cada segundo
4. Ao zerar: Som de alerta + Toast "Hora da pausa!"
5. Sistema alterna para timer de pausa
6. Contador de Pomodoros concluídos

#### FERRAMENTA 3.3.10: Criador de Fluxograma

**Elementos Disponíveis:**
| Tipo | Forma | Uso |
|------|-------|-----|
| start | Cápsula | Início/Fim |
| process | Retângulo | Processo |
| decision | Losango | Decisão (Sim/Não) |
| io | Paralelogramo | Entrada/Saída de dados |
| document | Documento | Documento |
| database | Cilindro | Banco de dados |

**Fluxo:**
1. Usuário arrasta forma da paleta para o canvas
2. Sistema cria nó com handles de conexão (topo, direita, baixo, esquerda)
3. Usuário clica e arrasta de um handle para outro nó
4. Sistema desenha linha curva com seta (SVG Bézier)
5. Usuário edita texto clicando no nó (contentEditable)
6. Exportar: `html2canvas` → PNG download

**IA Generativa:**
1. Usuário clica "Gerar com IA"
2. Sistema abre modal para descrição do processo
3. Sistema envia prompt para Perplexity API
4. API retorna JSON estruturado: `{ nodes: [...], connections: [...] }`
5. Sistema renderiza automaticamente o diagrama

#### FERRAMENTA 3.3.11: 5 Porquês

**Fluxo:**
1. Usuário define o problema raiz
2. Sistema exibe 5 campos "Por quê?"
3. Usuário preenche cada nível de causa
4. Sistema gera gráfico de árvore (5 níveis)
5. Exportação: TXT ou imagem

#### FERRAMENTA 3.3.12: Carta de Controle (CEP)

**Fluxo:**
1. Usuário insere série de dados (valores numéricos separados por vírgula)
2. Sistema calcula: Média (X̄), Desvio Padrão (σ), LSC (X̄+3σ), LIC (X̄-3σ)
3. Sistema gera gráfico de linha com limites de controle
4. Sistema identifica pontos fora de controle (outliers)

#### FERRAMENTA 3.3.13: Gerador de Gráficos

**Tipos Suportados:**
- Barras (vertical/horizontal)
- Linha
- Área
- Pizza/Doughnut
- Radar
- Dispersão

**Fluxo:**
1. Usuário faz upload de CSV/Excel ou digita dados manualmente
2. Usuário seleciona tipo de gráfico
3. Usuário configura título, cores, labels
4. Sistema renderiza com Chart.js
5. Exportação: PNG ou SVG

#### FERRAMENTA 3.3.14: APIs Externas Integradas

| Ferramenta | API | Funcionalidade |
|------------|-----|----------------|
| NEP Clima | HG Brasil | Temperatura, condição, previsão 7 dias |
| NEP News Brasil | GNews | Manchetes Brasil em português |
| NEP Mundo Updates | GNews | Notícias globais em português |
| NEP Dicionário | DictionaryAPI | Definição, sinônimos, pronúncia |
| NEP Brasil Data | BrasilAPI | CEP, CNPJ, Bancos, Feriados, FIPE |

---

### 3.4 MÓDULO: NOTIFICAÇÕES (NexusNotifications)

**Arquivo:** `notifications.js` (614 linhas, 27 funções)

#### PROCESSO: Ciclo de Vida de uma Notificação

| Passo | Ação | Detalhe Técnico |
|-------|------|-----------------|
| 1 | Evento dispara notificação | Ex: Tarefa atribuída, Aviso criado |
| 2 | Sistema chama `NexusNotifications.add()` | Payload: `{ tipo, titulo, mensagem, destinatario_uid, referencia_tipo, referencia_id }` |
| 3 | Sistema salva no Firestore | `db.collection('notifications').add(doc)` |
| 4 | Listener em tempo real detecta | `onSnapshot()` atualiza lista local |
| 5 | Sistema verifica relevância | `isRelevantForUser()` → destinatário direto OU hierarquia OU broadcast |
| 6 | Sistema atualiza badge | Número de não lidas no ícone de sino |
| 7 | Usuário clica no sino | `renderDropdown()` exibe lista |
| 8 | Usuário clica em notificação | `markAsRead(id)` + redirecionamento |

**Tipos de Notificação:**
| Tipo | Ícone | Cor |
|------|-------|-----|
| demanda | 📋 | Azul |
| aviso | 📢 | Amarelo |
| mencao | 💬 | Verde |
| validacao | ✅ | Verde |
| sistema | ⚙️ | Cinza |

**Hierarquia de Cargos:**
| Cargo | Nível |
|-------|-------|
| ADMIN | 100 |
| SUPERINTENDENTE | 90 |
| GERENTE | 70 |
| CONSULTOR | 60 |
| COORDENADOR | 50 |
| ANALISTA | 30 |
| MONITOR | 10 |

---

### 3.5 MÓDULO: GAMIFICAÇÃO (NexusGamification)

**Arquivo:** `gamification.js` (312 linhas)

#### PROCESSO: Sistema de Pontos e Níveis

**Regras de Pontuação:**
| Ação | Pontos |
|------|--------|
| Enviar elogio (testimonial) | +10 |
| Receber elogio | +50 |
| Completar tarefa Kanban | +20 (base) |
| Login diário (streak) | +5 |

**Cálculo de Nível:**
```
Nível = floor( sqrt( pontos / 100 ) )
```
| Pontos | Nível |
|--------|-------|
| 100 | 1 |
| 400 | 2 |
| 900 | 3 |
| 1600 | 4 |
| 2500 | 5 |

**Fluxo de Level-Up:**
1. Sistema detecta que novos pontos ultrapassaram threshold
2. Sistema atualiza `level` no documento do usuário
3. Sistema exibe animação de celebração
4. Sistema notifica usuário: "Você subiu para o Nível X!"

**Leaderboard:**
1. Query: `db.collection('user_points').orderBy('total_points', 'desc').limit(10)`
2. Renderiza pódio (Top 3 com medalhas)
3. Lista restante com posição e avatar

---

### 3.6 MÓDULO: PAINEL ADMIN (NexusAdmin)

**Arquivo:** `admin.js` (800+ linhas)

#### ABA 3.6.1: Dashboard Analytics

| Métrica | Cálculo |
|---------|---------|
| Usuários Ativos | Count de logins nos últimos 7 dias |
| Módulos Mais Usados | Frequência de acesso por módulo |
| Tarefas Criadas | Total do mês |
| Taxa de Conclusão | (done / total) × 100 |

#### ABA 3.6.2: Gestão de Usuários

| Ação | Fluxo |
|------|-------|
| Listar | `db.collection('users').get()` → renderiza tabela |
| Criar | Modal com nome, email, cargo → `auth.createUser()` + `db.add()` |
| Editar | Altera cargo, status (ativo/inativo) |
| Desativar | `{ active: false }` → usuário não consegue logar |
| Deletar | Hard delete do Auth + Firestore |

#### ABA 3.6.3: Permissões (MIME)

**Módulos Controláveis:**
```
dashboard, kanban, ranking, agendas, resultados, ferramentas, podcast, cursos, forum, estagiario, avisos, ferias, okr, relatorios, perfil
```

**Fluxo:**
1. Admin seleciona cargo
2. Sistema exibe lista de módulos com toggles
3. Admin ativa/desativa módulos
4. Sistema salva em `db.collection('module_permissions')`
5. Efeito imediato: Menu do usuário atualiza na próxima navegação

#### ABA 3.6.4: Auditoria

| Campo | Descrição |
|-------|-----------|
| timestamp | Data/hora da ação |
| userId | UID do executor |
| userEmail | Email do executor |
| actionType | CREATE, UPDATE, DELETE, LOGIN, LOGOUT |
| collection | Collection afetada |
| documentId | ID do documento |
| oldValue | Valor antes (JSON) |
| newValue | Valor depois (JSON) |

**Filtros:** Data, Usuário, Tipo de Ação

---

### 3.7 MÓDULOS ADICIONAIS (Resumo)

#### 3.7.1 Podcast (NexusPodcast)
- Temporadas → Episódios → Conteúdo (áudio) → Prova
- Player HTML5 com tracking de progresso
- Quiz com nota mínima 70% para aprovação
- Certificado PDF ao concluir temporada

#### 3.7.2 Cursos (NexusCourses)
- Catálogo de cursos (Python, Excel, Lógica, etc.)
- Módulos com aulas textuais/vídeo
- Progresso salvo por usuário
- Prova final + Certificado

#### 3.7.3 Fórum (NexusForum)
- Categorias: Dúvidas, Sugestões, Off-topic
- Tópicos com respostas threaded
- Autor pode marcar "Melhor Resposta" (+XP)
- Moderação por admins

#### 3.7.4 Estagiário IA (NexusEstagiario)
- Chat com LLM (Gemini/OpenAI via proxy)
- Upload de CSV/JSON para análise
- Geração de insights estatísticos
- Criação de apresentações PPT automáticas

#### 3.7.5 Controle de Férias (NexusVacation)
- Solicitar férias (10/15/20/30 dias)
- Opção de abono (vender 10 dias)
- Aprovação hierárquica
- Dashboard de saldo e histórico

#### 3.7.6 OKR & Entregas (NexusOKR)
- Objetivos em níveis: Company → Team → Individual
- Key Results com check-ins semanais
- Cálculo automático de progresso
- PDI integrado (autoavaliação + gestor)

#### 3.7.7 Relatórios (NexusReports)
- Templates: Diário, Semanal, Mensal
- Editor rich-text com anexos
- Exportação PDF
- Histórico por usuário

---

## NÍVEL 4: FLUXOS DE DECISÃO CRÍTICOS

### 4.1 Autenticação

```
INÍCIO
  ↓
Usuário acessa URL
  ↓
Existe sessão? ───[NÃO]───→ Redireciona para /login
  │                              ↓
  │                         Usuário insere credenciais
  │                              ↓
  │                         Firebase Auth valida
  │                              ↓
  │                         Válido? ───[NÃO]───→ Erro + Retry
  │                           │
  │                         [SIM]
  │                           ↓
  │                         Carrega perfil + permissões
  ↓                              ↓
[SIM]                       Redireciona para /dashboard
  ↓                              ↓
Valida token                   FIM
  ↓
Inicia listeners globais
  ↓
Redireciona para /dashboard
  ↓
FIM
```

### 4.2 Aprovação de Tarefa

```
Gestor clica em "Aprovar"
  ↓
openReviewModal(taskId)
  ↓
Exibe detalhes da entrega
  ↓
Aprovar? ───[NÃO]───→ rejectTask() → status='doing' → Notifica → FIM
  │
[SIM]
  ↓
approveTask()
  ↓
status = 'done', validated = true
  ↓
Entrega no prazo? ───[NÃO]───→ Aplica penalidade de atraso
  │
[SIM]
  ↓
Calcula pontos base × multiplicador
  ↓
PointsService.addPoints(uid, pontos)
  ↓
Exibe confete + toast
  ↓
Notifica responsável
  ↓
FIM
```

---

## NÍVEL 5: TRATAMENTO DE ERROS

| Contexto | Exceção | Tratamento |
|----------|---------|------------|
| Firebase Auth | Token expirado | Redirect para /login |
| Firestore | Permissão negada | Toast "Sem permissão" + log |
| API Externa | Timeout | Toast "Serviço indisponível" |
| Upload arquivo | Formato inválido | Toast "Formato não suportado" |
| Validação form | Campo obrigatório | Highlight vermelho + mensagem |

**Padrão Global:**
```javascript
try {
  // Operação
} catch (error) {
  console.error('[ModuleName] Erro:', error);
  NexusApp?.showToast?.('Erro: ' + error.message, 'error');
  AuditService?.log?.('ERROR', { module, error: error.message });
}
```

---

## NÍVEL 6: PERSISTÊNCIA DE DADOS

### Firestore Collections

| Collection | Campos Principais |
|------------|-------------------|
| users | uid, nome, email, cargo, active, createdAt |
| tasks | id, title, description, status, owner, priority, deadline, createdBy |
| notifications | tipo, titulo, mensagem, destinatario_uid, lida, criadaEm |
| user_points | uid, total_points, level, streak, lastActive |
| points_transactions | uid, amount, type, description, createdAt |
| module_permissions | cargo, modules[] |
| audit_logs | timestamp, userId, actionType, collection, documentId |

### LocalStorage Keys

| Key | Módulo | Conteúdo |
|-----|--------|----------|
| nep_user_uid | Auth | UID do usuário logado |
| nep_user_name | Auth | Nome do usuário |
| nep_user_role | Auth | Cargo do usuário |
| nexus_pdca | Tools | Dados do PDCA em JSON |
| nexus_dmaic | Tools | Dados do DMAIC em JSON |
| nexus_ishikawa | Tools | Dados do Ishikawa em JSON |
| nexus_gut | Tools | Dados da Matriz GUT |
| nexus_reports | Reports | Relatórios locais |

---

## APÊNDICE A: GLOSSÁRIO

| Termo | Definição |
|-------|-----------|
| NEP | Narrativa Estruturada de Processos |
| BPMN | Business Process Model and Notation |
| MIME | Módulo Integrado de Mapeamento e Execução |
| KPI | Key Performance Indicator |
| SLA | Service Level Agreement |
| CEP | Controle Estatístico de Processo |
| GUT | Gravidade × Urgência × Tendência |
| PDCA | Plan-Do-Check-Act |
| DMAIC | Define-Measure-Analyze-Improve-Control |
| OKR | Objectives and Key Results |

---

**FIM DO DOCUMENTO NEP PROFISSIONAL**

*Este documento representa 100% das funcionalidades do sistema conforme código-fonte analisado.*
