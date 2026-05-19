-- CreateEnum
-- Prisma uses native enum on MySQL as ENUM column

-- CreateTable
CREATE TABLE `ScheduleResourceLock` (
    `id` VARCHAR(191) NOT NULL,
    `resourceType` ENUM('COACH', 'VENUE') NOT NULL,
    `resourceId` VARCHAR(191) NOT NULL,
    `timeSlotKey` VARCHAR(191) NOT NULL,
    `scheduleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ScheduleResourceLock_resourceType_resourceId_timeSlotKey_key`(`resourceType`, `resourceId`, `timeSlotKey`),
    INDEX `ScheduleResourceLock_scheduleId_idx`(`scheduleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ScheduleResourceLock` ADD CONSTRAINT `ScheduleResourceLock_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `Schedule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
