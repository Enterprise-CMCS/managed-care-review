import { Octokit } from 'octokit'
import fs from 'fs'

// This script collects stats on the 100 most recent successful github
// action CI runs and prints out how long individual jobs and steps are
// taking.

// For development, I ran it with entr in this directory
//        `find . | entr -cs "yarn tsc && node ./collect_ci_runtime_stats.js"`

type StepTimes = { [names: string]: number }
type TimedRuns = { [id: string]: StepTimes }
type StepStats = { [names: string]: { mean: number; stdev: number } }

function readToken(path = './action_token.txt') {
    return fs.readFileSync(path).toString().trim()
}

function calculateStats(timedRuns: TimedRuns): StepStats {
    const stepTimes = countSteps(timedRuns)

    console.log('array of times: ', stepTimes)

    // ok, now cacluate stats
    // average
    const stepAverages: StepStats = {}

    for (const names of Object.keys(stepTimes)) {
        const sum = stepTimes[names].reduce((acc, t) => acc + t, 0)
        const average = sum / stepTimes[names].length

        const stdDev = standardDev(stepTimes[names])

        stepAverages[names] = {
            mean: average,
            stdev: stdDev,
        }
    }

    // console.log('mean', stepAverages)

    return stepAverages
}

function massageNames(names: string): string {
    // here we collapse cypres-run (1) for instance

    const massaged = names.replace(/cypress-run\s\(\d\)/, 'cypress-run')

    return massaged
}

function countSteps(timedRuns: TimedRuns): { [names: string]: number[] } {
    const stepTimes: { [names: string]: number[] } = {}

    // turn our list of runs into a single dict with arrays of times
    for (const timedRun of Object.values(timedRuns)) {
        for (const names of Object.keys(timedRun)) {
            const trueName = massageNames(names)

            if (!(trueName in stepTimes)) {
                stepTimes[trueName] = []
            }
            stepTimes[trueName].push(timedRun[names])
        }
    }

    return stepTimes
}

function standardDev(times: number[]): number {
    if (times.length === 1) {
        return -1
    }

    const sum = times.reduce((acc, t) => acc + t, 0)
    const mean = sum / times.length

    const distSq = times.reduce((acc, t) => acc + (t - mean) ** 2, 0)
    const variance = distSq / (times.length - 1)
    return Math.sqrt(variance)
}

function testStandardDev() {
    const times = [
        1130, 947, 973, 488, 400, 1060, 288, 366, 966, 962, 362, 470, 355, 299,
        333, 414, 334, 905, 996, 398, 370, 356, 1339, 1028, 362, 535, 1270, 445,
        431, 457, 1039, 1009, 1123, 420, 376, 1044, 515, 461, 1140, 373, 355,
        481, 386, 338, 1051, 1005, 359, 996, 927, 457, 358, 353, 1068, 449, 448,
        454, 399, 971, 441, 369, 352, 346, 352, 354, 425, 980, 367, 359, 511,
        368, 294, 371, 459, 354, 349, 920, 313, 439, 997, 1068, 521, 441, 500,
        968, 411, 961, 310, 878, 400, 783, 781, 327, 345, 859, 322, 421, 826,
        498, 398,
    ]

    const stdDev = standardDev(times)

    const expectedVal = 297.67035
    if (Math.abs(stdDev - expectedVal) > 0.01) {
        console.log(stdDev, 'not Equal', expectedVal)
        throw new Error('not the right standard deviation.')
    }
}

// data cleanup on the individual run data
function massageRuns(timedRuns: TimedRuns): TimedRuns {
    // subtract the time from "lock this branch to prevent concurrent builds" away from unit tests
    const massagedRuns: TimedRuns = {}

    for (const key of Object.keys(timedRuns)) {
        const lockNames =
            'test - unit tests >> lock this branch to prevent concurrent builds'
        const unitTestName = 'test - unit tests'

        const massagedRun: StepTimes = Object.assign({}, timedRuns[key])
        massagedRun[unitTestName] -= massagedRun[lockNames]
        massagedRuns[key] = massagedRun
    }

    return massagedRuns
}

// fetch the run and compute all the times we care about
function computeStepTimes(run: WorkflowRun): StepTimes {
    const times: StepTimes = {}

    //job
    for (const job of run.jobs) {
        if (
            job.completed_at === undefined ||
            job.completed_at === null ||
            job.steps === undefined
        )
            throw new Error('all have succeeded')

        const jtime =
            (Date.parse(job.completed_at) - Date.parse(job.started_at)) / 1000

        // console.log(`job: ${job.name} took: ${jtime}`)

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
            // console.log(`    step: ${step.name} took: ${stime}`)

            const stepName = `${job.name} >> ${step.name}`
            times[stepName] = stime
        }
    }

    return times
}

