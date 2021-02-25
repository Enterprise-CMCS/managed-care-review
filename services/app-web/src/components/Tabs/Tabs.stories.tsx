import React from 'react'
import { Tabs } from './Tabs'
import { TabPanel } from './TabPanel'

export default {
    title: 'Components/Tabs',
    component: Tabs,
}

const TabPanelWrapper: React.FC = ({ children }) => {
    return <div style={{ margin: '10px', height: '500px' }}>{children}</div>
}
export const Default = (): React.ReactElement => {
    return (
        <Tabs>
            <TabPanel id="Test-Pepperoni" tabName="Pepperoni">
                <TabPanelWrapper>
                    <h1>Pepperoni</h1>
                    <p>
                        Great Pizza! A tale of two pizzas. Pizza now and in the
                        future.
                    </p>
                </TabPanelWrapper>
            </TabPanel>
            <TabPanel id="Test-Sausage" tabName="Sausage">
                <TabPanelWrapper>
                    <h1>Sausage</h1>
                    <p>Great Pizza!</p>
                </TabPanelWrapper>
            </TabPanel>
            <TabPanel id="Test-Mushroom" tabName="Mushroom">
                <TabPanelWrapper>
                    <h1>Mushroom</h1>
                    <p>Great Pizza!</p>
                </TabPanelWrapper>
            </TabPanel>
            <TabPanel id="Test-Bacon" tabName="Bacon">
                <TabPanelWrapper>
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
                </TabPanelWrapper>
            </TabPanel>
        </Tabs>
    )
}

export const CustomDefaultTab = (): React.ReactElement => {
    return (
        <Tabs defaultActiveTab="Tab 3">
            <TabPanel id="Test-Tab-1" tabName="Tab 1">
                <h1>Tab 1</h1>
            </TabPanel>
            <TabPanel id="Test-Tab-2" tabName="Tab 2">
                <h1>Tab 2</h1>
            </TabPanel>
            <TabPanel id="Test-Tab-3" tabName="Tab 3">
                <h1>Tab 3</h1>
            </TabPanel>
        </Tabs>
    )
}
CustomDefaultTab.storyName = 'w/ custom default tab selected'
