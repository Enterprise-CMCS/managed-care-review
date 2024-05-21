import { generateRateCertificationName } from './generateRateCertificationName'
import type { RateFormEditableType } from '../../domain-models/contractAndRates'
import { findStatePrograms } from '../../postgres'
import { must } from '../../testHelpers'

const rateNameTestArray: {
    rateFormData: RateFormEditableType
    testDescription: string
    expectedName: string
}[] = [
    {
        rateFormData: {
            rateType: 'AMENDMENT',
            rateDateStart: new Date('2021/04/22'),
            rateDateEnd: new Date('2022/03/29'),
            rateDateCertified: new Date('2021/05/23'),
            amendmentEffectiveDateStart: new Date('2022/05/21'),
            amendmentEffectiveDateEnd: new Date('2022/09/21'),
            rateDocuments: [],
            supportingDocuments: [],
            rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            certifyingActuaryContacts: [],
            packagesWithSharedRateCerts: [],
        },
        testDescription: 'Amendment rate test',
        expectedName: 'MCR-MN-SNBC-20220521-20220921-AMENDMENT-20210523',
    },
    {
        rateFormData: {
            rateType: 'NEW',
            rateDateStart: new Date('2021/04/22'),
            rateDateEnd: new Date('2022/03/29'),
            rateDateCertified: new Date('2021/04/22'),
            rateDocuments: [],
            supportingDocuments: [],
            rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            certifyingActuaryContacts: [],
            packagesWithSharedRateCerts: [],
        },
        testDescription: 'New rate test',
        expectedName: 'MCR-MN-SNBC-20210422-20220329-CERTIFICATION-20210422',
    },
    {
        rateFormData: {
            rateType: 'NEW',
            rateDateStart: undefined,
            rateDateEnd: undefined,
            rateDateCertified: undefined,
            amendmentEffectiveDateStart: new Date('2022/05/21'),
            amendmentEffectiveDateEnd: new Date('2022/09/21'),
            rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            rateDocuments: [],
            supportingDocuments: [],
            certifyingActuaryContacts: [],
            packagesWithSharedRateCerts: [],
        },
        testDescription: 'New rate with no dates',
        expectedName: 'MCR-MN-SNBC-CERTIFICATION',
    },
    {
        rateFormData: {
            rateType: 'AMENDMENT',
            rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            rateDocuments: [],
            supportingDocuments: [],
            certifyingActuaryContacts: [],
            packagesWithSharedRateCerts: [],
        },
        testDescription: 'Amendment rate with no dates',
        expectedName: 'MCR-MN-SNBC-AMENDMENT',
    },
    {
        rateFormData: {
            rateType: 'NEW',
            rateDateStart: new Date('2021/04/22'),
            rateDateEnd: undefined,
            amendmentEffectiveDateStart: new Date('2022/05/21'),
            amendmentEffectiveDateEnd: new Date('2022/09/21'),
            rateDateCertified: undefined,
            rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            rateDocuments: [],
            supportingDocuments: [],
            certifyingActuaryContacts: [],
            packagesWithSharedRateCerts: [],
        },
        testDescription: 'New rate with incomplete dates',
        expectedName: 'MCR-MN-SNBC-20210422-CERTIFICATION',
    },
    {
        rateFormData: {
            rateType: 'AMENDMENT',
            rateDateStart: new Date('2021/04/22'),
            rateDateEnd: new Date('2022/03/29'),
            amendmentEffectiveDateStart: new Date('2022/05/21'),
            rateDocuments: [],
            supportingDocuments: [],
            rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            certifyingActuaryContacts: [],
            packagesWithSharedRateCerts: [],
        },
        testDescription: 'Incomplete amendment rate dates',
        expectedName: 'MCR-MN-SNBC-20220521-AMENDMENT',
    },
    {
        rateFormData: {
            rateType: undefined,
            rateDateStart: new Date('2021/04/22'),
            rateDateEnd: new Date('2022/03/29'),
            rateDateCertified: new Date('2021/05/23'),
            amendmentEffectiveDateStart: new Date('2022/05/21'),
            amendmentEffectiveDateEnd: new Date('2022/09/21'),
            rateDocuments: [],
            supportingDocuments: [],
            rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            certifyingActuaryContacts: [],
            packagesWithSharedRateCerts: [],
        },
        testDescription: 'Rate type not specified',
        expectedName: 'MCR-MN-SNBC-20210523',
    },
    {
        rateFormData: {
            rateType: 'NEW',
            rateDateStart: new Date('2021/04/22'),
            rateDateEnd: new Date('2022/03/29'),
            rateDateCertified: new Date('2021/04/22'),
            rateDocuments: [],
            supportingDocuments: [],
            rateProgramIDs: [],
            certifyingActuaryContacts: [],
            packagesWithSharedRateCerts: [],
        },
        testDescription: 'No rate programs',
        expectedName: 'MCR-MN-20210422-20220329-CERTIFICATION-20210422',
    },
]

test.each(rateNameTestArray)(
    'generateRateCertificationName: $testDescription',
    ({ rateFormData, expectedName }) => {
        const stateCode = 'MN'
        const programs = must(findStatePrograms(stateCode))
        expect(
            generateRateCertificationName(rateFormData, stateCode, programs)
        ).toMatch(expectedName)
    }
)
