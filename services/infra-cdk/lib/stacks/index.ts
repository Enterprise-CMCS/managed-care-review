// Export all stacks
export * from './foundation-stack'
export * from './network-stack'
export * from './data-stack'
export * from './auth-stack'
export * from './database-operations-stack'
export * from './monitoring-stack'
export * from './guardduty-malware-protection-stack'
export * from './frontend-stack'
export * from './github-oidc-service-role-stack'
export * from './lambda-layers-stack'

// New elegant micro-stacks (replacing ApiComputeStack bloat)
export * from './graphql-api-stack'
export * from './public-api-stack'
export * from './file-ops-stack'
export * from './scheduled-tasks-stack'
export * from './auth-extensions-stack'

// Testing review environments (individual service stacks)
export * from './network'
export * from './postgres'
export * from './uploads'
export * from './frontend'
export * from './cognito'
export * from './storybook'
export * from './app-api'
