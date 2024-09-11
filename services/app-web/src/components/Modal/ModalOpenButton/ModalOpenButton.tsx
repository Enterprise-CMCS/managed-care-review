import React, {ComponentProps} from 'react'
import {
    ModalToggleButton as UswdsModalToggleButton,
    type ModalRef,
} from '@trussworks/react-uswds'
import { useTealium } from '../../../hooks'
import { usePage } from '../../../contexts/PageContext'
import { extractText } from '../../TealiumLogging/tealiamLoggingHelpers'

type ModalOpenButtonProps = {
    id: string,
    modalRef: React.RefObject<ModalRef>,
    children: React.ReactNode
} & ComponentProps<typeof UswdsModalToggleButton>

export const ModalOpenButton = ({
    modalRef,
    id,
    children,
    ...restProps
}: ModalOpenButtonProps): React.ReactElement => {
    const { logButtonEvent } = useTealium()
    const {activeModalID, updateModalID} = usePage()
   const handleOnClick = () => {
        if(activeModalID){
            updateModalID({updatedModalID: id})
        }
        logButtonEvent({
            text: extractText(children),
            button_type: 'button',
            button_style: 'success',
            parent_component_type: 'page body',
        })
   }
    return (
        <UswdsModalToggleButton
        {...restProps}
        modalRef={modalRef}
        data-testid={id}
        id={id}
        onClick={handleOnClick}
        opener
    >
        {children}
    </UswdsModalToggleButton>
    )
}
