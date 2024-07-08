# Tealium Logging
## Background
We use a tool called Tealium to hook into the CMS customer analytics tools. The data is then sent to Adobe Analytics (previously CMS used Google Analytics). Access to analytics tools is set up through another team, Blast Analytics. They are contractors with a focus on analytics and work across all CMS domains. 

## Implementation

### Setup
We are using `TealiumProvider` in `App.tsx` to:
- Initialize Tealium.
- Setup page view logging.
- Provide `tealiumClient()` function in Context for user event logging.
   - `initializeTealium()` initializes Tealium.
   - `logUserEvent()`  Logs user events. It takes specific event type data, combines it with default event and parameter values, and sends it to Tealium.
   - `logPageView()` logs when user vists a page.

### Use
The `useTealium` hook utilizes `tealiumClient()` functions in the Context to provide user event functions for logging each event type.

There are wrapper functions in this hook for specific user event types to constrain the event and parameter values before passing it to `logUserEvent`. This allows type safety and a reference to what event and parameter values the event accepts.

```typescript
const context = React.useContext(TealiumContext) 

...

const { pathname, loggedInUser, heading, logUserEvent } = context

...

const logButtonEvent = (
  tealiumData: Omit<TealiumButtonEventObject, 'event_name'>,
) => {
   const linkData: TealiumButtonEventObject = {
      ...tealiumData,
      event_name: 'button_engagement',
   }
   logUserEvent(linkData, pathname, loggedInUser, heading)
}
```
These `useTealium` functions are then used in components like `Button` and `Link` to log when they are clicked. Since most of these components are configured and used similarly, wrapper components were made with built-in logging to replace the default components for easy implementation of logging. They can be found in `components/TealiumLogging`.

Not all components are wrapped like this. Some like `ModalToggleButton` are rarely used, so in those cases we can directly use `logButtonEvent` in the `onClick` prop.

### Adding user event types

To add a new user event type: 
- Define a type for the event parameter values for the even type. You can find all the data filed for a given event in the [Tagging Strategy](https://confluence.cms.gov/pages/viewpage.action?spaceKey=BLSTANALYT&title=mc-review.onemac.cms.gov+-+Tagging+Strategy) doc on confluence.
- Then we add that type to `TealiumEventObjectTypes`.
```typescript
type TealiumEventObjectTypes =
| TealiumButtonEventObject
| TealiumInternalLinkEventObject
| SomeNewTealiumEventObjext
```
- Now `logUserEvent` is ready to take that even in as the linkData argument.
```typescript
const tealiumClient = (): TealiumClientType => {
  return {
    ...
    logUserEvent:  (
            linkData: TealiumEventObjectTypes,
            pathname: string,
            loggedInUser?: User,
            heading?: string | React.ReactElement,
    ) => {
        ...
    },
    ...
}
```
- Next we create a wrapper function in `useTealium` for the new event type, omitting `event_name` because it's all the same event we can hard code it.
```typescript
const logSomeNewUserEventEvent = (
    tealiumData: Omit<SomeNewTealiumEventObjext, 'event_name'>,
) => {
  const linkData: TealiumButtonEventObject = {
    ...tealiumData,
    event_name: 'some_new_event',
  }
  logUserEvent(linkData, pathname, loggedInUser, heading)
  ...
}
```
- Now this hook is ready to use for logging this new event type.

### Testing
We are not testing for logging of the Tealium events, but now that many of our components either log to Tealium or use components with logging, `renderWithProviders` required an update to use TealiumProvider with test configurations. The default configuration will provide a `tealiumTestClient()`, but you can configure your own client and pass it into `renderWithProviders`. Tealium is also configured to not initialize or log during local deploy or unit tests.

In cases where we are not using `renderWithProviders` you can use `jest.spyOn` to mock the `useTealium` hook. See `ExpandableText.test.tsx`.
