import {
    Contract,
    ContractPackageSubmission,
    ContractRevision,
    Rate,
    RatePackageSubmission,
    RateRevision,
    UpdateInformation,
} from '../gen/gqlClient'
import { s3DlUrl } from './documentDataMock'
import { mockMNState } from './stateMock'
import { v4 as uuidv4 } from 'uuid'
import { updateInfoMock } from './updateInfoMocks'
import { mockContractRevision } from './contractPackageDataMock'

const rateRevisionDataMock = (data?: Partial<RateRevision>): RateRevision => {
    return {
        id: data?.id ?? uuidv4(),
        rateID: '456',
        createdAt: '2023-10-16T19:01:21.389Z',
        updatedAt: '2023-10-16T19:02:26.767Z',
        unlockInfo: null,
        submitInfo: {
            __typename: 'UpdateInformation',
            updatedAt: '2023-10-16T19:02:26.766Z',
            updatedBy: {
                email: 'aang@example.com',
                role: 'STATE_USER',
                familyName: 'Airman',
                givenName: 'Aang',
            },
            updatedReason: 'Initial submission',
        },
        formData: {
            rateType: 'AMENDMENT',
            rateCapitationType: 'RATE_CELL',
            rateDocuments: [
                {
                    __typename: 'GenericDocument',
                    name: 'rate-document.pdf',
                    s3URL: 's3://bucketname/key/rate-document',
                    sha256: 'fakeSha',
                    dateAdded: new Date(), // new document
                    downloadURL: s3DlUrl,
                },
            ],
            supportingDocuments: [
                {
                    __typename: 'GenericDocument',
                    name: 'rate-supporting-document.pdf',
                    s3URL: 's3://bucketname/key/rate-supporting-document',
                    sha256: 'fakeSha',
                    dateAdded: new Date('10/01/2023'), //existing document
                    downloadURL: s3DlUrl,
                },
            ],
            rateDateStart: '2023-02-01',
            rateDateEnd: '2025-03-01',
            rateDateCertified: '2024-03-01',
            amendmentEffectiveDateStart: '2024-03-01',
            amendmentEffectiveDateEnd: '2025-03-01',
            rateProgramIDs: ['d95394e5-44d1-45df-8151-1cc1ee66f100'],
            deprecatedRateProgramIDs: [],
            rateCertificationName:
                'MCR-MN-0003-PMAP-RATE-20240301-20250301-AMENDMENT-20240301',
            certifyingActuaryContacts: [
                {
                    __typename: 'ActuaryContact',
                    id: '123-cert-actuary',
                    name: 'Actuary Contact Person',
                    titleRole: 'Actuary Contact Title',
                    email: 'actuarycontact@example.com',
                    actuarialFirm: 'MERCER',
                    actuarialFirmOther: '',
                },
            ],
            addtlActuaryContacts: [
                {
                    __typename: 'ActuaryContact',
                    id: '123-additional-actuary',
                    name: 'Additional actuary name',
                    titleRole: 'Additional actuary title',
                    email: 'additonalactuary@example.com',
                    actuarialFirm: 'MILLIMAN',
                    actuarialFirmOther: '',
                },
            ],
            actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
            packagesWithSharedRateCerts: [
                {
                    __typename: 'PackageWithSameRate',
                    packageName: 'MCR-MN-0001-PMAP',
                    packageId: 'f3306599-a1c9-411a-87ac-fa3541c3e723',
                    packageStatus: 'DRAFT',
                },
                {
                    __typename: 'PackageWithSameRate',
                    packageName: 'MCR-MN-0002-PMAP',
                    packageId: '1bf66cff-512b-4a30-bea8-5e27d1764810',
                    packageStatus: 'SUBMITTED',
                },
            ],
            __typename: 'RateFormData',
        },
        __typename: 'RateRevision',
        ...data,
    }
}

const draftRateDataMock = (
    rate?: Partial<Rate>,
    draftRevision?: Partial<RateRevision>
): Rate => {
    const rateID = rate?.id ?? uuidv4()
    return {
        __typename: 'Rate',
        createdAt: '2023-10-16T19:01:21.389Z',
        updatedAt: '2023-10-16T19:01:21.389Z',
        stateCode: 'MN',
        stateNumber: 10,
        parentContractID: 'foo-bar',
        state: mockMNState(),
        status: 'DRAFT',
        initiallySubmittedAt: '2023-10-16',
        draftRevision: {
            ...rateRevisionDataMock({ submitInfo: null, ...draftRevision }),
        },
        revisions: [],
        ...rate,
        id: rateID,
    }
}

function rateSubmissionPackageMock(
    submitInfo: UpdateInformation,
    rateRev: RateRevision,
    contractRevs: ContractRevision[]
): RatePackageSubmission {
    return {
        __typename: 'RatePackageSubmission',
        cause: 'CONTRACT_SUBMISSION',
        submitInfo: submitInfo,
        submittedRevisions: [rateRev, ...contractRevs],
        rateRevision: rateRev,
        contractRevisions: contractRevs,
    }
}

function contractSubmissionPackageMock(
    submitInfo: UpdateInformation,
    contractRev: ContractRevision,
    rateRevs: RateRevision[]
): ContractPackageSubmission {
    return {
        __typename: 'ContractPackageSubmission',
        cause: 'CONTRACT_SUBMISSION',
        submitInfo: submitInfo,
        submittedRevisions: [contractRev, ...rateRevs],
        contractRevision: contractRev,
        rateRevisions: rateRevs,
    }
}

