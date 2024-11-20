import fs from 'fs'
import { createHash } from 'crypto'
import Papa from 'papaparse';

interface DocumentType {
    contractID: string | undefined
    rateID: string | undefined
    type: 'CONTRACT' | 'CONTRACT_SUPPORTING' | 'RATE' | 'RATE_SUPPORTING'
    title: string
}

interface ContactPersonType {
    contractID: string | undefined
    rateID: string | undefined
    type: 'CONTRACT' | 'RATE_ACTUARY' | 'RATE_ADDITIONAL_ACTUARY'
    name: string
    email: string
    titleRole: string
}

interface ContractActionType {
    externalID: string 
    externalURL: string 
    initiallySubmittedAt: Date
    updatedAt: Date
    stateCode: string 
    name: string 
    mccrsID: string 
    submissionReason: string 
    programNicknames: string 
    populationCovered: "MEDICAID" | "CHIP" | "MEDICAID_AND_CHIP" 
    submissionType: "CONTRACT_ONLY"| "CONTRACT_AND_RATES"
    riskBasedContract: Boolean 
    submissionDescription: string 
    contractType: "BASE" | "AMENDMENT"
    contractExecutionStatus: "EXECUTED" | "UNEXECUTED"
    contractDateStart: string 
    contractDateEnd: string 
    managedCareEntities: string
    federalAuthorities: string
    statutoryRegulatoryAttestation: Boolean 
    statutoryRegulatoryAttestationDescription: string 
    inLieuServicesAndSettings: Boolean 
    modifiedBenefitsProvided: Boolean 
    modifiedGeoAreaServed: Boolean 
    modifiedMedicaidBeneficiaries: Boolean 
    modifiedRiskSharingStrategy: Boolean 
    modifiedIncentiveArrangements: Boolean 
    modifiedWitholdAgreements: Boolean 
    modifiedStateDirectedPayments: Boolean 
    modifiedPassThroughPayments: Boolean 
    modifiedPaymentsForMentalDiseaseInstitutions: Boolean 
    modifiedMedicalLossRatioStandards: Boolean 
    modifiedOtherFinancialPaymentIncentive: Boolean 
    modifiedEnrollmentProcess: Boolean 
    modifiedGrevienceAndAppeal: Boolean 
    modifiedNetworkAdequacyStandards: Boolean 
    modifiedLengthOfContract: Boolean 
    modifiedNonRiskPaymentArrangements: Boolean 
}

interface RateType {
    externalID: string 
    externalURL: string 
    updatedAt: Date 
    stateCode: string 
    name: string 
    submissionReason: string 
    rateType: "NEW" | "AMENDMENT"
    rateCapitationType: "RATE_CELL" | "RATE_RANGE"
    programNicknames: string
    rateDateStart: string 
    rateDateEnd: string 
    rateDateCertified: string 
    amendmentEffectiveDateStart: string 
    amendmentEffectiveDateEnd: string 
    actuaryCommunicationPreference: "OACT_TO_ACTUARY" | "OACT_TO_STATE"
}

interface ContractRateJoin {
    contractID: String,
    rateID: String,
}

interface AllTablesType {
    contracts: ContractActionType[],
    rates: RateType[],
    contractRateJoins: ContractRateJoin[],
    documents: DocumentType[],
    contacts: ContactPersonType[],
}

interface ProgramQueryType {
    id: string,
    name: string,
    fullName: string,
}

interface DocumentQueryType {
    name: string
    s3URL: string
}

interface ContactQueryType {
    name: string,
    titleRole: string,
    email: string,
}

function getProgramNames(ids: string[], programs: any) {

    const names = ids.map(id => {
        return programs.find((p: ProgramQueryType) => p.id === id).name
    })

    return names
}

