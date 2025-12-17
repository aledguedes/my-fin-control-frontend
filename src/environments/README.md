# Environment Files

Os arquivos de environment são gerados automaticamente pelo script `setup-env.js` quando você executa:

- `npm run setup:env` - Cria os arquivos de environment
- `npm run dev` - Cria os arquivos e inicia o servidor de desenvolvimento
- `npm run build` - Cria os arquivos e faz o build de produção

## Variáveis de Ambiente

Os arquivos de environment podem ser configurados através de variáveis de ambiente:

- `NG_APP_API_URL` - URL da API (padrão: `https://api-fin-control.vercel.app/api/v1`)
- `NG_APP_GOOGLE_CLIENT_ID` - ID do cliente Google OAuth

### Configuração Local

Crie um arquivo `.env` na raiz do projeto (não será commitado):

```env
NG_APP_API_URL=http://localhost:3000/api/v1
NG_APP_GOOGLE_CLIENT_ID=seu-google-client-id.apps.googleusercontent.com
```

### Configuração no Netlify

Configure as variáveis de ambiente no painel do Netlify:
- Site settings → Environment variables

