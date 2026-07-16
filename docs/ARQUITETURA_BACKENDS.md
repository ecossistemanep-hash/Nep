# Mapa de Backends — Ecossistema NEP

> Atualização da tarefa #6 (saneamento de arquitetura). Documenta o estado
> **após** a consolidação em Firebase (Fórum e Central de Chamados migrados).

## Situação atual: Firebase como banco único + Supabase só para arquivos

- **Firebase (Firestore)** — projeto `ecossistema-nep`, plano Spark gratuito.
  Único banco de dados da aplicação.
- **Supabase Storage** — usado exclusivamente para **arquivos binários**
  (anexos de Kanban, avatar de perfil, relatórios, anexos de Fórum e de
  Chamados). Não há mais tabelas de dados de negócio no Supabase.

### Módulos e onde vivem hoje

| Módulo | Arquivo | Backend de dados | Storage de arquivos |
|---|---|---|---|
| Usuários / Auth | auth-firebase.js, user-management.js | Firestore (`users`) | — |
| Kanban (demandas) | kanban.js | Firestore (`tasks`) | Supabase Storage |
| Gamificação / Ranking | gamification.js, points-service.js | Firestore | — |
| Conquistas | achievements.js | Firestore | — |
| Depoimentos | testimonials.js | Firestore | — |
| Avisos | announcements.js | Firestore | — |
| Férias | vacation-control.js | Firestore | — |
| Rotina ADM | rotina-adm.js | Firestore | — |
| Auditoria | audit-service.js | Firestore | — |
| Painéis Corporativos | panels-portal.js | Firestore | — |
| Notificações | notifications.js | Firestore | — |
| **Fórum** | forum.js | **Firestore** (`forum_topics`, `forum_replies`) | Supabase Storage (bucket `forum-attachments`) |
| **Central de Chamados** | ticket-management.js | **Firestore** (`tickets`) | Supabase Storage (bucket `tickets`) |

## O que mudou nesta migração

1. **Fórum**: `forum_topics`/`forum_replies` deixaram de ser tabelas Supabase
   e passaram a ser coleções Firestore. Curtidas (antes uma RPC SQL
   `toggle_forum_like`) agora são uma transação Firestore que alterna
   `liked_by`/`likes` no documento da resposta. Anexos continuam sendo
   enviados ao Supabase Storage, mas o *registro* do anexo agora é um array
   `attachments` dentro do próprio documento do tópico/resposta — não existe
   mais a tabela/coleção separada `forum_attachments`.
2. **Central de Chamados**: `tickets` deixou de ser tabela Supabase e virou
   coleção Firestore. O upload de anexo de chamado continua no bucket
   Supabase `tickets`, só a URL pública é salva no documento Firestore.
3. **Regras do Firestore**: adicionada a coleção `tickets` (leitura/escrita
   restrita ao criador, ao responsável ou a admin) e corrigida a regra de
   exclusão de `forum_topics`/`forum_replies` para permitir que o próprio
   autor exclua seu conteúdo (antes só admin podia, o que não refletia o
   comportamento real da UI).
4. **Sem migração de dados**: por decisão explícita, o histórico antigo que
   estava nas tabelas Supabase (`forum_topics`, `forum_replies`, `tickets`)
   **não foi copiado** para o Firestore — o app começa essas coleções do
   zero. Os dados antigos continuam fisicamente no Supabase caso seja
   necessário consultá-los manualmente no futuro, mas não são mais lidos
   pelo app.

## Pendências conhecidas

- OKR e Agendas Executivas foram removidos do sistema (tarefa #10), então já
  não usavam mais Supabase — não fazem parte desta migração.
- O Supabase Storage permanece como única opção de armazenamento de
  arquivos, já que o Firebase Storage exige o plano pago Blaze. Se o volume
  de arquivos se aproximar do limite gratuito de 1GB, será necessário
  reavaliar (upgrade pago, limpeza de anexos antigos, ou outro provedor).
