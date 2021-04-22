import React, { useState } from 'react'
import { GridContainer, FileInput } from '@trussworks/react-uswds'

import { useAuth } from '../../contexts/AuthContext'
import { Program } from '../../gen/gqlClient'
import { useS3 } from '../../contexts/S3Context'

export const S3Test = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()

    const { uploadFile, getURL } = useS3()

    let programs: Program[] = []

    const [uploadedFiles, setUploadedFiles] = useState<[string, string][]>([])

    if (loginStatus === 'LOADING' || !loggedInUser) {
        return <div>Loading User Info</div>
    } else {
        programs = loggedInUser.state.programs
    }

    console.log('RPOGRAS', programs)

    const handleOnChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log(e)
        if (e.currentTarget.files === null) return
        try {
            const uploadingFile = e.currentTarget.files[0]
            if (uploadingFile === undefined) {
                console.log('no file to uploaded')
                return
            }
            const s3Key = await uploadFile(uploadingFile)

            const maybeLink = await getURL(s3Key)

            let link: string
            if (typeof maybeLink === 'string') {
                link = maybeLink
            } else {
                link = ''
            }

            console.log('Setting', s3Key, link)

            setUploadedFiles(uploadedFiles.concat([[s3Key, link]]))
        } catch (error) {
            console.log('S3 error', error)
        }
    }

    return (
        <div data-testid="s3TestPage">
            <GridContainer>
                <FileInput id="test" name="test" onChange={handleOnChange} />
                <ul>
                    {uploadedFiles.map((s3info) => {
                        console.log(s3info)
                        const s3key = s3info[0]
                        const s3link = s3info[1]

                        console.log('getitng', s3key, s3link)
                        return (
                            <li key={s3key}>
                                <a href={s3link}>{s3key}</a>
                            </li>
                        )
                    })}
                </ul>
            </GridContainer>
        </div>
    )
}
