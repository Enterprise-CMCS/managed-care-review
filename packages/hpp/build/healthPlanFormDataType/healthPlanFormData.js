import { provisionCHIPKeys, modifiedProvisionMedicaidAmendmentKeys, modifiedProvisionMedicaidBaseKeys, } from './ModifiedProvisions';
import { generateApplicableProvisionsList } from '../healthPlanSubmissionHelpers/provisions';
import dayjs from 'dayjs';
import { federalAuthorityKeysForCHIP, } from './FederalAuthorities';
// TODO: Refactor into multiple files and add unit tests to these functions
const isContractOnly = (sub) => sub.submissionType === 'CONTRACT_ONLY';
const isBaseContract = (sub) => sub.contractType === 'BASE';
const isContractAmendment = (sub) => sub.contractType === 'AMENDMENT';
const isRateAmendment = (rateInfo) => rateInfo.rateType === 'AMENDMENT';
const isCHIPOnly = (sub) => sub.populationCovered === 'CHIP';
const isContractAndRates = (sub) => sub.submissionType === 'CONTRACT_AND_RATES';
const isContractWithProvisions = (sub) => isContractAmendment(sub) || (isBaseContract(sub) && !isCHIPOnly(sub));
const isSubmitted = (sub) => sub.status === 'SUBMITTED';
const hasValidModifiedProvisions = (sub) => {
    const provisions = sub.contractAmendmentInfo?.modifiedProvisions;
    if (!isContractWithProvisions(sub))
        return true; // if the contract doesn't require any provision yes/nos, it is already valid
    if (provisions === undefined)
        return false;
    return isCHIPOnly(sub)
        ? provisionCHIPKeys.every((provision) => provisions[provision] !== undefined)
        : isBaseContract(sub)
            ? modifiedProvisionMedicaidBaseKeys.every((provision) => provisions[provision] !== undefined)
            : modifiedProvisionMedicaidAmendmentKeys.every((provision) => provisions[provision] !== undefined);
};
const hasValidContract = (sub) => sub.contractType !== undefined &&
    sub.contractExecutionStatus !== undefined &&
    sub.contractDateStart !== undefined &&
    sub.contractDateEnd !== undefined &&
    sub.managedCareEntities.length !== 0 &&
    sub.federalAuthorities.length !== 0 &&
    sub.riskBasedContract !== undefined &&
    hasValidModifiedProvisions(sub) &&
    hasValidPopulationCoverage(sub);
const hasValidPopulationCoverage = (sub) => sub.populationCovered !== undefined;
const hasValidActuaries = (actuaries) => actuaries &&
    actuaries.length > 0 &&
    actuaries.every((actuaryContact) => actuaryContact.name !== undefined &&
        actuaryContact.titleRole !== undefined &&
        actuaryContact.email !== undefined &&
        ((actuaryContact.actuarialFirm !== undefined &&
            actuaryContact.actuarialFirm !== 'OTHER') ||
            (actuaryContact.actuarialFirm === 'OTHER' &&
                actuaryContact.actuarialFirmOther !== undefined)));
