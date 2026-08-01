# Ecossistema NEP — Documentação Técnica Completa

> **Nome interno:** NEP Delivery Control
> **Produção:** https://ecossistema-nep.web.app
> **Domínio próprio:** https://ecossistemanep.com.br (mesmo conteúdo, ver seção Domínio)
> **Stack:** Firebase (Spark, plano gratuito) + Supabase Storage + GitHub Actions
> **Arquitetura:** SPA multi-página em JavaScript puro (sem framework), SDK Firebase v8 compat

Este é o único documento de referência do projeto. Os demais MDs foram removidos
por estarem desatualizados ou superados pelas reescritas feitas ao longo do
desenvolvimento — o conteúdo que ainda valia a pena foi trazido para cá.

Para um mapa visual e clicável do sistema (rotas → módulos → serviços → dados),
abra `mapa-sistema.html` localmente (`npm run dev`, depois acesse o arquivo
direto — ele fica fora do build de produção de propósito, ver seção
**Ferramentas de manutenção**).

---

## 1. O que é o sistema

Plataforma interna de gestão de qualidade e governança corporativa: Kanban de
demandas com aprovação hierárquica e pontuação anti-fraude, gamificação,
fórum, chamados, férias, calendário de feriados, chat geral, 17 ferramentas
de qualidade (Pareto, Ishikawa, GUT, PDCA, DMAIC, carta de controle etc.),
um laboratório de estatística (Analytics Studio) e um painel administrativo
com visão executiva por logo/cliente para Diretoria.

Rodado inteiramente no **plano gratuito do Firebase (Spark)** — sem Cloud
Functions, sem agendamento nativo, sem custo. Essa restrição molda várias
decisões de arquitetura documentadas abaixo (principalmente a seção sobre o
cofre de pontos).

---

## 2. Como rodar

```bash
npm install
npm run dev        # abre em http://localhost:3000
```

Também existe `INICIAR_SISTEMA.bat` (Windows): verifica `node_modules`,
instala se faltar, checa se a porta já está em uso e abre o navegador.

**Deploy:**
```bash
npm run build
firebase deploy --only hosting          # front-end
firebase deploy --only firestore:rules  # regras de segurança (cuidado: teste antes)
```

---

## 3. Arquitetura de dados

| Camada | Onde vive | Por quê |
|---|---|---|
| Autenticação | Firebase Auth | Login por e-mail/senha |
| Dados estruturados | Firestore | Tarefas, usuários, pontos, tudo que é consultável |
| Presença/chat em tempo real | Realtime Database | Só o RTDB tem `onDisconnect()`, necessário para contar quem está online |
| Arquivos (anexos, fotos, banners) | Supabase Storage | Único ponto do sistema que ainda usa Supabase — deliberado, o resto é 100% Firebase |
| Relatório diário por e-mail | GitHub Actions (`scripts/send-usage-report.js`) | Agendamento (cron) exigiria Cloud Functions, que é pago |

### Coleções do Firestore

| Coleção | Conteúdo | Campos-chave |
|---|---|---|
| `users` | Cadastro de pessoas | `nome`, `cargo`, `status` (ATIVO/INATIVO/PENDENTE), `gestor_uid`, `logos[]`, `setor` |
| `tasks` | Demandas do Kanban | `ownerUid`, `creatorUid`, `status` (backlog/doing/pending/done/archived), `validated`, `validatedAt`, `deliveredAt`, `deadline`, `taskType`, `basePoints`, `deadlineChanged` |
| `user_points` | Saldo de pontos por pessoa | `total_points`, `level` (doc id = uid) |
| `points_transactions` | Extrato de pontos (ledger) | `uid`, `points`, `type`, `created_at` |
| `tickets` | Chamados internos | `created_by`, `assigned_to`, `status` |
| `vacations` | Férias | `employeeUid`, `employeeName`, `startDate`, `endDate`, `status` (sempre `SCHEDULED`) |
| `forum_topics` / `forum_replies` | Fórum | `author_uid`, `is_solution` |
| `notifications` | Avisos internos | `destinatario_uid` / `destinatario_cargo` / `'ALL'` |
| `user_analytics` | Trilha de uso (módulo aberto, ferramenta usada) | `uid`, `event_type`, `module_id`, `timestamp` |
| `audit_logs` | Ações administrativas (imutável) | `acao`, `executor_email`, `timestamp` |
| `holidays` | Feriados cadastrados | `date`, `nome` |
| `rotinas_adm` | Checklist diário (Rotina ADM) | doc id = `{uid}_{data}`, `tarefas[]` |
| `panels` / `versions` / `panel_favorites` / `panel_reports` | Portal de painéis HTML | — |
| `testimonials` | Elogios entre colegas | aceita envio anônimo público, sempre não-aprovado |
| `announcements` | Comunicados | segmentado por cargo |
| `user_achievements` | Medalhas e estatísticas | — |
| `reports` | Relatórios enviados | — |
| `push_subscriptions` | Inscrições de push do PWA | — |
| `user_data` | Trabalhos salvos das ferramentas de qualidade | — |
| `points` (legado) | **Somente leitura.** Ninguém escreve mais aqui — dois painéis do Admin ainda leem para exibir "top 5" | — |

