const config = {
    '*.tf': [
        'tofu fmt -check',
        () =>
            'sh -c "{ [ -d .terraform ] || tofu init -backend=false -input=false -no-color; } && tofu validate -no-color"',
    ],
};

export default config;
