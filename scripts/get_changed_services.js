import { Octokit } from '@octokit/action';
import * as core from '@actions/core';
// we pass in branchName and stageName as inputs from the action
const octokit = new Octokit();
const workflowrun = octokit.actions.listWorkflowRuns({
    owner: 'CMSgov',
    repo: 'managed-care-review',
    workflow_id: 'deploy.yml',
    status: 'success',
    branch: core.getInput('branchName', { required: true }),
});
console.log(workflowrun);
//# sourceMappingURL=get_changed_services.js.map