-- Einmal-Codes für den Login im eingebetteten Widget (Embed v2)
CREATE TABLE "public"."LoginCode" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'de',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginCode_email_idx" ON "public"."LoginCode"("email");
