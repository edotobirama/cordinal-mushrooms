# Cordinal Mushrooms — Product Guide

> **Cordinal Mushrooms** is an offline-first facility management app for mushroom cultivation. It works on your phone (Android) and desktop browser — no internet required after install. Your entire facility, batches, inventory, and recipes are all managed from one place.

---

## Navigation

The app has 6 main sections accessible from the sidebar:

| Section | Icon | Purpose |
|---------|------|---------|
| **Dashboard** | Grid icon | At-a-glance stats, alerts, and today's tasks |
| **Inventory** | Globe icon | Track fruiting batches and stored products |
| **Facility** | Grid/Building | Manage racks, lights, and room layout |
| **Production** | Flask | Monitor active batch lifecycles |
| **Recipes** | Document | Standard recipes for media preparation |
| **Settings** | Gear | Database backup & restore |

At the bottom of the sidebar there's a **Theme Toggle** (🌙/☀️) to switch between **Light Mode** and **Dark Mode**.

On mobile devices, the sidebar collapses into a **hamburger menu** at the top of the screen.



---

## 1. Dashboard

The Dashboard is your daily command center. It shows **what's happening now** and **what needs your attention today**.

### Stats Cards (Top Row)

#### Incubation Room
Shows how many jars/containers are currently incubating:
- **Spawn Jars** — Number of Spawn (Grain) batches in incubation, shown against total rack capacity
- **Liquid Culture** — Number of LC jars being incubated
- **Base Culture** — Number of Base Culture (Agar) plates in incubation

#### Storage (Inventory)
Shows items that are **ready to use** (already harvested/processed):
- **Liquid Culture** — Stored LC syringes/jars
- **Spawn (Grain)** — Ready spawn bags/jars
- **Base Culture** — Stored agar plates

#### Pending Actions (Jars)
Shows **jar counts** for batches that currently need attention:
- **Remove Cloth (Day 14/20)** — Number of jars where the cloth/blanket needs to be removed
- **Switch Lights (Day 16/21)** — Number of jars needing light exposure
- **Harvest Ready** — Number of jars ready for harvesting
- **Shaking Needed (LC)** — Number of Liquid Culture jars that need shaking

### Action Required Today
A **detailed list of specific tasks** for today, with color-coded icons:

| Icon Color | Action Type | When It Triggers |
|------------|------------|-----------------|
| 🔵 Blue | **Remove blanket/cloth** | Spawn/BC: Day 14 • LC: Day 20 |
| 🟡 Amber | **Switch lights ON** | Spawn/BC: Day 16 • LC: Day 20–22 |
| 🟢 Green | **Harvest / Store** | Spawn/BC: Day 60–65 • LC: Day 22+ |
| 🟣 Purple | **Shake LC jars** | LC: Days 0–5, twice daily (9 AM & 9 PM) |

Each action shows the **batch name** and **rack location**, e.g.:
- *"Remove blanket for Test-Spawn-Cloth in Rack A"*
- *"Shake Test-LC-Shake (Day 3, Shaken 0/2)"*

### Recent Activity
The **5 most recently created batches**, showing batch name, creation timestamp, and current status (Active, Harvested, Discarded).

---

## 2. Facility Management

Manage your physical grow room — racks, their positions in the room, lighting, and layers.



### Grid View
A card-based list of all your racks. Each card shows:
- **Rack Name** (e.g., "Rack A")
- **Light Type Indicator** — A colored dot showing the rack's dominant light:
  - 🔵 Blue light
  - 🩷 Pink light
  - ⬜ White light
- **Status Badge** — "Active" (green) or "Maintenance" (red)
- **Capacity Bar** — e.g., "25 / 100 Jars"
- **Light Intensity** — Displayed in Lux (e.g., "800 Lux")
- **Light Type Label** — e.g., "White Light"

#### Rack Actions Menu (⋯ button on each card)
Each rack has a dropdown menu with:
- **Edit** — Opens the Edit Rack dialog (change name, capacity, light type, material, layers, size, status)
- **Duplicate** — Creates an exact copy of the rack with all settings
- **Delete** — Removes the rack permanently (with confirmation prompt)

### Blueprint View

A **2D interactive floor plan** of your grow room.



