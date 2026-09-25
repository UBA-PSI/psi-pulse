/*
  Warnings:

  - A unique constraint covering the columns `[hash,page_id]` on the table `Question` will be added. If there are existing duplicate values, this will fail.
  - Made the column `page_id` on table `Group` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `page_id` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Group" DROP CONSTRAINT "Group_page_id_fkey";

-- DropIndex
DROP INDEX "public"."Question_hash_group_id_key";

-- AlterTable
ALTER TABLE "public"."Group" ALTER COLUMN "page_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "page_id" UUID NOT NULL,
ALTER COLUMN "group_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Question_hash_page_id_key" ON "public"."Question"("hash", "page_id");

-- AddForeignKey
ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."Page"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."Page"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
