import { Octokit } from '@octokit/action'
import * as core from '@actions/core'

import { spawnSync } from 'child_process'

const octokit = new Octokit()
const owner = 'Enterprise-CMCS'
const repo = 'managed-care-review'

async function main() {
    // get our service names from pnpm
    const listOfServices = getAllServicesFromPnpm()
    if (listOfServices instanceof Error) {
        console.error('Failed to get service list from pnpm', listOfServices)
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

    // force a complete CI run
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

    // have pnpm tell us which services have changed in code since the
    // last completed workflow run
    const pnpmChangedServices = getChangedServicesSinceSha(
        lastCompletedRun.head_sha
    )

    // if pnpm can't find the sha, run everything
    if (pnpmChangedServices instanceof Error) {
        core.setOutput('changed-services', deployAllServices)
        return
    }

    const jobsToSkip = await getJobsToSkip(
        lastCompletedRun.id,
        lastCompletedRun.run_attempt ?? 1
    )

    const ghaJobsToRun = listOfServices.filter((x) => !jobsToSkip.includes(x))

    // concat our two arrays of what to change together into one deduped set
    const jobsToRun = [...new Set([...ghaJobsToRun, ...pnpmChangedServices])]

    console.info('All services: ' + listOfServices)
    console.info('Jobs we can skip from GHA: ' + jobsToSkip)
    console.info('Changed services from pnpm: ' + pnpmChangedServices)
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

// a list of all of our deployable service names from pnpm
function getAllServicesFromPnpm(): string[] | Error {
    const { stdout, stderr, error, status } = spawnSync('pnpm', [
        'ls',
        '-r',
        '--json',
    ])

    if (error || status !== 0) {
        console.error('Error: ', error, stderr?.toString())
        return new Error('Failed to list all services from pnpm')
    }
    const pnpmList = JSON.parse(stdout.toString())

    return pnpmList.map((i: { name: string }) => i.name)
}

function getChangedServicesSinceSha(sha: string): string[] | Error {
    const {
        stdout: gitStdout,
        stderr: gitStderr,
        error: gitError,
        status: gitStatus,
    } = spawnSync('git', ['diff', '--name-only', sha])

    if (gitError || gitStatus !== 0) {
        console.error(gitError, gitStderr?.toString())
        return new Error('Failed to get changed files from git')
    }

    const changedFiles = gitStdout.toString().split('\n').filter(Boolean)

    const allServices = getAllServicesFromPnpm()
    if (allServices instanceof Error) {
        return allServices
    }

    // Filter packages that have changed files
    const changedPackages = allServices.filter((name) => {
        const servicePath = `services/${name}/` // Adjust this if your package structure is different
        return changedFiles.some((file) => file.startsWith(servicePath))
    })

    return changedPackages
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
