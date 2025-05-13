function doGet() {
  return HtmlService.createHtmlOutputFromFile('index.html')
    .setTitle('Upload de Despesas - Grupo Tavares');
}

function uploadFile(formObject) {
  try {
    const { mes, ano, despesa, arquivo } = formObject;

    // Configurar a pasta raiz
    const rootFolderName = "Despesas";
    const rootFolder = getOrCreateFolder(rootFolderName);

    // Subpastas de organização
    const anoFolder = getOrCreateFolder(ano, rootFolder);
    const mesFolder = getOrCreateFolder(mes, anoFolder);
    const despesaFolder = getOrCreateFolder(despesa, mesFolder);

    // Fazer upload dos arquivos
    const blob = Utilities.newBlob(Utilities.base64Decode(arquivo.data), arquivo.type, arquivo.name);
    despesaFolder.createFile(blob);
    return { success: true, message: `Arquivo ${arquivo.name} enviado com sucesso!` };
  } catch (error) {
    return { success: false, message: `Erro: ${error.message}` };
  }
}

function getOrCreateFolder(name, parentFolder) {
  const folders = parentFolder.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(name);
  }
}
