import {
  ensureEvaluationStorageReady,
  getEvaluationStorageConfig
} from './evaluationStorage'

async function main(): Promise<void> {
  const config = getEvaluationStorageConfig()
  await ensureEvaluationStorageReady(config)

  console.log(
    `Evaluation storage ready: ${config.bucket} at ${config.s3Config.endpoint ?? '(default AWS endpoint)'}`
  )
}

void main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'Unknown evaluation storage bootstrap error'
  )
  process.exit(1)
})
