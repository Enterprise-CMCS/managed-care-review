import { BreadcrumbBar, Breadcrumb, Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
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
                <Link asCustom={NavLink} to={link} end>
                    <span>{text}</span>
                </Link>
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
