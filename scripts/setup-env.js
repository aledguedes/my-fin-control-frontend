import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envDir = join(__dirname, '../src/environments');
const envDevFile = join(envDir, 'environment.ts');
const envProdFile = join(envDir, 'environment.prod.ts');

// Garante que o diretório existe
if (!existsSync(envDir)) {
  mkdirSync(envDir, { recursive: true });
}

// Template para environment.ts (desenvolvimento)
const devTemplate = `export const environment = {
  production: false,
  apiUrl: 'https://api-fin-control.vercel.app/api/v1',
  googleClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
};
`;

// Template para environment.prod.ts (produção)
// Valores serão substituídos pelo script replace-env.js durante o build
const prodTemplate = `export const environment = {
  production: true,
  apiUrl: 'https://api-fin-control.vercel.app/api/v1',
  googleClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
};
`;

// Cria os arquivos se não existirem
if (!existsSync(envDevFile)) {
  writeFileSync(envDevFile, devTemplate, 'utf8');
  console.log('✅ Created src/environments/environment.ts');
}

if (!existsSync(envProdFile)) {
  writeFileSync(envProdFile, prodTemplate, 'utf8');
  console.log('✅ Created src/environments/environment.prod.ts');
}

console.log('✅ Environment files ready');

