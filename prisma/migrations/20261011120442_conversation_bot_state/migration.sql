-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "botState" JSONB NOT NULL DEFAULT '{}';
