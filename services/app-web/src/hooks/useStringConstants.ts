export const useStringConstants = () => {
    // Keep this hook around, incase we need to feature flag any other copy changes.
    const SUPPORT_ADDRESS = 'MC_Review_HelpDesk@cms.hhs.gov'

    return {
        MAIL_TO_SUPPORT: SUPPORT_ADDRESS,
        MAIL_TO_SUPPORT_HREF: `mailto: ${SUPPORT_ADDRESS}, mc-review-team@truss.works`,
    }
}
