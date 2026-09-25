/*
  Warnings:

  - You are about to drop the `Answer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Section` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Topic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Website` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `answers` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Answer" DROP CONSTRAINT "Answer_question_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Question" DROP CONSTRAINT "Question_section_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Section" DROP CONSTRAINT "Section_topic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Topic" DROP CONSTRAINT "Topic_website_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Website" DROP CONSTRAINT "Website_owner_id_fkey";

-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "answers" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."Answer";

-- DropTable
DROP TABLE "public"."Section";

-- DropTable
DROP TABLE "public"."Topic";

-- DropTable
DROP TABLE "public"."Website";

-- CreateTable
CREATE TABLE "public"."Page" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Group" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "page_id" UUID,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Page_url_owner_id_key" ON "public"."Page"("url", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_page_id_key" ON "public"."Group"("name", "page_id");

-- AddForeignKey
ALTER TABLE "public"."Page" ADD CONSTRAINT "Page_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
