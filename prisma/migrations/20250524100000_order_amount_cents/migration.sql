-- Order.amount (DECIMAL yuan) -> amountCents (INT minor units) + currency

ALTER TABLE `Order` ADD COLUMN `amountCents` INT NOT NULL DEFAULT 0;
ALTER TABLE `Order` ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'CNY';

UPDATE `Order` SET `amountCents` = ROUND(`amount` * 100);

ALTER TABLE `Order` DROP COLUMN `amount`;
