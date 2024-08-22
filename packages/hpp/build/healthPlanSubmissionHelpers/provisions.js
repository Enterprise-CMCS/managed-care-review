import { ModifiedProvisionsAmendmentRecord, ModifiedProvisionsBaseContractRecord, ModifiedProvisionsCHIPRecord, } from '../modifiedProvisions';
import { provisionCHIPKeys, modifiedProvisionMedicaidBaseKeys, modifiedProvisionMedicaidAmendmentKeys, isCHIPProvision, isMedicaidAmendmentProvision, isMedicaidBaseProvision, } from '../healthPlanFormDataType/ModifiedProvisions';
import { isBaseContract, isCHIPOnly, isContractAmendment, isContractWithProvisions, } from '../healthPlanFormDataType/healthPlanFormData';
/*
    Each provision key represents a Yes/No question asked on Contract Details.
    This is a set of helper functions that each take in a submission and return provisions related data.

    There are currently three distrinct variants of the provisions:
    1. For CHIP amendment
    2. For non CHIP base contract
    3. For non CHIP contract amendment

    See also ModifiedProvisions.ts
*/
// Returns the list of provision keys that apply for given submission variant
const generateApplicableProvisionsList = (draftSubmission) => {
    if (isCHIPOnly(draftSubmission)) {
        return isContractAmendment(draftSubmission)
            ? provisionCHIPKeys
            : []; // there are no applicable provisions for CHIP base contract
    }
    else if (isBaseContract(draftSubmission)) {
        return modifiedProvisionMedicaidBaseKeys;
    }
    else {
        return modifiedProvisionMedicaidAmendmentKeys;
    }
};
// Returns user-friendly label text for the provision based on the given submission variant
const generateProvisionLabel = (draftSubmission, provision) => {
    if (isCHIPOnly(draftSubmission) && isCHIPProvision(provision)) {
        return ModifiedProvisionsCHIPRecord[provision];
    }
    else if (isBaseContract(draftSubmission) &&
        isMedicaidBaseProvision(provision)) {
        return ModifiedProvisionsBaseContractRecord[provision];
    }
    else if (isContractAmendment(draftSubmission) &&
        isMedicaidAmendmentProvision(provision)) {
        return ModifiedProvisionsAmendmentRecord[provision];
    }
    else {
        console.warn('Coding Error: This is a fallback case and is unexpected.');
        return 'Invalid Provision';
    }
};
/*
    Returns two lists of provisions keys sorted by whether they are set true/false
    This function also quietly discard keys from the submission's own provisions list that are not valid for the current variant.
    That functionality needed for unlocked contracts which can be edited in a non-linear fashion)
*/
const sortModifiedProvisions = (submission) => {
    const initialProvisions = submission.contractAmendmentInfo?.modifiedProvisions;
    const modifiedProvisions = [];
    const unmodifiedProvisions = [];
    if (initialProvisions && isContractWithProvisions(submission)) {
        const applicableProvisions = generateApplicableProvisionsList(submission);
        for (const provisionKey of applicableProvisions) {
            const value = initialProvisions[provisionKey];
            if (value === true) {
                modifiedProvisions.push(provisionKey);
            }
            else if (value === false) {
                unmodifiedProvisions.push(provisionKey);
            }
        }
    }
    return [modifiedProvisions, unmodifiedProvisions];
};
/*
    Returns boolean for weher a submission variant is missing required provisions
    This is used to determine if we display the missing data warning on review and submit
*/
const isMissingProvisions = (submission) => {
    const requiredProvisions = generateApplicableProvisionsList(submission);
    const [modifiedProvisions, unmodifiedProvisions] = sortModifiedProvisions(submission);
    return (modifiedProvisions.length + unmodifiedProvisions.length <
        requiredProvisions.length);
};
/*
    Returns lang string dictionary for variant
*/
const getProvisionDictionary = (submission) => {
    if (isCHIPOnly(submission)) {
        return ModifiedProvisionsCHIPRecord;
    }
    else if (isBaseContract(submission)) {
        return ModifiedProvisionsBaseContractRecord;
    }
    else {
        return ModifiedProvisionsAmendmentRecord;
    }
};
export { getProvisionDictionary, sortModifiedProvisions, generateApplicableProvisionsList, generateProvisionLabel, isMissingProvisions, };
//# sourceMappingURL=provisions.js.map