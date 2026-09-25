/*
  Warnings:

  - You are about to drop the column `reminder_token` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `reminder_token` on the `Page` table. All the data in the column will be lost.
  - You are about to drop the column `weeklyEmailId` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `last_reminder_sent` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Question" DROP CONSTRAINT "Question_weeklyEmailId_fkey";

-- DropIndex
DROP INDEX "public"."Group_reminder_token_key";

-- DropIndex
DROP INDEX "public"."Page_reminder_token_key";

-- AlterTable
ALTER TABLE "public"."Group" DROP COLUMN "reminder_token";

-- AlterTable
ALTER TABLE "public"."Page" DROP COLUMN "reminder_token";

-- AlterTable
ALTER TABLE "public"."Question" DROP COLUMN "weeklyEmailId",
ADD COLUMN     "reminder_email_id" UUID,
ADD COLUMN     "weekly_email_id" UUID;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "last_reminder_sent",
ADD COLUMN     "last_reminder_check" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."ReminderEmail" (
    "id" UUID NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "ReminderEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderEmail_token_key" ON "public"."ReminderEmail"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderEmail_user_id_key" ON "public"."ReminderEmail"("user_id");

-- AddForeignKey
ALTER TABLE "public"."ReminderEmail" ADD CONSTRAINT "ReminderEmail_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_weekly_email_id_fkey" FOREIGN KEY ("weekly_email_id") REFERENCES "public"."WeeklyEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_reminder_email_id_fkey" FOREIGN KEY ("reminder_email_id") REFERENCES "public"."ReminderEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
