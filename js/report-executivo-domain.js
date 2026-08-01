/* =========================================
   NEP REPORT EXECUTIVO — MOTOR DE REGRAS DE NEGÓCIO
   Porte fiel de shared/domain/index.ts do app irmão Report-Executivo
   (TypeScript → JS puro, sem dependência de build).

   REGRA DESTE ARQUIVO: funções PURAS e testáveis. Nada de DOM, nada de
   Firestore. As telas só formatam o resultado. Foi assim no original e é
   o que permite conferir número por número contra o Report.

   Os comentários explicando o "porquê" de cada limiar vieram do original
   de propósito: quase todos nasceram de um bug real de campo, e apagá-los
   convidaria alguém a "simplificar" a regra de volta ao defeito.
   ========================================= */

const RED = {}; // Report Executivo Domain

// ── Vocabulário ──────────────────────────────────────────────────────────────

RED.STATUSES = ['A iniciar', 'Em andamento', 'Em validação', 'Bloqueado',
  'Atrasado', 'Pausado', 'Concluído', 'Entregue', 'Cancelado', 'Sem status'];
RED.PRIORITIES = ['Crítica', 'Alta', 'Média', 'Baixa'];
RED.PRODUCT_SUGGESTIONS = ['Vivo', 'Nubank', 'Enel', 'Athena', 'Madeira Madeira', 'Interno', 'Data CX', 'Outro'];

RED.GAIN_TYPES = ['Financeiro', 'KPI', 'Relacionamento', 'Consultividade', 'Processo', 'Experiência', 'Resultado'];
RED.GAIN_TYPE_LABELS = {
  Financeiro: 'Financeiro (Grana)', KPI: 'KPI / Indicador', Relacionamento: 'Relacionamento',
  Consultividade: 'Consultividade', Processo: 'Processo', 'Experiência': 'Experiência do Cliente',
  Resultado: 'Resultado / Entrega'
};

RED.ROLE_LABELS = {
  admin: 'Administrador', superintendente: 'Superintendente', diretor: 'Diretor',
  gerente: 'Gerente', coordenador: 'Coordenador', consultor: 'Consultor',
  lider: 'Líder', analista: 'Analista', monitor: 'Monitor',
  viewer: 'Visualizador', convidado: 'Convidado'
};

/** Sentinela de produto ausente. É o rótulo exibido, mas dataGaps/scoreOf o
 *  tratam como lacuna — nunca deve pontuar como produto real. */
RED.NO_PRODUCT = 'Sem produto';

// ── Papéis / alçadas — HIERARQUIA DO NEP ─────────────────────────────────────
// O original tinha estas funções como listas de nomes copiadas do modelo dele
// (ex.: canDelete incluía 'lider' mas não 'consultor'). Aqui elas passam a ser
// DERIVADAS da hierarquia do próprio NEP, para o módulo obedecer as mesmas
// regras do resto do sistema em vez de trazer uma segunda hierarquia junto.

/** Espelha cargoLevel() em firestore.rules. Os números têm que bater com a
 *  regra: se o front achar que um cargo manda mais do que a regra acha, ele
 *  libera botão que o banco nega. */
RED.ROLE_LEVEL = {
  admin: 100, diretor: 95, superintendente: 90, gerente: 70, coordenador: 60,
  consultor: 50, lider: 40, analista: 30, monitor: 10, viewer: 5, convidado: 1
};
RED.roleLevel = r => RED.ROLE_LEVEL[String(r || '').toLowerCase()] ?? 0;

/** Espelha isManager() em firestore.rules — e é um CONJUNTO NOMEADO, não um
 *  limiar: consultor (60) está acima de coordenador (50) na escala, mas não é
 *  gestor. Tratar isto como "nível >= 50" daria alçada de gestão ao consultor. */
RED.NEP_MANAGER_ROLES = ['admin', 'diretor', 'superintendente', 'gerente', 'coordenador'];
RED.isManager = r => RED.NEP_MANAGER_ROLES.includes(String(r || '').toLowerCase());

/** Direção — quem enxerga a estrutura inteira (nível de superintendente p/ cima). */
RED.isDirection = r => RED.roleLevel(r) >= RED.ROLE_LEVEL.superintendente;

RED.isAdmin = r => String(r || '').toLowerCase() === 'admin';
RED.isDirector = r => String(r || '').toLowerCase() === 'diretor';

/** Operacional: do monitor para cima. Exclui viewer/convidado, que existem
 *  justamente para ser leitura. */
RED.canEdit = r => RED.roleLevel(r) >= RED.ROLE_LEVEL.monitor;

/** Excluir frente é alçada de gestão — mesmo corte do isManager das regras. */
RED.canDelete = r => RED.isManager(r);

/** Liderança: gerente para cima (direção + gerência de linha). Consultor (60)
 *  e coordenador (50) ficam de fora. É o corte de quem responde por resultado
 *  de área — decisão executiva, ciclo de OKR, gestão de usuários. */
RED.isLeadership = r => RED.roleLevel(r) >= RED.ROLE_LEVEL.gerente;

RED.canManageUsers = r => RED.isLeadership(r);

/** Roster global de capacidade: `people` não é escopada por hierarquia, então
 *  quem edita mexe em pessoa de QUALQUER time — fica só na direção. */
RED.canManagePeople = r => RED.isDirection(r);

RED.canViewStructure = r => RED.isDirection(r);
RED.canEditRoutines = r => RED.isManager(r);
RED.canDeleteRoutines = r => RED.isManager(r);

/** Agenda: qualquer papel operacional. */
RED.canEditAgenda = r => RED.canEdit(r);

/** Abas escondidas de acessos read-only/externos. Aba que abre vazia por
 *  permissão é pior que aba ausente — UI e banco dizem a mesma coisa. */
RED.MANAGEMENT_ONLY_VIEWS = ['okrs', 'forum', 'quality-tools', 'gamification'];
RED.isViewVisible = function (viewId, restricted, role) {
  const r = role || '';
  if (restricted && !RED.canViewStructure(r)) return false;
  if (RED.MANAGEMENT_ONLY_VIEWS.includes(viewId) && ['viewer', 'convidado'].includes(r)) return false;
  // Desenvolvimento é AUTO-administrado, então é liberado a todo colaborador;
  // só o viewer (acesso externo read-only) fica de fora.
  if (viewId === 'development' && r === 'viewer') return false;
  return true;
};

// ── Hierarquia ───────────────────────────────────────────────────────────────

/** IDs do "meu time": self + subordinados transitivos por gestor (BFS). */
RED.subordinateIds = function (profiles, rootId) {
  const childrenOf = new Map();
  for (const p of profiles) {
    const mgr = p.manager_id || p.gestor_uid;
    if (mgr) {
      const arr = childrenOf.get(mgr) || [];
      arr.push(p.id || p.uid);
      childrenOf.set(mgr, arr);
    }
  }
  const out = new Set([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.shift();
    for (const child of (childrenOf.get(cur) || [])) {
      if (!out.has(child)) { out.add(child); queue.push(child); }
    }
  }
  return out;
};

/** Sobe a cadeia de gestor e devolve o ancestral mais próximo com `targetRole`.
 *  Usado para consolidar OKRs de coordenadores/analistas sob o gerente. */
RED.managerAncestorId = function (profiles, userId, targetRole) {
  targetRole = targetRole || 'gerente';
  if (!userId) return null;
  const byId = new Map(profiles.map(p => [p.id || p.uid, p]));
  const seen = new Set();
  let cur = byId.get(userId);
  while (cur && !seen.has(cur.id || cur.uid)) {
    seen.add(cur.id || cur.uid);
    if ((cur.role || cur.cargo || '').toLowerCase() === targetRole) return cur.id || cur.uid;
    const mgr = cur.manager_id || cur.gestor_uid;
    cur = mgr ? byId.get(mgr) : undefined;
  }
  return null;
};

// ── Datas ────────────────────────────────────────────────────────────────────

RED.today = function () {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

RED.parseDate = function (iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

RED.dateFmt = function (iso) {
  const d = RED.parseDate(iso);
  return d ? d.toLocaleDateString('pt-BR') : 'Sem prazo';
};

RED.daysToDue = function (iso) {
  const d = RED.parseDate(iso);
  if (!d) return null;
  return Math.round((d.getTime() - RED.today().getTime()) / 86400000);
};

RED.relativeDateText = function (iso) {
  const d = RED.daysToDue(iso);
  if (d === null) return 'Sem prazo';
  if (d < 0) return `${Math.abs(d)} dia(s) de atraso`;
  if (d === 0) return 'vence hoje';
  return `faltam ${d} dia(s)`;
};

/** Texto de prazo CIENTE do status: item concluído não está "16 dias
 *  atrasado" — ele foi entregue. Mostrar o atraso cru numa frente fechada
 *  faz o Board e a Carteira acusarem atraso onde não há. */
RED.dueTextFor = function (it) {
  if (RED.isDone(it)) {
    const d = RED.daysToDue(it.dueDate);
    if (d === null) return '';
    return d < 0 ? `entregue após o prazo (${Math.abs(d)}d)` : 'entregue no prazo';
  }
  return RED.relativeDateText(it.dueDate);
};

/** Horas desde `iso`. null se ausente/inválido — quem chama decide o fallback
 *  (não inventa "0h" para dado ausente). */
RED.hoursSince = function (iso, nowMs) {
  nowMs = nowMs === undefined ? Date.now() : nowMs;
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (nowMs - t) / 3600000);
};

RED.isoDate = d => d.toISOString().slice(0, 10);
RED.addDays = function (date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; };

RED.clamp = function (n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));
};

