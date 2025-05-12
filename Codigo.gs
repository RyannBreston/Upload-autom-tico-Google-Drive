function uploadFile(formObject) {
  try {
    // Pega os dados do formulário
    const { mes, ano, despesa, arquivo } = formObject;

    // Nome da pasta principal
    const rootFolderName = "Despesas";
    const rootFolder = getOrCreateFolder(rootFolderName);

    // Cria subpastas para ano/mês/despesa
    const anoFolder = getOrCreateFolder(ano, rootFolder);
    const mesFolder = getOrCreateFolder(mes, anoFolder);
    const despesaFolder = getOrCreateFolder(despesa, mesFolder);

    // Faz o upload dos arquivos
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

// Função para pegar ou criar uma pasta
function getOrCreateFolder(name, parentFolder) {
  const folders = parentFolder.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(name);
  }
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index.html')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}