function parseContract(cq: any, allTables: AllTablesType) {

    const cqr = cq.packageSubmissions[0].contractRevision
    const cfd = cqr.formData
    console.log("CFDFORREASL", cfd)

    const programNames = getProgramNames(cfd.programIDs, cq.state.programs)

    const contract: ContractActionType = {
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
    }

    allTables.contracts.push(contract)

    console.log('CFD', cfd.contractDocuments)
    const cdocs: DocumentType[] = cfd.contractDocuments.map((d: DocumentQueryType) => ({
        contractID: cq.id,
        rateID: undefined,
        type: 'CONTRACT',
        title: d.name
    }))

    const sdocs: DocumentType[] = cfd.supportingDocuments.map((d: DocumentQueryType) => ({
        contractID: cq.id,
        rateID: undefined,
        type: 'CONTRACT_SUPPORTING',
        title: d.name
    }))

    allTables.documents.push(...cdocs, ...sdocs)

    const contacts: ContactPersonType[] = cfd.stateContacts.map((c: ContactQueryType) => ({
        contractID: cq.id,
        rateID: undefined,
        type: 'CONTRACT',
        name: createHash('md5').update(c.name).digest('hex'),
        email: `${createHash('md5').update(c.email).digest('hex')}@example.com`,
        titleRole: c.titleRole,
    }))

    allTables.contacts.push(...contacts)

    // --- rate parsing


    const rateRevisions = cq.packageSubmissions[0].rateRevisions

    for (const rrev of rateRevisions) {
        const rfd = rrev.formData
        console.log('RFD', rrev)

        const rateProgramIDs = rfd.rateProgramIDs
        const rateNames = getProgramNames(rateProgramIDs, cq.state.programs)

        const rate: RateType = {
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
        }

        allTables.rates.push(rate)

        const rdocs: DocumentType[] = rfd.rateDocuments.map((d: DocumentQueryType) => ({
            contractID: undefined,
            rateID: rrev.rateID,
            type: 'RATE',
            title: d.name
        }))

        const rsdocs: DocumentType[] = cfd.supportingDocuments.map((d: DocumentQueryType) => ({
            rateID: rrev.rateID,
            type: 'RATE_SUPPORTING',
            title: d.name
        }))

        allTables.documents.push(...rdocs, ...rsdocs)

        const actuary: ContactPersonType[] = rfd.certifyingActuaryContacts.map((c: ContactQueryType) => ({
            rateID: rrev.rateID,
            type: 'RATE_ACTUARY',
            name: createHash('sha256').update(c.name).digest('hex'),
            email: `${createHash('sha256').update(c.email).digest('hex')}@example.com`,
            titleRole: c.titleRole,
        }))

        const additionalActuaries: ContactPersonType[] = rfd.addtlActuaryContacts.map((c: ContactQueryType) => ({
            rateID: rrev.rateID,
            type: 'RATE_ADDITIONAL_ACTUARY',
            name: createHash('sha256').update(c.name).digest('hex'),
            email: `${createHash('sha256').update(c.email).digest('hex')}@example.com`,
            titleRole: c.titleRole,
        }))

        allTables.contacts.push(...actuary, ...additionalActuaries)

        allTables.contractRateJoins.push({
            contractID: cq.id,
            rateID: rrev.rateID,
        })

    }
}

function writeTables(allTables: AllTablesType) {

    const contractsCSV = Papa.unparse(allTables.contracts)
    const ratesCSV = Papa.unparse(allTables.rates)
    const contractRateJoinCSV = Papa.unparse(allTables.contractRateJoins)
    const documentsCSV = Papa.unparse(allTables.documents)
    const contactsCSV = Papa.unparse(allTables.contacts)

    fs.writeFileSync('sampleContracts.csv', contractsCSV)
    fs.writeFileSync('sampleRates.csv', ratesCSV)
    fs.writeFileSync('sampleContractRateJoins.csv', contractRateJoinCSV)
    fs.writeFileSync('sampleDocuments.csv', documentsCSV)
    fs.writeFileSync('sampleContacts.csv', contactsCSV)

}


function main() {

    const allTables: AllTablesType = {
        contacts: [],
        rates: [],
        contractRateJoins: [],
        documents: [],
        contracts: [],
    }

    const sampleQueriesDir = 'sample-contract-actions/sampleContractQueries/'
    const contractQueries = fs.readdirSync(sampleQueriesDir)
    console.log('QUERIES', contractQueries)

    for (const sampleContractQueryName of contractQueries) {
        const path = sampleQueriesDir + sampleContractQueryName

        const contractQueryFile = fs.readFileSync(path, 'utf8' )

        const contract = JSON.parse(contractQueryFile)['contract']

        parseContract(contract, allTables)
    }

    console.log(allTables)

    writeTables(allTables)

}

main()
