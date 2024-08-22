const CURRENT_PROTO_VERSION = 4;
const updateToVersion3 = (oldProto) => {
    // We can assume the proto version exists because error would have been thrown in toDomain
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (oldProto.protoVersion < 3) {
        const updatedProto = Object.assign({}, oldProto);
        // Use actuary contacts fields from the second actuary contact onward to fill in data for new field addtlActuaryContacts
        // The first actuary is the certifying actuary contact and will be displayed on the Rate Details.
        updatedProto.addtlActuaryContacts = oldProto.rateInfos[0]
            ?.actuaryContacts?.length
            ? oldProto.rateInfos[0]?.actuaryContacts?.slice(1)
            : [];
        updatedProto.addtlActuaryCommunicationPreference =
            oldProto.rateInfos[0]?.actuaryCommunicationPreference;
        // Bump version
        updatedProto.protoVersion = 3;
        return updatedProto;
    }
    else {
        return oldProto;
    }
};
const toLatestProtoVersion = (proto) => {
    const { protoVersion, protoName } = proto;
    // First things first, let's check the protoName and protoVersion
    if (protoName !== 'STATE_SUBMISSION') {
        console.warn(`WARNING: We are unboxing a proto our code doesn't recognize:`, protoName, protoVersion);
    }
    if (protoVersion === CURRENT_PROTO_VERSION) {
        // if we know we are in the latest proto, exit function and return initial proto
        return proto;
    }
    else {
        // if the proto is an outdated version convert it to the latest
        // console.info(
        //     `Trying to open outdated proto. State: ${proto.stateCode}, Package ID: ${proto.id}, Outdated proto version: ${protoVersion}`
        // )
        const v3Compatible = updateToVersion3(proto);
        // future incompatible version update functions can go here ...
        const latestProto = v3Compatible;
        return latestProto;
    }
};
export { toLatestProtoVersion, CURRENT_PROTO_VERSION };
//# sourceMappingURL=toLatestVersion.js.map