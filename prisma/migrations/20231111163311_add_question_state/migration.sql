/*
  Warnings:

  - You are about to drop the column `completed_at` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `reminder_offset` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `reminder_sent` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Question` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[question_progress_id]` on the table `Question` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `question_progress_id` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."CurrentState" AS ENUM ('INITIAL', 'STATE_1', 'STATE_2', 'STATE_3', 'STATE_4', 'FINAL');

-- AlterTable
ALTER TABLE "public"."Question" DROP COLUMN "completed_at",
DROP COLUMN "reminder_offset",
DROP COLUMN "reminder_sent",
DROP COLUMN "updatedAt",
ADD COLUMN     "question_progress_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "public"."QuestionProgress" (
    "id" UUID NOT NULL,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_state" "public"."CurrentState" NOT NULL DEFAULT 'INITIAL',
    "initial_state_id" UUID NOT NULL,
    "state_1_id" UUID NOT NULL,
    "state_2_id" UUID,
    "state_3_id" UUID,
    "state_4_id" UUID,
    "final_state_id" UUID NOT NULL,

    CONSTRAINT "QuestionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionState" (
    "id" UUID NOT NULL,
    "offset" INTEGER NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "QuestionState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionState_offset_label_key" ON "public"."QuestionState"("offset", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Question_question_progress_id_key" ON "public"."Question"("question_progress_id");

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_question_progress_id_fkey" FOREIGN KEY ("question_progress_id") REFERENCES "public"."QuestionProgress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionProgress" ADD CONSTRAINT "QuestionProgress_initial_state_id_fkey" FOREIGN KEY ("initial_state_id") REFERENCES "public"."QuestionState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionProgress" ADD CONSTRAINT "QuestionProgress_state_1_id_fkey" FOREIGN KEY ("state_1_id") REFERENCES "public"."QuestionState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionProgress" ADD CONSTRAINT "QuestionProgress_state_2_id_fkey" FOREIGN KEY ("state_2_id") REFERENCES "public"."QuestionState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionProgress" ADD CONSTRAINT "QuestionProgress_state_3_id_fkey" FOREIGN KEY ("state_3_id") REFERENCES "public"."QuestionState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionProgress" ADD CONSTRAINT "QuestionProgress_state_4_id_fkey" FOREIGN KEY ("state_4_id") REFERENCES "public"."QuestionState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionProgress" ADD CONSTRAINT "QuestionProgress_final_state_id_fkey" FOREIGN KEY ("final_state_id") REFERENCES "public"."QuestionState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