RED.esc = function (str) {
  return String(str === null || str === undefined ? '' : str)
    .replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c));
};

// ── Dias úteis / feriados / ausências ────────────────────────────────────────
// Sem o calendário, um prazo de 7 dias úteis que atravessa o Carnaval vence
// dois dias antes do que a regra promete.

/** 'YYYY-MM-DD' em UTC. É a chave do calendário; nunca usar data local, que
 *  muda com o fuso. */
RED.isoDateUTC = ms => new Date(ms).toISOString().slice(0, 10);

RED.isBusinessDay = function (ms, holidays) {
  const wd = new Date(ms).getUTCDay();
  if (wd === 0 || wd === 6) return false;
  return !(holidays && holidays.has(RED.isoDateUTC(ms)));
};

RED.businessDaysAfter = function (fromMs, n, holidays) {
  let ms = fromMs, added = 0;
  while (added < n) {
    ms += 86400000;
    if (RED.isBusinessDay(ms, holidays)) added++;
  }
  return ms;
};

/** Dias úteis no intervalo FECHADO. Zero quando o fim vem antes do início. */
RED.businessDaysBetween = function (inicioMs, fimMs, holidays) {
  let total = 0;
  for (let ms = inicioMs; ms <= fimMs; ms += 86400000) {
    if (RED.isBusinessDay(ms, holidays)) total++;
  }
  return total;
};

/** Dias úteis de ausência contando cada dia UMA vez. O conjunto existe porque
 *  períodos se sobrepõem na prática (férias emendada com folga); somar durações
 *  contaria o mesmo dia duas vezes e produziria capacidade negativa. */
RED.absentBusinessDays = function (absences, janelaInicioMs, janelaFimMs, holidays) {
  const dias = new Set();
  for (const a of (absences || [])) {
    const de = Math.max(Date.parse(`${a.inicio || a.startDate}T00:00:00Z`), janelaInicioMs);
    const ate = Math.min(Date.parse(`${a.fim || a.endDate}T00:00:00Z`), janelaFimMs);
    if (!Number.isFinite(de) || !Number.isFinite(ate)) continue;
    for (let ms = de; ms <= ate; ms += 86400000) {
      if (RED.isBusinessDay(ms, holidays)) dias.add(RED.isoDateUTC(ms));
    }
  }
  return dias.size;
};

/** Capacidade semanal EFETIVA: a nominal, descontada a fração de dias úteis em
 *  que a pessoa não está. Sem isto, quem tira 30 dias de férias continua na
 *  conta com 30h/semana, aparece com utilização baixa e é lido como quem pode
 *  receber mais frente. */
RED.effectiveWeeklyCapacity = function (weeklyCapacityH, janelaInicioMs, janelaFimMs, absences, holidays) {
  if (!(weeklyCapacityH > 0)) return 0;
  const uteis = RED.businessDaysBetween(janelaInicioMs, janelaFimMs, holidays);
  if (uteis === 0) return 0;
  const fora = Math.min(uteis, RED.absentBusinessDays(absences, janelaInicioMs, janelaFimMs, holidays));
  return Math.round(weeklyCapacityH * ((uteis - fora) / uteis) * 10) / 10;
};

// ── Responsáveis: canonicalização (chokepoint único) ─────────────────────────
// "Pedro" e "Pedro Almeida Santos" eram duas pessoas diferentes nos relatórios.

const COMBINING_DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

