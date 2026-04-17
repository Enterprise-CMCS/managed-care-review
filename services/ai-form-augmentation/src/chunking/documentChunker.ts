export interface DocumentChunk {
  chunkId: string
  documentName: string
  order: number
  page: number | null
  startPage: number | null
  endPage: number | null
  text: string
  startChar: number
  endChar: number
}

export interface ChunkDocumentOptions {
  chunkSize?: number
  chunkOverlap?: number
  pageTexts?: string[]
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
  const pageTexts = options.pageTexts ?? []

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
  const pageCharRanges = buildPageCharRanges(pageTexts)
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
        page: getChunkPage(startChar, pageCharRanges),
        startPage: getChunkPage(startChar, pageCharRanges),
        endPage: getChunkPage(endChar - 1, pageCharRanges),
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

function buildPageCharRanges(pageTexts: string[]): Array<{
  page: number
  startChar: number
  endChar: number
}> {
  if (pageTexts.length === 0) {
    return []
  }

  let startChar = 0

  return pageTexts.flatMap((pageText, index) => {
    const normalizedPageText = pageText.trim()

    if (!normalizedPageText) {
      return []
    }

    const endChar = startChar + normalizedPageText.length
    const range = {
      page: index + 1,
      startChar,
      endChar
    }

    startChar = endChar + 2

    return [range]
  })
}

function getChunkPage(
  startChar: number,
  pageCharRanges: Array<{ page: number; startChar: number; endChar: number }>
): number | null {
  const matchingPage = pageCharRanges.find(
    (pageRange) =>
      startChar >= pageRange.startChar && startChar < pageRange.endChar
  )

  return matchingPage?.page ?? null
}
