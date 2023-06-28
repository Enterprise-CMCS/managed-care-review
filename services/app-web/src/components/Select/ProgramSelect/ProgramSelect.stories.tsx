import { Story } from '@storybook/react'
import { ProgramSelect, ProgramSelectPropType } from './ProgramSelect'

export default {
    title: 'Components/Select/ProgramSelect',
    component: ProgramSelect,
}

export const Default: Story<ProgramSelectPropType> = () => (
    <ProgramSelect
        name="programSelect"
        programIDs={['ea16a6c0-5fc6-4df8-adac-c627e76660ab']}
    />
)