// this is everything we reference out of the github workflow type
// with everything we reference from the github jobs type added to it.
interface WorkflowRun {
    id: number
    head_branch: string | null
    jobs: {
        completed_at: string | undefined | null
        started_at: string
        name: string
        steps?:
            | {
                  completed_at?: string | undefined | null
                  started_at?: string | undefined | null
                  name: string
              }[]
            | undefined
        id: number
    }[]
}

// grab workflow runs we're interested in, then grab their jobs
// and return them with their jobs included.
async function fetchDeployRuns(): Promise<WorkflowRun[]> {
    const token = readToken()
    const octokit = new Octokit({ auth: token })

    const {
        data: { workflows },
    } = await octokit.rest.actions.listRepoWorkflows({
        owner: 'CMSgov',
        repo: 'managed-care-review',
    })

    console.log('Workflows fetched')

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

    console.log('Runs fetched')

    // const readers = workflow_runs.filter(
    //     (r) => r.head_branch === 'wml-screen-reader-dates'
    // )

    const runsWithJobs: WorkflowRun[] = []

    let count = workflow_runs.length
    for (const run of workflow_runs) {
        const {
            data: { jobs },
        } = await octokit.rest.actions.listJobsForWorkflowRun({
            owner: 'CMSgov',
            repo: 'managed-care-review',
            run_id: run.id,
        })

        console.log('Jobs Fetched', count)
        count--

        const runWithJobs = { ...run, jobs }
        runsWithJobs.push(runWithJobs)
    }

    return runsWithJobs
}

function processDeployRuns(runs: WorkflowRun[]): [TimedRuns, TimedRuns] {
    // separate out first runs from last runs.
    const firstRunSet: { [names: string]: WorkflowRun } = {}
    const laterRuns: WorkflowRun[] = []

    // runs come to us in reverse chronological order
    // reversing them lets us scan through them pulling out
    // the first time we see any branch
    runs.reverse()
    for (const run of runs) {
        if (run.head_branch === undefined || run.head_branch === null)
            throw new Error('we shouldnt have a branchless run')

        if (!(run.head_branch in firstRunSet)) {
            firstRunSet[run.head_branch] = run
        } else {
            laterRuns.push(run)
        }
    }

    const timedFirstRuns: TimedRuns = {}
    for (const run of Object.values(firstRunSet)) {
        const stepTimes = computeStepTimes(run)

        timedFirstRuns[run.id] = stepTimes
    }

    const timedLaterRuns: TimedRuns = {}
    for (const run of laterRuns) {
        const stepTimes = computeStepTimes(run)

        timedLaterRuns[run.id] = stepTimes
    }

    return [timedFirstRuns, timedLaterRuns]
}

function printStats(stats: StepStats) {
    // print them out in order of weight
    const outputs: [string, number, number][] = Object.keys(stats).map((k) => {
        return [k, stats[k].mean, stats[k].stdev]
    })

    const sortedOutputs = outputs.sort((a, b) => b[1] - a[1])

    const formatter = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
    })

    for (const line of sortedOutputs) {
        console.log(
            `${line[0]}: ${formatter.format(line[1])} (${formatter.format(
                line[2]
            )})`
        )
    }
}

async function main() {
    console.log('starting')
    testStandardDev()

    // // write to the cache
    // const runs = await fetchDeployRuns()
    // console.log('runs', runs)
    // fs.writeFileSync('./all_gh_runs.json', JSON.stringify(runs))
    // console.log('written')

    // read from the cache.
    const cachedRuns = fs.readFileSync('./all_gh_runs.json').toString()
    const runs: WorkflowRun[] = JSON.parse(cachedRuns)

    const [timedFirstRuns, timedLaterRuns] = processDeployRuns(runs)

    // const cache = fs.readFileSync('./all_step_times.json').toString()
    // const timedRuns: TimedRuns = JSON.parse(cache)

    // console.log('GOT', timedRuns)

    const firstStats = calculateStats(massageRuns(timedFirstRuns))
    const laterStats = calculateStats(massageRuns(timedLaterRuns))

    // zip together our stats to display them together.
    const allStats: StepStats = {}
    for (const firstKey of Object.keys(firstStats)) {
        const newKey = 'initial | ' + firstKey
        allStats[newKey] = firstStats[firstKey]
    }
    for (const laterKey of Object.keys(laterStats)) {
        const newKey = 'subsequ | ' + laterKey
        allStats[newKey] = laterStats[laterKey]
    }

    printStats(allStats)
}

main()
