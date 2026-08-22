-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "fxRate" DECIMAL(18,8),
ADD COLUMN     "fxRateAt" TIMESTAMP(3),
ADD COLUMN     "originalAmount" DECIMAL(12,2),
ADD COLUMN     "originalCurrency" TEXT;

-- AlterTable
ALTER TABLE "Stop" ADD COLUMN     "fxRate" DECIMAL(18,8),
ADD COLUMN     "fxRateAt" TIMESTAMP(3),
ADD COLUMN     "originalCurrency" TEXT,
ADD COLUMN     "originalStayCost" DECIMAL(12,2),
ADD COLUMN     "originalTransportCost" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "TripActivity" ADD COLUMN     "fxRate" DECIMAL(18,8),
ADD COLUMN     "fxRateAt" TIMESTAMP(3),
ADD COLUMN     "originalCost" DECIMAL(12,2),
ADD COLUMN     "originalCurrency" TEXT;
