import { createApp } from './app';
import { config } from './config';

const server = createApp().listen(config.port, () => {
  console.log(`news-api listening on http://localhost:${config.port} (${config.nodeEnv})`);
});

/**
 * Stop accepting connections and let in-flight scrapes finish before exiting,
 * so a deploy or a container restart does not cut a request mid-response.
 * The timer is unref'd so a quiet server still exits immediately.
 */
function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down.`);

  const force = setTimeout(() => {
    console.error('Shutdown timed out; forcing exit.');
    process.exit(1);
  }, 10_000);
  force.unref();

  server.close((error) => {
    if (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
    process.exit(0);
  });
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => shutdown(signal));
}
