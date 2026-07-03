import { buildServer } from './app/server.js';
import { env } from './common/config/env.js';

const app = await buildServer();

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info({ host: env.HOST, port: env.PORT }, 'backend listening');
} catch (error) {
  app.log.error(error, 'backend failed to start');
  process.exit(1);
}
