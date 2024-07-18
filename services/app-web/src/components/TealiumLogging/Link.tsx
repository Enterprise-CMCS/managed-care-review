import React from 'react'
import { Link } from '@trussworks/react-uswds'
import { NavLink, Link as ReactRouterLink } from 'react-router-dom'
import { NavLinkProps, LinkProps } from 'react-router-dom'
import {
    CustomLinkProps,
    DefaultLinkProps,
} from '@trussworks/react-uswds/lib/components/Link/Link'
import type { TealiumInternalLinkEventObject } from '../../tealium'
import { useTealium } from '../../hooks'
import { extractText } from './tealiamLoggingHelpers'

type TealiumDataType = Omit<
    TealiumInternalLinkEventObject,
    'event_name' | 'link_url' | 'text'
> & { event_name?: TealiumInternalLinkEventObject['event_name'] }

type LinkWithLoggingType = TealiumDataType & DefaultLinkProps
const LinkWithLogging = (props: LinkWithLoggingType) => {
    const { logInternalLinkEvent } = useTealium()
    const {
        parent_component_type,
        parent_component_heading,
        href,
        onClick,
        children,
        ...rest
    } = props
    return (
        <Link
            onClick={(e) => {
                logInternalLinkEvent({
                    text: extractText(children),
                    link_url: href,
                    parent_component_type,
                    parent_component_heading,
                    event_name: props.event_name ?? 'internal_link_clicked',
                })
                if (onClick) {
                    onClick(e)
                }
            }}
            href={href}
            {...rest}
        >
            {children}
        </Link>
    )
}

type NavLinkWithLoggingType = TealiumDataType &
    Omit<CustomLinkProps<NavLinkProps>, 'asCustom'>

const NavLinkWithLogging = (props: NavLinkWithLoggingType) => {
    const { logInternalLinkEvent } = useTealium()
    const {
        to,
        parent_component_type,
        parent_component_heading,
        children,
        ...rest
    } = props

    const link_url = typeof to === 'string' ? to : to.pathname || ''

    return (
        <Link
            asCustom={NavLink}
            to={to}
            onClick={() => {
                logInternalLinkEvent({
                    text: extractText(children),
                    link_url,
                    parent_component_type,
                    parent_component_heading,
                    event_name: props.event_name ?? 'internal_link_clicked',
                })
            }}
            {...rest}
        >
            {children}
        </Link>
    )
}

type ReactRouterLinkWithLoggingType = TealiumDataType &
    Omit<CustomLinkProps<LinkProps>, 'asCustom'>

const ReactRouterLinkWithLogging = (props: ReactRouterLinkWithLoggingType) => {
    const { logInternalLinkEvent } = useTealium()
    const {
        to,
        parent_component_type,
        parent_component_heading,
        children,
        ...rest
    } = props

    const link_url = typeof to === 'string' ? to : to.pathname || ''

    return (
        <Link
            asCustom={ReactRouterLink}
            to={to}
            onClick={() => {
                logInternalLinkEvent({
                    text: extractText(children),
                    link_url,
                    parent_component_type,
                    parent_component_heading,
                    event_name: props.event_name ?? 'internal_link_clicked',
                })
            }}
            {...rest}
        >
            {children}
        </Link>
    )
}

export { NavLinkWithLogging, LinkWithLogging, ReactRouterLinkWithLogging }