### Realtime Database

```
chat_geral/messages   → mensagens do chat geral (sem anexo, sem histórico permanente)
presence              → quem está online agora (onDisconnect)
```

---

## 4. Hierarquia de cargos

Escala oficial (definida pelo dono do produto em 31/07/2026):

```
ADMIN                    ← cargo técnico da plataforma, fora da hierarquia de negócio
DIRETOR                  ← "topo": sem gestor acima, entrega auto-validada
SUPERINTENDENTE          ← idem
GERENTE
COORDENADOR              ← menor cargo que pode ser "gestor direto"
CONSULTOR
ANALISTA
MONITOR
```

Cargos adicionais vindos do Report Executivo: **LÍDER** (entre consultor e
analista), **VIEWER** e **CONVIDADO** (acessos externos somente-leitura).

> ⚠️ A escala vive **copiada em 5 lugares** e todos precisam concordar, senão a
> UI libera o que o banco nega:
> `firestore.rules` (`cargoLevel()` — **fonte da verdade**), `js/auth-firebase.js`
> (`ROLE_CONFIG`), `js/user-management.js` (`ROLES`), `js/notifications.js`
> (`ROLE_HIERARCHY`) e `js/report-executivo-domain.js` (`RED.ROLE_LEVEL`).
>
> Até 31/07/2026 **coordenador estava abaixo de consultor** em todas elas —
> invertido. Isso fazia o cadastro oferecer consultor como gestor de
> coordenador e invertia quem lê notificação dirigida a cargo. Também
> explicava a anomalia de `isManager()`, que inclui coordenador e não
> consultor: o gestor "mandava menos" que o não-gestor.

- **Painel Admin restrito**: Coordenador e acima entram no Admin, mas só veem
  as abas Dashboard e Usuários (e em Usuários não conseguem alterar
  cargo/status). O resto (Analytics Avançado, Permissões, Auditoria,
  Ferramentas, Status Page, Backlog, Logos, Configurações) é exclusivo do
  ADMIN — ver `js/admin.js`, array `MANAGER_ROLES`.
- **Visão Executiva por Logo**: exclusiva de Diretor, Superintendente e Admin
  (`NexusAdmin.isExecutive()`), mesma fronteira que `LogoService.isGlobalViewer()`
  já usava para decidir quem enxerga todas as logos.
- **Logo/produto**: separa multi-tenant — quem não é Admin/Diretor/Superintendente
  só vê dados das próprias logos (`js/logo-service.js`).

---

## 5. Rotas e módulos (mapa completo em `mapa-sistema.html`)

O roteamento é feito em `js/app.js` (`switch (page)`), que instancia o objeto
JS do módulo dentro de `index.html` — não são páginas HTML separadas.

| Rota | Módulo (arquivo) | O que faz |
|---|---|---|
| `dashboard` | `NepDashboard` (`js/dashboard.js`) | KPIs, gráfico de status, mini-ranking, alertas de atraso |
| `kanban` | `NexusKanban` (`js/kanban.js`, 2800+ linhas) | Quadro de demandas — coração operacional, ver seção 6 |
| `profile` | `NexusProfile` (`js/profile.js`) | Perfil, hierarquia real, desempenho, pontos, férias, fórum |
| `admin` | `NexusAdmin` (`js/admin.js`, 3300+ linhas) | 10 abas de gestão |
| `forum` | `NexusForum` (`js/forum.js`) | Perguntas e respostas, com solução aceita |
| `tickets` | `TicketManagement` (`js/ticket-management.js`) | Chamados internos |
| `vacation` | `NexusVacation` (`js/vacation-control.js`) | Programação de férias, vinculada ao uid do colaborador |
| `ranking` | `NexusScoring` (`js/scoring.js`) | Classificação geral por pontos |
| `tools` | `NexusTools` (`js/tools.js`, 3500+ linhas) | Catálogo das 17 ferramentas de qualidade |
| `checklist` | `RotinaADM` (`js/rotina-adm.js`) | Checklist administrativo diário gamificado |
| `feriados` | `NexusHolidays` (`js/holidays.js`) | Calendário de feriados nacionais + os cadastrados por coordenadores |
| `chat` | `NexusChat` (`js/chat-geral.js`) | Chat geral em tempo real (RTDB) |
| `paineis` | `NexusPanels` (`js/panels-portal.js`) | Portal de painéis HTML publicados pelas áreas |
| `analytics` | `NepAnalyticsStudio` (`js/analytics-studio.js`) | Laboratório de estatística sobre planilha carregada — nada sai do navegador |
| `announcements` | `NexusAnnouncements` (`js/announcements.js`) | Comunicados segmentados por cargo |
| `testimonials` | `NexusTestimonials` (`js/testimonials.js`) | Elogios entre colegas (+10 pts a quem envia, +50 a quem recebe) |
| `results` | `NexusResults` (`js/reports.js`) | Relatórios e consolidação por área |
| `reportExecutivo` | `NexusReportExecutivo` (`js/report-executivo.js`) | Carteira de frentes, risco, capacidade, OKR — 15 abas, ver seção 12 |

