import { StoryFn } from '@storybook/react'
import { PackageSelect, PackageSelectPropType } from '../index'
import { mockDraft, mockMNState } from '../../../testHelpers/apolloMocks'
import React from 'react'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'

const draftSubmission = {
    ...mockDraft(),
    stateNumber: 3,
    id: 'test-shared-rate',
}
const packageOptions = [
    { label: 'MCR-MN-0005-MSC+-PMAP-SNBC', value: 'test-id-124' },
    { label: 'MCR-MN-0006-PMAP-SNBC', value: 'test-id-125' },
    { label: 'MCR-MN-0007-SNBC', value: 'test-id-126' },
    { label: 'MCR-MN-0008-MSC+', value: 'test-id-127' },
]
const statePrograms = mockMNState().programs

export default {
    title: 'Components/Select/PackageSelect',
    component: PackageSelect,
}

const Template: StoryFn<PackageSelectPropType> = (args) => (
    <PackageSelect {...args} />
)

export const Default = Template.bind({})

Default.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]
Default.args = {
    name: 'packageSelect',
    statePrograms: statePrograms,
    initialValues: ['test-id-124', 'test-id-127'],
    packageOptions: packageOptions,
    draftSubmissionId: draftSubmission.id,
}
