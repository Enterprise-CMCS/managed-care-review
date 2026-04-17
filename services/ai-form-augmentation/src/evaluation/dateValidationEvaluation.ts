import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { validationHandler } from '../handlers'
import type { DateValidationResult } from '../prompts'
import {
  getValidationResultKey,
  type ValidationResultArtifact
} from '../results'
import {
  newArtifactS3Client,
  type ArtifactS3Client
} from '../s3'
import {
  getValidationStatusKey,
  type ValidationStatusArtifact
} from '../status'
import { computeArtifactVersion } from '../versioning'
import {
  DATE_VALIDATION_CORPUS,
  type DateValidationCorpusExpectation,
  type DateValidationCorpusScenario
} from './dateValidationCorpus'

const LOCAL_EVALUATION_BUCKET = 'ai-form-augmentation-artifacts'
const LOCAL_S3_CONFIG = {
  region: 'us-east-1',
  endpoint: 'http://127.0.0.1:4566',
  forcePathStyle: true,
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test' // pragma: allowlist secret
  }
} as const

const FIELD_LABELS = {
  contractStartDate: 'Contract Start Date',
  contractEndDate: 'Contract End Date'
} as const
// Resolve fixture paths relative to the ai-form-augmentation workspace so the
// evaluation script behaves the same whether it is launched from the repo root
// or directly from the package directory.
const EVALUATION_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
)

export interface DateValidationEvaluationFieldReport {
  field: DateValidationCorpusExpectation['field']
  expectedOutcome: DateValidationCorpusExpectation['expectedOutcome']
  actualOutcome: DateValidationResult['outcome'] | 'missing'
  decisionSource: DateValidationResult['decisionSource'] | 'missing'
  passed: boolean
  problems: string[]
  actualMessage: string | null
  actualCitationOrders: number[]
}

export interface DateValidationEvaluationScenarioReport {
  scenarioId: string
  documentName: string
  summary: string
  passed: boolean
  statusStage: ValidationStatusArtifact['stage'] | 'failed-before-status'
  error: string | null
  fieldReports: DateValidationEvaluationFieldReport[]
}

export interface DateValidationEvaluationSummary {
  totalScenarios: number
  passedScenarios: number
  failedScenarios: number
  deterministicResults: number
  llmResults: number
  reports: DateValidationEvaluationScenarioReport[]
}

export async function runDateValidationEvaluation(): Promise<DateValidationEvaluationSummary> {
  const s3Client = newArtifactS3Client(LOCAL_S3_CONFIG)
  const reports = await Promise.all(
    DATE_VALIDATION_CORPUS.map(async (scenario) =>
      evaluateScenario(scenario, s3Client)
    )
  )

  const allFieldReports = reports.flatMap((report) => report.fieldReports)

  return {
    totalScenarios: reports.length,
    passedScenarios: reports.filter((report) => report.passed).length,
    failedScenarios: reports.filter((report) => !report.passed).length,
    deterministicResults: allFieldReports.filter(
      (report) => report.decisionSource === 'deterministic'
    ).length,
    llmResults: allFieldReports.filter(
      (report) => report.decisionSource === 'llm'
    ).length,
    reports
  }
}

