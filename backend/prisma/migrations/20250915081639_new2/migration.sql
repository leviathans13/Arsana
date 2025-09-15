/*
  Warnings:

  - You are about to drop the column `category` on the `incoming_letters` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `incoming_letters` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `outgoing_letters` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `outgoing_letters` table. All the data in the column will be lost.
  - You are about to drop the column `sentDate` on the `outgoing_letters` table. All the data in the column will be lost.
  - Added the required column `processor` to the `incoming_letters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipient` to the `incoming_letters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdDate` to the `outgoing_letters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `letterDate` to the `outgoing_letters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `processor` to the `outgoing_letters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender` to the `outgoing_letters` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LetterNature" AS ENUM ('BIASA', 'TERBATAS', 'RAHASIA', 'SANGAT_RAHASIA', 'PENTING');

-- CreateEnum
CREATE TYPE "SecurityClass" AS ENUM ('BIASA');

-- CreateEnum
CREATE TYPE "DispositionType" AS ENUM ('UMPEG', 'PERENCANAAN', 'KAUR_KEUANGAN', 'KABID', 'BIDANG1', 'BIDANG2', 'BIDANG3', 'BIDANG4', 'BIDANG5');

-- AlterTable
ALTER TABLE "incoming_letters" DROP COLUMN "category",
DROP COLUMN "description",
ADD COLUMN     "eventNotes" TEXT,
ADD COLUMN     "eventTime" TEXT,
ADD COLUMN     "letterDate" TIMESTAMP(3),
ADD COLUMN     "letterNature" "LetterNature" NOT NULL DEFAULT 'BIASA',
ADD COLUMN     "note" TEXT,
ADD COLUMN     "processor" TEXT NOT NULL,
ADD COLUMN     "recipient" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "outgoing_letters" DROP COLUMN "category",
DROP COLUMN "description",
DROP COLUMN "sentDate",
ADD COLUMN     "classificationCode" TEXT,
ADD COLUMN     "createdDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "eventNotes" TEXT,
ADD COLUMN     "eventTime" TEXT,
ADD COLUMN     "executionDate" TIMESTAMP(3),
ADD COLUMN     "letterDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "letterNature" "LetterNature" NOT NULL DEFAULT 'BIASA',
ADD COLUMN     "note" TEXT,
ADD COLUMN     "processor" TEXT NOT NULL,
ADD COLUMN     "securityClass" "SecurityClass" NOT NULL DEFAULT 'BIASA',
ADD COLUMN     "sender" TEXT NOT NULL,
ADD COLUMN     "serialNumber" INTEGER;

-- DropEnum
DROP TYPE "LetterCategory";

-- CreateTable
CREATE TABLE "dispositions" (
    "id" TEXT NOT NULL,
    "incomingLetterId" TEXT NOT NULL,
    "dispositionTo" "DispositionType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispositions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "dispositions" ADD CONSTRAINT "dispositions_incomingLetterId_fkey" FOREIGN KEY ("incomingLetterId") REFERENCES "incoming_letters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
