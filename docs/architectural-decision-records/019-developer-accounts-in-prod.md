# ADR 019 — Developer Accounts in Prod

- Status: Decided
- Date: 4/21/21 (this is retroactive ADR)

## Assumptions

As a development team, we want the ability to log in to prod to make sure that things are working there. Otherwise our only way of verifying that prod is at all working is going to be monitoring, which with our initial load of users being so small is really not going to give us a lot of confidence.

IDM only allows real user accounts in prod. We can’t create testing accounts that aren’t tied to our actual identities, and for state users, those accounts need to be associated with a real State or Territory.

We eventually plan to support every state and territory that uses managed care, right now that includes all 50 states and Puerto Rico.

## Constraints

We need a way to use production as a state user and not worry about any action we take messing up data used for reporting.

## Considered Options

### Option 1

Create accounts for a real state

### Option 2

Create accounts for a made up state

### Option 3

Create accounts for a territory

## Chosen Solution

Add support to the application for American Samoa, development team members will request state user access to that territory.

That way we can log in as a state user and not worry about any data we create mucking up data in a state that actually submits Managed Care documents. When we build out the submit to CMS parts of things, we can screen out any data coming from AS. If the time comes where we need to use AS in MC-Review, we can reset data for this state and reassess this ADR, this solution does not prevent us from adapting our approach further in the future.

 @macrael picked American Samoa in honor of an 18F engineer I worked with on eApp. Ryan was a great engineering lead, skilled at doing good work for the government and keeping morale high.

### Pros and Cons of the Alternatives

#### Option 1 real state

- `+` Real state that we know we have accurate data for (programs, state code,  state icon, etc)
- `-` We would need to restrict ourselves to not submit any data so that we don’t gunk up that state's submission list.
- `-` Reduce the value of any testing we could do on prod that imitates a state user

#### Option 2 fake state

- `-` This option is a non-starter. IDM would have to change their state list to allow this
  
#### Option 3 use territory

- `+` A real territory would be included in the IDM list and we could have some accurate data for it (e.g. a state code, an icon)
- `-` Other territories may one day submit managed care contracts
