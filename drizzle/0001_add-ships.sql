CREATE TABLE `ships` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`gold_cargo` int NOT NULL,
	`captain` varchar(50) NOT NULL,
	`status` enum('docked','sailing','lookingForAFight'),
	`crew_size` int NOT NULL,
	`created_by` varchar(38) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
        `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `is_user_active`;
