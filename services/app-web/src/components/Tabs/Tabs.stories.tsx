import React from 'react'
import { Tabs } from './Tabs'
import { TabPanel } from './TabPanel'
import ProvidersDecorator from '../../../.storybook/providersDecorator'

export default {
    title: 'Components/Tabs',
    component: Tabs,
    subcomponents: { TabPanel },
    parameters: {
        backgrounds: {
            default: 'dark',
        },
        componentSubtitle:
            "Tabs are a secondary navigation pattern, allowing a user to view only the content they're interested in. Adapted from CMS Design System and CMSgov/easi-app",
    },
    decorators: [ProvidersDecorator],
}

export const Default = (): React.ReactElement => {
    return (
        <Tabs>
            <TabPanel id="Test-Pepperoni" tabName="Pepperoni">
                <h1>Pepperoni</h1>
                <p>
                    Great Pizza! A tale of two pizzas. Pizza now and in the
                    future.
                </p>
            </TabPanel>
            <TabPanel id="Test-Sausage" tabName="Sausage">
                <h1>Sausage</h1>
                <p>Great Pizza!</p>
            </TabPanel>
            <TabPanel id="Test-Mushroom" tabName="Mushroom">
                <h1>Mushroom</h1>
                <p>Great Pizza!</p>
            </TabPanel>
            <TabPanel id="Test-Bacon" tabName="Bacon">
                <h1>Bacon</h1>
                <p>Great Pizza!</p>
                <p>
                    Great Pizza! A tale of two pizzas. Pizza now and in the
                    future.
                </p>
                <p>
                    Great Pizza! A tale of two pizzas. Pizza now and in the
                    future.
                </p>
            </TabPanel>
        </Tabs>
    )
}

export const CustomDefaultTab = (): React.ReactElement => {
    return (
        <Tabs>
            <TabPanel id="Test-Pepperoni" tabName="Pepperoni">
                <h1>Pepperoni</h1>
                <p>
                    Great Pizza! A tale of two pizzas. Pizza now and in the
                    future.
                </p>
            </TabPanel>
            <TabPanel id="Test-Sausage" tabName="Sausage">
                <h1>Sausage</h1>
                <p>Great Pizza!</p>
            </TabPanel>
            <TabPanel id="Test-Mushroom" tabName="Mushroom">
                <h1>Mushroom</h1>
                <p>Great Pizza!</p>
            </TabPanel>
            <TabPanel id="Test-Bacon" tabName="Bacon">
                <h1>Bacon</h1>
                <p>Great Pizza!</p>
                <p>
                    Great Pizza! A tale of two pizzas. Pizza now and in the
                    future.
                </p>
                <p>
                    Great Pizza! A tale of two pizzas. Pizza now and in the
                    future.
                </p>
            </TabPanel>
        </Tabs>
    )
}
CustomDefaultTab.storyName = 'w/ custom default tab selected'
