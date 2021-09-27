import { submission } from '../../gen/submissionProto'
const toDomain = (str: any) => submission.StateSubmissionInfo.toObject(str)

export { toDomain }
