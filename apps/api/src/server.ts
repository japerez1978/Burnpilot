import './loadEnv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadConfig } from './utils/config';
import { log } from './utils/logger';
import { healthRouter } from './routes/health';
import { accountRouter } from './routes/account';
import { billingRouter } from './routes/billing';
import { stripeWebhookRouter } from './routes/stripeWebhook';

const config = loadConfig();
const app = express();

/** Orígenes típicos en local (localhost vs 127.0.0.1) para evitar CORS al probar el front. */
const devViteOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(helmet());
/** Stripe firma el cuerpo en bruto; debe ir antes de express.json(). */
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRouter);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (origin === config.ALLOWED_ORIGIN) {
        callback(null, true);
        return;
      }
      if (config.NODE_ENV === 'development' && devViteOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: false,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
);

app.use('/health', healthRouter);
app.use('/v1', accountRouter);
app.use('/v1', billingRouter);

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Not found', code: 'NOT_FOUND' });
});

app.listen(config.PORT, '0.0.0.0', () => {
  log('info', 'server.started', {
    port: config.PORT,
    env: config.NODE_ENV,
    allowedOrigin: config.ALLOWED_ORIGIN,
  });
});
