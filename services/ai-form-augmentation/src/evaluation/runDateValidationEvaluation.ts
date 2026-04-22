import { pathToFileURL } from 'node:url'
import {
  runDateValidationEvaluation,
  type DateValidationEvaluationSummary
} from './dateValidationEvaluation'

async function main(): Promise<void> {
  const summary = await runDateValidationEvaluation({
    includeLargeSubmission:
      process.env.AI_VALIDATION_INCLUDE_LARGE_SUBMISSION === 'true'
  })

  console.log(formatEvaluationSummary(summary))
}

export function formatEvaluationSummary(
  summary: DateValidationEvaluationSummary
): string {
  const lines = [
    'Date validation evaluation summary',
    `LLM provider: ${summary.llmProvider}`,
    `Scenarios: ${summary.passedScenarios}/${summary.totalScenarios} passed`,
    `Decision sources: deterministic=${summary.deterministicResults}, llm=${summary.llmResults}`,
    `Malformed LLM results: ${summary.malformedLlmResults}`,
    `Clause-evidence retrieval misses: ${summary.clauseEvidenceMisses}`
  ]

  for (const report of summary.reports) {
    lines.push('')
    lines.push(
      `${report.passed ? 'PASS' : 'FAIL'} ${report.scenarioId} (${report.documentName})`
    )
    if (report.error) {
      lines.push(`  error: ${report.error}`)
    }

    for (const fieldReport of report.fieldReports) {
      lines.push(
        `  - ${fieldReport.field}: expected=${fieldReport.expectedOutcome}, actual=${fieldReport.actualOutcome}, source=${fieldReport.decisionSource}${fieldReport.llmIssue ? `, llmIssue=${fieldReport.llmIssue}` : ''}`
      )
      if (fieldReport.retrievalIssue) {
        lines.push(
          `    retrieval: issue=${fieldReport.retrievalIssue}, clauseEvidencePresent=${fieldReport.retrievalClauseEvidencePresent}, clauseEvidenceAdded=${fieldReport.retrievalClauseEvidenceAdded}`
        )
      }

      if (fieldReport.problems.length > 0) {
        for (const problem of fieldReport.problems) {
          lines.push(`    problem: ${problem}`)
        }
      }
    }

    if (report.largeSubmissionDiagnostics) {
      const diagnostics = report.largeSubmissionDiagnostics
      lines.push(
        `  large submission: total=${diagnostics.totalDocuments}, eligible=${diagnostics.eligibleDocuments}, skipped=${diagnostics.skippedDocuments}, failed=${diagnostics.failedDocuments}, processed=${diagnostics.processedDocuments}, chunks=${diagnostics.chunkCount}`
      )
      lines.push(
        `  outcomes: match=${diagnostics.finalOutcomes.match}, mismatch=${diagnostics.finalOutcomes.mismatch}, notEnoughEvidence=${diagnostics.finalOutcomes.notEnoughEvidence}`
      )
      lines.push(
        `  indexing: concurrency=${diagnostics.indexing.concurrencyLimit}, elapsedMs=${diagnostics.indexing.totalElapsedMs}, processed=${diagnostics.indexing.processedDocuments}, failed=${diagnostics.indexing.failedDocuments}`
      )
      lines.push(
        `  phase timings ms: fetch=${diagnostics.phaseTimingsMs.fetch}, parse=${diagnostics.phaseTimingsMs.parse}, ocr=${diagnostics.phaseTimingsMs.ocr}, chunk=${diagnostics.phaseTimingsMs.chunk}, embed=${diagnostics.phaseTimingsMs.embed}, retrieval=${diagnostics.phaseTimingsMs.retrieval}, validation=${diagnostics.phaseTimingsMs.validation}`
      )
      lines.push(
        `  artifact sizes bytes: parsedText=${diagnostics.artifactSizesBytes.parsedText ?? 'not-available'}, chunks=${diagnostics.artifactSizesBytes.chunks}, vectors=${diagnostics.artifactSizesBytes.vectors}, status=${diagnostics.artifactSizesBytes.status}, results=${diagnostics.artifactSizesBytes.results}`
      )
    }
  }

  return lines.join('\n')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  void main().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : 'Unknown date validation evaluation error'
    )
    process.exit(1)
  })
}
