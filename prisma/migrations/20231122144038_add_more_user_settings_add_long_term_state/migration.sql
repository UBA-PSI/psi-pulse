/*
  Warnings:

  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "public"."CurrentState" ADD VALUE 'LONG_TERM';

-- DropForeignKey
ALTER TABLE "public"."Group" DROP CONSTRAINT "Group_page_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Question" DROP CONSTRAINT "Question_question_progress_id_fkey";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "receiveEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "receiveWeeklyEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weeklyAmount" INTEGER NOT NULL DEFAULT 6;

-- AddForeignKey
ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_question_progress_id_fkey" FOREIGN KEY ("question_progress_id") REFERENCES "public"."QuestionProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
