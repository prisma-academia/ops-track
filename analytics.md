# Implementation Specification: Fuel Operations Dashboard Pages

You are an expert Frontend Engineer. The global layout, sidebar, theme configurations, and state for global filters (Time, Location, Product) are **already fully implemented**. 

Your task is to build out the modular page components (or tab views) that ingest these filters and render the analytics cards, charts, and data tables using **Shadcn UI** primitives and **Recharts**.

## 🎨 Design Rules & Component Mapping
* **Theme & Colors:** Follow the existing project theme. Do not add background gradients or flashy card backgrounds. Keep it flat, clean, and highly professional.
* **Component Usage:** * Metrics: `@/components/ui/card`
    * Tables: `@/components/ui/table`
    * Statuses/Indicators: `@/components/ui/badge` or `@/components/ui/progress`
    * Icons: `lucide-react` (monochrome/flat, no fills)
    * Charts: `recharts` (Ensure all charts use `ResponsiveContainer` and match the theme text/border variables)

---

## 🚀 Pages / Tab Views to Implement

### 1. Commercial Performance View
* **KPI Stats Row:** Render 4 metric cards:
    * *Total Volume Sold* (Litres, with percentage trend indicator)
    * *Revenue* (Currency formatted)
    * *Net Profit* & *Margin per Litre*
* **Visuals Grid:**
    * A split-screen section (`grid grid-cols-1 lg:grid-cols-3 gap-6`):
        * **Cols 1 & 2:** A synchronized Line or Area chart showing *Revenue Trend* vs *Profit Trend* over time.
        * **Col 3:** A Donut chart showing *Product Mix Contribution* (PMS, AGO, LPG).
    * **Bottom Row:** A clean horizontal bar chart or ranking table showing the *Station Revenue Ranking*.

### 2. Inventory & Supply Chain View
* **KPI Stats Row:** *System-wide Average Tank Level*, *Lowest Days Until Stockout*, *Inventory Turnover Rate*.
* **Visuals Grid:**
    * **Station Tank Gauges:** A grid of cards mapping current active tanks. Use linear `Shadcn Progress` bars changing color dynamically based on thresholds (e.g., Safe `>50%`, Low `20%-50%` [Amber], Critical `<20%` [Destructive Red]).
    * **Stock Health Heatmap:** A visual table matrix mapping Stations (rows) vs Products (columns) using subtle colored badge backgrounds to indicate urgency.
    * **Supplier Performance Scorecard:** A data table tracking *Delivery Accuracy %* and *Fuel Received vs Fuel Ordered* variances.

### 3. Operations & Assets View
* **KPI Stats Row:** *Overall Station Uptime %*, *Average Queue Time (mins)*, *Generator Runtime (hrs)*.
* **Visuals Grid:**
    * **Pump Efficiency:** A grid displaying *Pump Utilization %* and *Throughput per Pump* using linear progress bars or minimal bar charts.
    * **Equipment Availability Trend:** A line or step chart mapping uptime metrics over the filtered time horizon.
    * **Quick Actions:** Include an interactive action column/panel next to asset tables with actionable buttons like `[Log Maintenance Ticket]`.

### 4. Reconciliation & Loss View (High Priority)
* **KPI Stats Row:** *Overall Variance %*, *Daily Fuel Loss Value*, *Total Shrinkage/Delivery Loss Volume*.
* **Visuals Grid:**
    * **Variance Heatmap:** A structured grid to instantly flag stations experiencing recurring volumetric discrepancies.
    * **Loss Trend Chart:** A column/bar chart showing daily or weekly volumetric/monetary loss value trends.
    * **Security & Risk Timeline:** A vertical feed or timeline layout logging instances of *Water Contamination Incidents* or sudden spikes in *Theft Risk Scores*.
* **Interactive Drill-Down:** Ensure table rows are styled cleanly as interactive elements to prepare for shift-level auditing.

### 5. Workforce Analytics View
* **KPI Stats Row:** *Average Sales per Attendant*, *Average Variance by Attendant*, *Global Productivity Score*.
* **Visuals Grid:**
    * **Attendant Leaderboard Table:** A sorted data table displaying sales, profit, and variance per attendant. Highlight high-variance outliers using a soft background badge.
    * **Shift Comparison Chart:** A grouped bar chart directly benchmarking Morning vs. Evening shifts across revenue and total volume discharged.

---

## 🛠️ Step-by-Step Execution Plan for IDE
1. **Mock Data Layer:** Create a comprehensive local TypeScript mock data provider or hook that accepts the active global filters (dates, location ID, product type) and returns realistic structured data arrays.
2. **Scaffold Views:** Create the five individual view files under your dashboard components directory.
3. **Wire Components:** Implement the UI layouts sequentially from Tab 1 through Tab 5, importing Recharts and Shadcn elements as specified.
4. **Responsive Integrity:** Ensure all tables scroll horizontally on mobile screens and grid layouts collapse gracefully to a single column (`grid-cols-1`).