function ownerKey(s) {
  return String(s || '').normalize('NFD').replace(COMBINING_DIACRITICS, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
RED.ownerKey = ownerKey;

let _canonicalOwners = [];

RED.setCanonicalOwners = function (names) {
  _canonicalOwners = (names || []).map(n => String(n || '').trim()).filter(n => n.length > 0);
};
RED.getCanonicalOwners = () => [..._canonicalOwners];

RED.splitOwners = function (owner) {
  return String(owner || '')
    .replace(/\s+e\s+/gi, ',').replace(/\s*&\s*/g, ',').replace(/\s*\/\s*/g, ',')
    .split(',').map(x => x.trim()).filter(Boolean);
};

/** Resolve um token para o nome canônico cadastrado. Estratégia conservadora em
 *  camadas: só canoniza quando há UM único match. Em ambiguidade, devolve o
 *  token original (preserva o dado). */
RED.canonicalizeOwner = function (token) {
  const t = String(token || '').trim();
  if (!t || _canonicalOwners.length === 0) return t;
  const tk = ownerKey(t);
  if (!tk) return t;

  const uniqueMatch = matches => {
    const set = [...new Set(matches)];
    return set.length === 1 ? set[0] : null;
  };
  const firstWord = c => ownerKey(c).split(' ')[0] || '';

  // T1 — igualdade exata normalizada (corrige acento/caixa/espaço duplicado)
  let r = uniqueMatch(_canonicalOwners.filter(c => ownerKey(c) === tk));
  if (r) return r;
  // T2 — canônico começa com "token " ("Pedro" → "Pedro Almeida Santos")
  r = uniqueMatch(_canonicalOwners.filter(c => ownerKey(c).startsWith(tk + ' ')));
  if (r) return r;
  // T3 — primeira palavra do canônico == token
  r = uniqueMatch(_canonicalOwners.filter(c => firstWord(c) === tk));
  if (r) return r;
  // T4 — primeira palavra do canônico começa com token ("Kath" → "Kathelleen…")
  r = uniqueMatch(_canonicalOwners.filter(c => firstWord(c).startsWith(tk)));
  if (r) return r;
  // T5 — alguma palavra do canônico == token ("Bertoldo" → "Luiz … Bertoldo")
  r = uniqueMatch(_canonicalOwners.filter(c => ownerKey(c).split(' ').includes(tk)));
  if (r) return r;
  // T6 — alguma palavra do canônico começa com token
  r = uniqueMatch(_canonicalOwners.filter(c => ownerKey(c).split(' ').some(w => w.startsWith(tk))));
  if (r) return r;

  return t;
};

/** Chokepoint de responsável usado por TODAS as abas. */
RED.ownersOf = function (owner) {
  return [...new Set(RED.splitOwners(owner).map(RED.canonicalizeOwner))];
};

RED.isCanonicalOwner = function (name) {
  const k = ownerKey(name);
  return k.length > 0 && _canonicalOwners.some(c => ownerKey(c) === k);
};

/** Junta nomes no padrão PT-BR: "A", "A e B", "A, B e C". */
RED.joinOwners = function (names) {
  const list = (names || []).map(n => String(n).trim()).filter(Boolean);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  return list.slice(0, -1).join(', ') + ' e ' + list[list.length - 1];
};

/** Defesa de escopo no cliente: nenhuma visão deve ampliar o recorte só porque
 *  removeu um filtro visual. A permissão do banco continua a fronteira real. */
RED.itemsWithinActorScope = function (items, profiles, actor) {
  if (!actor) return [];
  if (RED.canViewStructure(actor.role) || actor.role === 'convidado') return [...items];
  const scopedIds = RED.subordinateIds(profiles, actor.id);
  const allowedNames = new Set(
    [actor, ...profiles].filter(p => scopedIds.has(p.id || p.uid))
      .map(p => ownerKey(p.full_name || p.nome || '')).filter(Boolean)
  );
  if (allowedNames.size === 0) return [];
  return items.filter(item => RED.ownersOf(item.owner).some(o => allowedNames.has(ownerKey(o))));
};

// ── Tags: vocabulário canônico ───────────────────────────────────────────────
// 551h de 824h caíam em "Sem tipo" e "IA"/"ia" contavam como categorias
// distintas. Mesma régua dos responsáveis — NUNCA casar por substring.

function cleanTag(raw) { return String(raw || '').replace(/\s+/g, ' ').trim(); }

/** Elege como grafia canônica a variante MAIS FREQUENTE (empate: a primeira
 *  vista — determinístico). */
RED.buildTagVocabulary = function (items) {
  const byKey = new Map();
  for (const it of (items || [])) {
    for (const raw of ((it && it.tags) || [])) {
      const tag = cleanTag(raw);
      if (!tag) continue;
      const key = ownerKey(tag);
      const variants = byKey.get(key) || new Map();
      variants.set(tag, (variants.get(tag) || 0) + 1);
      byKey.set(key, variants);
    }
  }
  const vocab = [];
  for (const variants of byKey.values()) {
    let best = '', bestCount = -1;
    for (const [variant, count] of variants) {
      if (count > bestCount) { best = variant; bestCount = count; }
    }
    if (best) vocab.push(best);
  }
  return vocab;
};

RED.canonicalTag = function (raw, vocabulary) {
  const t = cleanTag(raw);
  if (!t) return t;
  const key = ownerKey(t);
  for (const v of (vocabulary || [])) if (ownerKey(v) === key) return v;
  return t;
};

RED.canonicalizeTags = function (tags, vocabulary) {
  const seen = new Set(); const out = [];
  for (const raw of (tags || [])) {
    const tag = RED.canonicalTag(String(raw || ''), vocabulary);
    if (!tag) continue;
    const key = ownerKey(tag);
    if (seen.has(key)) continue;
    seen.add(key); out.push(tag);
  }
  return out;
};

/** Cor determinística por tag — hash estável. Mesma tag => mesma cor sempre. */
const TAG_TONES = ['tone-blue', 'tone-purple', 'tone-green', 'tone-amber', 'tone-red', 'tone-gray'];
RED.tagTone = function (tag) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (Math.imul(h, 31) + tag.charCodeAt(i)) | 0;
  return TAG_TONES[Math.abs(h) % TAG_TONES.length];
};

// ── Normalização do item ─────────────────────────────────────────────────────

RED.normalizeStatus = function (status) {
  const raw = String(status === null || status === undefined ? '' : status).trim();
  const found = RED.STATUSES.find(s => s.toLowerCase() === raw.toLowerCase());
  return found || (raw ? raw : 'Sem status');
};

RED.defaultProgress = function (status) {
  const s = RED.normalizeStatus(status);
  if (['Concluído', 'Entregue'].includes(s)) return 100;
  if (['Em andamento', 'Em validação'].includes(s)) return 50;
  return 0;
};

RED.inferProduct = function (item) {
  const text = `${item.project || ''} ${item.demand || ''} ${item.definition || ''}`.toLowerCase();
  if (text.includes('nubank') || text.includes('nu ')) return 'Nubank';
  if (text.includes('vivo')) return 'Vivo';
  // Sem match textual: não fabricar default — mascarava a lacuna e inflava o score.
  return item.product || RED.NO_PRODUCT;
};

RED.estimateEffortHours = function (item) {
  const base = item.priority === 'Crítica' ? 40 : item.priority === 'Alta' ? 24 : item.priority === 'Média' ? 16 : 8;
  const textLen = String(item.definition || '').length;
  const bonus = Math.min(32, Math.floor(textLen / 120) * 4);
  return base + bonus;
};

/** true quando o esforço é ESTIMADO (fabricado a partir de prioridade + tamanho
 *  do texto) em vez de medido. Esse número alimenta a capacidade como se fosse
 *  dado real; a UI deve marcar "estimado" e não deixar passar por medição dura. */
RED.isEstimatedEffort = it => it.effortHours === null || it.effortHours === undefined;

RED.normalizeItem = function (raw, idx) {
  idx = idx || 0;
  const status = RED.normalizeStatus(raw.status);
  const progress = raw.progress != null ? RED.clamp(Number(raw.progress), 0, 100) : RED.defaultProgress(status);
  return {
    id: raw.id || `G6-${String(idx + 1).padStart(3, '0')}`,
    dueDate: raw.dueDate || '', originalDate: raw.originalDate || '',
    project: raw.project || '', demand: raw.demand || '', definition: raw.definition || '',
    owner: raw.owner || '', status, priority: raw.priority || 'Média', progress,
    nextAction: raw.nextAction || '', executiveComment: raw.executiveComment || '',
    lastUpdate: raw.lastUpdate || '', tags: Array.isArray(raw.tags) ? raw.tags : [],
    archived: raw.archived || false, sourceStatus: raw.sourceStatus || status,
    product: raw.product || RED.inferProduct(raw),
    effortHours: raw.effortHours ? RED.clamp(Number(raw.effortHours), 0, 9999) : undefined,
    teamSize: raw.teamSize ? RED.clamp(Number(raw.teamSize), 1, 50) : undefined,
    predecessorId: raw.predecessorId || '', dependencyNote: raw.dependencyNote || '',
    startDate: raw.startDate || '', history: raw.history || [],
    attachments: Array.isArray(raw.attachments) ? raw.attachments : []
  };
};

/** Rótulo curto: "Projeto — Escopo", omitindo o travessão quando o escopo é
 *  vazio (senão gerava "Projeto —" com hífen solto em telas executivas). */
RED.frontLabel = function (it) {
  const p = (it.project || '').trim() || 'Sem projeto';
  const d = (it.demand || '').trim();
  return d ? `${p} — ${d}` : p;
};

RED.isDone = it => ['Concluído', 'Entregue', 'Cancelado'].includes(it.status);

/** Ativo com prazo estourado (hoje não conta — "vence hoje" ainda não é atraso). */
RED.isOverdueActive = function (it) {
  if (RED.isDone(it) || it.archived) return false;
  const d = RED.daysToDue(it.dueDate);
  return d !== null && d < 0;
};

/** Status para LEITURA/agregação. O campo status é manual e apodrece: o heatmap
 *  mostrava "Atrasado" vazio enquanto a carteira tinha 18 frentes vencidas
 *  paradas em "A iniciar". "Atrasado" vira estado DERIVADO do prazo. */
RED.effectiveStatus = function (it) {
  if (RED.isOverdueActive(it)) return 'Atrasado';
  return it.status && it.status.trim() ? it.status : 'Sem status';
};

// ── Risco categórico ─────────────────────────────────────────────────────────

RED.riskOf = function (it) {
  if (RED.isDone(it)) return 'Concluído/Baixo risco';
  if (it.archived) return 'Arquivado';
  if (it.status === 'Bloqueado') return 'Bloqueado';
  const days = RED.daysToDue(it.dueDate);
  if (days === null) return 'Sem prazo';
  if (days < 0 || it.status === 'Atrasado') return 'Atrasado';
  if (days === 0) return 'Vence hoje';
  if (days <= 7) return 'Atenção 7 dias';
  return 'Em controle';
};

RED.riskSeverity = function (risk) {
  return ({ 'Bloqueado': 0, 'Atrasado': 1, 'Vence hoje': 2, 'Atenção 7 dias': 3, 'Sem prazo': 4, 'Em controle': 5, 'Concluído/Baixo risco': 6, 'Arquivado': 7 })[risk] ?? 9;
};

/** Risco OPERACIONAL crítico — fonte única do conceito. Não confundir com
 *  prioridade 'Crítica' nem com a banda 'Crítico' do riskScore composto: são
 *  três conceitos distintos e devem continuar separados. */
RED.isCriticalItem = it => ['Bloqueado', 'Atrasado', 'Vence hoje'].includes(RED.riskOf(it));
RED.isCriticalPriority = it => it.priority === 'Crítica';

RED.riskTone = function (risk) {
  if (['Atrasado', 'Bloqueado'].includes(risk)) return 'tone-red';
  if (['Vence hoje', 'Atenção 7 dias', 'Sem prazo'].includes(risk)) return 'tone-amber';
  if (risk === 'Concluído/Baixo risco') return 'tone-green';
  return 'tone-blue';
};

RED.statusTone = function (status) {
  if (['Bloqueado', 'Atrasado'].includes(status)) return 'tone-red solid';
  if (['Concluído', 'Entregue'].includes(status)) return 'tone-green solid';
  if (['Em validação', 'Em andamento'].includes(status)) return 'tone-blue solid';
  if (status === 'Pausado') return 'tone-amber solid';
  return 'tone-gray solid';
};

RED.priorityTone = function (priority) {
  if (priority === 'Crítica') return 'tone-red solid';
  if (priority === 'Alta') return 'tone-amber solid';
  if (priority === 'Baixa') return 'tone-gray solid';
  return 'tone-blue solid';
};

RED.productTone = function (product) {
  const p = String(product || '').toLowerCase();
  // Sentinela/ausente em cinza — verde (tom de sucesso) mentiria sobre a lacuna.
  if (!p || p === RED.NO_PRODUCT.toLowerCase()) return 'tone-gray';
  if (p.includes('nubank') || p === 'nu') return 'tone-purple';
  if (p.includes('vivo')) return 'tone-blue';
  if (p.includes('interno')) return 'tone-gray';
  return 'tone-green';
};

// ── Governança do cadastro vs entrega ────────────────────────────────────────

RED.dataGaps = function (it) {
  const gaps = [];
  if (!it.product || it.product === RED.NO_PRODUCT) gaps.push('sem produto');
  if (!it.dueDate) gaps.push('sem prazo');
  if (!it.owner) gaps.push('sem responsável');
  if (!it.status || it.status === 'Sem status') gaps.push('sem status');
  if (!it.definition) gaps.push('sem definição');
  if (!it.nextAction && !RED.isDone(it)) gaps.push('sem próxima ação');
  return gaps;
};

/** Mede GOVERNANÇA DO CADASTRO (tem produto? prazo? dono?) — um item 100%
 *  documentado e 0% executado pontua alto. Não é "score executivo". */
RED.scoreOf = function (it) {
  if (RED.isDone(it)) return 100;
  let score = 0;
  if (it.product && it.product !== RED.NO_PRODUCT) score += 12;
  if (it.dueDate) score += 18;
  if (it.owner) score += 14;
  if (it.status && it.status !== 'Sem status') score += 12;
  if (it.definition) score += 14;
  if (it.nextAction) score += 16;
  if (it.priority) score += 8;
  if ((it.progress || 0) > 0) score += 6;
  return RED.clamp(score, 0, 100);
};

RED.healthOf = function (it) {
  const s = RED.scoreOf(it);
  if (RED.isDone(it)) return 'Concluído';
  if (s < 55) return 'Crítico';
  if (s < 78) return 'Atenção';
  return 'Saudável';
};

/** Teto do progresso declarado de item ativo: 100 só existe com status
 *  Concluído/Entregue (trava anti-gaming). */
RED.DELIVERY_ACTIVE_CAP = 95;

RED.itemDeliveryScore = function (it) {
  if (it.status === 'Cancelado') return null;
  if (it.status === 'Concluído' || it.status === 'Entregue') return 100;
  if (it.status === 'Em validação') return Math.max(85, Math.min(RED.DELIVERY_ACTIVE_CAP, Number(it.progress || 0)));
  return RED.clamp(Number(it.progress || 0), 0, RED.DELIVERY_ACTIVE_CAP);
};

/** Índice de entrega da carteira: média ponderada por esforço (frente grande
 *  pesa mais). Mede ENTREGA, não preenchimento de formulário. */
RED.portfolioDeliveryIndex = function (items) {
  let ws = 0, ww = 0, doneCount = 0, activeCount = 0, lateCount = 0;
  for (const it of items) {
    const s = RED.itemDeliveryScore(it);
    if (s === null) continue;
    const w = Math.max(1, RED.itemEffort(it)); // esforço 0 conta como 1h — item não some da média
    ws += s * w; ww += w;
    if (s === 100) doneCount++;
    else {
      activeCount++;
      const d = RED.daysToDue(it.dueDate);
      if (d !== null && d < 0) lateCount++;
    }
  }
  return { index: ww > 0 ? Math.round(ws / ww) : null, doneCount, activeCount, lateCount };
};

// ── Score de risco COMPOSTO (5 fatores ponderados) ───────────────────────────
// Aditivo: convive com riskOf (categórico) e scoreOf (completude).
// Invariante estrito: contribution = raw * weight, sem ajuste externo.

const RISK_WEIGHTS = { prazo: 0.40, status: 0.20, progresso: 0.15, staleness: 0.15, dependencia: 0.10 };

function factorPrazo(it) {
  const d = RED.daysToDue(it.dueDate);
  if (d === null) return { raw: 50, detail: 'Sem prazo definido' };
  // Vencido em CURVA, não flat 100: a fila de decisão saturava — 8 itens, todos
  // score 76, mesma recomendação; vencido há 1 dia e há 70 dias empatavam.
  // Log: 1d≈88 · 10d≈94 · 25d≈97 · 40d≈99 · ≥60d=100 — monotônico.
  if (d < 0) {
    const days = Math.abs(d);
    const raw = Math.min(100, Math.round(86 + 14 * Math.log1p(days) / Math.log(61)));
    return { raw, detail: `Vencido há ${days} dia(s)` };
  }
  if (d === 0) return { raw: 85, detail: 'Vence hoje' };
  if (d <= 3) return { raw: 75, detail: `Vence em ${d} dia(s)` };
  if (d <= 7) return { raw: 60, detail: `Vence em ${d} dia(s)` };
  if (d <= 14) return { raw: 35, detail: `Vence em ${d} dias` };
  return { raw: 10, detail: `Folga de ${d} dias` };
}

function factorStatus(it) {
  if (it.status === 'Pausado') {
    const d = RED.daysToDue(it.dueDate);
    if (d !== null && d <= 7) return { raw: 100, detail: `Pausado com prazo em ${d} dia(s)` };
    return { raw: 60, detail: 'Pausado' };
  }
  const map = { 'Bloqueado': 100, 'Atrasado': 90, 'A iniciar': 30, 'Em validação': 30, 'Em andamento': 20 };
  return { raw: map[it.status] ?? 30, detail: it.status };
}

function factorProgresso(it) {
  const d = RED.daysToDue(it.dueDate);
  if (d !== null && d < 0) {
    const gap = RED.clamp(100 - (it.progress || 0), 0, 100);
    return { raw: gap, detail: `Prazo esgotado · ${it.progress || 0}% concluído` };
  }
  const start = RED.parseDate(it.startDate);
  const due = RED.parseDate(it.dueDate);
  if (!start || !due || due.getTime() <= start.getTime()) return { raw: 0, detail: 'Sem janela de datas para comparar' };
  const span = due.getTime() - start.getTime();
  const elapsed = RED.clamp(Math.round((RED.today().getTime() - start.getTime()) / span * 100), 0, 100);
  const gap = RED.clamp(elapsed - (it.progress || 0), 0, 100);
  return { raw: gap, detail: `${elapsed}% do prazo decorrido · ${it.progress || 0}% concluído` };
}

function factorStaleness(it) {
  if (!it.lastUpdate) return { raw: 50, detail: 'Nunca atualizado' };
  const ms = new Date(it.lastUpdate).getTime();
  if (!Number.isFinite(ms)) return { raw: 50, detail: 'Data de atualização inválida' };
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days >= 14) return { raw: 100, detail: `Sem atualização há ${days} dias` };
  if (days >= 7) return { raw: 60, detail: `Sem atualização há ${days} dias` };
  if (days >= 3) return { raw: 25, detail: `Atualizado há ${days} dias` };
  return { raw: 0, detail: 'Atualizado recentemente' };
}

