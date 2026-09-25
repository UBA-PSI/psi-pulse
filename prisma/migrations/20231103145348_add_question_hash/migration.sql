/*
  Warnings:

  - A unique constraint covering the columns `[hash,section_id]` on the table `Question` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,topic_id]` on the table `Section` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,website_id]` on the table `Topic` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[domain,owner_id]` on the table `Website` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hash` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "hash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Question_hash_section_id_key" ON "public"."Question"("hash", "section_id");

-- CreateIndex
CREATE UNIQUE INDEX "Section_name_topic_id_key" ON "public"."Section"("name", "topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_name_website_id_key" ON "public"."Topic"("name", "website_id");

-- CreateIndex
CREATE UNIQUE INDEX "Website_domain_owner_id_key" ON "public"."Website"("domain", "owner_id");
