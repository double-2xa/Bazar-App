-- Dual signatures on delivery proof (driver + client)
ALTER TABLE "DeliveryProof" ADD COLUMN "agentSignatureDataUrl" TEXT;
ALTER TABLE "DeliveryProof" ADD COLUMN "clientSignatureDataUrl" TEXT;
