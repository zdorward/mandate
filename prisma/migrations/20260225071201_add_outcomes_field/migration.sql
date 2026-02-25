-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MandateVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mandateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "weights" TEXT,
    "riskTolerance" TEXT,
    "nonNegotiables" TEXT,
    "outcomes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checksum" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MandateVersion_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MandateVersion" ("checksum", "createdAt", "id", "isActive", "mandateId", "nonNegotiables", "riskTolerance", "version", "weights") SELECT "checksum", "createdAt", "id", "isActive", "mandateId", "nonNegotiables", "riskTolerance", "version", "weights" FROM "MandateVersion";
DROP TABLE "MandateVersion";
ALTER TABLE "new_MandateVersion" RENAME TO "MandateVersion";
CREATE UNIQUE INDEX "MandateVersion_mandateId_version_key" ON "MandateVersion"("mandateId", "version");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
