# Sistema de Envio de Despesas - Grupo Tavares

## Descrição

Este projeto é uma aplicação web desenvolvida com Google Apps Script, HTML, CSS e JavaScript (utilizando Materialize CSS para o frontend) que permite aos utilizadores do Grupo Tavares enviar comprovativos de despesas de forma organizada para o Google Drive. A aplicação cria uma estrutura de pastas hierárquica (Ano > Mês > Conta de Despesa) para armazenar os ficheiros enviados.

## Funcionalidades Principais

* **Interface Intuitiva:** Design moderno e responsivo, adaptado para uso em desktops e dispositivos móveis.
* **Seleção de Período:** Campos para selecionar o Ano Fiscal e o Mês de Competência da despesa.
    * O seletor de ano inclui anos futuros para planeamento.
* **Seleção de Conta de Despesa:** Campo de texto com `datalist` preenchida dinamicamente com as contas de despesa disponíveis.
    * Feedback visual imediato se a conta digitada corresponde a uma opção válida.
* **Upload de Múltiplos Ficheiros:** Permite selecionar múltiplos ficheiros (PDF, JPG, PNG) de uma vez.
    * Pré-visualização dos ficheiros selecionados, incluindo nome, ícone do tipo de ficheiro e tamanho.
    * Opção para remover ficheiros individualmente da seleção antes do envio.
    * Botão para limpar todos os ficheiros selecionados.
    * Validação do tipo e tamanho individual dos ficheiros no cliente (limite de 50MB por ficheiro).
* **Zona de Arrastar e Soltar (Drag and Drop):** Interface visual preparada para a funcionalidade de arrastar e soltar ficheiros.
* **Estrutura de Pastas no Google Drive:**
    * Cria automaticamente uma pasta raiz "Despesas" (se não existir).
    * Dentro dela, cria subpastas por `Ano`, depois por `Mês` (por extenso, ex: "janeiro"), e finalmente por `Conta de Despesa` sanitizada.
    * Os nomes das pastas e ficheiros são sanitizados para remover caracteres inválidos.
    * Se um ficheiro com o mesmo nome já existir na pasta de destino, um timestamp é adicionado ao nome do novo ficheiro para evitar sobrescritas.
* **Feedback ao Utilizador:**
    * Notificações visuais (toasts/alertas customizados) para sucesso, erro, e informações.
    * Barra de progresso durante o envio dos ficheiros.
    * Mensagens de status detalhadas após o processamento do envio.
* **Listagem de Ficheiros Enviados:**
    * Exibe uma lista dos ficheiros já presentes na pasta de destino correspondente ao Ano, Mês e Conta de Despesa selecionados.
    * A lista inclui nome do ficheiro, ícone, data de envio e um link direto para abrir o ficheiro no Google Drive.
    * Filtro para pesquisar ficheiros na lista de enviados.
    * Animações e "skeleton loaders" para uma melhor experiência ao carregar a lista.
* **Botão "Ver Pasta":** Permite abrir diretamente a pasta de destino no Google Drive.
* **Persistência de Dados:**
    * Os últimos valores selecionados para Ano, Mês e Conta de Despesa são guardados no `localStorage` do navegador para facilitar envios subsequentes.
    * O campo "Conta de Despesa" é limpo automaticamente após um envio bem-sucedido para facilitar novos lançamentos.
* **Modal de Confirmação:** Utiliza um modal customizado para confirmar a limpeza do formulário.

## Tecnologias Utilizadas

* **Google Apps Script:** Para a lógica do lado do servidor (backend), manipulação de ficheiros e pastas no Google Drive, e para servir a interface web.
* **HTML5:** Estrutura da página web.
* **CSS3:** Estilização da interface, incluindo variáveis CSS para um tema customizável e design responsivo.
* **JavaScript (ES6+):** Para a interatividade do lado do cliente, manipulação do DOM, validações, chamadas assíncronas ao backend (Google Apps Script), e gestão do estado da interface.
* **Materialize CSS:** Framework CSS para componentes de interface e sistema de grelha.
* **Google Drive API:** Utilizada implicitamente através dos serviços `DriveApp` do Google Apps Script.

## Como Utilizar / Configurar