function factorDependencia(it, all) {
  if (it.predecessorId) {
    const pred = all.find(x => x.id === it.predecessorId);
    if (!pred) return { raw: 60, detail: `Predecessora ${it.predecessorId} não encontrada` };
    if (RED.isDone(pred)) return { raw: 0, detail: 'Predecessora concluída' };
    const predLate = ['Bloqueado', 'Atrasado'].includes(pred.status) || ((RED.daysToDue(pred.dueDate) ?? 1) < 0);
    if (predLate) return { raw: 100, detail: `Predecessora ${pred.id} bloqueada/atrasada` };
    return { raw: 60, detail: `Aguarda ${pred.id} em andamento` };
  }
  if (it.dependencyNote) return { raw: 40, detail: it.dependencyNote };
  return { raw: 0, detail: 'Sem dependência' };
}

RED.riskBand = function (score) {
  if (score >= 70) return 'Crítico';
  if (score >= 50) return 'Alto';
  if (score >= 30) return 'Médio';
  return 'Baixo';
};

RED.riskBandTone = function (band) {
  if (band === 'Crítico') return 'tone-red';
  if (band === 'Alto') return 'tone-amber';
  if (band === 'Médio') return 'tone-gray';
  return 'tone-green';
};

RED.riskScore = function (it, all) {
  if (RED.isDone(it) || it.archived) return null;
  const rawParts = [
    Object.assign({ key: 'prazo', label: 'Prazo' }, factorPrazo(it)),
    Object.assign({ key: 'status', label: 'Status' }, factorStatus(it)),
    Object.assign({ key: 'progresso', label: 'Progresso vs tempo' }, factorProgresso(it)),
    Object.assign({ key: 'staleness', label: 'Atualização' }, factorStaleness(it)),
    Object.assign({ key: 'dependencia', label: 'Dependência' }, factorDependencia(it, all))
  ];
  const factors = rawParts.map(p => ({
    key: p.key, label: p.label, detail: p.detail, raw: p.raw,
    weight: RISK_WEIGHTS[p.key], contribution: p.raw * RISK_WEIGHTS[p.key]
  }));
  const score = Math.round(factors.reduce((s, f) => s + f.contribution, 0));
  return { score, band: RED.riskBand(score), factors, mainReason: RED.riskOf(it) };
};

RED.riskMainFactor = rs => rs.factors.reduce((max, f) => (f.contribution > max.contribution ? f : max), rs.factors[0]);

/** Segundo fator mais pesado — diferencia recomendações quando o dominante
 *  empata na fila (8 itens vencidos ganhavam o MESMO conselho). */
RED.riskSecondFactor = function (rs) {
  const main = RED.riskMainFactor(rs);
  const rest = rs.factors.filter(f => f.key !== main.key && f.contribution > 0);
  if (rest.length === 0) return null;
  return rest.reduce((max, f) => (f.contribution > max.contribution ? f : max), rest[0]);
};

/**
 * Ação recomendada — texto pronto para virar a próxima ação do item.
 * Com peso 0.40 em `prazo`, qualquer item vencido tem "prazo" como fator
 * dominante quase sempre — olhar só o dominante saturava a fila com o mesmo
 * conselho. Aqui a alavanca é decidida pelo ESTADO real do item antes de cair
 * no fator dominante.
 */
