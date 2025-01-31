"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const crypto_1 = require("crypto");
const papaparse_1 = __importDefault(require("papaparse"));
function getProgramNames(ids, programs) {
    const names = ids.map(id => {
        return programs.find((p) => p.id === id).name;
    });
    return names;
}
function parseContract(cq, allTables) {
    const cqr = cq.packageSubmissions[0].contractRevision;
    const cfd = cqr.formData;
    console.log("CFDFORREASL", cfd);
    const programNames = getProgramNames(cfd.programIDs, cq.state.programs);
    const contract = {
        externalID: cq['id'],
        externalURL: `https://mc-review.cms.gov/submissions/${cq['id']}`,
        initiallySubmittedAt: cq['initiallySubmittedAt'],
        updatedAt: cq['updatedAt'],
        stateCode: cq['stateCode'],
        name: cqr['contractName'],
        mccrsID: cq['mccrsID'],
        submissionReason: cqr.submitInfo['updatedReason'],
        programNicknames: JSON.stringify(programNames),
        populationCovered: cfd['populationCovered'],
        submissionType: cfd['submissionType'],
        riskBasedContract: cfd['riskBasedContract'],
        submissionDescription: cfd['submissionDescription'],
        contractType: cfd['contractType'],
        contractExecutionStatus: cfd['contractExecutionStatus'],
        contractDateStart: cfd['contractDateStart'],
        contractDateEnd: cfd['contractDateEnd'],
        managedCareEntities: JSON.stringify(cfd['managedCareEntities']),
        federalAuthorities: JSON.stringify(cfd['federalAuthorities']),
        statutoryRegulatoryAttestation: cfd['statutoryRegulatoryAttestation'],
        statutoryRegulatoryAttestationDescription: cfd['statutoryRegulatoryAttestationDescription'],
        inLieuServicesAndSettings: cfd['inLieuServicesAndSettings'],
        modifiedBenefitsProvided: cfd['modifiedBenefitsProvided'],
        modifiedGeoAreaServed: cfd['modifiedGeoAreaServed'],
        modifiedMedicaidBeneficiaries: cfd['modifiedMedicaidBeneficiaries'],
        modifiedRiskSharingStrategy: cfd['modifiedRiskSharingStrategy'],
        modifiedIncentiveArrangements: cfd['modifiedIncentiveArrangements'],
        modifiedWitholdAgreements: cfd['modifiedWitholdAgreements'],
        modifiedStateDirectedPayments: cfd['modifiedStateDirectedPayments'],
        modifiedPassThroughPayments: cfd['modifiedPassThroughPayments'],
        modifiedPaymentsForMentalDiseaseInstitutions: cfd['modifiedPaymentsForMentalDiseaseInstitutions'],
        modifiedMedicalLossRatioStandards: cfd['modifiedMedicalLossRatioStandards'],
        modifiedOtherFinancialPaymentIncentive: cfd['modifiedOtherFinancialPaymentIncentive'],
        modifiedEnrollmentProcess: cfd['modifiedEnrollmentProcess'],
        modifiedGrevienceAndAppeal: cfd['modifiedGrevienceAndAppeal'],
        modifiedNetworkAdequacyStandards: cfd['modifiedNetworkAdequacyStandards'],
        modifiedLengthOfContract: cfd['modifiedLengthOfContract'],
        modifiedNonRiskPaymentArrangements: cfd['modifiedNonRiskPaymentArrangements'],
    };
    allTables.contracts.push(contract);
    console.log('CFD', cfd.contractDocuments);
    const cdocs = cfd.contractDocuments.map((d) => ({
        contractID: cq.id,
        rateID: undefined,
        type: 'CONTRACT',
        title: d.name
    }));
    const sdocs = cfd.supportingDocuments.map((d) => ({
        contractID: cq.id,
        rateID: undefined,
        type: 'CONTRACT_SUPPORTING',
        title: d.name
    }));
    allTables.documents.push(...cdocs, ...sdocs);
    const contacts = cfd.stateContacts.map((c) => ({
        contractID: cq.id,
        rateID: undefined,
        type: 'CONTRACT',
        name: (0, crypto_1.createHash)('md5').update(c.name).digest('hex'),
        email: `${(0, crypto_1.createHash)('md5').update(c.email).digest('hex')}@example.com`,
        titleRole: c.titleRole,
    }));
    allTables.contacts.push(...contacts);
    // --- rate parsing
    const rateRevisions = cq.packageSubmissions[0].rateRevisions;
    for (const rrev of rateRevisions) {
        const rfd = rrev.formData;
        console.log('RFD', rrev);
        const rateProgramIDs = rfd.rateProgramIDs;
        const rateNames = getProgramNames(rateProgramIDs, cq.state.programs);
        const rate = {
            externalID: rrev.rateID,
            externalURL: `https://mc-review.cms.gov/rates/${rrev.id}`,
            submissionReason: rrev.submitInfo.updatedReason,
            updatedAt: rrev.updatedAt,
            stateCode: rrev.rate.stateCode,
            name: rfd.rateCertificationName,
            rateType: rfd.rateType,
            rateCapitationType: rfd['rateCapitationType'],
            programNicknames: JSON.stringify(rateNames),
            rateDateStart: rfd['rateDateStart'],
            rateDateEnd: rfd['rateDateEnd'],
            rateDateCertified: rfd['rateDateCertified'],
            amendmentEffectiveDateStart: rfd['amendmentEffectiveDateStart'],
            amendmentEffectiveDateEnd: rfd['amendmentEffectiveDateEnd'],
            actuaryCommunicationPreference: rfd['actuaryCommunicationPreference'],
        };
        allTables.rates.push(rate);
        const rdocs = rfd.rateDocuments.map((d) => ({
            contractID: undefined,
            rateID: rrev.rateID,
            type: 'RATE',
            title: d.name
        }));
        const rsdocs = cfd.supportingDocuments.map((d) => ({
            rateID: rrev.rateID,
            type: 'RATE_SUPPORTING',
            title: d.name
        }));
        allTables.documents.push(...rdocs, ...rsdocs);
        const actuary = rfd.certifyingActuaryContacts.map((c) => ({
            rateID: rrev.rateID,
            type: 'RATE_ACTUARY',
            name: (0, crypto_1.createHash)('sha256').update(c.name).digest('hex'),
            email: `${(0, crypto_1.createHash)('sha256').update(c.email).digest('hex')}@example.com`,
            titleRole: c.titleRole,
        }));
        const additionalActuaries = rfd.addtlActuaryContacts.map((c) => ({
            rateID: rrev.rateID,
            type: 'RATE_ADDITIONAL_ACTUARY',
            name: (0, crypto_1.createHash)('sha256').update(c.name).digest('hex'),
            email: `${(0, crypto_1.createHash)('sha256').update(c.email).digest('hex')}@example.com`,
            titleRole: c.titleRole,
        }));
        allTables.contacts.push(...actuary, ...additionalActuaries);
        allTables.contractRateJoins.push({
            contractID: cq.id,
            rateID: rrev.rateID,
        });
    }
}
function writeTables(allTables) {
    const contractsCSV = papaparse_1.default.unparse(allTables.contracts);
    const ratesCSV = papaparse_1.default.unparse(allTables.rates);
    const contractRateJoinCSV = papaparse_1.default.unparse(allTables.contractRateJoins);
    const documentsCSV = papaparse_1.default.unparse(allTables.documents);
    const contactsCSV = papaparse_1.default.unparse(allTables.contacts);
    fs_1.default.writeFileSync('sampleContracts.csv', contractsCSV);
    fs_1.default.writeFileSync('sampleRates.csv', ratesCSV);
    fs_1.default.writeFileSync('sampleContractRateJoins.csv', contractRateJoinCSV);
    fs_1.default.writeFileSync('sampleDocuments.csv', documentsCSV);
    fs_1.default.writeFileSync('sampleContacts.csv', contactsCSV);
}
function main() {
    const allTables = {
        contacts: [],
        rates: [],
        contractRateJoins: [],
        documents: [],
        contracts: [],
    };
    const sampleQueriesDir = 'sample-contract-actions/sampleContractQueries/';
    const contractQueries = fs_1.default.readdirSync(sampleQueriesDir);
    console.log('QUERIES', contractQueries);
    for (const sampleContractQueryName of contractQueries) {
        const path = sampleQueriesDir + sampleContractQueryName;
        const contractQueryFile = fs_1.default.readFileSync(path, 'utf8');
        const contract = JSON.parse(contractQueryFile)['contract'];
        parseContract(contract, allTables);
    }
    console.log(allTables);
    writeTables(allTables);
}
main();
