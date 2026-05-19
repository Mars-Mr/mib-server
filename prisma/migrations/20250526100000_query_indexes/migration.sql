-- Query performance indexes

CREATE INDEX `Student_phone_idx` ON `Student`(`phone`);

CREATE INDEX `Order_studentId_paidAt_idx` ON `Order`(`studentId`, `paidAt`);

CREATE INDEX `MembershipCard_studentId_status_validTo_idx` ON `MembershipCard`(`studentId`, `status`, `validTo`);

CREATE INDEX `AttendanceRecord_scheduleId_status_idx` ON `AttendanceRecord`(`scheduleId`, `status`);

CREATE INDEX `AttendanceRecord_studentId_createdAt_idx` ON `AttendanceRecord`(`studentId`, `createdAt`);

CREATE INDEX `Schedule_classId_startsAt_idx` ON `Schedule`(`classId`, `startsAt`);

CREATE INDEX `Schedule_status_startsAt_idx` ON `Schedule`(`status`, `startsAt`);

CREATE INDEX `LessonTransaction_membershipId_createdAt_idx` ON `LessonTransaction`(`membershipId`, `createdAt`);

CREATE INDEX `ScheduleQrToken_scheduleId_expiresAt_idx` ON `ScheduleQrToken`(`scheduleId`, `expiresAt`);
