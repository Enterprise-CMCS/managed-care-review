import { dirname, join } from "path";
import { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
    stories: ['../src/**/*.stories.@(ts|tsx)'],

    addons: [
        getAbsolutePath("@storybook/addon-a11y"),
        getAbsolutePath("@storybook/addon-links"),
        getAbsolutePath("@storybook/addon-essentials"),
        getAbsolutePath("@chromatic-com/storybook")
    ],

    typescript: {
        check: false,
        reactDocgen: 'react-docgen-typescript',
        reactDocgenTypescriptOptions: {
            shouldExtractLiteralValuesFromEnum: true,
            compilerOptions: {
                allowSyntheticDefaultImports: false,
                esModuleInterop: false,
            },
        },
    },

    framework: { name: getAbsolutePath("@storybook/react-vite"), options:{} },

    docs: {}
};

export default config;

function getAbsolutePath(value: string): any {
    return dirname(require.resolve(join(value, "package.json")));
}