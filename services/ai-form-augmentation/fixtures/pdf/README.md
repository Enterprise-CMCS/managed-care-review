# Date Validation Corpus Fixtures

This folder currently contains the checked-in PDFs used by the `AIFA-022` corpus.

The corpus now uses a broader local fixture set instead of leaning on one favorite PDF. That gives the next evaluation harness a more credible baseline while still keeping the implementation small and local-first.

## Current fixtures

- `scan-07-65712-a26-213a-final.pdf`
  - primary contract-term fixture
  - supports match and mismatch walkthroughs for `contractStartDate` and `contractEndDate`
  - also includes competing date mentions, which makes it useful for ambiguity checks

- `2024_SCHA_SNBC_235544_Amend_1.pdf`
  - amendment fixture with a clear `Contract Start Date`
  - also includes multiple expiration-style labels, which makes it useful for competing-date coverage

- `2024_SCHA_Seniors_235536_Amend_1.pdf`
  - second amendment fixture with the same structural pattern on a different document
  - useful for checking that the corpus is not tuned to only one amendment PDF

- `AHF 11-88286 A21 text.final.pdf`
  - compact text-layer fixture with a direct term clause
  - useful for competing end-date coverage because the term sentence carries two end dates together

- `AHF 11-88286 A21 213a.final.pdf`
  - weak text-extraction candidate copied in for future OCR-focused evaluation
  - not currently part of the documented corpus expectations because the extracted text needs a dedicated harness run first

- `medicaid-managed-care-contract-and-rate-submission-cover-sheet.pdf`
  - administrative cover-sheet fixture
  - useful for `not-enough-evidence` scenarios because it does not provide trustworthy contract term evidence for the scoped fields

## Source of truth

The reusable scenario definitions, expected outcomes, and recommended demo path live in:

- `services/ai-form-augmentation/src/evaluation/dateValidationCorpus.ts`

Each scenario records:

- expected form values
- expected outcomes for `contractStartDate` and `contractEndDate`
- expected message fragments when evidence should be surfaced
- expected citation orders when evidence should be cited
