-- Order payment lifecycle: orderNo, status, provider fields, idempotency
ALTER TABLE `Order` ADD COLUMN `orderNo` VARCHAR(191) NULL;
ALTER TABLE `Order` ADD COLUMN `status` ENUM('PENDING', 'PAID', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';
ALTER TABLE `Order` ADD COLUMN `paymentProvider` ENUM('MOCK', 'WECHAT', 'ALIPAY') NULL;
ALTER TABLE `Order` ADD COLUMN `providerTradeNo` VARCHAR(191) NULL;
ALTER TABLE `Order` ADD COLUMN `idempotencyKey` VARCHAR(191) NULL;
ALTER TABLE `Order` ADD COLUMN `refundedAt` DATETIME(3) NULL;
ALTER TABLE `Order` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

UPDATE `Order` SET `orderNo` = CONCAT('ORD', REPLACE(`id`, '-', '')) WHERE `orderNo` IS NULL;
UPDATE `Order` SET `status` = 'PAID' WHERE `paidAt` IS NOT NULL;

ALTER TABLE `Order` MODIFY `orderNo` VARCHAR(191) NOT NULL;
ALTER TABLE `Order` MODIFY `paidAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `Order_orderNo_key` ON `Order`(`orderNo`);
CREATE UNIQUE INDEX `Order_idempotencyKey_key` ON `Order`(`idempotencyKey`);
CREATE UNIQUE INDEX `Order_paymentProvider_providerTradeNo_key` ON `Order`(`paymentProvider`, `providerTradeNo`);
CREATE INDEX `Order_status_idx` ON `Order`(`status`);
