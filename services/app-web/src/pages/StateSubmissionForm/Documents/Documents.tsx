import { GridContainer } from '@trussworks/react-uswds'
import PageHeading from '../../../components/PageHeading'

export const Documents = ({ code }: { code: string }): React.ReactElement => {
    return (
        <GridContainer>
            <PageHeading headingLevel="h2"> Documents </PageHeading>
        </GridContainer>
    )
}