RED.riskRecommendedAction = function (it, rs) {
  const byKey = k => rs.factors.find(f => f.key === k);
  const dependencia = byKey('dependencia');
  const staleness = byKey('staleness');
  const main = RED.riskMainFactor(rs);
  const d = RED.daysToDue(it.dueDate);
  const overdueDays = d !== null && d < 0 ? Math.abs(d) : 0;

  // 1) Bloqueio de status é a alavanca mais direta: nada avança sem escalar.
  if (it.status === 'Bloqueado') return 'Escalar o destrave do bloqueio na próxima reunião de pauta.';

  // 2) Predecessora aberta — destravar a montante é o que resolve, mesmo
  //    quando "prazo" domina o score composto deste item.
  if (it.predecessorId && dependencia.raw >= 60) {
    return `Destravar dependência — ${dependencia.detail}; sem isso, esta frente não anda.`;
  }

  // 3) Sem responsável — nenhuma outra alavanca tem "a quem" cobrar.
  if (!it.owner) {
    return 'Definir o dono responsável — sem responsável atribuído não há a quem cobrar prazo, escopo ou apuração.';
  }

  // 4) Muito vencido com progresso quase nulo — renegociar o MESMO prazo de
  //    novo não muda o ritmo; a alavanca vira reduzir o compromisso.
  if (overdueDays >= 14 && (it.progress || 0) < 20) {
    return `Cortar escopo — ${overdueDays} dias vencido com ${it.progress || 0}% concluído; combine uma entrega mínima viável em vez de adiar de novo.`;
  }

  // 5) Parado pesa tanto quanto o dominante — apurar o andamento real vem
  //    antes de qualquer decisão de prazo ou escopo.
  if (staleness.raw >= 60 && staleness.contribution >= main.contribution * 0.6) {
    return `Cobrar apuração — ${staleness.detail.toLowerCase()}; sem status real não dá para decidir prazo ou escopo.`;
  }

  // 6) Fallback: segue o fator dominante do score composto.
  switch (main.key) {
    case 'prazo': {
      const second = RED.riskSecondFactor(rs);
      const agrava = second ? ` Agrava: ${second.detail.charAt(0).toLowerCase()}${second.detail.slice(1)}.` : '';
      return `Renegociar prazo ou priorizar a entrega — ${main.detail.toLowerCase()}.${agrava}`;
    }
    case 'status': return `Rever o andamento — status atual: ${it.status}.`;
    case 'progresso': return 'Replanejar escopo ou alocar reforço — progresso abaixo do tempo decorrido.';
    case 'staleness': return `Cobrar apuração — ${main.detail.toLowerCase()}.`;
    case 'dependencia':
      return it.dependencyNote
        ? `Tratar a dependência registrada: ${it.dependencyNote}.`
        : `Mapear e destravar a dependência registrada em ${it.id}.`;
  }
};

// ── Esforço / capacidade ─────────────────────────────────────────────────────

RED.itemEffort = it => RED.clamp(Number(it.effortHours ?? RED.estimateEffortHours(it)), 0, 9999);
RED.itemRemainingEffort = it => Math.max(0, Math.round(RED.itemEffort(it) * (1 - RED.clamp(Number(it.progress || 0), 0, 100) / 100)));
RED.itemTeamSize = it => Math.max(1, Math.round(Number(it.teamSize ?? RED.ownersOf(it.owner).length ?? 1)));

RED.itemStart = function (it) {
  if (it.startDate) return it.startDate;
  if (!it.dueDate) return '';
  const due = RED.parseDate(it.dueDate);
  if (!due) return '';
  const days = Math.max(1, Math.ceil(RED.itemEffort(it) / (RED.itemTeamSize(it) * 6)));
  const start = new Date(due);
  start.setDate(start.getDate() - days);
  return start.toISOString().slice(0, 10);
};

// ── Execução: a TAREFA do Kanban é o subitem da frente ──────────────────────
// O original tinha uma coleção `activities` própria. Aqui a execução de uma
// frente são as tarefas do Kanban do NEP que apontam para ela (task.itemId).
// Uma fonte só para "trabalho de uma pessoa": a Capacidade enxerga frente E
// tarefa, o progresso da frente sobe sozinho conforme as tarefas fecham, e a
// pontuação/validação por gestor que o Kanban já tem continua valendo.

/** Status de tarefa do Kanban que contam como encerradas. */
RED.TASK_DONE = ['done', 'archived'];
RED.isTaskDone = t => RED.TASK_DONE.includes(String(t.status || '').toLowerCase());

/** Horas de uma tarefa. O Kanban não tem campo de esforço: sem estimativa
 *  explícita, cada tarefa vale DEFAULT_TASK_HOURS. É premissa declarada, não
 *  medição — quem consome deve marcar como estimado (ver isEstimatedEffort). */
RED.DEFAULT_TASK_HOURS = 4;
RED.taskHours = t => Number(t.estimatedHours ?? t.horasEstimadas ?? RED.DEFAULT_TASK_HOURS);

/**
 * Agrega as tarefas de uma frente (espelha o ActivityRollup do original).
 * Progresso é razão de tarefas concluídas — número apurado, não declarado:
 * é a diferença entre "digo que estou em 80%" e "8 das 10 tarefas fecharam".
 */
RED.taskRollup = function (tasks) {
  const total = tasks.length;
  if (total === 0) return null;
  const feitas = tasks.filter(RED.isTaskDone);
  const abertas = tasks.filter(t => !RED.isTaskDone(t));
  return {
    taskCount: total,
    doneCount: feitas.length,
    activeCount: abertas.length,
    totalEffortHours: tasks.reduce((s, t) => s + RED.taskHours(t), 0),
    remainingEffortHours: abertas.reduce((s, t) => s + RED.taskHours(t), 0),
    progress: Math.round((feitas.length / total) * 100),
    /** Tarefas encerradas mas ainda não validadas pelo gestor — trabalho que
     *  não deveria contar como entregue enquanto ninguém conferiu. */
    pendingValidation: feitas.filter(t => t.validated === false).length
  };
};

/** Indexa tarefas por frente. Tarefa sem itemId fica de fora do rollup, mas
 *  continua contando na carga da pessoa (ver assigneeLoadFromTasks). */
RED.groupTasksByItem = function (tasks) {
  const by = {};
  for (const t of (tasks || [])) {
    if (!t.itemId) continue;
    (by[t.itemId] = by[t.itemId] || []).push(t);
  }
  return by;
};

/** Progresso EFETIVO da frente: apurado pelas tarefas quando existirem;
 *  senão o declarado no cadastro. */
RED.effectiveProgress = function (item, rollup) {
  return rollup ? rollup.progress : (item.progress || 0);
};

/** Horas restantes por pessoa vindas do Kanban — inclui tarefa SEM frente,
 *  que é justamente o trabalho que a carteira sozinha não enxergava. */
RED.assigneeLoadFromTasks = function (tasks) {
  const load = {};
  for (const t of (tasks || [])) {
    if (RED.isTaskDone(t)) continue;
    const quem = t.ownerName || t.owner || '';
    if (!quem) continue;
    load[quem] = (load[quem] || 0) + RED.taskHours(t);
  }
  return load;
};

const ACTIVITY_DONE = ['Concluído', 'Entregue', 'Cancelado'];

/** Ocupação individual: horas estimadas das atividades NÃO concluídas. */
RED.assigneeActivityLoad = function (activities) {
  const load = {};
  for (const a of activities) {
    if (!a.assigneeUserId || ACTIVITY_DONE.includes(a.status)) continue;
    load[a.assigneeUserId] = (load[a.assigneeUserId] || 0) + (a.estimatedHours || 0);
  }
  return load;
};

RED.checklistProgress = function (items) {
  if (!items || items.length === 0) return null;
  return Math.round((items.filter(i => i.done).length / items.length) * 100);
};

RED.itemEffortWithActivities = function (item, rollup) {
  if (rollup && rollup.totalEffortHours > 0) return rollup.totalEffortHours;
  return RED.itemEffort(item);
};
RED.itemRemainingEffortWithActivities = function (item, rollup) {
  if (rollup && rollup.activityCount > 0) return Math.max(0, rollup.remainingEffortHours);
  return RED.itemRemainingEffort(item);
};

// ── Utilização REAL ("a carga que nunca soma") ───────────────────────────────
// A Capacidade mostrava carga de PROJETOS (h restantes) e de ROTINAS (h/sem) em
// dois cards, em duas unidades — o número que decide a alocação não existia.

/** Fator recorrência → execuções por semana (diário = 5 dias úteis). */
RED.ROUTINE_WEEKLY_FACTOR = { diario: 5, semanal: 1, quinzenal: 0.5, mensal: 1 / 4.345 };

RED.routineWeeklyHours = function (effortHours, recurrence) {
  const h = Math.max(0, Number(effortHours || 0));
  const f = RED.ROUTINE_WEEKLY_FACTOR[String(recurrence || '').toLowerCase()] ?? 1;
  return h * f;
};

