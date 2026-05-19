-- Audit columns: createdBy / updatedBy / deletedBy (User.id, no FK for cross-tenant flexibility)

ALTER TABLE `Schedule`
    ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL,
    ADD COLUMN `deletedBy` VARCHAR(191) NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

ALTER TABLE `MembershipCard`
    ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL,
    ADD COLUMN `deletedBy` VARCHAR(191) NULL;

ALTER TABLE `Order`
    ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL,
    ADD COLUMN `deletedBy` VARCHAR(191) NULL;

ALTER TABLE `LessonTransaction`
    ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL,
    ADD COLUMN `deletedBy` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

CREATE INDEX `Schedule_createdBy_idx` ON `Schedule`(`createdBy`);
CREATE INDEX `MembershipCard_createdBy_idx` ON `MembershipCard`(`createdBy`);
CREATE INDEX `Order_createdBy_idx` ON `Order`(`createdBy`);
CREATE INDEX `LessonTransaction_createdBy_idx` ON `LessonTransaction`(`createdBy`);
