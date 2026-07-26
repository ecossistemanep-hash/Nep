/**
 * NEP PLATFORM - EXPORT SERVICE
 *
 * Ponto único de exportação para CSV e Excel.
 *
 * Antes cada módulo montava o arquivo do seu jeito e todos saíam com defeito
 * no Excel brasileiro:
 *
 *  1. Sem BOM de UTF-8. O Excel no Windows assume a codificação do sistema
 *     (Windows-1252 no Brasil) quando o arquivo não se identifica, então
 *     "Ação" virava "AÃ§Ã£o" e "Férias" virava "FÃ©rias". Era a causa
 *     principal do arquivo "vir bugado".
 *  2. Separador inconsistente: dois módulos usavam vírgula e um usava
 *     ponto e vírgula. O Excel em português espera ponto e vírgula — com
 *     vírgula, a planilha inteira abre espremida numa coluna só.
 *  3. Números com ponto decimal. Em pt-BR o decimal é vírgula; "3.5" era
 *     lido como texto ou como 35.
 *  4. Campos sem escape. Um ponto e vírgula, aspas ou quebra de linha
 *     dentro do texto partia a linha e desalinhava a planilha inteira.
 *  5. Timestamp do Firestore jogado direto na célula, virando "[object
 *     Object]" — acontecia na coluna "Último Acesso" e na de data dos logs.
 *
 * Tudo isso é resolvido aqui, uma vez só, para qualquer módulo que exporte.
 */

const ExportService = {

  // O Excel em pt-BR usa ponto e vírgula como separador de lista.
  SEP: ';',

  // Sem este prefixo o Excel não reconhece o arquivo como UTF-8.
  BOM: '﻿',

  /**
   * Converte qualquer valor num texto adequado para planilha.
   * Trata Timestamp do Firestore, Date, número, nulo e objeto.
   */
  valorTexto(v) {
    if (v === null || v === undefined) return '';

    // Timestamp do Firestore (tem .toDate) ou objeto {seconds, nanoseconds}
    if (typeof v === 'object') {
      if (typeof v.toDate === 'function') return this.dataBR(v.toDate());
      if (typeof v.seconds === 'number') return this.dataBR(new Date(v.seconds * 1000));
      if (v instanceof Date) return this.dataBR(v);
      // Objeto desconhecido: melhor um vazio do que "[object Object]"
      try { return JSON.stringify(v); } catch (_) { return ''; }
    }

    if (typeof v === 'number') {
      if (!isFinite(v)) return '';
      // Decimal com vírgula: é o que o Excel em português entende como número
      return Number.isInteger(v) ? String(v) : String(v).replace('.', ',');
    }

    if (typeof v === 'boolean') return v ? 'Sim' : 'Não';

    const s = String(v);
    // String ISO de data/hora → formato brasileiro
    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(s)) {
      const d = new Date(s.length === 10 ? s + 'T12:00:00' : s);
      if (!isNaN(d)) return s.length === 10 ? d.toLocaleDateString('pt-BR') : this.dataBR(d);
    }
    return s;
  },

  dataBR(d) {
    if (!d || isNaN(d)) return '';
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  },

  /**
   * Prepara uma célula de CSV: neutraliza fórmula e escapa aspas.
   *
   * Célula começando por = + - @ é executada como fórmula pelo Excel e pelo
   * Google Sheets. Como títulos e nomes são texto livre digitado por
   * usuários, alguém poderia gravar `=HYPERLINK(...)` e atacar quem abrisse
   * a planilha. A aspa simples à frente neutraliza sem alterar o que se lê.
   */
  celulaCSV(v) {
    let s = this.valorTexto(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  },

  /**
   * Baixa um CSV que o Excel brasileiro abre corretamente.
   *
   * @param {string[]} cabecalho  Nomes das colunas
   * @param {Array[]}  linhas     Matriz de valores (cada item é uma linha)
   * @param {string}   nomeBase   Nome do arquivo, sem extensão
   */
  baixarCSV(cabecalho, linhas, nomeBase) {
    const sep = this.SEP;
    const partes = [];

    partes.push(cabecalho.map(h => this.celulaCSV(h)).join(sep));
    (linhas || []).forEach(linha => {
      partes.push((linha || []).map(c => this.celulaCSV(c)).join(sep));
    });

    // \r\n: o Excel no Windows é mais tolerante com a quebra de linha dele
    const texto = this.BOM + partes.join('\r\n');

    this._baixarBlob(
      new Blob([texto], { type: 'text/csv;charset=utf-8;' }),
      this._nomeArquivo(nomeBase, 'csv')
    );
  },

  /**
   * Baixa um Excel (.xlsx) a partir de uma ou mais abas.
   *
   * @param {Array<{nome: string, cabecalho: string[], linhas: Array[]}>} abas
   * @param {string} nomeBase
   */
  baixarExcel(abas, nomeBase) {
    if (typeof XLSX === 'undefined') {
      console.error('[Export] Biblioteca XLSX não carregada');
      if (window.NexusApp) NexusApp.showToast('Biblioteca de Excel indisponível', 'error');
      return false;
    }

    const wb = XLSX.utils.book_new();

    abas.forEach(aba => {
      // Normaliza cada célula antes de entregar ao XLSX: sem isso, um
      // Timestamp do Firestore vira objeto ilegível na planilha.
      const matriz = [aba.cabecalho.slice()];
      (aba.linhas || []).forEach(linha => {
        matriz.push((linha || []).map(c => {
          if (typeof c === 'number' && isFinite(c)) return c; // número continua número
          return this.valorTexto(c);
        }));
      });

      const ws = XLSX.utils.aoa_to_sheet(matriz);
      ws['!cols'] = this._larguras(matriz);
      // Nome de aba no Excel: máximo 31 caracteres e sem : \ / ? * [ ]
      const nomeAba = String(aba.nome || 'Dados').replace(/[:\\\/?*\[\]]/g, '-').slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, nomeAba);
    });

    XLSX.writeFile(wb, this._nomeArquivo(nomeBase, 'xlsx'));
    return true;
  },

  /** Larguras de coluna proporcionais ao conteúdo, para não sair tudo cortado. */
  _larguras(matriz) {
    const larguras = [];
    matriz.forEach(linha => {
      linha.forEach((celula, i) => {
        const tamanho = String(celula == null ? '' : celula).length;
        if (!larguras[i] || tamanho > larguras[i]) larguras[i] = tamanho;
      });
    });
    return larguras.map(l => ({ wch: Math.min(Math.max(l + 2, 10), 50) }));
  },

  _nomeArquivo(base, ext) {
    const hoje = new Date();
    const carimbo = hoje.getFullYear() + '-' +
      String(hoje.getMonth() + 1).padStart(2, '0') + '-' +
      String(hoje.getDate()).padStart(2, '0');
    const limpo = String(base || 'export').replace(/[^\w\-]+/g, '_');
    return `${limpo}_${carimbo}.${ext}`;
  },

  _baixarBlob(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revogar na hora cancela o download em alguns navegadores
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

window.ExportService = ExportService;
