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
    const results = [];
    arquivo.forEach(file => {
      const blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.type, file.name);
      despesaFolder.createFile(blob);
      results.push({ success: true, message: `Arquivo ${file.name} enviado com sucesso!` });
    });

    return JSON.stringify(results);
  } catch (error) {
    return JSON.stringify([{ success: false, message: `Erro: ${error.message}` }]);
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
