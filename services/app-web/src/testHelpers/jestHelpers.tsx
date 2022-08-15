import { MockedProvider, MockedProviderProps } from '@apollo/client/testing'
import { Location, MemoryRouter, useLocation } from 'react-router-dom'
import {
    fireEvent,
    render,
    Screen,
    queries,
    ByRoleMatcher,
    prettyDOM,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AuthProvider, AuthProviderProps } from '../contexts/AuthContext'

import { PageProvider } from '../contexts/PageContext'
import { S3Provider } from '../contexts/S3Context'
import { testS3Client } from './s3Helpers'
import { S3ClientT } from '../s3'
import * as LaunchDarkly from 'launchdarkly-react-client-sdk';
import { FeatureFlagTypes, FlagValueTypes } from '../common-code/featureFlags/flags';

/* Render */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const renderWithProviders = (
    ui: React.ReactNode,
    options?: {
        routerProvider?: { route?: string }
        apolloProvider?: MockedProviderProps
        authProvider?: Partial<AuthProviderProps>
        s3Provider?: S3ClientT
        location?: (location: Location) => Location
    }
) => {
    const {
        routerProvider = {},
        apolloProvider = {},
        authProvider = {},
        s3Provider = undefined,
        location = undefined,
    } = options || {}

    const { route } = routerProvider
    const s3Client: S3ClientT = s3Provider ?? testS3Client()

    return render(
        <MockedProvider {...apolloProvider}>
            <MemoryRouter initialEntries={[route || '']}>
                <AuthProvider authMode={'AWS_COGNITO'} {...authProvider}>
                    <S3Provider client={s3Client}>
                        {location && <WithLocation setLocation={location} />}
                        <PageProvider>{ui}</PageProvider>
                    </S3Provider>
                </AuthProvider>
            </MemoryRouter>
        </MockedProvider>
    )
}

const WithLocation = ({
    setLocation,
}: {
    setLocation: (location: Location) => Location
}): null => {
    const location = useLocation()
    setLocation(location)
    return null
}

const ldUseClientSpy = (featureFlags: Partial<Record<FeatureFlagTypes, FlagValueTypes>>) => {
    jest.spyOn(LaunchDarkly, 'useLDClient').mockImplementation((): any => {
        return {
            // Checks to see if flag passed into useLDClient exists in the featureFlag passed in ldUseClientSpy
            // If flag passed in useLDClient does not exist, then use defaultValue that was also passed into useLDClient.
            // If flag does exist the featureFlag value passed into ldUseClientSpy then use the value in featureFlag.
            //
            // This is done because testing components may contain more than one instance of useLDClient for a different
            // flag. We do not want to apply the value passed in featureFlags to each useLDClient especially if the flag
            // passed in useLDClient does not exist in featureFlags passed into ldUseClientSpy.
            variation: (flag: FeatureFlagTypes, defaultValue: FlagValueTypes | undefined) => {
                return featureFlags[flag] === undefined ? defaultValue : featureFlags[flag]
            },
        }
    })
}

const prettyDebug = (label?: string, element?: HTMLElement): void => {
    console.log(
        `${label ?? 'body'}:
    `,
        prettyDOM(element ?? document.body, 50000)
    )
}

/* User Events */

const userClickByTestId = async (
    screen: Screen<typeof queries>,
    testId: string
): Promise<void> => {
    const element = screen.getByTestId(testId)
    await userEvent.click(element)
}
const userClickByRole = async (
    screen: Screen<typeof queries>,
    role: ByRoleMatcher,
    options?: queries.ByRoleOptions | undefined
): Promise<void> => {
    const element = screen.getByRole(role, options)
    await userEvent.click(element)
}

const userClickSignIn = async (
    screen: Screen<typeof queries>
): Promise<void> => {
    const signInButton = await screen.findByRole('link', { name: /Sign In/i })
    await userEvent.click(signInButton)
}

function dragAndDrop(inputDropTarget: HTMLElement, files: File[]): void {
    fireEvent.dragEnter(inputDropTarget)
    fireEvent.dragOver(inputDropTarget)
    fireEvent.drop(inputDropTarget, {
        bubbles: true,
        cancelable: true,
        dataTransfer: {
            files: files,
        },
    })

    return
}

function fakeRequest<T>(
    success: boolean,
    returnData: T,
    timeout?: number
): Promise<T> {
    const t = timeout || Math.round(Math.random() * 1000)
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (success) {
                resolve(returnData)
            } else {
                reject(new Error('Error'))
            }
        }, t)
    })
}

const TEST_TEXT_FILE = new File(['Test File Contents'], 'testFile.txt', {
    type: 'text/plain',
})

const TEST_PDF_FILE = new File(['Test PDF File'], 'testFile.pdf', {
    type: 'application/pdf',
})

const TEST_DOC_FILE = new File(['Test doc File'], 'testFile.doc', {
    type: 'application/msword',
})

const TEST_XLS_FILE = new File(['Test xls File'], 'testFile.xls', {
    type: 'application/vnd.ms-excel',
})

const TEST_VIDEO_FILE = new File(['Test video File'], 'testFile.mp4', {
    type: 'video/mp4',
})

const TEST_PNG_FILE = new File(['Test PNG Image'], 'testFile.png', {
    type: 'image/png',
})

export {
    fakeRequest,
    dragAndDrop,
    renderWithProviders,
    prettyDebug,
    userClickByRole,
    userClickByTestId,
    userClickSignIn,
    ldUseClientSpy,
    TEST_DOC_FILE,
    TEST_PDF_FILE,
    TEST_PNG_FILE,
    TEST_TEXT_FILE,
    TEST_VIDEO_FILE,
    TEST_XLS_FILE,
}
