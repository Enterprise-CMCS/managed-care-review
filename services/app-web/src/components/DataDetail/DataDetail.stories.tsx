import React from 'react'
import { DataDetail } from './DataDetail'

export default {
    title: 'Components/DataDetail',
    component: DataDetail,
}

export const WithString = (): React.ReactElement => (
    <DataDetail
        id="rainfall"
        label="Average rainfall in May"
        data="31.58 inches"
    />
)
export const WithAddress = (): React.ReactElement => (
    <DataDetail
        id="disney"
        label="Disney World Contact Info"
        data={
            <address>
                Mickey Mouse
                <a href="mailto:mickey@disney.com">mickey@disney.com</a>
                <a href="tel:555-555-5555">555-555-5555</a>
            </address>
        }
    />
)
