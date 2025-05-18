function doGet() {
  return HtmlService.createHtmlOutputFromFile('index.html')
    .setTitle('Envio de Despesas - Grupo Tavares');
}

function getContasDespesas() {
  return [
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
}

function mesPorExtenso(mesNum) {
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return meses[parseInt(mesNum,10)-1];
}

// Corrigido: só cria a pasta 'Despesas' se não existir, nunca cria duplicada
function getDespesasRoot() {
  const root = DriveApp.getRootFolder();
  const folders = root.getFoldersByName("Despesas");
  if (folders.hasNext()) return folders.next();
  return root.createFolder("Despesas");
}
// Corrigido: só cria subpasta se não existir, nunca remove duplicadas (mais seguro)
function getOrCreateSubFolder(name, parentFolder) {
  let folders = parentFolder.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(name);
}

function sanitizeFolderName(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, '_').trim();
}

function uploadFiles(formObject) {
  try {
    let { mes, ano, despesa, arquivos } = formObject;
    if (!despesa || despesa === "") throw new Error("Informe uma conta de despesa.");
    if (!mes || !ano) throw new Error("Campos obrigatórios não informados.");
    if (!arquivos || arquivos.length === 0) throw new Error("Nenhum arquivo recebido.");

    // Caminho: /Despesas/ano/mes/conta
    const rootFolder = getDespesasRoot();
    const anoFolder = getOrCreateSubFolder(ano, rootFolder);
    const mesFolder = getOrCreateSubFolder(mesPorExtenso(mes), anoFolder);
    const contaNome = sanitizeFolderName(despesa);
    const contaFolder = getOrCreateSubFolder(contaNome, mesFolder);

    let resultados = [];
    let totalMb = arquivos.reduce((sum, f) => sum + (f.data.length * 3 / 4 / 1048576), 0);
    if (totalMb > 100) throw new Error("O tamanho total não pode passar de 100MB.");
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
        let nomeFinal = sanitizeFolderName(file.name);
        if (contaFolder.getFilesByName(nomeFinal).hasNext()) {
          const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
          nomeFinal = ts + "-" + nomeFinal;
        }
        const blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.type, nomeFinal);
        contaFolder.createFile(blob);
        resultados.push(`✅ ${nomeFinal} enviado!`);
      } catch (fileErr) {
        resultados.push(`❌ Erro ao enviar ${file.name}: ${fileErr.message}`);
        Logger.log("Erro individual ao salvar arquivo: " + file.name + " | " + fileErr);
      }
    });
    let enviadoMsg = `✅ ${arquivos.length} arquivo(s) enviado(s) para ${mesPorExtenso(mes)} de ${ano} na conta ${despesa}`;
    resultados.unshift(enviadoMsg);

    return {success: true, mensagens: resultados};
  } catch (erro) {
    Logger.log("Erro crítico no upload: " + erro);
    return {success: false, mensagens: [`❌ Erro: ${erro.message}`]};
  }
}

function listUploadedFiles(ano, mes, despesa) {
  try {
    if (!ano || !mes || !despesa) return [];
    const rootFolder = getDespesasRoot();
    const anoFolder = getOrCreateSubFolder(ano, rootFolder);
    const mesFolder = getOrCreateSubFolder(mesPorExtenso(mes), anoFolder);
    const contaFolder = getOrCreateSubFolder(sanitizeFolderName(despesa), mesFolder);
    let files = [];
    const iterator = contaFolder.getFiles();
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
    const rootFolder = getDespesasRoot();
    const anoFolder = getOrCreateSubFolder(ano, rootFolder);
    const mesFolder = getOrCreateSubFolder(mesPorExtenso(mes), anoFolder);
    const contaFolder = getOrCreateSubFolder(sanitizeFolderName(despesa), mesFolder);
    return contaFolder.getUrl();
  } catch(e) {
    Logger.log("Erro getFolderUrl: "+e);
    return '';
  }
}
