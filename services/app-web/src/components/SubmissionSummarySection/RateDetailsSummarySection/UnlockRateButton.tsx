import { ActionButton } from '../../ActionButton'

// Eventually ActionButton will be entirely swapped out for ModalToggleButton - part of TICKET NUMBER when modal is hooked into unlockRate
type UnlockRateButtonProps = JSX.IntrinsicElements['button']

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
