/*
  Warnings:

  - You are about to drop the column `userId` on the `QuestionLog` table. All the data in the column will be lost.
  - Made the column `last_reminder_sent` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Question" DROP CONSTRAINT "Question_page_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Question" DROP CONSTRAINT "Question_weeklyEmailId_fkey";

-- DropForeignKey
ALTER TABLE "public"."QuestionLog" DROP CONSTRAINT "QuestionLog_userId_fkey";

-- AlterTable
ALTER TABLE "public"."QuestionLog" DROP COLUMN "userId",
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "last_reminder_sent" SET NOT NULL,
ALTER COLUMN "last_reminder_sent" SET DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "public"."QuestionLog" ADD CONSTRAINT "QuestionLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_weeklyEmailId_fkey" FOREIGN KEY ("weeklyEmailId") REFERENCES "public"."WeeklyEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
