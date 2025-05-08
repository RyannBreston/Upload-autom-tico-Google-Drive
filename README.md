# Sistema de Upload de Recibos em PDF para o Google Drive

Este projeto é um aplicativo web construído com Google Apps Script para facilitar o upload de múltiplos arquivos PDF de recibos, organizando-os automaticamente no Google Drive em pastas por **tipo de despesa** e **data**.

## Funcionalidades

- Upload de múltiplos arquivos PDF de uma vez.
- Organização automática em pastas por tipo de despesa.
- Criação de subpastas por mês (ex: `2025-05`) dentro de cada despesa.
- Renomeia os arquivos com a data da despesa.
- Interface simples e responsiva para uso interno.

## Exemplo de Estrutura no Drive

Google Drive/ ├── 284 - Comissão Vendedores/ │   └── 2025-05/ │       └── 2025-05-08_recibo.pdf

## Como usar

1. Abra o [Google Apps Script](https://script.google.com).
2. Crie um novo projeto e cole o conteúdo dos arquivos:
   - `Código.gs` (script backend)
   - `Index.html` (interface do usuário)
3. Vá em `Implantar > Nova implantação > Aplicativo da Web`.
4. Escolha "Executar como: você" e "Quem tem acesso: qualquer pessoa com o link".
5. Autorize os acessos solicitados.
6. Use o link gerado para acessar o sistema.

## Licença

MIT
