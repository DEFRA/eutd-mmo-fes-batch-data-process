import * as SUT from '../../src/landings/landingsRefresh';
import * as shared from "mmo-shared-reference-data"
import moment from 'moment'
import * as VesselService from "../../src/data/vessel";
import * as LandingPersistence from "../../src/persistence/landing";
import * as ExtendedDataService from '../../src/persistence/extendedValidationDataService';
import { getToLiveWeightFactor } from '../../src/data/cache';
import { ILanding, LandingSources } from 'mmo-shared-reference-data';
import logger from '../../src/logger';

describe('fetchAndProcessNewLandings', () => {

  let mockFetchLandings: jest.SpyInstance;
  let mockLoggerInfo: jest.SpyInstance;

  beforeEach(() => {
    mockFetchLandings = jest.spyOn(SUT, 'fetchLandings');
    mockLoggerInfo = jest.spyOn(logger, 'info');
  });
  
  afterEach(() => {
    mockFetchLandings.mockRestore();
    mockLoggerInfo.mockRestore();
  });

  it('will return an array of every landing from every call to fetchLandings', async () => {
    const input = [
      { rssNumber: "ABC123", dateLanded: "2019-07-10" },
      { rssNumber: "ABC456", dateLanded: "2019-07-10" }
    ];

    const landing: ILanding = {
      rssNumber: "ABC123",
      dateTimeLanded: "2019-07-10",
      source: LandingSources.LandingDeclaration,
      items: []
    };

    mockFetchLandings.mockResolvedValue([landing, landing]);

    const results = await SUT.fetchAndProcessNewLandings(input);

    expect(mockFetchLandings).toHaveBeenCalledTimes(2);
    expect(mockFetchLandings).toHaveBeenNthCalledWith(1, 'ABC123', '2019-07-10');
    expect(mockFetchLandings).toHaveBeenNthCalledWith(2, 'ABC456', '2019-07-10');

    expect(results).toEqual([landing, landing, landing, landing]);
  })

  it('will return an empty array if no landings are returned from fetchLandings', async () => {
    const input = [
      { rssNumber: "ABC123", dateLanded: "2019-07-10" },
      { rssNumber: "ABC456", dateLanded: "2019-07-10" }
    ];

    mockFetchLandings.mockResolvedValue([]);

    const results = await SUT.fetchAndProcessNewLandings(input);

    expect(mockFetchLandings).toHaveBeenCalledTimes(2);
    expect(mockFetchLandings).toHaveBeenNthCalledWith(1, 'ABC123', '2019-07-10');
    expect(mockFetchLandings).toHaveBeenNthCalledWith(2, 'ABC456', '2019-07-10');

    expect(results).toEqual([]);
  });

  it('will return an undefined array if no landings are returned from fetchLandings', async () => {
    const input = [
      { rssNumber: "ABC123", dateLanded: "2019-07-10" }
    ];

    mockFetchLandings.mockResolvedValue(undefined);

    const results = await SUT.fetchAndProcessNewLandings(input);

    expect(mockFetchLandings).toHaveBeenCalledTimes(1);
    expect(mockFetchLandings).toHaveBeenCalledWith('ABC123', '2019-07-10');
    expect(mockLoggerInfo).toHaveBeenCalledWith('[LANDINGS][LANDING-UPDATER][CHECK-FOR-NEW-LANDINGS][FETCH-LANDINGS] FAILED for ABC123-2019-07-10');
    expect(results).toEqual([]);
  });

  it('will pass false for useElogs on fetchLandings', async () => {
    await SUT.fetchAndProcessNewLandings([{ rssNumber: "ABC123", dateLanded: "2019-07-10" }]);

    expect(mockFetchLandings).toHaveBeenCalledWith("ABC123", "2019-07-10");
  });

});

