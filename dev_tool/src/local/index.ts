// local includes all the code for installing dependencies and running code locally. We could break out the dependency stuff into its own module but for now just this.

export { installAPIDeps, runAPILocally } from './api.js'
export {
    compileGraphQLTypesOnce,
    compileGraphQLTypesWatchOnce,
} from './graphql.js'
export { installPrismaDeps, runPostgresLocally } from './postgres.js'
export { compileProto, compileProtoWatch } from './proto.js'
export { runS3Locally } from './s3.js'
export { runStorybookLocally } from './storybook.js'
export {
    installWebDepsOnce,
    runWebAgainstAWS,
    runWebAgainstDocker,
    runWebLocally,
} from './web.js'

export { runOtelLocally } from './otel.js'
