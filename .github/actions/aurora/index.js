const core = require('@actions/core');

// This is a node script for CI that will assemble a connection URL from the env
try {
    const usernameVar = `AURORA_POSTGRES_${process.env.stage_name}_USERNAME`;
    const passwordVar = `AURORA_POSTGRES_${process.env.stage_name}_PASSWORD`;
    const hostVar = `AURORA_POSTGRES_${process.env.stage_name}_HOST`;
    const portVar = `AURORA_POSTGRES_${process.env.stage_name}_PORT`;
    const dbNameVar = `AURORA_POSTGRES_${process.env.stage_name}_DBNAME`;

    const auroraURL = `postgresql://${process.env[usernameVar]}:${process.env[passwordVar]}@${process.env[hostVar]}:${process.env[portVar]}/${process.env[dbNameVar]}?schema=public&connection_limit=5`;

    core.setOutput('database_url', encodeURIComponent(auroraURL));
} catch (error) {
    core.setFailed(error.message);
}