describe('fetchLandings', () => {

  let mockGetVesselDetails;
  let mockGetLandings;
  let mockFetchOver10m;
  let mockFetchUnder10m;
  let mockGetLandingData;
  let mockUpdateData;
  let mockUpdateLandings;
  let mockClearElogs;
  let mockIgnoreUnchanged;
  let mockErrorLogger;

  beforeEach(() => {
    mockGetVesselDetails = jest.spyOn(VesselService, 'getVesselDetails');
    mockGetVesselDetails = jest.spyOn(VesselService, 'getVesselDetails');
    mockFetchOver10m = jest.spyOn(SUT, '_fetchLandingsVesselsOver10Meters');
    mockFetchUnder10m = jest.spyOn(SUT, '_fetchLandingsVesselsUnder10Meters');
    mockGetLandingData = jest.spyOn(shared.BoomiService, 'getLandingData');
    mockGetLandingData.mockResolvedValue(undefined);
    mockUpdateData = jest.spyOn(ExtendedDataService, 'updateExtendedValidationData');
    mockUpdateData.mockResolvedValue(undefined);

    mockUpdateLandings = jest.spyOn(LandingPersistence, 'updateLandings');
    mockUpdateLandings.mockResolvedValue(null);

    mockClearElogs = jest.spyOn(LandingPersistence, 'clearElogs');
    mockClearElogs.mockResolvedValue(null);

    mockGetLandings = jest.spyOn(LandingPersistence, 'getLandings');
    mockGetLandings.mockResolvedValue([]);

    mockIgnoreUnchanged = jest.spyOn(SUT, '_ignoreUnchangedLandings');
    mockIgnoreUnchanged.mockImplementation(async (_rss, _date, landings) => Promise.resolve(landings));

    mockErrorLogger = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockGetVesselDetails.mockRestore();
    mockGetLandings.mockRestore();
    mockFetchOver10m.mockRestore();
    mockFetchUnder10m.mockRestore();
    mockGetLandingData.mockRestore();
    mockUpdateData.mockRestore();
    mockUpdateLandings.mockRestore();
    mockClearElogs.mockRestore();
    mockIgnoreUnchanged.mockRestore();
    mockErrorLogger.mockRestore();
  });

  it('will return an empty array when we cant find vessel details', async () => {
    mockGetVesselDetails.mockReturnValue(null);

    const output = await SUT.fetchLandings('test', '2019-01-01');

    expect(mockUpdateLandings).not.toHaveBeenCalled();
    expect(mockClearElogs).not.toHaveBeenCalled();
    expect(output).toEqual([]);
  });

  it('will only return the landings for the `dateLanded` specified', async () => {
    const landings: shared.ILanding[] = [
      {
        rssNumber: 'rssNumber',
        dateTimeLanded: moment.utc('2019-07-11T21:30:00.000Z').toISOString(),
        source: shared.LandingSources.LandingDeclaration,
        items: [{ species: 'COD', weight: 1, factor: 1 }]
      },
      {
        rssNumber: 'rssNumber',
        dateTimeLanded: moment.utc('2023-07-11T21:30:00.000Z').toISOString(),
        source: shared.LandingSources.LandingDeclaration,
        items: [{ species: 'COD', weight: 1, factor: 1 }]
      }
    ]

    mockGetVesselDetails.mockReturnValue({ vesselLength: 10.75 });
    mockFetchOver10m.mockReturnValue(landings);


    const output = await SUT.fetchLandings('test', '2023-07-11T21:30:00.000Z');


    expect(output).toEqual([{
      rssNumber: 'rssNumber',
      dateTimeLanded: moment.utc('2023-07-11T21:30:00.000Z').toISOString(),
      source: shared.LandingSources.LandingDeclaration,
      items: [{ species: 'COD', weight: 1, factor: 1 }]
    }]);
  });

  it('will return an empty array when we find vessel details, but not the vesselLength', async () => {
    mockGetVesselDetails.mockReturnValue({ cfr: "GBRtest" });

    const output = await SUT.fetchLandings('rssNumber', '2019-01-01');

    expect(mockUpdateLandings).not.toHaveBeenCalled();
    expect(mockClearElogs).not.toHaveBeenCalled();
    expect(output).toEqual([]);
  });

  it('will return an empty array when the vessel is under 10m and has no cfr', async () => {
    mockGetVesselDetails.mockReturnValue({ vesselLength: 8 });

    const output = await SUT.fetchLandings('rssNumber', '2019-01-01');

    expect(mockUpdateLandings).not.toHaveBeenCalled();
    expect(mockClearElogs).not.toHaveBeenCalled();
    expect(output).toEqual([]);
  });

  it('will return an empty array when no landings are found', async () => {
    mockGetVesselDetails.mockReturnValue({ vesselLength: 10.75 });
    mockFetchOver10m.mockResolvedValue([]);

    const output = await SUT.fetchLandings('rssNumber', '2019-01-01');

    expect(mockUpdateLandings).not.toHaveBeenCalled();
    expect(mockClearElogs).not.toHaveBeenCalled();
    expect(output).toEqual([]);
  });

  it('will return landings for vessels 10m and over', async () => {
    const landings: shared.ILanding[] = [
      {
        rssNumber: 'rssNumber',
        dateTimeLanded: moment.utc('2019-07-11T21:30:00.000Z').toISOString(),
        source: shared.LandingSources.LandingDeclaration,
        items: [{ species: 'COD', weight: 1, factor: 1 }]
      },
      {
        rssNumber: 'rssNumber',
        dateTimeLanded: moment.utc('2019-07-11T21:30:00.000Z').toISOString(),
        source: shared.LandingSources.LandingDeclaration,
        items: [{ species: 'COD', weight: 1, factor: 1 }]
      }
    ]

    mockGetVesselDetails.mockReturnValue({ vesselLength: 10.75 });
    mockFetchOver10m.mockReturnValue(landings);

    const output = await SUT.fetchLandings('rssNumber', '2019-07-11');

    expect(mockGetVesselDetails).toHaveBeenCalledTimes(1);
    expect(mockFetchOver10m).toHaveBeenCalledTimes(1);
    expect(mockUpdateLandings).toHaveBeenCalledWith(landings);
    expect(mockClearElogs).toHaveBeenCalledWith(landings);

    expect(output.length).toBeGreaterThan(-1)
  });

  it('will return landings for vessels under 10m', async () => {
    const landings: shared.ILanding[] = [
      {
        rssNumber: 'rssNumber',
        dateTimeLanded: moment.utc('2019-07-11T21:30:00.000Z').toISOString(),
        source: shared.LandingSources.LandingDeclaration,
        items: [{ species: 'COD', weight: 1, factor: 1 }]
      },
      {
        rssNumber: 'rssNumber',
        dateTimeLanded: moment.utc('2019-07-11T21:30:00.000Z').toISOString(),
        source: shared.LandingSources.LandingDeclaration,
        items: [{ species: 'COD', weight: 1, factor: 1 }]
      }
    ]

    mockGetVesselDetails.mockReturnValue({ vesselLength: 8, rssNumber: 'rss' });
    mockFetchUnder10m.mockReturnValue(landings);

    const output = await SUT.fetchLandings('rssNumber', '2019-07-11');

    expect(mockGetVesselDetails).toHaveBeenCalledTimes(1);
    expect(mockFetchUnder10m).toHaveBeenCalledTimes(1);
    expect(mockUpdateLandings).toHaveBeenCalledWith(landings);
    expect(mockClearElogs).toHaveBeenCalledWith(landings);

    expect(output.length).toBeGreaterThan(-1)
  });

  it('will handle issues thrown by clearing elogs', async () => {
    const error = new Error('eLog-clear-error');
    const landings: shared.ILanding[] = [
      {
        rssNumber: 'rssNumber',
        dateTimeLanded: moment.utc('2019-07-11T21:30:00.000Z').toISOString(),
        source: shared.LandingSources.LandingDeclaration,
        items: [{ species: 'COD', weight: 1, factor: 1 }]
      },
      {
        rssNumber: 'rssNumber',
        dateTimeLanded: moment.utc('2019-07-11T21:30:00.000Z').toISOString(),
        source: shared.LandingSources.LandingDeclaration,
        items: [{ species: 'COD', weight: 1, factor: 1 }]
      }
    ]

    mockGetVesselDetails.mockReturnValue({ vesselLength: 8, rssNumber: 'rss' });
    mockFetchUnder10m.mockReturnValue(landings);
    mockClearElogs.mockRejectedValue(error);

    await SUT.fetchLandings('rssNumber', '2019-07-11');

    expect(mockErrorLogger).toHaveBeenCalledWith('[LANDINGS][FETCH-LANDING][rssNumber-2019-07-11][ELOGS-CLEAR-ERROR][Error: eLog-clear-error]');
  });

  it('will not call _ignoreUnchangedLandings if there are no landings to ignore', async () => {
    const landings: shared.ILanding[] = []

    mockGetVesselDetails.mockReturnValue({ vesselLength: 8, rssNumber: 'rss' });
    mockFetchUnder10m.mockReturnValue(landings);

    await SUT.fetchLandings('rssNumber', '2019-07-11');

    expect(mockIgnoreUnchanged).not.toHaveBeenCalled();
  });

});

