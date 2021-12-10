import React from 'react'
import { Button, Link } from '@trussworks/react-uswds'

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
            <Link href={zippedFilesURL} target="_blank">
                <Button type="button" size="small">
                    {text}
                </Button>
            </Link>
        </div>
    )
}
