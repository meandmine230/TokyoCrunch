# Tokyo Crunch POS & Restaurant Management
## Standard Operating Procedures (SOP) & Operations Manual

**Location:** Itfaq City Commercial Area  
**Contact:** 03071777948  
**System Architecture:** Offline-First Local IndexedDB Cache with Real-Time Financial Intelligence  
**Software Developed & Supported by:** Soft Inc Developers · Haider Islam (03126980431)  
**Advertising:** Powered by Soft Inc Developers.  Haider Islam 03126980431  

---

## Table of Contents
1. [Daily Store Opening & Register Session](#1-daily-store-opening--register-session)
2. [POS Counter Operations (Taking Orders)](#2-pos-counter-operations-taking-orders)
3. [Kitchen Display System (KDS) & Preparation](#3-kitchen-display-system-kds--preparation)
4. [Recipe Management & BOM (Bill of Materials)](#4-recipe-management--bom-bill-of-materials)
5. [Menu Profit Analysis & COGS Dashboard](#5-menu-profit-analysis--cogs-dashboard)
6. [Daily Shift Closing & Z-Report Audit](#6-daily-shift-closing--z-report-audit)
7. [Inventory & Stock Inflows](#7-inventory--stock-inflows)
8. [Offline-First Data Security & Backups](#8-offline-first-data-security--backups)

---

## 1. Daily Store Opening & Register Session

Every business day must start with an active cash register session to guarantee cash drawer auditability:

1. **Staff Sign-in**:
   * Click the user profile icon on the top right navigation bar.
   * Enter your 4-digit PIN (e.g., Cashier: `1234`, Manager: `5678`, Admin: `9999`).
2. **Open Cash Drawer Session**:
   * Go to **Cashbook Register** in the sidebar.
   * Click **Open New Session**.
   * Count the initial cash float (e.g., PKR 5,000 in change).
   * Enter the opening float amount and click **Start Register Shift**.
   * The top navigation bar will display the live cash balance.

---

## 2. POS Counter Operations (Taking Orders)

The POS terminal is built for rapid counter operations with real-time food cost and margin visibility:

1. **Select Order Type**:
   * Choose **Dine In**, **Takeaway**, or **Delivery** at the top of the POS screen.
2. **Add Items to Cart**:
   * Filter items by category tabs (Burgers, Fried Chicken, Shawarmas, Fries, etc.) or use the search bar.
   * For items with portions (e.g., *Single / Double* or *2 pcs / 4 pcs*), select the required variant.
   * Optional add-ons (Extra Cheese, Sliced Jalapeños) automatically add the appropriate ingredient cost.
3. **Live Profit Badge**:
   * Review the real-time profit badge at the bottom of the cart:
     * Shows: **Total Price | Recipe COGS | Net Profit (+Margin %)** before payment.
4. **Collect Payment & Print Receipt**:
   * Select payment method: **Cash**, **Credit/Debit Card**, **Online Transfer (JazzCash/EasyPaisa)**, or **Customer Due**.
   * For cash, enter received amount to view the exact change due.
   * Click **Settle & Complete Order**.
   * The 80mm thermal receipt and kitchen order ticket (KOT) print automatically.

---

## 3. Kitchen Display System (KDS) & Preparation

1. **View Orders in Real-Time**:
   * The kitchen screen automatically updates whenever a counter order is placed.
   * Visual status:
     * **Pending (Orange)**: Newly received order awaiting prep.
     * **Preparing (Blue)**: Kitchen is cooking or assembling.
     * **Ready (Green)**: Order is plated/packed and ready for handover.
2. **Order Dispatch**:
   * When food is ready, the cook taps **Mark as Ready**.
   * When handed to the customer or delivery rider, tap **Complete Order**.

---

## 4. Recipe Management & BOM (Bill of Materials)

The system automatically deducts inventory and computes food cost based on the Bill of Materials (BOM) configured for each item:

### A. Editing BOM in "Simple Side" (From Menu Catalog)
1. Go to **Menu Catalog** in the sidebar.
2. On any product card, click the orange **BOM** button.
3. A slide-out panel will open displaying:
   * Current ingredients and portions (e.g., `150g Chicken Fillet`, `1 Bun`, `30g Garlic Mayo`, `1 Packaging Box`).
   * Live calculated Food Cost (COGS) and profit margin %.
4. **To adjust quantities**: Use the `+` or `-` buttons next to each ingredient.
5. **To add a new ingredient**: Select the ingredient from the dropdown, enter quantity, and click **Add**.
6. **To remove**: Click the red trash icon.
7. Click **Done**; changes immediately reflect across the POS and Profit Analysis.

### B. Cloning & Batch Recipes (From Recipes Module)
1. Go to **Recipes (BOM)** in the sidebar.
2. Filter menu items by category.
3. Use **Clone BOM** to copy ingredients from an existing product (e.g., clone Zinger Max to Zesty Crunch).
4. If an ingredient is missing, click **+ New Raw Material** to create it on the spot.

---

## 5. Menu Profit Analysis & COGS Dashboard

The **Profit Analysis** dashboard provides real-time visibility into the profitability of every menu item:

1. **Accessing the View**:
   * Click **Profit Analysis** directly in the sidebar, or
   * Go to **Dashboard** and toggle the top switcher to **Profit Analysis (COGS vs Revenue)**.
2. **Key Metrics Displayed**:
   * **Selling Price**: The price charged to the customer.
   * **Recipe COGS**: Total raw material food cost per portion.
   * **Unit Margin %**: Unit profit margin `((Price - COGS) / Price) * 100`.
   * **Units Sold**: Volume of items sold within the selected timeframe.
   * **Total Revenue**: Aggregate gross sales generated by the item.
   * **Total Recipe COGS**: Aggregate raw material cost incurred.
   * **Total Net Profit**: Realized profit contribution (`Revenue - COGS`).
   * **Realized Margin %**: Actual percentage profit contribution.
3. **Filtering & Analysis**:
   * **Timeframes**: Filter by Today, Yesterday, Last 7 Days, Last 30 Days, or Custom Date Range.
   * **Menu Engineering Matrix (BCG Quadrants)**:
     * 🌟 **High Margin (≥60%)**: Premium profit drivers.
     * 🟢 **Healthy (45%–60%)**: Standard core items.
     * ⚠️ **Low Margin (<30%)**: Items requiring price increases or portion adjustments.
     * 📝 **Missing Recipe BOM**: Items that need ingredient mapping.
4. **What-If Price Simulator**:
   * Click **Inspect** on any menu item row.
   * In the simulator box, enter a simulated new selling price.
   * The system immediately calculates the new margin % and expected profit increase.
5. **Reporting**:
   * Click **Export CSV** to download a spreadsheet for accounting.
   * Click **Print Report** to generate a formatted executive printout.

---

## 6. Daily Shift Closing & Z-Report Audit

At the conclusion of each business day or shift:

1. **Reconcile Register Cash**:
   * Go to **Cashbook Register** in the sidebar.
   * Click **Close Active Session**.
   * Count the physical currency in the cash drawer (notes and coins).
   * Enter the counted amount into the closing dialog.
   * The system immediately computes:
     * `Expected Cash = Opening Float + Cash Sales + Cash In - Cash Out`
     * `Discrepancy (Over / Short) = Counted Cash - Expected Cash`
2. **Review Day Closing (Z-Report)**:
   * Go to **Reports & P&L** -> **Day Closing (Z-Report)**.
   * Review:
     * Gross Sales & Net Sales.
     * Deductions & Discounts.
     * Actual Raw Material Cost of Goods Sold (COGS).
     * Operating Expenses (Salaries, Fuel, Utilities).
     * **Final Net Restaurant Profit**.
3. **Print Z-Report**:
   * Click **Print Day Closing Z-Report**.
   * Have the head cashier and manager sign the printed report for physical record-keeping.

---

## 7. Inventory & Stock Inflows

1. **Viewing Stock Levels**:
   * Navigate to **Inventory & Stock**.
   * Items with stock below the alert threshold appear with a red warning badge.
2. **Logging Supplier Deliveries**:
   * Go to **Purchases & Suppliers**.
   * Click **+ New Purchase Invoice**.
   * Select supplier (e.g., Al-Madina Poultry, Sunrise Bakery).
   * Add received ingredients (e.g., 50 kg Chicken Fillet @ 820 PKR/kg).
   * Save invoice: inventory quantities and weighted unit costs update automatically.

---

## 8. Offline-First Data Security & Backups

1. **Local Storage**:
   * All sales, inventory changes, and recipe edits are stored permanently in local browser IndexedDB (`navigator.storage.persist()`).
   * No active internet connection is required for counter POS, kitchen KDS, or recipe calculations.
2. **Database Snapshots**:
   * Every order and inventory update creates an automatic snapshot in the local audit log.
   * To create a manual backup, go to **Settings & Audit** -> **Data Backup & Restore** -> **Download JSON Backup**.

---

### Technical Support & Custom Software Engineering
* **Solution Provider:** Soft Inc Developers
* **Lead Engineer:** Haider Islam
* **Contact Phone / WhatsApp:** `03126980431`
* **Notice:** *Powered by Soft Inc Developers.  Haider Islam 03126980431*

