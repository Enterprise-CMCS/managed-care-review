import { Buffer } from 'buffer';
import { toDomain, toProtoBuffer } from '.';
function domainToBase64(submission) {
    const proto = toProtoBuffer(submission);
    return protoToBase64(proto);
}
function protoToBase64(input) {
    return Buffer.from(input).toString('base64');
}
function base64ToDomain(input) {
    const protoBinData = Buffer.from(input, 'base64');
    return toDomain(protoBinData);
}
export { domainToBase64, protoToBase64, base64ToDomain };
//# sourceMappingURL=protoBase64.js.map