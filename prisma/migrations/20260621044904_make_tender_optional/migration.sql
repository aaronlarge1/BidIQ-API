-- DropForeignKey
ALTER TABLE "Bid" DROP CONSTRAINT "Bid_tenderId_fkey";

-- AlterTable
ALTER TABLE "Bid" ALTER COLUMN "tenderId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE SET NULL ON UPDATE CASCADE;
