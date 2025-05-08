function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index');
}

function uploadFile(formObject) {
  try {
    const folderName = formObject.despesa;
    const dataDespesa = formObject.data;
    const blob = formObject.arquivo;
    const nomeOriginal = blob.getName();
    const novoNome = `${dataDespesa}_${nomeOriginal}`;

    // Cria ou acessa a pasta principal
    let mainFolder;
    const mainFolders = DriveApp.getFoldersByName(folderName);
    mainFolder = mainFolders.hasNext() ? mainFolders.next() : DriveApp.createFolder(folderName);

    // Cria ou acessa a subpasta YYYY-MM
    const subFolderName = dataDespesa.substring(0, 7);
    let subFolder;
    const subFolders = mainFolder.getFoldersByName(subFolderName);
    subFolder = subFolders.hasNext() ? subFolders.next() : mainFolder.createFolder(subFolderName);

    const file = subFolder.createFile(blob);
    file.setName(novoNome);

    return `✓ ${novoNome} enviado para "${folderName}/${subFolderName}"`;
  } catch (e) {
    return `Erro ao enviar o arquivo: ${e.toString()}`;
  }
}
