import { submission } from '../../gen/submissionProto'

const toSerializable = (domainData: any) => {
    const err = submission.StateSubmissionInfo.verify(domainData)
    if (err) throw Error(`Not valid: ${err}`)
    return JSON.stringify(submission.StateSubmissionInfo.fromObject(domainData))
}
export { toSerializable }
