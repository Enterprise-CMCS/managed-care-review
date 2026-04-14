export interface ValidationHandlerEvent {
  formId: string
  artifactVersion: string
}

export interface ValidationHandlerResult {
  formId: string
  artifactVersion: string
  status: 'completed'
}

export async function validationHandler(
  event: ValidationHandlerEvent
): Promise<ValidationHandlerResult> {
  // Keep the first Lambda handler thin. This ticket establishes the deployable
  // worker boundary before later tickets add artifact reads, status tracking,
  // and full validation orchestration.
  return {
    formId: event.formId,
    artifactVersion: event.artifactVersion,
    status: 'completed'
  }
}
