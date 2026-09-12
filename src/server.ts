import { createApp } from './app';
import { config } from './config';

createApp().listen(config.port, () => {
  console.log(`news-api listening on http://localhost:${config.port} (${config.nodeEnv})`);
});