describe('_fetchLandingsVesselsOver10Meters', () => {

  const rssNumber = 'rss';
  const dateLanded = '2019-01-01';

  let mockGetLandingData;
  let mockMapCefas;
  let mockMapElogs;
  let mockSaveLandings;
  let mockSaveSalesNotes;
  let mockLogError;

  beforeEach(() => {
    mockGetLandingData = jest.spyOn(shared.BoomiService, 'getLandingData');
    mockMapCefas = jest.spyOn(shared, 'cefasToLandings');
    mockMapElogs = jest.spyOn(shared, 'eLogToLandings');
    mockSaveLandings = jest.spyOn(SUT, '_saveRawLandingData');
    mockSaveLandings.mockResolvedValue(null);
    mockSaveSalesNotes = jest.spyOn(SUT, '_saveSalesNoteData');
    mockSaveSalesNotes.mockResolvedValue(null);
    mockLogError = jest.spyOn(logger, 'error');
  });

  afterEach(() => {
    mockGetLandingData.mockRestore();
    mockMapCefas.mockRestore();
    mockMapElogs.mockRestore();
    mockSaveLandings.mockRestore();
    mockSaveSalesNotes.mockRestore();
    mockLogError.mockRestore();
  });

  it('will not retrieve elogs if landings are found in cefas', async () => {
    const landings = ['landing 1', 'landing 2'];
    const salesNotes = ['note 1', 'note 2'];

    mockGetLandingData.mockResolvedValueOnce(landings);
    mockGetLandingData.mockResolvedValueOnce(salesNotes);
    mockMapCefas.mockImplementation(_ => `${_} - mapped`);

    const output = await SUT._fetchLandingsVesselsOver10Meters(rssNumber, dateLanded);

    expect(mockGetLandingData).toHaveBeenCalledTimes(2);
    expect(mockGetLandingData).toHaveBeenNthCalledWith(1, dateLanded, rssNumber, 'landing');
    expect(mockGetLandingData).toHaveBeenNthCalledWith(2, dateLanded, rssNumber, 'salesNotes');

    expect(mockSaveLandings).toHaveBeenCalledWith(landings, 'OVER10', rssNumber, dateLanded);
    expect(mockSaveSalesNotes).toHaveBeenCalledWith(salesNotes, 'OVER10', rssNumber, dateLanded);

    expect(output).toEqual(['landing 1 - mapped', 'landing 2 - mapped']);
  });

  it('will retrieve elogs if no landings are found in cefas', async () => {
    const elogs = ['elog 1', 'elog 2'];
    const salesNotes = ['note 1', 'note 2'];

    mockGetLandingData.mockResolvedValueOnce([]);
    mockGetLandingData.mockResolvedValueOnce(elogs);
    mockGetLandingData.mockResolvedValueOnce(salesNotes);
    mockMapElogs.mockImplementation(_ => `${_} - mapped`);

    const output = await SUT._fetchLandingsVesselsOver10Meters(rssNumber, dateLanded);

    expect(mockGetLandingData).toHaveBeenCalledTimes(3);
    expect(mockGetLandingData).toHaveBeenNthCalledWith(1, dateLanded, rssNumber, 'landing');
    expect(mockGetLandingData).toHaveBeenNthCalledWith(2, dateLanded, rssNumber, 'eLogs');
    expect(mockGetLandingData).toHaveBeenNthCalledWith(3, dateLanded, rssNumber, 'salesNotes');

    expect(mockSaveLandings).toHaveBeenCalledWith(elogs, 'OVER10', rssNumber, dateLanded);
    expect(mockSaveSalesNotes).toHaveBeenCalledWith(salesNotes, 'OVER10', rssNumber, dateLanded);

    expect(output).toEqual(['elog 1 - mapped', 'elog 2 - mapped']);
  });

  it('will log and return an empty array if an error is thrown retrieving landings', async () => {
    const e = new Error('boom');

    mockGetLandingData.mockRejectedValue(e);

    const output = await SUT._fetchLandingsVesselsOver10Meters(rssNumber, dateLanded);

    expect(mockLogError).toHaveBeenCalledWith(`[LANDINGS][FETCH-LANDING-OVER10][ERROR][${rssNumber}-${dateLanded}][${e.stack || e}]`);
    expect(output).toEqual([]);
  });

  it('will log and return an empty array if a plain error is thrown retrieving landings', async () => {
    mockGetLandingData.mockRejectedValue('boom');

    const output = await SUT._fetchLandingsVesselsOver10Meters(rssNumber, dateLanded);

    expect(mockLogError).toHaveBeenCalledWith(`[LANDINGS][FETCH-LANDING-OVER10][ERROR][${rssNumber}-${dateLanded}][boom]`);
    expect(output).toEqual([]);
  });

  it('will log the error and continue if an error is thrown retrieving sales notes', async () => {
    const e = new Error('boom');

    const landings = ['landing 1', 'landing 2'];

    mockGetLandingData.mockResolvedValueOnce(landings);
    mockGetLandingData.mockRejectedValueOnce(e);
    mockMapCefas.mockImplementation(_ => `${_} - mapped`);

    const output = await SUT._fetchLandingsVesselsOver10Meters(rssNumber, dateLanded);

    expect(mockGetLandingData).toHaveBeenCalledTimes(2);
    expect(mockGetLandingData).toHaveBeenNthCalledWith(1, dateLanded, rssNumber, 'landing');
    expect(mockGetLandingData).toHaveBeenNthCalledWith(2, dateLanded, rssNumber, 'salesNotes');

    expect(mockSaveLandings).toHaveBeenCalledWith(landings, 'OVER10', rssNumber, dateLanded);
    expect(mockSaveSalesNotes).not.toHaveBeenCalled();

    expect(output).toEqual(['landing 1 - mapped', 'landing 2 - mapped']);
  });

  it('will log the error and continue if a plain error is thrown retrieving sales notes', async () => {
    const landings = ['landing 1', 'landing 2'];

    mockGetLandingData.mockResolvedValueOnce(landings);
    mockGetLandingData.mockRejectedValueOnce('boom');
    mockMapCefas.mockImplementation(_ => `${_} - mapped`);

    const output = await SUT._fetchLandingsVesselsOver10Meters(rssNumber, dateLanded);

    expect(mockGetLandingData).toHaveBeenCalledTimes(2);
    expect(mockGetLandingData).toHaveBeenNthCalledWith(1, dateLanded, rssNumber, 'landing');
    expect(mockGetLandingData).toHaveBeenNthCalledWith(2, dateLanded, rssNumber, 'salesNotes');

    expect(mockSaveLandings).toHaveBeenCalledWith(landings, 'OVER10', rssNumber, dateLanded);
    expect(mockSaveSalesNotes).not.toHaveBeenCalled();

    expect(output).toEqual(['landing 1 - mapped', 'landing 2 - mapped']);
  });

  it('will not wait for the salesNotes response before returning data to the user', async () => {

    const salesNotesPromise = new Promise((resolve) => {
      return () => {
        resolve(['note 1']);
      }
    });

    mockGetLandingData.mockResolvedValueOnce(['landing 1', 'landing 2']);
    mockGetLandingData.mockImplementationOnce(() => salesNotesPromise);
    mockMapCefas.mockImplementation(_ => `${_} - mapped`);

    const output = await SUT._fetchLandingsVesselsOver10Meters(rssNumber, dateLanded);

    expect(output).toEqual(['landing 1 - mapped', 'landing 2 - mapped']);
    expect(mockSaveSalesNotes).not.toHaveBeenCalled();
  });

  it('will save the salesNotes response even after returning data to the user', async () => {
    let resolveSalesNotes;
    let resolved = false;

    const salesNotesPromise = new Promise((resolve) => {
      resolveSalesNotes = () => {
        resolved = true;
        resolve(['note 1']);
      }
    });

    mockGetLandingData.mockResolvedValueOnce(['landing 1', 'landing 2']);
    mockGetLandingData.mockImplementationOnce(() => salesNotesPromise);
    mockMapCefas.mockImplementation(_ => `${_} - mapped`);

    const output = await SUT._fetchLandingsVesselsOver10Meters(rssNumber, dateLanded);

    expect(output).toEqual(['landing 1 - mapped', 'landing 2 - mapped']);
    expect(mockSaveSalesNotes).not.toHaveBeenCalled();
    expect(resolved).toBe(false);

    await resolveSalesNotes();

    expect(mockSaveSalesNotes).toHaveBeenCalledWith(['note 1'], 'OVER10', rssNumber, dateLanded);
    expect(resolved).toBe(true);
  });

  it('will not wait for the save raw landings response before returning data to the user', async () => {
    const landings = ['landing 1', 'landing 2'];
    let resolveSaveRawLandings;
    let resolved = false;

    const saveLandingsPromise = new Promise((resolve) => {
      resolveSaveRawLandings = () => {
        resolved = true;
        resolve(landings);
      }
    });

    mockGetLandingData.mockResolvedValueOnce(landings);
    mockGetLandingData.mockResolvedValueOnce(['note 1', 'note 2']);
    mockSaveLandings.mockImplementation(() => saveLandingsPromise);
    mockMapCefas.mockImplementation(_ => `${_} - mapped`);

    const output = await SUT._fetchLandingsVesselsOver10Meters(rssNumber, dateLanded);

    expect(output).toEqual(['landing 1 - mapped', 'landing 2 - mapped']);
    expect(mockSaveLandings).toHaveBeenCalledWith(landings, 'OVER10', rssNumber, dateLanded);
    expect(resolved).toBe(false);

    await resolveSaveRawLandings();

    expect(resolved).toBe(true);
  });

});

