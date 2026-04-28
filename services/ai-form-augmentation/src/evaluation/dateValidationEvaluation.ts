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
  type ValidationDocumentDiagnostic,
  type ValidationFieldWorkSelectionDiagnostic,
  type ValidationLlmDiagnostic,
  type ValidationRetrievalDiagnostic,
  type ValidationWorkSelectionMode,
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
  workSelectionComparison?: DateValidationWorkSelectionComparison
  fieldReports: DateValidationEvaluationFieldReport[]
}

export interface DateValidationWorkSelectionFieldComparison {
  field: DateValidationCorpusExpectation['field']
  allDocOutcome: DateValidationResult['outcome'] | 'missing'
  gatedOutcome: DateValidationResult['outcome'] | 'missing'
  gatedEvidenceSource:
    | ValidationFieldWorkSelectionDiagnostic['evidenceSource']
    | 'missing'
  gatedFallbackTriggers: string[]
  comparison: 'match' | 'more-conservative' | 'risk'
}

export interface DateValidationWorkSelectionComparison {
  gatedPassed: boolean
  comparison: 'match' | 'more-conservative' | 'risk'
  fallbackRequiredFieldCount: number
  fieldComparisons: DateValidationWorkSelectionFieldComparison[]
}

export interface DateValidationWorkSelectionPromotionDecision {
  recommendedDefaultMode: Extract<ValidationWorkSelectionMode, 'all-doc' | 'gated-first-pass'>
  gatedPassedScenarios: number
  matchedScenarios: number
  moreConservativeScenarios: number
  riskyScenarios: number
  reason: string
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
  workSelection: {
    firstPassDocuments: number
    deferredDocuments: number
    relevantDocuments: number
    relevantDocumentsSelectedEarly: number
    citedEvidenceDocuments: number
    citedEvidenceDocumentsSelectedEarly: number
    oddlyNamedRelevantDeferred: number
    oddlyNamedRelevantRecoveredByFallback: number
    fieldAnalyses: DateValidationWorkSelectionFieldAnalysis[]
    recommendation: DateValidationWorkSelectionRecommendation
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

export interface DateValidationWorkSelectionFieldAnalysis {
  field: DateValidationCorpusExpectation['field']
  evidenceSource: 'first-pass' | 'fallback'
  fallbackTriggers: string[]
}

export interface DateValidationWorkSelectionRecommendation {
  recommendedMode: 'require-full-fallback'
  firstPassRules: string[]
  fallbackTriggers: string[]
  summary: string
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
  workSelectionPromotionDecision: DateValidationWorkSelectionPromotionDecision
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
    workSelectionPromotionDecision: buildWorkSelectionPromotionDecision(reports),
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

    const allDocRun = await runScenarioMode({
      scenario,
      mode: 'all-doc',
      s3Client,
      evaluationStorage,
      evaluationLlmConfig,
      artifactVersion,
      sourceDocuments,
      phaseTimings,
      indexingSummary
    })
    const gatedRun = await runScenarioMode({
      scenario,
      mode: 'gated-first-pass',
      s3Client,
      evaluationStorage,
      evaluationLlmConfig,
      artifactVersion,
      sourceDocuments,
      phaseTimings: newPhaseTimings(),
      indexingSummary: {
        concurrencyLimit: 0,
        totalElapsedMs: 0,
        processedDocuments: 0,
        failedDocuments: 0
      }
    })
    // A scenario only counts as passing when the worker completes normally and
    // every expected field-level comparison matches the stored result.
    const passed =
      allDocRun.statusArtifact.stage === 'complete' &&
      allDocRun.fieldReports.every((report) => report.passed)

    return {
      scenarioId: scenario.id,
      documentName: scenario.documentName,
      summary: scenario.summary,
      passed,
      statusStage: allDocRun.statusArtifact.stage,
      error: null,
      ...(scenario.documents
        ? {
            largeSubmissionDiagnostics: buildLargeSubmissionDiagnostics({
              documents,
              chunksArtifact: gatedRun.chunksArtifact,
              documentIndexArtifacts: gatedRun.documentIndexArtifacts,
              resultArtifact: gatedRun.resultArtifact,
              statusArtifact: gatedRun.statusArtifact,
              phaseTimings: gatedRun.phaseTimings,
              indexingSummary: gatedRun.indexingSummary
            })
          }
        : {}),
      workSelectionComparison: compareWorkSelectionOutcomes({
        expectations: scenario.expectations,
        allDocResults: allDocRun.resultArtifact.results,
        gatedResults: gatedRun.resultArtifact.results,
        gatedFieldDiagnostics:
          gatedRun.resultArtifact.fieldWorkSelectionDiagnostics ?? [],
        gatedPassed:
          gatedRun.statusArtifact.stage === 'complete' &&
          gatedRun.fieldReports.every((report) => report.passed)
      }),
      fieldReports: allDocRun.fieldReports
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

async function runScenarioMode(args: {
  scenario: DateValidationCorpusScenario
  mode: Extract<ValidationWorkSelectionMode, 'all-doc' | 'gated-first-pass'>
  s3Client: ArtifactS3Client
  evaluationStorage: EvaluationStorageConfig
  evaluationLlmConfig: ReturnType<typeof getEvaluationLlmConfig>
  artifactVersion: string
  sourceDocuments: Array<{
    document: DateValidationCorpusDocument
    sourceKey: string
  }>
  phaseTimings: Record<ValidationPhaseTimingDiagnostic['phase'], number>
  indexingSummary: ValidationIndexingSummaryDiagnostic
}): Promise<{
  statusArtifact: ValidationStatusArtifact
  resultArtifact: ValidationResultArtifact
  chunksArtifact: ChunksArtifact
  documentIndexArtifacts: IndexedDocumentArtifact[]
  phaseTimings: Record<ValidationPhaseTimingDiagnostic['phase'], number>
  indexingSummary: ValidationIndexingSummaryDiagnostic
  fieldReports: DateValidationEvaluationFieldReport[]
}> {
  const modeSuffix = args.mode === 'all-doc' ? 'all-doc' : 'gated-first-pass'
  // Keep each mode on its own artifact key so cache reuse and stored outputs
  // stay comparable instead of one mode reusing the other's terminal result.
  const formId = `evaluation-${args.scenario.id}-${modeSuffix}`
  let indexingSummary = args.indexingSummary

  await validationHandler({
    formId,
    artifactVersion: args.artifactVersion,
    bucket: args.evaluationStorage.bucket,
    s3Config: args.evaluationStorage.s3Config,
    validationLlmConfig: args.evaluationLlmConfig,
    workSelectionMode:
      args.mode === 'all-doc' ? undefined : 'gated-first-pass',
    formFields: args.scenario.expectations.map((expectation) => ({
      field: expectation.field,
      label: FIELD_LABELS[expectation.field],
      value: expectation.formValue
    })),
    documents: args.sourceDocuments.map(({ document, sourceKey }) => ({
      documentName: document.documentName,
      sourceBucket: args.evaluationStorage.bucket,
      sourceKey
    })),
    diagnostics: {
      recordPhaseTiming: (phase, elapsedMs) => {
        args.phaseTimings[phase] += elapsedMs
      },
      recordIndexingSummary: (summary) => {
        indexingSummary = summary
      }
    }
  })

  const [statusArtifact, resultArtifact, chunksArtifact, documentIndexArtifacts] =
    await Promise.all([
      args.s3Client.getJson<ValidationStatusArtifact>(
        args.evaluationStorage.bucket,
        getValidationStatusKey(formId)
      ),
      args.s3Client.getJson<ValidationResultArtifact>(
        args.evaluationStorage.bucket,
        getValidationResultKey(formId)
      ),
      args.s3Client.getJson<ChunksArtifact>(
        args.evaluationStorage.bucket,
        getChunksArtifactKey(formId)
      ),
      Promise.all(
        args.sourceDocuments.map(({ document, sourceKey }) =>
          readOptionalArtifact<IndexedDocumentArtifact>(
            args.s3Client,
            args.evaluationStorage.bucket,
            getDocumentIndexArtifactKey(
              formId,
              computeDocumentCacheKey({
                documentName: document.documentName,
                sourceBucket: args.evaluationStorage.bucket,
                sourceKey
              })
            )
          )
        )
      )
    ])

  return {
    statusArtifact,
    resultArtifact,
    chunksArtifact,
    documentIndexArtifacts: documentIndexArtifacts.filter(
      (artifact): artifact is IndexedDocumentArtifact => artifact != null
    ),
    phaseTimings: resultArtifact.phaseTimingsMs ?? args.phaseTimings,
    indexingSummary,
    fieldReports: args.scenario.expectations.map((expectation) =>
      compareExpectation(
        expectation,
        resultArtifact.results,
        resultArtifact.llmDiagnostics ?? [],
        resultArtifact.retrievalDiagnostics ?? []
      )
    )
  }
}

async function readOptionalArtifact<T>(
  s3Client: ArtifactS3Client,
  bucket: string,
  key: string
): Promise<T | null> {
  try {
    return await s3Client.getJson<T>(bucket, key)
  } catch (error) {
    if (error instanceof Error && error.message.includes('S3 object not found')) {
      return null
    }

    throw error
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
  const firstPassDocumentNames = new Set(
    documentDiagnostics
      .filter((diagnostic) => diagnostic.workSelection?.bucket === 'first-pass')
      .map((diagnostic) => diagnostic.documentName)
  )
  const citedEvidenceDocumentNames = new Set(
    (args.resultArtifact?.results ?? []).flatMap((result) =>
      result.citations.map((citation) => citation.documentName)
    )
  )
  const relevantDocumentNames = new Set(
    args.documents
      .filter(
        (document) =>
          document.role === 'relevant-contract' &&
          document.disposition === 'eligible'
      )
      .map((document) => document.documentName)
  )
  const workSelectionEvaluation = evaluateWorkSelectionStrategy({
    documents: args.documents,
    documentDiagnostics,
    results: args.resultArtifact?.results ?? [],
    retrievalDiagnostics: args.resultArtifact?.retrievalDiagnostics ?? []
  })

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
    workSelection: {
      firstPassDocuments: documentDiagnostics.filter(
        (diagnostic) => diagnostic.workSelection?.bucket === 'first-pass'
      ).length,
      deferredDocuments: documentDiagnostics.filter(
        (diagnostic) => diagnostic.workSelection?.bucket === 'deferred'
      ).length,
      relevantDocuments: relevantDocumentNames.size,
      relevantDocumentsSelectedEarly: [...relevantDocumentNames].filter(
        (documentName) => firstPassDocumentNames.has(documentName)
      ).length,
      citedEvidenceDocuments: citedEvidenceDocumentNames.size,
      citedEvidenceDocumentsSelectedEarly: [...citedEvidenceDocumentNames].filter(
        (documentName) => firstPassDocumentNames.has(documentName)
      ).length,
      oddlyNamedRelevantDeferred:
        workSelectionEvaluation.oddlyNamedRelevantDeferred,
      oddlyNamedRelevantRecoveredByFallback:
        workSelectionEvaluation.oddlyNamedRelevantRecoveredByFallback,
      fieldAnalyses: workSelectionEvaluation.fieldAnalyses,
      recommendation: workSelectionEvaluation.recommendation
    },
    indexing: args.indexingSummary,
    phaseTimingsMs: args.resultArtifact?.phaseTimingsMs ?? args.phaseTimings,
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

export function evaluateWorkSelectionStrategy(args: {
  documents: DateValidationCorpusDocument[]
  documentDiagnostics: ValidationResultArtifact['documentDiagnostics']
  results: DateValidationResult[]
  retrievalDiagnostics: ValidationRetrievalDiagnostic[]
}): {
  oddlyNamedRelevantDeferred: number
  oddlyNamedRelevantRecoveredByFallback: number
  fieldAnalyses: DateValidationWorkSelectionFieldAnalysis[]
  recommendation: DateValidationWorkSelectionRecommendation
} {
  const documentDiagnostics = args.documentDiagnostics ?? []
  // AIFA-045 is evaluating whether a stricter metadata-only first pass would be
  // safe, so this intentionally narrows the broader AIFA-049A scoring bucket.
  const recommendedFirstPassDocumentNames = new Set(
    documentDiagnostics
      .filter((diagnostic) => isRecommendedFirstPassDocument(diagnostic))
      .map((diagnostic) => diagnostic.documentName)
  )
  const retrievalDiagnosticsByField = new Map(
    args.retrievalDiagnostics.map((diagnostic) => [diagnostic.field, diagnostic])
  )
  const deferredOddlyNamedRelevantDocuments = args.documents.filter(
    (document) =>
      document.role === 'relevant-contract' &&
      document.disposition === 'eligible' &&
      document.tags.includes('oddly-named') &&
      !recommendedFirstPassDocumentNames.has(document.documentName)
  )
  const fieldAnalyses = args.results.map((result) => {
    const retrievalDiagnostic = retrievalDiagnosticsByField.get(result.field)
    const fallbackTriggers = buildFallbackTriggers({
      result,
      retrievalDiagnostic,
      documentDiagnostics,
      recommendedFirstPassDocumentNames
    })

    return {
      field: result.field as DateValidationCorpusExpectation['field'],
      evidenceSource:
        fallbackTriggers.length === 0 &&
        result.citations.every((citation) =>
          recommendedFirstPassDocumentNames.has(citation.documentName)
        )
          ? 'first-pass'
          : 'fallback',
      fallbackTriggers
    } satisfies DateValidationWorkSelectionFieldAnalysis
  })
  const oddlyNamedRelevantRecoveredByFallback =
    deferredOddlyNamedRelevantDocuments.filter((document) =>
      fieldAnalyses.some(
        (analysis) =>
          analysis.evidenceSource === 'fallback' &&
          args.results
            .find((result) => result.field === analysis.field)
            ?.citations.some(
              (citation) => citation.documentName === document.documentName
            ) === true
      )
    ).length

  return {
    oddlyNamedRelevantDeferred: deferredOddlyNamedRelevantDocuments.length,
    oddlyNamedRelevantRecoveredByFallback,
    fieldAnalyses,
    recommendation: {
      recommendedMode: 'require-full-fallback',
      firstPassRules: [
        'Use metadata-only first pass only for documents with explicit amendment or date-governing filename/key cues.',
        'Keep generic contract naming alone insufficient for first-pass inclusion.'
      ],
      fallbackTriggers: [
        'not-enough-evidence',
        'ambiguity',
        'missing-citations',
        'partial-coverage',
        'ocr-gaps',
        'failed-documents',
        'weak-evidence',
        'conflicting-date-evidence'
      ],
      summary:
        'Do not suppress fallback. A gated first pass is only defensible when deferred documents remain eligible for full fallback whenever evidence is weak, ambiguous, uncited, partial, OCR-gapped, or contradicted by diagnostics.'
    }
  }
}

export function compareWorkSelectionOutcomes(args: {
  expectations: DateValidationCorpusExpectation[]
  allDocResults: DateValidationResult[]
  gatedResults: DateValidationResult[]
  gatedFieldDiagnostics: ValidationFieldWorkSelectionDiagnostic[]
  gatedPassed: boolean
}): DateValidationWorkSelectionComparison {
  const gatedFieldDiagnosticsByField = new Map(
    args.gatedFieldDiagnostics.map((diagnostic) => [diagnostic.field, diagnostic])
  )
  const fieldComparisons = args.expectations.map((expectation) => {
    const allDocResult =
      args.allDocResults.find((result) => result.field === expectation.field) ??
      null
    const gatedResult =
      args.gatedResults.find((result) => result.field === expectation.field) ??
      null
    const gatedFieldDiagnostic =
      gatedFieldDiagnosticsByField.get(expectation.field) ?? null

    return {
      field: expectation.field,
      allDocOutcome: allDocResult?.outcome ?? 'missing',
      gatedOutcome: gatedResult?.outcome ?? 'missing',
      gatedEvidenceSource: gatedFieldDiagnostic?.evidenceSource ?? 'missing',
      gatedFallbackTriggers: gatedFieldDiagnostic?.fallbackReasons ?? [],
      comparison: compareWorkSelectionFieldOutcome(
        allDocResult?.outcome ?? 'missing',
        gatedResult?.outcome ?? 'missing'
      )
    } satisfies DateValidationWorkSelectionFieldComparison
  })

  return {
    gatedPassed: args.gatedPassed,
    comparison: fieldComparisons.some(
      (comparison) => comparison.comparison === 'risk'
    )
      ? 'risk'
      : fieldComparisons.some(
            (comparison) => comparison.comparison === 'more-conservative'
          )
        ? 'more-conservative'
        : 'match',
    fallbackRequiredFieldCount: fieldComparisons.filter(
      (comparison) =>
        comparison.gatedEvidenceSource === 'fallback' ||
        comparison.gatedEvidenceSource === 'partial'
    ).length,
    fieldComparisons
  }
}

function compareWorkSelectionFieldOutcome(
  allDocOutcome: DateValidationResult['outcome'] | 'missing',
  gatedOutcome: DateValidationResult['outcome'] | 'missing'
): 'match' | 'more-conservative' | 'risk' {
  if (allDocOutcome === gatedOutcome) {
    return 'match'
  }

  if (
    (allDocOutcome === 'match' || allDocOutcome === 'mismatch') &&
    gatedOutcome === 'not-enough-evidence'
  ) {
    // Treat an earlier "not enough evidence" as conservative, but any other
    // divergence risks hiding controlling evidence compared with all-doc.
    return 'more-conservative'
  }

  return 'risk'
}

export function buildWorkSelectionPromotionDecision(
  reports: DateValidationEvaluationScenarioReport[]
): DateValidationWorkSelectionPromotionDecision {
  const workSelectionComparisons = reports.flatMap((report) =>
    report.workSelectionComparison ? [report.workSelectionComparison] : []
  )
  const hasProdShapedComparison = reports.some(
    (report) => report.largeSubmissionDiagnostics != null
  )
  const gatedPassedScenarios = workSelectionComparisons.filter(
    (comparison) => comparison.gatedPassed
  ).length
  const matchedScenarios = workSelectionComparisons.filter(
    (comparison) => comparison.comparison === 'match'
  ).length
  const moreConservativeScenarios = workSelectionComparisons.filter(
    (comparison) => comparison.comparison === 'more-conservative'
  ).length
  const riskyScenarios = workSelectionComparisons.filter(
    (comparison) => comparison.comparison === 'risk'
  ).length

  if (!hasProdShapedComparison) {
    return {
      recommendedDefaultMode: 'all-doc',
      gatedPassedScenarios,
      matchedScenarios,
      moreConservativeScenarios,
      riskyScenarios,
      reason:
        'Keep all-doc as the default until the prod-shaped large-submission fixture is included in the comparison run.'
    }
  }

  if (gatedPassedScenarios !== reports.length || riskyScenarios > 0) {
    return {
      recommendedDefaultMode: 'all-doc',
      gatedPassedScenarios,
      matchedScenarios,
      moreConservativeScenarios,
      riskyScenarios,
      reason:
        'Keep all-doc as the default. Gated work selection should not be promoted while any corpus scenario fails or any gated outcome is less conservative than all-doc.'
    }
  }

  return {
    recommendedDefaultMode: 'gated-first-pass',
    gatedPassedScenarios,
    matchedScenarios,
    moreConservativeScenarios,
    riskyScenarios,
    reason:
      'Promote gated-first-pass only with the existing all-doc escape hatch still available, because the compared scenarios match all-doc or become more conservative.'
  }
}

function buildFallbackTriggers(args: {
  result: DateValidationResult
  retrievalDiagnostic?: ValidationRetrievalDiagnostic
  documentDiagnostics: ValidationDocumentDiagnostic[]
  recommendedFirstPassDocumentNames: Set<string>
}): string[] {
  const triggers = new Set<string>()

  if (args.result.outcome === 'not-enough-evidence') {
    triggers.add('not-enough-evidence')
  }

  if (
    args.result.message.toLowerCase().includes('ambiguous') ||
    args.result.message.toLowerCase().includes('conflicting')
  ) {
    triggers.add('ambiguity')
  }

  if (args.result.citations.length === 0) {
    triggers.add('missing-citations')
  }

  if (
    args.documentDiagnostics.some(
      (diagnostic) => diagnostic.status !== 'processed' || !diagnostic.usable
    )
  ) {
    triggers.add('partial-coverage')
  }

  if (
    args.documentDiagnostics.some(
      (diagnostic) =>
        diagnostic.ocrDisposition === 'skipped' ||
        diagnostic.reason === 'ocr-capped-large-batch'
    )
  ) {
    triggers.add('ocr-gaps')
  }

  if (
    args.documentDiagnostics.some((diagnostic) => diagnostic.status === 'failed')
  ) {
    triggers.add('failed-documents')
  }

  if (args.result.confidence !== 'high') {
    triggers.add('weak-evidence')
  }

  if ((args.retrievalDiagnostic?.competingDateCount ?? 0) > 1) {
    triggers.add('conflicting-date-evidence')
  }

  if (
    args.result.citations.some(
      (citation) =>
        !args.recommendedFirstPassDocumentNames.has(citation.documentName)
    )
  ) {
    triggers.add('deferred-document-evidence')
  }

  return [...triggers]
}

function isRecommendedFirstPassDocument(
  diagnostic: ValidationDocumentDiagnostic
): boolean {
  return (
    diagnostic.workSelection?.bucket === 'first-pass' &&
    diagnostic.workSelection.priorityReasons.some(
      (reason) =>
        reason.includes('Amendment-style naming') ||
        reason.includes('start-date or effective-date') ||
        reason.includes('term or expiration')
    )
  )
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
