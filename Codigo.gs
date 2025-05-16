function doGet() {
  return HtmlService.createHtmlOutputFromFile('index.html')
    .setTitle('Upload de Despesas - Grupo Tavares');
}

// Upload de arquivos
function uploadFiles(formObject) {
  try {
    const { mes, ano, despesa, arquivos } = formObject;
    if (!mes || !ano || !despesa) throw new Error("Campos obrigatórios não informados.");
    if (!arquivos || !arquivos.length) throw new Error("Nenhum arquivo recebido.");
    const rootFolder = getOrCreateFolder_("Despesas");
    const anoFolder = getOrCreateFolder_(ano, rootFolder);
    const mesFolder = getOrCreateFolder_(mes, anoFolder);
    const despesaFolder = getOrCreateFolder_(despesa, mesFolder);

    let resultados = [];
    arquivos.forEach(file => {
      if (!file || !file.data || !file.type || !file.name) {
        resultados.push(`❌ Arquivo inválido recebido.`);
        return;
      }
      // Evita sobrescrever: adiciona timestamp ao nome se já existe
      let nomeFinal = file.name;
      if (despesaFolder.getFilesByName(file.name).hasNext()) {
        const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
        nomeFinal = ts + "-" + file.name;
      }
      const blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.type, nomeFinal);
      despesaFolder.createFile(blob);
      resultados.push(`✅ ${nomeFinal} enviado!`);
    });

    return {success: true, mensagens: resultados};
  } catch (erro) {
    return {success: false, mensagens: [`❌ Erro: ${erro.message}`]};
  }
}

// Listagem de arquivos enviados para ano/mes/despesa
function listUploadedFiles(ano, mes, despesa) {
  try {
    if (!ano || !mes || !despesa) return [];
    const rootFolder = getOrCreateFolder_("Despesas");
    const anoFolder = getOrCreateFolder_(ano, rootFolder);
    const mesFolder = getOrCreateFolder_(mes, anoFolder);
    const despesaFolder = getOrCreateFolder_(despesa, mesFolder);
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
    // Ordena por data (mais recente primeiro)
    files.sort((a, b) => b.date.localeCompare(a.date));
    return files;
  } catch(err) {
    return [];
  }
}

// Utilitário de criação/obtenção de pastas
function getOrCreateFolder_(name, parent) {
  if (!name) throw new Error("Nome de pasta inválido.");
  let folders = parent ? parent.getFoldersByName(name) : DriveApp.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parent ? parent.createFolder(name) : DriveApp.createFolder(name);
  }
}
