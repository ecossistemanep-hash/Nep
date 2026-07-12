# Mapa de Backends — Ecossistema NEP

> Auditoria da tarefa #6 (saneamento de arquitetura). Documenta qual módulo
> usa qual backend **hoje**, para orientar a decisão de consolidação.

## Situação atual: sistema HÍBRIDO (dois backends)

O sistema roda simultaneamente em **dois bancos de dados diferentes**:

- **Firebase (Firestore)** — projeto `ecossistema-nep`, plano Spark gratuito
- **Supabase (PostgreSQL)** — projeto `kwmhmurddlxuewbyobgr.supabase.co`

### Módulos que vivem 100% no Firebase
| Módulo | Arquivo | Coleções |
|---|---|---|
| Usuários / Auth | auth-firebase.js, user-management.js | `users` |
| Kanban (demandas) | kanban.js | `tasks` |
| Gamificação / Ranking | gamification.js, points-service.js | `user_points`, `points_transactions` |
| Conquistas | achievements.js | `user_stats`, `user_achievements` |
| Depoimentos | testimonials.js | `testimonials` |
| Avisos | announcements.js | `announcements` |
| Férias | vacation-control.js | `vacations` |
| Rotina ADM | rotina-adm.js | `rotinas_adm` |
| Auditoria | audit-service.js | `audit_logs` |
| Permissões de módulo | module-permission-service.js | `module_permissions` |
| Painéis Corporativos (novo) | panels-portal.js | `panels`, `panel_favorites`, `panel_reports` |
| Notificações | notifications.js | `notifications` |

### Módulos que vivem 100% (ou quase) no Supabase
| Módulo | Arquivo | Tabelas Supabase | Refs Firebase |
|---|---|---|---|
| **Fórum** | forum.js | `forum_topics`, `forum_replies`, `forum_attachments` | 0 |
| **Agendas Executivas** | calendar.js | `agendas` | 0 |
| **Central de Chamados** | ticket-management.js | `tickets` | 5 (fallback parcial) |
| **Governança / OKR** | okr-management.js | `gov_okrs`, `gov_cases`, `gov_suggestions`, `gov_rituals`, `gov_recovery`, `gov_compliments` | 2 |

### Armazenamento de arquivos (uploads)
`storage-service.js` usa **Supabase Storage** (buckets) para anexos em:
kanban.js (anexos de tarefas), profile.js (avatar), reports.js.
> O Firebase Storage não foi ativado (decisão do 1º ciclo, plano Spark).

## Inconsistências detectadas
1. **Regras órfãs**: `firestore.rules` define `forum_topics`/`forum_replies`,
   mas o fórum real roda no Supabase — essas regras não protegem nada.
2. **Dupla fonte de verdade** no Chamados: ticket-management.js tem código
   para os dois backends, o que confunde qual é o oficial.
3. A chave `anonKey` do Supabase é pública por design (protegida por RLS no
   servidor) — expô-la no front é seguro, **desde que as políticas RLS do
   Supabase estejam configuradas corretamente** (precisa ser verificado no
   painel do Supabase).

## Caminhos possíveis (decisão do responsável)

### A) Consolidar tudo no Firebase (visão original "custo zero, um backend")
- Migrar Fórum, Agendas, Chamados e Governança/OKR de Supabase → Firestore.
- Prós: um só backend, alinhado à decisão original, menos superfície de falha,
  segurança unificada nas Firestore Rules.
- Contras: migração real (dados + código dos 4 módulos), risco de regressão,
  precisa migrar os dados já existentes no Supabase.

### B) Manter híbrido, mas documentado e saneado
- Manter os dois backends, remover as regras órfãs, deixar claro no código
  qual módulo usa qual banco, garantir RLS do Supabase configurado.
- Prós: baixo risco, nada quebra, entrega rápida.
- Contras: dois backends para manter, contraria o princípio "Firebase only".

### C) Remover Supabase (NÃO recomendado sem migração)
- Quebraria imediatamente Fórum, Agendas, Chamados e Governança/OKR.
- Só viável **depois** de migrar esses módulos (= caminho A).
