/*
  Warnings:

  - You are about to drop the column `preferred_email_delivery_time` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[label,offset]` on the table `QuestionState` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[unsubscribe_emails_token]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[unsubscribe_weekly_emails_token]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `preferred_reminder_email_delivery_time` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preferred_weekly_email_delivery_day` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preferred_weekly_email_delivery_time` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."QuestionState_offset_label_key";

-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "weeklyEmailId" UUID;

-- AlterTable
ALTER TABLE "public"."QuestionProgress" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "active_since" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "waiting_for_remembered" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "preferred_email_delivery_time",
ADD COLUMN     "email_paused_until" TIMESTAMP(3),
ADD COLUMN     "oldest_reminder_sent" TIMESTAMP(3),
ADD COLUMN     "oldest_weekly_sent" TIMESTAMP(3),
ADD COLUMN     "preferred_reminder_email_delivery_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "preferred_weekly_email_delivery_day" INTEGER NOT NULL,
ADD COLUMN     "preferred_weekly_email_delivery_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "unsubscribe_emails_token" TEXT,
ADD COLUMN     "unsubscribe_weekly_emails_token" TEXT,
ADD COLUMN     "weekly_streak" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."WeeklyEmail" (
    "id" UUID NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "WeeklyEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyEmail_token_key" ON "public"."WeeklyEmail"("token");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyEmail_user_id_key" ON "public"."WeeklyEmail"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionState_label_offset_key" ON "public"."QuestionState"("label", "offset");

-- CreateIndex
CREATE UNIQUE INDEX "User_unsubscribe_emails_token_key" ON "public"."User"("unsubscribe_emails_token");

-- CreateIndex
CREATE UNIQUE INDEX "User_unsubscribe_weekly_emails_token_key" ON "public"."User"("unsubscribe_weekly_emails_token");

-- AddForeignKey
ALTER TABLE "public"."WeeklyEmail" ADD CONSTRAINT "WeeklyEmail_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_weeklyEmailId_fkey" FOREIGN KEY ("weeklyEmailId") REFERENCES "public"."WeeklyEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
