/*
  Warnings:

  - Made the column `group_id` on table `Question` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Question" ALTER COLUMN "group_id" SET NOT NULL;
