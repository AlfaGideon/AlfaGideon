CREATE TABLE `achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`icon` text NOT NULL,
	`category` text NOT NULL,
	`condition` text,
	`points` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `avatar_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`avatar_url` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`rejection_reason` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chats` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`tutor_id` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tutor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `content_filters` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`value` text NOT NULL,
	`category` text NOT NULL,
	`severity` text DEFAULT 'medium' NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true,
	`added_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `erudit_moves` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`player_id` text NOT NULL,
	`word` text NOT NULL,
	`letters` text NOT NULL,
	`score` integer NOT NULL,
	`move_number` integer NOT NULL,
	`board_state` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `erudit_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `erudit_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`host_id` text NOT NULL,
	`players` text NOT NULL,
	`game_state` text NOT NULL,
	`current_player` integer DEFAULT 0,
	`status` text DEFAULT 'waiting' NOT NULL,
	`total_moves` integer DEFAULT 0,
	`started_at` integer,
	`finished_at` integer,
	`winner_ids` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`game_id` text NOT NULL,
	`score` integer NOT NULL,
	`duration` integer,
	`accuracy` integer,
	`level` integer,
	`played_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`difficulty` text NOT NULL,
	`config` text,
	`is_active` integer DEFAULT true,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`video_url` text,
	`duration` integer,
	`difficulty` text NOT NULL,
	`category` text NOT NULL,
	`content` text,
	`is_published` integer DEFAULT false,
	`author_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`content` text NOT NULL,
	`type` text DEFAULT 'text',
	`metadata` text,
	`is_read` integer DEFAULT false,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`quiz_id` text NOT NULL,
	`answers` text NOT NULL,
	`score` integer NOT NULL,
	`total_questions` integer NOT NULL,
	`time_spent` integer,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`questions` text NOT NULL,
	`difficulty` text NOT NULL,
	`category` text NOT NULL,
	`author_id` text,
	`is_published` integer DEFAULT false,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`updated_by` text,
	`updated_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `system_settings_key_unique` ON `system_settings` (`key`);--> statement-breakpoint
CREATE TABLE `telegram_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`telegram_message_id` integer NOT NULL,
	`chat_id` text,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`type` text DEFAULT 'text',
	`is_from_telegram` integer DEFAULT true,
	`telegram_chat_id` text NOT NULL,
	`synced_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `theory_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`file_url` text NOT NULL,
	`file_type` text NOT NULL,
	`file_name` text NOT NULL,
	`file_size` integer,
	`category` text NOT NULL,
	`difficulty` text NOT NULL,
	`author_id` text NOT NULL,
	`is_published` integer DEFAULT false,
	`view_count` integer DEFAULT 0,
	`download_count` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tutor_students` (
	`id` text PRIMARY KEY NOT NULL,
	`tutor_id` text NOT NULL,
	`student_id` text NOT NULL,
	`assigned_at` integer,
	`is_active` integer DEFAULT true,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tutor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`achievement_id` text NOT NULL,
	`unlocked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`achievement_id`) REFERENCES `achievements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`completed` integer DEFAULT false,
	`progress` integer DEFAULT 0,
	`score` integer,
	`time_spent` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`password` text,
	`role` text DEFAULT 'student' NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`avatar` text,
	`level` integer DEFAULT 1,
	`experience` integer DEFAULT 0,
	`streak` integer DEFAULT 0,
	`last_activity` integer,
	`is_online` integer DEFAULT false,
	`telegram_id` text,
	`telegram_username` text,
	`telegram_chat_id` text,
	`telegram_auth_date` integer,
	`telegram_hash` text,
	`subjects` text,
	`is_blocked` integer DEFAULT false,
	`blocked_at` integer,
	`blocked_by` text,
	`block_reason` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_telegram_id_unique` ON `users` (`telegram_id`);