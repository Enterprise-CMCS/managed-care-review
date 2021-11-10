-- CreateTable
CREATE TABLE "State" (
    "stateCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latestStateSubmissionNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "State_pkey" PRIMARY KEY ("stateCode")
);

-- AddForeignKey
ALTER TABLE "StateSubmission" ADD CONSTRAINT "StateSubmission_stateCode_fkey" FOREIGN KEY ("stateCode") REFERENCES "State"("stateCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add the states to our db
INSERT INTO "State" VALUES ('AL', 'Alabama');
INSERT INTO "State" VALUES ('NE', 'Nebraska');
INSERT INTO "State" VALUES ('AK', 'Alaska');
INSERT INTO "State" VALUES ('NV', 'Nevada');
INSERT INTO "State" VALUES ('AZ', 'Arizona');
INSERT INTO "State" VALUES ('NH', 'New Hampshire');
INSERT INTO "State" VALUES ('AR', 'Arkansas');
INSERT INTO "State" VALUES ('NJ', 'New Jersey');
INSERT INTO "State" VALUES ('CA', 'California');
INSERT INTO "State" VALUES ('NM', 'New Mexico');
INSERT INTO "State" VALUES ('CO', 'Colorado');
INSERT INTO "State" VALUES ('NY', 'New York');
INSERT INTO "State" VALUES ('CT', 'Connecticut');
INSERT INTO "State" VALUES ('NC', 'North Carolina');
INSERT INTO "State" VALUES ('DE', 'Delaware');
INSERT INTO "State" VALUES ('ND', 'North Dakota');
INSERT INTO "State" VALUES ('DC', 'District of Columbia');
INSERT INTO "State" VALUES ('OH', 'Ohio');
INSERT INTO "State" VALUES ('FL', 'Florida');
INSERT INTO "State" VALUES ('OK', 'Oklahoma');
INSERT INTO "State" VALUES ('GA', 'Georgia');
INSERT INTO "State" VALUES ('OR', 'Oregon');
INSERT INTO "State" VALUES ('HI', 'Hawaii');
INSERT INTO "State" VALUES ('PA', 'Pennsylvania');
INSERT INTO "State" VALUES ('ID', 'Idaho');
INSERT INTO "State" VALUES ('PR', 'Puerto Rico');
INSERT INTO "State" VALUES ('IL', 'Illinois');
INSERT INTO "State" VALUES ('RI', 'Rhode Island');
INSERT INTO "State" VALUES ('IN', 'Indiana');
INSERT INTO "State" VALUES ('SC', 'South Carolina');
INSERT INTO "State" VALUES ('IA', 'Iowa');
INSERT INTO "State" VALUES ('SD', 'South Dakota');
INSERT INTO "State" VALUES ('KS', 'Kansas');
INSERT INTO "State" VALUES ('TN', 'Tennessee');
INSERT INTO "State" VALUES ('KY', 'Kentucky');
INSERT INTO "State" VALUES ('TX', 'Texas');
INSERT INTO "State" VALUES ('LA', 'Louisiana');
INSERT INTO "State" VALUES ('UT', 'Utah');
INSERT INTO "State" VALUES ('ME', 'Maine');
INSERT INTO "State" VALUES ('VT', 'Vermont');
INSERT INTO "State" VALUES ('MD', 'Maryland');
INSERT INTO "State" VALUES ('VA', 'Virginia');
INSERT INTO "State" VALUES ('MA', 'Massachusetts');
INSERT INTO "State" VALUES ('VI', 'Virgin Islands');
INSERT INTO "State" VALUES ('MI', 'Michigan');
INSERT INTO "State" VALUES ('WA', 'Washington');
INSERT INTO "State" VALUES ('MN', 'Minnesota');
INSERT INTO "State" VALUES ('WV', 'West Virginia');
INSERT INTO "State" VALUES ('MS', 'Mississippi');
INSERT INTO "State" VALUES ('WI', 'Wisconsin');
INSERT INTO "State" VALUES ('MO', 'Missouri');
INSERT INTO "State" VALUES ('WY', 'Wyoming');
INSERT INTO "State" VALUES ('MT', 'Montana');