#### Controls
- **Zoom** — Buttons to zoom in (+) and zoom out (−), with percentage display (50%–150%)
- **Access Mode** — Default view. Click any rack to open its details
- **Edit Mode** — Drag racks around the grid to rearrange the room layout
- **Save Layout** — Appears in Edit Mode. Saves the new rack positions

#### Rack Appearance in Blueprint
Each rack on the grid shows:
- Rack name (centered text)
- Usage bar (thin progress bar showing occupancy)
- Usage numbers (e.g., "25/100")
- **Material indicator** — Small colored dot at bottom-right:
  - 🟤 Brown = Cement rack
  - 🔵 Blue = Steel rack
- **Light indicator** — Small glowing dot at top-right matching the light color
- **Shake warning** — If any LC batch in the rack needs shaking:
  - Orange pulsing border
  - Bouncing ❗ icon at top-left

### Add Rack Dialog



Creates a new rack with these fields:
| Field | Description | Default |
|-------|-------------|---------|
| **Name** | Rack identifier (e.g., "Rack A") | — |
| **Capacity** | Maximum number of jars the rack can hold | — |
| **Light Type** | White, Blue, or Pink | White |
| **Material** | Steel or Cement | Steel |
| **Layers** | Number of shelf levels | 7 |
| **Width** | Rack width in grid units | 2 |
| **Length** | Rack length in grid units | 1 |

### Room Settings Dialog



Accessed via the ⚙️ gear icon next to "Add Rack". Configures:
| Field | Description | Default |
|-------|-------------|---------|
| **Room Width** | Grow room width in grid units | 20 |
| **Room Length** | Grow room length in grid units | 15 |
| **Morning Shake Time** | When morning shake reminder triggers | 09:00 |
| **Evening Shake Time** | When evening shake reminder triggers | 21:00 |

### Rack Details Dialog
Opens when you click a rack in **Blueprint Access Mode**. Shows:
- **Rack name, material, and total layers**
- **Layer-by-layer visual breakdown** — Each layer is shown as a colored strip:
  - Layer number
  - Light color label (with dropdown to change: White/Blue/Pink)
  - Batches on that layer with status badges
  - Click a layer to open **Layer Details**
- **Add/Remove Layer buttons** — Increase or decrease the number of shelf levels
- **Capacity summary** — Current usage vs. total capacity

### Layer Details Dialog
Opens when you click a specific layer in the Rack Details. Shows:
- **All batches on this layer** with:
  - Batch name and type
  - Start date and days elapsed
  - Jar count
  - Stage badge (Incubation, Stress, Fruiting)
  - Status badge (Active, Harvested, Discarded)
  - **Shake status** (for LC batches): Shows if shaking is needed, count of today's shakes, and days old

#### Layer Actions
For each batch on the layer, you can:
- **Select jars** using checkboxes
- **Apply actions** to selected batches:
  - **Shake** — Logs a shake action (for LC batches in first 5 days)
  - **Harvest** — Marks batch as harvested, creates inventory items, updates rack usage
  - **Discard** — Marks batch as contaminated/discarded
  - **Move** — Opens the Move Items dialog
- **Smart suggestion** — The system detects if selected batches need to move to a light rack and pre-suggests one

### Move Items Dialog
Lets you move jars between racks and layers:
- **Summary** — Shows how many items from how many batches are being moved
- **Target Rack** dropdown — Shows rack name and available capacity
- **Target Layer** dropdown — Shows available layers (1 through however many the rack has)
- **Smart pre-selection** — If the system detected the items need light, it pre-selects a rack with the right light type

---

## 3. Production

Track the full lifecycle of every batch from creation to harvest.



### Batch Table
Lists **all batches** (active and past) with columns:

| Column | Description |
|--------|-------------|
| **Batch ID** | Unique name (e.g., "Batch-2026-03-01") |
| **Start Date** | When the batch was created |
| **Type** | Liquid Culture, Base Culture (Agar), or Spawn (Grain) |
| **Days** | Number of days since start |
| **Location** | Which rack(s) and quantity in each |
| **Jars** | Total jar count |
| **Stage** | Current lifecycle stage badge |
| **Next Action** | What the user should do next |

### Next Action Logic
The app **automatically calculates** what action each batch needs based on its age:

