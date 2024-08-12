const mongoose = require('mongoose');
const Joi = require('joi');
import * as Hapi from '@hapi/hapi';
import { Boom } from '@hapi/boom';
import { schedule } from 'node-cron';
import appInsights from './app-insights';
import appConfig, { ApplicationConfig } from './config';
import { jobsRoutes } from './handler/jobs';
import { loadExporterBehaviour, loadFishCountriesAndSpecies, loadVessels } from './data/cache';

import logger from './logger';
export class Server {
  private static instance: Hapi.Server;

  public static async start(config: ApplicationConfig, inTest = false): Promise<void> {
    try {
      appInsights();

      if (!inTest) {
        logger.info(`[DBNAME] ${ApplicationConfig.prototype.dbName}`);

        const options = {
          useNewUrlParser: true,
          dbName: ApplicationConfig.prototype.dbName,
          connectTimeoutMS: 60000,
          socketTimeoutMS: 600000,
          serverSelectionTimeoutMS: 60000
        }
        
        await mongoose.connect(ApplicationConfig.prototype.dbConnectionUri, options).catch(err => {console.log(err)});
      }

      await Promise.all([
        loadFishCountriesAndSpecies(),
        loadVessels(),
        loadExporterBehaviour()
      ]);

      if (!inTest) {
        scheduleFishCountriesAndSpeciesJob();
        scheduleVesselsJob();
      }

      Server.instance = new Hapi.Server({
        port: parseInt(config.port)
      });
      Server.onRequest();
      Server.onPreResponse();

      Server.instance.validator(Joi);

      if (!config.inDev && !inTest) {
        await Server.instance.register(require('@hapi/basic'));
        Server.instance.auth.strategy('simple', 'basic', { validate });
        Server.instance.auth.default('simple');
      }
      setupRoutes(Server.instance);
      await Server.instance.start();
      logger.info('Server successfully started on port ' + config.port);
    } catch (e) {
      logger.error(e);
      logger.error('Cannot start server');
    }
  }

  public static async stop(): Promise<void> {
    await Server.instance.stop();
  }

  public static async inject(props: string | Hapi.ServerInjectOptions): Promise<Hapi.ServerInjectResponse> {
    return await Server.instance.inject(props);
  }

  private static onRequest() {
    Server.instance.ext('onRequest', function (request: Hapi.Request<Hapi.ReqRefDefaults>, h) {

      logger.info({
        data: {
          method: request.method,
          path: request.path
        }
      },
        'on-request');

      return h.continue;
    });
  }

  private static onPreResponse() {
    Server.instance.ext('onPreResponse', function (request:  Hapi.Request<Hapi.ReqRefDefaults>, h) {
      const { response } = request;

      const permissions =
        'accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), display-capture=(), document-domain=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), layout-animations=(), legacy-image-formats=*, magnetometer=(), microphone=(), midi=(), oversized-images=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), sync-xhr=*, usb=(), vr=(), screen-wake-lock=(), web-share=(), xr-spatial-tracking=()';

      Object.prototype.hasOwnProperty.call(response, "isBoom")
        ? ((response as Boom).output.headers['Permissions-Policy'] = permissions)
        : (response as Hapi.ResponseObject).header('Permissions-Policy', permissions);

      return h.continue;
    });
  }
}

const scheduleFishCountriesAndSpeciesJob = () => {
  logger.info(`Scheduled job to run at ${appConfig.scheduleFishCountriesAndSpeciesJob}`);
  schedule(appConfig.scheduleFishCountriesAndSpeciesJob, async () => {
    logger.info('Running scheduled job at ', new Date());
    await loadFishCountriesAndSpecies();
  });
}

const scheduleVesselsJob = () => {
  logger.info(`Scheduled job to run at ${appConfig.scheduleVesselsDataJob}`);
  schedule(appConfig.scheduleVesselsDataJob, async () => {
    logger.info('Running scheduled job at ', new Date());
    await loadVessels();
  });
}

const validate = (request, username, password) => {
    const isValid = username === appConfig.basicAuthUser && password === appConfig.basicAuthPassword;
    return {
      isValid,
      credentials: {
  
      }
    };
  }

const setupRoutes = server => {
  jobsRoutes(server);
}
