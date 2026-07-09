import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   AUTH / SESSION
========================= */
const ROLE_LEVEL = {
  superintendente: 5,
  gerente: 4,
  consultor: 3,
  coordenador: 2,
  analista: 1,
  monitor: 0
};

const ROLE_LABEL = {
  superintendente: "SUPERINTENDENTE",
  gerente: "GERENTE",
  consultor: "CONSULTOR",
  coordenador: "COORDENADOR",
  analista: "ANALISTA",
  monitor: "MONITOR"
};

function legacyRoleToKey(legacy) {
  const map = {
    "4": "superintendente",
    "3": "gerente",
    "2": "coordenador",
    "1": "analista",
    "0": "monitor"
  };
  return map[String(legacy)] || null;
}

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

function getMyRoleKey() {
  const key = localStorage.getItem("nep_user_role_key");
  if (key && ROLE_LEVEL[key] !== undefined) return key;

  const legacy = localStorage.getItem("nep_user_role");
  const legacyKey = legacyRoleToKey(legacy);
  if (legacyKey) {
    localStorage.setItem("nep_user_role_key", legacyKey);
    return legacyKey;
  }

  return null;
}

const myRoleKey = getMyRoleKey();
const myLevel = myRoleKey ? ROLE_LEVEL[myRoleKey] : null;
const myRoleLabel = myRoleKey ? (ROLE_LABEL[myRoleKey] || "USUÁRIO") : "USUÁRIO";
const myName = (localStorage.getItem("nep_user_name") || "").trim();

if (!myRoleKey) window.location.href = "login.html";

const roleDisplay = document.getElementById("user-role-display");
if (roleDisplay) roleDisplay.textContent = myRoleLabel;

const nameDisplay = document.getElementById("user-name-display");
if (nameDisplay) nameDisplay.textContent = myName ? myName : "USUÁRIO";

const logoutBtn = document.getElementById("btn-logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (!confirm("Sair do sistema?")) return;
    localStorage.removeItem("nep_user_role_key");
    localStorage.removeItem("nep_user_role");
    localStorage.removeItem("nep_user_name");
    window.location.href = "login.html";
  });
}

const exportBtn = document.getElementById("btn-export-csv");
if (exportBtn) {
  const canExport = myRoleKey === "superintendente" || myRoleKey === "gerente";
  if (!canExport) exportBtn.style.display = "none";
}

/* =========================
   FIREBASE
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyCqwJ64SjXQf_ekZhRZcF4nN_Fqhwvxi_Q",
  authDomain: "ecossistema-nep.firebaseapp.com",
  projectId: "ecossistema-nep",
  storageBucket: "ecossistema-nep.firebasestorage.app",
  messagingSenderId: "1041112586342",
  appId: "1:1041112586342:web:0b7dc02b242cd3dbe635a7",
  measurementId: "G-JTQQ1SVMMV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =========================
   STATE
========================= */
let allTasks = [];
let showArchived = false;
let draggedItem = null;

let deliveryTaskId = null;
let reviewTaskId = null;

let contextMenuTargetId = null;

let selectedPriority = "Baixo";
let selectedComplexity = "Baixa";

let charts = {};

/* =========================
   HELPERS
========================= */
function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toBRDate(dateKey) {
  if (!dateKey) return "--/--/----";
  const [y, m, d] = String(dateKey).split("-");
  return `${d}/${m}/${y}`;
}

function getFilterVals() {
  return {
    unit: document.getElementById("filter-unit")?.value || "all",
    segment: document.getElementById("filter-segment")?.value || "all",
    requester: document.getElementById("filter-requester")?.value || "all",
    owner: document.getElementById("filter-owner")?.value || "all"
  };
}

function statusLabel(s) {
  const map = {
    backlog: "Backlog",
    doing: "Execução",
    pending: "Block",
    done: "Entregue",
    archived: "Arquivado"
  };
  return map[s] || s;
}