describe('_fetchLandingsVesselsUnder10Meters', () => {

  const rssNumber = 'rss';
  const dateLanded = '2019-01-01';

  let mockGetCatchActivity;
  let mockGetLandingData;
  let mockSaveLandings;
  let mockSaveSalesNotes;
  let mockMapCatch;
  let mockLogError;
  let mockLogInfo;

  beforeEach(() => {
    mockGetCatchActivity = jest.spyOn(shared.BoomiService, 'getCatchActivity');
    mockGetLandingData = jest.spyOn(shared.BoomiService, 'getLandingData');
    mockSaveLandings = jest.spyOn(SUT, '_saveRawLandingData');
    mockSaveLandings.mockResolvedValue(null);
    mockSaveSalesNotes = jest.spyOn(SUT, '_saveSalesNoteData');
    mockSaveSalesNotes.mockResolvedValue(null);
    mockMapCatch = jest.spyOn(shared, 'catchRecordingToLandings');
    mockLogError = jest.spyOn(logger, 'error');
    mockLogInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    mockGetCatchActivity.mockRestore();
    mockGetLandingData.mockRestore();
    mockSaveLandings.mockRestore();
    mockSaveSalesNotes.mockRestore();
    mockMapCatch.mockRestore();
    mockLogError.mockRestore();
    mockLogInfo.mockRestore();
  })

  it('will get data from catch recordings', async () => {
    mockGetCatchActivity.mockResolvedValue(null);
    mockGetLandingData.mockResolvedValue(null);

    await SUT._fetchLandingsVesselsUnder10Meters(rssNumber, dateLanded);

    expect(mockGetCatchActivity).toHaveBeenCalledWith(dateLanded, rssNumber);
  });

  it('will log when no data is returned and return an empty array', async () => {
    const landings = null;
    const salesNotes = ['note 1'];

    mockGetCatchActivity.mockResolvedValue(landings);
    mockGetLandingData.mockResolvedValue(salesNotes);

    const output = await SUT._fetchLandingsVesselsUnder10Meters(rssNumber, dateLanded);

    expect(output).toEqual([]);
    expect(mockLogInfo).toHaveBeenCalledWith(`[LANDINGS][FETCH-LANDING-UNDER10][NO-DATA][${rssNumber}-${dateLanded}]`)
  });

  it('will save any catches returned from catch recordings', async () => {
    const landings = ['catch 1', 'catch 2'];
    const salesNotes = ['note 1'];

    mockGetCatchActivity.mockResolvedValue(landings);
    mockGetLandingData.mockResolvedValue(salesNotes);
    mockMapCatch.mockImplementation((landings) => landings.map(item => `${item} - mapped`));

    await SUT._fetchLandingsVesselsUnder10Meters(rssNumber, dateLanded);

    expect(mockSaveLandings).toHaveBeenCalledWith(landings, 'UNDER10', rssNumber, dateLanded);
  });

  it('will map and return any catches returned from catch recordings', async () => {
    const landings = ['catch 1', 'catch 2'];
    const salesNotes = ['note 1'];

    mockGetCatchActivity.mockResolvedValue(landings);
    mockGetLandingData.mockResolvedValue(salesNotes);
    mockMapCatch.mockImplementation((landings) => landings.map(item => `${item} - mapped`));

    const output = await SUT._fetchLandingsVesselsUnder10Meters(rssNumber, dateLanded);

    expect(output).toEqual(['catch 1 - mapped', 'catch 2 - mapped']);
    expect(mockMapCatch).toHaveBeenCalledWith(landings, rssNumber, getToLiveWeightFactor);
  });

  it('will save the salesNotes response even after returning data to the user', async () => {
    let resolveSalesNotes;
    let resolved = false;

    const salesNotesPromise = new Promise((resolve) => {
      resolveSalesNotes = () => {
        resolved = true;
        resolve(['note 1']);
      }
    });

    const landings = ['catch 1', 'catch 2'];

    mockGetCatchActivity.mockResolvedValue(landings);
    mockGetLandingData.mockImplementation(() => salesNotesPromise);
    mockMapCatch.mockImplementation((landings) => landings.map(item => `${item} - mapped`));

    const output = await SUT._fetchLandingsVesselsUnder10Meters(rssNumber, dateLanded);

    expect(output).toEqual(['catch 1 - mapped', 'catch 2 - mapped']);
    expect(mockMapCatch).toHaveBeenCalledWith(landings, rssNumber, getToLiveWeightFactor);

    expect(mockSaveSalesNotes).not.toHaveBeenCalled();
    expect(resolved).toBe(false);

    await resolveSalesNotes();

    expect(mockSaveSalesNotes).toHaveBeenCalledWith(['note 1'], 'UNDER10', rssNumber, dateLanded);
    expect(resolved).toBe(true);
  });

  it('will log and return an empty array if an error is thrown retrieving landings', async () => {
    const notes = ['note 1', 'note 2'];
    const e = new Error('an error occurred');

    mockGetCatchActivity.mockRejectedValue(e);
    mockGetLandingData.mockResolvedValue(notes);
    mockMapCatch.mockImplementation((landings) => landings.map(item => `${item} - mapped`));

    const output = await SUT._fetchLandingsVesselsUnder10Meters(rssNumber, dateLanded);

    expect(output).toEqual([]);
    expect(mockLogError).toHaveBeenCalledWith(`[LANDINGS][FETCH-LANDING-UNDER10][ERROR][${rssNumber}-${dateLanded}][${e.stack || e}]`);
  });

  it('will log and return an empty array if a plain error is thrown retrieving landings', async () => {
    const notes = ['note 1', 'note 2'];

    mockGetCatchActivity.mockRejectedValue('an error occurred');
    mockGetLandingData.mockResolvedValue(notes);
    mockMapCatch.mockImplementation((landings) => landings.map(item => `${item} - mapped`));

    const output = await SUT._fetchLandingsVesselsUnder10Meters(rssNumber, dateLanded);

    expect(output).toEqual([]);
    expect(mockLogError).toHaveBeenCalledWith(`[LANDINGS][FETCH-LANDING-UNDER10][ERROR][${rssNumber}-${dateLanded}][an error occurred]`);
  });

  it('will log if an error is thrown retrieving sales notes', async () => {
    const landings = ['catch 1', 'catch 2'];
    const e = new Error('an error occurred');

    mockGetCatchActivity.mockResolvedValue(landings);
    mockGetLandingData.mockResolvedValue(e);
    mockMapCatch.mockImplementation((landings) => landings.map(item => `${item} - mapped`));

    const output = await SUT._fetchLandingsVesselsUnder10Meters(rssNumber, dateLanded);

    expect(output).toEqual([
      "catch 1 - mapped",
      "catch 2 - mapped"
    ]);
  });

  it('will log if a plain error is thrown retrieving sales notes', async () => {
    const landings = ['catch 1', 'catch 2'];

    mockGetCatchActivity.mockResolvedValue(landings);
    mockGetLandingData.mockResolvedValue('an error occurred');
    mockMapCatch.mockImplementation((landings) => landings.map(item => `${item} - mapped`));

    const output = await SUT._fetchLandingsVesselsUnder10Meters(rssNumber, dateLanded);

    expect(output).toEqual([
      "catch 1 - mapped",
      "catch 2 - mapped"
    ]);
  });

  it('will not wait for the save raw landings response before returning data to the user', async () => {
    const landings = ['catch 1', 'catch 2'];
    const salesNotes = ['note 1'];

    let resolved = false;
    let resolveSaveRawLandings;

    new Promise((resolve) => {
      resolveSaveRawLandings = () => {
        resolved = true;
        resolve(landings);
      }
    });

    mockGetCatchActivity.mockResolvedValue(landings);
    mockGetLandingData.mockResolvedValue(salesNotes);
    mockMapCatch.mockImplementation((landings) => landings.map(item => `${item} - mapped`));

    const output = await SUT._fetchLandingsVesselsUnder10Meters(rssNumber, dateLanded);

    expect(output).toEqual(['catch 1 - mapped', 'catch 2 - mapped']);
    expect(mockSaveLandings).toHaveBeenCalledWith(landings, 'UNDER10', rssNumber, dateLanded);
    expect(resolved).toBe(false);

    await resolveSaveRawLandings();

    expect(resolved).toBe(true);
  });

  it('will not wait for the salesNotes response before returning data to the user', async () => {
    let resolved = false;
    const salesNotesPromise = new Promise((resolve) => {
      return () => {
        resolved = true
        resolve(['note 1']);
      }
    });


    const landings = ['catch 1', 'catch 2'];

    mockGetCatchActivity.mockResolvedValue(landings);
    mockGetLandingData.mockImplementation(() => salesNotesPromise);
    mockMapCatch.mockImplementation((landings) => landings.map(item => `${item} - mapped`));

    const output = await SUT._fetchLandingsVesselsUnder10Meters(rssNumber, dateLanded);

    expect(output).toEqual(['catch 1 - mapped', 'catch 2 - mapped']);
    expect(mockMapCatch).toHaveBeenCalledWith(landings, rssNumber, getToLiveWeightFactor);
    expect(resolved).toBe(false);
  });

  it('will log the error and continue if an error is thrown retrieving sales notes', async () => {
    const e = new Error('boom');

    const landings = ['catch 1', 'catch 2'];

    mockGetCatchActivity.mockResolvedValueOnce(landings);
    mockGetLandingData.mockRejectedValueOnce(e);
    mockMapCatch.mockImplementation((landings) => landings.map(_ => `${_} - mapped`));

    const output = await SUT._fetchLandingsVesselsUnder10Meters(rssNumber, dateLanded);

    expect(mockGetLandingData).toHaveBeenCalledTimes(1);
    expect(mockGetLandingData).toHaveBeenNthCalledWith(1, dateLanded, rssNumber, 'salesNotes');

    expect(mockSaveLandings).toHaveBeenCalledWith(landings, 'UNDER10', rssNumber, dateLanded);
    expect(mockSaveSalesNotes).not.toHaveBeenCalled();

    expect(output).toEqual(['catch 1 - mapped', 'catch 2 - mapped']);
    expect(mockMapCatch).toHaveBeenCalledWith(landings, rssNumber, getToLiveWeightFactor);
  });

  it('will log the error and continue if a plain error is thrown retrieving sales notes', async () => {
    const landings = ['catch 1', 'catch 2'];

    mockGetCatchActivity.mockResolvedValueOnce(landings);
    mockGetLandingData.mockRejectedValueOnce('boom');
    mockMapCatch.mockImplementation((landings) => landings.map(_ => `${_} - mapped`));

    const output = await SUT._fetchLandingsVesselsUnder10Meters(rssNumber, dateLanded);

    expect(mockGetLandingData).toHaveBeenCalledTimes(1);
    expect(mockGetLandingData).toHaveBeenNthCalledWith(1, dateLanded, rssNumber, 'salesNotes');

    expect(mockSaveLandings).toHaveBeenCalledWith(landings, 'UNDER10', rssNumber, dateLanded);
    expect(mockSaveSalesNotes).not.toHaveBeenCalled();

    expect(output).toEqual(['catch 1 - mapped', 'catch 2 - mapped']);
  });

});

