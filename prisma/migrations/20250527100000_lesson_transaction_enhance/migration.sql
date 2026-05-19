-- LessonTransaction: studentId, businessKey (replaces deductKey), operatorId, balance snapshot, metadata

ALTER TABLE `LessonTransaction`
    ADD COLUMN `studentId` VARCHAR(191) NULL,
    ADD COLUMN `businessKey` VARCHAR(191) NULL,
    ADD COLUMN `operatorId` VARCHAR(191) NULL,
    ADD COLUMN `beforeRemaining` INTEGER NULL,
    ADD COLUMN `afterRemaining` INTEGER NULL,
    ADD COLUMN `metadata` JSON NULL;

UPDATE `LessonTransaction` lt
INNER JOIN `MembershipCard` mc ON lt.`membershipId` = mc.`id`
SET lt.`studentId` = mc.`studentId`;

UPDATE `LessonTransaction`
SET `businessKey` = COALESCE(`deductKey`, CONCAT('legacy:', `id`))
WHERE `businessKey` IS NULL;

ALTER TABLE `LessonTransaction`
    MODIFY `studentId` VARCHAR(191) NOT NULL,
    MODIFY `businessKey` VARCHAR(191) NOT NULL;

DROP INDEX `LessonTransaction_deductKey_key` ON `LessonTransaction`;

ALTER TABLE `LessonTransaction` DROP COLUMN `deductKey`;

CREATE UNIQUE INDEX `LessonTransaction_businessKey_key` ON `LessonTransaction`(`businessKey`);

CREATE INDEX `LessonTransaction_studentId_createdAt_idx` ON `LessonTransaction`(`studentId`, `createdAt`);

ALTER TABLE `LessonTransaction`
    ADD CONSTRAINT `LessonTransaction_studentId_fkey`
        FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
