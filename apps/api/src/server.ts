import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadConfig } from './utils/config.js';
import { log } from './utils/logger.js';
import { healthRouter } from './routes/health.js';

const config = loadConfig();
const app = express();

app.use(helmet());
app.use(cors({ origin: config.ALLOWED_ORIGIN, credentials: false }));
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

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Not found', code: 'NOT_FOUND' });
});

app.listen(config.PORT, () => {
  log('info', 'server.started', {
    port: config.PORT,
    env: config.NODE_ENV,
    allowedOrigin: config.ALLOWED_ORIGIN,
  });
});
