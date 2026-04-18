export interface DateValidationCorpusExpectation {
  field: 'contractStartDate' | 'contractEndDate'
  formValue: string
  expectedOutcome: 'match' | 'mismatch' | 'not-enough-evidence'
  expectedMessageIncludes?: string
  expectedMessageIncludesAll?: string[]
  expectedCitationOrders?: number[]
}

export interface DateValidationCorpusScenario {
  id: string
  documentName: string
  fixturePath: string
  summary: string
  tags: string[]
  expectations: DateValidationCorpusExpectation[]
  demo: {
    recommended: boolean
    walkthroughLabel?: string
  }
}

export const DATE_VALIDATION_CORPUS: DateValidationCorpusScenario[] = [
  {
    id: 'scan-match-baseline',
    documentName: 'scan-07-65712-a26-213a-final.pdf',
    fixturePath: 'fixtures/pdf/scan-07-65712-a26-213a-final.pdf',
    summary:
      'Baseline contract term match case using the SCAN amendment PDF.',
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
    id: 'scan-start-date-mismatch',
    documentName: 'scan-07-65712-a26-213a-final.pdf',
    fixturePath: 'fixtures/pdf/scan-07-65712-a26-213a-final.pdf',
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
    id: 'scan-end-date-mismatch',
    documentName: 'scan-07-65712-a26-213a-final.pdf',
    fixturePath: 'fixtures/pdf/scan-07-65712-a26-213a-final.pdf',
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
    id: 'scan-competing-date-mentions',
    documentName: 'scan-07-65712-a26-213a-final.pdf',
    fixturePath: 'fixtures/pdf/scan-07-65712-a26-213a-final.pdf',
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
    id: 'scha-snbc-start-match-end-competing',
    documentName: '2024_SCHA_SNBC_235544_Amend_1.pdf',
    fixturePath: 'fixtures/pdf/2024_SCHA_SNBC_235544_Amend_1.pdf',
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
    id: 'scha-seniors-start-mismatch-end-competing',
    documentName: '2024_SCHA_Seniors_235536_Amend_1.pdf',
    fixturePath: 'fixtures/pdf/2024_SCHA_Seniors_235536_Amend_1.pdf',
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
    id: 'ahf-start-date-mismatch-end-competing',
    documentName: 'AHF 11-88286 A21 text.final.pdf',
    fixturePath: 'fixtures/pdf/AHF 11-88286 A21 text.final.pdf',
    summary:
      'AHF term-clause fixture with a start-date mismatch plus competing end dates in the same clause.',
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
    id: 'ahf-term-clause-competing-end-dates',
    documentName: 'AHF 11-88286 A21 text.final.pdf',
    fixturePath: 'fixtures/pdf/AHF 11-88286 A21 text.final.pdf',
    summary:
      'Compact term-clause fixture with a clean start date and competing end dates in the same sentence.',
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
]

export const RECOMMENDED_DATE_VALIDATION_DEMO_SCENARIOS =
  DATE_VALIDATION_CORPUS.filter((scenario) => scenario.demo.recommended)
