-- CreateEnum
CREATE TYPE "PreservationStatus" AS ENUM ('INICIADA', 'PRESERVADO', 'FALHA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preservationDate" TIMESTAMP(3),
    "status" "PreservationStatus" NOT NULL DEFAULT 'INICIADA',
    "archivematicaId" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
