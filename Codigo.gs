const PASTA_PRINCIPAL = "Despesas";

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index");
}

function listarCategorias() {
  return [
    { codigo: "004", nome: "COMPRAS A VISTA" },
    { codigo: "005", nome: "COMPRAS A PRAZO" },
    { codigo: "006", nome: "PAGAMENTOS DE TITULOS" },
    { codigo: "008", nome: "DEVOLUCOES/TROCAS (FORNECEDORES)" },
    { codigo: "014", nome: "IMPOSTOS SOBRE COMPRAS" },
    // ... Continue com todas as linhas da sua lista
    { codigo: "999", nome: "CARTÃO FIDELIDADE" }
  ];
}

function salvarArquivo(base64, nomeArquivo, categoria, ano, mes, usuario) {
  const blob = Utilities.base64Decode(base64.split(',')[1]);
  const pdf = Utilities.newBlob(blob, 'application/pdf', nomeArquivo);
  
  const pastaPrincipal = criarOuObterPasta(PASTA_PRINCIPAL);
  const pastaCategoria = criarOuObterPasta(categoria, pastaPrincipal);
  const pastaAno = criarOuObterPasta(ano, pastaCategoria);
  const pastaMes = criarOuObterPasta(mes, pastaAno);

  const arquivo = pastaMes.createFile(pdf);
  arquivo.setDescription(`Enviado por: ${usuario}`);
  
  return `Arquivo enviado com sucesso: ${arquivo.getName()}`;
}

function criarOuObterPasta(nome, pastaPai) {
  const pastas = (pastaPai || DriveApp).getFoldersByName(nome);
  return pastas.hasNext() ? pastas.next() : (pastaPai || DriveApp).createFolder(nome);
}
