# 🏗️ NEP Platform - Guia de Engenharia e Boas Práticas

> **Princípio Central:** Arquitetura Modular - cada módulo é independente e isolado.

---

## 📐 Arquitetura do Sistema

```
EcossistemaNEP/
├── index.html          # Shell da aplicação (SPA)
├── login.html          # Tela de autenticação
├── css/
│   ├── design-system.css   # Tokens e variáveis globais
│   ├── components.css      # Componentes reutilizáveis
│   └── kanban.css          # Estilos específicos do Kanban
└── js/
    ├── app.js              # Roteador principal (NepApp)
    ├── store.js            # Estado global (NexusStore)
    ├── firebase-config.js  # Configuração Firebase
    │
    ├── [módulo].js         # Cada módulo é um arquivo separado
    └── ...
```

---

## 🔒 Regra de Ouro: Isolamento de Módulos

### ✅ FAZER
```javascript
// Cada módulo é um objeto independente
const NexusPodcast = {
  // Estado interno do módulo
  currentSeason: null,
  
  // Métodos do módulo
  render(container) { ... },
  init() { ... }
};

// Expor globalmente no final
window.NexusPodcast = NexusPodcast;
```

### ❌ NÃO FAZER
```javascript
// Não modificar variáveis de outros módulos diretamente
NepKanban.tasks = []; // ERRADO!

// Não criar dependências cruzadas fortes
const NexusPodcast = {
  render() {
    NepKanban.doSomething(); // EVITAR dependência direta
  }
};
```

---

## 📦 Estrutura de um Módulo

Todo módulo deve seguir este padrão:

```javascript
/**
 * NEXUS PLATFORM - [NOME DO MÓDULO]
 * [Descrição breve]
 */

const NexusModulo = {
  // ========================================
  // 1. ESTADO INTERNO
  // ========================================
  data: [],
  currentItem: null,
  isLoading: false,

  // ========================================
  // 2. INICIALIZAÇÃO
  // ========================================
  init() {
    this.loadData();
  },

  // ========================================
  // 3. RENDERIZAÇÃO
  // ========================================
  render(container) {
    container.innerHTML = this.getHTML();
    this.bindEvents();
  },

  getHTML() {
    return `<div class="modulo-container">...</div>`;
  },

  // ========================================
  // 4. EVENTOS
  // ========================================
  bindEvents() {
    // Bindear eventos do DOM
  },

  // ========================================
  // 5. LÓGICA DE NEGÓCIO
  // ========================================
  loadData() { ... },
  saveData() { ... },
  
  // ========================================
  // 6. HELPERS
  // ========================================
  formatDate(date) { ... }
};

// Estilos específicos do módulo (opcional)
const moduloStyles = document.createElement('style');
moduloStyles.textContent = `...`;
document.head.appendChild(moduloStyles);

// Expor globalmente
window.NexusModulo = NexusModulo;
```

---

## 🔗 Comunicação Entre Módulos

### Via Store Global (Recomendado)
```javascript
// Módulo A salva dados
NexusStore.saveTask(task);

// Módulo B lê dados
const tasks = NexusStore.getTasks();
```

### Via Eventos Customizados (Para notificações)
```javascript
// Módulo A dispara evento
window.dispatchEvent(new CustomEvent('task-completed', { 
  detail: { taskId: 123 } 
}));

// Módulo B escuta evento
window.addEventListener('task-completed', (e) => {
  console.log('Task completada:', e.detail.taskId);
});
```

### Via App Principal (Para navegação)
```javascript
// Navegar para outra página
NepApp.navigate('kanban');

// Mostrar notificação
NepApp.showToast('Sucesso!', 'success');
```

---

## 📝 Checklist para Novas Features

Antes de implementar uma nova funcionalidade:

- [ ] A feature pertence a qual módulo?
- [ ] Preciso criar um novo módulo ou adicionar ao existente?
- [ ] A mudança afeta outros módulos? Se sim, usar Store ou Eventos
- [ ] Os estilos são específicos do módulo ou globais?
- [ ] Testei a feature isoladamente?
- [ ] Testei se outros módulos continuam funcionando?

---

## 🎨 Convenções de CSS

### Prefixos por Módulo
```css
/* Kanban */
.kanban-card { }
.kanban-column { }

/* Podcast */
.podcast-player { }
.podcast-episode { }

/* Forum */
.forum-topic { }
.forum-reply { }
```

### Usar Variáveis do Design System
```css
/* ✅ CORRETO */
.meu-componente {
  background: var(--surface-card);
  color: var(--text-primary);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
}

/* ❌ ERRADO */
.meu-componente {
  background: #1e293b;
  color: #f8fafc;
  padding: 16px;
  border-radius: 12px;
}
```

---

## 🗄️ Convenções do Store

### Padrão para Dados
```javascript
// Buscar dados
NexusStore.getTasks()
NexusStore.getUsers()
NexusStore.getForumTopics()

// Salvar dados
NexusStore.saveTask(task)
NexusStore.updateUser(userId, data)

// Deletar dados
NexusStore.deleteTask(taskId)
```

### Firebase - Padrão de Coleções
```javascript
// Coleções no Firestore
'tasks'         // Tarefas do Kanban
'users'         // Usuários
'forum_topics'  // Tópicos do fórum
'forum_replies' // Respostas do fórum
'audit_logs'    // Logs de auditoria
```

---

## 🧪 Testando Alterações

### 1. Teste o módulo alterado
```
1. Abrir o sistema
2. Navegar até o módulo alterado
3. Testar todas as funcionalidades do módulo
```

### 2. Teste os módulos adjacentes
```
1. Navegar para módulos que podem ser afetados
2. Verificar se continuam funcionando
3. Especialmente: Dashboard (usa dados de vários módulos)
```

### 3. Teste o fluxo completo
```
1. Login → Dashboard → Módulo → Ação → Verificar resultado
```

---

## 📋 Módulos Existentes

| Módulo | Arquivo | Objeto Global |
|--------|---------|---------------|
| App/Router | `app.js` | `NepApp` |
| Store | `store.js` | `NexusStore` |
| Kanban | `kanban.js` | `NepKanban` |
| Dashboard | `dashboard.js` | `NexusDashboard` |
| Forum | `forum.js` | `NexusForum` |
| Podcast | `podcast.js` | `NexusPodcast` |
| Courses | `courses.js` | `NexusCourses` |
| Calendar | `calendar.js` | `NexusCalendar` |
| Tools | `tools.js` | `NexusTools` |
| Admin | `admin.js` | `NexusAdmin` |
| Profile | `profile.js` | `NexusProfile` |
| Reports | `reports.js` | `NexusReports` |
| Scoring | `scoring.js` | `NexusScoring` |
| Announcements | `announcements.js` | `NexusAnnouncements` |

---

## ⚡ Comandos Úteis

### Iniciar localmente
```bash
cd c:\Users\Fernando\.gemini\antigravity\scratch\EcossistemaNEP
python -m http.server 8000
# Acesse: http://localhost:8000/login.html
```

### Deploy para produção
```bash
firebase deploy
# Site atualiza em: https://ecossistemanep.com.br
```

---

## 🚨 Regras Importantes

1. **Nunca modifique `app.js` sem necessidade** - é o core do sistema
2. **Nunca modifique `store.js` diretamente** - use os métodos expostos
3. **Sempre teste após alterações** - mesmo pequenas mudanças
4. **Commits descritivos** - descreva o que e por quê
5. **Um módulo = Uma responsabilidade** - não misture funcionalidades