### Serviços transversais

| Serviço | Arquivo | Responsabilidade |
|---|---|---|
| Gamificação | `js/gamification.js` | **Único** escritor de pontos — transação atômica (saldo + extrato juntos) |
| PointsService | `js/points-service.js` | Leitura de saldo/nível/ranking; delega toda escrita para Gamificação |
| Achievements | `js/achievements.js` | Medalhas, sequência de dias ativos |
| Notifications | `js/notifications.js` | Avisos escopados por pessoa/cargo/todos |
| AnalyticsService | `js/analytics-service.js` | Registra acesso a módulo e uso de ferramenta |
| AuditService | `js/audit-service.js` | Trilha imutável de ações administrativas |
| LogoService | `js/logo-service.js` | Separação multi-tenant por logo/cliente |
| StorageService | `js/storage-service.js` | Upload de anexos, fotos, banners (Supabase) |
| ExportService | `js/export-service.js` | Ponto único de exportação CSV/Excel — ver seção 8 |
| GlobalSearch | `js/global-search.js` | Busca unificada em tarefas, fórum, painéis |

### Ferramentas de manutenção (excluídas do build de produção)

Definidas em `EXCLUDED_FROM_BUILD` no `vite.config.js`. Não têm checagem de
autenticação própria e/ou fazem operação destrutiva — só rodam localmente
(`npm run dev` e abrir o arquivo direto), nunca são publicadas:

- `setup-admin.html` — bootstrap do primeiro admin
- `clean-v2.html` — limpeza de dados de teste
- `reset-kanban.html` — reset do quadro Kanban
- `recalcular-pontos.html` — recálculo de pontuação
- `seed-analytics.html` — popular eventos de analytics para teste
- `debug-announcements.html` — depuração de avisos
- `import-users.html` — importação em massa de usuários
- `mapa-sistema.html` — mapa interativo do sistema (documenta rotas e
  limitações de segurança conhecidas — não deve ficar público)

---

## 6. Regras de negócio do Kanban (as mais importantes do sistema)

O Kanban já passou por uma revisão completa de segurança e pontuação.
Estado atual, tudo reforçado tanto no cliente (`js/kanban.js`) quanto no
servidor (`firestore.rules`):

1. **Só o gestor direto aprova.** `canValidateTask()` exige
   `isManagerOfOwner(task)` — vínculo real via `gestor_uid` no cadastro do
   responsável. Ninguém aprova a própria entrega, nem admin nem diretor.
   Diretor/Superintendente são exceção **apenas para a própria tarefa**
   (não têm gestor acima na hierarquia oficial) — `isOwnerTopLevel()`.
2. **Pontuação vem do tipo da tarefa, nunca do prazo.** Catálogo fixo
   `TASK_TYPES` (11 tipos, 5 a 25 pontos). O valor-base é **congelado na
   criação** em `basePoints` — trocar o tipo depois só pode reduzir o
   crédito, nunca aumentar (evita inflar pontos editando a tarefa).
3. **Penalidade progressiva**: −20%/dia de atraso, +10% se entregue antes
   do prazo, −15% se a tarefa foi editada (prazo ou tipo alterado depois de
   criada), piso de 1 ponto (nunca zera).
4. **Só o gestor direto altera prazo e tipo.** `canEditDeadline()` exclui
   explicitamente o próprio responsável.
5. **Tarefas recorrentes semanais** — geradas na aprovação, sem cron (não
   existe agendamento no plano gratuito).
6. **Arquivamento automático** de entregues após 3 dias, com guarda contra
   execução simultânea por múltiplos clientes (`_archiveRunning`).

