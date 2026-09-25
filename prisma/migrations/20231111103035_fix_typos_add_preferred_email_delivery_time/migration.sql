/*
  Warnings:

  - You are about to drop the column `answers` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `section_id` on the `Question` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[hash,group_id]` on the table `Question` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `answer` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `group_id` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prefered_delivery_time` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Question" DROP CONSTRAINT "Question_section_id_fkey";

-- DropIndex
DROP INDEX "public"."Question_hash_section_id_key";

-- AlterTable
ALTER TABLE "public"."Question" DROP COLUMN "answers",
DROP COLUMN "section_id",
ADD COLUMN     "answer" TEXT NOT NULL,
ADD COLUMN     "group_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "prefered_delivery_time" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Question_hash_group_id_key" ON "public"."Question"("hash", "group_id");

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
