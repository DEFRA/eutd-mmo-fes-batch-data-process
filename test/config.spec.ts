import ApplicationConfig from "../src/config";

describe("Config", () => {

  beforeAll(() => {
    ApplicationConfig.referenceDataServiceServicUrl = "http://localhost:9000";
    ApplicationConfig.basicAuthUser = "REF-SERVICE-USER";
    ApplicationConfig.basicAuthPassword = 'REF-SERVICE-PASSWORD';
  });

  it("getReferenceServiceUrl() should return parsed URL", () => {
    expect(ApplicationConfig.getReferenceServiceUrl()).toContain('REF-SERVICE-USER');
    expect(ApplicationConfig.getReferenceServiceUrl()).toContain('REF-SERVICE-PASSWORD');
  });
});