---

## 7. Segurança — postura atual e limitações aceitas

- **XSS**: `window.escapeHtml()` (definido em `js/app.js`) envolve toda
  interpolação de dado editável por usuário (nome, título, comentário) em
  HTML. Usuários editam o próprio `nome`, então é vetor real de XSS
  armazenado se esquecido — já foi auditado e corrigido em Kanban,
  Dashboard, Admin, Rotina ADM e Perfil.
- **Autorização real é sempre no servidor** (`firestore.rules`), nunca no
  `localStorage`. O cargo em `localStorage` é só conveniência de UI —
  qualquer usuário pode alterá-lo no console, mas isso não muda o que as
  regras do Firestore permitem.
- **Exportação de CSV/Excel** neutraliza injeção de fórmula (célula
  iniciada por `= + - @` é prefixada com aspa simples) — título de tarefa é
  texto livre e podia virar `=HYPERLINK(...)` malicioso.
- **Cofre de pontos (`user_points`) — limitação arquitetural aceita.** No
  plano Spark não há Cloud Functions, e vários fluxos legítimos (fórum,
  cursos, chamados, rotina diária) exigem que o próprio cliente do usuário
  grave os próprios pontos. **É impossível eliminar a auto-premiação sem
  Cloud Functions** — a regra do Firestore não distingue "o app chamou" de
  "o console chamou". Mitigação aplicada: teto de 200 pontos por escrita
  (a maior premiação legítima é 150), ledger append-only em
  `points_transactions`, e um detector de fraude somente-leitura no painel
  Admin (`runPointsAudit`). Eliminar de fato exigiria migrar para o plano
  Blaze — decisão consciente de não fazer isso agora.

---

## 8. Exportação de dados (CSV/Excel)

Ponto único: `js/export-service.js`. Antes cada módulo montava o arquivo à
mão e todos saíam corrompidos no Excel em português (sem BOM UTF-8,
separador errado, decimal com ponto, Timestamp do Firestore virando
`[object Object]`). Qualquer novo export deve usar
`ExportService.baixarCSV(cabecalho, linhas, nome)` ou
`ExportService.baixarExcel(abas, nome)` — nunca montar o Blob manualmente.

---

## 9. Domínio próprio

| Tipo | Nome | Valor |
|---|---|---|
| A | `ecossistemanep.com.br` | `199.36.158.100` |
| TXT | `ecossistemanep.com.br` | `hosting-site-ecossistema-nep` |

Configurado no Firebase Console → Hosting → Domínios personalizados, com SSL
automático. DNS gerenciado no Registro.br. As duas URLs (`.web.app` e
`.com.br`) servem exatamente o mesmo conteúdo — não há rewrite especial.

---

## 10. Decisões de arquitetura que já foram tomadas (não reabrir sem motivo novo)

- **Firebase, não React/Supabase-first.** O sistema já foi reescrito uma vez
  em React; a decisão foi voltar para o HTML/JS vanilla original e manter
  todos os módulos, só corrigindo e refinando.
- **Supabase só para Storage.** Todo o resto (dados, auth, realtime) é
  Firebase. Não expandir o uso do Supabase.
- **Sem IA no sistema.** Todas as integrações de IA (chat de ajuda, motor
  Gemini) foram removidas por decisão do usuário. Não reintroduzir.
- **OKR, Agendas (calendário) e NEP Clima foram removidos** e não devem
  voltar. O antigo módulo de calendário foi substituído por Feriados
  (calendário de feriados mantido por coordenadores).
- **Sem custo, sem plano pago.** Qualquer melhoria deve caber no Spark. Se
  uma funcionalidade exige Cloud Function/Blaze, documentar a limitação em
  vez de propor o upgrade sem alinhar antes.

---

## 11. O que já foi auditado nesta reescrita

Dashboard Admin, Dashboard do usuário, Kanban, Rotina ADM e o serviço de
exportação já passaram por auditoria completa (bugs de cálculo, XSS,
vazamento de listener do Firestore, custo de leitura no Spark, furos de
regra de negócio). Módulos ainda não auditados nesta rodada: Fórum,
Chamados, Fórum, Painéis, Analytics Studio, Ferramentas de qualidade,
Chat Geral, Testemonials, Announcements, Reports.

---

## 12. Report Executivo (módulo portado do app irmão)

Porte do sistema `Report-Executivo` (Next.js/Supabase, mantido por Samuel)
para dentro da arquitetura nativa do NEP. Roda sobre Firebase Auth +
Firestore, com o login, a hierarquia e os papéis do próprio NEP.

### Separação motor / tela

