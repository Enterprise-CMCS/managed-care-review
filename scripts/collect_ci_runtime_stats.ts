import { Octokit } from 'octokit'
import type { components } from '@octokit/openapi-types'
import fs from 'fs'
import path from 'path'
import os from 'os'

// This script collects stats on the 100 most recent successful github
// action CI runs and prints out how long individual jobs and steps are
// taking.

// For development, I ran it with entr in this directory
//        `find . | entr -cs "yarn tsc && node ./collect_ci_runtime_stats.js --use-cache"`

// USAGE: node ./collect_ci_runtime_stats.js [--use-cache]
// the --use-cache flag will write the results of the github queries to the CACHE_FILE
// and if CACHE_FILE exists will read from that instead of talking to github.

const CACHE_FILE = './recent_actions_cache.json'
const GH_TOKEN_PATH = path.join(os.homedir(), '.github_actions_token.txt')

type StepTimes = { [names: string]: number }
type TimedRuns = { [id: string]: StepTimes }
type StepStats = { [names: string]: { mean: number; stdev: number } }

function readToken(path = GH_TOKEN_PATH) {
    return fs.readFileSync(path).toString().trim()
}

// this is everything we reference out of the github workflow type
// with everything we reference from the github jobs type added to it.
interface WorkflowRun {
    id: number
    head_branch: string | null
    run_number: number
    jobs: WorkflowJob[]
}

interface WorkflowJob {
    completed_at: string | undefined | null
    started_at: string
    name: string
    conclusion: string | undefined | null
    steps?:
        | {
              completed_at?: string | undefined | null
              started_at?: string | undefined | null
              name: string
          }[]
        | undefined
    id: number
}

// grab workflow runs we're interested in, then grab their jobs
// and return them with their jobs included.
async function fetchDeployRuns(): Promise<WorkflowRun[]> {
    const token = readToken()
    const octokit = new Octokit({ auth: token })

    const {
        data: { workflows },
    } = await octokit.rest.actions.listRepoWorkflows({
        owner: 'Enterprise-CMCS',
        repo: 'managed-care-review',
    })

    console.info('Workflows fetched')

    const deploy = workflows.find((w: components['schemas']['workflow']) => {
        return w.name === 'Deploy'
    })

    if (deploy === undefined) throw new Error('better be one')

    const {
        data: { workflow_runs },
    } = await octokit.rest.actions.listWorkflowRuns({
        owner: 'Enterprise-CMCS',
        repo: 'managed-care-review',
        workflow_id: deploy.id,
        status: 'success',
        per_page: 100,
    })

    console.info('Runs fetched')

    const runsWithJobs: WorkflowRun[] = []

    let count = workflow_runs.length
    for (const run of workflow_runs) {
        const {
            data: { jobs },
        } = await octokit.rest.actions.listJobsForWorkflowRun({
            owner: 'Enterprise-CMCS',
            repo: 'managed-care-review',
            run_id: run.id,
        })

        console.info('Jobs Fetched', count)
        count--

        const runWithJobs = { ...run, jobs }
        runsWithJobs.push(runWithJobs)
    }

    return runsWithJobs
}

function processDeployRuns(runs: WorkflowRun[]): [TimedRuns, TimedRuns] {
    // filter out all the jobs that never block
    for (const run of runs) {
        run.jobs = blockingJobs(run)
        console.info(
            'BLOCKING JOBS',
            run.run_number,
            run.jobs.map((j) => j.name)
        )
    }

    // separate out initial runs from subsequent runs.
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

// compute all the times we care about for a given run.
function computeStepTimes(run: WorkflowRun): StepTimes {
    const times: StepTimes = {}

    for (const job of run.jobs) {
        if (
            job.completed_at === undefined ||
            job.completed_at === null ||
            job.steps === undefined
        )
            throw new Error('all have succeeded')

        const jtime =
            (Date.parse(job.completed_at) - Date.parse(job.started_at)) / 1000

        // console.info(`job: ${job.name} took: ${jtime}`)

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
            // console.info(`    step: ${step.name} took: ${stime}`)

            const stepName = `${job.name} >> ${step.name}`
            times[stepName] = stime
        }
    }

    return times
}

// this maps a step's names into a normalized form, allowing us to
// collapse several tasks together.
function massageNames(names: string): string {
    // here we collapse cypres-run (1) for instance
    const massaged = names.replace(/cypress-run\s\(\d\)/, 'cypress-run')

    return massaged
}

// calculates statistics for all of the runs we have timed.
function calculateStats(timedRuns: TimedRuns): StepStats {
    const stepTimes = countSteps(timedRuns)

    console.info('array of times: ', stepTimes)

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

    return stepAverages
}

// this takes our list of all the runs and turns it into a single dictionary
// with an array of times for each task.
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
        console.info(stdDev, 'not Equal', expectedVal)
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
        console.info(
            `${line[0]}: ${formatter.format(line[1])} (${formatter.format(
                line[2]
            )})`
        )
    }
}

// loads the deploy runs either by hitting the API or by reading from the cache.
async function loadDeployRuns(useCache: boolean): Promise<WorkflowRun[]> {
    if (useCache && fs.existsSync(CACHE_FILE)) {
        // read from the cache
        const cachedRuns = fs.readFileSync(CACHE_FILE).toString()
        const runs = JSON.parse(cachedRuns)
        return runs
    } else {
        // talk to github
        const runs = await fetchDeployRuns()
        if (useCache) {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(runs))
            console.info('cache written')
        }
        return runs
    }
}

function blockingJobs(run: WorkflowRun): WorkflowJob[] {
    // idea is to trace back from the last job. Steps are all sequential more or less.

    // get a sortable map of all task end times to task
    const endTimes = new Map<Date, WorkflowJob>()
    for (const job of run.jobs) {
        if (!job.completed_at) throw new Error('all are finished')
        const finishedAt: Date = new Date(Date.parse(job.completed_at))
        endTimes.set(finishedAt, job)
    }

    const lastIsFirst = Array.from(endTimes.keys()).sort(
        (a, b) => b.getTime() - a.getTime()
    )

    // the next poll task is the one that finished just before this one started
    // technically we should know that that task is a needs of the current one.
    // that's not in the API though.
    let pollStartTime: Date = new Date(864000000000000)
    const longPolls: WorkflowJob[] = []
    let lastTimeSeen: Date | undefined
    while (
        (lastTimeSeen = lastIsFirst.find((d) => {
            return d.getTime() < pollStartTime.getTime()
        }))
    ) {
        const pollTask = endTimes.get(lastTimeSeen)
        if (pollTask === undefined) throw new Error('we put it in there.')

        if (pollTask.conclusion !== 'skipped') {
            longPolls.push(pollTask)
        }

        pollStartTime = new Date(Date.parse(pollTask.started_at))
    }

    return longPolls
}

async function main() {
    console.info('starting')
    testStandardDev()

    // parse args
    const useCache = process.argv.includes('--use-cache')

    const runs = await loadDeployRuns(useCache)

    // Filter out all runs from before the big reordering
    const recentRuns = runs.filter((r) => r.run_number > 3005)

    const [timedFirstRuns, timedLaterRuns] = processDeployRuns(recentRuns)

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
