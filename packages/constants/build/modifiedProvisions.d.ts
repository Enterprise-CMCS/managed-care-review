import { CHIPModifiedProvisions, ModifiedProvisionsMedicaidAmendment, ModifiedProvisionsMedicaidBase } from '../common-code/healthPlanFormDataType/ModifiedProvisions';
declare const ModifiedProvisionsAmendmentRecord: Record<keyof ModifiedProvisionsMedicaidAmendment, string>;
declare const ModifiedProvisionsBaseContractRecord: Record<keyof ModifiedProvisionsMedicaidBase, string>;
declare const ModifiedProvisionsCHIPRecord: Record<keyof CHIPModifiedProvisions, string>;
export { ModifiedProvisionsCHIPRecord, ModifiedProvisionsBaseContractRecord, ModifiedProvisionsAmendmentRecord, };
