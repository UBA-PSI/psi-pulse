/*
  Warnings:

  - Added the required column `completed_at` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reminder_offset` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "completed_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "reminder_offset" INTEGER NOT NULL;