const rateDataMock = (
    revision?: Partial<RateRevision>,
    rate?: Partial<Rate>
): Rate => {
    const rateID = rate?.id ?? uuidv4()

    const { r1 } = submittedLinkedRatesScenarioMock()
    const latestSub = r1.packageSubmissions?.[0]
    if (!latestSub) {
        throw new Error('Bad package submission')
    }

    const latestRev = latestSub.rateRevision
    const modifiedRev: RateRevision = {
        ...latestRev,
        ...revision,
    }

    const finalRate: Rate = {
        ...r1,
        __typename: 'Rate',
        createdAt: '2023-10-16T19:01:21.389Z',
        updatedAt: '2023-10-16T19:01:21.389Z',
        stateCode: 'MN',
        stateNumber: 10,
        state: mockMNState(),
        status: 'RESUBMITTED',
        initiallySubmittedAt: '2023-10-16',
        draftRevision: null,
        parentContractID: 'foo-bar',
        id: rateID,
        ...rate,
    }

    finalRate.revisions[0] = modifiedRev
    latestSub.rateRevision = modifiedRev

    return finalRate
}

// n. b. at time of this writing we don't return draftContracts on Rates yet, so this is simpler than the setup
// makes it seem.
function rateUnlockedWithHistoryMock(): Rate {
    const { r1 } = submittedLinkedRatesScenarioMock()

    const draftRevision = rateRevisionDataMock({
        id: 'rr-03',
        submitInfo: null,
    })

    r1.status = 'UNLOCKED'
    r1.draftRevision = draftRevision

    return r1
}

function rateWithHistoryMock(): Rate {
    const { r1 } = submittedLinkedRatesScenarioMock()
    return r1
}

function submittedLinkedRatesScenarioMock(): {
    r1: Rate
    c1: Contract
    c2: Contract
} {
    const c1r1sub1 = updateInfoMock(new Date(2024, 1, 1), 'Initial Submission')
    const r1r01 = rateRevisionDataMock({
        id: 'rr-01',
        submitInfo: c1r1sub1,
    })
    const c1r01 = mockContractRevision('1', {
        contractID: 'c-01',
        submitInfo: c1r1sub1,
        contractName: 'MCR-MN-0005-SNBC',
    })

    const r1r1pkg = rateSubmissionPackageMock(c1r1sub1, r1r01, [c1r01])
    const c1r1pkg = contractSubmissionPackageMock(c1r1sub1, c1r01, [r1r01])

    const c2r1sub1 = updateInfoMock(new Date(2024, 1, 2), 'Initial Submission')
    const c2r1 = mockContractRevision('2', {
        contractID: 'c-02',
        submitInfo: c2r1sub1,
        contractName: 'MCR-MN-0006-SNBC',
    })

    const r1r1c2pkg = rateSubmissionPackageMock(c2r1sub1, r1r01, [c1r01, c2r1])
    const c2r1r1pkg = contractSubmissionPackageMock(c2r1sub1, c2r1, [r1r01])

    const r1c2sub = updateInfoMock(new Date(2024, 1, 3), 'Rate Submission')
    const r1r2 = rateRevisionDataMock({
        id: 'rr-02',
        submitInfo: r1c2sub,
    })

    const r1r2c1c2pkg = rateSubmissionPackageMock(r1c2sub, r1r2, [c1r01, c2r1])
    const c1r1r2pkg = contractSubmissionPackageMock(r1c2sub, c1r01, [r1r2])
    const c2r1r2pkg = contractSubmissionPackageMock(r1c2sub, c2r1, [r1r2])

    const c1: Contract = {
        __typename: 'Contract',
        initiallySubmittedAt: undefined,
        status: 'SUBMITTED',
        createdAt: new Date(2024, 1, 1),
        updatedAt: new Date(),
        id: 'c-01',
        stateCode: 'MN',
        state: mockMNState(),
        stateNumber: 5,
        mccrsID: undefined,
        packageSubmissions: [c1r1r2pkg, c1r1pkg],
    }

    const c2: Contract = {
        __typename: 'Contract',
        initiallySubmittedAt: undefined,
        status: 'SUBMITTED',
        createdAt: new Date(2024, 1, 1),
        updatedAt: new Date(),
        id: 'c-02',
        stateCode: 'MN',
        state: mockMNState(),
        stateNumber: 5,
        mccrsID: undefined,
        packageSubmissions: [c2r1r2pkg, c2r1r1pkg],
    }

    const r1: Rate = {
        __typename: 'Rate',
        createdAt: '2023-10-16T19:01:21.389Z',
        updatedAt: '2023-10-16T19:01:21.389Z',
        stateCode: 'MN',
        stateNumber: 10,
        state: mockMNState(),
        status: 'RESUBMITTED',
        initiallySubmittedAt: '2023-10-16',
        draftRevision: null,
        parentContractID: 'c-01',
        id: 'r-01',
        withdrawInfo: null,
        revisions: [r1r2, r1r01],
        packageSubmissions: [r1r2c1c2pkg, r1r1c2pkg, r1r1pkg],
    }

    return {
        r1,
        c1,
        c2,
    }
}

export {
    rateDataMock,
    rateRevisionDataMock,
    draftRateDataMock,
    rateWithHistoryMock,
    rateUnlockedWithHistoryMock,
    submittedLinkedRatesScenarioMock,
}
