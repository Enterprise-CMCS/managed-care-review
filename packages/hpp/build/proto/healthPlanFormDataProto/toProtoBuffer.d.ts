import { UnlockedHealthPlanFormDataType, LockedHealthPlanFormDataType } from '../../healthPlanFormDataType';
declare const toProtoBuffer: (domainData: UnlockedHealthPlanFormDataType | LockedHealthPlanFormDataType) => Uint8Array;
export { toProtoBuffer };
