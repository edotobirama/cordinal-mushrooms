CREATE TABLE `batch_actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batch_id` integer NOT NULL,
	`action_type` text NOT NULL,
	`performed_by` text DEFAULT 'System',
	`performed_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `batch_locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batch_id` integer NOT NULL,
	`rack_id` integer NOT NULL,
	`layer` integer NOT NULL,
	`quantity` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rack_id`) REFERENCES `racks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`source_id` text NOT NULL,
	`start_date` text NOT NULL,
	`rack_id` integer NOT NULL,
	`layer` integer DEFAULT 1 NOT NULL,
	`type` text DEFAULT 'Liquid Culture' NOT NULL,
	`jar_count` integer NOT NULL,
	`stage` text DEFAULT 'Incubation' NOT NULL,
	`estimated_ready_date` text,
	`status` text DEFAULT 'Active' NOT NULL,
	`notes` text,
	`mother_culture_source` text DEFAULT 'New' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`rack_id`) REFERENCES `racks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `containers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'Available' NOT NULL,
	`condition` text,
	`batch_id` integer,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `facility_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_width` real DEFAULT 20 NOT NULL,
	`room_height` real DEFAULT 15 NOT NULL,
	`shake_morning_time` text DEFAULT '09:00' NOT NULL,
	`shake_evening_time` text DEFAULT '21:00' NOT NULL,
	`remove_cloth_day` integer DEFAULT 14 NOT NULL,
	`light_1_day` integer DEFAULT 15 NOT NULL,
	`light_2_day` integer DEFAULT 17 NOT NULL,
	`harvest_day` integer DEFAULT 60 NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`performed_by` text DEFAULT 'System',
	`notes` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit` text NOT NULL,
	`batch_id` integer,
	`is_preserved` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`unit` text NOT NULL,
	`low_stock_threshold` integer DEFAULT 10 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `processing_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batch_id` integer,
	`name` text NOT NULL,
	`stage` text DEFAULT 'Drying' NOT NULL,
	`quantity` integer NOT NULL,
	`start_date` text NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rack_layers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rack_id` integer NOT NULL,
	`layer` integer NOT NULL,
	`color` text DEFAULT 'White' NOT NULL,
	`light_1` integer DEFAULT false NOT NULL,
	`light_2` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`rack_id`) REFERENCES `racks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `racks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`capacity` integer NOT NULL,
	`current_usage` integer DEFAULT 0 NOT NULL,
	`light_type` text DEFAULT 'White' NOT NULL,
	`light_intensity` integer DEFAULT 800 NOT NULL,
	`light_status` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`x` integer DEFAULT 0 NOT NULL,
	`y` integer DEFAULT 0 NOT NULL,
	`width` real DEFAULT 2 NOT NULL,
	`height` real DEFAULT 1 NOT NULL,
	`rotation` integer DEFAULT 0 NOT NULL,
	`material` text DEFAULT 'Steel' NOT NULL,
	`total_layers` integer DEFAULT 7 NOT NULL
);
