import { Formik } from 'formik'
import { LinkYourRates } from './LinkYourRates'

export default {
    title: 'Components/LinkYourRates',
    component: LinkYourRates,
}

export const LinkRates = (): React.ReactElement => {
    return (
        <Formik
            initialValues={{ ratePreviouslySubmitted: '' }}
            onSubmit={(values) => console.info('submitted', values)}
        >
            <form>
                <LinkYourRates fieldNamePrefix="rateForms.1" index={1} />
            </form>
        </Formik>
    )
}
