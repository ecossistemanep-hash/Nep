/**
 * QUALITY EXPORT UTILS - Utilitários de Export PDF/PNG
 * Funções compartilhadas para exportar ferramentas de qualidade
 */

const QualityExport = {
    /**
     * Export container to PDF
     */
    async toPDF(selector, filename, title) {
        if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
            NexusApp?.showToast?.('Biblioteca PDF não carregada. Exportando como TXT...', 'warning');
            return false;
        }

        try {
            NexusApp?.showToast?.('📄 Gerando PDF...', 'info');

            const element = document.querySelector(selector);
            if (!element) throw new Error('Elemento não encontrado');

            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#0a0f1e',
                logging: false,
                useCORS: true
            });

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');

            const imgWidth = 190;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Title
            pdf.setFontSize(18);
            pdf.setTextColor(100, 100, 100);
            pdf.text(title || 'NEP Quality Tool', 10, 15);

            // Date
            pdf.setFontSize(10);
            pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 10, 22);

            // Image
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 10, 30, imgWidth, Math.min(imgHeight, 250));

            pdf.save(filename || `export_${Date.now()}.pdf`);
            NexusApp?.showToast?.('✅ PDF exportado!', 'success');
            return true;
        } catch (error) {
            console.error('[QualityExport] PDF Error:', error);
            NexusApp?.showToast?.('Erro ao gerar PDF', 'error');
            return false;
        }
    },

    /**
     * Export container to PNG
     */
    async toPNG(selector, filename) {
        if (typeof html2canvas === 'undefined') {
            NexusApp?.showToast?.('Biblioteca de captura não carregada', 'error');
            return false;
        }

        try {
            NexusApp?.showToast?.('📸 Capturando imagem...', 'info');

            const element = document.querySelector(selector);
            if (!element) throw new Error('Elemento não encontrado');

            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#0a0f1e',
                logging: false,
                useCORS: true
            });

            const link = document.createElement('a');
            link.download = filename || `export_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            NexusApp?.showToast?.('✅ Imagem exportada!', 'success');
            return true;
        } catch (error) {
            console.error('[QualityExport] PNG Error:', error);
            NexusApp?.showToast?.('Erro ao gerar imagem', 'error');
            return false;
        }
    },

    /**
     * Download text file
     */
    toText(content, filename) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        NexusApp?.showToast?.('✅ Arquivo exportado!', 'success');
    },

    /**
     * Show export options modal
     */
    showExportModal(options) {
        const { onPDF, onPNG, onTXT, title } = options;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'quality-export-modal';
        modal.innerHTML = `
      <div class="quality-export-modal-content">
        <h3><i class="fa-solid fa-download"></i> Exportar ${title || 'Dados'}</h3>
        <div class="quality-export-options">
          ${onPDF ? `
            <button class="quality-export-option" data-type="pdf">
              <i class="fa-solid fa-file-pdf"></i>
              <span>PDF</span>
              <small>Documento formatado</small>
            </button>
          ` : ''}
          ${onPNG ? `
            <button class="quality-export-option" data-type="png">
              <i class="fa-solid fa-image"></i>
              <span>PNG</span>
              <small>Imagem alta resolução</small>
            </button>
          ` : ''}
          ${onTXT ? `
            <button class="quality-export-option" data-type="txt">
              <i class="fa-solid fa-file-lines"></i>
              <span>TXT</span>
              <small>Texto simples</small>
            </button>
          ` : ''}
        </div>
        <button class="quality-export-cancel">Cancelar</button>
      </div>
    `;

        // Add styles if not exist
        if (!document.getElementById('quality-export-styles')) {
            const style = document.createElement('style');
            style.id = 'quality-export-styles';
            style.textContent = `
        .quality-export-modal {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7); display: flex;
          align-items: center; justify-content: center; z-index: 10000;
          animation: fadeIn 0.2s ease;
        }
        .quality-export-modal-content {
          background: var(--quality-card-bg, #1a1f2e);
          border-radius: 16px; padding: 24px; min-width: 320px;
          border: 1px solid var(--quality-card-border, rgba(255,255,255,0.1));
        }
        .quality-export-modal h3 {
          margin: 0 0 20px; display: flex; align-items: center; gap: 10px;
          color: var(--text-primary, #fff);
        }
        .quality-export-options {
          display: flex; gap: 12px; margin-bottom: 16px;
        }
        .quality-export-option {
          flex: 1; padding: 16px 12px; border-radius: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer; transition: all 0.2s;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          color: var(--text-primary, #fff);
        }
        .quality-export-option:hover {
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.5);
          transform: translateY(-2px);
        }
        .quality-export-option i { font-size: 24px; color: #8b5cf6; }
        .quality-export-option span { font-weight: 600; }
        .quality-export-option small { font-size: 11px; color: var(--text-tertiary, #888); }
        .quality-export-cancel {
          width: 100%; padding: 10px; border-radius: 8px;
          background: transparent; border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-secondary, #aaa); cursor: pointer;
        }
        .quality-export-cancel:hover { background: rgba(255,255,255,0.05); }
      `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);

        // Events
        modal.querySelector('.quality-export-cancel').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        modal.querySelectorAll('.quality-export-option').forEach(btn => {
            btn.onclick = () => {
                modal.remove();
                const type = btn.dataset.type;
                if (type === 'pdf' && onPDF) onPDF();
                if (type === 'png' && onPNG) onPNG();
                if (type === 'txt' && onTXT) onTXT();
            };
        });
    }
};

/**
 * AI FALLBACK - Sugestões offline quando a API falha
 */
const AIFallback = {
    pdca: {
        plan: [
            'Identificar causa raiz do problema usando 5 Porquês',
            'Mapear processo atual e identificar gargalos',
            'Definir indicadores de sucesso e metas mensuráveis',
            'Estabelecer equipe responsável e cronograma'
        ],
        do: [
            'Implementar ações piloto em área controlada',
            'Documentar alterações realizadas',
            'Treinar equipe nas novas práticas'
        ],
        check: [
            'Coletar dados de desempenho pós-implementação',
            'Comparar resultados com baseline',
            'Analisar desvios e pontos de melhoria'
        ],
        act: [
            'Padronizar práticas bem-sucedidas',
            'Atualizar documentação e procedimentos',
            'Iniciar novo ciclo para melhorias remanescentes'
        ]
    },

    ishikawa: {
        metodo: ['Procedimento não padronizado', 'Falta de documentação', 'Treinamento insuficiente'],
        maquina: ['Manutenção preventiva inadequada', 'Equipamento obsoleto', 'Calibração incorreta'],
        maoDeObra: ['Falta de capacitação', 'Alta rotatividade', 'Desmotivação da equipe'],
        material: ['Qualidade do insumo inconsistente', 'Armazenamento inadequado', 'Fornecedor não qualificado'],
        medicao: ['Instrumento descalibrado', 'Critério de medição inadequado', 'Frequência de medição baixa'],
        meioAmbiente: ['Iluminação inadequada', 'Temperatura fora do padrão', 'Layout ineficiente']
    },

    cincoporques: [
        'Porque o processo não foi seguido corretamente',
        'Porque não há procedimento documentado',
        'Porque nunca foi criado um padrão',
        'Porque não foi identificada esta necessidade',
        'Porque falta análise sistemática de processos'
    ],

    getSuggestions(tool, context) {
        NexusApp?.showToast?.('📝 API indisponível. Usando sugestões offline.', 'info');
        return this[tool] || null;
    }
};

window.QualityExport = QualityExport;
window.AIFallback = AIFallback;
