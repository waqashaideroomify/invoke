import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: [
    // This file is only used during debugging
    'src/app/store/middleware/debugLoggerMiddleware.ts',
  ],
  ignoreBinaries: ['only-allow'],
  rules: {
    files: 'warn',
    dependencies: 'warn',
    unlisted: 'warn',
    binaries: 'warn',
    unresolved: 'warn',
    exports: 'warn',
    types: 'warn',
    nsExports: 'warn',
    nsTypes: 'warn',
    enumMembers: 'warn',
    classMembers: 'warn',
    duplicates: 'warn',
  },
};

export default config;
