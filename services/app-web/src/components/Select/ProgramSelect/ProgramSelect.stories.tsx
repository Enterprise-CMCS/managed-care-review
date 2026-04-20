import { StoryFn } from '@storybook/react'
import { Formik } from 'formik'
import {
    fetchCurrentUserMock,
    mockStateData,
    mockValidStateUser,
} from '@mc-review/mocks'
import { typedStatePrograms } from '@mc-review/submissions'
import { ProgramSelect, type ProgramSelectPropType } from './ProgramSelect'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'
import { useStatePrograms } from '../../../hooks'

type StoryArgs = ProgramSelectPropType & { stateCode: string }

// Only offer states that actually have program data in statePrograms.json.
const stateCodesWithPrograms = typedStatePrograms.states
    .filter((s) => s.programs.length > 0)
    .map((s) => s.code)
    .sort()

export default {
    title: 'Components/Select/ProgramSelect',
    component: ProgramSelect,
    argTypes: {
        stateCode: {
            control: 'select',
            options: stateCodesWithPrograms,
            description:
                'State whose programs are loaded into the mocked user context',
        },
        contractProgramsOnly: {
            name: 'Contract programs only',
            control: 'boolean',
            description:
                'Toggle true for contract programs only, false for all programs. Rate details page display all programs.',
        },
    },
}

const buildStateUser = (stateCode: string) => {
    const state = mockStateData(stateCode)
    if (!stateCode) {
        throw new Error(`${stateCode} not found in state programs data.`)
    }
    return mockValidStateUser({ state })
}

// Wait for the user (and thus state programs) to load before rendering
// ProgramSelect, because react-select captures defaultValue at mount time.
// Re-key on stateCode so switching states forces a remount with fresh options.
const ProgramSelectWithReadyState = ({ stateCode, ...args }: StoryArgs) => {
    const programs = useStatePrograms()
    const isLoading = programs.length === 0

    return (
        <ProgramSelect
            key={`${stateCode}-${isLoading ? 'loading' : 'ready'}`}
            {...args}
            isLoading={isLoading}
        />
    )
}

const Template: StoryFn<StoryArgs> = (args) => (
    <div style={{ width: '600px', height: '300px', padding: '2rem' }}>
        <h2>
            {typedStatePrograms.states.find((s) => s.code === args.stateCode)
                ?.name ?? args.stateCode}
        </h2>
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
    programIDs: [],
    contractProgramsOnly: false,
    stateCode: 'KY',
}
Default.decorators = [
    (StoryFn, context) => (
        // Keying on stateCode remounts MockedProvider with fresh mocks when
        // the user picks a different state from the Storybook control.
        <div key={context.args.stateCode}>
            {ProvidersDecorator(StoryFn, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: buildStateUser(context.args.stateCode),
                            statusCode: 200,
                        }),
                    ],
                },
            })}
        </div>
    ),
]