/* =========================
   🔥 ROTINA ADM
========================= */
function normalizeKey(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const routineUserKey = `${normalizeKey(myRoleKey)}_${normalizeKey(myName || "user")}`;
const routineStorageKey = `nep_routine_${routineUserKey}`;

function loadRoutine() {
  try {
    const raw = localStorage.getItem(routineStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRoutine(list) {
  localStorage.setItem(routineStorageKey, JSON.stringify(list || []));
}

function routineDoneKey(dateKey, itemId) {
  return `nep_done_${dateKey}_${itemId}`;
}

function newLocalId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

/* =========================
   🔥 PERMISSIONS CORRIGIDAS
========================= */
function taskCreatorLevel(task) {
  if (task && task.creatorRoleKey && ROLE_LEVEL[task.creatorRoleKey] !== undefined) {
    return ROLE_LEVEL[task.creatorRoleKey];
  }

  const lvl = Number(task && task.creatorLevel);
  if (!Number.isFinite(lvl)) return 0;

  const key = legacyRoleToKey(String(lvl));
  if (key && ROLE_LEVEL[key] !== undefined) return ROLE_LEVEL[key];

  return Math.max(0, Math.min(5, lvl));
}

function isCreatorMe(task) {
  const byName = myName && norm(task?.creatorName) === norm(myName);
  return Boolean(byName);
}

// 🔥 FUNÇÃO CORRIGIDA: Verifica se o usuário pode ver a tarefa
function canSeeTask(task) {
  const tLevel = taskCreatorLevel(task);

  // Superintendente vê tudo
  if (myRoleKey === "superintendente") return true;

  // 🔥 NOVO: Se EU sou o responsável pela tarefa, SEMPRE vejo
  const assignedToMe = myName && norm(task?.owner) === norm(myName);
  if (assignedToMe) return true;

  // 🔥 NOVO: Se EU sou o responsável por cargo, SEMPRE vejo
  const myRoleMatch = task?.ownerRole && norm(task.ownerRole) === norm(myRoleLabel);
  if (myRoleMatch) return true;

  // Criador sempre vê suas próprias tarefas
  if (isCreatorMe(task)) return true;

  // Monitor só vê tarefas criadas por monitor ou delegadas para ele
  if (myRoleKey === "monitor") {
    return tLevel === 0;
  }

  // Demais cargos veem tarefas de nível igual ou inferior
  let allowed = tLevel <= myLevel;

  return allowed;
}

function canDeleteTask(task) {
  if (myRoleKey === "superintendente") return true;
  if (isCreatorMe(task)) return true;
  const tLevel = taskCreatorLevel(task);
  return myLevel > tLevel;
}

function canValidateTask(task) {
  if (!task || task.status !== "done" || task.validated) return false;
  if (myRoleKey === "superintendente") return true;

  const tLevel = taskCreatorLevel(task);
  return myLevel > tLevel;
}

function assigneeText(task) {
  const r = (task && task.ownerRole) ? String(task.ownerRole).trim() : "";
  const n = (task && task.owner) ? String(task.owner).trim() : "";
  if (r && n) return `${r} - ${n}`;
  if (r) return r;
  if (n) return n;
  return "N/D";
}

// 🔥 NOVA FUNÇÃO: Verifica se pode delegar para determinado cargo
function canDelegateTo(targetRoleKey) {
  const targetLevel = ROLE_LEVEL[targetRoleKey];
  if (targetLevel === undefined) return false;

  // Monitor só pode delegar para si mesmo
  if (myRoleKey === "monitor") {
    return targetRoleKey === "monitor";
  }

  // Analista só pode delegar para coordenador, analista ou monitor
  if (myRoleKey === "analista") {
    return targetLevel <= ROLE_LEVEL.coordenador;
  }

  // Coordenador, Gerente, Consultor e Superintendente podem delegar para todos
  return true;
}

/* =========================
   FILTERED DATASET
========================= */
function applyFilters(tasks) {
  const f = getFilterVals();

  return tasks.filter(t => {
    const matchUnit = f.unit === "all" || t.unit === f.unit;
    const matchSeg = f.segment === "all" || t.segment === f.segment;
    const matchReq = f.requester === "all" || t.requester === f.requester;
    const matchOwn = f.owner === "all" || t.owner === f.owner;
    return matchUnit && matchSeg && matchReq && matchOwn;
  });
}

function getVisibleTasks() {
  let list = allTasks.filter(t => canSeeTask(t));

  if (showArchived) list = list.filter(t => t.status === "archived");
  else list = list.filter(t => t.status !== "archived");

  list = applyFilters(list);
  return list;
}

/* =========================
   🔥 NOTIFICAÇÃO DE NOVAS DEMANDAS
========================= */
function countUnacknowledgedTasks() {
  const myTasks = allTasks.filter(t => {
    const assignedToMe = myName && norm(t?.owner) === norm(myName);
    const isNew = t.status === "backlog" && !t.acknowledged;
    return assignedToMe && isNew;
  });
  return myTasks.length;
}

function updateNotificationBadge() {
  const count = countUnacknowledgedTasks();
  const badge = document.getElementById("notification-badge");
  
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }
}

/* =========================
   REALTIME TASKS
========================= */
onSnapshot(collection(db, "tasks"), (snapshot) => {
  allTasks = [];
  snapshot.forEach(d => allTasks.push({ ...d.data(), id: d.id }));
  updateFilters();
  renderBoard();
  updateNotificationBadge();
  
  if (document.getElementById("view-dashboard")?.classList.contains("active")) {
    updateCharts();
  }
});

/* =========================
   FILTERS UI
========================= */
function updateFilters() {
  const visibleBase = allTasks.filter(t => canSeeTask(t) && t.status !== "archived");

  populateFilter("filter-unit", "unit", visibleBase);
  populateFilter("filter-segment", "segment", visibleBase);
  populateFilter("filter-requester", "requester", visibleBase);
  populateFilter("filter-owner", "owner", visibleBase);
}

function populateFilter(elementId, field, baseList) {
  const select = document.getElementById(elementId);
  if (!select) return;

  const currentVal = select.value;

  const values = [...new Set((baseList || []).map(t => t[field]))]
    .filter(Boolean)
    .sort();

  const firstOption = select.options[0];
  select.innerHTML = "";
  if (firstOption) select.appendChild(firstOption);

  values.forEach(val => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    select.appendChild(opt);
  });

  if (values.includes(currentVal)) select.value = currentVal;
  else select.value = "all";
}

/* =========================
   KANBAN
========================= */
function renderBoard() {
  if (draggedItem) return;

  document.querySelectorAll(".track").forEach(el => (el.innerHTML = ""));

  const counts = { backlog: 0, doing: 0, pending: 0, done: 0 };

  const visible = getVisibleTasks();
  visible.forEach(task => {
    const card = createCard(task);

    if (showArchived) {
      document.getElementById("track-done")?.appendChild(card);
      return;
    }

    const track = document.getElementById(`track-${task.status}`);
    if (track) {
      track.appendChild(card);
      if (counts[task.status] !== undefined) counts[task.status]++;
    }
  });

  document.getElementById("count-backlog") && (document.getElementById("count-backlog").textContent = counts.backlog);
  document.getElementById("count-doing") && (document.getElementById("count-doing").textContent = counts.doing);
  document.getElementById("count-pending") && (document.getElementById("count-pending").textContent = counts.pending);
  document.getElementById("count-done") && (document.getElementById("count-done").textContent = counts.done);
}

function createCard(task) {
  const card = document.createElement("div");
  card.className = "card";

  // 🔥 NOVA DEMANDA NÃO RECONHECIDA
  const assignedToMe = myName && norm(task?.owner) === norm(myName);
  const isNew = task.status === "backlog" && !task.acknowledged && assignedToMe;

  if (isNew) {
    card.classList.add("new-task");
  }

  if (task.status === "done") {
    if (task.validated) card.classList.add("validated");
    else card.classList.add("pending-validation");
  }

  card.setAttribute("draggable", "true");
  card.dataset.id = task.id;
  card.dataset.status = task.status;

  let slaHTML = "";
  if (task.status !== "done" && task.status !== "archived") {
    slaHTML = `<div class="sla-timer" id="sla-${task.id}"></div>`;
  }

  // 🔥 BADGE "NOVA DEMANDA"
  let newBadgeHTML = "";
  if (isNew) {
    const creatorRole = task.creatorRoleLabel || "Gestor";
    const creatorName = task.creatorName || "Sistema";
    newBadgeHTML = `
      <div class="new-task-badge">
        <i class="fa-solid fa-bell"></i>
        Nova demanda de ${creatorRole} - ${creatorName}
      </div>
    `;
  }

  const dateDisplay = task.deadline ? toBRDate(task.deadline) : "--/--/----";

  const prio = task.priority || "Baixo";
  const prioClass =
    prio === "Urgente" ? "p-urgente" :
    prio === "Alto" ? "p-alto" :
    prio === "Médio" ? "p-medio" : "p-baixo";

  const comp = task.complexity || "Baixa";
  const compClass =
    comp === "Alta" ? "c-alta" :
    comp === "Média" ? "c-media" : "c-baixa";

  const canDel = canDeleteTask(task);

  const actionsHTML = `
    <div class="actions">
      <i class="fa-solid fa-pen act-btn edit-btn" title="Editar"></i>
      ${canDel ? `<i class="fa-solid fa-trash act-btn del-btn" title="Excluir"></i>` : ``}
    </div>
  `;

  const ownerDisplay = `<i class="fa-solid fa-user-gear"></i> ${assigneeText(task)}`;

  // 🔥 BOTÃO "RECEBI A DEMANDA"
  let acknowledgeHTML = "";
  if (isNew) {
    acknowledgeHTML = `
      <button class="btn-acknowledge" data-id="${task.id}">
        <i class="fa-solid fa-check"></i> RECEBI A DEMANDA
      </button>
    `;
  }

  let validationHTML = "";
  if (task.status === "done" && !task.validated) {
    validationHTML = `<div class="validation-status status-warn"><i class="fa-solid fa-clock"></i> Aguardando validação</div>`;
    if (canValidateTask(task)) {
      validationHTML += `
        <button class="btn-validate" data-action="review" data-id="${task.id}">
          <i class="fa-solid fa-magnifying-glass"></i> REVISAR / VALIDAR
        </button>`;
    }
  } else if (task.status === "done" && task.validated) {
    validationHTML = `<div class="validation-status status-ok"><i class="fa-solid fa-check-double"></i> Concluída</div>`;
  }

  card.innerHTML = `
    <div class="card-header">
      <span class="tag">${task.unit || "Geral"}</span>
      ${actionsHTML}
    </div>

    <div class="card-title">${task.title || ""}</div>

    ${newBadgeHTML}
    ${acknowledgeHTML}
    ${slaHTML}
    ${validationHTML}

    <div class="card-meta">
      <div class="meta-user">${ownerDisplay}</div>
      <div class="badges">
        <div class="priority-badge ${prioClass}">${prio}</div>
        <div class="complexity-badge ${compClass}">${comp}</div>
      </div>
    </div>

    <div style="font-size:10px; color:var(--text-sec); margin-top:5px; text-align:right;">${dateDisplay}</div>
  `;

  // 🔥 EVENTO: RECONHECER DEMANDA
  const ackBtn = card.querySelector(".btn-acknowledge");
  if (ackBtn) {
    ackBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const taskId = ackBtn.dataset.id;
      await updateDoc(doc(db, "tasks", taskId), { acknowledged: true });
      await logHistory(taskId, `Demanda recebida por ${myName} (${myRoleLabel})`);
      showToast("Demanda reconhecida!");
    });
  }

  card.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action='review']");
    if (btn) {
      openReviewModal(btn.dataset.id);
      return;
    }
    openEdit(task);
  });

  card.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showContextMenu(e.pageX, e.pageY, task.id);
  });

  card.querySelector(".edit-btn")?.addEventListener("click", (e) => { e.stopPropagation(); openEdit(task); });
  card.querySelector(".del-btn")?.addEventListener("click", (e) => { e.stopPropagation(); confirmDelete(task.id); });

  card.addEventListener("dragstart", () => {
    draggedItem = card;
    card.classList.add("is-dragging");
    document.body.classList.add("is-dragging");
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("is-dragging");
    document.body.classList.remove("is-dragging");
    draggedItem = null;
    document.getElementById("archive-drop-zone")?.classList.remove("drag-over");
    document.querySelectorAll(".board-col").forEach(c => c.style.background = "transparent");
  });

  return card;
}

