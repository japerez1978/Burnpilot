import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.string().default('development'),
  LOG_LEVEL: z.enum(['info', 'warn', 'error']).default('info'),
  PORT: z.coerce.number().int().positive().default(3000),
  ALLOWED_ORIGIN: z.string().url().default('http://localhost:5173'),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ID_PRO_YEARLY: z.string().optional(),
  STRIPE_PRICE_ID_LIFETIME: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('BurnPilot <hello@burnpilot.app>'),

  APP_URL: z.string().url().default('http://localhost:5173'),
  MARKETING_URL: z.string().url().default('http://localhost:5173'),

  CRON_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  BETTER_STACK_SOURCE_TOKEN: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        action: 'config.invalid',
        issues: parsed.error.flatten().fieldErrors,
      }),
    );
    process.exit(1);
  }
  return parsed.data;
}
