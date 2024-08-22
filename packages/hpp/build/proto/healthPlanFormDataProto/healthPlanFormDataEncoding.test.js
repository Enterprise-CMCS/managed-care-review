import { mcreviewproto } from '../../gen/healthPlanFormDataProto';
import { basicLockedHealthPlanFormData, basicHealthPlanFormData, contractOnly, contractAmendedOnly, unlockedWithALittleBitOfEverything, unlockedWithContacts, unlockedWithDocuments, unlockedWithFullContracts, unlockedWithFullRates, newHealthPlanFormData, } from '../../healthPlanFormDataMocks';
import { isLockedHealthPlanFormData, } from '../../healthPlanFormDataType';
import { toDomain } from './toDomain';
import { toProtoBuffer } from './toProtoBuffer';
describe('Validate encoding to protobuf and decoding back to domain model', () => {
    if (!isLockedHealthPlanFormData(basicLockedHealthPlanFormData())) {
        throw new Error('Bad test, the state submission is not a state submission');
    }
    test.each([
        newHealthPlanFormData(),
        basicHealthPlanFormData(),
        contractOnly(),
        unlockedWithContacts(),
        unlockedWithDocuments(),
        unlockedWithFullRates(),
        unlockedWithFullContracts(),
        unlockedWithALittleBitOfEverything(),
        basicLockedHealthPlanFormData(),
        contractAmendedOnly(),
    ])('given valid domain model %j expect protobufs to be symmetric)', (domainObject) => {
        expect(toDomain(toProtoBuffer(domainObject))).toEqual(domainObject);
    });
    it('encodes to protobuf and back to domain model without corrupting existing rate info id', () => {
        const draftFormDataWithNoRateID = unlockedWithFullRates();
        draftFormDataWithNoRateID.rateInfos[0].id =
            'test-rate-certification-one';
        draftFormDataWithNoRateID.rateInfos.push({
            ...draftFormDataWithNoRateID.rateInfos[0],
            id: 'test-rate-certification-two',
        });
        //Encode data to protobuf and back to domain model
        const domainData = toDomain(toProtoBuffer(draftFormDataWithNoRateID));
        if (domainData instanceof Error) {
            throw Error(domainData.message);
        }
        expect(domainData.rateInfos[0]?.id).toBe('test-rate-certification-one');
        expect(domainData.rateInfos[1]?.id).toBe('test-rate-certification-two');
    });
});
describe('handles invalid data as expected', () => {
    it('toDomain errors when passed an empty proto message', () => {
        const protoMessage = new mcreviewproto.HealthPlanFormData({});
        const encodedEmpty = mcreviewproto.HealthPlanFormData.encode(protoMessage).finish();
        const maybeError = toDomain(encodedEmpty);
        expect(maybeError).toBeInstanceOf(Error);
        expect(maybeError.toString()).toBe('Error: Unknown or missing status on this proto. Cannot decode.');
    });
    it('toDomain returns a decode error when passed an invalid FormData', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invalidDraft = Object.assign({}, basicHealthPlanFormData());
        delete invalidDraft.id;
        delete invalidDraft.stateNumber;
        invalidDraft.submissionType = 'nonsense';
        const encoded = toProtoBuffer(invalidDraft);
        const decodeErr = toDomain(encoded);
        expect(decodeErr).toBeInstanceOf(Error);
        // the zod error should note these three fields are wrong
        const zErr = decodeErr;
        expect(zErr.issues.flatMap((zodErr) => zodErr.path)).toEqual([
            'id',
            'stateNumber',
            'submissionType',
        ]);
    });
    it('toDomain returns a decode error when passed an invalid StateSubmission', () => {
        const invalidSubmission = Object.assign({}, basicLockedHealthPlanFormData()); // eslint-disable-line @typescript-eslint/no-explicit-any
        delete invalidSubmission.id;
        delete invalidSubmission.stateNumber;
        invalidSubmission.documents = [];
        invalidSubmission.submissionType = 'nonsense';
        const encoded = toProtoBuffer(invalidSubmission);
        const decodeErr = toDomain(encoded);
        expect(decodeErr).toBeInstanceOf(Error);
        expect(decodeErr.toString()).toBe('Error: ERROR: attempting to parse state submission proto failed');
    });
});
//# sourceMappingURL=healthPlanFormDataEncoding.test.js.map