/* =========================
   CONTEXT MENU
========================= */
const ctxMenu = document.getElementById("context-menu");

function showContextMenu(x, y, taskId) {
  contextMenuTargetId = taskId;
  if (!ctxMenu) return;

  const task = allTasks.find(t => t.id === taskId);
  const canDel = task ? canDeleteTask(task) : false;

  const delItem = document.getElementById("ctx-delete");
  if (delItem) delItem.style.display = canDel ? "flex" : "none";

  ctxMenu.style.left = `${x}px`;
  ctxMenu.style.top = `${y}px`;
  ctxMenu.classList.remove("hidden");
}

document.addEventListener("click", (e) => {
  if (!ctxMenu) return;
  if (!e.target.closest("#context-menu")) ctxMenu.classList.add("hidden");
});

document.getElementById("ctx-edit")?.addEventListener("click", () => {
  ctxMenu?.classList.add("hidden");
  const task = allTasks.find(t => t.id === contextMenuTargetId);
  if (task) openEdit(task);
});

document.getElementById("ctx-archive")?.addEventListener("click", async () => {
  ctxMenu?.classList.add("hidden");
  if (!contextMenuTargetId) return;
  if (!confirm("Arquivar esta demanda?")) return;

  await updateDoc(doc(db, "tasks", contextMenuTargetId), { status: "archived" });
  await logHistory(contextMenuTargetId, `Arquivado | Resp: ${assigneeText(allTasks.find(t => t.id === contextMenuTargetId) || {})}`);
  showToast("Arquivado!");
});