RED.realUtilization = function (projectRemainingH, horizonWeeks, routineWeeklyH, weeklyCapacityH) {
  const weeks = Math.max(1, horizonWeeks); // horizonte mínimo de 1 semana — sem divisão por zero
  const projectWeeklyH = Math.max(0, projectRemainingH) / weeks;
  const rout = Math.max(0, routineWeeklyH);
  const totalWeeklyH = projectWeeklyH + rout;
  // pct null quando capacidade ≤ 0 — não inventa número.
  const pct = weeklyCapacityH > 0 ? Math.round((totalWeeklyH / weeklyCapacityH) * 100) : null;
  return {
    projectWeeklyH: Math.round(projectWeeklyH * 10) / 10,
    routineWeeklyH: Math.round(rout * 10) / 10,
    totalWeeklyH: Math.round(totalWeeklyH * 10) / 10,
    pct
  };
};

/** Limites de utilização (%). */
RED.UTILIZATION_THRESHOLDS = {
  watch: 85,        // no limite (âmbar)
  overload: 115,    // carga alta
  suspect: 150,     // com sinais frágeis, vira "dado a revisar"
  implausible: 200  // quase sempre é dado errado, não gente 2× ocupada
};

/**
 * Verdadeiro quando a utilização alta provavelmente vem de dado sujo, não de
 * sobrecarga real. Separa "redistribuir" de "revisar estimativas":
 *  - abaixo do limite de carga alta → nunca é "a revisar";
 *  - ≥200% → implausível como trabalho humano → sempre revisar;
 *  - 150–199% → revisar só quando o número não tem lastro: (a) a maior parte
 *    das horas vem do esforço agregado de POUCAS frentes, OU (b) o horizonte
 *    caiu no padrão por não haver prazo futuro.
 */
RED.isUtilizationUnreliable = function (signal) {
  const { pct, fallbackShare, frontCount, reliableHorizon } = signal;
  if (pct === null) return false;
  if (pct < RED.UTILIZATION_THRESHOLDS.overload) return false;
  if (pct >= RED.UTILIZATION_THRESHOLDS.implausible) return true;
  if (pct < RED.UTILIZATION_THRESHOLDS.suspect) return false;
  if (fallbackShare >= 0.6 && frontCount <= 2) return true;
  if (!reliableHorizon) return true;
  return false;
};

RED.classifyUtilization = function (signal) {
  const { pct } = signal;
  if (pct === null) return 'unknown';
  if (pct < RED.UTILIZATION_THRESHOLDS.watch) return 'ok';
  if (pct < RED.UTILIZATION_THRESHOLDS.overload) return 'watch';
  return RED.isUtilizationUnreliable(signal) ? 'review' : 'overload';
};

RED.UTILIZATION_LABELS = {
  unknown: { label: 'Sem capacidade', tone: 'tone-gray' },
  ok: { label: 'Folga', tone: 'tone-green' },
  watch: { label: 'No limite', tone: 'tone-amber' },
  overload: { label: 'Sobrecarga', tone: 'tone-red' },
  review: { label: 'Dado a revisar', tone: 'tone-gray' }
};

RED.capacityTone = function (percent) {
  if (percent >= 100) return 'tone-red';
  if (percent >= 80) return 'tone-amber';
  return 'tone-green';
};

RED.ownerLoad = function (list) {
  const load = {};
  for (const it of list) {
    if (RED.isDone(it)) continue;
    const owners = RED.ownersOf(it.owner);
    if (owners.length === 0) continue;
    const share = RED.itemRemainingEffort(it) / owners.length;
    for (const o of owners) load[o] = (load[o] || 0) + share;
  }
  return load;
};

// ── Filtros / ordenação ──────────────────────────────────────────────────────

RED.EMPTY_FILTERS = {
  query: '', product: [], project: [], owner: [], status: [], risk: [],
  sort: 'dueAsc', criticalOnly: false, gapsOnly: false, teamOwners: null
};

RED.hasActiveFilters = function (f) {
  return !!(f.query || f.product.length || f.project.length || f.owner.length ||
    f.status.length || f.risk.length || f.criticalOnly || f.gapsOnly);
};

/**
 * Recorte-padrão ao ABRIR, pela régua de papel:
 *  - direção → null: carteira global;
 *  - gestor com time → a subárvore (entra já no próprio time);
 *  - colaborador → só o próprio nome (não abre no portfólio da empresa).
 * Só aplicar DEPOIS que o cadastro carregou: aplicar antes gera a corrida que
 * prende o gestor vendo só as próprias frentes.
 */
RED.defaultOwnerScope = function (role, isManagerWithTeam, teamNames, ownName) {
  if (RED.canViewStructure(role)) return null;
  if (isManagerWithTeam) return teamNames.length ? [...teamNames] : null;
  return ownName ? [ownName] : null;
};

