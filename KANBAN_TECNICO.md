# 📘 Documentação Técnica: Módulo Kanban (Delivery Control)

Este documento detalha a implementação técnica, regras de negócio e estrutura do módulo Kanban do Ecossistema NEP.

---

## 1. Visão Geral
O módulo funciona como um **Sistema de Gestão de Demandas** em tempo real, integrado ao Firebase Firestore. Ele permite controle de fluxo de trabalho (Backlog → Execução → Bloqueado → Entregue), com rigoroso controle hierárquico e métricas de desempenho.

- **Arquivo Principal**: `js/kanban.js`
- **Classe**: `NepKanban`
- **Dependências**: `firebase`, `UserManagement`, `NotificationService`, `AuditService`, `PointsService`.

---

## 2. Regras de Negócio (Core Business Rules)

### 2.1. Hierarquia e Delegação (`DELEGATION_MAP`)
O sistema impõe limites sobre quem pode delegar tarefas para quem, baseado no cargo:
- **Admin / Superintendente**: Podem delegar para **TODOS**.
- **Gerente**: Consultor, Coordenador, Analista, Monitor.
- **Consultor**: Coordenador, Analista, Monitor.
- **Coordenador**: Analista, Monitor.
- **Analista**: Monitor.
- **Monitor**: Apenas visualiza (não delega).

**Implementação**: Método `canDelegateTo(targetRoleKey)` verifica a permissão antes de exibir usuários no dropdown.

### 2.2. Fluxo de Aprovação e Validação
A entrega de uma tarefa não significa conclusão imediata.
1. **Entrega (`confirmDelivery`)**: O responsável move para "Entregue".
2. **Auto-Validação**: Se o responsável for também o Superintendente (ou auto-atribuída para cargo alto), a tarefa é validada automaticamente.
3. **Revisão Manual (`approveReview`)**: Se não for auto-validada, o **Criador da Demanda** (ou Admin) deve revisar e aprovar.
   - **Status "Pending"**: Tarefa aguarda aprovação.
   - **Status "Done"**: Tarefa validada e pontos creditados.

### 2.3. Sistema de Pontuação e Penalidades
Os pontos são calculados dinamicamente e afetados pelo prazo:
- **Base**: Definida na criação (Sugestão: Prioridade × Complexidade).
- **Penalidade por Atraso (`calculateDelayPenalty`)**:
  - 1 dia de atraso: **-5 pontos**
  - 2 dias de atraso: **-10 pontos**
  - 3+ dias: **-15 pontos**
- **Pontuação Final**: `Max(0, Base + Penalidade)`.

---

## 3. Funcionalidades Detalhadas

### 3.1. CRUD de Tarefas
- **Criação**: Valida campos, atribui `createdAt`, `creatorUid`, e define status inicial como `backlog`.
- **Edição**:
  - **Prazo**: Só pode ser alterado pelo **Criador** ou **Admin** (`canEditDeadline`).
  - **Histórico**: Toda edição grava log no array `history` do documento.
- **Exclusão**: Restrita ao Criador ou Admin (`canDeleteTask`).

### 3.2. Interface e UX
- **Modais Robustos**: Uso de `openModal`/`closeModal` garantindo limpeza de estilos (`display`) e formulários.
- **Filtros**:
  - **Unidade**: Filtra por departamento (ex: TI, Qualidade, Comercial).
  - **Responsável**: Filtra tarefas atribuídas.
- **Badges Visuais**:
  - Prioridade: Cores (Vermelho/Amarelo/Verde).
  - Complexidade: Labels (Alta/Média/Baixa).
- **Arrastar e Soltar**: API nativa de Drag & Drop HTML5 integrando com atualização de status no Firestore.

### 3.3. Notificações (`NotificationService`)
O sistema envia alertas automáticos:
1. **Nova Delegação**: Quando alguém recebe uma tarefa.
2. **Entrega Realizada**: Notifica o criador para revisar.
3. **Prazo Próximo**: Job diário (`checkDeadlineAlerts`) verifica tarefas vencendo em 24h.

### 3.4. Métricas Avançadas
Funções analíticas integradas no front-end:
- **`getLeadTimeStats()`**: Média de dias entre Criação e Entrega por usuário.
- **`getReworkRate()`**: Porcentagem de tarefas que voltaram de "Entregue" para "Execução".
- **`getWorkloadHeatmap()`**: Distribuição de carga de trabalho ativa por responsável.

---

## 4. Estrutura de Dados (Firestore Schema)

Coleção: `tasks`
```json
{
  "id": "auto-generated-uid",
  "title": "Título da Demanda",
  "description": "Detalhes...",
  "status": "backlog | doing | pending | done",
  "priority": "Alta",
  "complexity": "Média",
  "points": 10,
  "deadline": "YYYY-MM-DD",
  "owner": "Nome do Responsável",
  "ownerUid": "UID do Usuário",
  "ownerRole": "Cargo Exibido",
  "ownerRoleKey": "admin | gerente | ...",
  "requester": "Nome do Solicitante",
  "unit": "Unidade (TI, RH...)",
  "createdAt": "ISO String",
  "creatorUid": "UID do Criador",
  "history": [
    { "date": "ISO", "action": "Criado...", "changes": [] }
  ],
  "validated": boolean,
  "finalPoints": number,
  "delayPenalty": number
}
```

---

## 5. Auditoria e Logs
Todas as ações críticas são enviadas para o `AuditService`:
- `CREATE_TASK`
- `UPDATE_TASK`
- `DELIVER_TASK`
- `APPROVE_TASK` (inclui penalidades e pontos finais)
- `DELETE_TASK`
- `EXPORT_TASKS` (CSV)

---

## 6. Segurança e Permissões
A segurança é aplicada em duas camadas:
1. **View (Front-end)**: Elementos de UI ocultos/desabilitados baseados em `getMyRoleKey()`.
2. **Lógica**: Métodos `can*` (ex: `canDeleteTask`) verificam `creatorUid` vs `currentUserUid` e nível de permissão `admin`.
