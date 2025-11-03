ALTER TABLE `ships` MODIFY COLUMN `status` enum('docked','sailing','lookingForAFight') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `is_admin` boolean DEFAULT false NOT NULL;