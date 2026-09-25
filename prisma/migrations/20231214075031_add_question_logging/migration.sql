-- CreateEnum
CREATE TYPE "public"."QuestionLogType" AS ENUM ('REMINDER', 'WEEKLY');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "last_weekly_sent" TIMESTAMP(3),
ADD COLUMN     "log_questions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."QuestionLog" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "question_state" "public"."CurrentState" NOT NULL,
    "question_type" "public"."QuestionLogType" NOT NULL,
    "remembered" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "QuestionLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."QuestionLog" ADD CONSTRAINT "QuestionLog_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionLog" ADD CONSTRAINT "QuestionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
