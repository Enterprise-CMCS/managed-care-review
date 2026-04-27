const MONTH_PATTERN =
  '(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
const DATE_PATTERN = `${MONTH_PATTERN}\\s+\\d{1,2},?\\s*\\d{4}|\\d{1,2}/\\d{1,2}/\\d{4}|\\d{4}-\\d{2}-\\d{2}`
const AMENDMENT_EFFECTIVE_DATE_PATTERN = new RegExp(
  `amendment effective date\\s*:?\\s*(${DATE_PATTERN})`,
  'gi'
)
const TERM_GOVERNING_CONTEXT_PATTERN =
  /\b(?:term|contract term|agreement term|contract period|through end date|end date|expiration date|paragraph\s+\d+(?:\s*\(term\))?)\b/i
const OPERATIVE_ACTION_CONTEXT_PATTERN =
  /\b(?:amended to read|deemed to read|shall be amended|is amended|extends?|extended|renewed|supersed(?:e|es|ed|ing)|replace(?:s|d)?|continue in full force and effect through)\b/i
const TERM_RANGE_CONTEXT_PATTERN = new RegExp(
  `(${DATE_PATTERN})[\\s\\S]{0,80}?(?:through|to|-)\\s*(${DATE_PATTERN})`,
  'i'
)
const CONTEXT_WINDOW_BEFORE = 120
const CONTEXT_WINDOW_AFTER = 260

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function extractOperativeAmendmentEffectiveDates(text: string): string[] {
  const candidateDates = new Set<string>()

  for (const match of text.matchAll(AMENDMENT_EFFECTIVE_DATE_PATTERN)) {
    const matchedDate = match[1]

    if (!matchedDate || match.index == null) {
      continue
    }

    const contextWindow = text.slice(
      Math.max(0, match.index - CONTEXT_WINDOW_BEFORE),
      match.index + match[0].length + CONTEXT_WINDOW_AFTER
    )

    const hasTermGoverningCue =
      TERM_GOVERNING_CONTEXT_PATTERN.test(contextWindow) ||
      TERM_RANGE_CONTEXT_PATTERN.test(contextWindow)
    const hasOperativeActionCue = OPERATIVE_ACTION_CONTEXT_PATTERN.test(
      contextWindow
    )

    if (!hasTermGoverningCue || !hasOperativeActionCue) {
      continue
    }

    candidateDates.add(normalizeWhitespace(matchedDate))
  }

  return [...candidateDates]
}
