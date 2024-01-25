# How to style with CSS and SCSS

## Colors

MC-Review has an application specific color palette written in SCSS. All color variables in the palette are prefixed with `$mcr-`. The palette is viewable in Storybook as well (`Global/Colors`). Anytime you need a color prefer the variable -  e.g. $mcr-gold-base. Avoid using color hex codes directly or using random design system variables for color.

The colors variables are defined in  `styles/mcrColors.scss`. By reusing color variables from one place, we make future refactors easy and reduce styles tech debt. For example, if we needed to add a dark mode in the application or do a re-design, we start from one place. Note that we have colors in the application coming from both USWDS and CMDS currently in the application. These patterns are easier to see when our colors are defined in one place.

## Containers

Containers are the presentational elements that position content on the page. Look at designs and note the background color,the overall width of the content, and any obvious gutters between or margin/padding around content.

We currently have ~three types of containers in the application. See our `custom.scss` for scss variables and mixins related to containers. Whenever you create a new page, one of your first considerations should be the container, making sure it is using `flex`, and determining which type of container you need. Make sure your container stretches the height and width you expect by expanding and shrinking the viewport and seeing how content inside behaves. There should not be gaps, for example, between the bottom of the page container and the footer. Also note the background color of the container and the margin. If areas have a lot of gray space, that is likely the base color of our main HTML document body. If the background looks white, that's probably  `$mcr-foundation-white`.

## Text

Make sure heading levels (`h2`, `h3` etc) are properly used for text content. There are clear [guidelines](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements) around heading levels to follow. For example, page titles should always have some kind of heading, use only one h1 per page, headings should be nested by level, etc. If the heading is not styled the way you expect by default, CSS can be used to override things like font weight, size, etc. If you are noticing something with heading that need to be overridden across the app, this likely calls for global styles.

Note also that there is a specific color to be used for links (`$$mcr-foundation-link`) and hint text (`$mcr-foundation-hint`).

## Technologies related to styles in MC-Review

### Sass / SCSS stylesheets

[Sass](https://sass-lang.com/documentation/file.SASS_REFERENCE.html) is the way we write styles in the project. It is an extension of CSS. All files that `.scss` extension use Sass. Some basic concepts of Sass that are good to understand/review that are listed below.

- How to [load SCSS](https://sass-lang.com/documentation/at-rules/use#loading-members)
- How to [use nested selectors](https://sass-lang.com/documentation/style-rules#nesting)
- How to [structure a Sass stylesheet](https://sass-lang.com/documentation/syntax/structure)

###  United States Web Design System

See the ADR on [`Use USWDS as the design system`](../architectural-decision-records/014-use-uswds-design-system.md).

What this means for styling the application is that you will see some USWDS language and patterns. This can also be used a common language between design and engineering. For example, the names of our components follow [USWDS names for components](https://designsystem.digital.gov/components/overview/). And when you look at our application in the dev tool, every class with `usa-*` in front of it is coming from USWDS. USWDS has [design tokens](https://designsystem.digital.gov/design-tokens/) and mixins we can rely on as well.

## Style patterns in MC-Review

### Styles should be as narrowly scoped as possible

This is 101 but easy to forget. Please read [this section](https://github.com/trussworks/Engineering-Playbook/blob/main/docs/web/frontend/developing-ui.md#style-with-css-modules) of the Truss eng playbook for a good summary.

TL;DR Less is more with styles. In our application, the preferred way to style React code is via locally scoped [CSS module](https://github.com/css-modules/css-modules), written as a `<component>.module.scss` file. This is stored alongside React component files. We also use [CSS selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference#selectors) to further target styles. Tightly scoped styles and CSS [specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity) ensure separation of concerns.

Example of scoped styles in use:
- Shared styles live close to the workflow they apply to. For example, directories in  `/pages` folder may share a `*.module.scss` stylesheet if needed for templates in that area of the application. CSS selectors should be used to further scope down styles.
- Re-useable atomic components (see `/components` folder) have self contained styles. There is a named `*.module.scss` file for each component.


###  Global styles live in `styles/custom.scss`

Global styles should be uncommmon. They generally change only during a styles refactor across the application.

The `styles/custom.scss` is also the main file imported into components to reference global SCSS variables. This file `@forward`s the MCR color palette and USWDS sass variables to the rest of the application.

### Import styles with `@use`
- Prefer namespaced scss imports with [`@use`](https://sass-lang.com/documentation/at-rules/use/) over [`@import`](https://sass-lang.com/documentation/at-rules/import/) for scss to reduce loading styles multiple times. Sass team is deprecating [`@import`](https://github.com/sass/sass/blob/main/accepted/module-system.md#timeline).

In `*.module.scss` files this looks like (at top of file):
```
@use '../../styles/custom.scss' as custom;
@use '../../styles/uswdsImports.scss' as uswds;
```

and then referring to varibles and mixins inline with the [namespace](https://sass-lang.com/documentation/at-rules/use/#choosing-a-namespace) - such as `custom.$mcr-foundation-white` or  `@include uswds.uswds-at-media(tablet)`

### Watch out for global style overrides that can impact UI across the application.

Always nest your scss styles code in a css class to benefit from [the advantages of CSS/SCSS modules](https://css-tricks.com/css-modules-part-1-need/). Eencapsulates styles in classes throughout `[component].module.scss`. Do not use html and `usa-*` class overrides at the top level of the module files. This will override global styles across the application.

If you must, make global overrides changes in (`overrides.scss`). Here are concrete examples where global style overrides are needed:

1. We are dealing with container elements that repeat throughout the application outside of a specific component (divs, cards, display tables)
2. We need override a behavior in USWDS that we can't control via settings throughout the application
3. We want to hide an element from the screen using our global screenreader only class


### Compose together styles in React component files using the `classnames` package

- Sometimes React components have complex logic related to styles. To assist with this and follow patterns from `@trussworks/react-uswds` we use [`classnames`](https://github.com/JedWatson/classnames) package to compose together styles from different places. In the future if desired, we could make a similar utility in code and remove this dependency.

Example of complex conditional styles from ActionButton:

```react
    const classes = classnames(
        {
            'usa-button--outline-disabled': isDisabled && isOutline,
            'usa-button--disabled': isDisabled,
            'usa-button--active': isLoading && !isSuccess,
            [styles.successButton]: isSuccess && !isDisabled,
            [styles.disabledCursor]: isDisabled || isLoading,
        },
        className
    )
```

In this example, ActionButton has different states (loading, disabled,success) that can be combined and there are is secondary visual variant (outline) to consider.

 The `'usa-button---'`  classes are string literals for the class coming directly from USWDS. We want to use these in some cases. Then there are variables like `styles.disabledCursor` which come from the component module SCSS file. Finally, there is the `className` is coming from React props passed into the component from the parent. Ut is a best practice is to apply any consumer defined `className` styles last in re-useable components.

The logic can be understood as

1. USWDS styles are conditionally applied
2. component specific styles from the module `styles` object are conditionally applied
3. `className` prop is applied to all instances of the component (also overriding anything applied earlier if styles reference to the same CSS attribute).
