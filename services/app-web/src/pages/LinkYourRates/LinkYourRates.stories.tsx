import { Formik } from 'formik'
import { LinkYourRates } from './LinkYourRates'
import ProvidersDecorator from '../../../.storybook/providersDecorator'

export default {
    title: 'Components/LinkYourRates',
    component: LinkYourRates,
    decorators: [ProvidersDecorator],
}

export const LinkRates = (): React.ReactElement => {
    return (
        <Formik
            initialValues={{ ratePreviouslySubmitted: '' }}
            onSubmit={(values) => console.info('submitted', values)}
        >
            <form>
                <LinkYourRates
                    fieldNamePrefix="rateForms.1"
                    index={1}
                    shouldValidate={false}
                    autofill={() => {
                        console.info('autofill rate')
                    }}
                    disableRadioBtns={false}
                />
            </form>
        </Formik>
    )
}
