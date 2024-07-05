import { TealiumClientType } from '../constants/tealium';

export const tealiumTestClient = (): TealiumClientType => {
    return {
        logUserEvent: () => {
            return
        },
        logPageView: () => {
            return
        },
    }
}
