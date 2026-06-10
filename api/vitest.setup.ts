// Provide the minimum env required by src/config/env.ts so importing any module
// that transitively imports env.ts does not abort the test run. Real provider
// network calls are always mocked in tests.
process.env['NODE_ENV'] = 'test'
process.env['DATABASE_URL'] ??= 'postgres://test:test@localhost:5432/n0crm_test'
process.env['JWT_SECRET'] ??= 'test_jwt_secret_0123456789_0123456789_abcdef'
process.env['REDIS_URL'] ??= 'redis://localhost:6379'
// A configured provider so resolveProvider()/availableProviders() have something
// to return in unit tests. No real key — network is mocked.
process.env['GEMINI_API_KEY'] ??= 'test-gemini-key'
