import React from 'react'
import { ActionButton } from '../ActionButton'

type DownloadButtonProps = {
    text: string
    zippedFilesURL: string | undefined
}

export const DownloadButton = ({
    text,
    zippedFilesURL,
}: DownloadButtonProps): React.ReactElement => {
    const handleClick = () => {
        if (zippedFilesURL) {
            window.open(zippedFilesURL)
        }
    }

    return (
        <ActionButton
            onClick={handleClick}
            loading={zippedFilesURL === undefined}
            type="button"
            children={text}
            animationTimeout={0}
        />
    )
}
