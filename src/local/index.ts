// local includes all the code for installing dependencies and running code locally. We could break out the dependency stuff into its own module but for now just this.

export { runDBLocally } from './db.js'
export { runAPILocally, installAPIDeps } from './api.js'
export {
    runWebLocally,
    runWebAgainstAWS,
    installWebDepsOnce,
    runWebAgainstDocker,
} from './web.js'
export { runStorybookLocally } from './storybook.js'
export { runS3Locally } from './s3.js'
export {
    compileGraphQLTypesWatchOnce,
    compileGraphQLTypesOnce,
} from './graphql.js'
