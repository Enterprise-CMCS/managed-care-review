import React from 'react'
import { Link } from '@trussworks/react-uswds'

type DownloadButtonProps = {
    text: string
    zippedFilesURL: string
}

export const DownloadButton = ({
    text,
    zippedFilesURL,
}: DownloadButtonProps): React.ReactElement => {
    return (
        <div>
            <Link variant="external" href={zippedFilesURL} target="_blank">
                {text}
            </Link>
        </div>
    )
}
