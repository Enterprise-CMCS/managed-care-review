import { newArtifactS3Client } from '../s3'
import type { ArtifactS3ClientConfig } from '../s3'
import {
  buildCompletedValidationStatusArtifact,
  buildFailedValidationStatusArtifact,
  buildValidationStatusArtifact,
  getValidationStatusKey
} from '../status'

export interface ValidationHandlerEvent {
  formId: string
  artifactVersion: string
  bucket: string
  s3Config: ArtifactS3ClientConfig
}

export interface ValidationHandlerResult {
  formId: string
  artifactVersion: string
  status: 'completed'
}

export async function validationHandler(
  event: ValidationHandlerEvent
): Promise<ValidationHandlerResult> {
  const s3Client = newArtifactS3Client(event.s3Config)

  const key = getValidationStatusKey(event.formId)

  try {
    // Status writes are the first building block for later resolver/UI polling.
    // For now the handler moves quickly from "validating" to "complete" because
    // the real long-running work will be added in later tickets.
    await s3Client.putJson(
      event.bucket,
      key,
      buildValidationStatusArtifact('validating', event.artifactVersion)
    )

    await s3Client.putJson(
      event.bucket,
      key,
      buildCompletedValidationStatusArtifact(event.artifactVersion)
    )

    return {
      formId: event.formId,
      artifactVersion: event.artifactVersion,
      status: 'completed'
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    await s3Client.putJson(
      event.bucket,
      key,
      buildFailedValidationStatusArtifact(event.artifactVersion, message)
    )

    throw error
  }
}
