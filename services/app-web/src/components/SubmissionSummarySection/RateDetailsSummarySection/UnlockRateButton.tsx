import { ActionButton } from '../../ActionButton'
import { TealiumButtonEventObject } from '../../../tealium'

// Eventually ActionButton will be entirely swapped out for ModalToggleButton - part MCR-3782 when unlock reason modal is added
type UnlockRateButtonProps = JSX.IntrinsicElements['button'] &
    Partial<TealiumButtonEventObject>

export const UnlockRateButton = ({
    onClick,
    disabled,
    children,
    ...props
}: UnlockRateButtonProps): React.ReactElement => {
    return (
        <ActionButton
            {...props}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </ActionButton>
    )
}
