export interface DocumentChunk {
  chunkId: string
  documentName: string
  order: number
  page: number | null
  text: string
  startChar: number
  endChar: number
}

export interface ChunkDocumentOptions {
  chunkSize?: number
  chunkOverlap?: number
}

const DEFAULT_CHUNK_SIZE = 1000
const DEFAULT_CHUNK_OVERLAP = 200

export function chunkDocument(
  documentName: string,
  rawText: string,
  options: ChunkDocumentOptions = {}
): DocumentChunk[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP

  if (chunkSize <= 0) {
    throw new Error('chunkSize must be greater than 0')
  }

  if (chunkOverlap < 0) {
    throw new Error('chunkOverlap cannot be negative')
  }

  if (chunkOverlap >= chunkSize) {
    throw new Error('chunkOverlap must be smaller than chunkSize')
  }

  const normalizedText = rawText.trim()

  if (!normalizedText) {
    return []
  }

  const chunks: DocumentChunk[] = []
  // Advance by less than chunkSize so adjacent chunks share context.
  const step = chunkSize - chunkOverlap

  let startChar = 0
  let order = 0

  while (startChar < normalizedText.length) {
    const endChar = Math.min(startChar + chunkSize, normalizedText.length)
    const text = normalizedText.slice(startChar, endChar).trim()

    if (text) {
      chunks.push({
        chunkId: `${documentName}::chunk-${order}`,
        documentName,
        order,
        // Page-level mapping can be added later when the parser returns it.
        page: null,
        text,
        startChar,
        endChar
      })

      order += 1
    }

    if (endChar >= normalizedText.length) {
      break
    }

    startChar += step
  }

  return chunks
}
