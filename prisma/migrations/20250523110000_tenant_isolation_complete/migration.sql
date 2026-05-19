-- Completes tenant migration when 20250523100000 partially applied (Tenant table already exists).

SET @db = DATABASE();

-- User.organizationId → tenantId (single ALTER: drop FK + rename column)
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'User' AND COLUMN_NAME = 'organizationId') > 0,
  'ALTER TABLE `User` DROP FOREIGN KEY `User_organizationId_fkey`, CHANGE `organizationId` `tenantId` VARCHAR(191) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'User' AND CONSTRAINT_NAME = 'User_tenantId_fkey') = 0,
  'ALTER TABLE `User` ADD CONSTRAINT `User_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'User' AND INDEX_NAME = 'User_tenantId_idx') = 0,
  'CREATE INDEX `User_tenantId_idx` ON `User`(`tenantId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Student
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Student' AND COLUMN_NAME = 'organizationId') > 0,
  'ALTER TABLE `Student` DROP FOREIGN KEY `Student_organizationId_fkey`, CHANGE `organizationId` `tenantId` VARCHAR(191) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Student' AND CONSTRAINT_NAME = 'Student_tenantId_fkey') = 0,
  'ALTER TABLE `Student` ADD CONSTRAINT `Student_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Student' AND INDEX_NAME = 'Student_tenantId_idx') = 0,
  'CREATE INDEX `Student_tenantId_idx` ON `Student`(`tenantId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Coach
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Coach' AND COLUMN_NAME = 'organizationId') > 0,
  'ALTER TABLE `Coach` DROP FOREIGN KEY `Coach_organizationId_fkey`, CHANGE `organizationId` `tenantId` VARCHAR(191) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Coach' AND CONSTRAINT_NAME = 'Coach_tenantId_fkey') = 0,
  'ALTER TABLE `Coach` ADD CONSTRAINT `Coach_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Coach' AND INDEX_NAME = 'Coach_tenantId_idx') = 0,
  'CREATE INDEX `Coach_tenantId_idx` ON `Coach`(`tenantId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Venue
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Venue' AND COLUMN_NAME = 'organizationId') > 0,
  'ALTER TABLE `Venue` DROP FOREIGN KEY `Venue_organizationId_fkey`, CHANGE `organizationId` `tenantId` VARCHAR(191) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Venue' AND CONSTRAINT_NAME = 'Venue_tenantId_fkey') = 0,
  'ALTER TABLE `Venue` ADD CONSTRAINT `Venue_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Venue' AND INDEX_NAME = 'Venue_tenantId_idx') = 0,
  'CREATE INDEX `Venue_tenantId_idx` ON `Venue`(`tenantId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Class
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Class' AND COLUMN_NAME = 'organizationId') > 0,
  'ALTER TABLE `Class` DROP FOREIGN KEY `Class_organizationId_fkey`, CHANGE `organizationId` `tenantId` VARCHAR(191) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Class' AND CONSTRAINT_NAME = 'Class_tenantId_fkey') = 0,
  'ALTER TABLE `Class` ADD CONSTRAINT `Class_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Class' AND INDEX_NAME = 'Class_tenantId_idx') = 0,
  'CREATE INDEX `Class_tenantId_idx` ON `Class`(`tenantId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- UserTenant FKs
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'UserTenant' AND CONSTRAINT_NAME = 'UserOrganization_userId_fkey') > 0,
  'ALTER TABLE `UserTenant` DROP FOREIGN KEY `UserOrganization_userId_fkey`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'UserTenant' AND CONSTRAINT_NAME = 'UserOrganization_organizationId_fkey') > 0,
  'ALTER TABLE `UserTenant` DROP FOREIGN KEY `UserOrganization_organizationId_fkey`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'UserTenant' AND COLUMN_NAME = 'organizationId') > 0,
  'ALTER TABLE `UserTenant` CHANGE `organizationId` `tenantId` VARCHAR(191) NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'UserTenant' AND CONSTRAINT_NAME = 'UserTenant_userId_fkey') = 0,
  'ALTER TABLE `UserTenant` ADD CONSTRAINT `UserTenant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'UserTenant' AND CONSTRAINT_NAME = 'UserTenant_tenantId_fkey') = 0,
  'ALTER TABLE `UserTenant` ADD CONSTRAINT `UserTenant_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- New columns
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'CourseType' AND COLUMN_NAME = 'tenantId') = 0,
  'ALTER TABLE `CourseType` ADD COLUMN `tenantId` VARCHAR(191) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Schedule' AND COLUMN_NAME = 'tenantId') = 0,
  'ALTER TABLE `Schedule` ADD COLUMN `tenantId` VARCHAR(191) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'MembershipCard' AND COLUMN_NAME = 'tenantId') = 0,
  'ALTER TABLE `MembershipCard` ADD COLUMN `tenantId` VARCHAR(191) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND COLUMN_NAME = 'tenantId') = 0,
  'ALTER TABLE `Order` ADD COLUMN `tenantId` VARCHAR(191) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `Schedule` s
