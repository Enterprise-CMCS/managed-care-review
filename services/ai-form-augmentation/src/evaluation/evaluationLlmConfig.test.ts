import assert from 'node:assert/strict'
import test from 'node:test'
import {
  describeEvaluationLlmConfig,
  getEvaluationLlmConfig
} from './evaluationLlmConfig'

function withEnv(
  values: Record<string, string | undefined>,
  run: () => void
): void {
  const previous = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key])

    if (value == null) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    run()
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value == null) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

test('getEvaluationLlmConfig defaults to the local ollama path', () => {
  withEnv(
    {
      AI_VALIDATION_LLM_PROVIDER: undefined,
      AI_VALIDATION_BEDROCK_MODEL_ID: undefined,
      AI_VALIDATION_BEDROCK_REGION: undefined
    },
    () => {
      assert.equal(getEvaluationLlmConfig(), undefined)
      assert.equal(describeEvaluationLlmConfig(undefined), 'ollama')
    }
  )
})

test('getEvaluationLlmConfig builds a bedrock config from environment', () => {
  withEnv(
    {
      AI_VALIDATION_LLM_PROVIDER: 'bedrock',
      AI_VALIDATION_BEDROCK_MODEL_ID: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      AI_VALIDATION_BEDROCK_REGION: 'us-west-2'
    },
    () => {
      const config = getEvaluationLlmConfig()

      assert.deepEqual(config, {
        provider: 'bedrock',
        modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        region: 'us-west-2'
      })
      assert.equal(
        describeEvaluationLlmConfig(config),
        'bedrock:anthropic.claude-3-5-sonnet-20241022-v2:0@us-west-2'
      )
    }
  )
})

test('getEvaluationLlmConfig requires a model id for bedrock', () => {
  withEnv(
    {
      AI_VALIDATION_LLM_PROVIDER: 'bedrock',
      AI_VALIDATION_BEDROCK_MODEL_ID: undefined
    },
    () => {
      assert.throws(
        () => getEvaluationLlmConfig(),
        /AI_VALIDATION_BEDROCK_MODEL_ID is required/
      )
    }
  )
})
