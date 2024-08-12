import axios from 'axios';
import * as SUT from '../../src/services/landingConsolidate.service';
import logger from '../../src/logger';
import { type ILanding, LandingSources } from 'mmo-shared-reference-data';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
mockedAxios.create.mockImplementation(() => mockedAxios);
mockedAxios.get.mockResolvedValueOnce({ data: [{ rssNumber: 'rssWA1', dateLanded: '01-01-2020' }] });
mockedAxios.post.mockResolvedValueOnce(undefined);

describe('fetchRefereshLandings ConsolidateLandings', () => {

  let mockLogerInfo: jest.SpyInstance;
  let mockLoggerError: jest.SpyInstance;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
    mockLogerInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    mockLogerInfo.mockRestore();
    mockLoggerError.mockRestore();
  });

  it('returns response data for fetchRefereshLandings', async () => {
    const res = await SUT.fetchRefereshLandings();

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(res).toEqual([{ rssNumber: 'rssWA1', dateLanded: '01-01-2020' }]);
  });

  it('should log and rethrow any errors for fetchRefereshLandings', async () => {
    const error = new Error('something bad has happened');

    mockedAxios.get.mockRejectedValueOnce(error);

    await expect(SUT.fetchRefereshLandings()).rejects.toThrow(error.message);

    expect(mockLoggerError).toHaveBeenCalledWith(`[RUN-LANDINGS-AND-REPORTING-JOB][LANDINGS-REFRESH][ERROR][${error}]`);
  });

});

describe('updateConsolidateLandings ConsolidateLandings', () => {
  const landings: ILanding[] = [
    {
      rssNumber: 'RSS1',
      dateTimeLanded: '2020-01-01',
      source: LandingSources.CatchRecording,
      items: []
    },
    {
      rssNumber: 'RSS2',
      dateTimeLanded: '2020-01-02',
      source: LandingSources.CatchRecording,
      items: []
    }
  ];

  let mockLogerInfo: jest.SpyInstance;
  let mockLoggerError: jest.SpyInstance;

  beforeEach(() => {
    mockLoggerError = jest.spyOn(logger, 'error');
    mockLogerInfo = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    mockLogerInfo.mockRestore();
    mockLoggerError.mockRestore();
  });

  it('will call the POST /v1/jobs/landings endpoint', () => {
    SUT.updateConsolidateLandings(landings);

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith("/v1/jobs/landings", { landings });
    expect(mockLogerInfo).toHaveBeenCalledWith('[RUN-LANDINGS-AND-REPORTING-JOB][2][LANDINGS-UPDATE]');
  });

  it('should log and rethrow any errors for POST /v1/jobs/landings endpoint', () => {
    mockedAxios.post.mockImplementation(() => {
      throw new Error('something bad has happened');
    });

    SUT.updateConsolidateLandings(landings);

    expect(mockLoggerError).toHaveBeenCalledWith(`[RUN-LANDINGS-AND-REPORTING-JOB][LANDINGS-UPDATE][ERROR][Error: something bad has happened]`);
  });

})