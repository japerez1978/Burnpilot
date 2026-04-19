/**
 * Debe importarse primero en server.ts.
 * Cubre: cwd = apps/api, cwd = monorepo root, y ejecución desde dist/ o src/.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps', 'api', '.env'),
  path.join(__dirname, '..', '.env'),
];

for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[burnpilot/api] dotenv loaded: ${p}`);
    }
    break;
  }
}
