describe('API environment selection', () => {
  const original = { ...process.env };
  afterEach(() => { process.env = { ...original }; jest.resetModules(); });
  function config(environment: string, base?: string, production?: string) {
    jest.resetModules();
    process.env.EXPO_PUBLIC_APP_ENV = environment;
    if (base === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL_DEV;
    else process.env.EXPO_PUBLIC_API_BASE_URL_DEV = base;
    if (production === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL_PRO;
    else process.env.EXPO_PUBLIC_API_BASE_URL_PRO = production;
    return require('../src/api/config').apiConfig;
  }
  it('uses the production override when both addresses exist', () => {
    expect(config('pro', 'http://localhost:4000/api/v1', ' https://api.example.com/api/v1/ ').baseUrl).toBe('https://api.example.com/api/v1');
  });
  it('requires a production address instead of falling back to development', () => {
    expect(() => config('pro', 'https://dev.example.com/api/v1')).toThrow('EXPO_PUBLIC_API_BASE_URL_PRO is required');
  });
  it('keeps development on its configured address', () => {
    expect(config('dev', 'http://localhost:4000/api/v1', 'https://api.example.com/api/v1').baseUrl).toBe('http://localhost:4000/api/v1');
  });
  it('rejects insecure production overrides', () => {
    expect(() => config('pro', 'https://api.example.com/api/v1', 'http://localhost:4000/api/v1')).toThrow('HTTPS');
  });
  it('requires an address for the selected environment', () => {
    expect(() => config('pro')).toThrow('is required');
    expect(() => config('dev', undefined, 'https://api.example.com/api/v1')).toThrow('is required');
  });
});
