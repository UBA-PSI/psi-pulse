-- DropForeignKey
ALTER TABLE "public"."Question" DROP CONSTRAINT "Question_weeklyEmailId_fkey";

-- DropForeignKey
ALTER TABLE "public"."QuestionLog" DROP CONSTRAINT "QuestionLog_question_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."QuestionLog" DROP CONSTRAINT "QuestionLog_user_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."QuestionLog" ADD CONSTRAINT "QuestionLog_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionLog" ADD CONSTRAINT "QuestionLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_weeklyEmailId_fkey" FOREIGN KEY ("weeklyEmailId") REFERENCES "public"."WeeklyEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
