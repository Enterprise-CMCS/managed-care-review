import type { PrismaTransactionType } from '../prismaTypes'
import { NotFoundError } from '../postgresErrors'
import { parseContractWithHistory } from './parseContractWithHistory'
import { includeFullContract } from './prismaFullContractRateHelpers'
import type { ContractOrErrorArrayType } from './findAllContractsWithHistoryByState'
import type { ContractType } from '../../domain-models/contractAndRates'

type WithLatest = {
    latestQuestionCreatedAt?: Date
    latestRateQuestionCreatedAt?: Date
}

async function findAllContractsWithHistoryBySubmitInfo(
    client: PrismaTransactionType,
    useZod: boolean = true
): Promise<ContractOrErrorArrayType | NotFoundError | Error> {
    try {
        const contracts = await client.contractTable.findMany({
            where: {
                revisions: {
                    some: {
                        submitInfoID: { not: null },
                    },
                },
                stateCode: { not: 'AS' }, // exclude test state as per ADR 019
            },
            include: includeFullContract,
        })

        if (!contracts) {
            const err = `PRISMA ERROR: Cannot find all contracts by submit info`
            console.error(err)
            return new NotFoundError(err)
        }

        const contractIDs = contracts.map((c) => c.id)

        // A) Latest CONTRACT question per contract
        const latestContractQ =
            contractIDs.length === 0
                ? []
                : await client.contractQuestion.groupBy({
                      by: ['contractID'],
                      where: { contractID: { in: contractIDs } },
                      _max: { createdAt: true },
                  })

        const latestContractQuestionByContract: { [contractID: string]: Date } =
            {}
        for (const row of latestContractQ) {
            const createdAt = row._max?.createdAt
            if (createdAt) {
                latestContractQuestionByContract[row.contractID] = createdAt
            }
        }

        // B) Build contractID -> rateIDs from submissions + current draft links

        // B1) Contract revisions (for submission linkage)
        const contractRevisions =
            contractIDs.length === 0
                ? []
                : await client.contractRevisionTable.findMany({
                      where: {
                          contractID: {
                              in: contractIDs,
                          },
                      },
                      select: {
                          id: true,
                          contractID: true,
                      },
                  })

        const contractIDByRevisionID: { [revID: string]: string } = {}
        const contractRevisionIDs: string[] = []
        for (const rev of contractRevisions) {
            contractIDByRevisionID[rev.id] = rev.contractID
            contractRevisionIDs.push(rev.id)
        }

        // B2) Submission join rows -> rateRevisionIDs for those contract revisions
        const submissionJoins =
            contractRevisionIDs.length === 0
                ? []
                : await client.submissionPackageJoinTable.findMany({
                      where: {
                          contractRevisionID: { in: contractRevisionIDs },
                      },
                      select: {
                          contractRevisionID: true,
                          rateRevisionID: true,
                      },
                  })

        // B3) Map rateRevisionID -> rateID
        const rateRevisionIDs: string[] = []
        for (const j of submissionJoins) {
            if (j.rateRevisionID) {
                rateRevisionIDs.push(j.rateRevisionID)
            }
        }

        const rateRevisions =
            rateRevisionIDs.length === 0
                ? []
                : await client.rateRevisionTable.findMany({
                      where: { id: { in: rateRevisionIDs } },
                      select: { id: true, rateID: true },
                  })

        const rateIDByRateRevisionID: { [rateRevisionID: string]: string } = {}
        for (const rr of rateRevisions) {
            rateIDByRateRevisionID[rr.id] = rr.rateID
        }

        // B4) Start with submissions-based rate IDs
        const relatedRateIDsByContract: { [contractID: string]: string[] } = {}
        for (const cid of contractIDs) {
            relatedRateIDsByContract[cid] = []
        }

        for (const j of submissionJoins) {
            const cid = contractIDByRevisionID[j.contractRevisionID]
            const rid = j.rateRevisionID
                ? rateIDByRateRevisionID[j.rateRevisionID]
                : undefined
            if (cid && rid) {
                relatedRateIDsByContract[cid].push(rid)
            }
        }

        // B5) Also include current draft links (DraftRateJoinTable)
        const draftLinks =
            contractIDs.length === 0
                ? []
                : await client.draftRateJoinTable.findMany({
                      where: { contractID: { in: contractIDs } },
                      select: { contractID: true, rateID: true },
                  })

        for (const link of draftLinks) {
            if (relatedRateIDsByContract[link.contractID]) {
                relatedRateIDsByContract[link.contractID].push(link.rateID)
            } else {
                relatedRateIDsByContract[link.contractID] = [link.rateID]
            }
        }

        // Flatten rate IDs (no need for dedupe for style consistency)
        const allRateIDs: string[] = []
        for (const cid of contractIDs) {
            const list = relatedRateIDsByContract[cid]
            if (!list || list.length === 0) continue
            for (const rid of list) {
                allRateIDs.push(rid)
            }
        }

        // C) Latest RATE question per rate -> fold into per-contract max
        const latestRateQByRate =
            allRateIDs.length === 0
                ? []
                : await client.rateQuestion.groupBy({
                      by: ['rateID'],
                      where: { rateID: { in: allRateIDs } },
                      _max: { createdAt: true },
                  })

        const latestRateQuestionByRateID: { [rateID: string]: Date } = {}
        for (const row of latestRateQByRate) {
            const createdAt = row._max?.createdAt
            if (createdAt) {
                latestRateQuestionByRateID[row.rateID] = createdAt
            }
        }

        const latestRateQuestionByContract: { [contractID: string]: Date } = {}
        for (const cid of contractIDs) {
            const rateIDs = relatedRateIDsByContract[cid]
            if (!rateIDs || rateIDs.length === 0) continue

            let maxDate: Date | undefined = undefined
            for (const rid of rateIDs) {
                const d = latestRateQuestionByRateID[rid]
                if (d && (!maxDate || d.getTime() > maxDate.getTime())) {
                    maxDate = d
                }
            }

            if (maxDate) {
                latestRateQuestionByContract[cid] = maxDate
            }
        }

        // D) Parse + augment
        const parsed: ContractOrErrorArrayType = []
        for (const raw of contracts) {
            const base = parseContractWithHistory(raw, useZod)
            if (base instanceof Error) {
                parsed.push({ contractID: raw.id, contract: base })
                continue
            }

            const augmented = {
                ...(base as ContractType),
                latestQuestionCreatedAt:
                    latestContractQuestionByContract[raw.id],
                latestRateQuestionCreatedAt:
                    latestRateQuestionByContract[raw.id],
            } as ContractType & WithLatest

            parsed.push({ contractID: raw.id, contract: augmented })
        }

        return parsed
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findAllContractsWithHistoryBySubmitInfo }
