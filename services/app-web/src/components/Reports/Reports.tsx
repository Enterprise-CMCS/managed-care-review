import React from 'react'
import { API } from 'aws-amplify'
import { Button } from '@trussworks/react-uswds'
import styles from './Reports.module.scss'

export const Reports = (): React.ReactElement => {
    const getReports = async (): Promise<void> => {
        // code for downloading a file taken from https://gist.github.com/Sleavely/b243e4400a9e4772b00128d3e99b9946
        await API.get('api', '/reports', {
            responseType: 'blob',
            response: true,
        })
            .then((response) => {
                const blob = new Blob([response.data], {
                    type: 'application/octet-stream',
                })
                const filename = 'report.csv'
                const blobURL = window.URL.createObjectURL(blob)
                const tempLink = document.createElement('a')
                tempLink.style.display = 'none'
                tempLink.href = blobURL
                tempLink.setAttribute('download', filename)

                // Safari thinks _blank anchor are pop ups. We only want to set _blank
                // target if the browser does not support the HTML5 download attribute.
                // This allows you to download files in desktop safari if pop up blocking
                // is enabled.
                if (typeof tempLink.download === 'undefined') {
                    tempLink.setAttribute('target', '_blank')
                }

                document.body.appendChild(tempLink)
                tempLink.click()
                document.body.removeChild(tempLink)
                window.URL.revokeObjectURL(blobURL)
            })
            .catch((e) => {
                console.info('Error downloading report: ', e)
            })
    }
    return (
        <>
            <Button
                className={styles.button}
                type="button"
                unstyled
                onClick={getReports}
                aria-label={`Download reports`}
            >
                Download reports
            </Button>
        </>
    )
}