INNER JOIN `Class` c ON s.`classId` = c.`id`
SET s.`tenantId` = c.`tenantId`
WHERE s.`tenantId` IS NULL;

UPDATE `MembershipCard` m
INNER JOIN `Student` st ON m.`studentId` = st.`id`
SET m.`tenantId` = st.`tenantId`
WHERE m.`tenantId` IS NULL;

UPDATE `Order` o
INNER JOIN `Student` st ON o.`studentId` = st.`id`
SET o.`tenantId` = st.`tenantId`
WHERE o.`tenantId` IS NULL AND o.`studentId` IS NOT NULL;

UPDATE `CourseType` ct
INNER JOIN (
    SELECT `courseTypeId`, MIN(`tenantId`) AS `tenantId`
    FROM `Class`
    WHERE `tenantId` IS NOT NULL
    GROUP BY `courseTypeId`
) c ON c.`courseTypeId` = ct.`id`
SET ct.`tenantId` = c.`tenantId`
WHERE ct.`tenantId` IS NULL;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'CourseType' AND CONSTRAINT_NAME = 'CourseType_tenantId_fkey') = 0,
  'ALTER TABLE `CourseType` ADD CONSTRAINT `CourseType_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Schedule' AND CONSTRAINT_NAME = 'Schedule_tenantId_fkey') = 0,
  'ALTER TABLE `Schedule` ADD CONSTRAINT `Schedule_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'MembershipCard' AND CONSTRAINT_NAME = 'MembershipCard_tenantId_fkey') = 0,
  'ALTER TABLE `MembershipCard` ADD CONSTRAINT `MembershipCard_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND CONSTRAINT_NAME = 'Order_tenantId_fkey') = 0,
  'ALTER TABLE `Order` ADD CONSTRAINT `Order_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'CourseType' AND INDEX_NAME = 'CourseType_tenantId_idx') = 0,
  'CREATE INDEX `CourseType_tenantId_idx` ON `CourseType`(`tenantId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Schedule' AND INDEX_NAME = 'Schedule_tenantId_idx') = 0,
  'CREATE INDEX `Schedule_tenantId_idx` ON `Schedule`(`tenantId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'MembershipCard' AND INDEX_NAME = 'MembershipCard_tenantId_idx') = 0,
  'CREATE INDEX `MembershipCard_tenantId_idx` ON `MembershipCard`(`tenantId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Order' AND INDEX_NAME = 'Order_tenantId_idx') = 0,
  'CREATE INDEX `Order_tenantId_idx` ON `Order`(`tenantId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'User' AND INDEX_NAME = 'User_username_key') > 0,
  'ALTER TABLE `User` DROP INDEX `User_username_key`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'User' AND INDEX_NAME = 'User_tenantId_username_key') = 0,
  'CREATE UNIQUE INDEX `User_tenantId_username_key` ON `User`(`tenantId`, `username`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Rename Organization → Tenant if still named Organization
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Organization') > 0,
  'RENAME TABLE `Organization` TO `Tenant`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'UserOrganization') > 0,
  'RENAME TABLE `UserOrganization` TO `UserTenant`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
