import { getParameterStore } from '../../awsParameterStore'

export const getCmsDevTeamHelpEmail = async (): Promise<
    string[] | string | Error
> => {
    return await getParameterStore(`/configuration/email/devTeamHelpAddress`)
}

export const getCmsDevTeamHelpEmailLocal = async (): Promise<string | Error> =>
    `"CMS Dev Team Help" <CMS.dev.team.help@example.com>`