1.  **Criar um Projeto Google Apps Script:**
    * Aceda a [script.google.com](https://script.google.com/) e crie um novo projeto.
2.  **Copiar o Código:**
    * Copie o conteúdo do ficheiro `Code.gs` (fornecido no projeto) para o editor de script do seu projeto Apps Script.
    * Crie um ficheiro HTML dentro do projeto Apps Script (Ex: `Arquivo > Novo > Ficheiro HTML`) e nomeie-o como `index.html`. Copie o conteúdo do ficheiro `index.html` (fornecido no projeto) para este ficheiro HTML.
3.  **Publicar como Aplicação Web:**
    * No editor do Apps Script, vá a `Publicar > Implementar como aplicação web...`.
    * Configure as seguintes opções:
        * **Execute a aplicação como:** "Eu" (ou o utilizador que terá permissão para aceder ao Drive).
        * **Quem tem acesso à aplicação:** "Qualquer pessoa" ou "Qualquer pessoa, mesmo anónimos" (se quiser que seja acessível publicamente) ou restrinja a utilizadores específicos do seu domínio Google Workspace.
    * Clique em "Implementar" ou "Atualizar".
    * Copie o URL da aplicação web fornecido. Este é o link para aceder à aplicação.
4.  **Permissões:**
    * Na primeira vez que executar ou ao publicar, o Google solicitará autorização para que o script aceda aos seus dados do Google Drive. Conceda as permissões necessárias.

## Estrutura de Pastas Criada no Google Drive

A aplicação criará a seguinte estrutura de pastas na raiz do Google Drive do utilizador que autorizou o script:


Minha Drive/
└── Despesas/
└── [Ano]/  (ex: 2025)
└── [Mês]/ (ex: janeiro)
└── [Nome da Conta de Despesa Sanitizado]/
├── ficheiro1.pdf
├── imagem_comprovativo.jpg
└── outro_documento_ANO_MES_DIA_HORA_MIN_SEG.png


## Detalhes do Código

### Lado do Servidor (`Code.gs` - Google Apps Script)

* `doGet()`: Função principal que serve o `index.html` como uma aplicação web.
* `getContasDespesas()`: Retorna a lista de contas de despesa (atualmente hardcoded, mas pode ser adaptada para ler de uma Google Sheet).
* `mesPorExtenso(mesNum)`: Converte o número do mês para o nome por extenso.
* `getDespesasRoot()`, `getExistingDespesasRoot()`: Gerem a pasta raiz "Despesas".
* `getOrCreateSubFolder(name, parentFolder)`: Cria ou obtém uma subpasta.
* `getExistingFolderByName(name, parentFolder)`: Obtém uma subpasta existente.
* `sanitizeFolderName(name)`: Remove caracteres inválidos de nomes de pastas/ficheiros.
* `uploadFiles(formObject)`: Função principal para o upload. Recebe os dados do formulário (mês, ano, despesa, e ficheiros codificados em base64), cria a estrutura de pastas necessária, descodifica os ficheiros e guarda-os no Drive. Inclui validação de tamanho total e tipo de ficheiro.
* `listUploadedFiles(ano, mes, despesa)`: Lista os ficheiros de uma pasta específica, retornando nome, URL e data de criação.
* `getFolderUrl(ano, mes, despesa)`: Retorna o URL da pasta de destino no Google Drive.

### Lado do Cliente (`index.html` - HTML, CSS, JavaScript)

* **HTML:** Estrutura semântica da página, utilizando Materialize CSS para layout e componentes.
* **CSS:** Estilização customizada para um design moderno e responsivo, com uso extensivo de variáveis CSS para fácil tematização. Inclui:
    * Paleta de cores moderna.
    * Tipografia consistente.
    * Estilos para botões, inputs, modais, notificações, listas, etc.
    * Animações subtis e "skeleton loaders" para feedback visual.
    * Media queries para adaptação a diferentes tamanhos de ecrã (desktop, tablet, mobile).
* **JavaScript:**
    * Inicialização de componentes Materialize (selects, tooltips, modais).
    * População dinâmica do seletor de Ano e da `datalist` de Contas de Despesa (chamando `google.script.run`).
    * Gestão do estado do formulário e persistência de dados (Ano, Mês, Despesa) no `localStorage`.
    * Manipulação da seleção de ficheiros:
        * Pré-visualização de ficheiros (nome, tamanho, ícone).
        * Validação de tipo e tamanho individual no cliente.
        * Remoção de ficheiros da seleção.
    * Lógica de submissão do formulário:
        * Conversão de ficheiros para base64.
        * Chamada assíncrona para `google.script.run.uploadFiles`.
        * Exibição de barra de progresso e mensagens de status.
    * Funcionalidade para listar e filtrar ficheiros já enviados.
    * Funcionalidade para abrir a pasta de destino no Drive.
    * Funções de utilidade (ex: `showNotification`, `validateDatalistInput`).
    * Lógica visual para a zona de "arrastar e soltar".

## Possíveis Melhorias Futuras

* Implementar a funcionalidade completa de "arrastar e soltar" (drag and drop) para upload de ficheiros.
* Adicionar um campo de "Observações" por envio.
* Paginação ou "Carregar Mais" para a lista de ficheiros enviados, caso se torne muito extensa.
* Opção de tema escuro (Dark Mode).
* Integração com Google Sheets para gerir a lista de "Contas de Despesa" de forma dinâmica.
* Pré-visualização de imagens (thumbnails) diretamente na interface.

## Autor

* **RyannBreston** - [GitHub](https://github.com/RyannBreston)
* Adaptado e aprimorado com assistência de IA.

---

*Este README foi gerado com base no estado do projeto em [Data Atual].*
