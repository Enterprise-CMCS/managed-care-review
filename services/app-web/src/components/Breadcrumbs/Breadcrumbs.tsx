import {
    BreadcrumbBar,
    Breadcrumb,
    BreadcrumbLink,
} from '@trussworks/react-uswds'
import styles from './Breadcrumbs.module.scss'

type BreadcrumbItem = {
    text: string
    link?: string
}
export type BreadcrumbsProps = {
    items: BreadcrumbItem[]
}

const Crumb = (crumb: BreadcrumbItem) => {
    const { link, text } = crumb
    if (link) {
        return (
            <Breadcrumb>
                <BreadcrumbLink href={link}>
                    <span>{text}</span>
                </BreadcrumbLink>
            </Breadcrumb>
        )
    } else {
        return (
            <Breadcrumb>
                <span>{text}</span>
            </Breadcrumb>
        )
    }
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
