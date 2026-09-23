CREATE TYPE "TaskPriority" AS ENUM ('NORMAL', 'HIGH');

ALTER TABLE "tasks"
ADD COLUMN "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL';
