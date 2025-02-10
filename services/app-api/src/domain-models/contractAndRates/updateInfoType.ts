import { z } from 'zod'
import * as v from "@badrap/valita";

import type { contractSchema } from './contractTypes'
import { baseUserSchema, valitaBaseUserSchema } from '../UserType'

const updateInfoSchema = z.object({
    updatedAt: z.date(),
    updatedBy: baseUserSchema.omit({ id: true }),
    updatedReason: z.string(),
})

const DateType = v.string().chain((s) => {
    const date = new Date(s);
  
    if (isNaN(+date)) {
      return v.err("invalid date");
    }
  
    return v.ok(date);
  });
const valitaUpdateInfoSchema = v.object({
    updatedAt: DateType, // no support for date
    updatedBy: valitaBaseUserSchema, // omitting id not supported
    updatedReason: v.string(),
})

type UpdateInfoType = z.infer<typeof updateInfoSchema>
type PackageStatusType = z.infer<typeof contractSchema.shape.status>

export type { PackageStatusType, UpdateInfoType }

export { updateInfoSchema, valitaUpdateInfoSchema }
