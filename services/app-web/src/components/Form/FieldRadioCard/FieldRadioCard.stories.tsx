import { Formik } from 'formik'
import { FieldRadioCard } from './FieldRadioCard'

export default {
    title: 'Components/Forms/FieldRadioCard',
    component: FieldRadioCard,
}

const radioOptions = [
    {
        name: 'contractType',
        id: 'healthPlan',
        label: 'Health plan',
        list_position: 1,
        list_options: 2,
        radio_button_title: 'Health plan',
        parent_component_heading: 'Contract type',
        labelDescription:
            'Submit Medicaid and CHIP managed care health plan base contracts, contract amendments, and rates.',
    },
    {
        name: 'contractType',
        id: 'eqro',
        label: 'External Quality Review Organization (EQRO)',
        list_position: 2,
        list_options: 2,
        radio_button_title: 'External Quality Review Organization (EQRO)',
        parent_component_heading: 'Contract type',
        labelDescription:
            'Submit base contracts and amendments to base contracts between your state and an EQRO.',
    },
]

export const Default = (): React.ReactElement => (
    <div style={{ padding: '3rem' }}>
        <Formik
            initialValues={{
                contractType: undefined,
            }}
            onSubmit={(e) => console.info('submitted')}
        >
            <FieldRadioCard {...radioOptions[0]} />
        </Formik>
    </div>
)

export const WithTwoRadioCards = (): React.ReactElement => (
    <div style={{ padding: '3rem' }}>
        <Formik
            initialValues={{
                contractType: undefined,
            }}
            onSubmit={(e) => console.info('submitted')}
        >
            <div>
                <FieldRadioCard {...radioOptions[0]} />
                <br />
                <FieldRadioCard {...radioOptions[1]} />
            </div>
        </Formik>
    </div>
)
