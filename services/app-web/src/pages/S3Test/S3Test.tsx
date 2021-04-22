import React, { useState } from 'react'
import { GridContainer, FileInput } from '@trussworks/react-uswds'

import { useAuth } from '../../contexts/AuthContext'
import { useS3 } from '../../contexts/S3Context'

export const S3Test = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()

    const { uploadFile, getURL } = useS3()

    const [uploadedFiles, setUploadedFiles] = useState<[string, string][]>([])

    if (loginStatus === 'LOADING' || !loggedInUser) {
        return <div>Loading User Info</div>
    }

    const handleOnChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.currentTarget.files === null) return
        try {
            const uploadingFile = e.currentTarget.files[0]
            if (uploadingFile === undefined) {
                console.log('no file to uploaded')
                return
            }
            const s3Key = await uploadFile(uploadingFile)
            const link = await getURL(s3Key)

            setUploadedFiles(uploadedFiles.concat([[s3Key, link]]))
        } catch (error) {
            console.log('S3 error', error)
        }
    }

    return (
        <div data-testid="s3TestPage">
            <GridContainer>
                <FileInput
                    id="test"
                    name="testFileInput"
                    onChange={handleOnChange}
                />
                <ul>
                    {uploadedFiles.map((s3info) => {
                        const s3key = s3info[0]
                        const s3link = s3info[1]

                        return (
                            <li key={s3key}>
                                <a href={s3link}>uploaded: {s3key}</a>
                            </li>
                        )
                    })}
                </ul>
            </GridContainer>
        </div>
    )
}
