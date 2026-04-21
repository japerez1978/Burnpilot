#!/usr/bin/env node
/**
 * Comprueba que apps/web/.env.local y apps/api/.env tengan valores no vacíos
 * para las claves necesarias antes de copiarlas a Netlify/Railway.
 *
 * Uso:
 *   node scripts/go-live-check.mjs
 *   node scripts/go-live-check.mjs --production
 *
 * --production: además exige https y rechaza localhost en URLs de producción.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const production = process.argv.includes('--production');

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

function loadFile(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return { path: p, env: null };
  return { path: p, env: parseEnv(fs.readFileSync(p, 'utf8')) };
}

const webKeys = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_API_URL',
];
const webOptional = ['VITE_AUTH_SITE_ORIGIN', 'VITE_SENTRY_DSN', 'VITE_UMAMI_WEBSITE_ID'];

const apiKeys = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_PRO_MONTHLY',
  'STRIPE_PRICE_ID_PRO_YEARLY',
  'STRIPE_PRICE_ID_LIFETIME',
  'ALLOWED_ORIGIN',
  'APP_URL',
  'MARKETING_URL',
];

function isEmpty(v) {
  return v === undefined || v === null || String(v).trim() === '';
}

function urlLooksProduction(key, value) {
  if (!production) return null;
  const u = String(value).trim();
  if (!u.startsWith('http')) return `no parece URL: ${key}`;
  if (u.includes('localhost') || u.includes('127.0.0.1')) {
    return `${key} apunta a localhost (en --production usa URLs públicas)`;
  }
  if (!u.startsWith('https://')) {
    return `${key} debería usar https:// en producción`;
  }
  return null;
}

const urlKeys = new Set([
  'VITE_SUPABASE_URL',
  'VITE_API_URL',
  'VITE_AUTH_SITE_ORIGIN',
  'SUPABASE_URL',
  'ALLOWED_ORIGIN',
  'APP_URL',
  'MARKETING_URL',
]);

function checkSection(name, fileRel, keys, optionalKeys) {
  const { path: filePath, env } = loadFile(fileRel);
  console.log(`\n## ${name}`);
  console.log(`Archivo: ${fileRel}`);
  if (!env) {
    const hint =
      fileRel === 'apps/web/.env.local'
        ? 'cp apps/web/.env.example apps/web/.env.local'
        : 'cp apps/api/.env.example apps/api/.env';
    console.log(`  ❌ No existe. Crear: ${hint}`);
    return false;
  }
  let ok = true;
  for (const k of keys) {
    const v = env[k];
    if (isEmpty(v)) {
      console.log(`  ❌ ${k} vacío o ausente`);
      ok = false;
      continue;
    }
    console.log(`  ✓ ${k}`);
    if (urlKeys.has(k)) {
      const err = urlLooksProduction(k, v);
      if (err) {
        console.log(`     ⚠ ${err}`);
        ok = false;
      }
    }
  }
  for (const k of optionalKeys) {
    if (isEmpty(env[k])) {
      console.log(`  ○ ${k} (opcional, vacío)`);
    } else {
      console.log(`  ✓ ${k}`);
    }
  }
  return ok;
}

console.log('BurnPilot — comprobación de variables (local → copiar a Netlify/Railway)\n');
if (production) {
  console.log('Modo: --production (exige https y sin localhost)\n');
}

const webOk = checkSection(
  'Frontend (Netlify)',
  'apps/web/.env.local',
  webKeys,
  webOptional,
);
const apiOk = checkSection('API (Railway)', 'apps/api/.env', apiKeys, [
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'CRON_SECRET',
  'SENTRY_DSN',
  'BETTER_STACK_SOURCE_TOKEN',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_MODEL',
  'STACKOS_AGENT_URL',
  'STACKOS_AGENT_API_KEY',
  'STACKOS_AGENT_TIMEOUT_MS',
]);

const allOk = webOk && apiOk;
console.log(
  allOk
    ? '\n✅ Listo: puedes copiar estas variables a los paneles (ver docs/GO_LIVE_PASO_A_PASO.md).'
    : '\n❌ Falta rellenar lo marcado arriba.',
);
if (!allOk) process.exit(1);
process.exit(0);
