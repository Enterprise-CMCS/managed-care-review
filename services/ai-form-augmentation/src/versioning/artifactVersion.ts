import { createHash } from 'node:crypto'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function computeArtifactVersion(documentKeys: string[]): string {
  // Sort first so the version reflects the document set itself rather than the
  // order those keys happened to be collected in.
  const normalizedKeys = [...documentKeys].sort()
  return sha256(normalizedKeys.join('|'))
}

export interface FormSnapshotField {
  field: string
  value: string
}

export function computeFormSnapshotHash(
  fields: FormSnapshotField[]
): string {
  // Hash only normalized field/value pairs so irrelevant object shape or field
  // ordering differences do not cause unnecessary cache misses.
  const normalizedFields = [...fields]
    .sort((left, right) => left.field.localeCompare(right.field))
    .map((field) => ({
      field: field.field,
      value: field.value
    }))

  return sha256(JSON.stringify(normalizedFields))
}
