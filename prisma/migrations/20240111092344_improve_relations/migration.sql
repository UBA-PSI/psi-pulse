-- DropForeignKey
ALTER TABLE "public"."Question" DROP CONSTRAINT "Question_group_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Question" DROP CONSTRAINT "Question_question_progress_id_fkey";

-- DropIndex
DROP INDEX "public"."ReminderEmail_user_id_key";

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_question_progress_id_fkey" FOREIGN KEY ("question_progress_id") REFERENCES "public"."QuestionProgress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