RED.filteredItems = function (items, filters, ownerExpand) {
  const f = filters;
  const q = (f.query || '').toLowerCase().trim();
  const expandedTeam = f.teamOwners && f.teamOwners.length
    ? new Set(f.teamOwners.map(ownerKey)) : null;

  return items.filter(it => {
    if (it.archived) return false;
    if (q) {
      const hay = `${it.project || ''} ${it.demand || ''} ${it.definition || ''} ${it.owner || ''} ${it.id} ${(it.tags || []).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (expandedTeam && !RED.ownersOf(it.owner).some(o => expandedTeam.has(ownerKey(o)))) return false;
    if (f.product.length && !f.product.includes(it.product || RED.NO_PRODUCT)) return false;
    if (f.project.length && !f.project.includes(it.project || '')) return false;
    if (f.owner.length) {
      const wanted = new Set(f.owner.flatMap(o => (ownerExpand ? ownerExpand(o) : [o])).map(ownerKey));
      if (!RED.ownersOf(it.owner).some(o => wanted.has(ownerKey(o)))) return false;
    }
    if (f.status.length && !f.status.includes(RED.effectiveStatus(it))) return false;
    if (f.risk.length && !f.risk.includes(RED.riskOf(it))) return false;
    if (f.criticalOnly && !RED.isCriticalItem(it)) return false;
    if (f.gapsOnly && RED.dataGaps(it).length === 0) return false;
    return true;
  });
};

RED.sortItems = function (list, sort) {
  const arr = [...list];
  const byDue = (a, b) => {
    const da = RED.daysToDue(a.dueDate), db = RED.daysToDue(b.dueDate);
    if (da === null && db === null) return 0;
    if (da === null) return 1;   // sem prazo vai para o fim
    if (db === null) return -1;
    return da - db;
  };
  switch (sort) {
    case 'dueAsc': return arr.sort(byDue);
    case 'dueDesc': return arr.sort((a, b) => -byDue(a, b));
    case 'riskDesc': return arr.sort((a, b) => RED.riskSeverity(RED.riskOf(a)) - RED.riskSeverity(RED.riskOf(b)));
    case 'scoreAsc': return arr.sort((a, b) => RED.scoreOf(a) - RED.scoreOf(b));
    case 'scoreDesc': return arr.sort((a, b) => RED.scoreOf(b) - RED.scoreOf(a));
    case 'progressAsc': return arr.sort((a, b) => (a.progress || 0) - (b.progress || 0));
    case 'progressDesc': return arr.sort((a, b) => (b.progress || 0) - (a.progress || 0));
    case 'effortDesc': return arr.sort((a, b) => RED.itemEffort(b) - RED.itemEffort(a));
    default: return arr;
  }
};

RED.countsBy = function (list, getter) {
  const out = {};
  for (const item of list) {
    const k = getter(item);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
};

RED.nextId = function (items) {
  let max = 0;
  for (const it of items) {
    const m = /^G6-(\d+)$/.exec(it.id || '');
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `G6-${String(max + 1).padStart(3, '0')}`;
};

RED.monthLabel = function (iso) {
  const d = RED.parseDate(iso);
  if (!d) return 'Sem prazo';
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
};

// ── CSV que o Excel pt-BR abre certo ─────────────────────────────────────────
/**
 * Seis regras, cada uma nascida de uma planilha que abriu errado na mão de
 * alguém — não são preferência de formatação:
 *  · BOM — sem ele o Excel assume Windows-1252 e "Ação" vira "AÃ§Ã£o";
 *  · ';' — o Excel pt-BR espera ponto e vírgula; com vírgula abre em 1 coluna;
 *  · decimal com vírgula — 3.5 era lido como texto ou como 35;
 *  · '\r\n' — o Excel no Windows é mais tolerante com essa quebra;
 *  · escape de aspas, ';' e quebra de linha dentro do campo;
 *  · neutralização de fórmula — célula iniciada por = + - @ tab ou CR é
 *    EXECUTADA pelo Excel e pelo Sheets. Como título de melhoria e nome de
 *    material são texto livre digitado por usuário, alguém grava
 *    =HYPERLINK(...) e o ataque roda na máquina de quem ABRE a planilha.
 */
RED.toCSV = function (rows, columns) {
  const texto = v => {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toLocaleString('pt-BR');
    if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
    if (typeof v === 'number') {
      if (!isFinite(v)) return '';
      // Inteiro fica como está; só o decimal troca de separador — senão um ano
      // ou um id vira número quebrado.
      return Number.isInteger(v) ? String(v) : String(v).replace('.', ',');
    }
    return String(v);
  };
  const escCell = v => {
    let s = texto(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map(c => escCell(c.label)).join(';');
  const body = rows.map(r => columns.map(c => escCell(r[c.key])).join(';')).join('\r\n');
  // rows.length e não body: uma linha toda vazia produz corpo vazio (falsy) e
  // sumia do arquivo. Some é pior que vazio, porque some sem dizer.
  return '﻿' + header + (rows.length ? '\r\n' + body : '');
};

RED.downloadCSV = function (filename, rows, columns) {
  const blob = new Blob([RED.toCSV(rows, columns)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ── OKR ──────────────────────────────────────────────────────────────────────

RED.PERSPECTIVES = ['Performance', 'Governança', 'Valor', 'Projetos', 'Adoção', 'IA/Mensageria', 'Pleitos'];
RED.DIRECOES = ['Maior é melhor', 'Menor é melhor', 'Igual/meta exata'];
RED.QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
RED.ALL_OKR_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
RED.QUARTER_MONTHS = {
  Q1: ['Jan', 'Fev', 'Mar'], Q2: ['Abr', 'Mai', 'Jun'],
  Q3: ['Jul', 'Ago', 'Set'], Q4: ['Out', 'Nov', 'Dez']
};

/** Teto do atingimento (120%). Bater consistentemente no teto sinaliza meta
 *  possivelmente frouxa. */
RED.OKR_ATINGIMENTO_CAP = 1.2;

RED.calculateOkrAtingimento = function (resultado, meta, direcao) {
  if (resultado === null || resultado === undefined || isNaN(resultado)) return null;
  let val = 0;
  if (direcao === 'Maior é melhor') val = meta > 0 ? resultado / meta : 0;
  else if (direcao === 'Menor é melhor') val = resultado > 0 ? meta / resultado : 0;
  else if (direcao === 'Igual/meta exata') val = resultado === meta ? 1.0 : 0.0;
  return Math.min(RED.OKR_ATINGIMENTO_CAP, Math.max(0, val));
};

/** Meta covarde: não supera o ponto de partida, na direção do indicador.
 *  Sem baseline numérico → false (a ferramenta não acusa o que não mede). */
RED.isSandbagMeta = function (meta, baseline, direcao) {
  if (baseline === null || baseline === undefined || isNaN(baseline)) return false;
  if (direcao === 'Maior é melhor') return meta <= baseline;
  if (direcao === 'Menor é melhor') return meta >= baseline;
  return false;
};

/** Buraco anti-sandbag: KR direcional SEM baseline numérico. Sem baseline,
 *  isSandbagMeta não consegue acusar — o sandbagger só omite o baseline e
 *  escapa. Contar esses KRs torna o ponto cego mensurável. */
RED.okrBaselineGap = function (t) {
  if (t.direcao !== 'Maior é melhor' && t.direcao !== 'Menor é melhor') return false;
  return t.baseline_numerica === null || t.baseline_numerica === undefined || isNaN(t.baseline_numerica);
};

/** Piso do guardião: um contra-indicador só "segura" o objetivo se estiver
 *  ≥100% da própria meta (anti-gaming). */
RED.OKR_GUARDRAIL_MIN = 1.0;
RED.guardrailBreached = g => g !== null && g !== undefined && g < RED.OKR_GUARDRAIL_MIN;

RED.OKR_KR_KINDS = ['comprometido', 'aspiracional'];
RED.OKR_KIND_LABELS = { comprometido: 'Comprometido', aspiracional: 'Aspiracional' };
RED.OKR_KIND_HINTS = {
  comprometido: 'Você prometeu: verde só @100%; abaixo de 85% exige FCA.',
  aspiracional: 'Moonshot: 70% já é sucesso; abaixo de 50% exige FCA.'
};
/** Cada tipo carrega UMA régua: `green` = piso do verde, `amber` = "quase lá";
 *  abaixo de amber = vermelho = exige FCA. Aspiracional não pune moonshot. */
RED.OKR_KIND_THRESHOLDS = {
  comprometido: { green: 1.0, amber: 0.85 },
  aspiracional: { green: 0.7, amber: 0.5 }
};
RED.okrKind = k => (k === 'aspiracional' ? 'aspiracional' : 'comprometido');

RED.okrAtingimentoBand = function (atingimento, kind) {
  if (atingimento === null || atingimento === undefined) return null;
  const t = RED.OKR_KIND_THRESHOLDS[RED.okrKind(kind)];
  return atingimento >= t.green ? 'verde' : atingimento >= t.amber ? 'ambar' : 'vermelho';
};

/** Farol ÚNICO do score agregado, para o MESMO score não pintar cores
 *  diferentes entre telas (era o caso: Resumo Estrutura usava 70/50 e o OKRs
 *  usava 100/70). */
RED.okrScoreTone = function (score) {
  if (score === null) return 'tone-gray';
  if (score >= 100) return 'tone-green';
  if (score >= 70) return 'tone-amber';
  return 'tone-red';
};

RED.resolveOkrStatus = function (atingimento, kind) {
  if (atingimento === null || atingimento === undefined) return 'Pendente';
  const t = RED.OKR_KIND_THRESHOLDS[RED.okrKind(kind)];
  if (atingimento >= t.green) return 'Atingido';
  if (atingimento >= t.amber) return 'Parcial';
  return 'Crítico';
};

RED.okrStatusTone = function (status) {
  if (status === 'Atingido') return 'tone-green';
  if (status === 'Parcial') return 'tone-amber';
  if (status === 'Crítico') return 'tone-red';
  return 'tone-gray';
};

RED.okrMetaLikelyLoose = s => s !== null && s !== undefined && s >= RED.OKR_ATINGIMENTO_CAP * 100;

/** DEVOLVIDO = não homologado COM instrução de correção registrada. O
 *  re-lançamento limpa o feedback → volta a 'pendente'. Homologar é selo, não
 *  portão: o valor conta nos 3 estados. */
RED.okrHomologStatus = function (audited, auditFeedback) {
  if (audited) return 'homologado';
  return auditFeedback && String(auditFeedback).trim() !== '' ? 'devolvido' : 'pendente';
};

/** Linha do verde do OBJETIVO, ponderada por peso: só-comprometido exige 100%;
 *  só-aspiracional, 70%; misto fica entre os dois. */
RED.okrObjectiveGreenLine = function (krs) {
  if (!krs.length) return 1.0;
  const totalPeso = krs.reduce((s, k) => s + (k.peso || 1), 0) || 1;
  return krs.reduce((s, k) => s + RED.OKR_KIND_THRESHOLDS[RED.okrKind(k.kind)].green * (k.peso || 1), 0) / totalPeso;
};
RED.okrObjectiveFcaLine = function (krs) {
  if (!krs.length) return 0.85;
  const totalPeso = krs.reduce((s, k) => s + (k.peso || 1), 0) || 1;
  return krs.reduce((s, k) => s + RED.OKR_KIND_THRESHOLDS[RED.okrKind(k.kind)].amber * (k.peso || 1), 0) / totalPeso;
};

/** Teto da contribuição de um KR no rollup: 1.0. Sem o teto, um KR a 120%
 *  compensa outro a 80% e o objetivo parece saudável com metade parada. */
RED.OKR_ROLLUP_KR_CAP = 1.0;
RED.okrRollupContribution = function (a) {
  if (a === null || a === undefined) return null;
  return Math.min(RED.OKR_ROLLUP_KR_CAP, a);
};

RED.okrObjectiveRollups = function (objectives, krScores) {
  return objectives.map(obj => {
    const linked = krScores.filter(k => k.objective_id === obj.id);
    const measured = linked.filter(k => k.score !== null && k.score !== undefined);
    const score = measured.length ? Math.round(measured.reduce((s, k) => s + k.score, 0) / measured.length) : null;
    const contributors = [...new Set(linked.map(k => k.responsavel).filter(Boolean))];
    return { objective: obj, score, krCount: linked.length, contributors };
  });
};

/** Limiar de FCA de ciclo: objetivo que fechou abaixo disto exige análise. */
RED.OKR_CYCLE_FCA_THRESHOLD = 85;
RED.objectiveNeedsCycleFca = function (score, fcaLinePct) {
  fcaLinePct = fcaLinePct === undefined ? RED.OKR_CYCLE_FCA_THRESHOLD : fcaLinePct;
  return score !== null && score !== undefined && score < fcaLinePct;
};

RED.OKR_CADENCIA_STALE_DAYS = { semanal: 7, mensal: 40 };
RED.okrCadenciaFromPeriodicidade = function (p) {
  return String(p || '').toLowerCase().includes('seman') ? 'semanal' : 'mensal';
};

RED.formatOkrValue = function (val, unidade, metaHint) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const u = String(unidade || '').trim();
  if (u === '%') return `${Math.round(val * 10) / 10}%`;
  if (u.toLowerCase().includes('r$') || u.toLowerCase().includes('reais')) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }
  const rounded = Math.abs(val) >= 100 ? Math.round(val) : Math.round(val * 100) / 100;
  return u ? `${rounded.toLocaleString('pt-BR')} ${u}` : rounded.toLocaleString('pt-BR');
};

// ── 1:1 — aderência às ações ─────────────────────────────────────────────────

RED.ONE_ON_ONE_ACTION_STATUSES = ['pendente', 'feito', 'parcial', 'nao_feito', 'cancelado'];
RED.ONE_ON_ONE_ACTION_LABELS = {
  pendente: 'Pendente', feito: 'Feito', parcial: 'Parcial',
  nao_feito: 'Não feito', cancelado: 'Cancelado'
};
RED.oneOnOneActionTone = function (s) {
  if (s === 'feito') return 'tone-green';
  if (s === 'parcial') return 'tone-amber';
  if (s === 'nao_feito') return 'tone-red';
  if (s === 'cancelado') return 'tone-gray';
  return 'tone-blue';
};
/** Peso na aderência. 'cancelado' devolve null: sai do denominador — ação
 *  cancelada de comum acordo não é descumprimento. */
RED.oneOnOneActionWeight = function (status) {
  if (status === 'feito') return 1;
  if (status === 'parcial') return 0.5;
  if (status === 'nao_feito') return 0;
  if (status === 'pendente') return 0;
  return null; // cancelado
};
RED.oneOnOneActionOverdue = function (a, nowMs) {
  if (a.status !== 'pendente' || !a.due_date) return false;
  return Date.parse(`${a.due_date}T23:59:59Z`) < nowMs;
};
RED.oneOnOneAdherence = function (actions, nowMs) {
  nowMs = nowMs === undefined ? Date.now() : nowMs;
  let sum = 0, count = 0, overdue = 0, pending = 0;
  for (const a of (actions || [])) {
    const w = RED.oneOnOneActionWeight(a.status);
    if (w !== null) { sum += w; count++; }
    if (a.status === 'pendente') pending++;
    if (RED.oneOnOneActionOverdue(a, nowMs)) overdue++;
  }
  return {
    pct: count > 0 ? Math.round((sum / count) * 100) : null,
    total: count, pending, overdue
  };
};

// ── Rotinas ──────────────────────────────────────────────────────────────────

RED.ROUTINE_TYPES = ['Report', 'Agenda', 'Material', 'BancoDados', 'Outro'];
RED.ROUTINE_RECURRENCES = ['diario', 'semanal', 'quinzenal', 'mensal'];
RED.AUTOMATION_STATUSES = ['Manual', 'Semi', 'Automatica'];
RED.RECURRENCE_BUSINESS_DAYS = { diario: 1, semanal: 5, quinzenal: 10, mensal: 21 };
RED.BUSINESS_DAYS_PER_YEAR = 252;

RED.routineTypeTone = function (type) {
  if (type === 'Report') return 'tone-blue';
  if (type === 'Agenda') return 'tone-purple';
  if (type === 'Material') return 'tone-green';
  if (type === 'BancoDados') return 'tone-amber';
  return 'tone-gray';
};
RED.automationTone = function (s) {
  if (s === 'Automatica') return 'tone-green';
  if (s === 'Semi') return 'tone-amber';
  return 'tone-gray';
};

/** 'YYYY-MM-DD' de hoje no fuso de Brasília. Data local muda com o fuso do
 *  navegador — a fila de rotinas tem que ser a mesma para todo mundo. */
RED.hojeIsoBrt = function (nowMs) {
  nowMs = nowMs === undefined ? Date.now() : nowMs;
  return new Date(nowMs - 3 * 3600000).toISOString().slice(0, 10);
};

RED.nextRun = function (recurrence, from, holidays) {
  const n = RED.RECURRENCE_BUSINESS_DAYS[String(recurrence || '').toLowerCase()] ?? 5;
  const base = from ? Date.parse(`${from}T00:00:00Z`) : Date.now();
  if (!Number.isFinite(base)) return '';
  return RED.isoDateUTC(RED.businessDaysAfter(base, n, holidays));
};

RED.routineSlotTone = function (kind) {
  if (kind === 'vencida') return 'tone-red';
  if (kind === 'hoje') return 'tone-amber';
  return 'tone-blue';
};

/** Custo manual anual (h) de uma rotina — a conta que justifica automatizar. */
RED.manualCostHoursPerYear = function (routine) {
  const perRun = Math.max(0, Number(routine.effort_hours || routine.effortHours || 0));
  const everyN = RED.RECURRENCE_BUSINESS_DAYS[String(routine.recurrence || '').toLowerCase()] ?? 5;
  return Math.round(perRun * (RED.BUSINESS_DAYS_PER_YEAR / everyN));
};

// ── Eventos / Agenda ─────────────────────────────────────────────────────────

RED.EVENT_TYPES = ['Abertura OKR', 'Fechamento OKR', 'Revisão OKR', '1:1', 'Reunião', 'Outro'];
RED.eventTypeTone = function (type) {
  if (type === 'Abertura OKR') return 'tone-green';
  if (type === 'Fechamento OKR') return 'tone-red';
  if (type === 'Revisão OKR') return 'tone-amber';
  if (type === '1:1') return 'tone-purple';
  if (type === 'Reunião') return 'tone-blue';
  return 'tone-gray';
};

// ── FCA ──────────────────────────────────────────────────────────────────────

RED.FCA_STATUSES = ['Aberto', 'Em Andamento', 'Fechado', 'Cancelado'];
RED.fcaStatusTone = function (status) {
  if (status === 'Aberto') return 'tone-red';
  if (status === 'Em Andamento') return 'tone-amber';
  if (status === 'Fechado') return 'tone-green';
  return 'tone-gray';
};

// ── Boletim executivo ────────────────────────────────────────────────────────

/** Limiar (h) acima do qual o boletim persistido é considerado defasado frente
 *  aos tiles ao vivo: a nota recalcula a cada carregamento, mas o boletim é
 *  texto gerado num instante passado — os dois mostravam números diferentes
 *  (74 no boletim vs 71 no tile) sem qualquer aviso. */
RED.WEEKLY_BULLETIN_STALE_HOURS = 3;
RED.isWeeklyBulletinStale = function (generatedAtIso, nowMs) {
  const h = RED.hoursSince(generatedAtIso, nowMs);
  return h !== null && h >= RED.WEEKLY_BULLETIN_STALE_HOURS;
};

/**
 * Linhas do relatório executivo — porte de executiveLines(). Texto pronto para
 * copiar para e-mail/ata. É determinístico (sem IA): o original também gera
 * este bloco localmente; a IA lá só escreve o boletim narrativo por cima.
 */
RED.executiveLines = function (list, filters) {
  const ativos = list.filter(it => !RED.isDone(it) && !it.archived);
  const criticos = ativos.filter(RED.isCriticalItem);
  const del = RED.portfolioDeliveryIndex(list);
  const gaps = ativos.filter(it => RED.dataGaps(it).length > 0);

  const linhas = [];
  linhas.push(`Carteira: ${list.length} frente(s) — ${ativos.length} ativa(s), ${del.doneCount} concluída(s).`);
  if (del.index !== null) linhas.push(`Índice de entrega (ponderado por esforço): ${del.index}%.`);
  linhas.push(`Em risco operacional: ${criticos.length} frente(s) — ${del.lateCount} com prazo estourado.`);
  if (gaps.length) linhas.push(`Governança: ${gaps.length} frente(s) ativa(s) com lacuna de cadastro.`);

  // Ordena pelo score COMPOSTO, não por riskSeverity (categórico): a linha
  // exibe o número composto, e sortItems('riskDesc') ordena por categoria
  // (Bloqueado antes de Atrasado) — a lista saía 40, 70, 38 e parecia
  // desordenada para quem lê os números na tela.
  const topo = ativos
    .map(it => ({ it, rs: RED.riskScore(it, list) }))
    .filter(x => x.rs)
    .sort((a, b) => b.rs.score - a.rs.score)
    .slice(0, 5);
  if (topo.length) {
    linhas.push('');
    linhas.push('Prioridades da semana:');
    for (const { it, rs } of topo) {
      linhas.push(`· ${RED.frontLabel(it)} (${rs.score}, ${rs.band}) — ${RED.riskRecommendedAction(it, rs)}`);
    }
  }
  return linhas.join('\n');
};

// ── Dashboard: layout configurável ───────────────────────────────────────────

RED.DASHBOARD_CARDS = [
  { id: 'kpis', label: 'Indicadores da carteira' },
  { id: 'delivery', label: 'Índice de entrega' },
  { id: 'decision', label: 'Fila de decisão' },
  { id: 'ownerLoad', label: 'Carga por responsável' },
  { id: 'statusMix', label: 'Distribuição por status' },
  { id: 'gaps', label: 'Lacunas de governança' }
];

RED.normalizeDashboardLayout = function (raw) {
  const known = RED.DASHBOARD_CARDS.map(c => c.id);
  const order = Array.isArray(raw && raw.order) ? raw.order.filter(id => known.includes(id)) : [];
  // Cartão novo (deploy) nunca some para quem já tinha layout salvo: entra no fim.
  for (const id of known) if (!order.includes(id)) order.push(id);
  const hidden = Array.isArray(raw && raw.hidden) ? raw.hidden.filter(id => known.includes(id)) : [];
  return { order, hidden };
};

window.RED = RED;
