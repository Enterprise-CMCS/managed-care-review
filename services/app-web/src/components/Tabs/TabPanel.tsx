import React from 'react'
import classnames from 'classnames'

import styles from './Tabs.module.scss'

type TabPanelProps = {
    id: string
    tabName: string
    children: React.ReactNode
    nestedRoute?: string //relevant if we are dynamically changing URL on click
    isActive?: boolean
}

/**
 * TabPanel is a compound component. TabPanel MUST BE a direct child of Tabs.
 * The `isActive` prop isn't passed in declaratively. `isActive` is passed
 * from the Tabs render from the React.Children cloneElement.
 */
export const TabPanel = ({
    id,
    tabName,
    isActive,
    children,
}: TabPanelProps): React.ReactElement => {
    if (isActive) {
        return (
            <div
                id={id}
                className={styles['easi-tabs__tab-panel']}
                role="tabpanel"
                data-tabname={tabName}
            >
                {children}
            </div>
        )
    }
    return (
        <div
            id={id}
            className={classnames(
                styles['easi-tabs__tab-panel'],
                styles['easi-only-print']
            )}
            data-tabname={tabName}
        >
            {children}
        </div>
    )
}
