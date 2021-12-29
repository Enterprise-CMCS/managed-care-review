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
// we pass in branchName as input from the action
const octokit = new Octokit()
const allWorkflowRuns = await octokit.actions.listWorkflowRuns({
    owner: 'CMSgov',
    repo: 'managed-care-review',
    workflow_id: 'deploy.yml',
    //status: 'success',
    branch: 'mt-skip-sls-deploy',
    //branch: core.getInput('branchName', { required: true }),
})

const services = await getAllServices()
// if we haven't had a run on this branch, we need to deploy everything
if (allWorkflowRuns.data.total_count === 0) {
    core.setOutput('changed-services', services)
}

const workflow_runs = allWorkflowRuns.data.workflow_runs

const single_run = await octokit.actions.listJobsForWorkflowRunAttempt({
    owner: 'CMSgov',
    repo: 'managed-care-review',
    run_id: workflow_runs[0].id,
    attempt_number: workflow_runs[0].run_attempt ?? 1,
})

//console.log(single_run.data.jobs)

const successfulJobs = single_run.data.jobs
    .map((job) => {
        if (job.conclusion === 'success') {
            return job.name.split(' / ')[1] // spaces are significant here
        }
    })
    .filter((name) => {
        if (typeof name === 'undefined') {
            return false
        }
        return true
    })

const jobsToRun = services.filter((x) => !successfulJobs.includes(x))
console.log('All services: ' + services)
console.log('Successful jobs: ' + successfulJobs)
console.log('Jobs to rerun: ' + jobsToRun)

core.setOutput('changed-services', jobsToRun)
