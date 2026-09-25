/*
  Warnings:

  - You are about to drop the column `preferred_delivery_time` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `weekly_email_number` on the `User` table. All the data in the column will be lost.
  - Added the required column `preferred_email_delivery_time` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "preferred_delivery_time",
DROP COLUMN "weekly_email_number",
ADD COLUMN     "preferred_email_delivery_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "weekly_emails_number" INTEGER NOT NULL DEFAULT 6;
