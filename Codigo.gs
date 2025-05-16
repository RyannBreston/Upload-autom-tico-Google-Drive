function doGet() {
  return HtmlService.createHtmlOutputFromFile('index.html')
    .setTitle('Upload de Despesas - Grupo Tavares');
}

function uploadFiles(formObject) {
  try {
    const { mes, ano, despesa, arquivos } = formObject;
    if (!mes || !ano || !despesa) throw new Error("Campos obrigatórios não informados.");
    if (!arquivos || !arquivos.length) throw new Error("Nenhum arquivo recebido.");
    if (arquivos.length > 5) throw new Error("Selecione no máximo 5 arquivos por vez.");

    // Sanitização dos nomes de pastas
    const safeAno = sanitizeFolderName(ano);
    const safeMes = sanitizeFolderName(mes);
    const safeDespesa = sanitizeFolderName(despesa);

    const rootFolder = getOrCreateFolder_("Despesas");
    const anoFolder = getOrCreateFolder_(safeAno, rootFolder);
    const mesFolder = getOrCreateFolder_(safeMes, anoFolder);
    const despesaFolder = getOrCreateFolder_(safeDespesa, mesFolder);

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
        // Limite de tamanho individual ~ 5MB
        if ((file.data.length * 3 / 4 / 1048576) > 5) {
          resultados.push(`❌ Arquivo muito grande: ${file.name}`);
          return;
        }
        // Evita sobrescrever: adiciona timestamp ao nome se já existe
        let nomeFinal = sanitizeFolderName(file.name);
        if (despesaFolder.getFilesByName(nomeFinal).hasNext()) {
          const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
          nomeFinal = ts + "-" + nomeFinal;
        }
        const blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.type, nomeFinal);
        despesaFolder.createFile(blob);
        resultados.push(`✅ ${nomeFinal} enviado!`);
      } catch (fileErr) {
        resultados.push(`❌ Erro ao enviar ${file.name}: ${fileErr.message}`);
        Logger.log("Erro individual ao salvar arquivo: " + file.name + " | " + fileErr);
      }
    });

    return {success: true, mensagens: resultados};
  } catch (erro) {
    Logger.log("Erro crítico no upload: " + erro);
    return {success: false, mensagens: [`❌ Erro: ${erro.message}`]};
  }
}

function listUploadedFiles(ano, mes, despesa) {
  try {
    if (!ano || !mes || !despesa) return [];
    // Sanitização dos nomes de pastas
    const safeAno = sanitizeFolderName(ano);
    const safeMes = sanitizeFolderName(mes);
    const safeDespesa = sanitizeFolderName(despesa);

    const rootFolder = getOrCreateFolder_("Despesas");
    const anoFolder = getOrCreateFolder_(safeAno, rootFolder);
    const mesFolder = getOrCreateFolder_(safeMes, anoFolder);
    const despesaFolder = getOrCreateFolder_(safeDespesa, mesFolder);
    let files = [];
    const iterator = despesaFolder.getFiles();
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

function getOrCreateFolder_(name, parent) {
  if (!name) throw new Error("Nome de pasta inválido.");
  let folders = parent ? parent.getFoldersByName(name) : DriveApp.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parent ? parent.createFolder(name) : DriveApp.createFolder(name);
  }
}

// Sanitização para nomes de pastas e arquivos: remove caracteres inválidos no Drive
function sanitizeFolderName(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, '_').trim();
}
