
import { User } from '../gen/gqlClient'

type TealiumEvent =
    | 'search'
    | 'submission_view'
    | 'user_login'
    | 'user_logout'
    | 'save_draft'
    | 'button_engagement'
    | 'internal_link_clicked'
    | 'navigation_clicked'
    | 'external_link_click'
    | 'back_button'
    | 'dropdown_selection'
    | 'filters_applied'
    | 'filter_removed'
    | 'inline_error'
    | 'alert_impression'
    | 'radio_button_list_selected'
    | 'checkbox_selected'
    | 'checkbox_unselected'
    | 'accordion_opened'
    | 'accordion_closed'
    |  'form_field_submit'
    | 'header_click'
    | 'contact_click'
    | 'file_download'

type TealiumEnv =
    | 'prod'
    | 'qa'
    | 'dev'

type ButtonEventStyle =
    | 'default'
    | 'primary'
    | 'success'
    | 'secondary'
    | 'outline'
    | 'unstyled'

type ButtonEventType =
    | 'submit'
    | 'link'
    | 'reset'
    | 'button'

type ButtonEventParentComponentType =
    | 'help drawer'
    | 'card'
    | 'modal'
    | 'overlay'
    | 'toggle'
    | 'page body'
    | 'constant header'

type LinkEventParentComponentType =
    | 'card'
    | 'modal'
    | 'help drawer'
    | 'resource-tray'
    | 'app page'
    | 'top navigation'

type TealiumDataObject = {
    content_language: string
    content_type: string
    page_name: string
    page_path: string
    site_domain: 'cms.gov'
    site_environment: string
    logged_in: 'true' | 'false'
    role?: string // loose types for now, once this is implemented in tealium we can narrow to specific roles
    tealium_event?: TealiumEvent // this is required by tealium, TBD what allowed values are here, usually this is supposed to be configured first .
}

type TealiumButtonEventObject = {
    event_name: 'button_engagement' | 'header_click',
    text: string
    link_type?: 'link_other'
    button_style?: ButtonEventStyle
    button_type?: ButtonEventType | string
    parent_component_heading?: string
    parent_component_type?: ButtonEventParentComponentType | string
    link_url?: string
    event_extension?: string
}

type TealiumDropdownSelectionEventObject = {
    event_name: 'dropdown_selection'
    heading?: string
    text: string
    link_type?: string
}

type TealiumLinkEventObject = {
    event_name: 'internal_link_clicked' | "navigation_clicked" | "back_button" | "external_link_click" | 'contact_click' | 'file_download',
    text: string
    link_url: string
    link_type?: 'link_other' | 'link_external' | 'interaction' | 'download' | 'exit'
    contact_method?: 'phone' | 'email' // only relevant for contact click
    parent_component_heading?: string
    parent_component_type?: LinkEventParentComponentType | string
}

type TealiumFilterAppliedType = {
    event_name: 'filters_applied'
    search_result_count: string
    link_type?: 'link_other' | 'link_download'
    results_count_after_filtering: string
    results_count_prior_to_filtering: string
    filter_categories_used: string
}

type TealiumFilterRemovedType = {
    event_name: 'filter_removed'
    search_result_count: string
    link_type?: 'link_other'
    filter_categories_used: string
}

type TealiumInlineErrorObject = {
    event_name: 'inline_error'
    error_type: 'validation' | 'system'
    error_message: string
    error_code?: string
    form_field_label: string
    link_type?: 'link_other'
}

type TealiumAlertImpressionObject = {
    event_name: 'alert_impression'
    error_type: 'validation' | 'system'
    error_message: string
    error_code?: string
    heading: string
    type: 'alert' | 'warn' | 'error'
    extension?: string
}

type TealiumRadioButtonEventObject = {
    event_name: 'radio_button_list_selected'
    radio_button_title: string
    list_position: number
    list_options: number
    link_type?: 'link_other'
    parent_component_heading?: string
    parent_component_type?: string
    field_type: 'optional' | 'required'
    form_fill_status: boolean
}

type TealiumCheckboxEventObject = {
    event_name: 'checkbox_selected' | 'checkbox_unselected'
    text: string
    heading: string
    parent_component_heading?: string
    parent_component_type?: string
    field_type: 'optional' | 'required'
}

type TealiumAccordionEventObject = {
    event_name: 'accordion_opened' | 'accordion_closed'
    heading: string
    link_type: 'link_other'
}

type TealiumFormFilledEventObject = {
    event_name: 'form_field_filled'
    form_name: string
    form_field_label: string
    field_type: 'optional' | 'required'
    form_fill_status: boolean,
    link_type: 'link_other'
}


type TealiumFilterEventObject = (
    TealiumFilterAppliedType | TealiumFilterRemovedType
)

type TealiumInteractionEventDataObject = {
    tealium_event: TealiumEvent // event is required for user tracking links
} & Partial<TealiumDataObject>

type TealiumViewDataObject = TealiumDataObject // event default to page_view in useTealium hook

type TealiumEventObjectTypes = (
    | TealiumButtonEventObject
    | TealiumLinkEventObject
    | TealiumDropdownSelectionEventObject
    | TealiumFilterEventObject
    | TealiumInlineErrorObject
    | TealiumAlertImpressionObject
    | TealiumCheckboxEventObject
    | TealiumRadioButtonEventObject
    | TealiumAccordionEventObject
    ) & Partial<TealiumDataObject>

type TealiumClientType = {
    initializeTealium: () => void
    logUserEvent: (
        linkData: TealiumEventObjectTypes,
        pathname: string,
        loggedInUser?: User,
        heading?: string | React.ReactElement
    ) => void
    logPageView: (
        pathname: string,
        loggedInUser?: User,
        heading?: string | React.ReactElement
    ) => void
}

export type {
    TealiumInteractionEventDataObject,
    TealiumViewDataObject,
    TealiumEvent,
    TealiumButtonEventObject,
    TealiumLinkEventObject,
    TealiumEventObjectTypes,
    TealiumClientType,
    TealiumEnv,
    ButtonEventStyle,
    TealiumDropdownSelectionEventObject,
    TealiumFilterEventObject,
    TealiumInlineErrorObject,
    TealiumAlertImpressionObject,
    TealiumRadioButtonEventObject,
    TealiumCheckboxEventObject,
    TealiumAccordionEventObject,
    TealiumFormFilledEventObject,
}
