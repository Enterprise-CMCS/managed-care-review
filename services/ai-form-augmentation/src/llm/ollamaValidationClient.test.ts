import assert from 'node:assert/strict'
import test from 'node:test'
import { OllamaValidationClient } from './ollamaValidationClient'

test('OllamaValidationClient bounds local context and keeps the model warm', async () => {
  const originalFetch = globalThis.fetch
  let requestBody: unknown

  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(String(init?.body))

    return Response.json({
      response: '[]',
      done: true
    })
  }

  try {
    const client = new OllamaValidationClient()

    await client.generateValidation({ prompt: 'test-prompt' })

    assert.deepEqual(requestBody, {
      model: 'llama3.1:8b',
      prompt: 'test-prompt',
      stream: false,
      keep_alive: '30m',
      options: {
        num_ctx: 4096
      }
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('OllamaValidationClient truncates raw error bodies in thrown errors', async () => {
  const originalFetch = globalThis.fetch
  const longBody = `${'x'.repeat(220)} secret prompt text`

  globalThis.fetch = async () =>
    new Response(longBody, {
      status: 500,
      statusText: 'Internal Server Error'
    })

  try {
    const client = new OllamaValidationClient()

    await assert.rejects(
      () => client.generateValidation({ prompt: 'test-prompt' }),
      (error: unknown) => {
        assert.equal(error instanceof Error, true)
        assert.match(
          (error as Error).message,
          /Ollama request failed \(500 Internal Server Error\):/
        )
        assert.doesNotMatch((error as Error).message, /secret prompt text/)
        assert.match((error as Error).message, /\[truncated \d+ chars\]/)
        return true
      }
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