async function evaluateScenario(
  scenario: DateValidationCorpusScenario,
  s3Client: ArtifactS3Client
): Promise<DateValidationEvaluationScenarioReport> {
  try {
    const fixtureAbsolutePath = path.resolve(
      EVALUATION_ROOT,
      scenario.fixturePath
    )
    const fixtureBuffer = await readFile(fixtureAbsolutePath)
    const formId = `evaluation-${scenario.id}`
    const sourceKey = `evaluation-fixtures/${scenario.id}/${scenario.documentName}`
    // Reuse the real artifact-version contract so evaluation runs exercise the
    // same stale/current logic the app relies on in normal validation polling.
    const artifactVersion = computeArtifactVersion([sourceKey])

    await s3Client.putBuffer(
      LOCAL_EVALUATION_BUCKET,
      sourceKey,
      fixtureBuffer,
      'application/pdf'
    )

    await validationHandler({
      formId,
      artifactVersion,
      bucket: LOCAL_EVALUATION_BUCKET,
      s3Config: LOCAL_S3_CONFIG,
      formFields: scenario.expectations.map((expectation) => ({
        field: expectation.field,
        label: FIELD_LABELS[expectation.field],
        value: expectation.formValue
      })),
      documents: [
        {
          documentName: scenario.documentName,
          sourceBucket: LOCAL_EVALUATION_BUCKET,
          sourceKey
        }
      ]
    })

    const [statusArtifact, resultArtifact] = await Promise.all([
      s3Client.getJson<ValidationStatusArtifact>(
        LOCAL_EVALUATION_BUCKET,
        getValidationStatusKey(formId)
      ),
      s3Client.getJson<ValidationResultArtifact>(
        LOCAL_EVALUATION_BUCKET,
        getValidationResultKey(formId)
      )
    ])

    const fieldReports = scenario.expectations.map((expectation) =>
      compareExpectation(expectation, resultArtifact.results)
    )
    // A scenario only counts as passing when the worker completes normally and
    // every expected field-level comparison matches the stored result.
    const passed =
      statusArtifact.stage === 'complete' &&
      fieldReports.every((report) => report.passed)

    return {
      scenarioId: scenario.id,
      documentName: scenario.documentName,
      summary: scenario.summary,
      passed,
      statusStage: statusArtifact.stage,
      error: null,
      fieldReports
    }
  } catch (error) {
    return {
      scenarioId: scenario.id,
      documentName: scenario.documentName,
      summary: scenario.summary,
      passed: false,
      statusStage: 'failed-before-status',
      error: error instanceof Error ? error.message : 'Unknown evaluation error',
      fieldReports: scenario.expectations.map((expectation) => ({
        field: expectation.field,
        expectedOutcome: expectation.expectedOutcome,
        actualOutcome: 'missing',
        decisionSource: 'missing',
        passed: false,
        problems: ['Scenario evaluation failed before a comparable result was stored.'],
        actualMessage: null,
        actualCitationOrders: []
      }))
    }
  }
}

function compareExpectation(
  expectation: DateValidationCorpusExpectation,
  actualResults: DateValidationResult[]
): DateValidationEvaluationFieldReport {
  const matchingResult =
    actualResults.find((result) => result.field === expectation.field) ?? null

  if (!matchingResult) {
    return {
      field: expectation.field,
      expectedOutcome: expectation.expectedOutcome,
      actualOutcome: 'missing',
      decisionSource: 'missing',
      passed: false,
      problems: ['No stored validation result was produced for this field.'],
      actualMessage: null,
      actualCitationOrders: []
    }
  }

  const problems: string[] = []

  if (matchingResult.outcome !== expectation.expectedOutcome) {
    problems.push(
      `Expected outcome ${expectation.expectedOutcome} but got ${matchingResult.outcome}.`
    )
  }

  if (
    expectation.expectedMessageIncludes &&
    !matchingResult.message.includes(expectation.expectedMessageIncludes)
  ) {
    problems.push(
      `Expected message to include "${expectation.expectedMessageIncludes}".`
    )
  }

  const actualCitationOrders = matchingResult.citations.map(
    (citation) => citation.order
  )

  if (
    expectation.expectedCitationOrders &&
    !sameNumberArray(actualCitationOrders, expectation.expectedCitationOrders)
  ) {
    problems.push(
      `Expected citation orders ${expectation.expectedCitationOrders.join(', ')} but got ${actualCitationOrders.join(', ') || 'none'}.`
    )
  }

  return {
    field: expectation.field,
    expectedOutcome: expectation.expectedOutcome,
    actualOutcome: matchingResult.outcome,
    decisionSource: matchingResult.decisionSource ?? 'missing',
    passed: problems.length === 0,
    problems,
    actualMessage: matchingResult.message,
    actualCitationOrders
  }
}

function sameNumberArray(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false
  }

  return left.every((value, index) => value === right[index])
}
