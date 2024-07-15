import { BreadcrumbBar, Breadcrumb } from '@trussworks/react-uswds'
import styles from './Breadcrumbs.module.scss'
import { NavLinkWithLogging } from '../TealiumLogging/Link'

type BreadcrumbItem = {
    text: string
    link: string
}
export type BreadcrumbsProps = {
    items: BreadcrumbItem[]
}

const Crumb = (crumb: BreadcrumbItem) => {
    const { link, text } = crumb
    return (
        <Breadcrumb>
            <NavLinkWithLogging to={link} end>
                <span>{text}</span>
            </NavLinkWithLogging>
        </Breadcrumb>
    )
}

const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
    if (items.length === 0) return null
    return (
        <BreadcrumbBar className={styles.crumbContainer}>
            {items.map((item, index) => (
                <Crumb key={index} {...item} />
            ))}
        </BreadcrumbBar>
    )
}

export { Breadcrumbs }
