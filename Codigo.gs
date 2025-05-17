function doGet() {
  return HtmlService.createHtmlOutputFromFile('index.html')
    .setTitle('Envio de Despesas - Grupo Tavares');
}

// Lista de despesas: busca da planilha + fixas
function getContasDespesas() {
  let lista = [
    "119 - AGUA E ESGOTO","377 - AGUA MINERAL","344 - ALMOCO, CAFE E LANCHES","117 - ALUGUEIS DE IMOVEIS",
    "302 - BRINDE, DOAÇÃO E BONIFICAÇÃO","213 - BRINDES","321 - CDL","108 - COMBUSTIVEIS",
    "284 - COMISSAO VENDEDORES","285 - COMISSOES OPERADOR DE CAIXA","5 - COMPRAS A PRAZO","248 - CONSULTORIA E MARKETING",
    "205 - CONTRIBUICAO SINDICAL","141 - CSLL","199 - CURSOS E TREINAMENTOS","317 - DARF INSS",
    "347 - DECORACAO E ORNAMENTACAO LOJA","106 - DESPESAS BANCARIAS","385 - DESPESAS DIVERSAS","10 - DESPESAS FINANCEIRAS",
    "154 - ECAD","133 - EMBALAGENS","210 - ENERGIA ELETRICA","249 - ENTREGAS","203 - ESTAGIARIOS E APRENDIZES",
    "370 - EXAME MEDICO ADMISSIONAL/DEMISSIONAL","189 - FERIAS","209 - FGTS","158 - FRETES",
    "329 - GASTOS COM TECNICO DE INFORMATICA TERCEIRIZADO","342 - HONORARIO CONTADOR","318 - IMPOSTO ESTADUAL",
    "316 - IMPULSIONAMENTO NO FACEBOOK","310 - INTERNET","125 - IPTU","120 - IRPJ","110 - MANUTENÇÃO DE MAQUINAS E EQUIPAMENTOS",
    "156 - MANUTENÇÃO E REPAROS PREDIAL","118 - MATERIAIS DE EXPEDIENTE","105 - MATERIAIS DE LIMPEZA","312 - MATERIAL DE INFORMÁTICA",
    "212 - MENSALIDADE SISTEMA INFORMATICA","146 - MONITORAMENTO E VIGILANCIA","320 - MONTAGEM LOJA/REFORMA","351 - MOVEIS, UTENSILIOS E BENS",
    "192 - MULTA RESCISORIA","371 - MULTA TRABALHISTAS","352 - PAGAMENTO EMPRESTIMO BANCO","271 - PROPAGANDA E ANUNCIOS",
    "9 - RECEITAS FINANCEIRAS","191 - RESCISOES CONTRATUAIS","357 - SACOLAS","360 - SALARIO ASSISTENTE DE MARKETING",
    "326 - SALARIO ESTOQUISTA","325 - SALARIO GERENTE","372 - SALARIO MATERNIDADE","324 - SALARIO OPERADORES DE CAIXA",
    "327 - SALARIO SERVIÇOS GERAIS","323 - SALARIO VENDEDORES","266 - SERVICOS DE COBRANÇA","322 - TAXA ADMINISTRATIVA GT",
    "341 - TAXAS ADMINISTRATIVAS CARTOES/TEF","13 - TAXAS DE CARTAO","290 - TELEFONE CELULAR","289 - TELEFONE FIXO",
    "201 - UNIFORMES","195 - VALES-TRANSPORTE","129 - VIAGENS"
  ];
  // Adiciona despesas da planilha (se existir)
  try {
    const sheet = getDespesasSheet_();
    const values = sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues().map(r=>r[0]);
    values.forEach(v => {
      if(v && lista.indexOf(v) === -1) lista.push(v);
    });
  } catch(e) {/*ignora se não existe*/}
  return lista;
}

// Salva nova despesa na planilha
function salvarNovaDespesa(novaDespesa) {
  if(!novaDespesa) return;
  const sheet = getDespesasSheet_();
  const values = sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues().map(r=>r[0]);
  if(values.indexOf(novaDespesa) === -1) {
    sheet.appendRow([novaDespesa]);
  }
}

// Retorna (cria se não existir) a aba de despesas
function getDespesasSheet_() {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("DESPESAS_SHEET_ID") || criarPlanilhaDespesas_());
  let sheet = ss.getSheetByName("Despesas");
  if(!sheet) {
    sheet = ss.insertSheet("Despesas");
    sheet.appendRow(["Despesa"]);
  }
  return sheet;
}

// Cria a planilha de despesas se não existir
function criarPlanilhaDespesas_() {
  const ss = SpreadsheetApp.create("Despesas - Grupo Tavares");
  PropertiesService.getScriptProperties().setProperty("DESPESAS_SHEET_ID", ss.getId());
  const sheet = ss.getActiveSheet();
  sheet.setName("Despesas");
  sheet.appendRow(["Despesa"]);
  return ss.getId();
}

