/// <reference types="node" />
import { LockedHealthPlanFormDataType, UnlockedHealthPlanFormDataType } from '../healthPlanFormDataType';
import { HealthPlanPackage, UpdateInformation } from '../gen/gqlClient';
declare function mockDraft(partial?: Partial<UnlockedHealthPlanFormDataType>): UnlockedHealthPlanFormDataType;
declare function mockBaseContract(partial?: Partial<UnlockedHealthPlanFormDataType>): UnlockedHealthPlanFormDataType;
declare function mockContractAndRatesDraft(partial?: Partial<UnlockedHealthPlanFormDataType>): UnlockedHealthPlanFormDataType;
declare function mockStateSubmission(): LockedHealthPlanFormDataType;
declare function mockStateSubmissionContractAmendment(): LockedHealthPlanFormDataType;
declare function mockDraftHealthPlanPackage(submissionData?: Partial<UnlockedHealthPlanFormDataType>): HealthPlanPackage;
declare function mockSubmittedHealthPlanPackage(submissionData?: Partial<UnlockedHealthPlanFormDataType | LockedHealthPlanFormDataType>, submitInfo?: Partial<UpdateInformation>): HealthPlanPackage;
declare function mockSubmittedHealthPlanPackageWithRevisions(): HealthPlanPackage;
declare function mockUnlockedHealthPlanPackage(submissionData?: Partial<UnlockedHealthPlanFormDataType>, unlockInfo?: Partial<UpdateInformation>): HealthPlanPackage;
declare function mockUnlockedHealthPlanPackageWithOldProtos(unlockedWithOldProto: Buffer): HealthPlanPackage;
declare function mockUnlockedHealthPlanPackageWithDocuments(): HealthPlanPackage;
export { mockContractAndRatesDraft, mockStateSubmission, mockBaseContract, mockDraft, mockStateSubmissionContractAmendment, mockDraftHealthPlanPackage, mockSubmittedHealthPlanPackage, mockUnlockedHealthPlanPackageWithDocuments, mockUnlockedHealthPlanPackageWithOldProtos, mockSubmittedHealthPlanPackageWithRevisions, mockUnlockedHealthPlanPackage, };