const hasValidRates = (sub) => {
    const validRates = sub.rateInfos.every((rateInfo) => {
        const validBaseRate = rateInfo.rateType !== undefined &&
            rateInfo.rateDateCertified !== undefined &&
            rateInfo.rateDateStart !== undefined &&
            rateInfo.rateDateEnd !== undefined &&
            rateInfo.rateProgramIDs !== undefined &&
            rateInfo.rateProgramIDs.length > 0 &&
            hasValidActuaries(rateInfo.actuaryContacts);
        if (isRateAmendment(rateInfo)) {
            return (validBaseRate &&
                Boolean(rateInfo.rateAmendmentInfo &&
                    rateInfo.rateAmendmentInfo.effectiveDateEnd &&
                    rateInfo.rateAmendmentInfo.effectiveDateStart));
        }
        return validBaseRate;
    });
    // Contract only - skip all validations for hasValidRates
    if (sub.submissionType === 'CONTRACT_ONLY') {
        return true;
    }
    else {
        return validRates;
    }
};
//Returns boolean if package has any valid rate data
const hasAnyValidRateData = (sub) => {
    return (
    //Any rate inside array of rateInfo would mean there is rate data.
    sub.rateInfos.length > 0);
};
const hasValidDocuments = (sub) => {
    const validRateDocuments = sub.submissionType === 'CONTRACT_AND_RATES'
        ? sub.rateInfos.every((rateInfo) => Boolean(rateInfo.rateDocuments.length))
        : true;
    const validContractDocuments = sub.contractDocuments.length !== 0;
    return validRateDocuments && validContractDocuments;
};
const isLockedHealthPlanFormData = (sub) => {
    if (sub && typeof sub === 'object' && 'status' in sub) {
        const maybeStateSub = sub;
        return (maybeStateSub.status === 'SUBMITTED' &&
            'submittedAt' in maybeStateSub);
    }
    return false;
};
const isValidAndCurrentLockedHealthPlanFormData = (sub) => {
    const maybeSubmitted = sub;
    return (isLockedHealthPlanFormData(maybeSubmitted) &&
        hasValidContract(maybeSubmitted) &&
        hasValidRates(maybeSubmitted) &&
        hasValidDocuments(maybeSubmitted));
};
const isUnlockedHealthPlanFormData = (sub) => {
    if (sub && typeof sub === 'object') {
        if ('status' in sub) {
            const maybeDraft = sub;
            return (maybeDraft.status === 'DRAFT' && !('submittedAt' in maybeDraft));
        }
    }
    return false;
};
const naturalSort = (a, b) => {
    return a.localeCompare(b, 'en', { numeric: true });
};
// Since these functions are in common code, we don't want to rely on the api or gql program types
// instead we create an interface with what is required for these functions, since both those types
// implement it, we can use it interchangeably
// Pull out the programs names for display from the program IDs
function programNames(programs, programIDs) {
    return programIDs.map((id) => {
        const program = programs.find((p) => p.id === id);
        if (!program) {
            return 'Unknown Program';
        }
        return program.name;
    });
}
function packageName(stateCode, stateNumber, programIDs, statePrograms) {
    const padNumber = stateNumber.toString().padStart(4, '0');
    const pNames = programNames(statePrograms, programIDs);
    const formattedProgramNames = pNames
        .sort(naturalSort)
        .map((n) => n
        .replace(/\s/g, '-')
        .replace(/[^a-zA-Z0-9+]/g, '')
        .toUpperCase())
        .join('-');
    return `MCR-${stateCode.toUpperCase()}-${padNumber}-${formattedProgramNames}`;
}
const generateRateName = (pkg, rateInfo, statePrograms) => {
    const { rateType, rateAmendmentInfo, rateDateCertified, rateDateEnd, rateDateStart, } = rateInfo;
    // Default to package programs if rate programs do not exist
    const rateProgramIDs = rateInfo.rateProgramIDs?.length
        ? rateInfo.rateProgramIDs
        : pkg.programIDs;
    let rateName = `${packageName(pkg.stateCode, pkg.stateNumber, rateProgramIDs, statePrograms)}-RATE`;
    if (rateType === 'AMENDMENT' && rateAmendmentInfo?.effectiveDateStart) {
        rateName = rateName.concat('-', formatRateNameDate(rateAmendmentInfo.effectiveDateStart));
    }
    else if ((rateType === 'NEW' || !rateType) && rateDateStart) {
        rateName = rateName.concat('-', formatRateNameDate(rateDateStart));
    }
    if (rateType === 'AMENDMENT' && rateAmendmentInfo?.effectiveDateEnd) {
        rateName = rateName.concat('-', formatRateNameDate(rateAmendmentInfo.effectiveDateEnd));
    }
    else if ((rateType === 'NEW' || !rateType) && rateDateEnd) {
        rateName = rateName.concat('-', formatRateNameDate(rateDateEnd));
    }
    if (rateType === 'AMENDMENT') {
        rateName = rateName.concat('-', 'AMENDMENT');
    }
    else if (rateType === 'NEW') {
        rateName = rateName.concat('-', 'CERTIFICATION');
    }
    if (rateDateCertified) {
        rateName = rateName.concat('-', formatRateNameDate(rateDateCertified));
    }
    return rateName;
};
const removeRatesData = (pkg) => {
    pkg.rateInfos = [];
    pkg.addtlActuaryContacts = [];
    pkg.addtlActuaryCommunicationPreference = undefined;
    return pkg;
};
// Remove any provisions and federal authorities that aren't valid for population type (e.g. CHIP)
// since user can change theses submission type fields on unlock and not necesarily update the contract details
const removeInvalidProvisionsAndAuthorities = (pkg) => {
    // remove invalid provisions
    if (isContractWithProvisions(pkg) && pkg.contractAmendmentInfo) {
        const validProvisionsKeys = generateApplicableProvisionsList(pkg);
        const validProvisionsData = {};
        validProvisionsKeys.forEach((provision) => {
            validProvisionsData[provision] =
                pkg.contractAmendmentInfo?.modifiedProvisions[provision];
        });
        pkg.contractAmendmentInfo.modifiedProvisions = validProvisionsData;
    }
    // remove invalid authorities if CHIP
    if (isCHIPOnly(pkg)) {
        pkg.federalAuthorities = pkg.federalAuthorities.filter((authority) => federalAuthorityKeysForCHIP.includes(authority));
    }
    return pkg;
};
function formatRateNameDate(date) {
    if (!date) {
        return '';
    }
    return dayjs(date).tz('UTC').format('YYYYMMDD');
}
export { isContractWithProvisions, hasValidModifiedProvisions, hasValidContract, hasValidDocuments, hasValidRates, hasAnyValidRateData, isBaseContract, isContractAmendment, isCHIPOnly, isContractOnly, isContractAndRates, isLockedHealthPlanFormData, isUnlockedHealthPlanFormData, isSubmitted, isValidAndCurrentLockedHealthPlanFormData, programNames, packageName, generateRateName, removeRatesData, removeInvalidProvisionsAndAuthorities, hasValidPopulationCoverage, };
//# sourceMappingURL=healthPlanFormData.js.map