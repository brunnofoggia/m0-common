export default {
    'moduleFileExtensions': [
        'js',
        'json',
        'ts'
    ],
    'rootDir': 'src',
    'modulePaths': ['<rootDir>'],
    "testRegex": "\\.spec\\.ts$",
    'transform': {
        '^.+\\.(t|j)s$': 'ts-jest'
    },
    'collectCoverageFrom': [
        '**/*.(t|j)s'
    ],
    'coverageDirectory': '../coverage',
    'testEnvironment': 'node',
    'moduleNameMapper': {
        '@m0/(.*)': '<rootDir>/modules/m0/$1',
        '@m9/(.*)': '<rootDir>/modules/m9/$1',
        '@common/(.*)': '<rootDir>/modules/common/$1',
        '@test/(.*)': '<rootDir>/../test/$1',
        '@/(.*)': '<rootDir>/$1',
    },
};
