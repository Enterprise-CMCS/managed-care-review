module.exports = {
  'stories': [
    '../src/**/*.stories.@(ts|tsx)'
  ],
  'addons': [
    '@storybook/addon-a11y',
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    [
      '@storybook/preset-create-react-app',
      {
        name: '@storybook/addon-docs',
        options: {
          configureJSX: true,
        },
      },
    ],
  ],
  'refs': {
    'design-system': { 
      'title': 'ReactUSWDS', 
      'url': 'https://trussworks.github.io/react-uswds/'
    }
   }
}
