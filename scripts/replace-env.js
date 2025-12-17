import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envFile = join(__dirname, '../src/environments/environment.prod.ts');

// Garante que o arquivo existe antes de tentar ler
if (!existsSync(envFile)) {
  console.log('⚠️  environment.prod.ts not found. Run "npm run setup:env" first.');
  process.exit(1);
}

let content = readFileSync(envFile, 'utf8');

// Substitui variáveis de ambiente se estiverem definidas
const apiUrl = process.env.NG_APP_API_URL || 'https://api-fin-control.vercel.app/api/v1';
const googleClientId = process.env.NG_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

content = content.replace(
  /apiUrl:\s*['"`][^'"`]*['"`]/,
  `apiUrl: '${apiUrl}'`
);

content = content.replace(
  /googleClientId:\s*['"`][^'"`]*['"`]/,
  `googleClientId: '${googleClientId}'`
);

writeFileSync(envFile, content, 'utf8');
console.log('✅ Environment variables replaced successfully');

