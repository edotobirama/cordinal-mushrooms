import { sql } from "drizzle-orm";
import { text, integer, real, sqliteTable } from "drizzle-orm/sqlite-core";

export const materials = sqliteTable("materials", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull().default(0),
    unit: text("unit").notNull(), // e.g., 'kg', 'jars', 'liters'
    lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
    createdAt: text("created_at")
        .default(sql`(CURRENT_TIMESTAMP)`)
        .notNull(),
    updatedAt: text("updated_at")
        .default(sql`(CURRENT_TIMESTAMP)`)
        .notNull(),
});

export const racks = sqliteTable("racks", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(), // e.g., 'Rack A', 'Rack B'
    capacity: integer("capacity").notNull(),
    currentUsage: integer("current_usage").notNull().default(0),
    lightType: text("light_type").notNull().default("White"), // 'Blue', 'Pink', 'White'
    lightIntensity: integer("light_intensity").notNull().default(800), // Lux
    lightStatus: integer("light_status", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull().default("Active"), // 'Active', 'Maintenance'
    x: integer("x").notNull().default(0),
    y: integer("y").notNull().default(0),
    width: real("width").notNull().default(2),
    height: real("height").notNull().default(1),
    rotation: integer("rotation").notNull().default(0),
    material: text("material").notNull().default("Steel"), // 'Steel' or 'Cement'
    totalLayers: integer("total_layers").notNull().default(7),
});

export const batches = sqliteTable("batches", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(), // e.g., 'Batch-2023-10-27-001'
    sourceId: text("source_id").notNull(), // LC ID
    startDate: text("start_date").notNull(), // ISO Date String
    rackId: integer("rack_id")
        .references(() => racks.id)
        .notNull(),
    layer: integer("layer").notNull().default(1),
    type: text("type").notNull().default("Liquid Culture"), // 'Liquid Culture', 'Base Culture', 'Basal Medium'
    jarCount: integer("jar_count").notNull(),
    stage: text("stage").notNull().default("Incubation"), // 'Incubation' (Dark), 'Stress' (Indirect), 'Fruiting', 'Drying'
    estimatedReadyDate: text("estimated_ready_date"), // ISO Date String
    status: text("status").notNull().default("Active"), // 'Active', 'Harvested', 'Contaminated'
    notes: text("notes"),
    motherCultureSource: text("mother_culture_source").notNull().default("New"),
    createdAt: text("created_at")
        .default(sql`(CURRENT_TIMESTAMP)`)
        .notNull(),
    updatedAt: text("updated_at")
        .default(sql`(CURRENT_TIMESTAMP)`)
        .notNull(),
});

export const facilitySettings = sqliteTable("facility_settings", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    roomWidth: real("room_width").notNull().default(20),
    roomHeight: real("room_height").notNull().default(15),
    shakeMorningTime: text("shake_morning_time").notNull().default("09:00"),
    shakeEveningTime: text("shake_evening_time").notNull().default("21:00"),
    removeClothDay: integer("remove_cloth_day").notNull().default(14),
    light1Day: integer("light_1_day").notNull().default(15),
    light2Day: integer("light_2_day").notNull().default(17),
    updatedAt: text("updated_at")
        .default(sql`(CURRENT_TIMESTAMP)`)
        .notNull(),
});

export const rackLayers = sqliteTable("rack_layers", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    rackId: integer("rack_id")
        .references(() => racks.id, { onDelete: 'cascade' })
        .notNull(),
    layer: integer("layer").notNull(),
    color: text("color").notNull().default("White"), // 'Blue', 'Pink', 'White'
    updatedAt: text("updated_at")
        .default(sql`(CURRENT_TIMESTAMP)`)
        .notNull(),
});

export const processingBatches = sqliteTable("processing_batches", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    batchId: integer("batch_id").references(() => batches.id), // Optional, keep reference to original if possible
    name: text("name").notNull(),
    stage: text("stage").notNull().default("Drying"), // 'Drying', 'Curing'
    quantity: integer("quantity").notNull(), // Number of jars/fruits
    startDate: text("start_date").notNull(), // When processing started
    updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const inventoryItems = sqliteTable("inventory_items", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    type: text("type").notNull(), // 'Dried-Sealed', 'Dried-Capsule', 'Liquid-Culture', 'Waste'
    quantity: integer("quantity").notNull(),
    unit: text("unit").notNull(), // 'grams', 'pieces', 'jars'
    batchId: integer("batch_id"), // Optional reference
    isPreserved: integer("is_preserved", { mode: "boolean" }).notNull().default(false),
    notes: text("notes"),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});



export const inventoryChecks = sqliteTable("inventory_checks", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(), // ISO Date String YYYY-MM-DD
    performedBy: text("performed_by").default("System"), // Could be user ID in future
    notes: text("notes"),
    createdAt: text("created_at")
        .default(sql`(CURRENT_TIMESTAMP)`)
        .notNull(),
});

export const batchActions = sqliteTable("batch_actions", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    batchId: integer("batch_id")
        .references(() => batches.id, { onDelete: 'cascade' })
        .notNull(),
    actionType: text("action_type").notNull(), // 'Shake', 'Mist', etc.
    performedBy: text("performed_by").default("System"),
    performedAt: text("performed_at")
        .default(sql`(CURRENT_TIMESTAMP)`)
        .notNull(),
});

export const batchLocations = sqliteTable("batch_locations", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    batchId: integer("batch_id")
        .references(() => batches.id, { onDelete: 'cascade' })
        .notNull(),
    rackId: integer("rack_id")
        .references(() => racks.id)
        .notNull(),
    layer: integer("layer").notNull(),
    quantity: integer("quantity").notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const containers = sqliteTable("containers", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").notNull(),
    status: text("status").notNull().default("Available"),
    condition: text("condition"),
    batchId: integer("batch_id"),
    updatedAt: text("updated_at")
        .default(sql`(CURRENT_TIMESTAMP)`)
        .notNull(),
});