document.getElementById("ctx-delete")?.addEventListener("click", () => {
  ctxMenu?.classList.add("hidden");
  if (contextMenuTargetId) confirmDelete(contextMenuTargetId);
});

async function confirmDelete(id) {
  const task = allTasks.find(t => t.id === id);
  if (!task) return;

  if (!canDeleteTask(task)) {
    showToast("Sem permissão para excluir.");
    return;
  }

  if (!confirm("Excluir esta demanda?")) return;

  try {
    await deleteDoc(doc(db, "tasks", id));
    showToast("Excluído!");
  } catch (e) {
    console.error(e);
    alert("Falha ao excluir. Verifique as regras do Firestore.");
  }
}

/* =========================
   REVIEW MODAL
========================= */
function openReviewModal(id) {
  reviewTaskId = id;

  const task = allTasks.find(t => t.id === id);
  if (!task) return;

  const txt = document.getElementById("review-text");
  if (txt) txt.textContent = task.evidence || "Sem comentários adicionais.";

  const linkBox = document.getElementById("review-link");
  if (linkBox) {
    const link = String(task.evidenceLink || "").trim();
    if (link) {
      const safe = link.replace(/"/g, "");
      linkBox.innerHTML = `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`;
    } else {
      linkBox.innerHTML = `<span style="color:var(--text-sec); font-size:11px;">Nenhum link informado.</span>`;
    }
  }

  const approveBtn = document.getElementById("btn-approve-review");
  if (approveBtn) approveBtn.style.display = canValidateTask(task) ? "block" : "none";

  document.getElementById("modal-review")?.classList.remove("hidden");
}

document.getElementById("btn-approve-review")?.addEventListener("click", async () => {
  if (!reviewTaskId) return;

  const task = allTasks.find(t => t.id === reviewTaskId);
  if (!task || !canValidateTask(task)) {
    showToast("Sem permissão para validar.");
    return;
  }

  await updateDoc(doc(db, "tasks", reviewTaskId), {
    validated: true,
    validatedBy: `${myName || "Gestor"} (${myRoleLabel})`,
    validatedAt: new Date().toISOString()
  });

  await logHistory(reviewTaskId, `Validado por ${myName || "Gestor"} (${myRoleLabel}) | Resp: ${assigneeText(task || {})}`);

  document.getElementById("modal-review")?.classList.add("hidden");
  reviewTaskId = null;
  showToast("Concluída / validada!");
});

document.getElementById("btn-close-review")?.addEventListener("click", () => {
  document.getElementById("modal-review")?.classList.add("hidden");
  reviewTaskId = null;
});

/* =========================
   DRAG & DROP
========================= */
document.querySelectorAll(".board-col").forEach(col => {
  col.addEventListener("dragover", (e) => {
    e.preventDefault();
    col.style.background = "rgba(28, 78, 216, 0.1)";
  });

  col.addEventListener("dragleave", () => {
    col.style.background = "transparent";
  });

  col.addEventListener("drop", async (e) => {
    e.preventDefault();
    col.style.background = "transparent";
    if (!draggedItem) return;

    const newStatus = col.dataset.status;
    const oldStatus = draggedItem.dataset.status;
    const id = draggedItem.dataset.id;

    if (newStatus === "done" && oldStatus !== "done") {
      deliveryTaskId = id;
      const btn = document.getElementById("btn-confirm-delivery");
      if (btn) btn.innerHTML = (myRoleKey === "superintendente") ? "CONCLUIR (AUTOMÁTICO)" : "ENVIAR PARA APROVAÇÃO";
      document.getElementById("modal-delivery")?.classList.remove("hidden");
      return;
    }

    if (newStatus && newStatus !== oldStatus) {
      await updateDoc(doc(db, "tasks", id), { status: newStatus });
      await logHistory(id, `Movido de ${statusLabel(oldStatus)} para ${statusLabel(newStatus)}`);
    }
  });
});

/* =========================
   MODAL ENTREGA
========================= */
document.getElementById("btn-confirm-delivery")?.addEventListener("click", async () => {
  const evidenceText = document.getElementById("delivery-evidence")?.value || "";
  const evidenceLink = document.getElementById("delivery-link")?.value || "";

  if (evidenceText.trim().length < 3) {
    alert("Por favor, descreva o que foi feito.");
    return;
  }

  if (!deliveryTaskId) return;

  const task = allTasks.find(t => t.id === deliveryTaskId);
  const isTop = (myRoleKey === "superintendente");

  const payload = {
    status: "done",
    evidence: evidenceText.trim(),
    evidenceLink: evidenceLink.trim() || null,
    deliveredAt: new Date().toISOString(),

    validated: isTop ? true : false,
    validatedBy: isTop ? `${myName || "Superintendente"} (${myRoleLabel})` : null,
    validatedAt: isTop ? new Date().toISOString() : null
  };

  await updateDoc(doc(db, "tasks", deliveryTaskId), payload);

  if (isTop) {
    await logHistory(deliveryTaskId, `Entregue e concluída (auto) | Resp: ${assigneeText(task || {})}`);
  } else {
    await logHistory(deliveryTaskId, `Entregue | Aguardando validação | Resp: ${assigneeText(task || {})}`);
  }

  document.getElementById("modal-delivery")?.classList.add("hidden");

  const te = document.getElementById("delivery-evidence");
  if (te) te.value = "";

  const tl = document.getElementById("delivery-link");
  if (tl) tl.value = "";

  deliveryTaskId = null;
  showToast(isTop ? "Concluída!" : "Entrega enviada!");
});

document.getElementById("btn-close-delivery")?.addEventListener("click", () => {
  document.getElementById("modal-delivery")?.classList.add("hidden");
  deliveryTaskId = null;
});

/* =========================
   ARCHIVE DROP ZONE
========================= */
const archiveZone = document.getElementById("archive-drop-zone");
if (archiveZone) {
  archiveZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    archiveZone.classList.add("drag-over");
  });

  archiveZone.addEventListener("dragleave", () => {
    archiveZone.classList.remove("drag-over");
  });

  archiveZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    archiveZone.classList.remove("drag-over");
    if (!draggedItem) return;

    const id = draggedItem.dataset.id;
    if (!confirm("Arquivar?")) return;

    draggedItem.remove();
    await updateDoc(doc(db, "tasks", id), { status: "archived" });
    await logHistory(id, "Arquivado por drop-zone");
    showToast("Arquivado!");
  });
}

