function doGet() {
  return HtmlService.createHtmlOutputFromFile('index.html')
    .setTitle('Envio de Despesas - Grupo Tavares')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // Adicionado para melhor compatibilidade se embutido
}

function getContasDespesas() {
  // Para manutenção futura, considere buscar esta lista de uma Planilha Google
  return [
    "FECHAMENTO", "RELATÓRIOS GT", "BANCOS","IMPOSTO", "TELEFONE", "DUPLICATAS",  "119 - AGUA E ESGOTO", "377 - AGUA MINERAL", "344 - ALMOCO, CAFE E LANCHES", "117 - ALUGUEIS DE IMOVEIS",
    "302 - BRINDE, DOAÇÃO E BONIFICAÇÃO", "213 - BRINDES", "321 - CDL", "108 - COMBUSTIVEIS",
    "284 - COMISSAO VENDEDORES", "285 - COMISSOES OPERADOR DE CAIXA", "5 - COMPRAS A PRAZO", "248 - CONSULTORIA E MARKETING",
    "205 - CONTRIBUICAO SINDICAL", "141 - CSLL", "199 - CURSOS E TREINAMENTOS", "317 - DARF INSS",
    "347 - DECORACAO E ORNAMENTACAO LOJA", "106 - DESPESAS BANCARIAS", "385 - DESPESAS DIVERSAS", "10 - DESPESAS FINANCEIRAS",
    "154 - ECAD", "133 - EMBALAGENS", "210 - ENERGIA ELETRICA", "249 - ENTREGAS", "203 - ESTAGIARIOS E APRENDIZES",
    "370 - EXAME MEDICO ADMISSIONAL/DEMISSIONAL", "189 - FERIAS", "209 - FGTS", "158 - FRETES",
    "329 - GASTOS COM TECNICO DE INFORMATICA TERCEIRIZADO", "342 - HONORARIO CONTADOR", "318 - IMPOSTO ESTADUAL",
    "316 - IMPULSIONAMENTO NO FACEBOOK", "310 - INTERNET", "125 - IPTU", "120 - IRPJ", "110 - MANUTENÇÃO DE MAQUINAS E EQUIPAMENTOS",
    "156 - MANUTENÇÃO E REPAROS PREDIAL", "118 - MATERIAIS DE EXPEDIENTE", "105 - MATERIAIS DE LIMPEZA", "312 - MATERIAL DE INFORMÁTICA",
    "212 - MENSALIDADE SISTEMA INFORMATICA", "146 - MONITORAMENTO E VIGILANCIA", "320 - MONTAGEM LOJA/REFORMA", "351 - MOVEIS, UTENSILIOS E BENS",
    "192 - MULTA RESCISORIA", "371 - MULTA TRABALHISTAS", "352 - PAGAMENTO EMPRESTIMO BANCO", "271 - PROPAGANDA E ANUNCIOS",
    "9 - RECEITAS FINANCEIRAS", "191 - RESCISOES CONTRATUAIS", "357 - SACOLAS", "360 - SALARIO ASSISTENTE DE MARKETING",
    "326 - SALARIO ESTOQUISTA", "325 - SALARIO GERENTE", "372 - SALARIO MATERNIDADE", "324 - SALARIO OPERADORES DE CAIXA",
    "327 - SALARIO SERVIÇOS GERAIS", "323 - SALARIO VENDEDORES", "266 - SERVICOS DE COBRANÇA", "322 - TAXA ADMINISTRATIVA GT",
    "341 - TAXAS ADMINISTRATIVAS CARTOES/TEF", "13 - TAXAS DE CARTAO", "290 - TELEFONE CELULAR", "289 - TELEFONE FIXO",
    "201 - UNIFORMES", "195 - VALES-TRANSPORTE", "129 - VIAGENS","313 - MATERIAL GRAFICO",  "121 - CONSERTOS E REPAROS DE PRODUTOS", "368 - SALARIO SUPERVISOR DE CAIXA ", "369 - SALARIO SUPERVISOR DE VENDA "
  ].sort(); // Adicionado .sort() para ordenar a lista alfabeticamente
}

