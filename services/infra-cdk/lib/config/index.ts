/**
 * Config Index - Re-export from simplified config
 */

// Re-export everything from the new simplified config
export * from '../config';

// Legacy compatibility exports (temporary during migration)
export const StageConfiguration = {
  get: (stage: string) => require('../config').getConfig(stage)
};
export const loadEnvironment = (): void => {}; // No-op
export const validateEnvironment = (stage: string): void => { require('../config').getConfig(stage); };

// Lambda code path utility (used by multiple stacks)
export const CDKPaths = {
  getLambdaPackagePath: () => {
    const path = require('path');
    return path.resolve(__dirname, '..', '..', 'lambda-code.zip');
  }
};