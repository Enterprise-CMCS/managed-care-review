import { validationHandler, type ValidationHandlerEvent } from './handlers'

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf8')
}

async function main(): Promise<void> {
  // app-api passes the worker payload over stdin so local execution can stay
  // fire-and-forget without coupling app-api to the AI worker's runtime deps.
  const rawPayload = await readStdin()

  if (!rawPayload.trim()) {
    throw new Error('Validation runner received an empty payload')
  }

  const payload = JSON.parse(rawPayload) as ValidationHandlerEvent
  await validationHandler(payload)
}

void main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Unknown validation runner error'
  )
  process.exit(1)
})
