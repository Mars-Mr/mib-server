-- Order.amount: Float -> DECIMAL(12,2)
ALTER TABLE `Order` MODIFY `amount` DECIMAL(12, 2) NOT NULL;

-- Query indexes
CREATE INDEX `MembershipCard_studentId_idx` ON `MembershipCard`(`studentId`);
CREATE INDEX `Order_studentId_idx` ON `Order`(`studentId`);
CREATE INDEX `Order_paidAt_idx` ON `Order`(`paidAt`);
