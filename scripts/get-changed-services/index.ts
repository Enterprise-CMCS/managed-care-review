import { Octokit } from '@octokit/action'
import * as core from '@actions/core'

import { exec } from 'child_process'
import util from 'util'
import fs from 'fs'

// just for testing locally now
function readToken(path = '../../../../../access_token.txt') {
    return fs.readFileSync(path).toString().trim()
}

process.env.GITHUB_ACTION = 'true'
process.env.GITHUB_TOKEN = readToken()

// Use lerna to get a list of all of the packages that are in the current repo
interface LernaListItem {
    name: string
    version: string
    private: boolean
    location: string
}

// a list of all of our deployable service names from lerna
async function getAllServices(): Promise<string[]> {
    const execPromise = util.promisify(exec)
    const { stdout, stderr } = await execPromise('lerna ls -a --json')
    const lernaList: LernaListItem[] = JSON.parse(stdout)
    if (stderr) {
        console.log(stderr)
    }

    return lernaList.map((i) => i.name)
}

// get the workflow runs for this branch
// we pass in branchName and stageName as inputs from the action
const octokit = new Octokit()
const workflowrun = await octokit.actions.listWorkflowRuns({
    owner: 'CMSgov',
    repo: 'managed-care-review',
    workflow_id: 'deploy.yml',
    status: 'success',
    branch: 'mt-skip-sls-deploy',
    //branch: core.getInput('branchName', { required: true }),
})

// if we haven't had a successful run on this branch, we need to deploy everything
if (workflowrun.data.total_count === 0) {
    const services = await getAllServices()
    core.setOutput('changed_services', services)
}

console.log(workflowrun)
