# Ultimate Verification Guide

Follow this step-by-step guide manually in your browser to confirm everything works flawlessly across the entire Cordinal Mushrooms application:

### Step 1: The Fresh Slate & Dashboard Check
1. Open your browser to `http://localhost:3000`.
2. Notice the **Dashboard** loading. Make sure there are no red errors in the browser console.
3. Validate that the stats for the **Incubation Room** and **Storage (Inventory)** render correctly.
4. *Goal:* Confirm `use-dashboard.ts` service abstraction fetches pure data without any UI crashes.

### Step 2: Validating Actionable Notifications
1. Look closely at the **Pending Actions (Jars)** block and **Action Required Today** list on your Dashboard.
2. Because of the built-in auto-seeder, the app will instantly inject historically aged batches to simulate real crop cycles when you load the dashboard for the first time.
3. Validate that you immediately see alerts for: 
   - A 14-day old Spawn batch (Remove Cloth).
   - A 21-day old LC batch (Lights ON).
   - A 62-day old Base Culture batch (Harvest Ready).
   - A 3-day old LC batch (Shaking Needed - if past 9 AM or 9 PM).
4. *Goal:* Confirm the `getActionsService` and rolling notification thresholds calculate actual database timestamps successfully and persistently.

### Step 3: Recipe & Inventory Initiation
1. Navigate to the **Inventory** tab using the left sidebar.
2. Click **Add Material** to simulate a fresh supplier delivery. Add e.g., `1000g` of `Potatoes`.
3. Check that it appears in the "Stored" tab successfully.
4. *Goal:* Confirm `use-inventory.ts` correctly saves and synchronizes database records.

### Step 4: Blueprint & Facility Management
1. Navigate to the **Facility Layout** (Blueprint/Racks) section.
2. Click **Add Rack**. Create a new rack named `Storage-A` with 7 total layers.
3. Once placed, click the **Settings** gear icon on the newly created rack.
4. Try toggling a layer color (e.g., set layer 1 to "Blue").
5. Close the dialog and ensure the visual representation of that layer turns Blue.
6. *Goal:* Confirm the complex rack manipulation and lighting settings in `use-facility.ts` update state natively without component ghosting.

### Step 5: Full Production Lifecycle (The Big Test)
1. Navigate to the **Production** tab.
2. Click **New Batch**. Select a "Liquid Culture" batch, set jar count to `10`, and assign it to "Layer 1" of your newly created `Storage-A` rack.
3. Go back to the **Facility Layout** view and inspect `Storage-A`'s first layer. Verify it shows `10/10` jars.
4. From the Facility view (or Production), select those 10 jars and click the **Shake** action. 
5. Select the jars again, and move them to **Fruiting** (Light/Blanket actions depending on your UI).
6. Verify the batch state updates from `Incubation` -> `Fruiting`.
7. Once in fruiting, select the batch and click **Harvest**.
8. Set the yield (e.g., `500 grams` of `Dried-Sealed`).

### Step 6: Validating the Loop
1. Navigate back to the **Inventory** tab.
2. View the **Stored** items list.
3. You should see a new entry for `Dried-Sealed` matching the exact harvest amount (`500 grams`) you just completed.
4. The fruiting batch should no longer be listed under active "Fruiting Batches".
5. Return to the **Facility Layout** tab and confirm `Storage-A` Layer 1 is now **completely empty** (0/10 usage), cleanly clearing the ghost jars.

**Conclusion:**
If all five of these steps pass smoothly without requiring hard-refreshes (`F5`), then the frontend state propagation, database writing, and context refreshing are mathematically "perfect". Let me know how the verification performs on your end!
