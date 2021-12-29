import { Octokit } from '@octokit/action';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
function readToken(path = '../../../../../access_token.txt') {
    return fs.readFileSync(path).toString().trim();
}
// a list of all of our deployable service names from lerna
async function getAllServices() {
    const execPromise = util.promisify(exec);
    const { stdout, stderr } = await execPromise('lerna ls -a --json');
    const lernaList = JSON.parse(stdout);
    if (stderr) {
        console.log(stderr);
    }
    return lernaList.map((i) => i.name);
}
const services = await getAllServices();
console.log('our service array: ' + services);
console.log(readToken());
process.env.GITHUB_ACTION = 'true';
process.env.GITHUB_TOKEN = readToken();
// we pass in branchName and stageName as inputs from the action
const octokit = new Octokit();
const workflowrun = await octokit.actions.listWorkflowRuns({
    owner: 'CMSgov',
    repo: 'managed-care-review',
    workflow_id: 'deploy.yml',
    status: 'success',
    branch: 'mt-skip-sls-deploy',
    //branch: core.getInput('branchName', { required: true }),
});
// if we haven't had a successful run before, we need to deploy everything
if (workflowrun.data.total_count === 0) {
}
console.log(workflowrun);
//# sourceMappingURL=index.js.map