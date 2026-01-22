import React, { useLayoutEffect } from 'react'
import stylesForm from '../../StateSubmissionForm.module.scss'
import stylesSideNav from '../../../SubmissionSideNav/SubmissionSideNav.module.scss'
import { FormContainer } from '../../../../components'
import { SubmissionType } from '../SubmissionType'
import { GridContainer } from '@trussworks/react-uswds'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { usePage } from '../../../../contexts/PageContext'

export const NewStateSubmissionForm = (): React.ReactElement => {
    /**
     * Updates header text for new health plan submissions.
     * Placed here instead of routes.ts because EQRO flag affects whether
     * this page shows header text, and routes.ts can't be feature flagged.
     * Remove when EQRO flag is removed.
     */
    const ldClient = useLDClient()
    const { updateHeading } = usePage()
    const showEqroSubmissions: boolean = ldClient?.variation(
        featureFlags.EQRO_SUBMISSIONS.flag,
        featureFlags.EQRO_SUBMISSIONS.defaultValue
    )

    useLayoutEffect(() => {
        if (!showEqroSubmissions) {
            // Show header text when EQRO flag is off
            updateHeading({ customHeading: 'New submission' })
        }
    }, [showEqroSubmissions, updateHeading])

    return (
        <div className={stylesSideNav.backgroundForm}>
            <GridContainer className={stylesSideNav.container}>
                <div className={stylesForm.formPage}>
                    <FormContainer id="new-submission">
                        <SubmissionType />
                    </FormContainer>
                </div>
            </GridContainer>
        </div>
    )
}
