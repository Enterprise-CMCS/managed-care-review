import { ModifiedProvisionsAmendmentRecord, ModifiedProvisionsBaseContractRecord, ModifiedProvisionsCHIPRecord } from '../modifiedProvisions';
import type { HealthPlanFormDataType } from '../healthPlanFormDataType';
import { CHIPProvisionType, MedicaidBaseProvisionType, MedicaidAmendmentProvisionType, GeneralizedProvisionType } from '../healthPlanFormDataType/ModifiedProvisions';
declare const generateApplicableProvisionsList: (draftSubmission: HealthPlanFormDataType) => CHIPProvisionType[] | MedicaidBaseProvisionType[] | MedicaidAmendmentProvisionType[];
declare const generateProvisionLabel: (draftSubmission: HealthPlanFormDataType, provision: GeneralizedProvisionType) => string;
declare const sortModifiedProvisions: (submission: HealthPlanFormDataType) => [GeneralizedProvisionType[], GeneralizedProvisionType[]];
declare const isMissingProvisions: (submission: HealthPlanFormDataType) => boolean;
declare const getProvisionDictionary: (submission: HealthPlanFormDataType) => typeof ModifiedProvisionsCHIPRecord | typeof ModifiedProvisionsBaseContractRecord | typeof ModifiedProvisionsAmendmentRecord;
export { getProvisionDictionary, sortModifiedProvisions, generateApplicableProvisionsList, generateProvisionLabel, isMissingProvisions, };
