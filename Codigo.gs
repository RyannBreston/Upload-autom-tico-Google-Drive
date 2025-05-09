// Função principal para exibir o Web App
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Upload de Recibos - Grupo Tavares')
    .setFaviconUrl('https://drive.google.com/uc?export=view&id=1gIudZYZ4IsG5q99L8MLSEQ2jMCxeEdpQ');
}

// Cria a estrutura de pastas automaticamente na raiz do Drive
function createFolderStructure(despesa, ano, mes) {
  Logger.log(`Criando pasta: ${despesa}/${ano}-${mes}`);
  
  // Cria ou obtém a pasta base "Grupo Tavares" na raiz do Drive
  const root = DriveApp.getRootFolder();
  const baseFolderIterator = root.getFoldersByName('Grupo Tavares');
  let baseFolder = baseFolderIterator.hasNext() ? baseFolderIterator.next() : root.createFolder('Grupo Tavares');

  // Cria a pasta da despesa, se não existir
  const despesaFolderIterator = baseFolder.getFoldersByName(despesa);
  let despesaFolder = despesaFolderIterator.hasNext() ? despesaFolderIterator.next() : baseFolder.createFolder(despesa);

  // Cria a subpasta ano-mes, se não existir
  const subFolderName = `${ano}-${mes}`;
  const subFolderIterator = despesaFolder.getFoldersByName(subFolderName);
  let folder = subFolderIterator.hasNext() ? subFolderIterator.next() : despesaFolder.createFolder(subFolderName);

  return folder;
}

// Faz o upload de um arquivo
function uploadFileToDrive(blob, folder, fileName) {
  Logger.log(`Fazendo upload do arquivo: ${fileName}`);
  if (!blob) {
    return { success: false, message: `Erro ao processar o arquivo: ${fileName}` };
  }

  try {
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { success: true, message: `Arquivo ${file.getName()} enviado com sucesso!`, url: file.getUrl() };
  } catch (e) {
    Logger.log(`Erro ao fazer upload de ${fileName}: ${e.message}`);
    return { success: false, message: `Erro ao enviar ${fileName}: ${e.message}` };
  }
}

// Função principal de upload
function uploadFile(formObject) {
  if (!formObject.mes.match(/^(0[1-9]|1[0-2])$/) || !formObject.ano.match(/^\d{4}$/) || !formObject.despesa) {
    return JSON.stringify([{ success: false, message: 'Dados inválidos: Verifique mês, ano ou despesa.' }]);
  }

  const folder = createFolderStructure(formObject.despesa, formObject.ano, formObject.mes);
  const results = [];

  formObject.arquivo.forEach(blob => {
    const result = uploadFileToDrive(blob, folder, blob.getName());
    results.push(result);
  });

  const userEmail = Session.getActiveUser().getEmail();
  const subject = 'Upload Concluído - Grupo Tavares';
  const body = `Olá,\n\nSeu upload foi concluído com sucesso!\nDetalhes:\n- Arquivos: ${results.length}\n- Pasta: ${formObject.despesa}/${formObject.ano}-${formObject.mes}\n\nAcesse o Drive para visualizar: https://drive.google.com/drive/my-drive`;
  MailApp.sendEmail(userEmail, subject, body);

  return JSON.stringify(results);
}/**
 * @OnlyCurrentDoc
 */

/**
 * Configurações centralizadas do script.
 */
const CONFIG = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  ALLOWED_MIME_TYPES: [MimeType.PDF],
  CACHE_EXPIRATION_SECONDS: 3600 // Cache de pastas por 1 hora
};

/**
 * Serve o HTML do formulário de upload.
 * @returns {HtmlOutput} - Página HTML do formulário.
 */
function doGet() {
  if (!Session.getActiveUser().getEmail()) {
    return HtmlService.createHtmlOutput("Acesso negado. Faça login.").setTitle("Erro");
  }
  return HtmlService.createHtmlOutputFromFile("Index").setTitle("Upload de Recibos - Grupo Tavares");
}

/**
 * Processa o upload de um ou mais arquivos PDF.
 * @param {Object} formObject - Objeto contendo arquivo(s), mês, ano e tipo de despesa.
 * @param {Blob|Blob[]} formObject.arquivo - Arquivo(s) enviado(s).
 * @param {string} formObject.mes - Mês do recibo (1-12).
 * @param {string} formObject.ano - Ano do recibo.
 * @param {string} formObject.despesa - Tipo de despesa.
 * @returns {string} - Resposta JSON com o resultado do upload.
 */