describe('_saveRawLandingData', () => {

  let mockUpdateData;
  let mockLogInfo;

  beforeEach(() => {
    mockUpdateData = jest.spyOn(ExtendedDataService, 'updateExtendedValidationData');
    mockUpdateData.mockResolvedValue(null);
    mockLogInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    mockUpdateData.mockRestore();
    mockLogInfo.mockRestore();
  });

  it('will save landings if they are passed in', async () => {
    const landings = ['landing'];

    await SUT._saveRawLandingData(landings, 'type', 'rss', 'date');

    expect(mockUpdateData).toHaveBeenCalledTimes(1);
    expect(mockUpdateData).toHaveBeenCalledWith({ rssNumber: 'rss', dateLanded: 'date', data: landings }, 'rawLandings');
  });

  it('will not save anything if params are "empty" (empty object, collection, map or set)', async () => {
    const landings = null;

    await SUT._saveRawLandingData(landings, 'type', 'rss', 'date');

    expect(mockUpdateData).toHaveBeenCalledTimes(0);
  });

  it('will log when data is passed in', async () => {
    const landings = ['landing'];

    await SUT._saveRawLandingData(landings, 'type', 'rss', 'date');

    expect(mockLogInfo).toHaveBeenCalledWith(`[LANDINGS][FETCH-LANDING-type][RETRIEVED][rss-date]`);
  });

  it('will log when no data is passed in', async () => {
    const landings = [];

    await SUT._saveRawLandingData(landings, 'type', 'rss', 'date');

    expect(mockLogInfo).toHaveBeenCalledWith(`[LANDINGS][FETCH-LANDING-type][NO-DATA][rss-date]`);
  });

});

