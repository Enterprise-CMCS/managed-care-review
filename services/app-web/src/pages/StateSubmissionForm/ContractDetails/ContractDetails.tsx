import { GridContainer, Button, Link } from '@trussworks/react-uswds'
import { NavLink, useHistory } from 'react-router-dom'
import PageHeading from '../../../components/PageHeading'
import { DraftSubmission } from '../../../gen/gqlClient'

export const ContractDetails = ({
    draftSubmission,
}: {
    draftSubmission: DraftSubmission
}): React.ReactElement => {
    const history = useHistory()

    const handleFormSubmit = () => {
        history.push(`/submissions/${draftSubmission.id}/documents`)
    }
    return (
        <GridContainer>
            <PageHeading headingLevel="h2"> Contract details </PageHeading>
            <Link
                asCustom={NavLink}
                className="usa-button usa-button--outline"
                variant="unstyled"
                to="/dashboard"
            >
                Cancel
            </Link>
            <Button type="button" onClick={handleFormSubmit}>
                Continue
            </Button>
        </GridContainer>
    )
}
