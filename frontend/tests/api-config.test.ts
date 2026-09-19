describe('API environment selection', () => {
  const original = { ...process.env };
  afterEach(() => { process.env = { ...original }; jest.resetModules(); });
  function config(environment: string, base?: string, production?: string) {
    jest.resetModules();
    process.env.EXPO_PUBLIC_APP_ENV = environment;
    if (base === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = base;
    if (production === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL_PRO;
    else process.env.EXPO_PUBLIC_API_BASE_URL_PRO = production;
    return require('../src/api/config').apiConfig;
  }
  it('uses the production override when both addresses exist', () => {
    expect(config('production', 'http://localhost:4000/api/v1', ' https://api.example.com/api/v1/ ').baseUrl).toBe('https://api.example.com/api/v1');
  });
  it('preserves the legacy production variable', () => {
    expect(config('production', 'https://legacy.example.com/api/v1').baseUrl).toBe('https://legacy.example.com/api/v1');
  });
  it('keeps development on its configured address', () => {
    expect(config('development', 'http://localhost:4000/api/v1', 'https://api.example.com/api/v1').baseUrl).toBe('http://localhost:4000/api/v1');
  });
  it('rejects insecure production overrides', () => {
    expect(() => config('production', 'https://api.example.com/api/v1', 'http://localhost:4000/api/v1')).toThrow('HTTPS');
  });
  it('requires an address for the selected environment', () => {
    expect(() => config('production')).toThrow('is required');
    expect(() => config('development', undefined, 'https://api.example.com/api/v1')).toThrow('is required');
  });
});
