module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__test__/**/*.test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleNameMapper: {
    '^api/(.*)$': '<rootDir>/src/api/$1',
    '^config/(.*)$': '<rootDir>/src/config/$1',
    '^common/(.*)$': '<rootDir>/src/common/$1',
    '^middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
    '^middlewares$': '<rootDir>/src/middlewares/index.js',
    '^decorators$': '<rootDir>/src/decorators/index.js',
    '^exceptions$': '<rootDir>/src/exceptions/index.js',
    '^functions$': '<rootDir>/src/functions/index.js',
    '^utils/(.*)$': '<rootDir>/src/utils/$1',
    '^core/(.*)$': '<rootDir>/src/core/$1',
    '^metadata/(.*)$': '<rootDir>/src/metadata/$1',
    '^gateways/(.*)$': '<rootDir>/src/gateways/$1',
    '^modules$': '<rootDir>/src/modules/index.js',
    '^router$': '<rootDir>/src/router/index.js',
    '^pipe$': '<rootDir>/src/pipe/index.js',
    '^tasks/(.*)$': '<rootDir>/src/tasks/$1',
    '^validation/(.*)$': '<rootDir>/src/validation/$1'
  },
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/src/migrations/',
    '/src/seeds/',
    '/src/scripts/'
  ],
  coverageThreshold: {
    '<rootDir>/src/api/authentication/**': {
      branches: 60,
      lines: 60,
      functions: 60,
      statements: 60
    },
    '<rootDir>/src/api/packages/**': {
      branches: 60,
      lines: 60,
      functions: 60,
      statements: 60
    },
    '<rootDir>/src/api/jwt/**': {
      branches: 60,
      lines: 60,
      functions: 60,
      statements: 60
    }
  },
  coverageReporters: ['text', 'lcov', 'clover'],
  forceExit: true,
  testTimeout: 10000
}
