import { StoryFn } from '@storybook/react'
import { Formik } from 'formik'
import {
    fetchCurrentUserMock,
    mockMNState,
    mockValidStateUser,
} from '@mc-review/mocks'
import { ProgramSelect, ProgramSelectPropType } from './ProgramSelect'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import { useStatePrograms } from '../../../hooks/useStatePrograms'

export default {
    title: 'Components/Select/ProgramSelect',
    component: ProgramSelect,
}

const deprecatedProgram = {
    id: 'deprecated-program-id',
    name: 'Legacy Program',
    fullName: 'Legacy Program Full Name',
    isRateProgram: false,
    isDeprecated: true,
    deprecatedByProgramId: null,
}

const mnState = mockMNState()

const stateUserWithDeprecatedProgram = mockValidStateUser({
    state: {
        ...mnState,
        programs: [...mnState.programs, deprecatedProgram],
    },
})

// Wait for the user (and thus state programs) to load before rendering
// ProgramSelect, because react-select captures defaultValue at mount time.
const ProgramSelectWithReadyState = (args: ProgramSelectPropType) => {
    const programs = useStatePrograms()
    if (programs.length === 0) {
        return <div>Loading programs...</div>
    }
    return <ProgramSelect {...args} />
}

const Template: StoryFn<ProgramSelectPropType> = (args) => (
    <div style={{ width: '600px', height: '300px', padding: '2rem' }}>
        <Formik
            initialValues={{ programSelect: args.programIDs }}
            onSubmit={() => undefined}
        >
            <form>
                <ProgramSelectWithReadyState {...args} />
            </form>
        </Formik>
    </div>
)

export const Default = Template.bind({})
Default.args = {
    name: 'programSelect',
    programIDs: ['ea16a6c0-5fc6-4df8-adac-c627e76660ab', deprecatedProgram.id],
    contractProgramsOnly: true,
}
Default.decorators = [
    (StoryFn) =>
        ProvidersDecorator(StoryFn, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: stateUserWithDeprecatedProgram,
                        statusCode: 200,
                    }),
                ],
            },
        }),
]
