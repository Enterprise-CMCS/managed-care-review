import { Octokit } from '@octokit/action'
import * as core from '@actions/core'

import { spawnSync } from 'child_process'

const octokit = new Octokit()
const owner = 'Enterprise-CMCS'
const repo = 'managed-care-review'

async function main() {
    // get our service names from lerna
    const listOfServices = getAllServicesFromLerna()
    if (listOfServices instanceof Error) {
        console.error('Failed to get service list from Lerna', listOfServices)
        throw listOfServices
    }

    // get the workflow runs for this branch
    // we pass in branchName as input from the action
    const allWorkflowRuns = await octokit.actions.listWorkflowRuns({
        owner: owner,
        repo: repo,
        workflow_id: 'deploy.yml',
        branch: core.getInput('branchName', { required: true }),
    })

    const deployAllServices = listOfServices
    // get the latest commit in the branch to see if we are forcing a run
    const latestCommit = await getLatestCommitSHA()
    const commitMessage = await getLatestCommitMessage(latestCommit)
    if (commitMessage.includes('ci-force-run')) {
        core.setOutput('changed-services', deployAllServices)
        return
    }

    // force just a cypress re-run
    if (commitMessage.includes('cypress re-run')) {
        core.setOutput('changed-services', [])
        return
    }

    // if we haven't had a run on this branch, we need to deploy everything
    if (allWorkflowRuns.data.total_count === 0) {
        core.setOutput('changed-services', deployAllServices)
        return
    }

    // if a run was cancelled by a user then we need to go back further and
    // find an attempt that actually ran and had an actionable outcome for us
    // Right now we only look at success, but failures can still mean that
    // some services have deployed ok. In the future we may want to look deeper
    // into run failures so we can consider skipping those.
    const lastCompletedRun = allWorkflowRuns.data.workflow_runs.find(
        (run) => run.conclusion === 'success'
    )

    // if we don't even have a run that hasn't been user cancelled, run everything
    if (lastCompletedRun === undefined) {
        core.setOutput('changed-services', deployAllServices)
        return
    }

    // have lerna tell us which services have changed in code since the
    // last completed workflow run
    const lernaChangedServices = getChangedServicesSinceSha(
        lastCompletedRun.head_sha
    )

    // if lerna can't find the sha, run everything
    if (lernaChangedServices instanceof Error) {
        core.setOutput('changed-services', deployAllServices)
        return
    }

    const jobsToSkip = await getJobsToSkip(
        lastCompletedRun.id,
        lastCompletedRun.run_attempt ?? 1
    )

    const ghaJobsToRun = listOfServices.filter((x) => !jobsToSkip.includes(x))

    // concat our two arrays of what to change together into one deduped set
    const jobsToRun = [...new Set([...ghaJobsToRun, ...lernaChangedServices])]

    console.info('All services: ' + listOfServices)
    console.info('Jobs we can skip from GHA: ' + jobsToSkip)
    console.info('Changed services from lerna: ' + lernaChangedServices)
    console.info('Jobs to rerun: ' + jobsToRun)

    core.setOutput('changed-services', jobsToRun)
}

async function getJobsToSkip(
    lastCompletedRunId: number,
    runAttempt: number
): Promise<string[]> {
    // look for jobs in the last non-skipped GHA run that we might be able to skip
    const jobsFromLastRun = await octokit.actions.listJobsForWorkflowRunAttempt(
        {
            owner: 'Enterprise-CMCS',
            repo: 'managed-care-review',
            run_id: lastCompletedRunId,
            attempt_number: runAttempt,
        }
    )

    // helper to make sure we get names back TypeScript understands using a type guard
    const isName = (name: string | undefined): name is string => {
        return !!name
    }

    const jobsToSkip = jobsFromLastRun.data.jobs
        .map((job) => {
            // A skipped job means it previously ran successfully if the workflow
            // run was a success. If we ever look at workflow failures in the future
            // this assumption no longer holds, as skipped could be because of the
            // failure.
            if (job.conclusion === 'success' || job.conclusion === 'skipped') {
                return job.name.split(' / ')[1] // spaces are significant here
            }
        })
        .filter(isName)

    return jobsToSkip
}

interface LernaListItem {
    name: string
    version: string
    private: boolean
    location: string
}

// a list of all of our deployable service names from lerna
function getAllServicesFromLerna(): string[] | Error {
    const { stdout, stderr, error, status } = spawnSync('lerna', [
        'ls',
        '-a',
        '--json',
    ])

    if (error || status !== 0) {
        console.error('Error: ', error, stderr.toString())
        return new Error('Failed to list all services from Lerna')
    }
    const lernaList: LernaListItem[] = JSON.parse(stdout.toString())

    return lernaList.map((i) => i.name)
}

// uses lerna to find services that have changed since the passed sha
function getChangedServicesSinceSha(sha: string): string[] | Error {
    const { stdout, stderr, error, status } = spawnSync('lerna', [
        'ls',
        '--since',
        sha,
        '-all',
        '--json',
    ])

    if (error || status !== 0) {
        console.error(error, stderr.toString())
        return new Error('Failed to find changes since recent SHA in Lerna')
    }

    const lernaList: LernaListItem[] = JSON.parse(stdout.toString())

    return lernaList.map((i) => i.name)
}

async function getLatestCommitSHA(): Promise<string> {
    const commits = await octokit.repos.listCommits({
        owner: owner,
        repo: repo,
        sha: core.getInput('branchName', { required: true }),
    })
    const latestCommitSHA = commits.data[0].sha
    return latestCommitSHA
}

async function getLatestCommitMessage(sha: string): Promise<string> {
    const commit = await octokit.git.getCommit({
        owner: owner,
        repo: repo,
        commit_sha: sha,
    })
    const commitMessage = commit.data.message
    return commitMessage
}

main()
