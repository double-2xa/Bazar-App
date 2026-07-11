-- Add 'accepted' to OrderStatus enum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'accepted';
