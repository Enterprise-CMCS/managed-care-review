import {
  runDateValidationEvaluation,
  type DateValidationEvaluationSummary
} from './dateValidationEvaluation'

async function main(): Promise<void> {
  const summary = await runDateValidationEvaluation()

  console.log(formatEvaluationSummary(summary))
}

function formatEvaluationSummary(
  summary: DateValidationEvaluationSummary
): string {
  const lines = [
    'Date validation evaluation summary',
    `Scenarios: ${summary.passedScenarios}/${summary.totalScenarios} passed`,
    `Decision sources: deterministic=${summary.deterministicResults}, llm=${summary.llmResults}`,
    `Malformed LLM results: ${summary.malformedLlmResults}`
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

      if (fieldReport.problems.length > 0) {
        for (const problem of fieldReport.problems) {
          lines.push(`    problem: ${problem}`)
        }
      }
    }
  }

  return lines.join('\n')
}

void main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'Unknown date validation evaluation error'
  )
  process.exit(1)
})
