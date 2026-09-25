/*
  Warnings:

  - You are about to drop the column `prefered_delivery_time` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,owner_id]` on the table `Page` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `preferred_delivery_time` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Page_url_owner_id_key";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "prefered_delivery_time",
ADD COLUMN     "preferred_delivery_time" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Page_name_owner_id_key" ON "public"."Page"("name", "owner_id");
