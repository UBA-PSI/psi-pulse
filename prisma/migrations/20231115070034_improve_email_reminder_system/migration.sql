/*
  Warnings:

  - You are about to drop the column `reminder_sent` on the `QuestionProgress` table. All the data in the column will be lost.
  - You are about to drop the column `public_key` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[reminder_token]` on the table `Group` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reminder_token]` on the table `Page` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reminder_token]` on the table `QuestionProgress` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."User_public_key_key";

-- AlterTable
ALTER TABLE "public"."Group" ADD COLUMN     "reminder_token" TEXT;

-- AlterTable
ALTER TABLE "public"."Page" ADD COLUMN     "reminder_token" TEXT;

-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."QuestionProgress" DROP COLUMN "reminder_sent",
ADD COLUMN     "reminder_token" TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "public_key",
ADD COLUMN     "last_reminder_sent" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."ThirdPartySession" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" BIGINT NOT NULL,

    CONSTRAINT "ThirdPartySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPartySession_id_key" ON "public"."ThirdPartySession"("id");

-- CreateIndex
CREATE INDEX "ThirdPartySession_user_id_idx" ON "public"."ThirdPartySession"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Group_reminder_token_key" ON "public"."Group"("reminder_token");

-- CreateIndex
CREATE UNIQUE INDEX "Page_reminder_token_key" ON "public"."Page"("reminder_token");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionProgress_reminder_token_key" ON "public"."QuestionProgress"("reminder_token");

-- AddForeignKey
ALTER TABLE "public"."ThirdPartySession" ADD CONSTRAINT "ThirdPartySession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
