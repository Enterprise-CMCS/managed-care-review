import { Octokit } from 'octokit'
import fs from 'fs'

type StepTimes = { [names: string]: number }
type TimedRuns = { [id: number]: StepTimes }
type StepStats = StepTimes

function readToken(path = './action_token.txt') {
    return fs.readFileSync(path).toString().trim()
}

function calculateStats(timedRuns: TimedRuns): StepStats {
    const stepTimes: { [names: string]: number[] } = {}

    // turn our list of runs into a single dict with arrays of times
    for (const timedRun of Object.values(timedRuns)) {
        for (const names of Object.keys(timedRun)) {
            if (!(names in stepTimes)) {
                stepTimes[names] = []
            }
            stepTimes[names].push(timedRun[names])
        }
    }

    console.log('array of times: ', stepTimes)

    // ok, now cacluate stats
    // average
    const stepAverages: StepStats = {}

    for (const names of Object.keys(stepTimes)) {
        const sum = stepTimes[names].reduce((acc, t) => acc + t, 0)
        const average = sum / stepTimes[names].length

        stepAverages[names] = average
    }

    console.log('AVG', stepAverages)

    return stepAverages
}

// fetch the run and compute all the times we care about
async function fetchStepTimes(
    octokit: Octokit,
    runID: number
): Promise<StepTimes> {
    // get each job
    const {
        data: { jobs },
    } = await octokit.rest.actions.listJobsForWorkflowRun({
        owner: 'CMSgov',
        repo: 'managed-care-review',
        run_id: runID,
    })

    const times: StepTimes = {}

    console.log(
        'Jorbs',
        jobs.map((j) => j.name)
    )

    //job
    for (const job of jobs) {
        if (
            job.completed_at === undefined ||
            job.completed_at === null ||
            job.steps === undefined
        )
            throw new Error('all have succeeded')

        const jtime =
            (Date.parse(job.completed_at) - Date.parse(job.started_at)) / 1000

        console.log(`job: ${job.name} took: ${jtime}`)

        times[job.name] = jtime

        for (const step of job.steps) {
            if (
                step.completed_at === undefined ||
                step.completed_at === null ||
                step.started_at === undefined ||
                step.started_at === null
            )
                throw new Error('all have succeeded')

            const stime =
                (Date.parse(step.completed_at) - Date.parse(step.started_at)) /
                1000
            console.log(`    step: ${step.name} took: ${stime}`)

            const stepName = `${job.name} >> ${step.name}`
            times[stepName] = stime
        }
    }

    return times
}

async function fetchDeployRuns(): TimedRuns {
    const token = readToken()
    const octokit = new Octokit({ auth: token })

    const {
        data: { workflows },
    } = await octokit.rest.actions.listRepoWorkflows({
        owner: 'CMSgov',
        repo: 'managed-care-review',
    })

    console.log(
        'WLFLOWS',
        workflows.map((w) => w.name)
    )

    const deploy = workflows.find((w) => {
        return w.name === 'Deploy'
    })

    if (deploy === undefined) throw new Error('better be one')

    const {
        data: { workflow_runs },
    } = await octokit.rest.actions.listWorkflowRuns({
        owner: 'CMSgov',
        repo: 'managed-care-review',
        workflow_id: deploy.id,
        status: 'success',
        per_page: 100,
    })

    // const readers = workflow_runs.filter(
    //     (r) => r.head_branch === 'wml-screen-reader-dates'
    // )

    const timedRuns: TimedRuns = {}
    for (const run of workflow_runs) {
        const stepTimes = await fetchStepTimes(octokit, run.id)

        timedRuns[run.id] = stepTimes
    }

    return timedRuns
}

async function main() {
    console.log('starting')

    const timedRuns = await fetchDeployRuns()

    console.log('GOT', timedRuns)
    const stats = calculateStats(timedRuns)

    // print them out in order of weight
    const averages: [string, number][] = Object.keys(stats).map((k) => {
        return [k, stats[k]]
    })

    const sortedAverages = averages.sort((a, b) => b[1] - a[1])

    for (const pair of sortedAverages) {
        console.log(`${pair[0]}: ${pair[1]}`)
    }
}

main()
