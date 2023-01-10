import React from 'react'
import { DataDetail, DataDetailContactField, DataDetailDateRange } from './'

export default {
    title: 'Components/DataDetail',
    component: DataDetail,
    parameters: {
        componentSubtitle:
            'DataDetail displays definition terms and descriptions using semantic HTML. This is useful for summarizing static data.',
    },
}

export const WithString = (): React.ReactElement => (
    <dl>
        <DataDetail
            id="rainfall"
            label="Average rainfall in May"
            data="31.58 inches"
        />
    </dl>
)

export const WithMissingField = (): React.ReactElement => (
    <dl>
        <DataDetail
            id="crystal-ball"
            label="The secret to the future"
            data={undefined}
            explainMissingData
        />
    </dl>
)

export const WithCheckboxList = (): React.ReactElement => (
    <dl>
        <DataDetail
            id="crystal-ball"
            label="The secret to the future"
            data={['THIS', 'THAT', 'THE_OTHER']}
        />
    </dl>
)

export const WithDataRange = (): React.ReactElement => (
    <dl>
        <DataDetail
            id="vip"
            label="Very important person"
            data={
                <DataDetailDateRange
                    startDate={new Date(Date.UTC(2022, 5, 21))}
                    endDate={new Date(Date.UTC(2022, 5, 22))}
                />
            }
        />
    </dl>
)

export const WithContact = (): React.ReactElement => (
    <dl>
        <DataDetail
            id="vip"
            label="Very important person"
            data={
                <DataDetailContactField
                    contact={{
                        name: 'Bob',
                        titleRole: 'Loblaw Law',
                        email: 'bob@example.com',
                    }}
                />
            }
        />
    </dl>
)