// Estrutura: /Despesas/[Conta de Despesa]/[AAAA-MM]/arquivo.pdf
function uploadFiles(formObject) {
  try {
    const { mes, ano, despesa, arquivos, novaDespesa } = formObject;
    if (!mes || !ano || !despesa) throw new Error("Campos obrigatórios não informados.");
    if (!arquivos || !arquivos.length) throw new Error("Nenhum arquivo recebido.");
    if (arquivos.length > 5) throw new Error("Selecione no máximo 5 arquivos por vez.");

    const mesNomes = {
      "01":"Janeiro", "02":"Fevereiro", "03":"Março", "04":"Abril", "05":"Maio", "06":"Junho",
      "07":"Julho", "08":"Agosto", "09":"Setembro", "10":"Outubro", "11":"Novembro", "12":"Dezembro"
    };

    if(novaDespesa) salvarNovaDespesa(novaDespesa);

    // Corrigido: nunca cria duplicidade nas pastas!
    const rootFolder = getOrCreateSingleFolder_("Despesas", null);
    const despesaFolder = getOrCreateSingleFolder_(sanitizeFolderName(despesa), rootFolder);
    const periodo = `${ano}-${mes}`;
    const periodoFolder = getOrCreateSingleFolder_(periodo, despesaFolder);

    let resultados = [];
    let totalMb = arquivos.reduce((sum, f) => sum + (f.data.length * 3 / 4 / 1048576), 0);
    if (totalMb > 10) throw new Error("O tamanho total não pode passar de 10MB.");

    arquivos.forEach(file => {
      try {
        if (!file || !file.data || !file.type || !file.name) {
          resultados.push(`❌ Arquivo inválido recebido.`);
          return;
        }
        if (!["application/pdf","image/jpeg","image/png"].includes(file.type)) {
          resultados.push(`❌ Tipo de arquivo não permitido: ${file.name}`);
          return;
        }
        if ((file.data.length * 3 / 4 / 1048576) > 5) {
          resultados.push(`❌ Arquivo muito grande: ${file.name}`);
          return;
        }
        let nomeFinal = sanitizeFolderName(file.name);
        if (periodoFolder.getFilesByName(nomeFinal).hasNext()) {
          const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
          nomeFinal = ts + "-" + nomeFinal;
        }
        const blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.type, nomeFinal);
        periodoFolder.createFile(blob);
        resultados.push(`✅ ${nomeFinal} enviado!`);
      } catch (fileErr) {
        resultados.push(`❌ Erro ao enviar ${file.name}: ${fileErr.message}`);
        Logger.log("Erro individual ao salvar arquivo: " + file.name + " | " + fileErr);
      }
    });

    let enviadoMsg = `✅ ${arquivos.length} arquivo(s) enviado(s) para ${mesNomes[mes] || mes} de ${ano} na conta ${despesa}`;
    resultados.unshift(enviadoMsg);

    return {success: true, mensagens: resultados};
  } catch (erro) {
    Logger.log("Erro crítico no upload: " + erro);
    return {success: false, mensagens: [`❌ Erro: ${erro.message}`]};
  }
}

// Estrutura: /Despesas/[Conta de Despesa]/[AAAA-MM]/
function listUploadedFiles(ano, mes, despesa) {
  try {
    if (!ano || !mes || !despesa) return [];
    const rootFolder = getOrCreateSingleFolder_("Despesas", null);
    const despesaFolder = getOrCreateSingleFolder_(sanitizeFolderName(despesa), rootFolder);
    const periodo = `${ano}-${mes}`;
    const periodoFolder = getOrCreateSingleFolder_(periodo, despesaFolder);
    let files = [];
    const iterator = periodoFolder.getFiles();
    while (iterator.hasNext()) {
      const f = iterator.next();
      files.push({
        name: f.getName(),
        url: f.getUrl(),
        date: Utilities.formatDate(f.getDateCreated(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")
      });
    }
    files.sort((a, b) => b.date.localeCompare(a.date));
    return files;
  } catch(err) {
    Logger.log("Erro listagem: " + err);
    return [];
  }
}

function getFolderUrl(ano, mes, despesa) {
  try {
    if (!ano || !mes || !despesa) return '';
    const rootFolder = getOrCreateSingleFolder_("Despesas", null);
    const despesaFolder = getOrCreateSingleFolder_(sanitizeFolderName(despesa), rootFolder);
    const periodo = `${ano}-${mes}`;
    const periodoFolder = getOrCreateSingleFolder_(periodo, despesaFolder);
    return periodoFolder.getUrl();
  } catch(e) {
    Logger.log("Erro getFolderUrl: "+e);
    return '';
  }
}

// Função que NUNCA duplica pastas, SEMPRE pega a única existente (ou cria se não existe)
function getOrCreateSingleFolder_(name, parent) {
  if (!name) throw new Error("Nome de pasta inválido.");
  let folders = parent ? parent.getFoldersByName(name) : DriveApp.getFoldersByName(name);
  if (folders.hasNext()) {
    // Elimina duplicidade: pega sempre a primeira, apaga as demais, se houver
    let first = folders.next();
    while (folders.hasNext()) {
      let extra = folders.next();
      try { extra.setTrashed(true); } catch(e) {}
    }
    return first;
  } else {
    return parent ? parent.createFolder(name) : DriveApp.createFolder(name);
  }
}

function sanitizeFolderName(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, '_').trim();
}
