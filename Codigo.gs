function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function uploadFile(formObject) {
  const pastaRaiz = DriveApp.getFoldersByName("Despesas").hasNext()
    ? DriveApp.getFoldersByName("Despesas").next()
    : DriveApp.createFolder("Despesas");

  const mes = formObject.mes;
  const ano = formObject.ano;
  const despesa = formObject.despesa;

  const [codigo, ...descricaoArray] = despesa.split(' - ');
  const descricao = descricaoArray.join(' - ');

  const pastaCategoria = getOrCreateFolder(pastaRaiz, `${codigo} - ${descricao}`);
  const pastaAno = getOrCreateFolder(pastaCategoria, ano);
  const pastaMes = getOrCreateFolder(pastaAno, mes);

  const blobs = formObject.arquivo.map(arquivo => {
    const contentType = arquivo.type || "application/pdf";
    return Utilities.newBlob(Utilities.base64Decode(arquivo.data), contentType, arquivo.name);
  });

  const resultados = blobs.map(blob => {
    try {
      const arquivoSalvo = pastaMes.createFile(blob);
      return {
        success: true,
        message: `Arquivo <strong>${blob.getName()}</strong> enviado com sucesso.`,
        url: arquivoSalvo.getUrl()
      };
    } catch (e) {
      return {
        success: false,
        message: `Erro ao enviar <strong>${blob.getName()}</strong>: ${e.message}`
      };
    }
  });

  return JSON.stringify(resultados);
}

function getOrCreateFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}
