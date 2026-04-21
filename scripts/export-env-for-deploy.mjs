#!/usr/bin/env node
/**
 * Lee apps/web/.env.local y apps/api/.env y escribe en stdout bloques listos
 * para pegar en Netlify (VITE_*) y Railway (resto de la API).
 *
 * Uso (solo en tu máquina; no subas la salida al repo ni la pegues en chats públicos):
 *   node scripts/export-env-for-deploy.mjs
 *
 * Opcional: solo una parte
 *   node scripts/export-env-for-deploy.mjs --netlify
 *   node scripts/export-env-for-deploy.mjs --railway
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const onlyNetlify = process.argv.includes('--netlify');
const onlyRailway = process.argv.includes('--railway');
const both = !onlyNetlify && !onlyRailway;

function parseEnv(content) {
  const out = {};
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function load(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return null;
  return parseEnv(fs.readFileSync(p, 'utf8'));
}

/** Claves VITE_* conocidas + cualquier otra VITE_ en el archivo */
function netlifyPairs(web) {
  const preferred = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_API_URL',
    'VITE_AUTH_SITE_ORIGIN',
    'VITE_SENTRY_DSN',
    'VITE_UMAMI_WEBSITE_ID',
  ];
  const out = [];
  for (const k of preferred) {
    if (web[k] != null && String(web[k]).trim() !== '') out.push([k, web[k]]);
  }
  for (const k of Object.keys(web).sort()) {
    if (!k.startsWith('VITE_')) continue;
    if (out.some(([x]) => x === k)) continue;
    if (String(web[k]).trim() === '') continue;
    out.push([k, web[k]]);
  }
  return out;
}

/** Variables de API para Railway (mismas ideas que apps/api/.env.example) */
const railwayKeyOrder = [
  'NODE_ENV',
  'LOG_LEVEL',
  'PORT',
  'ALLOWED_ORIGIN',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_PRO_MONTHLY',
  'STRIPE_PRICE_ID_PRO_YEARLY',
  'STRIPE_PRICE_ID_LIFETIME',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'APP_URL',
  'MARKETING_URL',
  'CRON_SECRET',
  'SENTRY_DSN',
  'BETTER_STACK_SOURCE_TOKEN',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_MODEL',
  'STACKOS_AGENT_URL',
  'STACKOS_AGENT_API_KEY',
  'STACKOS_AGENT_TIMEOUT_MS',
];

function railwayPairs(api) {
  const out = [];
  const used = new Set();
  for (const k of railwayKeyOrder) {
    if (api[k] != null && String(api[k]).trim() !== '') {
      out.push([k, api[k]]);
      used.add(k);
    }
  }
  for (const k of Object.keys(api).sort()) {
    if (used.has(k)) continue;
    if (String(api[k]).trim() === '') continue;
    out.push([k, api[k]]);
  }
  return out;
}

function printBlock(title, pairs) {
  console.log(`\n# ${title}\n`);
  if (pairs.length === 0) {
    console.log('# (vacío — rellena antes el .env correspondiente)\n');
    return;
  }
  for (const [k, v] of pairs) {
    const safe = String(v).includes('\n') ? JSON.stringify(v) : v;
    console.log(`${k}=${safe}`);
  }
  console.log('');
}

const web = load('apps/web/.env.local');
const api = load('apps/api/.env');

console.log(
  'BurnPilot — valores locales para paneles (Netlify / Railway).\n' +
    'No compartas esta salida. En producción usa URLs https y claves live cuando toque.\n',
);

if (both || onlyNetlify) {
  if (!web) {
    console.log('⚠ No existe apps/web/.env.local — crea con: cp apps/web/.env.example apps/web/.env.local\n');
  } else {
    printBlock(
      'NETLIFY → Site configuration → Environment variables (una fila por clave, o “Import from .env”)',
      netlifyPairs(web),
    );
    console.log(
      'Recuerda: en producción VITE_API_URL debe ser la URL pública de Railway (https://…), no localhost.\n',
    );
  }
}

if (both || onlyRailway) {
  if (!api) {
    console.log('⚠ No existe apps/api/.env — crea con: cp apps/api/.env.example apps/api/.env\n');
  } else {
    printBlock(
      'RAILWAY → servicio API → Variables (mismo nombre y valor que en apps/api/.env; ajusta ALLOWED_ORIGIN / APP_URL / MARKETING_URL a tu dominio web)',
      railwayPairs(api),
    );
    console.log(
      'Recuerda: ALLOWED_ORIGIN debe coincidir exactamente con el origen del front (https://tu-app…).\n',
    );
  }
}

if (!web && !api) {
  process.exit(1);
}
