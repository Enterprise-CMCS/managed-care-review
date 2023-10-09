import util from 'util'

const consoleLogFullData = (data: unknown) =>
    console.info(util.inspect(data, false, null, true))

export { consoleLogFullData }
