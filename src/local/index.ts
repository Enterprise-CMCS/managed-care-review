// local includes all the code for installing dependencies and running code locally. We could break out the dependency stuff into its own module but for now just this.

export { run_db_locally } from './db.js'
export { run_api_locally, install_api_deps } from './api.js'
export { run_web_locally, run_web_against_aws, install_web_deps_once } from './web.js'
export { run_sb_locally } from './storybook.js'
export { run_s3_locally } from './s3.js'
export { compile_graphql_types_watch_once, compile_graphql_types_once } from './graphql.js'
