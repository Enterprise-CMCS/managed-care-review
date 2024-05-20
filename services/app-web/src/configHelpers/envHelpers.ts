const getEnv = (variable: string) =>{
    return process.env[variable] ?? ''
}
export {getEnv}