describe('_saveSalesNoteData', () => {

  let mockUpdateData;
  let mockLogInfo;

  beforeEach(() => {
    mockUpdateData = jest.spyOn(ExtendedDataService, 'updateExtendedValidationData');
    mockUpdateData.mockResolvedValue(null);
    mockLogInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    mockUpdateData.mockRestore();
    mockLogInfo.mockRestore();
  });

  it('will save salesnotes if they are passed in', async () => {
    const notes = ['note'];

    await SUT._saveSalesNoteData(notes, 'type', 'rss', 'date');

    expect(mockUpdateData).toHaveBeenCalledTimes(1);
    expect(mockUpdateData).toHaveBeenCalledWith({ rssNumber: 'rss', dateLanded: 'date', data: notes }, 'salesNotes');
  });

  it('will not save anything if params are "empty" (empty object, collection, map or set)', async () => {
    const notes = [];

    await SUT._saveSalesNoteData(notes, 'type', 'rss', 'date');

    expect(mockUpdateData).toHaveBeenCalledTimes(0);
  });

  it('will log when data is passed in', async () => {
    const notes = ['landing'];

    await SUT._saveSalesNoteData(notes, 'type', 'rss', 'date');

    expect(mockLogInfo).toHaveBeenCalledWith(`[LANDINGS][FETCH-SALESNOTES-type][RETRIEVED][rss-date]`);
  });

  it('will log when no data is passed in', async () => {
    const notes = [];

    await SUT._saveSalesNoteData(notes, 'type', 'rss', 'date');

    expect(mockLogInfo).toHaveBeenCalledWith(`[LANDINGS][FETCH-SALESNOTES-type][NO-DATA][rss-date]`);
  });

});