/* =========================
   THEME
========================= */
const themeBtn = document.getElementById("btn-theme-toggle");
if (localStorage.getItem("nep_theme") === "light") {
  document.body.setAttribute("data-theme", "light");
  if (themeBtn) themeBtn.innerHTML = `<i class="fa-solid fa-moon"></i>`;
}

themeBtn?.addEventListener("click", () => {
  const isLight = document.body.getAttribute("data-theme") === "light";
  document.body.setAttribute("data-theme", isLight ? "dark" : "light");
  if (themeBtn) themeBtn.innerHTML = isLight ? `<i class="fa-solid fa-sun"></i>` : `<i class="fa-solid fa-moon"></i>`;
  localStorage.setItem("nep_theme", isLight ? "dark" : "light");

  if (document.getElementById("view-dashboard")?.classList.contains("active")) {
    updateCharts();
  }
});

/* =========================
   VIEW TOGGLES
========================= */
document.getElementById("btn-view-kanban")?.addEventListener("click", () => toggleView("kanban"));
document.getElementById("btn-view-dash")?.addEventListener("click", () => toggleView("dashboard"));
document.getElementById("btn-view-check")?.addEventListener("click", () => toggleView("checklist"));

function toggleView(viewName) {
  document.querySelectorAll(".view-section").forEach(el => {
    el.classList.remove("active");
    el.classList.add("hidden");
  });

  document.querySelectorAll(".nav-btn").forEach(el => {
    el.classList.remove("active");
  });

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.remove("hidden");
    targetView.classList.add("active");
  }

  const btnMap = {
    kanban: "btn-view-kanban",
    dashboard: "btn-view-dash",
    checklist: "btn-view-check"
  };

  const targetBtn = document.getElementById(btnMap[viewName]);
  if (targetBtn) {
    targetBtn.classList.add("active");
  }

  setTimeout(() => {
    if (viewName === "dashboard") updateCharts();
    if (viewName === "checklist") renderChecklist();
  }, 50);
}

