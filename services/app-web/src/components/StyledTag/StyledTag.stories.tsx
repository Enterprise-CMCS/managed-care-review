import { StyledTag } from './StyledTag'

export default {
    title: 'Components/StyledTag',
    component: StyledTag,
}

export const Default = (): React.ReactElement => (
    <div className="sb-padded">
        <StyledTag color="yellow">DRAFT</StyledTag>
        <StyledTag color="blue">UNLOCKED</StyledTag>
        <StyledTag color="green">SUBMITTED</StyledTag>
    </div>
)

export const WithSideBySideText = (): React.ReactElement => (
    <div className="sb-padded">
        <StyledTag color="blue">New</StyledTag> <u>A document link</u>
        <p>
            <StyledTag color="yellow">SHARED</StyledTag> A paragraph nearby
            perhaps. It is a long established fact that a reader will be
            distracted by the readable content of a page when looking at its
            layout. The point of using Lorem Ipsum is that it has a more-or-less
            normal distribution of letters, as opposed to using 'Content here,
            content here', making it look like readable English. Many desktop
            publishing packages and web page editors now use Lorem Ipsum as
            their default model text, and a search for 'lorem ipsum' will
            uncover many web sites still in their infancy. Various versions have
            evolved over the years, sometimes by accident, sometimes on purpose
            (injected humour and the like).
        </p>
    </div>
)
