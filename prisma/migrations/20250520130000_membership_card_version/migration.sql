-- Optimistic lock for concurrent manual lesson adjustments
ALTER TABLE `MembershipCard` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;
