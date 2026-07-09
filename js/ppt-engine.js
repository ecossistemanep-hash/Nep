/**
 * NEXUS PPT ENGINE - Professional Presentation Generator
 * Engine premium para criação de apresentações profissionais
 * Usa PptxGenJS com templates, gráficos e branding
 */

const NexusPPTEngine = {
    // ============ CONFIGURAÇÕES DE BRANDING ============
    branding: {
        companyName: 'NEP Delivery Control',
        logo: null, // Base64 ou URL (será configurável)
        primaryColor: '6366F1', // Roxo/Indigo
        secondaryColor: '8B5CF6',
        accentColor: '10B981', // Verde
        darkBg: '111827',
        lightBg: 'FFFFFF',
        textDark: '1F2937',
        textLight: 'F9FAFB',
        textMuted: '9CA3AF'
    },

    // ============ TEMPLATES DE SLIDES ============
    templates: {
        // Template Escuro (Premium)
        dark: {
            background: { color: '111827' },
            title: { color: 'FFFFFF', fontSize: 32, bold: true },
            subtitle: { color: '9CA3AF', fontSize: 16 },
            body: { color: 'E5E7EB', fontSize: 14 },
            accent: { color: '6366F1' }
        },
        // Template Claro (Corporativo)
        light: {
            background: { color: 'FFFFFF' },
            title: { color: '1F2937', fontSize: 32, bold: true },
            subtitle: { color: '6B7280', fontSize: 16 },
            body: { color: '374151', fontSize: 14 },
            accent: { color: '6366F1' }
        },
        // Template Gradiente (Moderno)
        gradient: {
            background: {
                color: '0F172A',
                // PptxGenJS suporta gradientes via path
            },
            title: { color: 'FFFFFF', fontSize: 32, bold: true },
            subtitle: { color: 'A5B4FC', fontSize: 16 },
            body: { color: 'E0E7FF', fontSize: 14 },
            accent: { color: '818CF8' }
        }
    },

    // ============ LAYOUTS DE SLIDES ============
    layouts: {
        // Slide de Título/Capa
        cover: (pres, data, theme) => {
            const t = NexusPPTEngine.templates[theme] || NexusPPTEngine.templates.dark;
            const slide = pres.addSlide();
            slide.background = t.background;

            // Decoração superior (linha gradiente)
            slide.addShape(pres.ShapeType.rect, {
                x: 0, y: 0, w: '100%', h: 0.15,
                fill: { color: NexusPPTEngine.branding.primaryColor }
            });

            // Título principal
            slide.addText(data.title || 'Apresentação', {
                x: 0.8, y: 2.2, w: '85%', h: 1,
                fontSize: t.title.fontSize + 8,
                color: t.title.color,
                bold: true,
                fontFace: 'Arial'
            });

            // Subtítulo
            if (data.subtitle) {
                slide.addText(data.subtitle, {
                    x: 0.8, y: 3.4, w: '85%',
                    fontSize: t.subtitle.fontSize,
                    color: t.subtitle.color,
                    fontFace: 'Arial'
                });
            }

            // Data e gerador
            slide.addText(`${new Date().toLocaleDateString('pt-BR')} | Gerado por Nexus IA`, {
                x: 0.8, y: 4.8, w: '85%',
                fontSize: 11,
                color: t.subtitle.color,
                fontFace: 'Arial'
            });

            // Decoração inferior
            slide.addShape(pres.ShapeType.rect, {
                x: 0, y: 5.4, w: '100%', h: 0.1,
                fill: { color: NexusPPTEngine.branding.accentColor }
            });

            return slide;
        },

        // Slide de Conteúdo com Bullets
        content: (pres, data, theme) => {
            const t = NexusPPTEngine.templates[theme] || NexusPPTEngine.templates.dark;
            const slide = pres.addSlide();
            slide.background = t.background;

            // Header bar
            slide.addShape(pres.ShapeType.rect, {
                x: 0, y: 0, w: '100%', h: 0.08,
                fill: { color: NexusPPTEngine.branding.primaryColor }
            });

            // Título do slide
            slide.addText(data.title || 'Conteúdo', {
                x: 0.5, y: 0.4, w: '90%',
                fontSize: t.title.fontSize - 4,
                color: t.title.color,
                bold: true,
                fontFace: 'Arial'
            });

            // Linha separadora
            slide.addShape(pres.ShapeType.rect, {
                x: 0.5, y: 1.1, w: 1.5, h: 0.04,
                fill: { color: NexusPPTEngine.branding.accentColor }
            });

            // Bullets de conteúdo
            if (data.content && Array.isArray(data.content)) {
                const bulletItems = data.content.map(item => ({
                    text: item,
                    options: {
                        bullet: { type: 'bullet', color: NexusPPTEngine.branding.primaryColor },
                        color: t.body.color,
                        fontSize: t.body.fontSize + 2
                    }
                }));

                slide.addText(bulletItems, {
                    x: 0.6, y: 1.4, w: '88%', h: 3.8,
                    fontFace: 'Arial',
                    paraSpaceAfter: 14
                });
            }

            // Footer
            NexusPPTEngine.addFooter(slide, theme);

            return slide;
        },

        // Slide com 2 Colunas
        twoColumn: (pres, data, theme) => {
            const t = NexusPPTEngine.templates[theme] || NexusPPTEngine.templates.dark;
            const slide = pres.addSlide();
            slide.background = t.background;

            // Header
            slide.addShape(pres.ShapeType.rect, {
                x: 0, y: 0, w: '100%', h: 0.08,
                fill: { color: NexusPPTEngine.branding.primaryColor }
            });

            slide.addText(data.title || 'Comparativo', {
                x: 0.5, y: 0.4, w: '90%',
                fontSize: t.title.fontSize - 4,
                color: t.title.color,
                bold: true,
                fontFace: 'Arial'
            });

            // Coluna Esquerda
            if (data.leftTitle) {
                slide.addText(data.leftTitle, {
                    x: 0.5, y: 1.3, w: 4.5,
                    fontSize: 18, color: NexusPPTEngine.branding.primaryColor, bold: true
                });
            }
            if (data.leftContent && Array.isArray(data.leftContent)) {
                const leftBullets = data.leftContent.map(item => ({
                    text: item,
                    options: { bullet: true, color: t.body.color, fontSize: 13 }
                }));
                slide.addText(leftBullets, { x: 0.5, y: 1.8, w: 4.5, h: 3, fontFace: 'Arial' });
            }

            // Linha divisória vertical
            slide.addShape(pres.ShapeType.rect, {
                x: 5.1, y: 1.3, w: 0.02, h: 3.5,
                fill: { color: '4B5563' }
            });

            // Coluna Direita
            if (data.rightTitle) {
                slide.addText(data.rightTitle, {
                    x: 5.4, y: 1.3, w: 4.5,
                    fontSize: 18, color: NexusPPTEngine.branding.accentColor, bold: true
                });
            }
            if (data.rightContent && Array.isArray(data.rightContent)) {
                const rightBullets = data.rightContent.map(item => ({
                    text: item,
                    options: { bullet: true, color: t.body.color, fontSize: 13 }
                }));
                slide.addText(rightBullets, { x: 5.4, y: 1.8, w: 4.5, h: 3, fontFace: 'Arial' });
            }

            NexusPPTEngine.addFooter(slide, theme);
            return slide;
        },

        // Slide de Citação/Destaque
        quote: (pres, data, theme) => {
            const t = NexusPPTEngine.templates[theme] || NexusPPTEngine.templates.dark;
            const slide = pres.addSlide();
            slide.background = t.background;

            // Ícone de aspas
            slide.addText('"', {
                x: 0.5, y: 1.5, w: 1,
                fontSize: 120, color: NexusPPTEngine.branding.primaryColor,
                fontFace: 'Georgia', bold: true
            });

            // Citação
            slide.addText(data.quote || 'Citação aqui', {
                x: 1.5, y: 2, w: 7.5,
                fontSize: 24, color: t.title.color,
                fontFace: 'Georgia', italic: true
            });

            // Autor
            if (data.author) {
                slide.addText(`— ${data.author}`, {
                    x: 1.5, y: 3.8, w: 7.5,
                    fontSize: 16, color: t.subtitle.color,
                    fontFace: 'Arial'
                });
            }

            NexusPPTEngine.addFooter(slide, theme);
            return slide;
        },

        // Slide com Gráfico de Barras
        chartBar: (pres, data, theme) => {
            const t = NexusPPTEngine.templates[theme] || NexusPPTEngine.templates.dark;
            const slide = pres.addSlide();
            slide.background = t.background;

            // Header
            slide.addShape(pres.ShapeType.rect, {
                x: 0, y: 0, w: '100%', h: 0.08,
                fill: { color: NexusPPTEngine.branding.primaryColor }
            });

            slide.addText(data.title || 'Análise', {
                x: 0.5, y: 0.4, w: '90%',
                fontSize: t.title.fontSize - 4,
                color: t.title.color,
                bold: true,
                fontFace: 'Arial'
            });

            // Gráfico de Barras
            const chartData = data.chartData || [
                { name: 'Categoria A', labels: ['Jan', 'Fev', 'Mar'], values: [10, 20, 30] }
            ];

            slide.addChart(pres.ChartType.bar, chartData, {
                x: 0.5, y: 1.3, w: 9, h: 3.5,
                showLegend: true,
                legendPos: 'b',
                barDir: 'bar',
                barGapWidthPct: 50,
                chartColors: [NexusPPTEngine.branding.primaryColor, NexusPPTEngine.branding.accentColor, 'F59E0B'],
                valAxisLabelColor: t.body.color,
                catAxisLabelColor: t.body.color,
                titleColor: t.title.color
            });

            NexusPPTEngine.addFooter(slide, theme);
            return slide;
        },

        // Slide com Gráfico de Pizza
        chartPie: (pres, data, theme) => {
            const t = NexusPPTEngine.templates[theme] || NexusPPTEngine.templates.dark;
            const slide = pres.addSlide();
            slide.background = t.background;

            slide.addShape(pres.ShapeType.rect, {
                x: 0, y: 0, w: '100%', h: 0.08,
                fill: { color: NexusPPTEngine.branding.primaryColor }
            });

            slide.addText(data.title || 'Distribuição', {
                x: 0.5, y: 0.4, w: '90%',
                fontSize: t.title.fontSize - 4,
                color: t.title.color,
                bold: true,
                fontFace: 'Arial'
            });

            const chartData = data.chartData || [
                { name: 'Dados', labels: ['A', 'B', 'C'], values: [30, 50, 20] }
            ];

            slide.addChart(pres.ChartType.pie, chartData, {
                x: 2, y: 1.2, w: 6, h: 3.8,
                showLegend: true,
                legendPos: 'r',
                showPercent: true,
                chartColors: [
                    NexusPPTEngine.branding.primaryColor,
                    NexusPPTEngine.branding.accentColor,
                    'F59E0B',
                    'EF4444',
                    '8B5CF6'
                ]
            });

            NexusPPTEngine.addFooter(slide, theme);
            return slide;
        },

        // Slide com Gráfico de Linha
        chartLine: (pres, data, theme) => {
            const t = NexusPPTEngine.templates[theme] || NexusPPTEngine.templates.dark;
            const slide = pres.addSlide();
            slide.background = t.background;

            slide.addShape(pres.ShapeType.rect, {
                x: 0, y: 0, w: '100%', h: 0.08,
                fill: { color: NexusPPTEngine.branding.primaryColor }
            });

            slide.addText(data.title || 'Evolução', {
                x: 0.5, y: 0.4, w: '90%',
                fontSize: t.title.fontSize - 4,
                color: t.title.color,
                bold: true,
                fontFace: 'Arial'
            });

            const chartData = data.chartData || [
                { name: 'Série 1', labels: ['Jan', 'Fev', 'Mar', 'Abr'], values: [10, 25, 18, 35] }
            ];

            slide.addChart(pres.ChartType.line, chartData, {
                x: 0.5, y: 1.3, w: 9, h: 3.5,
                showLegend: true,
                legendPos: 'b',
                lineDataSymbol: 'circle',
                lineDataSymbolSize: 8,
                chartColors: [NexusPPTEngine.branding.primaryColor, NexusPPTEngine.branding.accentColor],
                valAxisLabelColor: t.body.color,
                catAxisLabelColor: t.body.color
            });

            NexusPPTEngine.addFooter(slide, theme);
            return slide;
        },

        // Slide de KPIs/Métricas
        kpis: (pres, data, theme) => {
            const t = NexusPPTEngine.templates[theme] || NexusPPTEngine.templates.dark;
            const slide = pres.addSlide();
            slide.background = t.background;

            slide.addShape(pres.ShapeType.rect, {
                x: 0, y: 0, w: '100%', h: 0.08,
                fill: { color: NexusPPTEngine.branding.primaryColor }
            });

            slide.addText(data.title || 'Indicadores', {
                x: 0.5, y: 0.4, w: '90%',
                fontSize: t.title.fontSize - 4,
                color: t.title.color,
                bold: true,
                fontFace: 'Arial'
            });

            // KPI Cards (até 4)
            const kpis = data.kpis || [
                { label: 'Total', value: '0', icon: '📊' },
                { label: 'Concluídos', value: '0', icon: '✅' },
                { label: 'Pendentes', value: '0', icon: '⏳' },
                { label: 'Taxa', value: '0%', icon: '📈' }
            ];

            const cardWidth = 2.2;
            const startX = 0.5;
            const cardY = 1.6;

            kpis.slice(0, 4).forEach((kpi, i) => {
                const x = startX + (i * (cardWidth + 0.2));

                // Card background
                slide.addShape(pres.ShapeType.roundRect, {
                    x: x, y: cardY, w: cardWidth, h: 2.2,
                    fill: { color: theme === 'light' ? 'F3F4F6' : '1F2937' },
                    line: { color: '374151', pt: 1 }
                });

                // Ícone
                slide.addText(kpi.icon || '📊', {
                    x: x, y: cardY + 0.2, w: cardWidth,
                    fontSize: 28, align: 'center'
                });

                // Valor
                slide.addText(String(kpi.value), {
                    x: x, y: cardY + 0.9, w: cardWidth,
                    fontSize: 32, color: NexusPPTEngine.branding.primaryColor,
                    bold: true, align: 'center', fontFace: 'Arial'
                });

                // Label
                slide.addText(kpi.label, {
                    x: x, y: cardY + 1.6, w: cardWidth,
                    fontSize: 12, color: t.subtitle.color,
                    align: 'center', fontFace: 'Arial'
                });
            });

            NexusPPTEngine.addFooter(slide, theme);
            return slide;
        },

        // Slide de Encerramento
        closing: (pres, data, theme) => {
            const t = NexusPPTEngine.templates[theme] || NexusPPTEngine.templates.dark;
            const slide = pres.addSlide();
            slide.background = t.background;

            slide.addText(data.title || 'Obrigado!', {
                x: 0, y: 2, w: '100%',
                fontSize: 48, color: t.title.color,
                bold: true, align: 'center', fontFace: 'Arial'
            });

            if (data.subtitle) {
                slide.addText(data.subtitle, {
                    x: 0, y: 3.2, w: '100%',
                    fontSize: 18, color: t.subtitle.color,
                    align: 'center', fontFace: 'Arial'
                });
            }

            slide.addText(`${NexusPPTEngine.branding.companyName} | ${new Date().toLocaleDateString('pt-BR')}`, {
                x: 0, y: 4.5, w: '100%',
                fontSize: 12, color: t.subtitle.color,
                align: 'center', fontFace: 'Arial'
            });

            return slide;
        }
    },

    // ============ HELPER: Footer padrão ============
    addFooter: (slide, theme) => {
        const t = NexusPPTEngine.templates[theme] || NexusPPTEngine.templates.dark;

        // Linha do footer
        slide.addShape('rect', {
            x: 0, y: 5.35, w: '100%', h: 0.02,
            fill: { color: '374151' }
        });

        // Texto do footer
        slide.addText(`${NexusPPTEngine.branding.companyName} | Confidencial`, {
            x: 0.5, y: 5.4, w: 4,
            fontSize: 9, color: t.subtitle.color, fontFace: 'Arial'
        });
    },

    // ============ GERADOR PRINCIPAL ============
    /**
     * Gera uma apresentação profissional
     * @param {Object} config - Configuração da apresentação
     * @param {string} config.title - Título da apresentação
     * @param {string} config.subtitle - Subtítulo (opcional)
     * @param {string} config.theme - 'dark', 'light', ou 'gradient'
     * @param {Array} config.slides - Array de slides com { type, ...data }
     * @returns {Promise<void>} - Faz download do arquivo
     */
    async generate(config) {
        if (typeof PptxGenJS === 'undefined') {
            throw new Error('PptxGenJS não está carregado. Verifique se a biblioteca foi incluída.');
        }

        const pres = new PptxGenJS();
        pres.layout = 'LAYOUT_16x9';
        pres.title = config.title || 'Apresentação Nexus';
        pres.author = 'Nexus Neuronyo';
        pres.company = this.branding.companyName;

        const theme = config.theme || 'dark';

        // Slide de Capa
        this.layouts.cover(pres, {
            title: config.title,
            subtitle: config.subtitle
        }, theme);

        // Slides de conteúdo
        if (config.slides && Array.isArray(config.slides)) {
            for (const slideData of config.slides) {
                const layoutFn = this.layouts[slideData.type];
                if (layoutFn) {
                    layoutFn(pres, slideData, theme);
                } else {
                    // Fallback para conteúdo básico
                    this.layouts.content(pres, slideData, theme);
                }
            }
        }

        // Slide de Encerramento (opcional)
        if (config.closing !== false) {
            this.layouts.closing(pres, {
                title: config.closingTitle || 'Obrigado!',
                subtitle: config.closingSubtitle || 'Dúvidas? Entre em contato.'
            }, theme);
        }

        // Gerar e baixar
        const fileName = `${config.title || 'Apresentacao'}.pptx`.replace(/[^a-zA-Z0-9áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-_\.]/g, '');
        await pres.writeFile({ fileName });

        return { success: true, fileName };
    }
};

// Expor globalmente
window.NexusPPTEngine = NexusPPTEngine;
