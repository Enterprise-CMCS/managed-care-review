import { Crypto } from '@peculiar/webcrypto'
import { TextEncoder, TextDecoder } from 'util'
import { cleanup } from '@testing-library/react'
import { MockLink } from '@apollo/client/testing'
import { setVerbosity } from '@apollo/client/utilities/invariant'

// Apollo Client v4 MockedProvider introduced a 20-50ms default response
// delay. Override globally to 0 so unit tests stay fast. Individual mocks
// can still opt in by setting their own `delay`.
MockLink.defaultOptions = { delay: 0 }

// Apollo's "Missing field ... while writing result %o" log dumps the entire
// result object via util.inspect({showHidden: true}), expanding every Date
// prototype method — one entry is thousands of lines and our CI logs balloon
// to 200MB+. Apollo emits this via invariant.error (code 110), so 'silent'
// is the only level that suppresses it. Restricted to CI (dev/val/prod
// stages); locally we stay verbose so devs see the signal and fix mocks.
if (import.meta.env.VITE_APP_STAGE_NAME !== 'local') {
    setVerbosity('silent')
}

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

Element.prototype.scrollIntoView = () => {}

// to make calculating the sha work in jest
Object.defineProperty(globalThis, 'crypto', {
    value: new Crypto(),
})

Object.assign(global, { TextDecoder, TextEncoder })

// This is a fix for userEvents and fireEvents not resolving promises and causing issues with apollo mocks.
// Found this fix in https://github.com/testing-library/react-testing-library/issues/1197#issuecomment-2076120296
//
// Capture the native clearInterval before fake timers replace it. vitest 4
// removes it from the global during environment teardown (after afterAll hooks
// run), which causes jsdom's window.close() → stopAllTimers() to throw
// "clearInterval is not defined". Restoring it in afterAll keeps teardown clean.
const _nativeClearInterval = globalThis.clearInterval
afterAll(() => {
    globalThis.clearInterval = _nativeClearInterval
})

vi.useFakeTimers({
    shouldAdvanceTime: true,
})

// react-uswds Modal wires in focus-trap-react unconditionally. jsdom has no
// real focus model, so focus-trap throws on open/close transitions ("must
// have at least one container with at least one tabbable node"). Stub it to
// a pass-through globally — but still honor focusTrapOptions.escapeDeactivates
// so ESC-to-close is reachable from tests.
vi.mock('focus-trap-react', async () => {
    const React = await vi.importActual<typeof import('react')>('react')

    type FocusTrapStubProps = {
        children?: React.ReactNode
        active?: boolean
        focusTrapOptions?: {
            escapeDeactivates?: ((e: KeyboardEvent) => boolean) | boolean
        }
    }

    const FocusTrap = ({
        children,
        active = true,
        focusTrapOptions,
    }: FocusTrapStubProps) => {
        React.useEffect(() => {
            if (!active) return
            const escapeDeactivates = focusTrapOptions?.escapeDeactivates
            if (typeof escapeDeactivates !== 'function') return
            const onKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') escapeDeactivates(e)
            }
            document.addEventListener('keydown', onKeyDown)
            return () => document.removeEventListener('keydown', onKeyDown)
        }, [active, focusTrapOptions])
        return React.createElement(React.Fragment, null, children)
    }

    return { default: FocusTrap, FocusTrap }
})

afterEach(cleanup)
