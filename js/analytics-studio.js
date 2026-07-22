/**
 * NEP ANALYTICS STUDIO
 * Laboratório de dados 100% no navegador — importa Excel/CSV e roda:
 * perfil da base, estatística descritiva, correlações (com significância),
 * simulação de Monte Carlo, previsão de série temporal e anomalias.
 *
 * IMPORTANTE (escopo honesto): NÃO conecta a SQL Server nem tem backend
 * Python/IIS — isso exigiria a plataforma corporativa separada descrita no
 * documento. Aqui tudo roda client-side; os cálculos estatísticos são reais.
 */

const NepAnalyticsStudio = {
  dataset: null,          // { headers, rows, numericCols, dateCols }
  activeTab: 'importar',
  charts: {},
  container: null,

  render(container) {
    this.container = container;
    container.innerHTML = `
      <div class="as-page animate-fade-in">
        <div class="as-header">
          <div>
            <h1 class="page-title">🔬 NEP Analytics Studio</h1>
            <p class="page-description">Laboratório de dados, estatística e simulação — direto no navegador.</p>
          </div>
          <span class="as-badge" id="as-dataset-badge">Nenhuma base carregada</span>
        </div>

        <div class="as-tabs" id="as-tabs">
          ${this.tabButton('importar', '📁 Importar')}
          ${this.tabButton('perfil', '🔎 Perfil da Base')}
          ${this.tabButton('estatistica', '📊 Estatística')}
          ${this.tabButton('correlacao', '🔗 Correlações')}
          ${this.tabButton('montecarlo', '🎲 Monte Carlo')}
          ${this.tabButton('previsao', '📈 Previsão')}
          ${this.tabButton('anomalias', '⚠️ Anomalias')}
        </div>

        <div class="as-content" id="as-content"></div>
      </div>
    `;
    this.injectStyles();
    this.attachTabs();
    this.renderTab();
  },

  tabButton(id, label) {
    return `<button class="as-tab ${this.activeTab === id ? 'active' : ''}" data-astab="${id}">${label}</button>`;
  },

  attachTabs() {
    this.container.querySelectorAll('.as-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.astab;
        if (id !== 'importar' && !this.dataset) {
          NexusApp?.showToast?.('Importe uma base primeiro (aba Importar).', 'warning');
          return;
        }
        this.activeTab = id;
        this.container.querySelectorAll('.as-tab').forEach(b => b.classList.toggle('active', b === btn));
        this.renderTab();
      });
    });
  },

  renderTab() {
    const el = document.getElementById('as-content');
    if (!el) return;
    Object.values(this.charts).forEach(c => { try { c.destroy(); } catch (e) {} });
    this.charts = {};
    switch (this.activeTab) {
      case 'importar': el.innerHTML = this.viewImportar(); this.bindImportar(); break;
      case 'perfil': el.innerHTML = this.viewPerfil(); break;
      case 'estatistica': el.innerHTML = this.viewEstatistica(); this.bindEstatistica(); break;
      case 'correlacao': el.innerHTML = this.viewCorrelacao(); this.renderCorrChart(); break;
      case 'montecarlo': el.innerHTML = this.viewMonteCarlo(); this.bindMonteCarlo(); break;
      case 'previsao': el.innerHTML = this.viewPrevisao(); this.bindPrevisao(); break;
      case 'anomalias': el.innerHTML = this.viewAnomalias(); this.bindAnomalias(); break;
    }
  },

  // ============ IMPORTAR ============
  viewImportar() {
    return `
      <div class="as-card">
        <div class="as-upload" id="as-upload">
          <i class="fa-solid fa-cloud-arrow-up" style="font-size:36px;color:var(--primary-400);"></i>
          <p style="margin:12px 0 4px;font-weight:600;">Arraste um Excel/CSV aqui ou clique para selecionar</p>
          <p style="font-size:12px;color:var(--text-tertiary);">Formatos: .xlsx, .xls, .csv — processado localmente, nada é enviado para servidor.</p>
          <input type="file" id="as-file" accept=".xlsx,.xls,.csv" hidden>
        </div>
        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-secondary" id="as-demo"><i class="fa-solid fa-flask"></i> Carregar dados de exemplo</button>
        </div>
        <div id="as-import-preview" style="margin-top:20px;"></div>
      </div>
    `;
  },

  bindImportar() {
    const area = document.getElementById('as-upload');
    const input = document.getElementById('as-file');
    area?.addEventListener('click', () => input.click());
    area?.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('dragover'); });
    area?.addEventListener('dragleave', () => area.classList.remove('dragover'));
    area?.addEventListener('drop', e => {
      e.preventDefault(); area.classList.remove('dragover');
      if (e.dataTransfer.files[0]) this.loadFile(e.dataTransfer.files[0]);
    });
    input?.addEventListener('change', e => { if (e.target.files[0]) this.loadFile(e.target.files[0]); });
    document.getElementById('as-demo')?.addEventListener('click', () => this.loadDemo());
  },

  loadFile(file) {
    if (typeof XLSX === 'undefined') { NexusApp?.showToast?.('Biblioteca de planilha não carregada', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });
        if (rows.length < 2) { NexusApp?.showToast?.('Planilha vazia ou sem dados', 'error'); return; }
        this.ingest(rows[0].map(h => String(h ?? '').trim()), rows.slice(1));
        NexusApp?.showToast?.(`Base carregada: ${this.dataset.rows.length} linhas × ${this.dataset.headers.length} colunas`, 'success');
      } catch (err) {
        console.error('[AnalyticsStudio] erro import:', err);
        NexusApp?.showToast?.('Erro ao ler o arquivo: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  },

  loadDemo() {
    // Base fictícia: 90 dias de operação (volume, TMA, aderência, satisfação)
    const headers = ['Data', 'Volume', 'TMA_min', 'Aderencia_%', 'Satisfacao', 'Rechamada_%'];
    const rows = [];
    const start = new Date();
    start.setDate(start.getDate() - 90);
    for (let i = 0; i < 90; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      const weekday = d.getDay();
      const base = weekday === 0 || weekday === 6 ? 320 : 520; // fim de semana menor
      const volume = Math.round(base + this._randn() * 45 + i * 1.1); // leve tendência de alta
      const tma = +(5.2 - i * 0.004 + this._randn() * 0.35).toFixed(2);
      const ader = +Math.min(100, Math.max(70, 88 + this._randn() * 4)).toFixed(1);
      const sat = +Math.min(5, Math.max(1, 4.1 + this._randn() * 0.4 - (tma - 5) * 0.3)).toFixed(2);
      const rech = +Math.max(0, 12 + (tma - 5) * 3 + this._randn() * 1.5).toFixed(1);
      rows.push([d, volume, tma, ader, sat, rech]);
    }
    // injeta 2 anomalias
    rows[40][1] = 1200; rows[65][2] = 11.5;
    this.ingest(headers, rows);
    NexusApp?.showToast?.('Dados de exemplo carregados (90 dias de operação)', 'success');
  },

  ingest(headers, rows) {
    // Detecta tipo de cada coluna
    const numericCols = [], dateCols = [];
    headers.forEach((h, c) => {
      let nums = 0, dates = 0, nonNull = 0;
      rows.forEach(r => {
        const v = r[c];
        if (v === null || v === undefined || v === '') return;
        nonNull++;
        if (v instanceof Date) dates++;
        else if (typeof v === 'number' || (!isNaN(parseFloat(v)) && isFinite(v))) nums++;
      });
      if (nonNull > 0 && dates / nonNull > 0.6) dateCols.push(c);
      else if (nonNull > 0 && nums / nonNull > 0.7) numericCols.push(c);
    });
    this.dataset = { headers, rows, numericCols, dateCols };
    this.activeTab = 'perfil';
    const badge = document.getElementById('as-dataset-badge');
    if (badge) badge.textContent = `${rows.length} linhas × ${headers.length} colunas`;
    // Re-render tabs active state
    this.container.querySelectorAll('.as-tab').forEach(b => b.classList.toggle('active', b.dataset.astab === 'perfil'));
    this.renderTab();
  },

  colValues(c) {
    return this.dataset.rows.map(r => r[c]);
  },
  numericValues(c) {
    return this.colValues(c).map(v => (v instanceof Date ? null : parseFloat(v))).filter(v => v !== null && !isNaN(v) && isFinite(v));
  },

  // ============ PERFIL ============
  viewPerfil() {
    const d = this.dataset;
    let rowsHtml = '';
    d.headers.forEach((h, c) => {
      const vals = this.colValues(c);
      const nonNull = vals.filter(v => v !== null && v !== undefined && v !== '');
      const nulls = vals.length - nonNull.length;
      const nullPct = ((nulls / vals.length) * 100).toFixed(1);
      const unique = new Set(nonNull.map(v => (v instanceof Date ? v.getTime() : v))).size;
      const type = d.dateCols.includes(c) ? 'data' : d.numericCols.includes(c) ? 'número' : 'texto';
      let extra = '—';
      if (d.numericCols.includes(c)) {
        const nv = this.numericValues(c);
        if (nv.length) extra = `min ${this._fmt(Math.min(...nv))} · média ${this._fmt(this._mean(nv))} · max ${this._fmt(Math.max(...nv))}`;
      } else if (d.dateCols.includes(c)) {
        const dts = nonNull.filter(v => v instanceof Date).map(v => v.getTime());
        if (dts.length) extra = `${new Date(Math.min(...dts)).toLocaleDateString('pt-BR')} → ${new Date(Math.max(...dts)).toLocaleDateString('pt-BR')}`;
      } else {
        extra = `${unique} valores distintos`;
      }
      const flag = /cpf|telefone|email|e-mail|matricula|matrícula|nome|endereco|endereço/i.test(h)
        ? '<span class="as-pii" title="Possível dado pessoal (LGPD)">⚠ PII</span>' : '';
      rowsHtml += `
        <tr>
          <td><strong>${window.escapeHtml(h)}</strong> ${flag}</td>
          <td><span class="as-type as-type-${type}">${type}</span></td>
          <td>${nonNull.length}</td>
          <td>${nulls} <span style="color:var(--text-tertiary)">(${nullPct}%)</span></td>
          <td>${unique}</td>
          <td style="font-size:12px;color:var(--text-secondary)">${extra}</td>
        </tr>`;
    });

    // índice de qualidade (completude + unicidade média simples)
    const totalCells = d.rows.length * d.headers.length;
    let filled = 0;
    d.rows.forEach(r => r.forEach(v => { if (v !== null && v !== undefined && v !== '') filled++; }));
    const completude = (filled / totalCells) * 100;
    const dupRows = d.rows.length - new Set(d.rows.map(r => JSON.stringify(r.map(v => v instanceof Date ? v.getTime() : v)))).size;
    const quality = Math.max(0, Math.min(100, completude - (dupRows / d.rows.length) * 20));
    const qLabel = quality >= 90 ? 'Excelente' : quality >= 75 ? 'Boa' : quality >= 60 ? 'Atenção' : 'Crítica';
    const qColor = quality >= 90 ? '#22c55e' : quality >= 75 ? '#84cc16' : quality >= 60 ? '#f59e0b' : '#ef4444';

    return `
      <div class="as-kpi-row">
        <div class="as-kpi"><div class="as-kpi-v">${d.rows.length}</div><div class="as-kpi-l">Linhas</div></div>
        <div class="as-kpi"><div class="as-kpi-v">${d.headers.length}</div><div class="as-kpi-l">Colunas</div></div>
        <div class="as-kpi"><div class="as-kpi-v">${completude.toFixed(1)}%</div><div class="as-kpi-l">Completude</div></div>
        <div class="as-kpi"><div class="as-kpi-v">${dupRows}</div><div class="as-kpi-l">Linhas duplicadas</div></div>
        <div class="as-kpi" style="border-color:${qColor}"><div class="as-kpi-v" style="color:${qColor}">${quality.toFixed(0)}</div><div class="as-kpi-l">Qualidade (${qLabel})</div></div>
      </div>
      <div class="as-card">
        <h3 style="margin-top:0;">Perfil das colunas</h3>
        <div style="overflow-x:auto;">
          <table class="as-table">
            <thead><tr><th>Coluna</th><th>Tipo</th><th>Preenchidos</th><th>Nulos</th><th>Distintos</th><th>Resumo</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    `;
  },

  // ============ ESTATÍSTICA DESCRITIVA ============
  viewEstatistica() {
    const opts = this.dataset.numericCols.map(c => `<option value="${c}">${window.escapeHtml(this.dataset.headers[c])}</option>`).join('');
    if (!opts) return '<div class="as-card">Nenhuma coluna numérica encontrada nesta base.</div>';
    return `
      <div class="as-card">
        <label class="as-label">Coluna numérica</label>
        <select id="as-stat-col" class="form-input" style="max-width:320px;">${opts}</select>
        <div id="as-stat-out" style="margin-top:20px;"></div>
      </div>
    `;
  },
  bindEstatistica() {
    const sel = document.getElementById('as-stat-col');
    const run = () => this.renderEstatistica(parseInt(sel.value));
    sel?.addEventListener('change', run);
    run();
  },
  renderEstatistica(c) {
    const v = this.numericValues(c).slice().sort((a, b) => a - b);
    const out = document.getElementById('as-stat-out');
    if (v.length < 2) { out.innerHTML = 'Dados insuficientes.'; return; }
    const n = v.length, mean = this._mean(v), sd = this._std(v), variance = sd * sd;
    const stat = [
      ['N', n], ['Soma', this._sum(v)], ['Média', mean], ['Mediana', this._percentile(v, 50)],
      ['Moda', this._mode(v)], ['Mínimo', v[0]], ['Máximo', v[n - 1]], ['Amplitude', v[n - 1] - v[0]],
      ['Variância', variance], ['Desvio padrão', sd], ['Coef. variação', mean !== 0 ? (sd / mean) * 100 : 0, '%'],
      ['Erro padrão', sd / Math.sqrt(n)], ['Q1 (25%)', this._percentile(v, 25)], ['Q3 (75%)', this._percentile(v, 75)],
      ['IQR', this._percentile(v, 75) - this._percentile(v, 25)],
      ['P90', this._percentile(v, 90)], ['P95', this._percentile(v, 95)],
      ['Assimetria', this._skewness(v)], ['Curtose', this._kurtosis(v)]
    ];
    // IC 95% da média (t aproximado por 1.96 para n grande, senão nota)
    const ciHalf = 1.96 * sd / Math.sqrt(n);
    const cards = stat.map(([l, val, suf]) => `
      <div class="as-stat-card"><div class="as-stat-l">${l}</div><div class="as-stat-v">${this._fmt(val)}${suf || ''}</div></div>
    `).join('');

    const skew = this._skewness(v);
    let interp = skew > 0.5 ? 'assimetria à direita (cauda de valores altos)' : skew < -0.5 ? 'assimetria à esquerda (cauda de valores baixos)' : 'aproximadamente simétrica';

    out.innerHTML = `
      <div class="as-stat-grid">${cards}</div>
      <div class="as-note" style="margin-top:14px;">
        IC 95% da média ≈ <strong>${this._fmt(mean)} ± ${this._fmt(ciHalf)}</strong> [${this._fmt(mean - ciHalf)}, ${this._fmt(mean + ciHalf)}].
        Distribuição ${interp}. CV de ${this._fmt(mean !== 0 ? (sd / mean) * 100 : 0)}% indica ${(sd / mean) > 0.3 ? 'alta' : 'baixa'} dispersão relativa.
      </div>
      <div class="as-card" style="margin-top:16px;"><canvas id="as-hist" height="90"></canvas></div>
    `;
    this._histogram('as-hist', v, this.dataset.headers[c]);
  },

  // ============ CORRELAÇÕES ============
  viewCorrelacao() {
    const cols = this.dataset.numericCols;
    if (cols.length < 2) return '<div class="as-card">São necessárias pelo menos 2 colunas numéricas.</div>';
    const m = cols.map(i => cols.map(j => this._pearson(this.pairedValues(i, j).x, this.pairedValues(i, j).y)));
    let html = '<div class="as-card"><h3 style="margin-top:0;">Matriz de correlação (Pearson)</h3><div style="overflow-x:auto;"><table class="as-table as-corr"><thead><tr><th></th>';
    cols.forEach(c => html += `<th>${window.escapeHtml(this.dataset.headers[c])}</th>`);
    html += '</tr></thead><tbody>';
    cols.forEach((ci, i) => {
      html += `<tr><th>${window.escapeHtml(this.dataset.headers[ci])}</th>`;
      cols.forEach((cj, j) => {
        const r = m[i][j];
        const bg = i === j ? 'transparent' : this._corrColor(r);
        html += `<td style="background:${bg};color:${Math.abs(r) > 0.5 && i !== j ? '#fff' : 'inherit'};cursor:pointer;" data-i="${ci}" data-j="${cj}">${i === j ? '1.00' : r.toFixed(2)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div><p class="as-note" style="margin-top:12px;">Clique numa célula para ver dispersão, R² e significância. <strong>Correlação não comprova causalidade.</strong></p></div>';
    html += '<div class="as-card" id="as-corr-detail" style="display:none;margin-top:16px;"></div>';
    return html;
  },
  renderCorrChart() {
    this.container.querySelectorAll('.as-corr td[data-i]').forEach(td => {
      td.addEventListener('click', () => this.showCorrDetail(parseInt(td.dataset.i), parseInt(td.dataset.j)));
    });
  },
  showCorrDetail(i, j) {
    if (i === j) return;
    const { x, y } = this.pairedValues(i, j);
    const r = this._pearson(x, y), n = x.length;
    const sig = this._corrSignificance(r, n);
    const box = document.getElementById('as-corr-detail');
    box.style.display = 'block';
    box.innerHTML = `
      <h3 style="margin-top:0;">${window.escapeHtml(this.dataset.headers[j])} × ${window.escapeHtml(this.dataset.headers[i])}</h3>
      <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:13px;margin-bottom:10px;">
        <span><strong>r</strong> = ${r.toFixed(3)}</span>
        <span><strong>R²</strong> = ${(r * r * 100).toFixed(1)}%</span>
        <span><strong>n</strong> = ${n}</span>
        <span><strong>p</strong> = ${sig.p == null ? '—' : sig.p < 0.001 ? '< 0,001' : sig.p.toFixed(3)}</span>
      </div>
      <div class="as-note" style="background:${sig.significant ? 'rgba(34,197,94,.1)' : 'rgba(245,158,11,.1)'};border-color:${sig.significant ? 'rgba(34,197,94,.3)' : 'rgba(245,158,11,.3)'}">
        ${sig.significant ? '✅ Estatisticamente significativa (p < 0,05): improvável ser acaso.' : `⚠️ Não significativa (p ≥ 0,05) com n=${n}: pode ser acaso.`}
      </div>
      <canvas id="as-scatter" height="100" style="margin-top:14px;"></canvas>
    `;
    this._scatter('as-scatter', x, y, this.dataset.headers[j], this.dataset.headers[i]);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },
  pairedValues(i, j) {
    const x = [], y = [];
    this.dataset.rows.forEach(r => {
      const a = parseFloat(r[i]), b = parseFloat(r[j]);
      if (!isNaN(a) && !isNaN(b) && isFinite(a) && isFinite(b)) { x.push(a); y.push(b); }
    });
    return { x, y };
  },

  // ============ MONTE CARLO ============
  viewMonteCarlo() {
    const opts = this.dataset.numericCols.map(c => `<option value="${c}">${window.escapeHtml(this.dataset.headers[c])}</option>`).join('');
    if (!opts) return '<div class="as-card">Nenhuma coluna numérica para simular.</div>';
    return `
      <div class="as-card">
        <h3 style="margin-top:0;">Simulação de Monte Carlo</h3>
        <p class="as-note" style="margin-top:0;">Reamostra a partir do histórico (bootstrap) ou da normal ajustada, projeta N cenários e calcula percentis e probabilidade de meta.</p>
        <div class="as-form-grid">
          <div><label class="as-label">Variável</label><select id="mc-col" class="form-input">${opts}</select></div>
          <div><label class="as-label">Método</label><select id="mc-method" class="form-input">
            <option value="bootstrap">Bootstrap (histórico)</option>
            <option value="normal">Normal ajustada</option>
          </select></div>
          <div><label class="as-label">Iterações</label><select id="mc-iter" class="form-input">
            <option>1000</option><option selected>10000</option><option>50000</option><option>100000</option>
          </select></div>
          <div><label class="as-label">Meta (≥)</label><input type="number" id="mc-meta" class="form-input" step="any" placeholder="opcional"></div>
        </div>
        <button class="btn btn-primary" id="mc-run" style="margin-top:14px;"><i class="fa-solid fa-play"></i> Rodar simulação</button>
        <div id="mc-out" style="margin-top:20px;"></div>
      </div>
    `;
  },
  bindMonteCarlo() {
    document.getElementById('mc-run')?.addEventListener('click', () => this.runMonteCarlo());
  },
  runMonteCarlo() {
    const c = parseInt(document.getElementById('mc-col').value);
    const method = document.getElementById('mc-method').value;
    const iter = parseInt(document.getElementById('mc-iter').value);
    const metaRaw = document.getElementById('mc-meta').value;
    const meta = metaRaw === '' ? null : parseFloat(metaRaw);
    const hist = this.numericValues(c);
    if (hist.length < 3) { NexusApp?.showToast?.('Poucos dados para simular', 'error'); return; }

    const mean = this._mean(hist), sd = this._std(hist);
    const sims = new Float64Array(iter);
    for (let k = 0; k < iter; k++) {
      sims[k] = method === 'normal' ? mean + this._randn() * sd : hist[(Math.random() * hist.length) | 0];
    }
    const sorted = Array.from(sims).sort((a, b) => a - b);
    const pct = p => sorted[Math.min(sorted.length - 1, Math.floor(p / 100 * sorted.length))];
    const simMean = this._mean(sorted), simSd = this._std(sorted);
    let probMeta = null;
    if (meta != null) probMeta = (sims.reduce((a, v) => a + (v >= meta ? 1 : 0), 0) / iter) * 100;

    const rows = [['P1', pct(1)], ['P5', pct(5)], ['P10', pct(10)], ['P25', pct(25)], ['P50 (mediana)', pct(50)], ['P75', pct(75)], ['P90', pct(90)], ['P95', pct(95)], ['P99', pct(99)]];
    document.getElementById('mc-out').innerHTML = `
      <div class="as-kpi-row">
        <div class="as-kpi"><div class="as-kpi-v">${this._fmt(simMean)}</div><div class="as-kpi-l">Média simulada</div></div>
        <div class="as-kpi"><div class="as-kpi-v">${this._fmt(simSd)}</div><div class="as-kpi-l">Desvio</div></div>
        <div class="as-kpi"><div class="as-kpi-v">${this._fmt(pct(5))}</div><div class="as-kpi-l">P5 (pior)</div></div>
        <div class="as-kpi"><div class="as-kpi-v">${this._fmt(pct(50))}</div><div class="as-kpi-l">P50 (central)</div></div>
        <div class="as-kpi"><div class="as-kpi-v">${this._fmt(pct(95))}</div><div class="as-kpi-l">P95 (melhor)</div></div>
        ${probMeta != null ? `<div class="as-kpi" style="border-color:var(--primary-500)"><div class="as-kpi-v" style="color:var(--primary-400)">${probMeta.toFixed(1)}%</div><div class="as-kpi-l">P(≥ meta)</div></div>` : ''}
      </div>
      <div class="as-card" style="margin-top:16px;"><canvas id="mc-hist" height="90"></canvas></div>
      <div style="overflow-x:auto;margin-top:12px;"><table class="as-table"><thead><tr><th>Percentil</th><th>Valor</th></tr></thead><tbody>
        ${rows.map(([l, val]) => `<tr><td>${l}</td><td>${this._fmt(val)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="as-note" style="margin-top:12px;">${iter.toLocaleString('pt-BR')} iterações · ${method === 'normal' ? 'Normal(μ,σ) ajustada' : 'Bootstrap do histórico'}. Previsão é probabilística, não certeza.</p>
    `;
    this._histogram('mc-hist', sorted, 'Distribuição simulada', meta);
  },

  // ============ PREVISÃO (série temporal) ============
  viewPrevisao() {
    const numOpts = this.dataset.numericCols.map(c => `<option value="${c}">${window.escapeHtml(this.dataset.headers[c])}</option>`).join('');
    const dateOpts = this.dataset.dateCols.map(c => `<option value="${c}">${window.escapeHtml(this.dataset.headers[c])}</option>`).join('');
    if (!numOpts) return '<div class="as-card">Nenhuma coluna numérica.</div>';
    return `
      <div class="as-card">
        <h3 style="margin-top:0;">Previsão de série temporal</h3>
        <p class="as-note" style="margin-top:0;">Compara Média Móvel, Suavização Exponencial (Holt) e Regressão Linear via backtest (últimos 20%), escolhe o melhor por RMSE e projeta à frente.</p>
        <div class="as-form-grid">
          ${dateOpts ? `<div><label class="as-label">Coluna de data (ordem)</label><select id="fc-date" class="form-input"><option value="">— usar ordem das linhas —</option>${dateOpts}</select></div>` : ''}
          <div><label class="as-label">Valor a prever</label><select id="fc-col" class="form-input">${numOpts}</select></div>
          <div><label class="as-label">Períodos à frente</label><input type="number" id="fc-h" class="form-input" value="14" min="1" max="90"></div>
        </div>
        <button class="btn btn-primary" id="fc-run" style="margin-top:14px;"><i class="fa-solid fa-chart-line"></i> Prever</button>
        <div id="fc-out" style="margin-top:20px;"></div>
      </div>
    `;
  },
  bindPrevisao() {
    document.getElementById('fc-run')?.addEventListener('click', () => this.runForecast());
  },
  runForecast() {
    const c = parseInt(document.getElementById('fc-col').value);
    const h = Math.max(1, Math.min(90, parseInt(document.getElementById('fc-h').value) || 14));
    const dateSel = document.getElementById('fc-date');
    let series;
    if (dateSel && dateSel.value !== '') {
      const dc = parseInt(dateSel.value);
      const paired = this.dataset.rows.map(r => ({ t: r[dc] instanceof Date ? r[dc].getTime() : null, v: parseFloat(r[c]) }))
        .filter(p => p.t !== null && !isNaN(p.v)).sort((a, b) => a.t - b.t);
      series = paired.map(p => p.v);
    } else {
      series = this.numericValues(c);
    }
    if (series.length < 10) { NexusApp?.showToast?.('Série muito curta (mín. 10 pontos)', 'error'); return; }

    const split = Math.floor(series.length * 0.8);
    const train = series.slice(0, split), test = series.slice(split);
    const models = {
      'Média Móvel': this._forecastMA(train, test.length, h),
      'Holt (exp.)': this._forecastHolt(train, test.length, h),
      'Regressão Linear': this._forecastLinear(train, test.length, h)
    };
    // escolhe o melhor por RMSE no teste
    let best = null;
    Object.entries(models).forEach(([name, m]) => {
      m.rmse = this._rmse(test, m.testPred);
      m.mape = this._mape(test, m.testPred);
      if (!best || m.rmse < best.rmse) best = { name, ...m };
    });
    // reajusta o melhor no dataset completo para projeção final
    const finalFit = best.name === 'Média Móvel' ? this._forecastMA(series, 0, h)
      : best.name === 'Holt (exp.)' ? this._forecastHolt(series, 0, h)
        : this._forecastLinear(series, 0, h);
    const resid = this._std(test.map((v, i) => v - best.testPred[i]));

    const cmp = Object.entries(models).map(([name, m]) => `
      <tr class="${name === best.name ? 'as-best' : ''}"><td>${name}${name === best.name ? ' ⭐' : ''}</td><td>${this._fmt(m.rmse)}</td><td>${this._fmt(m.mape)}%</td></tr>
    `).join('');

    document.getElementById('fc-out').innerHTML = `
      <div class="as-kpi-row">
        <div class="as-kpi" style="border-color:var(--primary-500)"><div class="as-kpi-v" style="font-size:18px;color:var(--primary-400)">${best.name}</div><div class="as-kpi-l">Melhor modelo</div></div>
        <div class="as-kpi"><div class="as-kpi-v">${this._fmt(best.rmse)}</div><div class="as-kpi-l">RMSE (teste)</div></div>
        <div class="as-kpi"><div class="as-kpi-v">${this._fmt(best.mape)}%</div><div class="as-kpi-l">MAPE (teste)</div></div>
        <div class="as-kpi"><div class="as-kpi-v">${this._fmt(finalFit.forecast[0])}</div><div class="as-kpi-l">Próximo período</div></div>
      </div>
      <div class="as-card" style="margin-top:16px;"><canvas id="fc-chart" height="90"></canvas></div>
      <div style="overflow-x:auto;margin-top:12px;"><table class="as-table"><thead><tr><th>Modelo</th><th>RMSE</th><th>MAPE</th></tr></thead><tbody>${cmp}</tbody></table></div>
      <p class="as-note" style="margin-top:12px;">Backtest nos últimos ${test.length} pontos. Faixa da previsão ≈ ±1,96·${this._fmt(resid)} (IC 95% aproximado). Previsão não é certeza.</p>
    `;
    this._forecastChart('fc-chart', series, finalFit.forecast, resid);
  },

  // ============ ANOMALIAS ============
  viewAnomalias() {
    const opts = this.dataset.numericCols.map(c => `<option value="${c}">${window.escapeHtml(this.dataset.headers[c])}</option>`).join('');
    if (!opts) return '<div class="as-card">Nenhuma coluna numérica.</div>';
    return `
      <div class="as-card">
        <h3 style="margin-top:0;">Detecção de anomalias</h3>
        <div class="as-form-grid">
          <div><label class="as-label">Coluna</label><select id="an-col" class="form-input">${opts}</select></div>
          <div><label class="as-label">Método</label><select id="an-method" class="form-input">
            <option value="zscore">Z-score (3σ)</option>
            <option value="robust">Z-score robusto (MAD)</option>
            <option value="iqr">IQR (1,5×)</option>
          </select></div>
        </div>
        <button class="btn btn-primary" id="an-run" style="margin-top:14px;"><i class="fa-solid fa-magnifying-glass"></i> Detectar</button>
        <div id="an-out" style="margin-top:20px;"></div>
      </div>
    `;
  },
  bindAnomalias() {
    document.getElementById('an-run')?.addEventListener('click', () => this.runAnomalias());
  },
  runAnomalias() {
    const c = parseInt(document.getElementById('an-col').value);
    const method = document.getElementById('an-method').value;
    const rows = this.dataset.rows;
    const vals = rows.map(r => parseFloat(r[c]));
    const clean = vals.filter(v => !isNaN(v) && isFinite(v));
    if (clean.length < 5) { NexusApp?.showToast?.('Poucos dados', 'error'); return; }

    let isAnom, desc;
    if (method === 'iqr') {
      const s = clean.slice().sort((a, b) => a - b);
      const q1 = this._percentile(s, 25), q3 = this._percentile(s, 75), iqr = q3 - q1;
      const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
      isAnom = v => v < lo || v > hi; desc = `Fora de [${this._fmt(lo)}, ${this._fmt(hi)}]`;
    } else if (method === 'robust') {
      const med = this._percentile(clean.slice().sort((a, b) => a - b), 50);
      const mad = this._percentile(clean.map(v => Math.abs(v - med)).sort((a, b) => a - b), 50) * 1.4826 || 1e-9;
      isAnom = v => Math.abs((v - med) / mad) > 3.5; desc = `|Z robusto| > 3,5 (mediana ${this._fmt(med)})`;
    } else {
      const m = this._mean(clean), sd = this._std(clean) || 1e-9;
      isAnom = v => Math.abs((v - m) / sd) > 3; desc = `|Z| > 3 (média ${this._fmt(m)}, σ ${this._fmt(sd)})`;
    }

    const found = [];
    rows.forEach((r, idx) => {
      const v = parseFloat(r[c]);
      if (!isNaN(v) && isFinite(v) && isAnom(v)) found.push({ idx: idx + 1, v });
    });

    const list = found.length === 0 ? '<p class="as-note">Nenhuma anomalia detectada com este método. ✅</p>'
      : `<div style="overflow-x:auto;"><table class="as-table"><thead><tr><th>Linha</th><th>Valor</th></tr></thead><tbody>
          ${found.slice(0, 100).map(f => `<tr><td>#${f.idx}</td><td style="color:#ef4444;font-weight:600;">${this._fmt(f.v)}</td></tr>`).join('')}
        </tbody></table>${found.length > 100 ? `<p class="as-note">Mostrando 100 de ${found.length}.</p>` : ''}</div>`;

    document.getElementById('an-out').innerHTML = `
      <div class="as-kpi-row">
        <div class="as-kpi" style="border-color:${found.length ? '#ef4444' : '#22c55e'}"><div class="as-kpi-v" style="color:${found.length ? '#ef4444' : '#22c55e'}">${found.length}</div><div class="as-kpi-l">Anomalias</div></div>
        <div class="as-kpi"><div class="as-kpi-v">${((found.length / clean.length) * 100).toFixed(1)}%</div><div class="as-kpi-l">do total</div></div>
      </div>
      <p class="as-note">Critério: ${desc}</p>
      <div class="as-card" style="margin-top:12px;"><canvas id="an-chart" height="80"></canvas></div>
      ${list}
    `;
    this._anomalyChart('an-chart', vals, found.map(f => f.idx - 1), this.dataset.headers[c]);
  },

  // ============ MÉTODOS ESTATÍSTICOS ============
  _sum(a) { return a.reduce((s, v) => s + v, 0); },
  _mean(a) { return a.length ? this._sum(a) / a.length : 0; },
  _std(a) { if (a.length < 2) return 0; const m = this._mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); },
  _percentile(sorted, p) { if (!sorted.length) return 0; const idx = (p / 100) * (sorted.length - 1); const lo = Math.floor(idx), hi = Math.ceil(idx); return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo); },
  _mode(a) { const f = {}; let best = a[0], bc = 0; a.forEach(v => { f[v] = (f[v] || 0) + 1; if (f[v] > bc) { bc = f[v]; best = v; } }); return best; },
  _skewness(a) { const n = a.length, m = this._mean(a), s = this._std(a); if (s === 0) return 0; return (n / ((n - 1) * (n - 2))) * a.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0); },
  _kurtosis(a) { const n = a.length, m = this._mean(a), s = this._std(a); if (s === 0 || n < 4) return 0; const t = a.reduce((acc, v) => acc + ((v - m) / s) ** 4, 0); return (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * t - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3)); },
  _pearson(x, y) { const n = Math.min(x.length, y.length); if (n < 2) return 0; const mx = this._mean(x), my = this._mean(y); let num = 0, dx = 0, dy = 0; for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; num += a * b; dx += a * a; dy += b * b; } return num / Math.sqrt(dx * dy) || 0; },
  _randn() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
  _fmt(v) { if (v == null || isNaN(v)) return '—'; if (!isFinite(v)) return '∞'; const a = Math.abs(v); if (a !== 0 && (a < 0.01 || a >= 1e6)) return v.toExponential(2); return (+v.toFixed(a >= 100 ? 1 : 3)).toLocaleString('pt-BR'); },
  _corrColor(r) { const a = Math.abs(r); const c = r > 0 ? [47, 111, 237] : [239, 68, 68]; return `rgba(${c[0]},${c[1]},${c[2]},${(a * 0.85).toFixed(2)})`; },

  // significância de Pearson via t de Student (reusa a lógica do NexusTools se existir)
  _corrSignificance(r, n) {
    if (window.NexusTools?.correlationSignificance) {
      const s = NexusTools.correlationSignificance(r, n);
      return { ...s, significant: s.p != null && s.p < 0.05 };
    }
    const r2 = r * r; if (n < 3 || r2 >= 1) return { p: r2 >= 1 ? 0 : null, significant: r2 >= 1 };
    const df = n - 2, t = Math.abs(r) * Math.sqrt(df / (1 - r2));
    const p = this._studentP(t, df);
    return { p, significant: p < 0.05 };
  },
  _studentP(t, df) { const x = df / (df + t * t); return this._betai(df / 2, 0.5, x); },
  _betai(a, b, x) { if (x <= 0) return 0; if (x >= 1) return 1; const lb = this._gammaln(a + b) - this._gammaln(a) - this._gammaln(b); const bt = Math.exp(lb + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * this._betacf(a, b, x) / a : 1 - bt * this._betacf(b, a, 1 - x) / b; },
  _betacf(a, b, x) { const MAXIT = 200, EPS = 3e-12, FPMIN = 1e-300; const qab = a + b, qap = a + 1, qam = a - 1; let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d; for (let m = 1; m <= MAXIT; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c; aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < EPS) break; } return h; },
  _gammaln(x) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp); let ser = 1.000000000190015; for (let j = 0; j < 6; j++) { y++; ser += c[j] / y; } return -tmp + Math.log(2.5066282746310005 * ser / x); },

  // forecast helpers — retorna { testPred, forecast }
  _forecastMA(train, testLen, h) {
    const w = Math.max(2, Math.min(7, Math.floor(train.length / 4)));
    const full = train.slice();
    const testPred = [];
    for (let i = 0; i < testLen; i++) { const win = full.slice(-w); testPred.push(this._mean(win)); full.push(train[train.length - testLen + i]); }
    const fc = []; const base = train.slice();
    for (let i = 0; i < h; i++) { const win = base.slice(-w); const v = this._mean(win); fc.push(v); base.push(v); }
    return { testPred, forecast: fc };
  },
  _forecastHolt(train, testLen, h) {
    const alpha = 0.4, beta = 0.2;
    const fit = (arr) => { let level = arr[0], trend = arr[1] - arr[0]; for (let i = 1; i < arr.length; i++) { const prev = level; level = alpha * arr[i] + (1 - alpha) * (level + trend); trend = beta * (level - prev) + (1 - beta) * trend; } return { level, trend }; };
    const testPred = [];
    for (let i = 0; i < testLen; i++) { const { level, trend } = fit(train.slice(0, train.length - testLen + i)); testPred.push(level + trend); }
    const { level, trend } = fit(train);
    const fc = []; for (let i = 1; i <= h; i++) fc.push(level + trend * i);
    return { testPred, forecast: fc };
  },
  _forecastLinear(train, testLen, h) {
    const fitLine = (arr) => { const n = arr.length; let sx = 0, sy = 0, sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sx += i; sy += arr[i]; sxy += i * arr[i]; sxx += i * i; } const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1); const inter = (sy - slope * sx) / n; return { slope, inter, n }; };
    const testPred = [];
    for (let i = 0; i < testLen; i++) { const sub = train.slice(0, train.length - testLen + i); const { slope, inter, n } = fitLine(sub); testPred.push(inter + slope * n); }
    const { slope, inter, n } = fitLine(train);
    const fc = []; for (let i = 0; i < h; i++) fc.push(inter + slope * (n + i));
    return { testPred, forecast: fc };
  },
  _rmse(actual, pred) { const n = Math.min(actual.length, pred.length); if (!n) return Infinity; let s = 0; for (let i = 0; i < n; i++) s += (actual[i] - pred[i]) ** 2; return Math.sqrt(s / n); },
  _mape(actual, pred) { const n = Math.min(actual.length, pred.length); let s = 0, c = 0; for (let i = 0; i < n; i++) { if (actual[i] !== 0) { s += Math.abs((actual[i] - pred[i]) / actual[i]); c++; } } return c ? (s / c) * 100 : 0; },

  // ============ GRÁFICOS ============
  _chartOpts(extra = {}) {
    const grid = 'rgba(255,255,255,0.06)', tick = '#8fa6c6';
    return { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: tick } } }, scales: { x: { ticks: { color: tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, grid: { color: grid } }, y: { ticks: { color: tick }, grid: { color: grid } } }, ...extra };
  },
  _histogram(id, values, label, meta) {
    const ctx = document.getElementById(id); if (!ctx || typeof Chart === 'undefined') return;
    const bins = Math.min(30, Math.max(8, Math.ceil(Math.sqrt(values.length))));
    const min = values[0] ?? Math.min(...values), max = values[values.length - 1] ?? Math.max(...values);
    const w = (max - min) / bins || 1; const counts = new Array(bins).fill(0); const labels = [];
    for (let i = 0; i < bins; i++) labels.push(this._fmt(min + w * (i + 0.5)));
    values.forEach(v => { let b = Math.floor((v - min) / w); if (b >= bins) b = bins - 1; if (b < 0) b = 0; counts[b]++; });
    this.charts[id] = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label, data: counts, backgroundColor: 'rgba(117,85,232,0.55)', borderRadius: 3 }] }, options: this._chartOpts() });
  },
  _scatter(id, x, y, xl, yl) {
    const ctx = document.getElementById(id); if (!ctx || typeof Chart === 'undefined') return;
    const pts = x.map((v, i) => ({ x: v, y: y[i] }));
    // linha de tendência
    const n = x.length; let sx = 0, sy = 0, sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; sxy += x[i] * y[i]; sxx += x[i] * x[i]; }
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1), inter = (sy - slope * sx) / n;
    const xmin = Math.min(...x), xmax = Math.max(...x);
    this.charts[id] = new Chart(ctx, { type: 'scatter', data: { datasets: [{ label: 'Dados', data: pts, backgroundColor: 'rgba(47,111,237,0.6)' }, { label: 'Tendência', type: 'line', data: [{ x: xmin, y: inter + slope * xmin }, { x: xmax, y: inter + slope * xmax }], borderColor: '#ef4444', borderWidth: 2, pointRadius: 0 }] }, options: this._chartOpts({ scales: { x: { title: { display: true, text: xl, color: '#8fa6c6' }, ticks: { color: '#8fa6c6' }, grid: { color: 'rgba(255,255,255,0.06)' } }, y: { title: { display: true, text: yl, color: '#8fa6c6' }, ticks: { color: '#8fa6c6' }, grid: { color: 'rgba(255,255,255,0.06)' } } } }) });
  },
  _forecastChart(id, history, forecast, resid) {
    const ctx = document.getElementById(id); if (!ctx || typeof Chart === 'undefined') return;
    const labels = history.map((_, i) => i + 1).concat(forecast.map((_, i) => history.length + i + 1));
    const histData = history.concat(new Array(forecast.length).fill(null));
    const fcData = new Array(history.length).fill(null).concat(forecast);
    const hi = new Array(history.length).fill(null).concat(forecast.map(v => v + 1.96 * resid));
    const lo = new Array(history.length).fill(null).concat(forecast.map(v => v - 1.96 * resid));
    // conecta
    fcData[history.length - 1] = history[history.length - 1];
    this.charts[id] = new Chart(ctx, { type: 'line', data: { labels, datasets: [
      { label: 'Histórico', data: histData, borderColor: '#2f6fed', backgroundColor: 'transparent', tension: 0.2, pointRadius: 0 },
      { label: 'Previsão', data: fcData, borderColor: '#22c55e', borderDash: [6, 4], backgroundColor: 'transparent', tension: 0.2, pointRadius: 0 },
      { label: 'IC 95% sup', data: hi, borderColor: 'rgba(34,197,94,0.25)', backgroundColor: 'rgba(34,197,94,0.08)', fill: '+1', pointRadius: 0, borderWidth: 1 },
      { label: 'IC 95% inf', data: lo, borderColor: 'rgba(34,197,94,0.25)', backgroundColor: 'transparent', pointRadius: 0, borderWidth: 1 }
    ] }, options: this._chartOpts() });
  },
  _anomalyChart(id, vals, anomIdx, label) {
    const ctx = document.getElementById(id); if (!ctx || typeof Chart === 'undefined') return;
    const set = new Set(anomIdx);
    const pts = vals.map((v, i) => (isNaN(v) ? null : v));
    const anomPts = vals.map((v, i) => (set.has(i) ? v : null));
    this.charts[id] = new Chart(ctx, { type: 'line', data: { labels: vals.map((_, i) => i + 1), datasets: [
      { label, data: pts, borderColor: '#2f6fed', backgroundColor: 'transparent', tension: 0.1, pointRadius: 0 },
      { label: 'Anomalia', data: anomPts, borderColor: 'transparent', backgroundColor: '#ef4444', pointRadius: 5, showLine: false }
    ] }, options: this._chartOpts() });
  },

  injectStyles() {
    if (document.getElementById('as-style')) return;
    const s = document.createElement('style');
    s.id = 'as-style';
    s.textContent = `
      .as-page { padding: 20px; max-width: 1200px; margin: 0 auto; }
      .as-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:18px; }
      .as-badge { background: var(--surface-elevated); border:1px solid var(--surface-border); color:var(--text-secondary); font-size:12px; font-weight:600; padding:7px 14px; border-radius:20px; }
      .as-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:20px; background:var(--surface-card); border:1px solid var(--surface-border); padding:6px; border-radius:14px; }
      .as-tab { padding:9px 16px; border:none; background:transparent; color:var(--text-secondary); font-size:13px; font-weight:600; border-radius:9px; cursor:pointer; transition:all .2s; }
      .as-tab:hover { color:var(--text-primary); background:var(--surface-hover); }
      .as-tab.active { background:linear-gradient(135deg,var(--primary-500),var(--accent-500)); color:#fff; }
      .as-card { background:var(--surface-card); border:1px solid var(--surface-border); border-radius:16px; padding:22px; }
      .as-upload { border:2px dashed var(--surface-border); border-radius:14px; padding:36px; text-align:center; cursor:pointer; transition:all .2s; }
      .as-upload:hover, .as-upload.dragover { border-color:var(--primary-500); background:rgba(117,85,232,0.05); }
      .as-label { display:block; font-size:12px; font-weight:600; color:var(--text-tertiary); margin-bottom:6px; text-transform:uppercase; letter-spacing:.4px; }
      .as-form-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; }
      .as-kpi-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:12px; margin-bottom:16px; }
      .as-kpi { background:var(--surface-card); border:1px solid var(--surface-border); border-radius:12px; padding:14px; text-align:center; }
      .as-kpi-v { font-size:22px; font-weight:700; color:var(--text-primary); line-height:1.1; }
      .as-kpi-l { font-size:11px; color:var(--text-tertiary); margin-top:4px; }
      .as-table { width:100%; border-collapse:collapse; font-size:13px; }
      .as-table th { text-align:left; padding:10px 12px; font-size:11px; text-transform:uppercase; color:var(--text-tertiary); border-bottom:1px solid var(--surface-border); font-weight:600; }
      .as-table td { padding:9px 12px; border-bottom:1px solid rgba(255,255,255,0.04); color:var(--text-primary); }
      .as-corr th, .as-corr td { text-align:center; }
      .as-type { font-size:11px; font-weight:600; padding:2px 8px; border-radius:10px; }
      .as-type-número { background:rgba(47,111,237,.15); color:#6ea8ff; }
      .as-type-data { background:rgba(139,92,246,.15); color:#b794ff; }
      .as-type-texto { background:rgba(148,163,184,.15); color:#94a3b8; }
      .as-pii { font-size:10px; color:#f59e0b; font-weight:700; margin-left:6px; }
      .as-stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; }
      .as-stat-card { background:var(--surface-elevated); border:1px solid var(--surface-border); border-radius:10px; padding:12px; }
      .as-stat-l { font-size:11px; color:var(--text-tertiary); }
      .as-stat-v { font-size:16px; font-weight:700; color:var(--text-primary); margin-top:3px; }
      .as-note { font-size:12.5px; color:var(--text-secondary); line-height:1.5; padding:10px 14px; border-radius:10px; background:var(--surface-elevated); border:1px solid var(--surface-border); }
      .as-best td { background:rgba(34,197,94,0.08); font-weight:600; }
    `;
    document.head.appendChild(s);
  }
};

window.NepAnalyticsStudio = NepAnalyticsStudio;