/* =========================
   FILTROS
========================= */
["filter-segment", "filter-requester", "filter-owner", "filter-unit"].forEach(id => {
  const element = document.getElementById(id);
  if (element) {
    element.addEventListener("change", () => {
      renderBoard();
      
      if (document.getElementById("view-dashboard")?.classList.contains("active")) {
        updateCharts();
      }
    });
  }
});

document.getElementById("btn-toggle-archive")?.addEventListener("click", () => {
  showArchived = !showArchived;

  const t = document.getElementById("txt-archive");
  if (t) t.textContent = showArchived ? "Voltar" : "Ver Arquivados";

  renderBoard();
  
  if (document.getElementById("view-dashboard")?.classList.contains("active")) {
    updateCharts();
  }
});

/* =========================
   🔥 MODAL CREATE / EDIT (HIERARQUIA CORRIGIDA)
========================= */
const modal = document.getElementById("modal-overlay");
const form = document.getElementById("task-form");

let isEditing = false;
let editId = null;

function setupOwnerRoleOptions() {
  const sel = document.getElementById("task-owner-role");
  if (!sel) return;

  sel.innerHTML = `<option value="" selected>Selecione...</option>`;

  const rolesOrdered = [
    { key: "superintendente", label: "Superintendente" },
    { key: "gerente", label: "Gerente" },
    { key: "consultor", label: "Consultor" },
    { key: "coordenador", label: "Coordenador" },
    { key: "analista", label: "Analista" },
    { key: "monitor", label: "Monitor" }
  ];

  rolesOrdered.forEach(r => {
    if (canDelegateTo(r.key)) {
      const opt = document.createElement("option");
      opt.value = r.label;
      opt.textContent = r.label;
      sel.appendChild(opt);
    }
  });
}

function enforceMonitorAssigneeLock() {
  const ownerRoleSel = document.getElementById("task-owner-role");
  const ownerInput = document.getElementById("task-owner");

  if (myRoleKey === "monitor") {
    if (ownerRoleSel) {
      ownerRoleSel.value = "Monitor";
      ownerRoleSel.disabled = true;
    }
    if (ownerInput) {
      ownerInput.value = myName || "Monitor";
      ownerInput.disabled = true;
    }
  } else {
    if (ownerRoleSel) ownerRoleSel.disabled = false;
    if (ownerInput) ownerInput.disabled = false;
  }
}

document.querySelectorAll(".p-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".p-btn").forEach(b => b.classList.remove("selected"));
    this.classList.add("selected");
    selectedPriority = this.dataset.val;
  });
});

document.querySelectorAll(".c-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".c-btn").forEach(b => b.classList.remove("selected"));
    this.classList.add("selected");
    selectedComplexity = this.dataset.val;
  });
});

document.getElementById("btn-new-task")?.addEventListener("click", () => {
  isEditing = false;
  editId = null;

  setupOwnerRoleOptions();

  form?.reset();
  modal?.classList.remove("hidden");

  document.querySelectorAll(".p-btn").forEach(b => b.classList.remove("selected"));
  document.querySelector(`.p-btn[data-val="Baixo"]`)?.classList.add("selected");
  selectedPriority = "Baixo";

  document.querySelectorAll(".c-btn").forEach(b => b.classList.remove("selected"));
  document.querySelector(`.c-btn[data-val="Baixa"]`)?.classList.add("selected");
  selectedComplexity = "Baixa";

  const log = document.getElementById("audit-log");
  if (log) log.innerHTML = "<p>Novo registro</p>";

  enforceMonitorAssigneeLock();
});

document.getElementById("btn-close-modal")?.addEventListener("click", () => modal?.classList.add("hidden"));

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab)?.classList.add("active");
  });
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const ownerRoleSel = document.getElementById("task-owner-role");
  const ownerRoleVal = ownerRoleSel ? ownerRoleSel.value : "";

  let ownerNameVal = document.getElementById("task-owner")?.value || "";
  if (myRoleKey === "monitor") ownerNameVal = myName || "Monitor";

  const baseData = {
    title: document.getElementById("task-title")?.value || "",
    requester: document.getElementById("task-requester")?.value || "",
    unit: document.getElementById("task-unit")?.value || "",
    segment: document.getElementById("task-segment")?.value || "",
    ownerRole: ownerRoleVal,
    owner: ownerNameVal,
    description: document.getElementById("task-desc")?.value || "",
    deadline: document.getElementById("task-deadline")?.value || "",
    priority: selectedPriority,
    complexity: selectedComplexity,
    acknowledged: false
  };

  const scoreMap = { "Urgente": 4, "Alto": 3, "Médio": 2, "Baixo": 1 };
  const score = (scoreMap[selectedPriority] || 1) * (selectedComplexity === "Alta" ? 2 : 1);

  if (isEditing && editId) {
    await updateDoc(doc(db, "tasks", editId), { ...baseData, score });
    await logHistory(editId, "Editado");
  } else {
    const payload = {
      ...baseData,
      score,
      status: "backlog",
      createdAt: new Date().toISOString(),

      creatorRoleKey: myRoleKey,
      creatorRoleLabel: myRoleLabel,
      creatorName: myName || "",
      creatorLevel: myLevel,

      validated: false,
      evidence: null,
      evidenceLink: null,

      history: [{
        date: new Date().toISOString(),
        action: `Criado por ${myRoleLabel} - ${myName} | Resp: ${assigneeText({ owner: ownerNameVal, ownerRole: ownerRoleVal })}`
      }]
    };

    await addDoc(collection(db, "tasks"), payload);
  }

  modal?.classList.add("hidden");
  showToast("Salvo!");
});

