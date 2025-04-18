/*
  Warnings:

  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Document";

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preservationDate" TIMESTAMP(3),
    "status" "PreservationStatus" NOT NULL DEFAULT 'INICIADA',
    "archivematicaId" TEXT,
    "sipId" TEXT,
    "aipId" TEXT,
    "dipId" TEXT,
    "filePath" TEXT NOT NULL,
    "metadados" JSONB NOT NULL,
    "author" TEXT,
    "description" TEXT,
    "keywords" TEXT,
    "category" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
