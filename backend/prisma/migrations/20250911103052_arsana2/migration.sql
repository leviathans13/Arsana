-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "LetterCategory" AS ENUM ('GENERAL', 'INVITATION', 'OFFICIAL', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incoming_letters" (
    "id" TEXT NOT NULL,
    "letterNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "category" "LetterCategory" NOT NULL DEFAULT 'GENERAL',
    "description" TEXT,
    "fileName" TEXT,
    "filePath" TEXT,
    "isInvitation" BOOLEAN NOT NULL DEFAULT false,
    "eventDate" TIMESTAMP(3),
    "eventLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "incoming_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outgoing_letters" (
    "id" TEXT NOT NULL,
    "letterNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "sentDate" TIMESTAMP(3) NOT NULL,
    "category" "LetterCategory" NOT NULL DEFAULT 'GENERAL',
    "description" TEXT,
    "fileName" TEXT,
    "filePath" TEXT,
    "isInvitation" BOOLEAN NOT NULL DEFAULT false,
    "eventDate" TIMESTAMP(3),
    "eventLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "outgoing_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "incoming_letters_letterNumber_key" ON "incoming_letters"("letterNumber");

-- CreateIndex
CREATE UNIQUE INDEX "outgoing_letters_letterNumber_key" ON "outgoing_letters"("letterNumber");

-- AddForeignKey
ALTER TABLE "incoming_letters" ADD CONSTRAINT "incoming_letters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outgoing_letters" ADD CONSTRAINT "outgoing_letters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
