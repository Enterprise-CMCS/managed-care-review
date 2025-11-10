BEGIN;

ALTER TABLE "_SharedRateRevisions" ADD CONSTRAINT "_SharedRateRevisions_AB_pkey" PRIMARY KEY ("A", "B");
DROP INDEX "_SharedRateRevisions_AB_unique";

ALTER TABLE "_ContractRevisionTableToUpdateInfoTable" ADD CONSTRAINT "_ContractRevisionTableToUpdateInfoTable_AB_pkey" PRIMARY KEY ("A", "B");
DROP INDEX "_ContractRevisionTableToUpdateInfoTable_AB_unique";

ALTER TABLE "_RateRevisionTableToUpdateInfoTable" ADD CONSTRAINT "_RateRevisionTableToUpdateInfoTable_AB_pkey" PRIMARY KEY ("A", "B");
DROP INDEX "_RateRevisionTableToUpdateInfoTable_AB_unique";

ALTER TABLE "_StateToAssignedCMSUser" ADD CONSTRAINT "_StateToAssignedCMSUser_AB_pkey" PRIMARY KEY ("A", "B");
DROP INDEX "_StateToAssignedCMSUser_AB_unique";

COMMIT;
