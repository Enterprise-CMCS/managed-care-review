import { Octokit } from '@octokit/action'
import * as core from '@actions/core'

import { exec } from 'child_process'
import util from 'util'
/*
import fs from 'fs'
// just for testing locally now
function readToken(path = '../../../../../access_token.txt') {
    return fs.readFileSync(path).toString().trim()
}

process.env.GITHUB_ACTION = 'true'
process.env.GITHUB_TOKEN = readToken()
*/

// for now keep this list hardcoded
const listOfServiceJobs = [
    'app-api',
    'app-web',
    'postgres',
    'storybook',
    'ui-auth',
    'ui',
    'uploads',
    'run-migrations',
    'prisma-layer',
    'infra-api',
]

const octokit = new Octokit()

async function main() {
    // get the workflow runs for this branch
    // we pass in branchName as input from the action
    const allWorkflowRuns = await octokit.actions.listWorkflowRuns({
        owner: 'CMSgov',
        repo: 'managed-care-review',
        workflow_id: 'deploy.yml',
        //status: 'success',
        //branch: 'mt-skip-deploys',
        branch: core.getInput('branchName', { required: true }),
    })

    const deployAllServices = listOfServiceJobs
    // if we haven't had a run on this branch, we need to deploy everything
    if (allWorkflowRuns.data.total_count === 0) {
        core.setOutput('changed-services', deployAllServices)
        return
    }

    // if a run was cancelled by a user then we need to go back further and
    // find an attempt that actually ran and had an actionable outcome for us
    // this is either a run that succeeded or one that failed at some point.
    // failures can still mean that some services have deployed ok, so
    // we can consider skipping those.
    const lastCompletedRun = allWorkflowRuns.data.workflow_runs.find(
        (run) => run.conclusion === 'success' || run.conclusion === 'failure'
    )

    // if we don't even have a run that hasn't been user cancelled, run everything
    if (lastCompletedRun === undefined) {
        core.setOutput('changed-services', deployAllServices)
        return
    }

    // have lerna tell us which services have changed in code since the
    // last completed workflow run
    const lernaChangedServices = await getChangedServicesSinceSha(
        lastCompletedRun.head_sha
    )

    // look for jobs in the last non-skipped GHA run that we might be able to skip
    const jobsFromLastRun = await octokit.actions.listJobsForWorkflowRunAttempt(
        {
            owner: 'CMSgov',
            repo: 'managed-care-review',
            run_id: lastCompletedRun.id,
            attempt_number: lastCompletedRun.run_attempt ?? 1,
        }
    )

    const jobsToSkip = jobsFromLastRun.data.jobs
        .map((job) => {
            // a skipped job means it ran successfully previously
            if (job.conclusion === 'success' || job.conclusion === 'skipped') {
                return job.name.split(' / ')[1] // spaces are significant here
            }
        })
        .filter((name) => {
            if (typeof name === 'undefined') {
                return false
            }
            return true
        })

    const ghaJobsToRun = listOfServiceJobs.filter(
        (x) => !jobsToSkip.includes(x)
    )

    // concat our two arrays of what to change together into one deduped set
    const jobsToRun = [...new Set([...ghaJobsToRun, ...lernaChangedServices])]

    console.log('All services: ' + listOfServiceJobs)
    console.log('Jobs we can skip from GHA: ' + jobsToSkip)
    console.log('Changed services from lerna: ' + lernaChangedServices)
    console.log('Jobs to rerun: ' + jobsToRun)

    core.setOutput('changed-services', jobsToRun)
}

interface LernaListItem {
    name: string
    version: string
    private: boolean
    location: string
}

// a list of all of our deployable service names from lerna
async function getAllServicesFromLerna(): Promise<string[]> {
    const execPromise = util.promisify(exec)
    const { stdout, stderr } = await execPromise('lerna ls -a --json')
    const lernaList: LernaListItem[] = JSON.parse(stdout)
    if (stderr) {
        console.log(stderr)
    }

    return lernaList.map((i) => i.name)
}

// uses lerna to find services that have changed since the passed sha
async function getChangedServicesSinceSha(sha: string): Promise<string[]> {
    const execPromise = util.promisify(exec)
    const { stdout, stderr } = await execPromise(
        `lerna ls --since ${sha} -all --json`
    )

    const lernaList: LernaListItem[] = JSON.parse(stdout)
    if (stderr) {
        console.log(stderr)
    }

    return lernaList.map((i) => i.name)
}

main()
