import { InfoTag } from './InfoTag'

export default {
    title: 'Components/InfoTag',
    component: InfoTag,
}

export const Default = (): React.ReactElement => (
    <div className="sb-padded">
        <div>
            <InfoTag color="gold">DRAFT</InfoTag>
            <InfoTag color="blue">UNLOCKED</InfoTag>
            <InfoTag color="green">SUBMITTED</InfoTag>
            <InfoTag color="green" emphasize>
                SUBMITTED
            </InfoTag>
        </div>
        <br /> <br />
        <div>
            <InfoTag color="gold">SHARED</InfoTag>
            <InfoTag color="cyan">NEW</InfoTag>
        </div>
    </div>
)

export const WithSideBySideText = (): React.ReactElement => (
    <div className="sb-padded">
        <InfoTag color="cyan">New</InfoTag>
        <u>A document link</u>
        <p>
            <InfoTag color="gold">SHARED</InfoTag>A paragraph nearby perhaps. It
            is a long established fact that a reader will be distracted by the
            readable content of a page when looking at its layout. The point of
            using Lorem Ipsum is that it has a more-or-less normal distribution
            of letters, as opposed to using 'Content here, content here', making
            it look like readable English. Many desktop publishing packages and
            web page editors now use Lorem Ipsum as their default model text,
            and a search for 'lorem ipsum' will uncover many web sites still in
            their infancy. Various versions have evolved over the years,
            sometimes by accident, sometimes on purpose (injected humour and the
            like).
        </p>
    </div>
)