#### For Spawn / Base Culture:
| Days Elapsed | Next Action Shown |
|-------------|-------------------|
| 0–13 | *Incubating (Dark)* |
| 14 | **"Remove Blanket: [date]"** |
| 15 | *Waiting for lights* |
| 16+ | **"Lights On: [date]"** |

#### For Liquid Culture:
| Days Elapsed | Next Action Shown |
|-------------|-------------------|
| 0–5 | **"Shake 2x Daily"** |
| 6–19 | *"Incubating (Remove Cloth: [date])"* |
| 20 | **"Remove Cloth / Light Exposure"** |
| 21+ | **"Store in Inventory (Harvest)"** |

### Start New Batch Dialog

A two-step form:

**Step 1 — Batch Information:**
| Field | Description |
|-------|-------------|
| **Batch ID** | Auto-generated as "Batch-YYYY-MM-DD", editable |
| **Start Date** | Defaults to today |
| **Type** | Liquid Culture, Base Culture (Agar), or Spawn (Grain) |
| **Source** | Where the culture comes from. Options update based on Type:
| | — LC batches show available Base Culture from inventory |
| | — Spawn batches show available Liquid Culture from inventory |
| | — "New / External Source" always available |

**Step 2 — Locations & Quantities:**
- Add **multiple rack locations** for a single batch (split across racks)
- For each location, specify:
  - **Rack** (dropdown with available capacity shown)
  - **Layer** (Level 1 through 7)
  - **Quantity** (number of jars)
- **Total Batch Size** — Auto-calculated sum of all locations
- **Add Location** button — Split the batch across more racks
- **Remove Location** — Remove a location (X button, only when 2+ locations)

### Batch Actions (⋯ menu on each row)
- **Delete** — Permanently removes the batch (with confirmation)

---

## 4. Inventory

Track what's in your incubation room and what's ready in storage.

### Stat Cards

#### Incubation Room
Counts of jars currently incubating, grouped by:
- Liquid Culture count
- Spawn (Grain) count
- Base Culture (Agar) count

#### Storage (Ready)
Counts of items already processed and ready to use:
- Liquid Culture
- Spawn (Grain)
- Base Culture
- Fruiting Bodies

### Fruiting Batches Tab
A table of batches currently in the **Fruiting** stage:

| Column | Description |
|--------|-------------|
| Batch Name | Which batch is fruiting |
| Type | Liquid Culture / Base Culture / Spawn |
| Quantity (Jars) | How many jars |
| Start Date | When the batch started |
| Est. Ready | Estimated harvest date |

### Stored (LC, BC, Jars, Fruit) Tab
A full inventory table of everything in storage:

| Column | Description |
|--------|-------------|
| Batch ID | Reference to original batch (if applicable) |
| Name | Item name |
| Type | Color-coded badge: Liquid-Culture, Base Culture, Dried-Sealed, Dried-Capsule, Spawn, Waste |
| Quantity | How many |
| Unit | grams, pieces, jars, etc. |
| Created Date | When it was added to inventory |
| Actions | Edit / Delete menu |

### Add Item Dialog
Manually add items to inventory:
| Field | Options |
|-------|---------|
| **Name** | Free text |
| **Type** | Liquid-Culture, Base Culture, Dried-Sealed, Dried-Capsule, Spawn, Waste |
| **Quantity** | Number |
| **Unit** | grams, pieces, jars, bags, etc. |
| **Notes** | Optional notes |

> **Smart merge**: If you add an item with the same name and type as an existing one, quantities are **automatically combined** instead of creating a duplicate.

---

## 5. Recipes



Reference cards for the **3 standard mushroom cultivation media**. Each shows ingredient amounts per unit (per liter).

### Base Culture (PDA Medium)
| Ingredient | Amount |
|-----------|--------|
| Potatoes | 200 g |
| Agar Agar | 20 g |
| Magnesium Sulphate | 0.5 g |
| Dextrose | 20 g |

### Basal Medium
| Ingredient | Amount |
|-----------|--------|
| Potatoes | 200 g |
| Magnesium Sulphate | 0.5 g |
| Dextrose | 30 g |
| Peptone | 10 g |
| Yeast Extract | 1 g |
| Vitamin B1 | 0.1 g |
| Vitamin B12 | 0.1 g |
| Egg | 1 unit |

