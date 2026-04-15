import { StoryFn } from '@storybook/react'
import { Formik } from 'formik'
import {
    fetchCurrentUserMock,
    mockMNState,
    mockValidStateUser,
} from '@mc-review/mocks'
import { ProgramSelect, type ProgramSelectPropType } from './ProgramSelect'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import { useStatePrograms } from '../../../hooks'

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
const firstProgramId = mnState.programs[0].id

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
    const isLoading = programs.length === 0

    return (
        <ProgramSelect
            key={isLoading ? 'loading' : 'ready'}
            {...args}
            isLoading={isLoading}
        />
    )
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
    inputId: 'programSelect',
    'aria-label': 'Programs (required)',
    programIDs: [firstProgramId, deprecatedProgram.id],
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