| Arquivo | Papel |
|---|---|
| `js/report-executivo-domain.js` | Porte fiel de `shared/domain/index.ts` (2.912 linhas). Funções **puras**: sem DOM, sem Firestore. É onde vivem risco, capacidade, entrega, OKR, dia útil, canonicalização de nome. |
| `js/report-executivo.js` | As 15 abas. Só busca dado e formata — mesma separação do original, e é o que permite conferir número por número. |
| `js/manager-chain-service.js` | Mantém `cadeia_gestores` (array de todos os gestores acima de cada usuário) recalculada quando um `gestor_uid` muda, em cascata para os subordinados. |

### Por que a cadeia de gestores existe

O Report enxerga hierarquia **recursiva** (diretor vê toda a árvore abaixo).
Regra de Firestore não expressa recursão sem Cloud Function, que é plano
pago. A saída sem custo é desnormalizar: cada usuário guarda a lista já
resolvida de ancestrais, e a regra vira `hasAny([...])`.

### As 15 abas

Carteira · Board · Riscos · Dashboard · Capacidade · Rotinas ·
Desenvolvimento · Executivo · OKRs · Resumo Estrutura (só direção) ·
Agenda · Melhorias · Materiais · Meu Scorecard · Arquivados

### Fonte única com o Kanban

A tarefa do Kanban é a **execução** da frente, via `task.itemId`. Não foi
criada coleção `activities` própria (como no original) porque isso seria um
terceiro silo. Com o vínculo:

- o progresso da frente vira **apurado** (tarefas fechadas ÷ total) em vez
  de declarado — em teste, uma frente marcada como 80% tinha 40% real;
- a Capacidade soma frentes **e** tarefas, incluindo tarefa avulsa;
- a validação por gestor que o Kanban já tem passa a valer para as frentes.

### O que NÃO foi portado (declarado, não escondido)

| Falta | Por quê |
|---|---|
| **Atividades/subitens** (986 linhas) | Substituído pelo vínculo com o Kanban. As funções `assigneeActivityLoad` e `checklistProgress` seguem no motor, sem tela. |
| **Ganhos (Gains)** | `GAIN_TYPES` está no motor; falta a tela de registro de ganho financeiro/KPI. |
| **Anexos / evidências** | Bucket e FCA com comprovação. |
| **Filtros salvos, busca global, Gantt, reconciliação de responsáveis** | Produtividade; a Carteira funciona sem, mas com volume real fazem falta. |
| **Adoção, automações, relatórios corporativos, tour guiado** | Painéis específicos do original. |
| **Perfil Vértice** (108 questões) | **Bloqueado**: o banco de perguntas não está no Supabase do app irmão. Reproduzir de memória daria um instrumento diferente com o mesmo nome. |

Fórum, Gamificação, Ferramentas da Qualidade e Admin **não** foram portados
porque já existem no NEP.

### IA

As 4 funcionalidades que no original chamam OpenAI/Ollama (laudo do Perfil
Vértice, resumo de ata, sugestão de FCA, avaliação de material) usam o
**fallback determinístico** que o próprio Report já tem: texto por regra, sem
custo de API. A estrutura está pronta para plugar uma chave depois.

---

## 13. Camada visual (identidade AeC)

| Arquivo | Escopo |
|---|---|
| `css/aec-identity.css` | Identidade institucional nos **dois** temas. Remapeia os tokens que o sistema já usa (~290 usos de `--surface-border`, 217 de `--text-primary`) — nenhum componente foi reescrito. |
| `css/light-premium.css` | Refinamento premium **exclusivo do modo claro**. Os 192 seletores começam todos com `[data-theme="light"]`. |

**Regra de contraste vigente**: quem decide a cor do texto e do ícone é a cor
REAL do fundo composto onde ele está — não o hábito do componente. Texto
normal ≥4,5:1, grande ≥3:1, ícone ≥3:1.

**Teste de isolamento do escuro** (repetível): com o sistema em modo escuro,
desativar e reativar `light-premium.css` e comparar o snapshot computado de
600 elementos × 17 propriedades. Tem que dar idêntico em todas as páginas.

> ⚠️ **Armadilha de seletor por substring.** `[class*="k-card"]` casava
> `quick-card-label` (quic**k-card**-label), e `[class*="achievement"]` casava
> `achievement-name`, `achievement-icon` e todo o resto. Cada rótulo recebia
> fundo branco + borda + sombra com `!important`, desenhando caixas dentro
> das caixas. Corrigido com limite de palavra (`[class^=…]` / `[class*=" …"]`).
> Ao criar seletor por atributo, sempre usar limite de palavra.
