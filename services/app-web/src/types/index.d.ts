/* eslint-disable @typescript-eslint/no-explicit-any */
export {}

declare global {
    interface Window {
        utag_cfg_ovrd: {
            noview?: boolean
        }
        utag: {
            view: (data?: any) => void
            link: (data?: any) => void
        }
    }
}
