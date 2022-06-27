import { screen, render, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Form, Formik } from 'formik'
import { FieldYesNo } from './FieldYesNo'

describe('FieldYesNo component', () => {
    it('renders without errors', () => {
        render(
            <Formik
                initialValues={{}}
                onSubmit={(values) => console.log('submitted', values)}
            >
                <Form>
                    <FieldYesNo
                        name="submissionType"
                        showError={true}
                        id="contractOnly"
                        label="Executed contract action only"
                    />
                </Form>
            </Formik>
        )
        expect(
            screen.getByText('Executed contract action only')
        ).toBeInTheDocument()
        expect(screen.getByLabelText('Yes')).toBeInTheDocument()
        expect(screen.getByLabelText('No')).toBeInTheDocument()
    })

    it('renders as checked on initial values', () => {
        const initialValues = {
            modifiedBenefitsProvided: undefined,
            modifiedGeoArea: 'YES',
            modifiedSomething: 'NO',
        }

        render(
            <Formik
                initialValues={initialValues}
                onSubmit={(values) => console.log('submitted', values)}
            >
                <Form>
                    <FieldYesNo
                        name="modifiedBenefitsProvided"
                        id="modifiedBenefitsProvided"
                        showError={false}
                        aria-required
                        label="Benefits provided by the managed care plans"
                    />
                    <FieldYesNo
                        name="modifiedGeoArea"
                        id="modifiedGeoArea"
                        showError={false}
                        aria-required
                        label="Geographic areas served by the managed care plans"
                    />
                    <FieldYesNo
                        name="modifiedSomething"
                        id="modifiedSomething"
                        showError={false}
                        aria-required
                        label="Medicaid beneficiaries served by the managed care plans (e.g. eligibility or enrollment criteria)"
                    />
                </Form>
            </Formik>
        )

        const benefits = screen.getByText(
            'Benefits provided by the managed care plans'
        ).parentElement
        const geo = screen.getByText(
            'Geographic areas served by the managed care plans'
        ).parentElement
        const something = screen.getByText(
            'Medicaid beneficiaries served by the managed care plans (e.g. eligibility or enrollment criteria)'
        ).parentElement

        if (!(benefits && geo && something)) {
            throw new Error('these parents should all exist')
        }

        // The correct Yes or No or neither should be checked based on the initial values
        expect(within(benefits).getByLabelText('Yes')).not.toBeChecked()
        expect(within(benefits).getByLabelText('No')).not.toBeChecked()

        expect(within(geo).getByLabelText('Yes')).toBeChecked()
        expect(within(geo).getByLabelText('No')).not.toBeChecked()

        expect(within(something).getByLabelText('Yes')).not.toBeChecked()
        expect(within(something).getByLabelText('No')).toBeChecked()
    })

    it('sets and saves the expected values', async () => {
        const initialValues = {
            modifiedBenefitsProvided: '',
            modifiedGeoArea: 'YES',
            modifiedSomething: 'NO',
        }

        let submittedValues: unknown | undefined = undefined

        render(
            <Formik
                initialValues={initialValues}
                onSubmit={(values) => {
                    submittedValues = values
                }}
            >
                <Form>
                    <FieldYesNo
                        name="modifiedBenefitsProvided"
                        id="modifiedBenefitsProvided"
                        showError={false}
                        aria-required
                        label="Benefits provided by the managed care plans"
                    />
                    <FieldYesNo
                        name="modifiedGeoArea"
                        id="modifiedGeoArea"
                        showError={false}
                        aria-required
                        label="Geographic areas served by the managed care plans"
                    />
                    <FieldYesNo
                        name="modifiedSomething"
                        id="modifiedSomething"
                        showError={false}
                        aria-required
                        label="Medicaid beneficiaries served by the managed care plans (e.g. eligibility or enrollment criteria)"
                    />
                    <button type="submit">Submit</button>
                </Form>
            </Formik>
        )

        const benefits = screen.getByText(
            'Benefits provided by the managed care plans'
        ).parentElement
        const geo = screen.getByText(
            'Geographic areas served by the managed care plans'
        ).parentElement
        const something = screen.getByText(
            'Medicaid beneficiaries served by the managed care plans (e.g. eligibility or enrollment criteria)'
        ).parentElement

        if (!(benefits && geo && something)) {
            throw new Error('these parents should all exist')
        }

        // Click Yes for benefits and No for geo
        void (await userEvent.click(within(benefits).getByLabelText('Yes')))
        void (await userEvent.click(within(geo).getByLabelText('No')))

        // The correct Yes or No or neither should be checked
        await waitFor(() => {
            expect(within(benefits).getByLabelText('Yes')).toBeChecked()
            expect(within(benefits).getByLabelText('No')).not.toBeChecked()

            expect(within(geo).getByLabelText('Yes')).not.toBeChecked()
            expect(within(geo).getByLabelText('No')).toBeChecked()

            expect(within(something).getByLabelText('Yes')).not.toBeChecked()
            expect(within(something).getByLabelText('No')).toBeChecked()
        })

        void (await userEvent.click(
            screen.getByRole('button', { name: 'Submit' })
        ))

        await waitFor(() => {
            expect(submittedValues).toEqual({
                modifiedBenefitsProvided: 'YES',
                modifiedGeoArea: 'NO',
                modifiedSomething: 'NO',
            })
        })
    })
})