### Liquid Culture
Same as Basal Medium **without the Egg**.

---

## 6. Settings



### Database Management
The entire app's data lives in your device's browser storage. The Settings page lets you **back up and share** that data.

#### Export Data (Download Backup)
- Click **"Download Backup"** to save a `.db` file to your device
- File is named `cordinal_backup_YYYY-MM-DD.db`
- Use this to:
  - **Back up** your data regularly
  - **Share** your current data with another person via WhatsApp

#### Import Data (Restore)
- Click **"Choose File"** and select a `.db` backup file
- A ⚠️ **warning** confirms: *"Importing data will OVERWRITE all current data. This cannot be undone."*
- After import, the app reloads with the restored data

### Data Sharing Flow (Between 2 People)
1. **Person A** goes to Settings → **Download Backup**
2. **Person A** sends the `.db` file via **WhatsApp** to Person B
3. **Person B** downloads the file on their phone
4. **Person B** goes to Settings → **Import** → selects the file
5. Both people now have the same data

---

## Complete Notification & Alert Reference

The app generates **automatic alerts** based on batch age. Here's every notification trigger:

### Dashboard Alerts

| Alert | Batch Type | Trigger Day | Description |
|-------|-----------|-------------|-------------|
| 🔵 Remove Cloth | Spawn / Base Culture | **Day 14** | Remove the blanket/cloth covering |
| 🔵 Remove Cloth | Liquid Culture | **Day 20** | Remove cloth from LC jars |
| 🟡 Switch Lights | Spawn / Base Culture | **Day 16** | Turn on grow lights |
| 🟡 Lights ON | Liquid Culture | **Days 20–22** | Ensure lights are on for LC |
| 🟢 Harvest | Spawn / Base Culture | **Days 60–65** | Ready to harvest |
| 🟢 Harvest/Store | Liquid Culture | **Day 22+** | Ready to harvest and store |
| 🟣 Shake | Liquid Culture | **Days 0–5** | Shake 2x daily (at 9 AM & 9 PM) |

### Visual Alerts

| Where | What | When |
|-------|------|------|
| Blueprint rack | 🟠 **Pulsing orange border** + bouncing ❗ | Any LC batch in that rack needs shaking |
| Production table | Bold "Next Action" text | Always visible, auto-calculated per batch |
| Pending Actions card | Jar count numbers | Aggregated across all active batches |

### Shake Tracking
The shaking system is the most detailed alert:
- **Schedule**: Twice daily — morning (default 9 AM) and evening (default 9 PM) — configurable in Room Settings
- **Duration**: First 5 days of a Liquid Culture batch
- **Tracking**: Each shake is logged as a `batch_action` with timestamp
- **Display**: Shows "Shaken X/2" for today's count
- **Alert logic**: The system checks if the most recent shake was *before* the latest threshold (9 AM or 9 PM). If yes, it flags the batch.

---

## Mobile Experience



The app is fully responsive:
- **Sidebar** collapses into a hamburger menu on mobile
- **Tables** scroll horizontally
- **Dialogs** are full-width on small screens
- **Blueprint** supports touch-based zoom and drag
- **Cards** stack vertically on narrow screens

---

## Batch Lifecycle Summary

```
┌─────────────┐
│  New Batch   │  ← User creates with Start Date, Type, Source, Location
└──────┬──────┘
       ▼
┌─────────────┐
│ Incubation  │  ← Dark period (covered with cloth/blanket)
│  (Dark)     │     LC: Shake 2x daily for first 5 days
└──────┬──────┘
       ▼
┌─────────────┐
│ Remove Cloth│  ← Day 14 (Spawn/BC) or Day 20 (LC)
└──────┬──────┘
       ▼
┌─────────────┐
│ Lights ON   │  ← Day 16 (Spawn/BC) or Day 20-22 (LC)
└──────┬──────┘
       ▼
┌─────────────┐
│  Harvest    │  ← Day 60-65 (Spawn/BC) or Day 22+ (LC)
│  Ready      │     User clicks Harvest → moves to Inventory
└──────┬──────┘
       ▼
┌─────────────┐
│  Stored in  │  ← Appears in Inventory "Stored" tab
│  Inventory  │     Can be used as Source for new batches
└─────────────┘
```
