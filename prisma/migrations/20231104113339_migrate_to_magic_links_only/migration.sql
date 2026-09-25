/*
  Warnings:

  - You are about to drop the column `email_verified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `PasswordResetToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_user_id_fkey";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "email_verified";

-- DropTable
DROP TABLE "public"."PasswordResetToken";
