import React, { useState } from 'react'
import classnames from 'classnames'

import styles from './Tabs.module.scss'
import { useNavigate } from 'react-router-dom'

type TabsProps = {
    defaultActiveTab?: string
    children: React.ReactElement[] // TabPanels
} & JSX.IntrinsicElements['div']

export const Tabs = ({
    defaultActiveTab,
    children,
    ...tabProps
}: TabsProps): React.ReactElement => {
    const navigate = useNavigate()

    const tabs = children.map((child) => ({
        id: child.props.id,
        name: child.props.tabName,
        route: child.props.nestedRoute,
    }))
    const [activeTab, setActiveTab] = useState(defaultActiveTab || tabs[0].name)

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
                        >
                            <button
                                type="button"
                                className={styles['easi-tabs__tab-btn']}
                                // aria-selected={activeTab === tab.name}
                                aria-controls={tab.id}
                                onClick={() => {
                                    if (tab.route) navigate(tab.route)
                                    setActiveTab(tab.name)
                                }}
                            >
                                <span className={styles['easi-tabs__tab-text']}>
                                    {tab.name}
                                </span>
                            </button>
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
                return child
            })}
        </div>
    )
}

export default Tabs