async function logHistory(id, action) {
  await updateDoc(doc(db, "tasks", id), {
    history: arrayUnion({
      date: new Date().toISOString(),
      action: action
    })
  });
}

function openEdit(task) {
  isEditing = true;
  editId = task.id;

  setupOwnerRoleOptions();

  document.getElementById("task-title").value = task.title || "";
  document.getElementById("task-requester").value = task.requester || "";
  document.getElementById("task-unit").value = task.unit || "";
  document.getElementById("task-segment").value = task.segment || "";
  document.getElementById("task-owner-role").value = task.ownerRole || "";
  document.getElementById("task-owner").value = task.owner || "";
  document.getElementById("task-desc").value = task.description || "";
  document.getElementById("task-deadline").value = task.deadline || "";

  document.querySelectorAll(".p-btn").forEach(b => b.classList.remove("selected"));
  const btnP = document.querySelector(`.p-btn[data-val="${task.priority || 'Baixo'}"]`);
  if (btnP) {
    btnP.classList.add("selected");
    selectedPriority = task.priority;
  }

  document.querySelectorAll(".c-btn").forEach(b => b.classList.remove("selected"));
  const btnC = document.querySelector(`.c-btn[data-val="${task.complexity || 'Baixa'}"]`);
  if (btnC) {
    btnC.classList.add("selected");
    selectedComplexity = task.complexity;
  }

  const log = document.getElementById("audit-log");
  log.innerHTML = "";
  if (task.history) {
    [...task.history].reverse().forEach(h => {
      const d = new Date(h.date).toLocaleString("pt-BR");
      const item = document.createElement("div");
      item.className = "audit-item";
      item.innerHTML = `<span class="audit-time">${d}</span>${h.action}`;
      log.appendChild(item);
    });
  }

  enforceMonitorAssigneeLock();
  modal?.classList.remove("hidden");
}

