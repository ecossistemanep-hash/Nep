/**
 * NEP PLATFORM - GRAFO DO NEP v2.0
 * Visualização interativa premium do ecossistema
 * Physics: Barnes-Hut inspired repulsion + spring edges + orbital gravity
 * Visual: Particle field, animated edges, glow, premium labels
 */

const NepGrafo = {

    // ============ DATA ============
    getNodes() {
        //  ring: 0=core center, 1=main modules, 2=support/systems, 3=tools, 4=sub-tools/apis
        return [
            // CORE
            { id: 'nep', label: 'NEP Ecosystem', category: 'core', icon: '🌐', size: 50, desc: 'Plataforma central de gestão, produtividade e IA', ring: 0 },

            // MAIN MODULES (ring 1)
            { id: 'dashboard', label: 'Dashboard', category: 'modulo', icon: '📊', size: 32, desc: 'Painel executivo com KPIs, gráficos e alertas', ring: 1 },
            { id: 'kanban', label: 'Kanban', category: 'modulo', icon: '📋', size: 34, desc: 'Gestão de tarefas: Backlog → Execução → Revisão → Concluído', ring: 1 },
            { id: 'ranking', label: 'Ranking', category: 'modulo', icon: '🏆', size: 28, desc: 'Pontuação, níveis e conquistas dos colaboradores', ring: 1 },
            { id: 'forum', label: 'Fórum', category: 'modulo', icon: '💬', size: 26, desc: 'Comunidade: dúvidas, sugestões, conhecimento', ring: 1 },
            { id: 'calendar', label: 'Agendas', category: 'modulo', icon: '📅', size: 28, desc: 'Reuniões executivas com atas geradas por IA', ring: 1 },
            { id: 'estagiario', label: 'Neurônio', category: 'ia', icon: '🤖', size: 32, desc: 'Assistente IA: análise de dados, PPT, chat inteligente', ring: 1 },
            { id: 'admin', label: 'Admin', category: 'admin', icon: '🛡️', size: 30, desc: 'Painel administrativo: usuários, permissões, backlog', ring: 1 },
            { id: 'tools', label: 'Ferramentas', category: 'ferramentas', icon: '🧰', size: 32, desc: 'Hub com 22+ ferramentas de qualidade e produtividade', ring: 1 },

            // SUPPORT MODULES (ring 2)
            { id: 'checklist', label: 'Rotina ADM', category: 'modulo', icon: '✅', size: 24, desc: 'Checklist diário de tarefas rotineiras', ring: 2 },
            { id: 'reports', label: 'Relatórios', category: 'modulo', icon: '📄', size: 24, desc: 'Criação de relatórios diários, semanais e mensais', ring: 2 },
            { id: 'results', label: 'Resultados', category: 'modulo', icon: '📈', size: 24, desc: 'Dashboards PowerBI integrados', ring: 2 },
            { id: 'announcements', label: 'Avisos', category: 'modulo', icon: '📢', size: 22, desc: 'Comunicados oficiais para equipe', ring: 2 },
            { id: 'testimonials', label: 'Depoimentos', category: 'modulo', icon: '⭐', size: 24, desc: 'Feedbacks internos e externos com pontuação', ring: 2 },
            { id: 'vacation', label: 'Férias', category: 'modulo', icon: '🏖️', size: 22, desc: 'Controle de férias e programações', ring: 2 },
            { id: 'okr', label: 'OKR/Entregas', category: 'modulo', icon: '🎯', size: 26, desc: 'Gestão de entregas individuais e PDI', ring: 2 },
            { id: 'tickets', label: 'Chamados', category: 'modulo', icon: '🎫', size: 24, desc: 'Sistema de chamados e suporte interno', ring: 2 },
            { id: 'profile', label: 'Meu Perfil', category: 'modulo', icon: '👤', size: 22, desc: 'Informações pessoais, nível e conquistas', ring: 2 },
            { id: 'courses', label: 'Cursos', category: 'modulo', icon: '🎓', size: 24, desc: 'Treinamentos com provas e gamificação', ring: 2 },
            { id: 'podcast', label: 'Podcast', category: 'modulo', icon: '🎧', size: 22, desc: 'Conteúdo educacional em áudio/vídeo', ring: 2 },

            // INFRASTRUCTURE (ring 2)
            { id: 'firebase', label: 'Firebase', category: 'infra', icon: '🔥', size: 28, desc: 'Auth, Firestore, Hosting, Storage', ring: 2 },
            { id: 'supabase', label: 'Supabase', category: 'infra', icon: '⚡', size: 24, desc: 'PostgreSQL, Sync, Tickets, Vector Search', ring: 2 },
            { id: 'gemini', label: 'Gemini AI', category: 'ia', icon: '🧠', size: 28, desc: 'Google Gemini 2.5 Flash — Motor de IA', ring: 2 },
            { id: 'auth', label: 'Autenticação', category: 'infra', icon: '🔑', size: 22, desc: 'Login, sessão, JWT via Firebase Auth', ring: 2 },

            // SYSTEMS (ring 2-3)
            { id: 'points', label: 'Gamificação', category: 'sistema', icon: '🎮', size: 24, desc: 'Sistema de pontos, níveis e XP', ring: 2 },
            { id: 'achievements', label: 'Conquistas', category: 'sistema', icon: '🏅', size: 22, desc: 'Badges e medalhas desbloqueáveis', ring: 2 },
            { id: 'notifications', label: 'Notificações', category: 'sistema', icon: '🔔', size: 22, desc: 'Sistema de alertas em tempo real', ring: 2 },
            { id: 'analytics', label: 'Analytics', category: 'sistema', icon: '📡', size: 22, desc: 'Rastreamento de acessos e uso', ring: 2 },
            { id: 'permissions', label: 'Permissões', category: 'sistema', icon: '🔐', size: 22, desc: 'Controle de acesso por cargo', ring: 2 },
            { id: 'nep_help', label: 'NEP Help', category: 'ia', icon: '💡', size: 20, desc: 'Chat flutuante de ajuda com IA', ring: 3 },
            { id: 'ppt_engine', label: 'PPT Engine', category: 'ia', icon: '📽️', size: 22, desc: 'Gerador de apresentações profissionais', ring: 3 },
            { id: 'status_page', label: 'Status Page', category: 'sistema', icon: '📡', size: 18, desc: 'Página pública de atualizações', ring: 3 },
            { id: 'feedback_req', label: 'Backlog Feedback', category: 'sistema', icon: '📥', size: 18, desc: 'Requisições de bugs e melhorias', ring: 3 },

            // TOOLS (ring 3-4)
            { id: 'tool_pdca', label: 'PDCA', category: 'ferramentas', icon: '🔄', size: 18, desc: 'Ciclo Plan-Do-Check-Act', ring: 4 },
            { id: 'tool_dmaic', label: 'DMAIC', category: 'ferramentas', icon: '📐', size: 18, desc: 'Six Sigma: Define-Measure-Analyze-Improve-Control', ring: 4 },
            { id: 'tool_pareto', label: 'Pareto', category: 'ferramentas', icon: '📊', size: 18, desc: 'Diagrama 80/20 para priorização', ring: 4 },
            { id: 'tool_ishikawa', label: 'Ishikawa', category: 'ferramentas', icon: '🐟', size: 18, desc: 'Espinha de peixe — Causa raiz 6M', ring: 4 },
            { id: 'tool_gut', label: 'Matriz GUT', category: 'ferramentas', icon: '📋', size: 18, desc: 'Gravidade × Urgência × Tendência', ring: 4 },
            { id: 'tool_5pq', label: '5 Porquês', category: 'ferramentas', icon: '❓', size: 18, desc: 'Análise de causa raiz iterativa', ring: 4 },
            { id: 'tool_corr', label: 'Correlação', category: 'ferramentas', icon: '📈', size: 18, desc: 'Análise estatística de correlação', ring: 4 },
            { id: 'tool_fact', label: 'Factibilidade', category: 'ferramentas', icon: '🧮', size: 18, desc: 'Calculadora de viabilidade', ring: 4 },
            { id: 'tool_carta', label: 'Carta Controle', category: 'ferramentas', icon: '📉', size: 18, desc: 'Controle estatístico (CEP)', ring: 4 },
            { id: 'tool_fluxo', label: 'Fluxograma', category: 'ferramentas', icon: '🔀', size: 18, desc: 'Editor visual de fluxogramas', ring: 4 },
            { id: 'tool_graficos', label: 'Gráficos', category: 'ferramentas', icon: '🎨', size: 18, desc: 'Gerador de gráficos customizados', ring: 4 },
            { id: 'tool_prompt', label: 'Prompt Creator', category: 'ia', icon: '✨', size: 20, desc: 'Gerador de prompts para IA', ring: 4 },
            { id: 'tool_html', label: 'HTML Creator', category: 'ia', icon: '💻', size: 20, desc: 'Criador de ferramentas web via IA', ring: 4 },
            { id: 'tool_senha', label: 'Gerador Senha', category: 'ferramentas', icon: '🔑', size: 16, desc: 'Senhas seguras personalizadas', ring: 4 },
            { id: 'tool_crono', label: 'Pomodoro', category: 'ferramentas', icon: '⏱️', size: 16, desc: 'Timer de produtividade', ring: 4 },
            { id: 'tool_compress', label: 'Compressor', category: 'ferramentas', icon: '🗜️', size: 16, desc: 'Compressor de vídeo', ring: 4 },
            { id: 'tool_estat', label: 'Estatística', category: 'ferramentas', icon: '📐', size: 18, desc: 'Análise estatística avançada', ring: 4 },

            // APIs (ring 4)
            { id: 'api_clima', label: 'NEP Clima', category: 'api', icon: '🌦️', size: 18, desc: 'Previsão meteorológica em tempo real', ring: 4 },
            { id: 'api_news', label: 'NEP News', category: 'api', icon: '📰', size: 18, desc: 'Notícias do Brasil e do mundo', ring: 4 },
            { id: 'api_dict', label: 'Dicionário', category: 'api', icon: '📖', size: 16, desc: 'Consulta lexicográfica', ring: 4 },
            { id: 'api_brasil', label: 'Brasil Data', category: 'api', icon: '🇧🇷', size: 18, desc: 'CEP, CNPJ, FIPE, Feriados', ring: 4 },
        ];
    },

    getEdges() {
        return [
            // Core hub
            { from: 'nep', to: 'dashboard' }, { from: 'nep', to: 'kanban' },
            { from: 'nep', to: 'tools' }, { from: 'nep', to: 'firebase' },
            { from: 'nep', to: 'admin' }, { from: 'nep', to: 'estagiario' },
            { from: 'nep', to: 'ranking' },

            // Dashboard
            { from: 'dashboard', to: 'kanban' }, { from: 'dashboard', to: 'ranking' },
            { from: 'dashboard', to: 'analytics' },

            // Kanban ecosystem
            { from: 'kanban', to: 'points' }, { from: 'kanban', to: 'notifications' },
            { from: 'kanban', to: 'achievements' }, { from: 'kanban', to: 'firebase' },

            // Gamification
            { from: 'ranking', to: 'points' }, { from: 'ranking', to: 'achievements' },
            { from: 'points', to: 'achievements' }, { from: 'points', to: 'profile' },

            // IA Ecosystem
            { from: 'estagiario', to: 'gemini' }, { from: 'estagiario', to: 'ppt_engine' },
            { from: 'estagiario', to: 'kanban' }, { from: 'estagiario', to: 'calendar' },
            { from: 'nep_help', to: 'gemini' }, { from: 'tool_prompt', to: 'gemini' },
            { from: 'tool_html', to: 'gemini' }, { from: 'calendar', to: 'gemini' },
            { from: 'ppt_engine', to: 'gemini' },

            // Tools hub
            { from: 'tools', to: 'tool_pdca' }, { from: 'tools', to: 'tool_dmaic' },
            { from: 'tools', to: 'tool_pareto' }, { from: 'tools', to: 'tool_ishikawa' },
            { from: 'tools', to: 'tool_gut' }, { from: 'tools', to: 'tool_5pq' },
            { from: 'tools', to: 'tool_corr' }, { from: 'tools', to: 'tool_fact' },
            { from: 'tools', to: 'tool_carta' }, { from: 'tools', to: 'tool_fluxo' },
            { from: 'tools', to: 'tool_graficos' }, { from: 'tools', to: 'tool_prompt' },
            { from: 'tools', to: 'tool_html' }, { from: 'tools', to: 'tool_senha' },
            { from: 'tools', to: 'tool_crono' }, { from: 'tools', to: 'tool_compress' },
            { from: 'tools', to: 'tool_estat' },
            { from: 'tools', to: 'api_clima' }, { from: 'tools', to: 'api_news' },
            { from: 'tools', to: 'api_dict' }, { from: 'tools', to: 'api_brasil' },

            // Firebase backbone
            { from: 'firebase', to: 'auth' },
            { from: 'firebase', to: 'forum' }, { from: 'firebase', to: 'announcements' },
            { from: 'firebase', to: 'testimonials' }, { from: 'firebase', to: 'vacation' },
            { from: 'firebase', to: 'okr' }, { from: 'firebase', to: 'calendar' },
            { from: 'firebase', to: 'reports' }, { from: 'firebase', to: 'courses' },
            { from: 'firebase', to: 'checklist' }, { from: 'firebase', to: 'status_page' },
            { from: 'firebase', to: 'feedback_req' },

            // Supabase
            { from: 'supabase', to: 'tickets' }, { from: 'supabase', to: 'kanban' },
            { from: 'supabase', to: 'analytics' }, { from: 'supabase', to: 'permissions' },

            // Admin
            { from: 'admin', to: 'permissions' }, { from: 'admin', to: 'points' },
            { from: 'admin', to: 'status_page' }, { from: 'admin', to: 'feedback_req' },

            // Cross-module points
            { from: 'auth', to: 'permissions' },
            { from: 'testimonials', to: 'points' }, { from: 'courses', to: 'points' },
            { from: 'okr', to: 'points' }, { from: 'forum', to: 'points' },
            { from: 'tool_crono', to: 'points' },
            { from: 'podcast', to: 'courses' }, { from: 'profile', to: 'achievements' },
            { from: 'notifications', to: 'firebase' }, { from: 'analytics', to: 'firebase' },
        ];
    },

    // ============ STYLES ============
    catStyle: {
        core: { color: '#00E0FF', bg: 'rgba(0,224,255,0.12)' },
        modulo: { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
        ferramentas: { color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
        ia: { color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
        infra: { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)' },
        sistema: { color: '#818cf8', bg: 'rgba(129,140,248,0.10)' },
        api: { color: '#f472b6', bg: 'rgba(244,114,182,0.10)' },
        admin: { color: '#f87171', bg: 'rgba(248,113,113,0.10)' },
    },
    catLabel: {
        core: 'Core', modulo: 'Módulos', ferramentas: 'Ferramentas',
        ia: 'Inteligência Artificial', infra: 'Infraestrutura',
        sistema: 'Sistemas', api: 'APIs Externas', admin: 'Admin'
    },

    // ============ STATE ============
    canvas: null, ctx: null,
    nodes: [], edges: [],
    W: 0, H: 0,
    scale: 1, offX: 0, offY: 0,
    drag: null, pan: false, panO: { x: 0, y: 0 },
    hover: null, selected: null,
    raf: null,
    activeCat: null, search: '',
    particles: [],
    tick: 0,
    alpha: 1.0,

    // ============ RENDER HTML ============
    render() {
        const nd = this.getNodes(), ed = this.getEdges();
        return `
      <div class="tool-container" style="padding:0;position:relative;overflow:hidden;background:#060b18;">
        <div class="gf-bar">
          <div class="gf-bar-l">
            <div class="gf-logo">🕸️</div>
            <div><h2>Grafo do NEP</h2><p>${nd.length} nós · ${ed.length} conexões</p></div>
          </div>
          <div class="gf-bar-r">
            <div class="gf-srch"><i class="fa-solid fa-search"></i><input id="gf-search" placeholder="Buscar..." autocomplete="off"></div>
            <div class="gf-zoom">
              <button id="gf-zi" title="+"><i class="fa-solid fa-plus"></i></button>
              <button id="gf-zr" title="Reset"><i class="fa-solid fa-compress"></i></button>
              <button id="gf-zo" title="-"><i class="fa-solid fa-minus"></i></button>
            </div>
          </div>
        </div>
        <div class="gf-filters">
          <button class="gf-fbtn active" data-c="all">Todos</button>
          ${Object.entries(this.catLabel).map(([k, v]) =>
            `<button class="gf-fbtn" data-c="${k}" style="--cc:${this.catStyle[k].color}"><span class="gf-dot" style="background:${this.catStyle[k].color}"></span>${v}</button>`
        ).join('')}
        </div>
        <canvas id="gf-canvas"></canvas>
        <div class="gf-tip" id="gf-tip"></div>
        <div class="gf-info" id="gf-info"></div>
        <div class="gf-legend">
          ${Object.entries(this.catLabel).map(([k, v]) =>
            `<span class="gf-leg"><span class="gf-dot" style="background:${this.catStyle[k].color}"></span>${v}</span>`
        ).join('')}
        </div>
      </div>`;
    },

    // ============ INIT ============
    init() {
        this.canvas = document.getElementById('gf-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.activeCat = null; this.search = '';
        this.selected = null; this.hover = null;
        this.tick = 0; this.alpha = 1.0;
        this.scale = 1; this.offX = 0; this.offY = 0;
        this._resize();
        this._initNodes();
        this._initEdges();
        this._initParticles();
        this._bind();
        this._injectCSS();
        this._loop();
    },

    _resize() {
        const p = this.canvas.parentElement;
        this.W = p.clientWidth;
        this.H = Math.max(window.innerHeight - 200, 550);
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.W * dpr;
        this.canvas.height = this.H * dpr;
        this.canvas.style.width = this.W + 'px';
        this.canvas.style.height = this.H + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    _initNodes() {
        const raw = this.getNodes();
        const cx = this.W / 2, cy = this.H / 2;
        const ringRadii = [0, 160, 300, 400, 500];
        // Group by ring
        const byRing = {};
        raw.forEach(n => { (byRing[n.ring] = byRing[n.ring] || []).push(n); });

        this.nodes = raw.map(n => {
            const ring = byRing[n.ring] || [];
            const idx = ring.indexOf(n);
            const count = ring.length;
            const baseAngle = (idx / count) * Math.PI * 2 + (n.ring * 0.3); // offset per ring
            const r = ringRadii[n.ring] || 500;
            const jitter = (Math.random() - 0.5) * 40;
            return {
                ...n,
                x: cx + Math.cos(baseAngle) * (r + jitter),
                y: cy + Math.sin(baseAngle) * (r + jitter),
                vx: 0, vy: 0,
                targetR: r,
                visible: true, highlighted: false,
                pulse: Math.random() * Math.PI * 2,
            };
        });
    },

    _initEdges() {
        this.edges = this.getEdges().map(e => ({
            ...e,
            src: this.nodes.find(n => n.id === e.from),
            tgt: this.nodes.find(n => n.id === e.to),
            flow: Math.random(), // animated flow position
        })).filter(e => e.src && e.tgt);
    },

    _initParticles() {
        this.particles = Array.from({ length: 80 }, () => ({
            x: Math.random() * this.W,
            y: Math.random() * this.H,
            size: Math.random() * 1.5 + 0.3,
            speed: Math.random() * 0.3 + 0.05,
            alpha: Math.random() * 0.4 + 0.1,
        }));
    },

    // ============ PHYSICS ============
    _physics() {
        if (this.alpha < 0.001) return;
        const cx = this.W / 2, cy = this.H / 2;
        const nodes = this.nodes;
        const dt = this.alpha;

        // 1. Strong repulsion between ALL visible nodes
        for (let i = 0; i < nodes.length; i++) {
            if (!nodes[i].visible) continue;
            for (let j = i + 1; j < nodes.length; j++) {
                if (!nodes[j].visible) continue;
                const a = nodes[i], b = nodes[j];
                let dx = b.x - a.x, dy = b.y - a.y;
                let d2 = dx * dx + dy * dy;
                const minDist = (a.size + b.size) * 3;
                if (d2 < 1) d2 = 1;
                const d = Math.sqrt(d2);
                // Coulomb-like: F = k / d^2, capped
                const force = Math.min(800 * dt / d2, 4 * dt);
                const fx = (dx / d) * force;
                const fy = (dy / d) * force;
                if (a.id !== 'nep') { a.vx -= fx; a.vy -= fy; }
                if (b.id !== 'nep') { b.vx += fx; b.vy += fy; }
            }
        }

        // 2. Spring attraction along edges
        this.edges.forEach(e => {
            if (!e.src.visible || !e.tgt.visible) return;
            const a = e.src, b = e.tgt;
            let dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const ideal = (a.size + b.size) * 4 + 30;
            const force = (d - ideal) * 0.005 * dt;
            const fx = (dx / d) * force;
            const fy = (dy / d) * force;
            if (a.id !== 'nep') { a.vx += fx; a.vy += fy; }
            if (b.id !== 'nep') { b.vx -= fx; b.vy -= fy; }
        });

        // 3. Orbital gravity: nodes gravitate toward their target ring radius
        nodes.forEach(n => {
            if (n.id === 'nep') { n.x = cx; n.y = cy; return; }
            const dx = n.x - cx, dy = n.y - cy;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const target = n.targetR;
            const pullStrength = 0.003 * dt;
            // Radial: push toward target ring
            const radialForce = (target - d) * pullStrength;
            n.vx += (dx / d) * radialForce;
            n.vy += (dy / d) * radialForce;
            // Light centering
            n.vx += (cx - n.x) * 0.0001 * dt;
            n.vy += (cy - n.y) * 0.0001 * dt;
        });

        // 4. Apply velocity with damping
        nodes.forEach(n => {
            if (n.id === 'nep') return;
            n.vx *= 0.82;
            n.vy *= 0.82;
            n.x += n.vx;
            n.y += n.vy;
            // Soft bounds
            const m = 30;
            if (n.x < m) n.vx += 0.5;
            if (n.x > this.W - m) n.vx -= 0.5;
            if (n.y < m) n.vy += 0.5;
            if (n.y > this.H - m) n.vy -= 0.5;
        });

        this.alpha *= 0.997;
    },

    // ============ DRAW ============
    _draw() {
        const c = this.ctx, W = this.W, H = this.H;
        this.tick++;
        c.save();

        // Background
        c.fillStyle = '#060b18';
        c.fillRect(0, 0, W, H);

        // Subtle radial gradient
        const bg = c.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.6);
        bg.addColorStop(0, 'rgba(0,224,255,0.02)');
        bg.addColorStop(0.5, 'rgba(99,102,241,0.015)');
        bg.addColorStop(1, 'transparent');
        c.fillStyle = bg;
        c.fillRect(0, 0, W, H);

        // Particles
        this.particles.forEach(p => {
            p.y -= p.speed;
            if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
            c.beginPath();
            c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            c.fillStyle = `rgba(100,140,255,${p.alpha * 0.5})`;
            c.fill();
        });

        // Transform
        c.translate(this.offX, this.offY);
        c.scale(this.scale, this.scale);

        const hasFocus = !!(this.selected || this.search);

        // Orbital rings (subtle)
        if (!hasFocus) {
            const cx = W / 2, cy = H / 2;
            [160, 300, 400, 500].forEach((r, i) => {
                c.beginPath();
                c.arc(cx, cy, r, 0, Math.PI * 2);
                c.strokeStyle = `rgba(255,255,255,${0.025 - i * 0.004})`;
                c.lineWidth = 1;
                c.setLineDash([4, 8]);
                c.stroke();
                c.setLineDash([]);
            });
        }

        // EDGES
        this.edges.forEach(e => {
            if (!e.src.visible || !e.tgt.visible) return;
            const active = e.src.highlighted || e.tgt.highlighted;
            const dim = hasFocus && !active;

            c.beginPath();
            c.moveTo(e.src.x, e.src.y);
            c.lineTo(e.tgt.x, e.tgt.y);

            if (active) {
                const g = c.createLinearGradient(e.src.x, e.src.y, e.tgt.x, e.tgt.y);
                const c1 = this.catStyle[e.src.category]?.color || '#3b82f6';
                const c2 = this.catStyle[e.tgt.category]?.color || '#3b82f6';
                g.addColorStop(0, c1 + '80');
                g.addColorStop(1, c2 + '80');
                c.strokeStyle = g;
                c.lineWidth = 2;
                c.globalAlpha = 1;
            } else {
                c.strokeStyle = 'rgba(255,255,255,0.06)';
                c.lineWidth = 0.8;
                c.globalAlpha = dim ? 0.15 : 1;
            }
            c.stroke();
            c.globalAlpha = 1;

            // Animated flow particle on active edges
            if (active) {
                e.flow = (e.flow + 0.008) % 1;
                const fx = e.src.x + (e.tgt.x - e.src.x) * e.flow;
                const fy = e.src.y + (e.tgt.y - e.src.y) * e.flow;
                c.beginPath();
                c.arc(fx, fy, 2.5, 0, Math.PI * 2);
                c.fillStyle = '#00E0FF';
                c.fill();
            }
        });

        // NODES
        this.nodes.forEach(n => {
            if (!n.visible) return;
            const st = this.catStyle[n.category] || this.catStyle.modulo;
            const isH = this.hover === n;
            const isS = this.selected === n;
            const dim = hasFocus && !n.highlighted;
            const sz = n.size * (isH ? 1.15 : 1);
            n.pulse += 0.02;

            c.globalAlpha = dim ? 0.12 : 1;

            // Outer glow
            if ((isH || isS || n.highlighted) && !dim) {
                const pulseR = 1 + Math.sin(n.pulse) * 0.08;
                const gr = c.createRadialGradient(n.x, n.y, sz * 0.3, n.x, n.y, sz * 2 * pulseR);
                gr.addColorStop(0, st.color + '40');
                gr.addColorStop(1, 'transparent');
                c.beginPath();
                c.arc(n.x, n.y, sz * 2 * pulseR, 0, Math.PI * 2);
                c.fillStyle = gr;
                c.fill();
            }

            // Node body
            c.beginPath();
            c.arc(n.x, n.y, sz, 0, Math.PI * 2);
            c.fillStyle = st.bg;
            c.fill();
            c.strokeStyle = st.color;
            c.lineWidth = isS ? 3 : (isH ? 2.5 : 1.2);
            c.stroke();

            // Inner subtle gradient
            const ig = c.createRadialGradient(n.x - sz * 0.2, n.y - sz * 0.2, 0, n.x, n.y, sz);
            ig.addColorStop(0, 'rgba(255,255,255,0.06)');
            ig.addColorStop(1, 'transparent');
            c.beginPath();
            c.arc(n.x, n.y, sz, 0, Math.PI * 2);
            c.fillStyle = ig;
            c.fill();

            // Icon
            const iconSz = Math.max(14, sz * 0.65);
            c.font = `${iconSz}px sans-serif`;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(n.icon, n.x, n.y);

            c.globalAlpha = 1;
        });

        // LABELS (drawn on top so they're always readable)
        this.nodes.forEach(n => {
            if (!n.visible) return;
            const dim = hasFocus && !n.highlighted;
            if (dim && this.scale < 0.7) return; // hide dim labels when zoomed out
            const sz = n.size * (this.hover === n ? 1.15 : 1);
            const fontSize = Math.max(10, Math.min(13, sz * 0.42));

            c.font = `600 ${fontSize}px 'Inter','Segoe UI',system-ui,sans-serif`;
            c.textAlign = 'center';
            c.textBaseline = 'top';

            const label = n.label;
            const metrics = c.measureText(label);
            const lw = metrics.width + 10;
            const lh = fontSize + 6;
            const lx = n.x - lw / 2;
            const ly = n.y + sz + 6;

            // Label background
            c.globalAlpha = dim ? 0.08 : 0.85;
            c.fillStyle = '#0a0f1e';
            c.beginPath();
            c.roundRect(lx, ly, lw, lh, 4);
            c.fill();

            // Label border
            const st = this.catStyle[n.category] || this.catStyle.modulo;
            c.strokeStyle = dim ? 'transparent' : st.color + '40';
            c.lineWidth = 0.5;
            c.stroke();

            // Label text
            c.globalAlpha = dim ? 0.15 : 0.95;
            c.fillStyle = '#e2e8f0';
            c.fillText(label, n.x, ly + 3);
            c.globalAlpha = 1;
        });

        c.restore();
    },

    // ============ LOOP ============
    _loop() {
        this._physics();
        this._draw();
        this.raf = requestAnimationFrame(() => this._loop());
    },

    // ============ EVENTS ============
    _bind() {
        const cv = this.canvas;

        cv.addEventListener('mousemove', e => {
            const p = this._s2w(e.offsetX, e.offsetY);
            if (this.drag) {
                this.drag.x = p.x; this.drag.y = p.y;
                this.drag.vx = 0; this.drag.vy = 0;
                cv.style.cursor = 'grabbing'; return;
            }
            if (this.pan) {
                this.offX += e.offsetX - this.panO.x;
                this.offY += e.offsetY - this.panO.y;
                this.panO = { x: e.offsetX, y: e.offsetY };
                cv.style.cursor = 'move'; return;
            }
            const nd = this._nodeAt(p.x, p.y);
            this.hover = nd;
            cv.style.cursor = nd ? 'pointer' : 'default';
            this._showTip(nd, e);
        });

        cv.addEventListener('mousedown', e => {
            const p = this._s2w(e.offsetX, e.offsetY);
            const nd = this._nodeAt(p.x, p.y);
            if (nd && nd.id !== 'nep') {
                this.drag = nd; this.alpha = Math.max(this.alpha, 0.3);
            } else {
                this.pan = true; this.panO = { x: e.offsetX, y: e.offsetY };
            }
        });

        cv.addEventListener('mouseup', () => {
            if (this.drag) { this.drag = null; this.alpha = Math.max(this.alpha, 0.1); }
            this.pan = false; cv.style.cursor = 'default';
        });

        cv.addEventListener('click', e => {
            const p = this._s2w(e.offsetX, e.offsetY);
            this._select(this._nodeAt(p.x, p.y));
        });

        cv.addEventListener('wheel', e => {
            e.preventDefault();
            const z = e.deltaY < 0 ? 1.12 : 0.88;
            const ns = Math.max(0.25, Math.min(3.5, this.scale * z));
            const mx = e.offsetX, my = e.offsetY;
            this.offX = mx - (mx - this.offX) * (ns / this.scale);
            this.offY = my - (my - this.offY) * (ns / this.scale);
            this.scale = ns;
        }, { passive: false });

        // Zoom buttons
        document.getElementById('gf-zi')?.addEventListener('click', () => { this.scale = Math.min(3.5, this.scale * 1.3); });
        document.getElementById('gf-zo')?.addEventListener('click', () => { this.scale = Math.max(0.25, this.scale * 0.7); });
        document.getElementById('gf-zr')?.addEventListener('click', () => { this.scale = 1; this.offX = 0; this.offY = 0; });

        // Search
        document.getElementById('gf-search')?.addEventListener('input', e => {
            this.search = e.target.value.toLowerCase().trim();
            this._filter();
        });

        // Category filters
        document.querySelectorAll('.gf-fbtn').forEach(b => b.addEventListener('click', () => {
            document.querySelectorAll('.gf-fbtn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            this.activeCat = b.dataset.c === 'all' ? null : b.dataset.c;
            this._filter();
        }));

        window.addEventListener('resize', () => this._resize());
    },

    _s2w(sx, sy) { return { x: (sx - this.offX) / this.scale, y: (sy - this.offY) / this.scale }; },

    _nodeAt(wx, wy) {
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const n = this.nodes[i];
            if (!n.visible) continue;
            const dx = n.x - wx, dy = n.y - wy;
            if (dx * dx + dy * dy <= (n.size + 6) * (n.size + 6)) return n;
        }
        return null;
    },

    _select(nd) {
        this.selected = nd;
        this.nodes.forEach(n => n.highlighted = false);
        if (nd) {
            nd.highlighted = true;
            this.edges.forEach(e => {
                if (e.src.id === nd.id) e.tgt.highlighted = true;
                if (e.tgt.id === nd.id) e.src.highlighted = true;
            });
        }
        this._updateInfo();
    },

    _filter() {
        const s = this.search, cat = this.activeCat;
        this.nodes.forEach(n => {
            let v = true;
            if (cat && n.category !== cat && n.id !== 'nep') v = false;
            if (s && !n.label.toLowerCase().includes(s) && !n.desc.toLowerCase().includes(s)) v = false;
            n.visible = v;
            n.highlighted = s ? v : false;
        });
        if (s) {
            const ids = new Set(this.nodes.filter(n => n.highlighted).map(n => n.id));
            this.edges.forEach(e => {
                if (ids.has(e.src.id)) { e.tgt.visible = true; e.tgt.highlighted = true; }
                if (ids.has(e.tgt.id)) { e.src.visible = true; e.src.highlighted = true; }
            });
        }
    },

    _showTip(nd, e) {
        const tip = document.getElementById('gf-tip');
        if (!tip) return;
        if (!nd) { tip.style.opacity = '0'; return; }
        const st = this.catStyle[nd.category];
        const conns = this.edges.filter(x => x.src.id === nd.id || x.tgt.id === nd.id).length;
        tip.innerHTML = `
      <div class="gf-tip-h"><span style="font-size:22px">${nd.icon}</span><div><b>${nd.label}</b><br><span style="color:${st.color};font-size:11px;font-weight:600">${this.catLabel[nd.category]}</span></div></div>
      <div class="gf-tip-d">${nd.desc}</div>
      <div class="gf-tip-c">${conns} conexões · Ring ${nd.ring}</div>`;
        tip.style.opacity = '1';
        let tx = e.offsetX + 18, ty = e.offsetY - 10;
        tip.style.left = tx + 'px'; tip.style.top = ty + 'px';
        // Keep in bounds
        requestAnimationFrame(() => {
            const r = tip.getBoundingClientRect(), pr = this.canvas.parentElement.getBoundingClientRect();
            if (r.right > pr.right - 8) tip.style.left = (e.offsetX - r.width - 18) + 'px';
            if (r.bottom > pr.bottom - 8) tip.style.top = (e.offsetY - r.height + 10) + 'px';
        });
    },

    _updateInfo() {
        const el = document.getElementById('gf-info');
        if (!el) return;
        if (!this.selected) { el.style.display = 'none'; return; }
        const n = this.selected, st = this.catStyle[n.category];
        const conns = this.edges.filter(e => e.src.id === n.id || e.tgt.id === n.id);
        const peers = conns.map(e => e.src.id === n.id ? e.tgt : e.src);
        el.style.display = 'block';
        el.innerHTML = `
      <div class="gf-info-h">
        <span>${n.icon} <b>${n.label}</b></span>
        <button id="gf-close-info" class="gf-close">✕</button>
      </div>
      <div class="gf-info-cat" style="color:${st.color}">${this.catLabel[n.category]}</div>
      <div class="gf-info-desc">${n.desc}</div>
      <div class="gf-info-lbl">Conexões (${conns.length})</div>
      <div class="gf-info-tags">${peers.map(p => {
            const ps = this.catStyle[p.category];
            return `<span class="gf-tag" style="border-color:${ps.color}50;color:${ps.color}">${p.icon} ${p.label}</span>`;
        }).join('')}</div>`;
        document.getElementById('gf-close-info')?.addEventListener('click', () => this._select(null));
    },

    // ============ CSS ============
    _injectCSS() {
        if (document.getElementById('gf-css')) return;
        const s = document.createElement('style'); s.id = 'gf-css';
        s.textContent = `
#gf-canvas{display:block;background:#060b18}
.gf-bar{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:rgba(6,11,24,0.97);border-bottom:1px solid rgba(255,255,255,0.06);flex-wrap:wrap;gap:10px}
.gf-bar-l,.gf-bar-r{display:flex;align-items:center;gap:12px}
.gf-bar h2{font-size:17px;font-weight:700;color:#fff;margin:0}
.gf-bar p{font-size:11px;color:#64748b;margin:2px 0 0}
.gf-logo{font-size:26px}
.gf-srch{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:0 12px}
.gf-srch i{color:#475569;font-size:12px}
.gf-srch input{background:transparent;border:none;color:#fff;font-size:13px;padding:7px 0;width:140px;outline:none}
.gf-zoom{display:flex;gap:3px}
.gf-zoom button{width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#94a3b8;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s}
.gf-zoom button:hover{background:rgba(255,255,255,0.08);color:#fff}
.gf-filters{display:flex;gap:5px;padding:8px 20px;background:rgba(6,11,24,0.95);border-bottom:1px solid rgba(255,255,255,0.04);overflow-x:auto}
.gf-fbtn{padding:5px 12px;border-radius:20px;font-size:11px;font-weight:500;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);color:#94a3b8;cursor:pointer;white-space:nowrap;transition:.2s;display:flex;align-items:center;gap:5px}
.gf-fbtn:hover{background:rgba(255,255,255,0.06);color:#e2e8f0}
.gf-fbtn.active{background:rgba(0,224,255,0.08);border-color:rgba(0,224,255,0.3);color:#fff}
.gf-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;display:inline-block}
.gf-tip{position:absolute;z-index:100;pointer-events:none;background:rgba(8,13,28,0.97);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px 16px;min-width:200px;max-width:280px;box-shadow:0 12px 40px rgba(0,0,0,0.6);backdrop-filter:blur(16px);opacity:0;transition:opacity .15s}
.gf-tip-h{display:flex;gap:10px;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.05)}
.gf-tip-h b{font-size:14px;color:#fff}
.gf-tip-d{font-size:12px;color:#94a3b8;line-height:1.5;margin-bottom:6px}
.gf-tip-c{font-size:10px;color:#475569}
.gf-info{position:absolute;top:110px;right:14px;width:250px;background:rgba(8,13,28,0.95);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;display:none;backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(0,0,0,0.4)}
.gf-info-h{display:flex;justify-content:space-between;align-items:center;font-size:15px;color:#fff;margin-bottom:4px}
.gf-close{background:none;border:none;color:#475569;cursor:pointer;font-size:15px;padding:2px}.gf-close:hover{color:#fff}
.gf-info-cat{font-size:11px;font-weight:600;margin-bottom:8px}
.gf-info-desc{font-size:12px;color:#94a3b8;line-height:1.5;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.05)}
.gf-info-lbl{font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
.gf-info-tags{display:flex;flex-wrap:wrap;gap:5px}
.gf-tag{font-size:10px;padding:3px 7px;border-radius:6px;background:rgba(255,255,255,0.03);border:1px solid;white-space:nowrap}
.gf-legend{position:absolute;bottom:12px;left:12px;display:flex;flex-wrap:wrap;gap:10px;background:rgba(6,11,24,0.85);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:8px 14px;backdrop-filter:blur(6px)}
.gf-leg{display:flex;align-items:center;gap:5px;font-size:10px;color:#94a3b8}
`;
        document.head.appendChild(s);
    },

    destroy() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; }
};

window.NepGrafo = NepGrafo;
