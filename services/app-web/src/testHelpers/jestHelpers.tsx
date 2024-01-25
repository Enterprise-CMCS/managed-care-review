import { MockedProvider, MockedProviderProps } from '@apollo/client/testing'
import { Location, MemoryRouter, useLocation } from 'react-router-dom'
import {
    fireEvent,
    render,
    Screen,
    queries,
    ByRoleMatcher,
    prettyDOM,
    within,
    Matcher,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AuthProvider, AuthProviderProps } from '../contexts/AuthContext'

import { PageProvider } from '../contexts/PageContext'
import { S3Provider } from '../contexts/S3Context'
import { testS3Client } from './s3Helpers'
import { S3ClientT } from '../s3'
import {
    FeatureFlagSettings,
    featureFlagKeys,
    featureFlags,
} from '../common-code/featureFlags'
import { LDProvider, ProviderConfig } from 'launchdarkly-react-client-sdk'

/* Render */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const renderWithProviders = (
    ui: React.ReactNode, // actual test UI - the JSX to render
    options?: {
        routerProvider?: { route?: string } // used to pass react router related data
        apolloProvider?: MockedProviderProps // used to pass GraphQL related data via apollo client
        authProvider?: Partial<AuthProviderProps> // used to pass user authentication state via AuthContext
        s3Provider?: S3ClientT // used to pass AWS S3 related state via  S3Context
        location?: (location: Location) => Location // used to pass a location url for react-router
        featureFlags?: FeatureFlagSettings
    }
) => {
    const {
        routerProvider = {},
        apolloProvider = {},
        authProvider = {},
        s3Provider = undefined,
        location = undefined,
        featureFlags = undefined,
    } = options || {}

    const { route } = routerProvider
    const s3Client: S3ClientT = s3Provider ?? testS3Client()
    const user = userEvent.setup()

    const flags = {
        ...getDefaultFeatureFlags(),
        ...featureFlags,
    }

    /**
     * For unit testing, we do not want to connect to LD to get flag values instead we are initializing the LDProvider
     * with a set of flag values that was passed into renderWithProviders. This method will result in console errors and
     * warnings, but are suppressed in this helper.
     *
     * The way LaunchDarkly implements unit tests is not working for our app, so this is the work-around
     * https://docs.launchdarkly.com/guides/sdk/unit-tests/?q=unit+test
     */
    const ldProviderConfig: ProviderConfig = {
        clientSideID: '',
        options: {
            bootstrap: flags,
        },
    }

    // Ignoring LaunchDarkly errors and warnings from unit testing due to not fully configuring to connect to LaunchDarkly.
    jest.spyOn(global.console, 'warn').mockImplementationOnce((message) => {
        if (!message.includes('LaunchDarkly')) {
            global.console.warn(message)
        }
    })

    jest.spyOn(global.console, 'error').mockImplementationOnce((message) => {
        if (!message.includes('LaunchDarkly')) {
            global.console.error(message)
        }
    })

    const renderResult = render(
        <LDProvider {...ldProviderConfig}>
            <MockedProvider {...apolloProvider}>
                <MemoryRouter initialEntries={[route || '']}>
                    <AuthProvider authMode={'AWS_COGNITO'} {...authProvider}>
                        <S3Provider client={s3Client}>
                            {location && (
                                <WithLocation setLocation={location} />
                            )}
                            <PageProvider>{ui}</PageProvider>
                        </S3Provider>
                    </AuthProvider>
                </MemoryRouter>
            </MockedProvider>
        </LDProvider>
    )
    return {
        user,
        ...renderResult,
    }
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

const getDefaultFeatureFlags = (): FeatureFlagSettings =>
    featureFlagKeys.reduce((a, c) => {
        const flag = featureFlags[c].flag
        const defaultValue = featureFlags[c].defaultValue
        return Object.assign(a, { [flag]: defaultValue })
    }, {} as FeatureFlagSettings)

const prettyDebug = (label?: string, element?: HTMLElement): void => {
    console.info(
        `${label ?? 'body'}:
    `,
        prettyDOM(element ?? document.body, 50000)
    )
}

/* User Events */
const selectYesNoRadio = async (
    screen: Screen<typeof queries>,
    legend: Matcher,
    value: 'Yes' | 'No'
) => {
    const radioFieldset = screen.getByText(legend).parentElement
    if (!radioFieldset)
        throw new Error(`${legend} yes no radio field legend does not exist`)
    const radioOption = within(radioFieldset).getByLabelText(value)
    await userEvent.click(radioOption)
}

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

const TEST_DOCX_FILE = new File(['Test docx File'], 'testFile.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
    selectYesNoRadio,
    TEST_DOC_FILE,
    TEST_DOCX_FILE,
    TEST_PDF_FILE,
    TEST_PNG_FILE,
    TEST_TEXT_FILE,
    TEST_VIDEO_FILE,
    TEST_XLS_FILE,
}
