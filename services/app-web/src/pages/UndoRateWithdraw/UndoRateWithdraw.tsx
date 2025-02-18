import React, { useEffect, useState } from 'react'
import styles from './UndoRateWithdraw.module.scss'
import { ActionButton, Breadcrumbs } from '../../components'
import { useFetchRateQuery } from '../../gen/gqlClient'
import { ErrorOrLoadingPage } from '../StateSubmission'
import { handleAndReturnErrorState } from '../StateSubmission/ErrorOrLoadingPage'
import { RoutesRecord } from '@mc-review/constants'
import { useNavigate, useParams } from 'react-router-dom'
import {
    ButtonGroup,
    Form,
    FormGroup,
    Label,
    Textarea,
} from '@trussworks/react-uswds'
import { PageActionsContainer } from '../StateSubmission/PageActions'
import { usePage } from '../../contexts/PageContext'
import { GenericErrorPage } from '../Errors/GenericErrorPage'

export const UndoRateWithdraw = () => {
    const { id } = useParams() as { id: string }
    const { updateHeading } = usePage()
    const navigate = useNavigate()
    const [rateName, setRateName] = useState<string | undefined>(undefined)
    const { data, loading, error } = useFetchRateQuery({
        variables: {
            input: {
                rateID: id,
            },
        },
    })

    const rate = data?.fetchRate.rate

    useEffect(() => {
        updateHeading({ customHeading: rateName })
    }, [rateName, updateHeading])

    if (loading) {
        return <ErrorOrLoadingPage state="LOADING" />
    } else if (error) {
        return <ErrorOrLoadingPage state={handleAndReturnErrorState(error)} />
    } else if (!rate || !rate.packageSubmissions) {
        return <GenericErrorPage />
    }
    const rateRev = rate?.packageSubmissions?.[0]?.rateRevision
    const rateCertificationName =
        rateRev?.formData.rateCertificationName ?? undefined

    if (rateCertificationName && rateName !== rateCertificationName) {
        setRateName(rateCertificationName)
    }

    return (
        <div className={styles.undoRateWithdrawContainer}>
            <Breadcrumbs
                className="usa-breadcrumb--wrap"
                items={[
                    {
                        link: RoutesRecord.DASHBOARD_RATES,
                        text: 'Dashboard',
                    },
                    { link: `/rates/${id}`, text: rateCertificationName || '' },
                    {
                        text: 'Undo withdraw',
                        link: RoutesRecord.UNDO_RATE_WITHDRAW,
                    },
                ]}
            />
            <Form
                id="UndoRateWithdrawForm"
                className={styles.formContainer}
                aria-label="Undo rate withdraw"
                aria-describedby="form-guidance"
                onSubmit={(e) => {
                    return e
                }}
            >
                <fieldset className="usa-fieldset">
                    <h2>Undo withdraw</h2>
                    <FormGroup className="margin-top-0">
                        <Label
                            htmlFor="rateWithdrawReason"
                            className="margin-bottom-0 text-bold"
                        >
                            Reason for change
                        </Label>
                        <p className="margin-bottom-0 margin-top-05 usa-hint">
                            Required
                        </p>
                        <p className="margin-bottom-0 margin-top-05 usa-hint">
                            Provide a reason for this change. Clicking 'Undo
                            withdraw' will move the rate back to the status of
                            Submitted.
                        </p>
                        <Textarea
                            name="undoWithdrawReason"
                            id="undoWithdrawReason"
                            data-testid="undoWithdrawReason"
                            aria-labelledby="undoWithdrawReason"
                            aria-required
                        ></Textarea>
                    </FormGroup>
                </fieldset>
                <PageActionsContainer>
                    <ButtonGroup type="default">
                        <ActionButton
                            type="button"
                            variant="outline"
                            data-testid="page-actions-left-secondary"
                            parent_component_type="page body"
                            link_url={`/rates/${id}`}
                            onClick={() => navigate(`/rates/${id}`)}
                        >
                            Cancel
                        </ActionButton>
                        <ActionButton
                            type="submit"
                            variant="default"
                            data-testid="page-actions-right-primary"
                            parent_component_type="page body"
                            link_url={`/rates/${id}`}
                            animationTimeout={1000}
                        >
                            Undo Withdraw
                        </ActionButton>
                    </ButtonGroup>
                </PageActionsContainer>
            </Form>
        </div>
    )
}
