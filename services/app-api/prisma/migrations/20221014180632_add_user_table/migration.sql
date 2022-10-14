-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CMS_USER', 'STATE_USER', 'ADMIN_USER');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "euaID" TEXT NOT NULL,
    "givenName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StateToUser" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_euaID_key" ON "User"("euaID");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_StateToUser_AB_unique" ON "_StateToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_StateToUser_B_index" ON "_StateToUser"("B");

-- AddForeignKey
ALTER TABLE "_StateToUser" ADD CONSTRAINT "_StateToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "State"("stateCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StateToUser" ADD CONSTRAINT "_StateToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
