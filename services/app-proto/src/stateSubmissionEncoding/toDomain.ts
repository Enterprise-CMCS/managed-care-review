import { statesubmission } from '../../gen/stateSubmissionProto'
import { DraftSubmissionType } from '../../../app-web/src/common-code/domain-models'

// Add adaptors for every enum
// Add adaptors for dates

const toDomain = (buff: Uint8Array): DraftSubmissionType => {
    const stateSubmissionMessage =
        statesubmission.StateSubmissionInfo.decode(buff)
    console.log(
        statesubmission.StateSubmissionInfo.toObject(stateSubmissionMessage, {
            enums: String,
        })
    )
    const modified = {
        ...stateSubmissionMessage,
        submissionType: 'CONTACT_ONLY',
    }
    return modified as any
}

export { toDomain }
