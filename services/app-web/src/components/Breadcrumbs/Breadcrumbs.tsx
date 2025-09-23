import { BreadcrumbBar, Breadcrumb } from '@trussworks/react-uswds'
import styles from './Breadcrumbs.module.scss'
import { NavLinkWithLogging } from '../TealiumLogging'
import classNames from 'classnames'

type BreadcrumbItem = {
    text: string
    link: string
    current?: boolean
}
export type BreadcrumbsProps = {
    items: BreadcrumbItem[]
} & JSX.IntrinsicElements['nav']

const Crumb = (crumb: BreadcrumbItem) => {
    const { link, text, current = false } = crumb
    return (
        <Breadcrumb className={styles.crumb} current>
            {current ? (
                <span>{text}</span>
            ) : (
                <NavLinkWithLogging to={link} end>
                    <span>{text}</span>
                </NavLinkWithLogging>
            )}
        </Breadcrumb>
    )
}

const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => {
    if (items.length === 0) return null
    const classes = classNames(styles.crumbContainer, className)
    return (
        <BreadcrumbBar className={classes}>
            {items.map((item, index) => (
                <Crumb
                    key={index}
                    {...item}
                    current={index === items.length - 1}
                />
            ))}
        </BreadcrumbBar>
    )
}

export { Breadcrumbs }
