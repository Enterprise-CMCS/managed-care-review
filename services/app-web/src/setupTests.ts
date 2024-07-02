import { Crypto } from '@peculiar/webcrypto'
import { TextEncoder, TextDecoder } from 'util'

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import * as tealium from './hooks/useTealium';
import {TealiumDataObjectTypes} from './hooks/useTealium';
import {TealiumButtonEventObject, TealiumInternalLinkEventObject} from './constants/tealium';

// eslint-disable-next-line @typescript-eslint/no-empty-function
Element.prototype.scrollIntoView = () => {}

// to make calculating the sha work in jest
Object.defineProperty(globalThis, 'crypto', {
    value: new Crypto(),
})

Object.assign(global, { TextDecoder, TextEncoder })

/**
 * Our useTealium hook needs to be mocked and the implementation needs to be done before each test is ran otherwise
 * the mock is reset to undefined.
 * Since we use logButtonEvent everywhere, instead of adding this to each test file, we can do it here and apply it to all
**/
const spyOnUseTealium = jest.spyOn(tealium, 'useTealium')
beforeEach(() => {
    spyOnUseTealium.mockImplementation(() => ({
        logUserEvent: (linkData: TealiumDataObjectTypes) => {
            return
        },
        logPageView: () => {
            return
        },
        logButtonEvent: (
            tealiumData: Omit<TealiumButtonEventObject, 'event_name'>,
            onClick?: () => void,
        ) => {
            // trigger button clicks
            if (onClick) {
                onClick()
            }
        },
        logInternalLinkEvent: (
            tealiumData: Omit<TealiumInternalLinkEventObject, 'event_name'>,
        ) => {
            return
        }
    }))
})
