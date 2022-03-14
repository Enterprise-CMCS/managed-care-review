import { toDomain, toProtoBuffer } from ".";
import { SubmissionUnionType } from "../../domain-models";

function domainToBase64(submission: SubmissionUnionType): string {
    const proto = toProtoBuffer(submission)
    return protoToBase64(proto)
}

function protoToBase64(input: Uint8Array): string {
    return Buffer.from(input).toString('base64')
}

function base64ToDomain(input: string): SubmissionUnionType | Error {
    const protoBinData = Buffer.from(input, 'base64')
    return toDomain(protoBinData)
}

export {
    domainToBase64,
    protoToBase64,
    base64ToDomain,
}
