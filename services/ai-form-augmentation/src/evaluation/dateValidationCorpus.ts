export interface DateValidationCorpusExpectation {
  field: 'contractStartDate' | 'contractEndDate'
  formValue: string
  expectedOutcome: 'match' | 'mismatch' | 'not-enough-evidence'
  expectedMessageIncludes?: string
  expectedMessageIncludesAll?: string[]
  expectedCitationOrders?: number[]
}

export type DateValidationCorpusDocumentDisposition =
  | 'eligible'
  | 'skipped'
  | 'failed'

export interface DateValidationCorpusDocument {
  documentName: string
  fixturePath?: string
  contentType: string
  disposition: DateValidationCorpusDocumentDisposition
  role:
    | 'relevant-contract'
    | 'irrelevant-contract'
    | 'irrelevant-rate'
    | 'unsupported-rate'
    | 'corrupt'
  tags: string[]
}

export interface DateValidationCorpusScenario {
  id: string
  documentName: string
  fixturePath: string
  summary: string
  tags: string[]
  documents?: DateValidationCorpusDocument[]
  runByDefault?: boolean
  expectations: DateValidationCorpusExpectation[]
  demo: {
    recommended: boolean
    walkthroughLabel?: string
  }
}

export const DATE_VALIDATION_CORPUS: DateValidationCorpusScenario[] = [
  {
    id: 'baseline-contract-term-match',
    documentName: 'synthetic-amendment-baseline.pdf',
    fixturePath: 'fixtures/pdf/synthetic-amendment-baseline.pdf',
    summary: 'Baseline contract term match case using a synthetic amendment PDF.',
    tags: ['match', 'demo'],
    expectations: [
      {
        field: 'contractStartDate',
        formValue: '01/01/2008',
        expectedOutcome: 'match',
        expectedMessageIncludes: '01/01/2008',
        expectedCitationOrders: [0]
      },
      {
        field: 'contractEndDate',
        formValue: '12/31/2021',
        expectedOutcome: 'match',
        expectedMessageIncludes: '12/31/2021',
        expectedCitationOrders: [0]
      }
    ],
    demo: {
      recommended: true,
      walkthroughLabel: 'Match walkthrough'
    }
  },
  {
    id: 'baseline-start-date-mismatch',
    documentName: 'synthetic-amendment-baseline.pdf',
    fixturePath: 'fixtures/pdf/synthetic-amendment-baseline.pdf',
    summary:
      'Mismatch case where the form start date differs from the contract start date in the document.',
    tags: ['mismatch', 'demo'],
    expectations: [
      {
        field: 'contractStartDate',
        formValue: '04/01/2026',
        expectedOutcome: 'mismatch',
        expectedMessageIncludes: '01/01/2008',
        expectedCitationOrders: [0]
      },
      {
        field: 'contractEndDate',
        formValue: '12/31/2021',
        expectedOutcome: 'match',
        expectedMessageIncludes: '12/31/2021',
        expectedCitationOrders: [0]
      }
    ],
    demo: {
      recommended: true,
      walkthroughLabel: 'Start-date mismatch walkthrough'
    }
  },
  {
    id: 'baseline-end-date-mismatch',
    documentName: 'synthetic-amendment-baseline.pdf',
    fixturePath: 'fixtures/pdf/synthetic-amendment-baseline.pdf',
    summary:
      'Mismatch case where the form end date differs from the contract end date in the document.',
    tags: ['mismatch'],
    expectations: [
      {
        field: 'contractStartDate',
        formValue: '01/01/2008',
        expectedOutcome: 'match',
        expectedMessageIncludes: '01/01/2008',
        expectedCitationOrders: [0]
      },
      {
        field: 'contractEndDate',
        formValue: '04/04/2026',
        expectedOutcome: 'mismatch',
        expectedMessageIncludes: '12/31/2021',
        expectedCitationOrders: [0]
      }
    ],
    demo: {
      recommended: false
    }
  },
  {
    id: 'baseline-competing-date-mentions',
    documentName: 'synthetic-amendment-baseline.pdf',
    fixturePath: 'fixtures/pdf/synthetic-amendment-baseline.pdf',
    summary:
      'Competing-date case where contract term dates and amendment effective date appear in the same source document.',
    tags: ['ambiguous', 'competing-dates'],
    expectations: [
      {
        field: 'contractStartDate',
        formValue: '01/01/2008',
        expectedOutcome: 'match',
        expectedMessageIncludes: '01/01/2008',
        expectedCitationOrders: [0]
      },
      {
        field: 'contractEndDate',
        formValue: '12/31/2021',
        expectedOutcome: 'match',
        expectedMessageIncludes: '12/31/2021',
        expectedCitationOrders: [0]
      }
    ],
    demo: {
      recommended: false
    }
  },
  {
    id: 'amendment-start-match-end-competing',
    documentName: 'synthetic-amendment-expiration-match.pdf',
    fixturePath: 'fixtures/pdf/synthetic-amendment-expiration-match.pdf',
    summary:
      'Amendment document with a clean contract start date and competing contract expiration labels.',
    tags: ['match', 'competing-dates'],
    expectations: [
      {
        field: 'contractStartDate',
        formValue: '01/01/2024',
        expectedOutcome: 'match',
        expectedMessageIncludes: '01/01/2024'
      },
      {
        field: 'contractEndDate',
        formValue: '12/31/2025',
        expectedOutcome: 'match',
        expectedMessageIncludes: '12/31/2025'
      }
    ],
    demo: {
      recommended: false
    }
  },
  {
    id: 'amendment-start-mismatch-end-competing',
    documentName: 'synthetic-amendment-expiration-mismatch.pdf',
    fixturePath: 'fixtures/pdf/synthetic-amendment-expiration-mismatch.pdf',
    summary:
      'Amendment document with a clear contract start date plus competing expiration labels for the end-date field.',
    tags: ['mismatch', 'competing-dates'],
    expectations: [
      {
        field: 'contractStartDate',
        formValue: '02/01/2024',
        expectedOutcome: 'mismatch',
        expectedMessageIncludes: '01/01/2024'
      },
      {
        field: 'contractEndDate',
        formValue: '12/31/2025',
        expectedOutcome: 'match',
        expectedMessageIncludes: '12/31/2025'
      }
    ],
    demo: {
      recommended: false
    }
  },
  {
    id: 'term-clause-start-mismatch-end-competing',
    documentName: 'synthetic-term-clause-competing-end-dates.pdf',
    fixturePath: 'fixtures/pdf/synthetic-term-clause-competing-end-dates.pdf',
    summary:
      'Synthetic term-clause fixture with a start-date mismatch plus competing end dates in the same clause.',
    tags: ['mismatch', 'competing-dates'],
    expectations: [
      {
        field: 'contractStartDate',
        formValue: '04/01/2014',
        expectedOutcome: 'mismatch',
        expectedMessageIncludesAll: ['01/01/2012', '04/01/2014']
      },
      {
        field: 'contractEndDate',
        formValue: '12/31/2023',
        expectedOutcome: 'not-enough-evidence',
        expectedMessageIncludesAll: ['12/31/2022', '12/31/2023']
      }
    ],
    demo: {
      recommended: false
    }
  },
  {
    id: 'term-clause-competing-end-dates',
    documentName: 'synthetic-term-clause-competing-end-dates.pdf',
    fixturePath: 'fixtures/pdf/synthetic-term-clause-competing-end-dates.pdf',
    summary:
      'Compact synthetic term-clause fixture with a clean start date and competing end dates in the same sentence.',
    tags: ['match', 'competing-dates'],
    expectations: [
      {
        field: 'contractStartDate',
        formValue: '01/01/2012',
        expectedOutcome: 'match',
        expectedMessageIncludes: '01/01/2012'
      },
      {
        field: 'contractEndDate',
        formValue: '12/31/2023',
        expectedOutcome: 'not-enough-evidence',
        expectedMessageIncludesAll: ['12/31/2022', '12/31/2023']
      }
    ],
    demo: {
      recommended: false
    }
  },
  {
    id: 'prod-shaped-large-submission',
    documentName: 'zz_buried_oddly_named_contract_evidence.pdf',
    fixturePath: 'fixtures/pdf/synthetic-amendment-baseline.pdf',
    summary:
      'Synthetic 165-document large-submission fixture shaped from a real production archive listing without committing production documents.',
    tags: ['large-submission', 'prod-shaped', 'evaluation-only'],
    documents: buildProdShapedLargeSubmissionDocuments(),
    // Keep the expensive high-document-count scenario opt-in so the normal
    // corpus remains useful for tight local validation loops.
    runByDefault: false,
    expectations: [
      {
        field: 'contractStartDate',
        formValue: '01/01/2008',
        expectedOutcome: 'match',
        expectedMessageIncludes: '01/01/2008'
      },
      {
        field: 'contractEndDate',
        formValue: '12/31/2021',
        expectedOutcome: 'match',
        expectedMessageIncludes: '12/31/2021'
      }
    ],
    demo: {
      recommended: false
    }
  }
]

