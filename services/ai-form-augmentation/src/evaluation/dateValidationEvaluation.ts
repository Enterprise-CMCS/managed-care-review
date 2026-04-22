import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { validationHandler } from '../handlers'
import {
  computeDocumentCacheKey,
  getChunksArtifactKey,
  getDocumentIndexArtifactKey,
  type ChunksArtifact,
  type IndexedDocumentArtifact
} from '../artifacts'
import type {
  ValidationIndexingSummaryDiagnostic,
  ValidationPhaseTimingDiagnostic
} from '../handlers'
import type { DateValidationResult } from '../prompts'
import {
  getValidationResultKey,
  type ValidationLlmDiagnostic,
  type ValidationRetrievalDiagnostic,
  type ValidationResultArtifact
} from '../results'
import { newArtifactS3Client, type ArtifactS3Client } from '../s3'
import {
  getValidationStatusKey,
  type ValidationStatusArtifact
} from '../status'
import { computeArtifactVersion } from '../versioning'
import {
  DEFAULT_DATE_VALIDATION_EVALUATION_SCENARIOS,
  LARGE_SUBMISSION_DATE_VALIDATION_SCENARIOS,
  type DateValidationCorpusExpectation,
  type DateValidationCorpusDocument,
  type DateValidationCorpusScenario
} from './dateValidationCorpus'
import {
  assertEvaluationStorageReady,
  getEvaluationStorageConfig,
  type EvaluationStorageConfig
} from './evaluationStorage'
import {
  describeEvaluationLlmConfig,
  getEvaluationLlmConfig
} from './evaluationLlmConfig'

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
  llmIssue: ValidationLlmDiagnostic['issue'] | null
  retrievalIssue: 'missing-clause-evidence' | null
  retrievalClauseEvidencePresent: boolean
  retrievalClauseEvidenceAdded: boolean
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
  largeSubmissionDiagnostics?: DateValidationLargeSubmissionDiagnostics
  fieldReports: DateValidationEvaluationFieldReport[]
}

export interface DateValidationLargeSubmissionDiagnostics {
  totalDocuments: number
  eligibleDocuments: number
  skippedDocuments: number
  failedDocuments: number
  processedDocuments: number
  chunkCount: number
  finalOutcomes: {
    match: number
    mismatch: number
    notEnoughEvidence: number
  }
  ocr: {
    attemptedDocuments: number
    skippedDocuments: number
    cappedDocuments: number
  }
  indexing: ValidationIndexingSummaryDiagnostic
  phaseTimingsMs: Record<ValidationPhaseTimingDiagnostic['phase'], number>
  artifactSizesBytes: {
    parsedText: number | null
    chunks: number
    vectors: number
    status: number
    results: number
  }
}

export interface DateValidationEvaluationSummary {
  totalScenarios: number
  passedScenarios: number
  failedScenarios: number
  deterministicResults: number
  llmResults: number
  malformedLlmResults: number
  clauseEvidenceMisses: number
  llmProvider: string
  reports: DateValidationEvaluationScenarioReport[]
}

export interface DateValidationEvaluationOptions {
  includeLargeSubmission?: boolean
}

