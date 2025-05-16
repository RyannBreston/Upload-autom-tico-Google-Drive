
    function doGet() {
  return HtmlService.createHtmlOutputFromFile('index.html')
    .setTitle('Upload de Despesas - Grupo Tavares');
}

// Função para upload de múltiplos arquivos
function uploadFiles(formObject) {
  try {
    const { mes, ano, despesa, arquivos } = formObject;
    const rootFolder = getOrCreateFolder_("Despesas");
    const anoFolder = getOrCreateFolder_(ano, rootFolder);
    const mesFolder = getOrCreateFolder_(mes, anoFolder);
    const despesaFolder = getOrCreateFolder_(despesa, mesFolder);

    let resultados = [];

    arquivos.forEach(file => {
      const blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.type, file.name);
      despesaFolder.createFile(blob);
      resultados.push(`✅ ${file.name} enviado!`);
    });

    return {success: true, mensagens: resultados};
  } catch (erro) {
    return {success: false, mensagens: [`❌ Erro: ${erro.message}`]};
  }
}

// Função para criar/obter pasta
function getOrCreateFolder_(name, parent) {
  if (!name) throw new Error("Nome de pasta inválido.");
  let folders = parent ? parent.getFoldersByName(name) : DriveApp.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parent ? parent.createFolder(name) : DriveApp.createFolder(name);
  }
}
