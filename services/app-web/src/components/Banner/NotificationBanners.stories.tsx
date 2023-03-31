import {
    PreviousSubmissionBanner,
    QuestionResponseSubmitBanner,
    SubmissionUnlockedBanner,
    SubmissionUpdatedBanner,
} from './'

export default {
    title: 'Global/Banners/Notification',
}

export const Notification = (): React.ReactElement => (
    <div className="sb-padded">
        <PreviousSubmissionBanner link="#fakeLink" />
        <SubmissionUpdatedBanner
            submittedBy="Loremipsum@email.com"
            updatedOn={new Date()}
            changesMade="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet."
        />
        <SubmissionUnlockedBanner
            userType="STATE_USER"
            unlockedBy="Loremipsum@email.com"
            unlockedOn={new Date()}
            reason="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Curabitur."
        />
        <SubmissionUnlockedBanner
            userType="CMS_USER"
            unlockedBy="Loremipsum@email.com"
            unlockedOn={new Date()}
            reason="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Curabitur."
        />
        <SubmissionUpdatedBanner
            submittedBy="Loremipsum@email.com"
            updatedOn={new Date()}
            changesMade="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet."
        />
        <QuestionResponseSubmitBanner submitType="question" />
        <QuestionResponseSubmitBanner submitType="response" />
    </div>
)
