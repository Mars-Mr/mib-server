-- Idempotent check-in deduction key (one deduct per student + schedule)
ALTER TABLE `LessonTransaction` ADD COLUMN `deductKey` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `LessonTransaction_deductKey_key` ON `LessonTransaction`(`deductKey`);