describe('_ignoreUnchangedLandings', () => {
  let mockGetLandings;

  const rssNumber: string = 'rssWA1';
  const dateLanded: string = '2019-07-20T00:30:00.000+00:00';

  beforeEach(() => {
    mockGetLandings = jest.spyOn(LandingPersistence, 'getLandings');
  });

  afterEach(() => {
    mockGetLandings.mockRestore();
  });

  it('should add an ignore flag to landings that are unchanged since last fetch', async () => {
    const fetchedlandings: shared.ILanding[] = [
      {
        rssNumber: 'rssWA1',
        dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
        dateTimeRetrieved: '2019-07-21T00:30:00.000+00:00',
        source: 'LANDING_DECLARATION',
        items: [{
          species: 'COD',
          weight: 2800,
          factor: 1,
          state: 'FRE',
          presentation: 'WHL'
        }]
      }
    ];

    const systemLanding: shared.ILanding[] = [
      {
        rssNumber: 'rssWA1',
        dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
        dateTimeRetrieved: '2019-07-21T00:30:00.000+00:00',
        source: 'LANDING_DECLARATION',
        items: [{
          species: 'COD',
          weight: 2800,
          factor: 1,
          state: 'FRE',
          presentation: 'WHL'
        }]
      }
    ];

    mockGetLandings.mockResolvedValue(systemLanding);

    const result = await SUT._ignoreUnchangedLandings(rssNumber, dateLanded, fetchedlandings);

    expect(mockGetLandings).toHaveBeenCalledWith('rssWA1', '2019-07-20T00:30:00.000+00:00');
    expect(result).toStrictEqual([
      {
        _ignore: true,
        rssNumber: 'rssWA1',
        dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
        dateTimeRetrieved: '2019-07-21T00:30:00.000+00:00',
        source: 'LANDING_DECLARATION',
        items: [{
          species: 'COD',
          weight: 2800,
          factor: 1,
          state: 'FRE',
          presentation: 'WHL'
        }]
      }
    ]);
  });

  describe('when a landing has been updated', () => {

    it('should return landings that have been updated by weight', async () => {
      const fetchedlandings: shared.ILanding[] = [
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2801,
            factor: 1,
            state: 'FRE',
            presentation: 'WHL'
          }]
        }
      ];

      const systemLanding: shared.ILanding[] = [
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          dateTimeRetrieved: '2019-07-21T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 1,
            state: 'FRE',
            presentation: 'WHL'
          }]
        }
      ];

      mockGetLandings.mockResolvedValue(systemLanding);

      const result = await SUT._ignoreUnchangedLandings(rssNumber, dateLanded, fetchedlandings);

      expect(mockGetLandings).toHaveBeenCalledWith('rssWA1', '2019-07-20T00:30:00.000+00:00');
      expect(result).toStrictEqual([
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2801,
            factor: 1,
            state: 'FRE',
            presentation: 'WHL'
          }]
        }
      ]);
    });

    it('should return landings that have been updated by factor', async () => {
      const fetchedlandings: shared.ILanding[] = [
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 2,
            state: 'FRE',
            presentation: 'WHL'
          }]
        }
      ];

      const systemLanding: shared.ILanding[] = [
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          dateTimeRetrieved: '2019-07-21T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 1,
            state: 'FRE',
            presentation: 'WHL'
          }]
        }
      ];

      mockGetLandings.mockResolvedValue(systemLanding);

      const result = await SUT._ignoreUnchangedLandings(rssNumber, dateLanded, fetchedlandings);

      expect(mockGetLandings).toHaveBeenCalledWith('rssWA1', '2019-07-20T00:30:00.000+00:00');
      expect(result).toStrictEqual([
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 2,
            state: 'FRE',
            presentation: 'WHL'
          }]
        }
      ]);
    });

    it('should return landings that have been updated by state', async () => {
      const fetchedlandings: shared.ILanding[] = [
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 2,
            state: 'FRO',
            presentation: 'WHL'
          }]
        }
      ];

      const systemLanding: shared.ILanding[] = [
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          dateTimeRetrieved: '2019-07-21T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 1,
            state: 'FRE',
            presentation: 'WHL'
          }]
        }
      ];

      mockGetLandings.mockResolvedValue(systemLanding);

      const result = await SUT._ignoreUnchangedLandings(rssNumber, dateLanded, fetchedlandings);

      expect(mockGetLandings).toHaveBeenCalledWith('rssWA1', '2019-07-20T00:30:00.000+00:00');
      expect(result).toStrictEqual([
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 2,
            state: 'FRO',
            presentation: 'WHL'
          }]
        }
      ]);
    });

    it('should return landings that have been updated by presentation', async () => {
      const fetchedlandings: shared.ILanding[] = [
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 2,
            state: 'FRE',
            presentation: 'GUT'
          }]
        }
      ];

      const systemLanding: shared.ILanding[] = [
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          dateTimeRetrieved: '2019-07-21T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 1,
            state: 'FRE',
            presentation: 'WHL'
          }]
        }
      ];

      mockGetLandings.mockResolvedValue(systemLanding);

      const result = await SUT._ignoreUnchangedLandings(rssNumber, dateLanded, fetchedlandings);

      expect(mockGetLandings).toHaveBeenCalledWith('rssWA1', '2019-07-20T00:30:00.000+00:00');
      expect(result).toStrictEqual([
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 2,
            state: 'FRE',
            presentation: 'GUT'
          }]
        }
      ]);
    });

    it('should return landings with additional catches', async () => {
      const fetchedlandings: shared.ILanding[] = [
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 1,
            state: 'FRE',
            presentation: 'WHL'
          },
          {
            species: 'HER',
            weight: 1000,
            factor: 1,
            state: 'FRE',
            presentation: 'WHL'
          }]
        }
      ];

      const systemLanding: shared.ILanding[] = [
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          dateTimeRetrieved: '2019-07-21T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 1,
            state: 'FRE',
            presentation: 'WHL'
          }]
        }
      ];

      mockGetLandings.mockResolvedValue(systemLanding);

      const result = await SUT._ignoreUnchangedLandings(rssNumber, dateLanded, fetchedlandings);

      expect(mockGetLandings).toHaveBeenCalledWith('rssWA1', '2019-07-20T00:30:00.000+00:00');
      expect(result).toStrictEqual([
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 1,
            state: 'FRE',
            presentation: 'WHL'
          },
          {
            species: 'HER',
            weight: 1000,
            factor: 1,
            state: 'FRE',
            presentation: 'WHL'
          }]
        }
      ]);
    });

    it('should return landings that have had a changed of source', async () => {
      const fetchedlandings: shared.ILanding[] = [
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 1,
            state: 'FRE',
            presentation: 'WHL'
          }]
        }
      ];

      const systemLanding: shared.ILanding[] = [
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          dateTimeRetrieved: '2019-07-21T00:30:00.000+00:00',
          source: 'ELOG',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 1,
            state: 'FRE',
            presentation: 'WHL'
          }]
        }
      ];

      mockGetLandings.mockResolvedValue(systemLanding);

      const result = await SUT._ignoreUnchangedLandings(rssNumber, dateLanded, fetchedlandings);

      expect(mockGetLandings).toHaveBeenCalledWith('rssWA1', '2019-07-20T00:30:00.000+00:00');
      expect(result).toStrictEqual([
        {
          rssNumber: 'rssWA1',
          dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
          source: 'LANDING_DECLARATION',
          items: [{
            species: 'COD',
            weight: 2800,
            factor: 1,
            state: 'FRE',
            presentation: 'WHL'
          }]
        }
      ]);
    });

  });

  it('should return all landings if none previously saved', async () => {
    const fetchedlandings: shared.ILanding[] = [
      {
        rssNumber: 'rssWA1',
        dateTimeLanded: '2019-07-20T00:30:00.000+00:00',
        source: 'LANDING_DECLARATION',
        items: [{
          species: 'COD',
          weight: 2800,
          factor: 1,
          state: 'FRE',
          presentation: 'WHL'
        }]
      }
    ];

    const systemLanding: shared.ILanding[] = [];

    mockGetLandings.mockResolvedValue(systemLanding);

    const result = await SUT._ignoreUnchangedLandings(rssNumber, dateLanded, fetchedlandings);

    expect(mockGetLandings).toHaveBeenCalledWith('rssWA1', '2019-07-20T00:30:00.000+00:00');
    expect(result).toStrictEqual(fetchedlandings);
  });
});