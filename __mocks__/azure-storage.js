var vesselsJson = require(__dirname + '/../data/vessels.json');
var speciesmismatch = require(__dirname + '/../data/speciesmismatch.json');
var fs = require('fs');

var storage = jest.genMockFromModule('azure-storage');


function __setMockService() {
  mockService = {
    createContainerIfNotExists: function (containerName, options = {}, cb) {
      return cb(null, {
        containerName
      });
    },
    getBlobToText: function(containerName, blobName, cb) {
      if (blobName === 'Notification.json') {
        return cb(null, '[{ "viewName": "VesselAndLicenceData", "blobName": "vessels.json" }]');
      }
      else if (blobName === 'vessels.json') {
	      return cb(null, JSON.stringify(vesselsJson));
      }
      else if (blobName === 'VesselAndLicenceData-PRD-14MAR.json') {
	      return cb(null, JSON.stringify(vesselsJson));
      }
      else if (blobName === 'exporter_behaviour.csv') {
        return cb(null, 'accountId,contactId,name,score\nID1,,Exporter 1,0.5\nID2,,Exporter 2,0.75');
      }
      else if (blobName === 'allSpecies.csv') {
        return cb(null, 'faoCode,faoName,scientificName\nAAB,Twobar seabream,Acanthopagrus bifasciatus\nAAE,Tailjet frogfish,Antennarius analis');
      }
      else if (blobName === 'speciesmismatch.json') {
	      return cb(null, JSON.stringify(speciesmismatch));
      }
      else if (blobName === 'conversionfactors.csv') {
        return cb(null, 'species,state,presentation,toLiveWeightFactor,quotaStatus,riskScore\nALB,FRE,GUT,1.11,quota,1');
      }
      else {
	      return cb(null, fs.readFileSync(__dirname + '/../data/commodity_code.txt', 'utf-8'));
      }
    },
    createBlockBlobFromText: function(containerName, blob, text, cb) {
      return cb(null, {
        containerName,
        blob,
        text
      })
    },
    createWriteStreamToBlockBlob: function(containerName, blob, text, cb) {
      return cb(null, {
        containerName,
        blob,
        text
      })
    }
  };
}

function __setMockServiceWithError() {
  mockService = {
    createContainerIfNotExists: function(containerName, options = {}, cb) {
      return cb(new Error('CreateContainerIfNotExistsError'));
    },
    getBlobToText: function(containerName, blobName, cb) {
      if (blobName === 'Notification.json') {
        return cb(null, '[{ "viewName": "Dummy", "blobName": "vessels.json" }, { "viewName": "Dummy", "blobName": "countries.json" }]');
      }
      else if(blobName === 'vessels.json') {
	      return cb(new Error('VesselsMockError'));
      }
      else if (blobName === 'exporter_behaviour.csv') {
        return cb(new Error('ExporterBehaviourMockError'));
      }
      else if (blobName === 'allSpecies.csv') {
        return cb(new Error('AllSpeciesMockError'));
      }
      else if (blobName === 'seasonal_fish.csv') {
        return cb(new Error('SeasonalFishMockError'));
      }
      else if (blobName === 'speciesmismatch.json') {
        return cb(new Error('SpeciesAliasesMockError'));
      }
      else if (blobName === 'conversionfactors.csv') {
        return cb(new Error('ConversionFactorsMockError'));
      }
      else if (blobName === 'commodity_code_ps_sd.txt') {
        return cb(new Error('CommodityCodeMockError'));
      }
      else {
	      return cb(new Error('SpeciesMockError'));
      }
    },
    createBlockBlobFromText: function(containerName, blob, text, cb) {
      return cb(new Error('CreateBlockBlobFromTextError'));
    },
    createWriteStreamToBlockBlob: function(containerName, blob, text, cb) {
      return cb('CreateWriteStreamToBlockBlobError');
  }
  };
}

function createBlobService() { return mockService; }
function createBlobServiceWithSas() {return mockService;}

storage.__setMockService = __setMockService;
storage.__setMockServiceWithError = __setMockServiceWithError;
storage.createBlobService = createBlobService;
storage.createBlobServiceWithSas = createBlobServiceWithSas;

module.exports = storage;
