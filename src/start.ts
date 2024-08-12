import { Server } from './server';
import appConfig, { ApplicationConfig } from './config';


const start = () => {
  ApplicationConfig.loadEnv(process.env);
  Server.start(appConfig);
}

try {
  start();
} catch (e) {
  console.error(e);
}
