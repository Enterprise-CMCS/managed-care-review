import { Story } from '@storybook/react'
import {
    HealthPlanPackageTable,
    PackageTableProps,
    PackageInDashboardType,
} from './HealthPlanPackageTable'
import ProvidersDecorator from '../../../.storybook/providersDecorator'
import { User } from '../../gen/gqlClient'

const tableData: PackageInDashboardType[] = [
    {
        id: '576e5a1e-6ae6-4936-9ee4-7034cb2072dd',
        name: 'MCR-MN-0071-PMAP',
        programs: [
            {
                __typename: 'Program',
                id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                name: 'PMAP',
                fullName: 'Prepaid Medical Assistance Program',
                isRateProgram: false,
            },
        ],
        submittedAt: '2022-12-05',
        status: 'SUBMITTED',
        updatedAt: new Date('2022-12-05T17:48:59.297Z'),
        submissionType: 'Contract action and rate certification',
        stateName: 'Minnesota',
    },
    {
        id: 'a6e5eb04-833f-4050-bab4-6ebe8d1a5e75',
        name: 'MCR-OH-0069-PMAP',
        programs: [
            {
                __typename: 'Program',
                id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                name: 'PMAP',
                fullName: 'Prepaid Medical Assistance Program',
                isRateProgram: false,
            },
        ],
        submittedAt: '2022-11-05',
        status: 'SUBMITTED',
        updatedAt: new Date('2022-11-05T17:47:09.745Z'),
        submissionType: 'Contract action and rate certification',
        stateName: 'Ohio',
    },
    {
        id: '74c3c976-45d8-49fe-ac76-6ae3147acd12',
        name: 'MCR-PR-0065-PMAP',
        programs: [
            {
                __typename: 'Program',
                id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                name: 'PMAP',
                fullName: 'Prepaid Medical Assistance Program',
                isRateProgram: false,
            },
        ],
        submittedAt: '2022-10-05',
        status: 'SUBMITTED',
        updatedAt: new Date('2022-10-05T17:45:05.562Z'),
        submissionType: 'Contract action and rate certification',
        stateName: 'Puerto Rico',
    },
    {
        id: '2f7f1274-3927-4367-bec6-870587a0f0c6',
        name: 'MCR-MN-0063-PMAP',
        programs: [
            {
                __typename: 'Program',
                id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                name: 'PMAP',
                fullName: 'Prepaid Medical Assistance Program',
                isRateProgram: false,
            },
        ],
        submittedAt: '2022-09-05',
        status: 'UNLOCKED',
        updatedAt: new Date('2022-09-05T17:42:14.835Z'),
        submissionType: 'Contract action only',
        stateName: 'Minnesota',
    },
]

const mockCMSUser: User = {
    __typename: 'CMSUser' as const,
    id: 'foo-id',
    givenName: 'Bob',
    familyName: 'Dumas',
    role: 'CMS User',
    email: 'cms@exmaple.com',
    stateAssignments: [],
}

export default {
    title: 'Components/HealthPlanPackageTable',
    component: HealthPlanPackageTable,
}

const Template: Story<PackageTableProps> = (args) => (
    <HealthPlanPackageTable {...args} />
)

export const Default = Template.bind({})

Default.decorators = [(Story) => ProvidersDecorator(Story, {})]
Default.args = {
    tableData,
    user: mockCMSUser,
}

export const WithCaption = Template.bind({})
WithCaption.decorators = [(Story) => ProvidersDecorator(Story, {})]
WithCaption.args = {
    tableData,
    user: mockCMSUser,
    caption: 'Table Data',
}

// CMS User experience
export const WithFilters = Template.bind({})
WithFilters.decorators = [(Story) => ProvidersDecorator(Story, {})]
WithFilters.args = {
    tableData,
    user: mockCMSUser,
    showFilters: true,
}
