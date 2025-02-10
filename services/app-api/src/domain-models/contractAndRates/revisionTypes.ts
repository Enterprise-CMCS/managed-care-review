import { z } from 'zod'
import * as v from "@badrap/valita";

import { updateInfoSchema, valitaUpdateInfoSchema } from './updateInfoType'
import { contractFormDataSchema, rateFormDataSchema, valitaContractFormDataSchema, valitaRateFormDataSchema } from './formDataTypes'

const contractRevisionSchema = z.object({
    id: z.string().uuid(),
    contract: z.object({
        id: z.string().uuid(),
        stateCode: z.string(),
        stateNumber: z.number().min(1),
    }),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: contractFormDataSchema,
})

const DateType = v.string().chain((s) => {
    const date = new Date(s);
  
    if (isNaN(+date)) {
      return v.err("invalid date");
    }
  
    return v.ok(date);
  });
const valitaContractRevisionSchema = v.object({
    id: v.string(),
    contract: v.object({
        id: v.string(), // no support for UUID
        stateCode: v.string(),
        stateNumber: v.number(), // no support for min
    }),
    submitInfo: valitaUpdateInfoSchema.optional(),
    unlockInfo: valitaUpdateInfoSchema.optional(),
    createdAt: DateType, // no support for date
    updatedAt: DateType, // no support for date
    formData: valitaContractFormDataSchema,
})

const rateRevisionSchema = z.object({
    id: z.string().uuid(),
    rateID: z.string().uuid(),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: rateFormDataSchema,
})

const valitaRateRevisionSchema = v.object({
    id: v.string(), // uuid not supported
    rateID: v.string(),// uuid not supported
    submitInfo: valitaUpdateInfoSchema.optional(),
    unlockInfo: valitaUpdateInfoSchema.optional(),
    createdAt: DateType, // date not supported
    updatedAt: DateType, // date not supported
    formData: valitaRateFormDataSchema,
})

type ContractRevisionType = z.infer<typeof contractRevisionSchema>
type RateRevisionType = z.infer<typeof rateRevisionSchema>

export { contractRevisionSchema, rateRevisionSchema, valitaContractRevisionSchema, valitaRateRevisionSchema }

export type { ContractRevisionType, RateRevisionType }
