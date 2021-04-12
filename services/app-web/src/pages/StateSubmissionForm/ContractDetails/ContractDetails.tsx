import { GridContainer } from '@trussworks/react-uswds'
import PageHeading from '../../../components/PageHeading'

export const ContractDetails = ({
    code,
}: {
    code: string
}): React.ReactElement => {
    return (
        <GridContainer>
            <PageHeading headingLevel="h2"> Contract details </PageHeading>
        </GridContainer>
    )
}