function mesPorExtenso(mesNum) {
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  // Garante que mesNum seja um número e subtrai 1 para o índice do array
  const index = parseInt(mesNum, 10) - 1;
  if (index >= 0 && index < meses.length) {
    return meses[index];
  }
  return "mes_invalido"; // Retorno em caso de número inválido
}

function getDespesasRoot() {
  const root = DriveApp.getRootFolder();
  const folders = root.getFoldersByName("Despesas");
  if (folders.hasNext()) return folders.next();
  return root.createFolder("Despesas"); // Cria se não existir
}

function getExistingDespesasRoot() {
  const root = DriveApp.getRootFolder();
  const folders = root.getFoldersByName("Despesas");
  return folders.hasNext() ? folders.next() : null;
}

function getOrCreateSubFolder(name, parentFolder) {
  if (!name || typeof name !== 'string' || name.trim() === "") {
    throw new Error("Nome da subpasta inválido ou vazio.");
  }
  const sanitizedName = sanitizeFolderName(name); // Sanitize antes de buscar/criar
  let folders = parentFolder.getFoldersByName(sanitizedName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(sanitizedName);
}

function getExistingFolderByName(name, parentFolder) {
  if (!name || typeof name !== 'string' || name.trim() === "") {
    return null; // Retorna null se o nome for inválido
  }
  const sanitizedName = sanitizeFolderName(name); // Sanitize antes de buscar
  let folders = parentFolder.getFoldersByName(sanitizedName);
  return folders.hasNext() ? folders.next() : null;
}

function sanitizeFolderName(name) {
  // Remove caracteres inválidos para nomes de pasta/arquivo e normaliza espaços
  return String(name).replace(/[\\/:*?"<>|#]/g, '_').replace(/\s+/g, ' ').trim();
}

function uploadFiles(formObject) {
  try {
    let { mes, ano, despesa, arquivos } = formObject;

    if (!despesa || despesa.trim() === "") throw new Error("Informe uma conta de despesa válida.");
    if (!mes || !ano) throw new Error("Mês e Ano são campos obrigatórios.");
    if (!arquivos || arquivos.length === 0) throw new Error("Nenhum arquivo recebido para upload.");

    const nomeMesExtenso = mesPorExtenso(mes);
    if (nomeMesExtenso === "mes_invalido") throw new Error("Mês informado é inválido.");

    const rootFolder = getDespesasRoot();
    const anoFolder = getOrCreateSubFolder(String(ano), rootFolder); // Garante que ano seja string
    const mesFolder = getOrCreateSubFolder(nomeMesExtenso, anoFolder);
    const contaNomeSanitized = sanitizeFolderName(despesa); // Despesa já é sanitizada aqui
    const contaFolder = getOrCreateSubFolder(contaNomeSanitized, mesFolder);

    let resultados = [];
    // Calcula o tamanho total dos arquivos decodificados
    let totalBytes = arquivos.reduce((sum, f) => sum + (f.data.length * 3 / 4), 0);
    if (totalBytes > 100 * 1024 * 1024) { // 100MB em bytes
      throw new Error("O tamanho total dos arquivos não pode exceder 100MB.");
    }

    arquivos.forEach(file => {
      try {
        if (!file || !file.data || !file.type || !file.name) {
          resultados.push(`❌ Arquivo inválido ou incompleto recebido: ${file.name || 'Nome desconhecido'}`);
          return; // Pula para o próximo arquivo
        }
        if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
          resultados.push(`❌ Tipo de arquivo não permitido: ${file.name} (${file.type})`);
          return;
        }

        let nomeFinal = sanitizeFolderName(file.name); // Sanitiza nome do arquivo individual
        if (contaFolder.getFilesByName(nomeFinal).hasNext()) {
          const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
          const nameParts = nomeFinal.split('.');
          const extension = nameParts.length > 1 ? '.' + nameParts.pop() : '';
          const baseName = nameParts.join('.');
          nomeFinal = `${baseName}_${timestamp}${extension}`;
        }

        const blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.type, nomeFinal);
        contaFolder.createFile(blob);
        resultados.push(`✅ ${nomeFinal} enviado com sucesso!`);
      } catch (fileErr) {
        resultados.push(`❌ Erro ao enviar ${file.name || 'arquivo desconhecido'}: ${fileErr.message}`);
        Logger.log(`Erro individual ao salvar arquivo: ${file.name || 'desconhecido'} | ${fileErr.toString()} | Stack: ${fileErr.stack}`);
      }
    });

    let enviadoMsg = `📤 ${arquivos.length} arquivo(s) processado(s) para ${nomeMesExtenso.toUpperCase()} de ${ano} na conta "${despesa}".`;
    resultados.unshift(enviadoMsg); // Adiciona mensagem resumo no início

    return { success: true, mensagens: resultados };

  } catch (erro) {
    Logger.log(`Erro crítico no upload: ${erro.toString()} | Stack: ${erro.stack}`);
    return { success: false, mensagens: [`❌ Erro Geral: ${erro.message}`] };
  }
}

function listUploadedFiles(ano, mes, despesa) {
  try {
    if (!ano || !mes || !despesa || despesa.trim() === "") return []; // Retorna array vazio se parâmetros essenciais faltarem

    const nomeMesExtenso = mesPorExtenso(mes);
    if (nomeMesExtenso === "mes_invalido") return [];

    const rootFolder = getExistingDespesasRoot();
    if (!rootFolder) return [];

    const anoFolder = getExistingFolderByName(String(ano), rootFolder);
    if (!anoFolder) return [];

    const mesFolder = getExistingFolderByName(nomeMesExtenso, anoFolder);
    if (!mesFolder) return [];

    const contaFolder = getExistingFolderByName(sanitizeFolderName(despesa), mesFolder);
    if (!contaFolder) return [];

    let filesData = [];
    const fileIterator = contaFolder.getFiles();
    while (fileIterator.hasNext()) {
      const file = fileIterator.next();
      filesData.push({
        name: file.getName(),
        url: file.getUrl(),
        date: Utilities.formatDate(file.getDateCreated(), Session.getScriptTimeZone(), "dd/MM/yy HH:mm") // Formato de data mais curto
      });
    }
    // Ordena por data de criação, do mais recente para o mais antigo
    filesData.sort((a, b) => new Date(b.date.split(' ')[0].split('/').reverse().join('-') + 'T' + b.date.split(' ')[1]) - new Date(a.date.split(' ')[0].split('/').reverse().join('-') + 'T' + a.date.split(' ')[1]));
    return filesData;

  } catch (err) {
    Logger.log(`Erro na listagem de arquivos: ${err.toString()} | Stack: ${err.stack}`);
    return []; // Retorna array vazio em caso de erro
  }
}

function getFolderUrl(ano, mes, despesa) {
  try {
    if (!ano || !mes || !despesa || despesa.trim() === "") return '';

    const nomeMesExtenso = mesPorExtenso(mes);
    if (nomeMesExtenso === "mes_invalido") return '';
    
    const rootFolder = getExistingDespesasRoot();
    if (!rootFolder) return '';

    const anoFolder = getExistingFolderByName(String(ano), rootFolder);
    if (!anoFolder) return '';

    const mesFolder = getExistingFolderByName(nomeMesExtenso, anoFolder);
    if (!mesFolder) return '';

    const contaFolder = getExistingFolderByName(sanitizeFolderName(despesa), mesFolder);
    if (!contaFolder) return '';

    return contaFolder.getUrl();

  } catch (e) {
    Logger.log(`Erro ao obter URL da pasta: ${e.toString()} | Stack: ${e.stack}`);
    return '';
  }
}
