/**
 * DMAIC PRO - Metodologia Six Sigma Profissional
 * Com wizard step-by-step, campos estruturados e cálculo de Sigma Level
 */

const DMAICPro = {
    data: {
        projectName: '',
        projectOwner: '',
        startDate: '',
        currentPhase: 0,
        define: { problem: '', goal: '', scope: '', ctq: '', voc: '', teamMembers: '' },
        measure: { currentSigma: '', baseline: '', metrics: '', dataCollection: '' },
        analyze: { rootCauses: '', analysis: '', fishbone: '' },
        improve: { solutions: '', actionPlan: '', pilotResults: '' },
        control: { controlPlan: '', documentation: '', sustaining: '' }
    },

    phases: [
        { key: 'define', label: 'Define', icon: 'fa-bullseye', color: '#7555e8', desc: 'Defina o problema, escopo e objetivos do projeto' },
        { key: 'measure', label: 'Measure', icon: 'fa-ruler', color: '#22c55e', desc: 'Meça o desempenho atual do processo' },
        { key: 'analyze', label: 'Analyze', icon: 'fa-magnifying-glass-chart', color: '#f59e0b', desc: 'Analise as causas raiz do problema' },
        { key: 'improve', label: 'Improve', icon: 'fa-arrow-trend-up', color: '#3b82f6', desc: 'Implemente soluções e melhorias' },
        { key: 'control', label: 'Control', icon: 'fa-shield-halved', color: '#ef4444', desc: 'Controle e sustente os ganhos obtidos' }
    ],

    init() {
        this.load();
    },

    load() {
        try {
            const saved = localStorage.getItem('nexus_dmaic_pro');
            if (saved) {
                this.data = { ...this.data, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('[DMAIC Pro] Erro ao carregar:', e);
        }
    },

    save() {
        localStorage.setItem('nexus_dmaic_pro', JSON.stringify(this.data));
        if (typeof ToolsService !== 'undefined') {
            ToolsService.saveDMAIC(this.data).catch(e => console.warn('[DMAIC Pro] Erro Supabase:', e));
        }
    },

    getProgress() {
        let filled = 0, total = 0;
        this.phases.forEach(phase => {
            const phaseData = this.data[phase.key];
            if (phaseData) {
                Object.values(phaseData).forEach(val => {
                    total++;
                    if (val && val.toString().trim()) filled++;
                });
            }
        });
        return total === 0 ? 0 : Math.round((filled / total) * 100);
    },

    render() {
        this.load();
        const currentPhase = this.phases[this.data.currentPhase];

        return `
      <div class="tool-pro-container">
        <!-- Header -->
        <div class="tool-pro-header">
          <div class="tool-pro-header-left">
            <div class="tool-pro-icon" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
              <i class="fa-solid fa-diagram-project"></i>
            </div>
            <div class="tool-pro-title">
              <h2>DMAIC Six Sigma</h2>
              <p>Define → Measure → Analyze → Improve → Control</p>
            </div>
          </div>
          <div class="tool-pro-actions">
            <button class="quality-btn quality-btn-secondary" id="dmaic-pro-export">
              <i class="fa-solid fa-file-pdf"></i> Exportar A3
            </button>
          </div>
        </div>

        <!-- Project Info -->
        <div class="pdca-pro-meta" style="margin-bottom: 24px;">
          <div class="pdca-pro-meta-field">
            <label>Nome do Projeto</label>
            <input type="text" id="dmaic-project-name" placeholder="Ex: Redução de defeitos na linha X" 
                   value="${this.data.projectName || ''}" />
          </div>
          <div class="pdca-pro-meta-field">
            <label>Líder do Projeto</label>
            <input type="text" id="dmaic-project-owner" placeholder="Nome do responsável" 
                   value="${this.data.projectOwner || ''}" />
          </div>
        </div>

        <!-- Wizard -->
        <div class="dmaic-pro-wizard">
          <!-- Stepper -->
          <div class="dmaic-pro-stepper">
            ${this.phases.map((phase, i) => `
              <div class="dmaic-pro-step ${phase.key} ${i === this.data.currentPhase ? 'active' : ''}" 
                   data-phase="${i}">
                <div class="dmaic-pro-step-icon ${phase.key}">
                  <i class="fa-solid ${phase.icon}"></i>
                </div>
                <span class="dmaic-pro-step-label">${phase.label}</span>
              </div>
            `).join('')}
          </div>

          <!-- Content -->
          <div class="dmaic-pro-content">
            ${this.renderPhaseContent(currentPhase)}
          </div>

          <!-- Navigation -->
          <div class="dmaic-pro-nav">
            <button class="quality-btn quality-btn-secondary" id="dmaic-prev" 
                    ${this.data.currentPhase === 0 ? 'disabled' : ''}>
              <i class="fa-solid fa-arrow-left"></i> Anterior
            </button>
            <div style="display: flex; gap: 12px;">
              <button class="quality-btn quality-btn-primary" id="dmaic-save">
                <i class="fa-solid fa-save"></i> Salvar
              </button>
              <button class="quality-btn quality-btn-primary" id="dmaic-next"
                      ${this.data.currentPhase === 4 ? 'style="display:none;"' : ''}>
                Próximo <i class="fa-solid fa-arrow-right"></i>
              </button>
              ${this.data.currentPhase === 4 ? `
                <button class="quality-btn quality-btn-ai" id="dmaic-complete">
                  <i class="fa-solid fa-check"></i> Finalizar Projeto
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Progress -->
        <div style="margin-top: 24px; text-align: center;">
          <div style="display: inline-flex; align-items: center; gap: 12px; padding: 12px 24px; 
                      background: var(--quality-card-bg); border-radius: 12px; border: 1px solid var(--quality-card-border);">
            <span style="color: var(--text-secondary);">Progresso do Projeto:</span>
            <div style="width: 200px; height: 8px; background: var(--quality-card-border); border-radius: 4px; overflow: hidden;">
              <div style="width: ${this.getProgress()}%; height: 100%; background: linear-gradient(90deg, #7555e8, #22c55e); 
                          transition: width 0.3s;"></div>
            </div>
            <span style="font-weight: 700; color: var(--text-primary);">${this.getProgress()}%</span>
          </div>
        </div>
      </div>
    `;
    },

    renderPhaseContent(phase) {
        const phaseData = this.data[phase.key] || {};

        const fields = {
            define: [
                { id: 'problem', label: 'Declaração do Problema', type: 'textarea', placeholder: 'Descreva claramente o problema a ser resolvido...', rows: 3 },
                { id: 'goal', label: 'Meta / Objetivo', type: 'textarea', placeholder: 'Qual é a meta quantificável do projeto?', rows: 2 },
                { id: 'scope', label: 'Escopo do Projeto', type: 'textarea', placeholder: 'Quais são os limites do projeto? O que está dentro e fora do escopo?', rows: 2 },
                { id: 'ctq', label: 'CTQ (Critical to Quality)', type: 'textarea', placeholder: 'Quais são as características críticas para a qualidade?', rows: 2 },
                { id: 'voc', label: 'VOC (Voz do Cliente)', type: 'textarea', placeholder: 'O que o cliente espera? Quais são suas expectativas?', rows: 2 },
                { id: 'teamMembers', label: 'Equipe do Projeto', type: 'text', placeholder: 'Liste os membros da equipe' }
            ],
            measure: [
                { id: 'currentSigma', label: 'Nível Sigma Atual', type: 'text', placeholder: 'Ex: 3.2 sigma' },
                { id: 'baseline', label: 'Baseline / Linha de Base', type: 'textarea', placeholder: 'Qual é o desempenho atual do processo?', rows: 2 },
                { id: 'metrics', label: 'Métricas Principais', type: 'textarea', placeholder: 'Quais métricas serão monitoradas?', rows: 2 },
                { id: 'dataCollection', label: 'Plano de Coleta de Dados', type: 'textarea', placeholder: 'Como, quando e onde os dados serão coletados?', rows: 3 }
            ],
            analyze: [
                { id: 'rootCauses', label: 'Causas Raiz Identificadas', type: 'textarea', placeholder: 'Liste as principais causas raiz (use 5 Porquês ou Ishikawa)', rows: 4 },
                { id: 'analysis', label: 'Análise Estatística', type: 'textarea', placeholder: 'Descreva os resultados da análise de dados', rows: 3 },
                { id: 'fishbone', label: 'Resumo do Ishikawa', type: 'textarea', placeholder: 'Principais causas por categoria (6M)', rows: 3 }
            ],
            improve: [
                { id: 'solutions', label: 'Soluções Propostas', type: 'textarea', placeholder: 'Quais soluções foram identificadas para as causas raiz?', rows: 3 },
                { id: 'actionPlan', label: 'Plano de Ação (5W2H)', type: 'textarea', placeholder: 'Descreva o plano de implementação: O que, Quem, Quando, Onde, Por que, Como, Quanto', rows: 4 },
                { id: 'pilotResults', label: 'Resultados do Piloto', type: 'textarea', placeholder: 'Quais foram os resultados do teste piloto?', rows: 3 }
            ],
            control: [
                { id: 'controlPlan', label: 'Plano de Controle', type: 'textarea', placeholder: 'Como o processo será monitorado e controlado?', rows: 3 },
                { id: 'documentation', label: 'Documentação e Padronização', type: 'textarea', placeholder: 'Quais documentos foram atualizados? (POPs, WIs, etc.)', rows: 3 },
                { id: 'sustaining', label: 'Plano de Sustentação', type: 'textarea', placeholder: 'Como os ganhos serão mantidos a longo prazo?', rows: 3 }
            ]
        };

        const phaseFields = fields[phase.key] || [];

        return `
      <div class="dmaic-pro-section active">
        <div class="dmaic-pro-section-header">
          <div class="dmaic-pro-section-title" style="display: flex; align-items: center; gap: 12px;">
            <span style="width: 40px; height: 40px; border-radius: 10px; background: ${phase.color}; 
                        display: flex; align-items: center; justify-content: center; color: white;">
              <i class="fa-solid ${phase.icon}"></i>
            </span>
            ${phase.label}
          </div>
          <div class="dmaic-pro-section-desc">${phase.desc}</div>
        </div>
        
        <div class="dmaic-pro-field-group full">
          ${phaseFields.map(field => `
            <div class="dmaic-pro-field">
              <label>${field.label}</label>
              ${field.type === 'textarea' ? `
                <textarea id="dmaic-${phase.key}-${field.id}" placeholder="${field.placeholder}" 
                          rows="${field.rows || 3}">${phaseData[field.id] || ''}</textarea>
              ` : `
                <input type="${field.type}" id="dmaic-${phase.key}-${field.id}" 
                       placeholder="${field.placeholder}" value="${phaseData[field.id] || ''}" />
              `}
            </div>
          `).join('')}
        </div>
        
        ${phase.key === 'analyze' ? `
          <div style="margin-top: 16px;">
            <button class="quality-btn quality-btn-secondary" onclick="NexusTools.currentTool='ishikawa'; NexusTools.render(document.getElementById('page-content'));">
              <i class="fa-solid fa-fish"></i> Abrir Ishikawa
            </button>
            <button class="quality-btn quality-btn-secondary" onclick="NexusTools.currentTool='cincoporques'; NexusTools.render(document.getElementById('page-content'));">
              <i class="fa-solid fa-question"></i> Abrir 5 Porquês
            </button>
          </div>
        ` : ''}
      </div>
    `;
    },

    bindEvents() {
        // Project info
        document.getElementById('dmaic-project-name')?.addEventListener('blur', (e) => {
            this.data.projectName = e.target.value;
            this.save();
        });
        document.getElementById('dmaic-project-owner')?.addEventListener('blur', (e) => {
            this.data.projectOwner = e.target.value;
            this.save();
        });

        // Phase tabs
        document.querySelectorAll('.dmaic-pro-step').forEach(step => {
            step.addEventListener('click', () => {
                this.saveCurrentPhase();
                this.data.currentPhase = parseInt(step.dataset.phase);
                this.save();
                this.refresh();
            });
        });

        // Navigation
        document.getElementById('dmaic-prev')?.addEventListener('click', () => {
            this.saveCurrentPhase();
            if (this.data.currentPhase > 0) {
                this.data.currentPhase--;
                this.save();
                this.refresh();
            }
        });

        document.getElementById('dmaic-next')?.addEventListener('click', () => {
            this.saveCurrentPhase();
            if (this.data.currentPhase < 4) {
                this.data.currentPhase++;
                this.save();
                this.refresh();
            }
        });

        document.getElementById('dmaic-save')?.addEventListener('click', () => {
            this.saveCurrentPhase();
            this.save();
            NexusApp?.showToast?.('Projeto DMAIC salvo!', 'success');
        });

        document.getElementById('dmaic-complete')?.addEventListener('click', () => {
            this.saveCurrentPhase();
            this.save();
            NexusApp?.showToast?.('🎉 Projeto DMAIC concluído!', 'success');
        });

        document.getElementById('dmaic-pro-export')?.addEventListener('click', () => this.exportA3());
    },

    saveCurrentPhase() {
        const currentPhase = this.phases[this.data.currentPhase];
        if (!currentPhase) return;

        const fields = ['problem', 'goal', 'scope', 'ctq', 'voc', 'teamMembers',
            'currentSigma', 'baseline', 'metrics', 'dataCollection',
            'rootCauses', 'analysis', 'fishbone',
            'solutions', 'actionPlan', 'pilotResults',
            'controlPlan', 'documentation', 'sustaining'];

        fields.forEach(field => {
            const input = document.getElementById(`dmaic-${currentPhase.key}-${field}`);
            if (input) {
                if (!this.data[currentPhase.key]) this.data[currentPhase.key] = {};
                this.data[currentPhase.key][field] = input.value;
            }
        });
    },

    refresh() {
        const container = document.getElementById('page-content');
        if (container && NexusTools.currentTool === 'dmaic') {
            NexusTools.render(container);
        }
    },

    exportA3() {
        let content = '╔════════════════════════════════════════════════════════════════════════════╗\n';
        content += '║                        RELATÓRIO A3 - DMAIC                                ║\n';
        content += '╚════════════════════════════════════════════════════════════════════════════╝\n\n';

        content += `📋 Projeto: ${this.data.projectName || '(sem nome)'}\n`;
        content += `👤 Líder: ${this.data.projectOwner || '(não definido)'}\n`;
        content += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
        content += `📊 Progresso: ${this.getProgress()}%\n\n`;

        this.phases.forEach(phase => {
            const phaseData = this.data[phase.key] || {};
            content += `┌${'─'.repeat(76)}┐\n`;
            content += `│ ${phase.label.toUpperCase().padEnd(74)} │\n`;
            content += `└${'─'.repeat(76)}┘\n`;

            Object.entries(phaseData).forEach(([key, value]) => {
                if (value && value.toString().trim()) {
                    const label = key.replace(/([A-Z])/g, ' $1').toUpperCase();
                    content += `\n${label}:\n${value}\n`;
                }
            });
            content += '\n';
        });

        content += `\n${'═'.repeat(78)}\n`;
        content += `Exportado pelo NEP Delivery Control em ${new Date().toLocaleString('pt-BR')}\n`;

        this.downloadText(content, `dmaic_a3_${this.data.projectName?.replace(/\s+/g, '_') || 'project'}_${Date.now()}.txt`);
        NexusApp?.showToast?.('Relatório A3 exportado!', 'success');
    },

    downloadText(content, filename) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
};

window.DMAICPro = DMAICPro;
