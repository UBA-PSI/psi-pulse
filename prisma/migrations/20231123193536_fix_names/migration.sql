/*
  Warnings:

  - You are about to drop the column `receiveEmails` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `receiveWeeklyEmail` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `weeklyAmount` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "receiveEmails",
DROP COLUMN "receiveWeeklyEmail",
DROP COLUMN "weeklyAmount",
ADD COLUMN     "receive_emails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "receive_weekly_emails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weekly_email_number" INTEGER NOT NULL DEFAULT 6;
