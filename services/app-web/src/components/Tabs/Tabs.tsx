import React, { useState } from 'react'
import classnames from 'classnames'

import styles from './Tabs.module.scss'

type TabsProps = {
    defaultActiveTab?: string
    children: React.ReactElement[]
}

export const Tabs = ({
    defaultActiveTab,
    children,
}: TabsProps): React.ReactElement => {
    const tabs = children.map((child) => ({
        id: child.props.id,
        name: child.props.tabName,
    }))
    const [activeTab, setActiveTab] = useState(defaultActiveTab || tabs[0].name)

    return (
        <div className={styles['easi-tabs']} data-testid="tabs">
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
                                onClick={() => setActiveTab(tab.name)}
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
                if (child.props.tabName === activeTab) {
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
