CREATE TABLE `stories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text(200) NOT NULL,
	`content` text NOT NULL,
	`author_name` text(100) NOT NULL,
	`author_email` text(100) NOT NULL,
	`author_age` integer,
	`category` text(50),
	`tags` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`verification_status` text(20) DEFAULT 'pending' NOT NULL,
	`verified_by` integer,
	`verified_at` integer,
	`rejection_reason` text,
	`is_published` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `events` ADD `verification_status` text(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `verified_by` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `events` ADD `verified_at` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `rejection_reason` text;