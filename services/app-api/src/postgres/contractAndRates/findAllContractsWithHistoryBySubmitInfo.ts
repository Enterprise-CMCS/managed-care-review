import type { PrismaTransactionType } from '../prismaTypes'
import { NotFoundError } from '../postgresErrors'
import { parseContractWithHistory } from './parseContractWithHistory'
import { includeFullContract } from './prismaFullContractRateHelpers'
import type { ContractOrErrorArrayType } from './findAllContractsWithHistoryByState'
import type { ContractType } from '../../domain-models/contractAndRates'

type WithLatest = {
    latestQuestionCreatedAt?: Date
    latestRateQuestionCreatedAt?: Date
    latestLinkedRateSubmitUpdatedAt?: Date
    latestQuestionResponseCreatedAt?: Date
    latestRateQuestionResponseCreatedAt?: Date
}

/**
 * findAllContractsWithHistoryBySubmitInfo
 *
 * @param client Prisma transaction/client
 * @param useZod defaults to true (existing behavior)
 * @param skipFindingLatest if true, SKIP computing all the “latest*” helper timestamps
 */
async function findAllContractsWithHistoryBySubmitInfo(
    client: PrismaTransactionType,
    useZod: boolean = true,
    skipFindingLatest: boolean = false
): Promise<ContractOrErrorArrayType | NotFoundError | Error> {
    try {
        const contracts = await client.contractTable.findMany({
            where: {
                revisions: { some: { submitInfoID: { not: null } } },
                stateCode: { not: 'AS' }, // exclude test state as per ADR 019
            },
            include: includeFullContract,
        })

        if (!contracts) {
            const err = `PRISMA ERROR: Cannot find all contracts by submit info`
            console.error(err)
            return new NotFoundError(err)
        }

        const parsedBase: ContractOrErrorArrayType = []
        for (const raw of contracts) {
            const parsed = parseContractWithHistory(raw, useZod)
            parsedBase.push({ contractID: raw.id, contract: parsed })
        }

        if (skipFindingLatest) {
            return parsedBase
        }

        // ------------------------------------------------------------------
        // Extra processing (only when skipFindingLatest === false)
        // ------------------------------------------------------------------

        const contractIDs = contracts.map((c) => c.id)

        // Latest CONTRACT question per contract
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

        // Contract revisions (for submission linkage)
        const contractRevisions =
            contractIDs.length === 0
                ? []
                : await client.contractRevisionTable.findMany({
                      where: { contractID: { in: contractIDs } },
                      select: { id: true, contractID: true },
                  })

        const contractIDByRevisionID: { [revID: string]: string } = {}
        const contractRevisionIDs: string[] = []
        for (const rev of contractRevisions) {
            contractIDByRevisionID[rev.id] = rev.contractID
            contractRevisionIDs.push(rev.id)
        }

        // Submission join rows -> rateRevisionIDs
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

        // Map rateRevisionID -> rateID
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

        // Start with submissions-based related rates
        const relatedRateIDsByContract: { [contractID: string]: string[] } = {}
        for (const cid of contractIDs) relatedRateIDsByContract[cid] = []

        for (const j of submissionJoins) {
            const cid = contractIDByRevisionID[j.contractRevisionID]
            const rid = j.rateRevisionID
                ? rateIDByRateRevisionID[j.rateRevisionID]
                : undefined
            if (cid && rid) {
                relatedRateIDsByContract[cid].push(rid)
            }
        }

        // Add current draft links (DraftRateJoinTable)
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

        // Add withdrawn links (WithdrawnRatesJoinTable)
        const withdrawnLinks =
            contractIDs.length === 0
                ? []
                : await client.withdrawnRatesJoinTable.findMany({
                      where: { contractID: { in: contractIDs } },
                      select: { contractID: true, rateID: true },
                  })

        for (const wl of withdrawnLinks) {
            if (relatedRateIDsByContract[wl.contractID]) {
                relatedRateIDsByContract[wl.contractID].push(wl.rateID)
            } else {
                relatedRateIDsByContract[wl.contractID] = [wl.rateID]
            }
        }

        // Collect all rateIDs
        const allRateIDs: string[] = []
        for (const cid of contractIDs) {
            const list = relatedRateIDsByContract[cid]
            if (!list || list.length === 0) continue
            for (const rid of list) allRateIDs.push(rid)
        }

        // Latest RATE question per rate
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

            let maxDate: Date | undefined
            for (const rid of rateIDs) {
                const d = latestRateQuestionByRateID[rid]
                if (d && (!maxDate || d.getTime() > maxDate.getTime())) {
                    maxDate = d
                }
            }
            if (maxDate) latestRateQuestionByContract[cid] = maxDate
        }

        // Latest submitted change on any related rate (RateRevision.submitInfo.updatedAt)
        const rateRevsWithSubmit =
            allRateIDs.length === 0
                ? []
                : await client.rateRevisionTable.findMany({
                      where: {
                          rateID: { in: allRateIDs },
                          submitInfoID: { not: null },
                      },
                      select: {
                          rateID: true,
                          submitInfo: { select: { updatedAt: true } },
                      },
                  })

        const latestSubmitByRateID: { [rateID: string]: Date } = {}
        for (const rr of rateRevsWithSubmit) {
            const d = rr.submitInfo?.updatedAt
            if (!d) continue
            const prev = latestSubmitByRateID[rr.rateID]
            if (!prev || d.getTime() > prev.getTime()) {
                latestSubmitByRateID[rr.rateID] = d
            }
        }

        const latestLinkedRateSubmitByContract: { [contractID: string]: Date } =
            {}
        for (const cid of contractIDs) {
            const rateIDs = relatedRateIDsByContract[cid]
            if (!rateIDs || rateIDs.length === 0) continue

            let maxDate: Date | undefined
            for (const rid of rateIDs) {
                const d = latestSubmitByRateID[rid]
                if (d && (!maxDate || d.getTime() > maxDate.getTime())) {
                    maxDate = d
                }
            }
            if (maxDate) latestLinkedRateSubmitByContract[cid] = maxDate
        }

        // Latest CONTRACT question RESPONSE per contract
        const contractResponses =
            contractIDs.length === 0
                ? []
                : await client.contractQuestionResponse.findMany({
                      where: {
                          question: {
                              contractID: { in: contractIDs },
                          },
                      },
                      select: {
                          createdAt: true,
                          question: { select: { contractID: true } },
                      },
                  })

        const latestContractResponseByContract: { [contractID: string]: Date } =
            {}
        for (const r of contractResponses) {
            const cid = r.question?.contractID
            const d = r.createdAt
            if (!cid || !d) continue
            const prev = latestContractResponseByContract[cid]
            if (!prev || d.getTime() > prev.getTime()) {
                latestContractResponseByContract[cid] = d
            }
        }

        // Latest RATE question RESPONSE per rate
        const rateResponses =
            allRateIDs.length === 0
                ? []
                : await client.rateQuestionResponse.findMany({
                      where: {
                          question: {
                              rateID: { in: allRateIDs },
                          },
                      },
                      select: {
                          createdAt: true,
                          question: { select: { rateID: true } },
                      },
                  })

        const latestRateResponseByRateID: { [rateID: string]: Date } = {}
        for (const r of rateResponses) {
            const rid = r.question?.rateID
            const d = r.createdAt
            if (!rid || !d) continue
            const prev = latestRateResponseByRateID[rid]
            if (!prev || d.getTime() > prev.getTime()) {
                latestRateResponseByRateID[rid] = d
            }
        }

        const latestRateResponseByContract: { [contractID: string]: Date } = {}
        for (const cid of contractIDs) {
            const rateIDs = relatedRateIDsByContract[cid]
            if (!rateIDs || rateIDs.length === 0) continue

            let maxDate: Date | undefined
            for (const rid of rateIDs) {
                const d = latestRateResponseByRateID[rid]
                if (d && (!maxDate || d.getTime() > maxDate.getTime())) {
                    maxDate = d
                }
            }
            if (maxDate) latestRateResponseByContract[cid] = maxDate
        }

        // Merge extra fields into parsed output
        const parsedWithExtras: ContractOrErrorArrayType = []
        for (const item of parsedBase) {
            if (item.contract instanceof Error) {
                parsedWithExtras.push(item)
                continue
            }
            const base = item.contract as ContractType
            const augmented = {
                ...base,
                latestQuestionCreatedAt:
                    latestContractQuestionByContract[item.contractID],
                latestRateQuestionCreatedAt:
                    latestRateQuestionByContract[item.contractID],
                latestLinkedRateSubmitUpdatedAt:
                    latestLinkedRateSubmitByContract[item.contractID],
                latestQuestionResponseCreatedAt:
                    latestContractResponseByContract[item.contractID],
                latestRateQuestionResponseCreatedAt:
                    latestRateResponseByContract[item.contractID],
            } as ContractType & WithLatest
            parsedWithExtras.push({
                contractID: item.contractID,
                contract: augmented,
            })
        }

        return parsedWithExtras
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findAllContractsWithHistoryBySubmitInfo }
