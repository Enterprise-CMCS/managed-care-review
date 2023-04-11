module.exports = {
    resolve: {
        fallback: {
            crypto: false,
            fs: false,
            tls: false,
            net: false,
            path: false,
            zlib: false,
            http: false,
            https: false,
            stream: false,
        },
    },
};
