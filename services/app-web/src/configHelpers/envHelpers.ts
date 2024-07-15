const getEnv = (variable: string) => {
    return import.meta.env[variable] ?? ''
}
export { getEnv }
