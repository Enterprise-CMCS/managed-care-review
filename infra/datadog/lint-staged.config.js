// lint-staged v16 discovers this config via git ls-files and runs its tasks with cwd set to
// this file's directory (infra/datadog/), so *.tf matches correctly and tofu validate runs here.
const config = {
    '*.tf': [
        'tofu fmt -check',
        () =>
            'sh -c "{ [ -d .terraform ] || tofu init -backend=false -input=false -no-color; } && tofu validate -no-color"',
    ],
};

export default config;
