import React, { useState } from 'react'
import classnames from 'classnames'

import styles from './Tabs.module.scss'
import { useNavigate } from 'react-router-dom'

type TabsProps = {
    defaultActiveTab?: string
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5'
    children: React.ReactElement[] // TabPanels
} & JSX.IntrinsicElements['div']

export const Tabs = ({
    defaultActiveTab,
    headingLevel = 'h3',
    children,
    ...tabProps
}: TabsProps): React.ReactElement => {
    const navigate = useNavigate()
    const Heading = headingLevel
    const tabs = children.map((child) => ({
        id: child.props.id,
        name: child.props.tabName,
        route: child.props.nestedRoute,
    }))
    const [activeTab, setActiveTab] = useState(defaultActiveTab || tabs[0].name)
    const adjustContentWithRoutes = tabs[0].route
    return (
        <div className={styles['easi-tabs']} data-testid="tabs" {...tabProps}>
            <div className={styles['easi-tabs__navigation']}>
                <ul className={styles['easi-tabs__tab-list']} role="tablist">
                    {tabs.map((tab) => (
                        <li
                            key={tab.id}
                            className={classnames(styles['easi-tabs__tab'], {
                                [styles['easi-tabs__tab--selected']]:
                                    activeTab === tab.name,
                            })}
                            role="tab"
                            aria-selected={activeTab === tab.name}
                        >
                            <Heading className={styles['easi-tabs__tab-btn']}>
                                <button
                                    type="button"
                                    className={styles['easi-tabs__tab-btn']}
                                    aria-controls={tab.id}
                                    onClick={() => {
                                        if (tab.route) navigate(tab.route)
                                        setActiveTab(tab.name)
                                    }}
                                >
                                    <span
                                        className={
                                            styles['easi-tabs__tab-text']
                                        }
                                    >
                                        {tab.name}
                                    </span>
                                </button>
                            </Heading>
                        </li>
                    ))}
                </ul>
            </div>
            {React.Children.map(children, (child) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                if (child && child?.props.tabName === activeTab) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    return React.cloneElement(child, {
                        isActive: true,
                    })
                }
                // if we are displaying traditional HTML tabs, everything is on page with initial render
                // if we are adjusting tab content based on route, only the active tab should have content
                return adjustContentWithRoutes ? null : child
            })}
        </div>
    )
}

export default Tabs
