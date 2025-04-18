-- CreateEnum
CREATE TYPE "PreservationStatus" AS ENUM ('INICIADA', 'PRESERVADO', 'FALHA');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preservationDate" TIMESTAMP(3),
    "status" "PreservationStatus" NOT NULL DEFAULT 'INICIADA',
    "archivematicaId" TEXT,
    "filePath" TEXT NOT NULL,
    "metadados" JSONB NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
