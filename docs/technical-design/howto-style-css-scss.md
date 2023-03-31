# How to style with CSS and SCSS

## Colors

MC-Review has an application specific color palette written in SCSS. All color variables in the palette are prefixed with `$mcr-`. The palette is viewable in Storybook as well (`Global/Colors`). Anytime you need a color prefer the variable -  e.g. $mcr-gold-base. Avoid using color hex codes directly or using random design system variables for color.

The colors variables are defined in  `styles/mcr-colors.scss`. By reusing color variables from one place, we make future refactors easy and reduce styles tech debt. For example, if we needed to add a dark mode in the application or do a re-design, we start from one place. Note that we have colors in the application coming from both USWDS and CMDS currently in the application. These patterns are easier to see when our colors are defined in one place.

## Containers

Containers are the presentational elements that position content on the page. Look at designs and note the background color,the overall width of the content, and any obvious gutters between or margin/padding around content.

We currently have ~three types of containers in the application. See our `custom.scss` for scss variables and mixins related to containers. Whenever you create a new page, one of your first considerations should be the container, making sure it is using `flex`, and determining which type of container you need. Make sure your container stretches the height and width you expect by expanding and shrinking the viewport and seeing how content inside behaves. There should not be gaps, for example, between the bottom of the page container and the footer. Also note the background color of the container and the margin. If areas have a lot of gray space, that is likely the base color of our main HTML document body. If the background looks white, that's probably  `$mcr-foundation-white`.

## Text

Make sure heading levels (`h2`, `h3` etc) are properly used for text content. There are clear [guidelines](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements) around heading levels to follow. For example, page titles should always have some kind of heading, use only one h1 per page, headings should be nested by level, etc. If the heading is not styled the way you expect by default, CSS can be used to override things like font weight, size, etc. If you are noticing something with heading that need to be overridden across the app, this likely calls for global styles.

Note also that there is a specific color to be used for links (`$mcr-foundation-link`) and hint text (`$mcr-foundation-hint`).

## Patterns and technologies related to styles in MC-Review

### Use Sass / SCSS stylsheets

[Sass](https://sass-lang.com/documentation/file.SASS_REFERENCE.html) is the way we write styles in the project. It is an extension of CSS. All files that `.scss` extension use Sass. Some basic concepts of Sass that are good to understand/review that are listed below.

- How to [load SCSS](https://sass-lang.com/documentation/at-rules/use#loading-members)
- How to [use nested selectors](https://sass-lang.com/documentation/style-rules#nesting)
- How to [structure a Sass stylesheet](https://sass-lang.com/documentation/syntax/structure)

### Styles should be as narrowly scoped as possible

This is 101 but easy to forget. Please read [this section](https://github.com/trussworks/Engineering-Playbook/blob/main/docs/web/frontend/developing-ui.md#style-with-css-modules) of the Truss eng playbook for a good summary.

TL;DR The preferred way to style React code is via a  `<component>.modules.scss` file stored close to the React component files. The use of [modules](https://github.com/css-modules/css-modules) helps ensure separation of concerns. The same can be said for use of CSS selectors inside scss files. These tools focus the impact of your changes and reduce tech debt. Less is more with styles.

Here's a concrete example of scoped styles in action in the application:

- The `custom.scss` file is only used for global files  and overrides. We avoid adding code to this file unless absolutely necessary. When we do have to add styles here we either make a unique class or we use CSS selectors to contain the trickle effects of a change.
- React files in  `/pages` may have self contained styles or they may share styles at the page level. Since this area of the codebase is organized by workflow it often makes sense to create a stylesheet at the root of that page folder that holds common styles for components used in that area of the application.
- React files in  `/components` have self contained styles. This means named module file for each component. We avoid any cross components imports in this area of the codebase.

### React components may compose together styles from different places using `classnames` package

- Sometimes React components have complex conditional logic related to styles. To assist with this use `classnames`to compose together styles from different places. Example usage:
  
```react
      const combinedStyles = classNames(
        'usa-tag',
        {
            [styles['green']]: color === 'green',
            [styles['cyan']]: color === 'cyan',
            [styles['gold']]: color === 'gold',
            [styles['blue']]: color === 'blue',
        },

        className
    )
  ````

In this example, `'usa-tag'` is the the string literal for a class coming directly from USWDS, `styles[color]` variables are coming from that component's module SCSS file, and `className` is coming from React props. The logic can be understood as

1. `'usa-tag'` is applied to all instances of the component.
2. component specific styles from the `styles` object are conditionally applied based on the value of the prop `color` 
3. `className` prop is applied to all instances of the component (also overriding anything applied earlier if styles reference to the same CSS attribute). It is a best practice is to apply any consumer defined `className` last.  

### `styles/custom.scss` holds global styles for the application

Global styles should be uncommmon. They generally change only during a styles refactor across the application.

The `styles/custom.scss` is also the main file imported into components to reference global SCSS variables. This file `@forward`s the MCR color palette and USWDS sass variables to the rest of the application.

### `USWDS` is the main design system in use

See the `Use USWDS as the design system` ADR for the explanation of why.

What this means for styling the application is that you will see some USWDS language and patterns. This can also be used a common language between design and engineering. For example, the names of our components follow [USWDS names for components](https://designsystem.digital.gov/components/overview/). And when you look at our application in the dev tool, every class with `usa-*` in front of it is coming from USWDS. USWDS has [design tokens](https://designsystem.digital.gov/design-tokens/) and mixins we can rely on as well.
