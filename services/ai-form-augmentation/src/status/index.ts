export type {
  ValidationStatusArtifact
} from './statusArtifact'
export type { ValidationLifecycleTimingArtifact } from '../artifacts/validationArtifactContract'

export {
  buildCompletedValidationStatusArtifact,
  buildFailedValidationStatusArtifact,
  buildValidationStatusArtifact,
  getValidationStatusKey
} from './statusArtifact'
