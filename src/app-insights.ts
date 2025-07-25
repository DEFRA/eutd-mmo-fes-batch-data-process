import * as appInsights from 'applicationinsights';
import config from './config';

export default () => {
  const instrumentationKey = config.instrumentationKey;

  if (instrumentationKey) {
    appInsights.setup()
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(true);
    appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = config.cloudRoleName;  
    appInsights.start();
    console.info(`Application Insights for batch data process service enabled for key: ${instrumentationKey}`);
  } else {
    if (process.env.NODE_ENV !== "test") {
      console.info('Application Insights for batch data process service disabled');
    }
  }
};