function showToast(msg) {
  const c = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = "toast";
  t.innerText = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* =========================
   EXPORT CSV
========================= */
document.getElementById("btn-export-csv")?.addEventListener("click", () => {
  let csv = "ID,TITULO,SOLICITANTE,UNIDADE,SEGMENTO,RESPONSAVEL,STATUS,PRIORIDADE,COMPLEXIDADE\n";
  allTasks.forEach(t => {
    csv += `${t.id},${t.title},${t.requester},${t.unit},${t.segment},${t.owner},${t.status},${t.priority},${t.complexity}\n`;
  });
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
  a.download = "NEP_DATA.csv";
  a.click();
});

/* =========================
   SLA TIMER
========================= */
setInterval(() => {
  document.querySelectorAll(".card").forEach(card => {
    const id = card.dataset.id;
    const task = allTasks.find(t => t.id === id);
    if (!task || task.status === "done" || task.status === "archived" || !task.deadline) return;

    const slaDiv = document.getElementById(`sla-${id}`);
    if (!slaDiv) return;

    const deadline = new Date(task.deadline + "T23:59:59");
    const diff = deadline - new Date();

    if (diff < 0) {
      slaDiv.className = "sla-timer sla-danger";
      slaDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> EXPIRADO';
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(diff / (1000 * 60 * 60));

      if (days > 1) {
        slaDiv.className = "sla-timer sla-ok";
        slaDiv.innerHTML = `<i class="fa-regular fa-clock"></i> ${days} DIAS`;
      } else {
        slaDiv.className = hours < 4 ? "sla-timer sla-danger" : "sla-timer sla-warn";
        slaDiv.innerHTML = `<i class="fa-solid fa-stopwatch"></i> ${hours}h`;
      }
    }
  });
}, 1000);

/* =========================
   BI / DASHBOARD
========================= */
function updateCharts() {
  if (typeof Chart === "undefined") return;

  const isLight = document.body.getAttribute("data-theme") === "light";
  Chart.defaults.color = isLight ? "#555" : "#8FA6C6";
  Chart.defaults.borderColor = isLight ? "#ddd" : "#15325b";
  Chart.defaults.font.family = "Inter";

  const visible = getVisibleTasks();

  const reqData = {};
  const segData = {};
  const statusData = [0, 0, 0, 0];
  const leadLabels = [];
  const leadData = [];

  visible.forEach(t => {
    reqData[t.requester] = (reqData[t.requester] || 0) + 1;
    segData[t.unit] = (segData[t.unit] || 0) + 1;

    if (t.status === "backlog") statusData[0]++;
    if (t.status === "doing") statusData[1]++;
    if (t.status === "pending") statusData[2]++;
    if (t.status === "done") statusData[3]++;

    if (t.status === "done") {
      const created = new Date(t.createdAt || t.deadline);
      const diff = Math.ceil(Math.abs(new Date() - created) / (1000 * 60 * 60 * 24));
      leadLabels.push(t.title.substring(0, 10));
      leadData.push(diff);
    }
  });

  const optP = {
    color: isLight ? "#000" : "#fff",
    font: { weight: "bold" },
    formatter: (v, c) => {
      let s = 0;
      c.chart.data.datasets[0].data.map(d => (s += d));
      return s ? (v * 100 / s).toFixed(0) + "%" : "0%";
    }
  };

  const p12 = ["#2F6FED", "#F2B705", "#E5533D", "#2ECC71", "#9b59b6", "#34495e"];
  const pluginsArr = typeof ChartDataLabels !== "undefined" ? [ChartDataLabels] : [];

  if (charts.req) charts.req.destroy();
  const ctxReq = document.getElementById("chart-requester");
  if (ctxReq) {
    charts.req = new Chart(ctxReq, {
      type: "bar",
      data: {
        labels: Object.keys(reqData),
        datasets: [{ label: "Qtd", data: Object.values(reqData), backgroundColor: "#1C4ED8" }]
      },
      options: {
        plugins: { datalabels: optP },
        responsive: true,
        maintainAspectRatio: false
      },
      plugins: pluginsArr
    });
  }

  if (charts.stat) charts.stat.destroy();
  const ctxStat = document.getElementById("chart-status");
  if (ctxStat) {
    charts.stat = new Chart(ctxStat, {
      type: "doughnut",
      data: {
        labels: ["Backlog", "Execução", "Block", "Entregue"],
        datasets: [{ data: statusData, backgroundColor: ["#2F6FED", "#F2B705", "#E5533D", "#2ECC71"] }]
      },
      options: {
        plugins: { datalabels: optP },
        responsive: true,
        maintainAspectRatio: false
      },
      plugins: pluginsArr
    });
  }

  if (charts.seg) charts.seg.destroy();
  const ctxSeg = document.getElementById("chart-segment");
  if (ctxSeg) {
    charts.seg = new Chart(ctxSeg, {
      type: "bar",
      data: {
        labels: Object.keys(segData),
        datasets: [{ label: "Qtd", data: Object.values(segData), backgroundColor: p12 }]
      },
      options: {
        indexAxis: "y",
        plugins: { datalabels: optP },
        responsive: true,
        maintainAspectRatio: false
      },
      plugins: pluginsArr
    });
  }

  if (charts.lead) charts.lead.destroy();
  const ctxLead = document.getElementById("chart-leadtime");
  if (ctxLead) {
    charts.lead = new Chart(ctxLead, {
      type: "line",
      data: {
        labels: leadLabels,
        datasets: [{ label: "Dias", data: leadData, borderColor: "#2ECC71", tension: 0.4 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { datalabels: { display: false } }
      }
    });
  }
}

/* =========================
   🔥 ROTINA ADM - RENDER
========================= */
function renderChecklist() {
  const container = document.getElementById("checklist-items");
  if (!container) return;

  const today = todayKey();
  const dateEl = document.getElementById("checklist-date");
  if (dateEl) dateEl.textContent = `Data: ${toBRDate(today)}`;

  const routine = loadRoutine();
  container.innerHTML = "";

  let totalItems = routine.length;
  let completedItems = 0;

  routine.forEach(item => {
    const key = routineDoneKey(today, item.id);
    const done = localStorage.getItem(key) === "1";
    if (done) completedItems++;

    const row = document.createElement("div");
    row.className = "checklist-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "checklist-checkbox";
    checkbox.checked = done;

    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        localStorage.setItem(key, "1");
      } else {
        localStorage.removeItem(key);
      }
      renderChecklist();
    });

    const label = document.createElement("label");
    label.className = "checklist-label";
    if (done) label.classList.add("done");
    label.textContent = item.text;
    label.style.cursor = "pointer";

    label.addEventListener("click", () => {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change"));
    });

    const delBtn = document.createElement("button");
    delBtn.className = "checklist-delete";
    delBtn.innerHTML = `<i class="fa-solid fa-trash"></i>`;
    delBtn.addEventListener("click", () => {
      if (!confirm("Excluir da rotina?")) return;
      const updated = loadRoutine().filter(r => r.id !== item.id);
      saveRoutine(updated);
      renderChecklist();
    });

    row.appendChild(checkbox);
    row.appendChild(label);
    row.appendChild(delBtn);
    container.appendChild(row);
  });

  const progressBar = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");

  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  if (progressBar) progressBar.style.width = pct + "%";
  if (progressText) progressText.textContent = pct + "%";
}

document.getElementById("btn-add-adm")?.addEventListener("click", () => {
  const input = document.getElementById("new-adm-task");
  const text = input?.value.trim();
  if (!text) return;

  const routine = loadRoutine();
  routine.push({ id: newLocalId(), text });
  saveRoutine(routine);

  if (input) input.value = "";
  renderChecklist();
});

document.getElementById("new-adm-task")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("btn-add-adm")?.click();
  }
});
