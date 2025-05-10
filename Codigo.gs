/**
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
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Upload de Recibos - Grupo Tavares")
    .setFaviconUrl("https://drive.google.com/uc?export=view&id=1gIudZYZ4IsG5q99L8MLSEQ2jMCxeEdpQ");
}

/**
 * Processa o upload de um ou mais arquivos PDF.
 * @param {Object} formObject - Objeto contendo arquivo(s), mês, ano e tipo de despesa.
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

    validateFormInputs(formObject);
    const files = formObject.arquivo instanceof Array ? formObject.arquivo : [formObject.arquivo];
    checkDrivePermissions();

    if (!lock.tryLock(30000)) {
      throw new Error("Não foi possível adquirir o bloqueio. Tente novamente.");
    }

    for (const blob of files) {
      const originalName = blob.getName();
      const sanitizedOriginalName = sanitizeName(originalName);

      validateFile(blob, originalName);

      const folderName = sanitizeName(formObject.despesa);
      const subFolderName = `${formObject.ano}-${String(formObject.mes).padStart(2, '0')}`;
      const newFileName = `${subFolderName}_${sanitizedOriginalName}`;

      const mainFolder = getOrCreateFolder(DriveApp.getRootFolder(), folderName);
      const subFolder = getOrCreateFolder(mainFolder, subFolderName);

      const file = subFolder.createFile(blob);
      file.setName(newFileName);
      const fileUrl = file.getUrl();

      if (file.getSize() > CONFIG.MAX_FILE_SIZE_BYTES) {
        file.setTrashed(true);
        throw new Error(`O arquivo '${newFileName}' excedeu o limite após upload.`);
      }

      results.push(createResponse(true, `${newFileName} enviado com sucesso para "${folderName}/${subFolderName}".`, fileUrl));
    }

    sendNotificationEmail(formObject, results.length);
    return JSON.stringify(results);
  } catch (e) {
    results.push(createResponse(false, `Erro ao processar o arquivo: ${e.message}`));
    return JSON.stringify(results);
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

/**
 * Valida os campos do formulário.
 */
function validateFormInputs(formObject) {
  const mes = parseInt(formObject.mes, 10);
  const ano = parseInt(formObject.ano, 10);
  if (isNaN(mes) || mes < 1 || mes > 12) throw new Error("Mês inválido. Deve ser entre 1 e 12.");
  if (isNaN(ano) || ano < 2000 || ano > new Date().getFullYear()) throw new Error("Ano inválido.");
}

/**
 * Verifica permissões de escrita no Drive.
 */
function checkDrivePermissions() {
  try {
    const testFolder = DriveApp.getRootFolder().createFolder("teste_perm");
    testFolder.setTrashed(true);
  } catch {
    throw new Error("Permissões insuficientes para criar pastas no Google Drive.");
  }
}

/**
 * Valida tipo e tamanho do arquivo.
 */
function validateFile(blob, originalName) {
  const mimeType = blob.getContentType();
  const fileSize = blob.getBytes().length;

  if (!CONFIG.ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Tipo inválido para '${originalName}'. Apenas PDFs são permitidos.`);
  }

  if (fileSize > CONFIG.MAX_FILE_SIZE_BYTES) {
    throw new Error(`Arquivo '${originalName}' é muito grande (limite 10MB).`);
  }

  if (!isValidPdf(blob)) {
    throw new Error(`Arquivo '${originalName}' não é um PDF válido.`);
  }
}

/**
 * Verifica a assinatura do PDF.
 */
function isValidPdf(blob) {
  const bytes = blob.getBytes();
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

/**
 * Cria ou acessa uma pasta com cache.
 */
function getOrCreateFolder(parent, name) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `folder_${parent.getId()}_${name}`;
  let folderId = cache.get(cacheKey);

  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch {}
  }

  const folders = parent.getFoldersByName(name);
  const folder = folders.hasNext() ? folders.next() : parent.createFolder(name);
  cache.put(cacheKey, folder.getId(), CONFIG.CACHE_EXPIRATION_SECONDS);
  return folder;
}

/**
 * Sanitiza nomes de arquivos e pastas.
 */
function sanitizeName(name) {
  if (!name) return "nome_padrao";
  let sanitized = name.replace(/[^a-zA-Z0-9 ._\-]/g, '_').substring(0, 100);
  sanitized = sanitized.replace(/__+/g, '_').replace(/^[_.]+|[_.]+$/g, '');
  return sanitized || "arquivo_sanitizado";
}

/**
 * Cria uma resposta padronizada.
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
 * Envia email de notificação após upload.
 */
function sendNotificationEmail(formObject, fileCount) {
  const userEmail = Session.getActiveUser().getEmail();
  const subject = 'Upload Concluído - Grupo Tavares';
  const body = `Olá,\n\nSeu upload foi concluído com sucesso!\n\nDetalhes:\n- Arquivos enviados: ${fileCount}\n- Pasta destino: ${formObject.despesa}/${formObject.ano}-${formObject.mes}\n\nAcesse seu Drive para visualizar.\n\nAtenciosamente,\nGrupo Tavares`;

  MailApp.sendEmail(userEmail, subject, body);
}
