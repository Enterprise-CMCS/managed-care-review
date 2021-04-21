import React, { useEffect, useState } from 'react'
import { GridContainer, FileInput } from '@trussworks/react-uswds'

import { useAuth } from '../../contexts/AuthContext'
import { Program } from '../../gen/gqlClient'

import AWS from 'aws-sdk'
import { s3LocalUploader, s3LocalGetURL } from '../../api/s3Local'
import { s3AmplifyUpload, s3AmplifyGetURL } from '../../api/s3Amplify'

// Local s3
const localEndpoint = 'http://localhost:4569'
const s3Client = new AWS.S3({
    s3ForcePathStyle: true,
    apiVersion: '2006-03-01',
    accessKeyId: 'S3RVER', // This specific key is required when working offline
    secretAccessKey: 'S3RVER',
    params: { Bucket: 'local-uploads' },
    endpoint: new AWS.Endpoint(localEndpoint),
})
// const s3Upload = s3LocalUploader(s3Client)
// const s3Linker = s3LocalGetURL(s3Client)

const s3Upload = s3AmplifyUpload
const s3Linker = s3AmplifyGetURL

export const S3Test = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()
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
            const uploadFile = e.currentTarget.files[0]
            if (uploadFile === undefined) {
                console.log('no file to uploaded')
                return
            }
            const s3Key = await s3Upload(uploadFile)

            const maybeLink = await s3Linker(s3Key)

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
