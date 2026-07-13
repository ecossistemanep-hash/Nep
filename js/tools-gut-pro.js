/**
 * GUT PRO V2 - Matriz de Priorização Profissional
 * Gravidade × Urgência × Tendência
 * Com botões de score, barras visuais, gráfico e export
 */

const GUTPro = {
  data: [],

  scales: {
    g: { 1: 'Sem gravidade', 2: 'Pouco grave', 3: 'Grave', 4: 'Muito grave', 5: 'Extremamente grave' },
    u: { 1: 'Pode esperar', 2: 'Pouco urgente', 3: 'Urgente', 4: 'Muito urgente', 5: 'Ação imediata' },
    t: { 1: 'Não muda', 2: 'Piora a longo', 3: 'Piora médio', 4: 'Piora curto', 5: 'Piora rápido' }
  },

  colors: {
    critical: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#ef4444' },
    high: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#f59e0b' },
    medium: { bg: 'rgba(234,179,8,0.12)', border: '#eab308', text: '#eab308' },
    low: { bg: 'rgba(34,197,94,0.12)', border: '#22c55e', text: '#22c55e' }
  },

  chart: null,
  chartRendered: false,
  editingIdx: -1,

  init() { this.load(); },

  load() {
    try {
      const saved = localStorage.getItem('nexus_gut_pro');
      if (saved) this.data = JSON.parse(saved);
    } catch (e) { console.warn('[GUT Pro] Erro ao carregar:', e); }
  },

  save() {
    localStorage.setItem('nexus_gut_pro', JSON.stringify(this.data));
    if (typeof ToolsService !== 'undefined') {
      ToolsService.saveGUT(this.data).catch(e => console.warn('[GUT Pro] Erro Supabase:', e));
    }
  },

  getLevel(score) {
    if (score >= 100) return { label: 'CRÍTICO', cls: 'critical', icon: '🔴', action: 'Ação imediata' };
    if (score >= 64) return { label: 'ALTO', cls: 'high', icon: '🟠', action: 'Prioridade alta' };
    if (score >= 27) return { label: 'MÉDIO', cls: 'medium', icon: '🟡', action: 'Monitorar' };
    return { label: 'BAIXO', cls: 'low', icon: '🟢', action: 'Pode aguardar' };
  },

  render() {
    this.load();
    this.chartRendered = false;
    const sorted = [...this.data].sort((a, b) => b.gut - a.gut);
    const total = sorted.length;
    const critical = sorted.filter(i => i.gut >= 100).length;
    const high = sorted.filter(i => i.gut >= 64 && i.gut < 100).length;
    const medium = sorted.filter(i => i.gut >= 27 && i.gut < 64).length;
    const low = sorted.filter(i => i.gut < 27).length;

    return `
      <div class="gp2">

        <!-- Header -->
        <div class="gp2-header">
          <div class="gp2-header-left">
            <div class="gp2-icon"><i class="fa-solid fa-ranking-star"></i></div>
            <div>
              <h2>Matriz GUT</h2>
              <p>Gravidade × Urgência × Tendência</p>
            </div>
          </div>
          <div class="gp2-header-actions">
            <button class="gp2-btn gp2-btn-sec" id="gut-pro-export"><i class="fa-solid fa-download"></i> Exportar</button>
            <button class="gp2-btn gp2-btn-danger" id="gut-pro-clear"><i class="fa-solid fa-trash"></i> Limpar</button>
          </div>
        </div>

        <!-- Formulário de entrada -->
        <div class="gp2-form-card">
          <div class="gp2-form-problem">
            <label>📝 Problema / Situação</label>
            <input type="text" id="gut-pro-problem" placeholder="Ex: Alto índice de rechamada no setor financeiro..." />
          </div>

          <div class="gp2-scores-grid">
            ${this._renderScoreSelector('g', 'Gravidade', '🔥', '#ef4444')}
            ${this._renderScoreSelector('u', 'Urgência', '⏰', '#f59e0b')}
            ${this._renderScoreSelector('t', 'Tendência', '📈', '#9c5cff')}
          </div>

          <div class="gp2-preview-row">
            <div class="gp2-preview-left">
              <span class="gp2-preview-label">Score GUT:</span>
              <span id="gut-preview-score" class="gp2-preview-score">27</span>
              <span id="gut-preview-level" class="gp2-preview-level medium">MÉDIO</span>
            </div>
            <div class="gp2-preview-bar-wrap">
              <div id="gut-preview-bar" class="gp2-preview-bar" style="width:21.6%;background:#eab308;"></div>
            </div>
            <button class="gp2-btn gp2-btn-primary" id="gut-pro-add">
              <i class="fa-solid fa-plus"></i> Adicionar
            </button>
          </div>
        </div>

        <!-- Resumo KPIs -->
        ${total > 0 ? `
        <div class="gp2-kpis">
          <div class="gp2-kpi"><div class="gp2-kpi-num">${total}</div><div class="gp2-kpi-label">Total</div></div>
          <div class="gp2-kpi kpi-crit"><div class="gp2-kpi-num">${critical}</div><div class="gp2-kpi-label">🔴 Críticos</div></div>
          <div class="gp2-kpi kpi-high"><div class="gp2-kpi-num">${high}</div><div class="gp2-kpi-label">🟠 Altos</div></div>
          <div class="gp2-kpi kpi-med"><div class="gp2-kpi-num">${medium}</div><div class="gp2-kpi-label">🟡 Médios</div></div>
          <div class="gp2-kpi kpi-low"><div class="gp2-kpi-num">${low}</div><div class="gp2-kpi-label">🟢 Baixos</div></div>
        </div>
        ` : ''}

        <!-- Tabela de Resultados -->
        ${total > 0 ? `
        <div class="gp2-table-card">
          <div class="gp2-table-title"><i class="fa-solid fa-list-ol"></i> Ranking de Prioridades</div>
          <div class="gp2-table-wrap">
            <table class="gp2-table">
              <thead>
                <tr>
                  <th style="width:50px">#</th>
                  <th>Problema</th>
                  <th style="width:50px">G</th>
                  <th style="width:50px">U</th>
                  <th style="width:50px">T</th>
                  <th style="width:100px">GUT</th>
                  <th style="width:110px">Nível</th>
                  <th style="width:45px"></th>
                </tr>
              </thead>
              <tbody>
                ${sorted.map((item, i) => {
      const lv = this.getLevel(item.gut);
      const barW = Math.min((item.gut / 125) * 100, 100);
      const origIdx = this.data.indexOf(item);
      return `
                  <tr>
                    <td><span class="gp2-rank rank-${i < 3 ? i + 1 : 'n'}">${i + 1}º</span></td>
                    <td class="gp2-prob-cell" title="${item.problem}">${item.problem}</td>
                    <td><span class="gp2-score-dot g">${item.g}</span></td>
                    <td><span class="gp2-score-dot u">${item.u}</span></td>
                    <td><span class="gp2-score-dot t">${item.t}</span></td>
                    <td>
                      <div class="gp2-gut-cell">
                        <span class="gp2-gut-val ${lv.cls}">${item.gut}</span>
                        <div class="gp2-gut-bar"><div class="gp2-gut-bar-fill ${lv.cls}" style="width:${barW}%"></div></div>
                      </div>
                    </td>
                    <td><span class="gp2-level-badge ${lv.cls}">${lv.icon} ${lv.label}</span></td>
                    <td><button class="gp2-del-btn" data-idx="${origIdx}"><i class="fa-solid fa-trash"></i></button></td>
                  </tr>`;
    }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Gráfico -->
        <div class="gp2-chart-card">
          <div class="gp2-table-title"><i class="fa-solid fa-chart-bar"></i> Mapa de Priorização</div>
          <div style="position:relative;height:${Math.max(sorted.length * 42 + 60, 200)}px;">
            <canvas id="gut-chart"></canvas>
          </div>
        </div>
        ` : `
        <div class="gp2-empty">
          <i class="fa-solid fa-scale-balanced"></i>
          <h3>Nenhum problema cadastrado</h3>
          <p>Adicione problemas acima para montar a Matriz GUT</p>
        </div>
        `}

        <!-- Legenda -->
        <div class="gp2-legend-card">
          <div class="gp2-table-title"><i class="fa-solid fa-info-circle"></i> Como funciona a Matriz GUT</div>
          <div class="gp2-legend-grid">
            <div class="gp2-legend-item">
              <strong>🔥 Gravidade (G)</strong>
              <p>Qual o impacto se nada for feito? Quanto maior a consequência, maior o G.</p>
            </div>
            <div class="gp2-legend-item">
              <strong>⏰ Urgência (U)</strong>
              <p>Quanto tempo temos para agir? Quanto menos tempo, maior o U.</p>
            </div>
            <div class="gp2-legend-item">
              <strong>📈 Tendência (T)</strong>
              <p>O problema vai piorar com o tempo? Quanto mais rápido piora, maior o T.</p>
            </div>
            <div class="gp2-legend-item">
              <strong>📊 Score GUT</strong>
              <p>G × U × T = Score (1 a 125). Quanto maior, mais urgente a ação.</p>
            </div>
          </div>
          <div class="gp2-legend-levels">
            <span class="gp2-level-badge critical">🔴 Crítico (≥100)</span>
            <span class="gp2-level-badge high">🟠 Alto (64-99)</span>
            <span class="gp2-level-badge medium">🟡 Médio (27-63)</span>
            <span class="gp2-level-badge low">🟢 Baixo (<27)</span>
          </div>
        </div>
      </div>

      <style>
        .gp2 { max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
        .gp2-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        .gp2-header-left { display: flex; align-items: center; gap: 14px; }
        .gp2-icon { width: 48px; height: 48px; background: linear-gradient(135deg,#7555e8,#6544d0); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; }
        .gp2-header h2 { margin: 0; font-size: 22px; color: var(--text-primary); }
        .gp2-header p { margin: 2px 0 0; font-size: 13px; color: var(--text-tertiary); }
        .gp2-header-actions { display: flex; gap: 8px; }
        .gp2-btn { padding: 9px 16px; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit; transition: all .2s; }
        .gp2-btn-primary { background: linear-gradient(135deg,#7555e8,#6544d0); color: white; box-shadow: 0 2px 8px rgba(168,85,247,.3); }
        .gp2-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(168,85,247,.4); }
        .gp2-btn-sec { background: var(--surface-card,#1e293b); color: var(--text-primary); border: 1px solid var(--surface-border,#334155); }
        .gp2-btn-sec:hover { background: var(--surface-hover,#334155); }
        .gp2-btn-danger { background: transparent; color: #ef4444; border: 1px solid rgba(239,68,68,.3); }
        .gp2-btn-danger:hover { background: rgba(239,68,68,.1); }

        /* Form Card */
        .gp2-form-card { background: var(--surface-card,#131B29); border: 1px solid var(--surface-border,#2D3A4F); border-radius: 16px; padding: 24px; }
        .gp2-form-problem { margin-bottom: 20px; }
        .gp2-form-problem label { font-size: 13px; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 8px; }
        .gp2-form-problem input {
          width: 100%; padding: 12px 16px; background: var(--surface-elevated,#1C2438);
          border: 1px solid var(--surface-border,#2D3A4F); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; font-family: inherit; transition: border-color .2s;
        }
        .gp2-form-problem input:focus { outline: none; border-color: #7555e8; }

        /* Score Selectors */
        .gp2-scores-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 20px; }
        @media(max-width:700px) { .gp2-scores-grid { grid-template-columns: 1fr; } }
        .gp2-score-sel { display: flex; flex-direction: column; gap: 8px; }
        .gp2-score-sel-header { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text-secondary); }
        .gp2-score-btns { display: flex; gap: 6px; }
        .gp2-score-btn {
          flex: 1; padding: 10px 0; border: 2px solid var(--surface-border,#2D3A4F);
          border-radius: 8px; background: var(--surface-elevated,#1C2438); color: var(--text-tertiary);
          font-size: 16px; font-weight: 700; cursor: pointer; transition: all .2s; font-family: inherit;
        }
        .gp2-score-btn:hover { border-color: var(--text-tertiary); color: var(--text-primary); }
        .gp2-score-btn.active { color: white; transform: scale(1.08); }
        .gp2-score-btn.active.g { background: #ef4444; border-color: #ef4444; }
        .gp2-score-btn.active.u { background: #f59e0b; border-color: #f59e0b; }
        .gp2-score-btn.active.t { background: #9c5cff; border-color: #9c5cff; }
        .gp2-score-desc { font-size: 11px; color: var(--text-tertiary); min-height: 16px; }

        /* Preview */
        .gp2-preview-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .gp2-preview-left { display: flex; align-items: center; gap: 8px; }
        .gp2-preview-label { font-size: 13px; color: var(--text-secondary); font-weight: 600; }
        .gp2-preview-score { font-size: 26px; font-weight: 800; }
        .gp2-preview-level { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: .5px; }
        .gp2-preview-bar-wrap { flex: 1; min-width: 100px; height: 8px; background: var(--surface-border,#2D3A4F); border-radius: 4px; overflow: hidden; }
        .gp2-preview-bar { height: 100%; border-radius: 4px; transition: all .3s ease; }

        /* Levels */
        .gp2-level-badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
        .gp2-level-badge.critical,.gp2-preview-level.critical { background: rgba(239,68,68,.15); color: #ef4444; }
        .gp2-level-badge.high,.gp2-preview-level.high { background: rgba(245,158,11,.15); color: #f59e0b; }
        .gp2-level-badge.medium,.gp2-preview-level.medium { background: rgba(234,179,8,.12); color: #eab308; }
        .gp2-level-badge.low,.gp2-preview-level.low { background: rgba(34,197,94,.12); color: #22c55e; }

        /* KPIs */
        .gp2-kpis { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; }
        @media(max-width:700px) { .gp2-kpis { grid-template-columns: repeat(3,1fr); } }
        .gp2-kpi { background: var(--surface-card,#131B29); border: 1px solid var(--surface-border,#2D3A4F); border-radius: 12px; padding: 16px; text-align: center; }
        .gp2-kpi-num { font-size: 28px; font-weight: 800; color: var(--text-primary); }
        .gp2-kpi-label { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
        .kpi-crit .gp2-kpi-num { color: #ef4444; }
        .kpi-high .gp2-kpi-num { color: #f59e0b; }
        .kpi-med .gp2-kpi-num { color: #eab308; }
        .kpi-low .gp2-kpi-num { color: #22c55e; }

        /* Table */
        .gp2-table-card { background: var(--surface-card,#131B29); border: 1px solid var(--surface-border,#2D3A4F); border-radius: 16px; overflow: hidden; }
        .gp2-table-title { padding: 14px 20px; font-weight: 600; font-size: 14px; color: var(--text-primary); border-bottom: 1px solid var(--surface-border,#2D3A4F); display: flex; align-items: center; gap: 8px; }
        .gp2-table-wrap { overflow-x: auto; }
        .gp2-table { width: 100%; border-collapse: collapse; }
        .gp2-table th { padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: var(--text-tertiary); text-align: left; border-bottom: 1px solid var(--surface-border,#2D3A4F); font-weight: 600; letter-spacing: .5px; }
        .gp2-table td { padding: 12px 14px; font-size: 13px; color: var(--text-primary); border-bottom: 1px solid rgba(255,255,255,.04); }
        .gp2-table tr:hover { background: rgba(168,85,247,.04); }
        .gp2-prob-cell { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .gp2-rank { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 8px; font-size: 12px; font-weight: 700; }
        .rank-1 { background: linear-gradient(135deg,#fbbf24,#f59e0b); color: #000; }
        .rank-2 { background: linear-gradient(135deg,#94a3b8,#64748b); color: #fff; }
        .rank-3 { background: linear-gradient(135deg,#cd7f32,#a0522d); color: #fff; }
        .rank-n { background: var(--surface-elevated,#1C2438); color: var(--text-tertiary); }
        .gp2-score-dot { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; font-size: 13px; font-weight: 700; }
        .gp2-score-dot.g { background: rgba(239,68,68,.12); color: #f87171; }
        .gp2-score-dot.u { background: rgba(245,158,11,.12); color: #fbbf24; }
        .gp2-score-dot.t { background: rgba(139,92,246,.12); color: #ad97ee; }
        .gp2-gut-cell { display: flex; align-items: center; gap: 8px; }
        .gp2-gut-val { font-weight: 800; font-size: 14px; min-width: 32px; }
        .gp2-gut-val.critical { color: #ef4444; } .gp2-gut-val.high { color: #f59e0b; } .gp2-gut-val.medium { color: #eab308; } .gp2-gut-val.low { color: #22c55e; }
        .gp2-gut-bar { width: 60px; height: 6px; background: var(--surface-border,#2D3A4F); border-radius: 3px; overflow: hidden; }
        .gp2-gut-bar-fill { height: 100%; border-radius: 3px; transition: width .3s; }
        .gp2-gut-bar-fill.critical { background: #ef4444; } .gp2-gut-bar-fill.high { background: #f59e0b; } .gp2-gut-bar-fill.medium { background: #eab308; } .gp2-gut-bar-fill.low { background: #22c55e; }
        .gp2-del-btn { background: none; border: none; color: var(--text-tertiary); cursor: pointer; padding: 6px; border-radius: 6px; transition: all .2s; }
        .gp2-del-btn:hover { color: #ef4444; background: rgba(239,68,68,.1); }

        /* Chart */
        .gp2-chart-card { background: var(--surface-card,#131B29); border: 1px solid var(--surface-border,#2D3A4F); border-radius: 16px; overflow: hidden; }

        /* Empty */
        .gp2-empty { text-align: center; padding: 60px 20px; color: var(--text-tertiary); }
        .gp2-empty i { font-size: 48px; margin-bottom: 16px; opacity: .5; }
        .gp2-empty h3 { color: var(--text-primary); margin: 0 0 8px; }

        /* Legend */
        .gp2-legend-card { background: var(--surface-card,#131B29); border: 1px solid var(--surface-border,#2D3A4F); border-radius: 16px; overflow: hidden; }
        .gp2-legend-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; padding: 20px; }
        @media(max-width:700px) { .gp2-legend-grid { grid-template-columns: repeat(2,1fr); } }
        .gp2-legend-item { font-size: 12px; color: var(--text-secondary); }
        .gp2-legend-item strong { display: block; margin-bottom: 4px; color: var(--text-primary); font-size: 13px; }
        .gp2-legend-item p { margin: 0; line-height: 1.4; }
        .gp2-legend-levels { display: flex; gap: 8px; padding: 0 20px 16px; flex-wrap: wrap; }

        /* Light mode */
        [data-theme="light"] .gp2-form-card,
        [data-theme="light"] .gp2-table-card,
        [data-theme="light"] .gp2-chart-card,
        [data-theme="light"] .gp2-kpi,
        [data-theme="light"] .gp2-legend-card { background: #ffffff !important; border-color: #e2e8f0 !important; }
        [data-theme="light"] .gp2-form-problem input,
        [data-theme="light"] .gp2-score-btn { background: #f8fafc !important; border-color: #cbd5e1 !important; color: #475569 !important; }
        [data-theme="light"] .gp2-score-btn.active.g { background: #ef4444 !important; border-color: #ef4444 !important; color: white !important; }
        [data-theme="light"] .gp2-score-btn.active.u { background: #f59e0b !important; border-color: #f59e0b !important; color: white !important; }
        [data-theme="light"] .gp2-score-btn.active.t { background: #9c5cff !important; border-color: #9c5cff !important; color: white !important; }
        [data-theme="light"] .gp2-table td { color: #0f172a !important; border-color: #f1f5f9 !important; }
        [data-theme="light"] .gp2-table th { color: #64748b !important; border-color: #e2e8f0 !important; }
        [data-theme="light"] .gp2-table tr:hover { background: rgba(168,85,247,.04) !important; }
        [data-theme="light"] .gp2-del-btn { color: #94a3b8 !important; }
      </style>
    `;
  },

  _renderScoreSelector(type, label, icon, color) {
    const val = 3;
    return `
      <div class="gp2-score-sel">
        <div class="gp2-score-sel-header">
          <span>${icon}</span> <span>${label}</span>
        </div>
        <div class="gp2-score-btns" data-type="${type}">
          ${[1, 2, 3, 4, 5].map(n =>
      `<button class="gp2-score-btn ${type} ${n === val ? 'active' : ''}" data-type="${type}" data-val="${n}">${n}</button>`
    ).join('')}
        </div>
        <div class="gp2-score-desc" id="gut-${type}-desc">${this.scales[type][val]}</div>
      </div>
    `;
  },

  // Current selected values (defaults)
  _selected: { g: 3, u: 3, t: 3 },

  bindEvents() {
    // Score buttons
    document.querySelectorAll('.gp2-score-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const val = parseInt(btn.dataset.val);
        this._selected[type] = val;

        // Update active state
        btn.closest('.gp2-score-btns').querySelectorAll('.gp2-score-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update description
        const desc = document.getElementById(`gut-${type}-desc`);
        if (desc) desc.textContent = this.scales[type][val];

        this.updatePreview();
      });
    });

    // Add
    document.getElementById('gut-pro-add')?.addEventListener('click', () => this.addItem());
    document.getElementById('gut-pro-problem')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addItem();
    });

    // Delete
    document.querySelectorAll('.gp2-del-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteItem(parseInt(btn.dataset.idx)));
    });

    // Export & Clear
    document.getElementById('gut-pro-export')?.addEventListener('click', () => this.showExportOptions());
    document.getElementById('gut-pro-clear')?.addEventListener('click', () => {
      if (confirm('Limpar toda a Matriz GUT?')) this.clear();
    });

    // Initial preview
    this.updatePreview();

    // Chart
    if (this.data.length > 0 && !this.chartRendered) {
      this.chartRendered = true;
      requestAnimationFrame(() => setTimeout(() => this.renderChart(), 100));
    }
  },

  updatePreview() {
    const g = this._selected.g;
    const u = this._selected.u;
    const t = this._selected.t;
    const score = g * u * t;
    const lv = this.getLevel(score);

    const scoreEl = document.getElementById('gut-preview-score');
    const levelEl = document.getElementById('gut-preview-level');
    const barEl = document.getElementById('gut-preview-bar');

    if (scoreEl) {
      scoreEl.textContent = score;
      scoreEl.style.color = this.colors[lv.cls].text;
    }
    if (levelEl) {
      levelEl.textContent = lv.label;
      levelEl.className = `gp2-preview-level ${lv.cls}`;
    }
    if (barEl) {
      barEl.style.width = `${(score / 125) * 100}%`;
      barEl.style.background = this.colors[lv.cls].border;
    }
  },

  addItem() {
    const problem = document.getElementById('gut-pro-problem')?.value?.trim();
    if (!problem) { NexusApp?.showToast?.('Digite o problema', 'error'); return; }

    this.data.push({
      id: Date.now(),
      problem,
      g: this._selected.g,
      u: this._selected.u,
      t: this._selected.t,
      gut: this._selected.g * this._selected.u * this._selected.t,
      createdAt: new Date().toISOString()
    });

    document.getElementById('gut-pro-problem').value = '';
    this._selected = { g: 3, u: 3, t: 3 };
    this.save();
    this.refresh();
    NexusApp?.showToast?.('Problema adicionado à matriz!', 'success');
  },

  deleteItem(idx) {
    this.data.splice(idx, 1);
    this.save();
    this.refresh();
  },

  clear() {
    this.data = [];
    this.save();
    this.refresh();
  },

  refresh() {
    this.chartRendered = false;
    const container = document.getElementById('page-content');
    if (container && NexusTools.currentTool === 'gut') {
      NexusTools.render(container);
    }
  },

  renderChart() {
    const ctx = document.getElementById('gut-chart');
    if (!ctx || this.data.length === 0) return;

    try {
      if (this.chart) this.chart.destroy();
      const sorted = [...this.data].sort((a, b) => b.gut - a.gut).slice(0, 15);
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const textColor = isLight ? '#475569' : 'rgba(255,255,255,0.6)';
      const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';

      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sorted.map(i => i.problem.length > 30 ? i.problem.substring(0, 30) + '…' : i.problem),
          datasets: [{
            label: 'Score GUT',
            data: sorted.map(i => i.gut),
            backgroundColor: sorted.map(i => {
              const lv = this.getLevel(i.gut);
              return this.colors[lv.cls].bg.replace(/[\d.]+\)$/, '0.6)');
            }),
            borderColor: sorted.map(i => this.colors[this.getLevel(i.gut).cls].border),
            borderWidth: 2,
            borderRadius: 6,
            barPercentage: 0.7
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => sorted[items[0].dataIndex]?.problem || '',
                label: (item) => {
                  const d = sorted[item.dataIndex];
                  return [`G: ${d.g}  U: ${d.u}  T: ${d.t}`, `Score: ${d.gut} (${this.getLevel(d.gut).label})`];
                }
              }
            }
          },
          scales: {
            x: {
              title: { display: true, text: 'Score GUT', color: textColor },
              min: 0, max: 130,
              grid: { color: gridColor },
              ticks: { color: textColor }
            },
            y: {
              grid: { display: false },
              ticks: { color: textColor, font: { size: 11 } }
            }
          }
        }
      });
    } catch (error) {
      console.error('[GUT Pro] Erro no gráfico:', error);
    }
  },

  showExportOptions() {
    if (typeof QualityExport !== 'undefined') {
      QualityExport.showExportModal({
        title: 'Matriz GUT',
        onPDF: () => QualityExport.toPDF('.gp2', `matriz_gut_${Date.now()}.pdf`, 'Matriz GUT'),
        onPNG: () => QualityExport.toPNG('.gp2', `matriz_gut_${Date.now()}.png`),
        onTXT: () => this.export()
      });
    } else {
      this.export();
    }
  },

  export() {
    const sorted = [...this.data].sort((a, b) => b.gut - a.gut);
    let content = '═══════════════════════════════════════════════════════════\n';
    content += '                      MATRIZ GUT\n';
    content += '           Gravidade × Urgência × Tendência\n';
    content += '═══════════════════════════════════════════════════════════\n\n';
    content += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    content += `📊 Total de problemas: ${sorted.length}\n\n`;
    content += '─────────────────────────────────────────────────────────────\n';
    content += ' #  │ PROBLEMA                          │ G │ U │ T │  GUT\n';
    content += '─────────────────────────────────────────────────────────────\n';
    sorted.forEach((item, i) => {
      const lv = this.getLevel(item.gut);
      const prob = item.problem.substring(0, 30).padEnd(30);
      content += ` ${(i + 1).toString().padStart(2)} │ ${prob} │ ${item.g} │ ${item.u} │ ${item.t} │ ${lv.icon} ${item.gut}\n`;
    });
    content += '─────────────────────────────────────────────────────────────\n\n';
    content += 'LEGENDA:\n';
    content += '🔴 Crítico (GUT ≥ 100) - Ação imediata necessária\n';
    content += '🟠 Alta (GUT 64-99) - Prioridade alta\n';
    content += '🟡 Média (GUT 27-63) - Monitorar\n';
    content += '🟢 Baixa (GUT < 27) - Pode aguardar\n\n';
    content += `\nExportado pelo NEP Delivery Control em ${new Date().toLocaleString('pt-BR')}\n`;
    this.downloadText(content, `matriz_gut_${Date.now()}.txt`);
  },

  downloadText(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
};

window.GUTPro = GUTPro;
