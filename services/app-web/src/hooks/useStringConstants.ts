export const useStringConstants = (
    supportAddress = 'MC_Review_HelpDesk@cms.hhs.gov'
) => {
    // Keep this hook around, incase we need to feature flag any other copy changes.
    return {
        MAIL_TO_SUPPORT: supportAddress,
        MAIL_TO_SUPPORT_HREF: `mailto:${supportAddress}`,
    }
}