export const DEFAULT_DATE_VALIDATION_EVALUATION_SCENARIOS =
  DATE_VALIDATION_CORPUS.filter((scenario) => scenario.runByDefault !== false)

export const LARGE_SUBMISSION_DATE_VALIDATION_SCENARIOS =
  DATE_VALIDATION_CORPUS.filter((scenario) =>
    scenario.tags.includes('large-submission')
  )

export const RECOMMENDED_DATE_VALIDATION_DEMO_SCENARIOS =
  DATE_VALIDATION_CORPUS.filter((scenario) => scenario.demo.recommended)

function buildProdShapedLargeSubmissionDocuments(): DateValidationCorpusDocument[] {
  return [
    ...buildRepeatedDocuments({
      count: 65,
      prefix: 'contract-text',
      fixturePath:
        'fixtures/pdf/synthetic-administrative-cover-sheet.pdf',
      role: 'irrelevant-contract',
      tags: ['eligible-pdf', 'contract-text']
    }),
    {
      documentName: 'zz_buried_oddly_named_contract_evidence.pdf',
      fixturePath: 'fixtures/pdf/synthetic-amendment-baseline.pdf',
      contentType: 'application/pdf',
      disposition: 'eligible',
      role: 'relevant-contract',
      tags: [
        'eligible-pdf',
        'relevant-evidence',
        'oddly-named',
        'scanned-or-weak-text'
      ]
    },
    ...buildRepeatedDocuments({
      count: 66,
      prefix: 'rate-text',
      fixturePath:
        'fixtures/pdf/synthetic-administrative-cover-sheet.pdf',
      role: 'irrelevant-rate',
      tags: ['eligible-pdf', 'rate-text']
    }),
    ...buildRepeatedDocuments({
      count: 32,
      prefix: 'rate-docx',
      extension: 'docx',
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      disposition: 'skipped',
      role: 'unsupported-rate',
      tags: ['unsupported-non-pdf', 'simulated-metadata']
    }),
    {
      documentName: 'simulated-corrupt-contract.pdf',
      contentType: 'application/pdf',
      disposition: 'failed',
      role: 'corrupt',
      tags: ['corrupt', 'simulated-metadata']
    }
  ]
}

function buildRepeatedDocuments(args: {
  count: number
  prefix: string
  fixturePath?: string
  extension?: string
  contentType?: string
  disposition?: DateValidationCorpusDocumentDisposition
  role: DateValidationCorpusDocument['role']
  tags: string[]
}): DateValidationCorpusDocument[] {
  return Array.from({ length: args.count }, (_, index) => ({
    documentName: `${args.prefix}-${String(index + 1).padStart(3, '0')}.${args.extension ?? 'pdf'}`,
    ...(args.fixturePath ? { fixturePath: args.fixturePath } : {}),
    contentType: args.contentType ?? 'application/pdf',
    disposition: args.disposition ?? 'eligible',
    role: args.role,
    tags: args.tags
  }))
}