export async function runDateValidationEvaluation(
  options: DateValidationEvaluationOptions = {}
): Promise<DateValidationEvaluationSummary> {
  const evaluationStorage = getEvaluationStorageConfig()
  const evaluationLlmConfig = getEvaluationLlmConfig()
  await assertEvaluationStorageReady(evaluationStorage)

  const scenarios = [
    ...DEFAULT_DATE_VALIDATION_EVALUATION_SCENARIOS,
    ...(options.includeLargeSubmission
      ? LARGE_SUBMISSION_DATE_VALIDATION_SCENARIOS
      : [])
  ]
  const s3Client = newArtifactS3Client(evaluationStorage.s3Config)
  const reports = await Promise.all(
    scenarios.map(async (scenario) =>
      evaluateScenario(
        scenario,
        s3Client,
        evaluationStorage,
        evaluationLlmConfig
      )
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
    malformedLlmResults: allFieldReports.filter(
      (report) =>
        report.llmIssue === 'missing-json-array' ||
        report.llmIssue === 'invalid-json' ||
        report.llmIssue === 'invalid-result-shape'
    ).length,
    clauseEvidenceMisses: allFieldReports.filter(
      (report) => report.retrievalIssue === 'missing-clause-evidence'
    ).length,
    llmProvider: describeEvaluationLlmConfig(evaluationLlmConfig),
    reports
  }
}

async function evaluateScenario(
  scenario: DateValidationCorpusScenario,
  s3Client: ArtifactS3Client,
  evaluationStorage: EvaluationStorageConfig,
  evaluationLlmConfig: ReturnType<typeof getEvaluationLlmConfig>
): Promise<DateValidationEvaluationScenarioReport> {
  try {
    const formId = `evaluation-${scenario.id}`
    const documents = getScenarioDocuments(scenario)
    const runnableDocuments = documents.filter(
      (document) => document.disposition === 'eligible'
    )
    const sourceDocuments = runnableDocuments.map((document) => ({
      document,
      sourceKey: `evaluation-fixtures/${scenario.id}/${document.documentName}`
    }))
    // Reuse the real artifact-version contract so evaluation runs exercise the
    // same stale/current logic the app relies on in normal validation polling.
    const artifactVersion = computeArtifactVersion(
      sourceDocuments.map((document) => document.sourceKey)
    )

    const phaseTimings = newPhaseTimings()
    let indexingSummary: ValidationIndexingSummaryDiagnostic = {
      concurrencyLimit: 0,
      totalElapsedMs: 0,
      processedDocuments: 0,
      failedDocuments: 0
    }
    await measureEvaluationPhase(phaseTimings, 'fetch', async () =>
      Promise.all(
        sourceDocuments.map(async ({ document, sourceKey }) => {
          const fixtureAbsolutePath = path.resolve(
            EVALUATION_ROOT,
            document.fixturePath ?? scenario.fixturePath
          )
          const fixtureBuffer = await readFile(fixtureAbsolutePath)

          await s3Client.putBuffer(
            evaluationStorage.bucket,
            sourceKey,
            fixtureBuffer,
            document.contentType
          )
        })
      )
    )

    await validationHandler({
      formId,
      artifactVersion,
      bucket: evaluationStorage.bucket,
      s3Config: evaluationStorage.s3Config,
      validationLlmConfig: evaluationLlmConfig,
      formFields: scenario.expectations.map((expectation) => ({
        field: expectation.field,
        label: FIELD_LABELS[expectation.field],
        value: expectation.formValue
      })),
      documents: [
        ...sourceDocuments.map(({ document, sourceKey }) => ({
          documentName: document.documentName,
          sourceBucket: evaluationStorage.bucket,
          sourceKey
        }))
      ],
      diagnostics: {
        recordPhaseTiming: (phase, elapsedMs) => {
          phaseTimings[phase] += elapsedMs
        },
        recordIndexingSummary: (summary) => {
          indexingSummary = summary
        }
      }
    })

    const [
      statusArtifact,
      resultArtifact,
      chunksArtifact,
      documentIndexArtifacts
    ] = await Promise.all([
      s3Client.getJson<ValidationStatusArtifact>(
        evaluationStorage.bucket,
        getValidationStatusKey(formId)
      ),
      s3Client.getJson<ValidationResultArtifact>(
        evaluationStorage.bucket,
        getValidationResultKey(formId)
      ),
      s3Client.getJson<ChunksArtifact>(
        evaluationStorage.bucket,
        getChunksArtifactKey(formId)
      ),
      Promise.all(
        sourceDocuments.map(({ document, sourceKey }) =>
          s3Client.getJson<IndexedDocumentArtifact>(
            evaluationStorage.bucket,
            getDocumentIndexArtifactKey(
              formId,
              computeDocumentCacheKey({
                documentName: document.documentName,
                sourceBucket: evaluationStorage.bucket,
                sourceKey
              })
            )
          )
        )
      )
    ])

    const fieldReports = scenario.expectations.map((expectation) =>
      compareExpectation(
        expectation,
        resultArtifact.results,
        resultArtifact.llmDiagnostics ?? [],
        resultArtifact.retrievalDiagnostics ?? []
      )
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
      ...(scenario.documents
        ? {
            largeSubmissionDiagnostics: buildLargeSubmissionDiagnostics({
              documents,
              chunksArtifact,
              documentIndexArtifacts,
              resultArtifact,
              statusArtifact,
              phaseTimings,
              indexingSummary
            })
          }
        : {}),
      fieldReports
    }
  } catch (error) {
    return {
      scenarioId: scenario.id,
      documentName: scenario.documentName,
      summary: scenario.summary,
      passed: false,
      statusStage: 'failed-before-status',
      error:
        error instanceof Error ? error.message : 'Unknown evaluation error',
      ...(scenario.documents
        ? {
            largeSubmissionDiagnostics: buildLargeSubmissionDiagnostics({
              documents: getScenarioDocuments(scenario),
              chunksArtifact: null,
              documentIndexArtifacts: [],
              resultArtifact: null,
              statusArtifact: null,
              phaseTimings: newPhaseTimings(),
              indexingSummary: {
                concurrencyLimit: 0,
                totalElapsedMs: 0,
                processedDocuments: 0,
                failedDocuments: 0
              }
            })
          }
        : {}),
      fieldReports: scenario.expectations.map((expectation) => ({
        field: expectation.field,
        expectedOutcome: expectation.expectedOutcome,
        actualOutcome: 'missing',
        decisionSource: 'missing',
        llmIssue: null,
        retrievalIssue: null,
        retrievalClauseEvidencePresent: false,
        retrievalClauseEvidenceAdded: false,
        passed: false,
        problems: [
          'Scenario evaluation failed before a comparable result was stored.'
        ],
        actualMessage: null,
        actualCitationOrders: []
      }))
    }
  }
}

export function getScenarioDocuments(
  scenario: DateValidationCorpusScenario
): DateValidationCorpusDocument[] {
  return (
    scenario.documents ?? [
      {
        documentName: scenario.documentName,
        fixturePath: scenario.fixturePath,
        contentType: 'application/pdf',
        disposition: 'eligible',
        role: 'relevant-contract',
        tags: ['eligible-pdf']
      }
    ]
  )
}

function buildLargeSubmissionDiagnostics(args: {
  documents: DateValidationCorpusDocument[]
  chunksArtifact: ChunksArtifact | null
  documentIndexArtifacts: IndexedDocumentArtifact[]
  resultArtifact: ValidationResultArtifact | null
  statusArtifact: ValidationStatusArtifact | null
  phaseTimings: Record<ValidationPhaseTimingDiagnostic['phase'], number>
  indexingSummary: ValidationIndexingSummaryDiagnostic
}): DateValidationLargeSubmissionDiagnostics {
  const documentDiagnostics =
    args.resultArtifact?.documentDiagnostics ?? args.statusArtifact?.documentDiagnostics ?? []

  return {
    totalDocuments: args.documents.length,
    eligibleDocuments: args.documents.filter(
      (document) => document.disposition === 'eligible'
    ).length,
    skippedDocuments: args.documents.filter(
      (document) => document.disposition === 'skipped'
    ).length,
    failedDocuments: args.documents.filter(
      (document) => document.disposition === 'failed'
    ).length,
    processedDocuments: args.chunksArtifact?.documents?.length ?? 0,
    chunkCount: args.chunksArtifact?.chunks.length ?? 0,
    finalOutcomes: countOutcomes(args.resultArtifact?.results ?? []),
    ocr: {
      attemptedDocuments: documentDiagnostics.filter(
        (diagnostic) => diagnostic.ocrDisposition === 'attempted'
      ).length,
      skippedDocuments: documentDiagnostics.filter(
        (diagnostic) => diagnostic.ocrDisposition === 'skipped'
      ).length,
      cappedDocuments: documentDiagnostics.filter(
        (diagnostic) => diagnostic.reason === 'ocr-capped-large-batch'
      ).length
    },
    indexing: args.indexingSummary,
    phaseTimingsMs: args.phaseTimings,
    artifactSizesBytes: {
      parsedText: null,
      chunks: approximateJsonSize(args.chunksArtifact),
      vectors: approximateJsonSize(
        args.documentIndexArtifacts.map((artifact) => artifact.chunkVectors)
      ),
      status: approximateJsonSize(args.statusArtifact),
      results: approximateJsonSize(args.resultArtifact)
    }
  }
}

function countOutcomes(results: DateValidationResult[]): {
  match: number
  mismatch: number
  notEnoughEvidence: number
} {
  return {
    match: results.filter((result) => result.outcome === 'match').length,
    mismatch: results.filter((result) => result.outcome === 'mismatch').length,
    notEnoughEvidence: results.filter(
      (result) => result.outcome === 'not-enough-evidence'
    ).length
  }
}

function approximateJsonSize(value: unknown): number {
  if (value == null) {
    return 0
  }

  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

function newPhaseTimings(): Record<
  ValidationPhaseTimingDiagnostic['phase'],
  number
> {
  return {
    fetch: 0,
    parse: 0,
    ocr: 0,
    chunk: 0,
    embed: 0,
    retrieval: 0,
    validation: 0
  }
}

async function measureEvaluationPhase<T>(
  phaseTimings: Record<ValidationPhaseTimingDiagnostic['phase'], number>,
  phase: ValidationPhaseTimingDiagnostic['phase'],
  run: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now()

  try {
    return await run()
  } finally {
    phaseTimings[phase] += Date.now() - startedAt
  }
}

function compareExpectation(
  expectation: DateValidationCorpusExpectation,
  actualResults: DateValidationResult[],
  llmDiagnostics: ValidationLlmDiagnostic[],
  retrievalDiagnostics: ValidationRetrievalDiagnostic[]
): DateValidationEvaluationFieldReport {
  const matchingResult =
    actualResults.find((result) => result.field === expectation.field) ?? null
  const matchingDiagnostic =
    llmDiagnostics.find(
      (diagnostic) => diagnostic.field === expectation.field
    ) ?? null
  const matchingRetrievalDiagnostic =
    retrievalDiagnostics.find(
      (diagnostic) => diagnostic.field === expectation.field
    ) ?? null

  if (!matchingResult) {
    return {
      field: expectation.field,
      expectedOutcome: expectation.expectedOutcome,
      actualOutcome: 'missing',
      decisionSource: 'missing',
      llmIssue: matchingDiagnostic?.issue ?? null,
      retrievalIssue: getRetrievalIssue(matchingRetrievalDiagnostic),
      retrievalClauseEvidencePresent:
        matchingRetrievalDiagnostic?.clauseEvidencePresentFinally ?? false,
      retrievalClauseEvidenceAdded:
        matchingRetrievalDiagnostic?.clauseEvidenceAdded ?? false,
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

  if (expectation.expectedMessageIncludesAll) {
    // Some scenarios now care about two or more dates appearing in the stored
    // finding text, so evaluation needs a simple multi-fragment assertion
    // instead of only checking one favorite substring.
    const missingFragments = expectation.expectedMessageIncludesAll.filter(
      (fragment) => !matchingResult.message.includes(fragment)
    )

    if (missingFragments.length > 0) {
      problems.push(
        `Expected message to include all of: ${missingFragments.join(', ')}.`
      )
    }
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
    llmIssue: matchingDiagnostic?.issue ?? null,
    retrievalIssue: getRetrievalIssue(matchingRetrievalDiagnostic),
    retrievalClauseEvidencePresent:
      matchingRetrievalDiagnostic?.clauseEvidencePresentFinally ?? false,
    retrievalClauseEvidenceAdded:
      matchingRetrievalDiagnostic?.clauseEvidenceAdded ?? false,
    passed: problems.length === 0,
    problems,
    actualMessage: matchingResult.message,
    actualCitationOrders
  }
}

function getRetrievalIssue(
  diagnostic: ValidationRetrievalDiagnostic | null
): 'missing-clause-evidence' | null {
  if (!diagnostic) {
    return null
  }

  if (
    diagnostic.competingDateCount > 1 &&
    !diagnostic.clauseEvidencePresentFinally
  ) {
    return 'missing-clause-evidence'
  }

  return null
}

function sameNumberArray(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false
  }

  return left.every((value, index) => value === right[index])
}
