import dotenv from 'dotenv';
dotenv.config();

export class ApplicationConfig {
  public port: string;
  public inDev: boolean;
  public instrumentationKey: string;
  public cloudRoleName: string;
  public scheduleFishCountriesAndSpeciesJob: string;
  public scheduleVesselsDataJob: string;
  public basicAuthUser: string | any;
  public basicAuthPassword: string | any;
  public dbConnectionUri: string | any;
  public dbName: string | any;
  public externalAppUrl: string;
  public internalAppUrl: string;
  public azureBlobUrl: string;
  public azureContainer: string;
  public azureSaS: string;
  public blobStorageConnection: string

  // service bus queue
  public azureQueueUrl: string;
  public azureReportQueueName: string;
  public azureTradeQueueUrl: string;
  public azureTradeQueueEnabled: boolean
  public azureReportTradeQueueName: string;
  public enableReportToQueue: boolean;
  public consolidationServicUrl: string;
  public referenceDataServiceServicUrl: string;

  // vessel not found
  public vesselNotFoundEnabled: boolean;
  public vesselNotFoundName: string;
  public vesselNotFoundPln: string;

  // blob storage
  public maximumDefraValidationReportBatchSize: number;

  //landing reprocessing
  public runLandingReprocessingJob: boolean;
  public landingReprocessingLimit: number;

  public runResubmitCcToTrade: boolean;

  public static loadEnv(env: any): void {
    ApplicationConfig.prototype.basicAuthUser = env.REF_SERVICE_BASIC_AUTH_USER;
    ApplicationConfig.prototype.basicAuthPassword = env.REF_SERVICE_BASIC_AUTH_PASSWORD;
    ApplicationConfig.prototype.dbConnectionUri = env.DB_CONNECTION_URI || env.COSMOS_DB_RW_CONNECTION_URI;
    ApplicationConfig.prototype.blobStorageConnection = env.REFERENCE_DATA_AZURE_STORAGE;

    ApplicationConfig.prototype.port = env.PORT || '9000';
    ApplicationConfig.prototype.inDev = env.NODE_ENV === 'development';
    ApplicationConfig.prototype.scheduleFishCountriesAndSpeciesJob = env.REFRESH_SPECIES_JOB;
    ApplicationConfig.prototype.scheduleVesselsDataJob = env.REFRESH_VESSEL_JOB;
    ApplicationConfig.prototype.instrumentationKey = env.INSTRUMENTATION_KEY;
    ApplicationConfig.prototype.cloudRoleName = env.INSTRUMENTATION_CLOUD_ROLE;
    ApplicationConfig.prototype.dbName = env.DB_NAME;
    ApplicationConfig.prototype.externalAppUrl = env.EXTERNAL_APP_URL;
    ApplicationConfig.prototype.internalAppUrl = env.INTERNAL_ADMIN_URL;
    ApplicationConfig.prototype.azureBlobUrl = env.AZURE_BLOB_URL;
    ApplicationConfig.prototype.azureContainer = env.AZURE_BLOB_CONTAINER;
    ApplicationConfig.prototype.azureSaS = env.AZURE_SAS;

    // azure Service Bus Queue
    ApplicationConfig.prototype.azureQueueUrl = env.AZURE_QUEUE_CONNECTION_STRING;
    ApplicationConfig.prototype.azureReportQueueName = env.REPORT_QUEUE;
    ApplicationConfig.prototype.azureTradeQueueUrl = env.AZURE_QUEUE_TRADE_CONNECTION_STRING;
    ApplicationConfig.prototype.azureTradeQueueEnabled = env.ENABLE_CHIP_REPORTING === 'true';
    ApplicationConfig.prototype.azureReportTradeQueueName = env.REPORT_QUEUE_TRADE;
    ApplicationConfig.prototype.enableReportToQueue = env.NODE_ENV === 'production';

    // landing service url
    ApplicationConfig.prototype.consolidationServicUrl = env.MMO_CC_LANDINGS_CONSOLIDATION_SVC_URL;

    // landing service url
    ApplicationConfig.prototype.referenceDataServiceServicUrl = env.MMO_ECC_REFERENCE_SVC_URL;
    
    // vessel not found
    ApplicationConfig.prototype.vesselNotFoundEnabled = env.VESSEL_NOT_FOUND_ENABLE || true;
    ApplicationConfig.prototype.vesselNotFoundName = env.VESSEL_NOT_FOUND_NAME || 'Vessel not found';
    ApplicationConfig.prototype.vesselNotFoundPln = env.VESSEL_NOT_FOUND_PLN || 'N/A';

    // blob storage
    ApplicationConfig.prototype.maximumDefraValidationReportBatchSize = parseInt(env.MAXIMUM_DEFRA_VALIDATION_REPORT_BATCH_SIZE, 10) || 1000;

    //Landing Reprocessing
    ApplicationConfig.prototype.runLandingReprocessingJob = env.RUN_LANDING_REPROCESSING_JOB;
    ApplicationConfig.prototype.landingReprocessingLimit = env.LANDING_REPROCESSING_LIMIT || 50;

    //Resubmit to Trade
    ApplicationConfig.prototype.runResubmitCcToTrade = env.RUN_RESUBMIT_CC_TO_TRADE === 'true';
  }

  public getReferenceServiceUrl(): string {
    const urlParser = require('url-parse');
    const parsed = urlParser(this.referenceDataServiceServicUrl);
    parsed.set('username', this.basicAuthUser);
    parsed.set('password', this.basicAuthPassword);
    return parsed.toString().replace(/(\/)+$/, '');
  }

}

export default new ApplicationConfig();