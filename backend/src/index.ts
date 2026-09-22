import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { prisma } from './prisma';
import { buildRouter } from './routes';
import { seed } from './seed';
import { processDailyEarnings } from './finance';
import { AppError } from './auth';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: config.corsOrigin.split(',').map((s) => s.trim()),
      credentials: true
    })
  );
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use((req, _res, next) => {
    req.requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'online', platform: 'AquaVault', version: '2.0.0' });
  });
  app.use('/api/v1', buildRouter());

  const frontendDist = path.join(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const requestId = req.requestId;
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.message, requestId });
      return;
    }
    console.error('Unhandled error', requestId, err);
    res.status(500).json({ error: 'Something went wrong. Please try again.', requestId });
  });

  return app;
}

export async function startServer() {
  await seed();
  try {
    await processDailyEarnings();
  } catch (err) {
    console.error('Initial earnings cycle skipped:', err);
  }
  setInterval(() => {
    processDailyEarnings().catch((err) => console.error('Earnings engine error:', err));
  }, 60 * 60 * 1000);

  const app = createApp();
  return app.listen(config.port, () => {
    console.log(`AquaVault API listening on port ${config.port}`);
    console.log(`Health: http://localhost:${config.port}/api/v1/health`);
  });
}

if (require.main === module) {
  startServer().catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
}
