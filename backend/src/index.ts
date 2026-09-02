import { buildServer } from './app/server.js';
import { env } from './common/config/env.js';

const app = await buildServer();

let isShuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  app.log.info({ signal }, 'backend shutting down');

  try {
    await app.close();
    process.exitCode = 0;
  } catch (error) {
    app.log.error(error, 'backend failed to shut down cleanly');
    process.exitCode = 1;
  }
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info({ host: env.HOST, port: env.PORT }, 'backend listening');
} catch (error) {
  app.log.error(error, 'backend failed to start');
  process.exit(1);
}
