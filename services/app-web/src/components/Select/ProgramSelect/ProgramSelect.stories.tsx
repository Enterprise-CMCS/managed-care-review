import { Story } from '@storybook/react'
import { ProgramSelect, ProgramSelectPropType } from './ProgramSelect'
import { mockMNState } from '../../../testHelpers/apolloHelpers'

export default {
    title: 'Components/Select/ProgramSelect',
    component: ProgramSelect,
}

const statePrograms = mockMNState().programs

export const Default: Story<ProgramSelectPropType> = () => (
    <ProgramSelect
        name="programSelect"
        statePrograms={statePrograms}
        programIDs={['ea16a6c0-5fc6-4df8-adac-c627e76660ab']}
    />
)