function uploadFile(formObject) {
  const lock = LockService.getScriptLock();
  let results = [];

  try {
    // Valida campos obrigatórios
    if (!formObject?.arquivo || !formObject?.mes || !formObject?.ano || !formObject?.despesa) {
      throw new Error("Dados incompletos. Preencha todos os campos.");
    }

    // Valida mês e ano
    validateFormInputs(formObject);

    // Normaliza para array de arquivos
    const files = formObject.arquivo instanceof Array ? formObject.arquivo : [formObject.arquivo];

    // Verifica permissões no Drive
    checkDrivePermissions();

    // Aguarda o lock
    if (!lock.tryLock(30000)) {
      throw new Error("Não foi possível adquirir o bloqueio. Tente novamente.");
    }

    for (const blob of files) {
      const originalName = blob.getName();
      const sanitizedOriginalName = sanitizeName(originalName);

      // Valida tipo e tamanho do arquivo
      validateFile(blob, originalName);

      const folderName = sanitizeName(formObject.despesa);
      const subFolderName = `${formObject.ano}-${String(formObject.mes).padStart(2, '0')}`;
      const newFileName = `${subFolderName}_${sanitizedOriginalName}`;

      // Cria ou acessa pastas automaticamente
      const mainFolder = getOrCreateFolder(DriveApp, folderName);
      const subFolder = getOrCreateFolder(mainFolder, subFolderName);

      // Faz o upload do arquivo
      const file = subFolder.createFile(blob);
      file.setName(newFileName);
      const fileUrl = file.getUrl();

      // Valida tamanho após upload
      if (file.getSize() > CONFIG.MAX_FILE_SIZE_BYTES) {
        file.setTrashed(true);
        throw new Error(`O arquivo '${newFileName}' excedeu o limite após upload.`);
      }

      results.push(createResponse(true, `${newFileName} enviado com sucesso para "${folderName}/${subFolderName}".`, fileUrl));
    }

    return JSON.stringify(results);
  } catch (e) {
    results.push(createResponse(false, `Erro ao processar o arquivo: ${e.message}`));
    return JSON.stringify(results);
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

/**
 * Valida os campos de entrada do formulário (mês e ano).
 * @param {Object} formObject - Objeto com os dados do formulário.
 * @throws {Error} - Se mês ou ano forem inválidos.
 */
function validateFormInputs(formObject) {
  const mes = parseInt(formObject.mes, 10);
  const ano = parseInt(formObject.ano, 10);
  if (isNaN(mes) || mes < 1 || mes > 12) {
    throw new Error("Mês inválido. Deve ser entre 1 e 12.");
  }
  if (isNaN(ano) || ano < 2000 || ano > new Date().getFullYear()) {
    throw new Error("Ano inválido. Deve ser entre 2000 e o ano atual.");
  }
}

/**
 * Verifica permissões de escrita no Google Drive.
 * @throws {Error} - Se não houver permissão.
 */
function checkDrivePermissions() {
  try {
    const testFolder = DriveApp.getRootFolder().createFolder("teste_perm");
    testFolder.setTrashed(true);
  } catch (e) {
    throw new Error("Permissões insuficientes para criar pastas no Google Drive.");
  }
}

/**
 * Valida o arquivo quanto ao tipo e tamanho.
 * @param {Blob} blob - Arquivo enviado.
 * @param {string} originalName - Nome original do arquivo.
 * @throws {Error} - Se o arquivo for inválido.
 */
function validateFile(blob, originalName) {
  const mimeType = blob.getContentType();
  const fileSize = blob.getBytes().length;

  if (!CONFIG.ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Tipo de arquivo inválido para '${originalName}'. Apenas PDFs são permitidos.`);
  }

  if (fileSize > CONFIG.MAX_FILE_SIZE_BYTES) {
    throw new Error(`O arquivo '${originalName}' é muito grande (limite de 10MB).`);
  }

  // Valida se é um PDF real
  if (!isValidPdf(blob)) {
    throw new Error(`O arquivo '${originalName}' não é um PDF válido.`);
  }
}

/**
 * Verifica se o arquivo é um PDF válido com base na assinatura inicial.
 * @param {Blob} blob - Arquivo a ser validado.
 * @returns {boolean} - True se for um PDF válido.
 */
function isValidPdf(blob) {
  const bytes = blob.getBytes();
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
}

/**
 * Cria ou acessa uma pasta com determinado nome, usando cache.
 * @param {Folder} parent - Pasta pai.
 * @param {string} name - Nome da pasta.
 * @returns {Folder} - Pasta existente ou recém-criada.
 */
function getOrCreateFolder(parent, name) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `folder_${parent.getId()}_${name}`;
  let folderId = cache.get(cacheKey);

  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      // Cache inválido, prossegue sem cache
    }
  }

  const folders = parent.getFoldersByName(name);
  const folder = folders.hasNext() ? folders.next() : parent.createFolder(name);
  cache.put(cacheKey, folder.getId(), CONFIG.CACHE_EXPIRATION_SECONDS);
  return folder;
}

/**
 * Cria uma mensagem de resposta padronizada em formato JSON.
 * @param {boolean} success - Indica se a operação foi bem-sucedida.
 * @param {string} message - Mensagem de resposta.
 * @param {string} [url] - URL do arquivo (opcional).
 * @returns {Object} - Objeto de resposta.
 */
function createResponse(success, message, url = "") {
  const response = {
    success,
    message,
    url,
    timestamp: new Date().toISOString()
  };
  Logger.log(JSON.stringify(response));
  return response;
}

/**
 * Sanitiza nomes de arquivos e pastas.
 * @param {string} name - Nome a ser sanitizado.
 * @returns {string} - Nome sanitizado.
 */
function sanitizeName(name) {
  if (!name) return "nome_padrao";
  let sanitized = name.replace(/[^a-zA-Z0-9 ._\-]/g, '_').substring(0, 100); // Limite de 100 caracteres
  sanitized = sanitized.replace(/__+/g, '_').replace(/^[_.]+|[_.]+$/g, '');
  return sanitized || "arquivo_sanitizado";
}
