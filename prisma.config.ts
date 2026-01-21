import { env, defineConfig } from 'prisma/config'
import type { PrismaConfig } from 'prisma'

export default defineConfig({
    schema: './packages/database/prisma/schema.prisma',
    migrations: {
        path: './packages/database/prisma/migrations',
    },
    datasource: {
        url: env('DATABASE_URL'),
    },
}) satisfies PrismaConfig
