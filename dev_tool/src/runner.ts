import { spawn } from 'child_process'

export default class LabeledProcessRunner {
    private prefixColors: Record<string, string> = {}
    private colors = [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '9',
        '10',
        '11',
        '12',
        '13',
        '14',
    ]

    private formattedPrefix(prefix: string): string {
        let color: string

        if (prefix! in this.prefixColors) {
            color = this.prefixColors[prefix]
        } else {
            const frontColor = this.colors.shift()
            if (frontColor != undefined) {
                color = frontColor
                this.colors.push(color)
                this.prefixColors[prefix] = color
            } else {
                console.log('BAD NEWS BEARS')
                throw new Error('dev.ts programming error')
            }
        }

        let maxLength = 0
        for (let pre in this.prefixColors) {
            if (pre.length > maxLength) {
                maxLength = pre.length
            }
        }

        return `\x1b[38;5;${color}m ${prefix.padStart(maxLength)}|\x1b[0m`
    }

    // awaitFor is a string that will resolve this promise when it is printed by the running command.
    // the command will keep running, but this promise will be resolved.
    // it must be a string on a single line.
    async runCommandAndOutput(
        prefix: string,
        cmd: string[],
        cwd: string | undefined,
        { awaitFor }: { awaitFor: undefined | string } = { awaitFor: undefined }
    ): Promise<number> {
        const proc_opts: Record<string, any> = {}

        if (cwd) {
            proc_opts['cwd'] = cwd
        }

        const command = cmd[0]
        const args = cmd.slice(1)

        const proc = spawn(command, args, proc_opts)
        const startingPrefix = this.formattedPrefix(prefix)
        process.stdout.write(`${startingPrefix} Running: ${cmd.join(' ')}\n`)

        return new Promise<number>((resolve, reject) => {
            proc.stdout.on('data', (data) => {
                const paddedPrefix = this.formattedPrefix(prefix)

                const lines = data.toString().split('\n')
                if (lines[lines.length - 1] === '') {
                    lines.pop()
                }
                for (let line of lines) {
                    // if we get a line that has awaitFor in it, we resolve the promise.
                    if (awaitFor) {
                        if (line.includes(awaitFor)) {
                            resolve(0)
                        }
                    }

                    process.stdout.write(`${paddedPrefix} ${line}\n`)
                }
            })

            proc.stderr.on('data', (data) => {
                const paddedPrefix = this.formattedPrefix(prefix)

                const lines = data.toString().split('\n')
                if (lines[lines.length - 1] === '') {
                    lines.pop()
                }
                for (let line of lines) {
                    // if we get a line that has awaitFor in it, we resolve the promise.
                    if (awaitFor) {
                        if (line.includes(awaitFor)) {
                            resolve(0)
                        }
                    }

                    process.stdout.write(`${paddedPrefix} ${line}\n`)
                }
            })

            proc.on('error', (error) => {
                const paddedPrefix = this.formattedPrefix(prefix)
                process.stdout.write(
                    `${paddedPrefix} A PROCESS ERROR: ${error}\n`
                )
                reject(error)
            })

            proc.on('close', (code: number) => {
                const paddedPrefix = this.formattedPrefix(prefix)
                process.stdout.write(`${paddedPrefix} Exit: ${code}\n`)
                resolve(code)
            })
        })
    }
}
