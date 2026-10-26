# 🥬 FreshDrop - Grocery Delivery & Logistics Management App

A full-stack, production-ready Grocery Delivery and Logistics Management Application with an interactive customer storefront, real-time basket & checkout, multi-stage order dispatch pipeline, delivery fleet tracker, and store inventory/analytics dashboard.

---

## 🚀 Features

### 🛒 1. Customer Storefront & Basket
- **Rich Catalog**: Fruits, Vegetables, Dairy & Eggs, Bakery, Beverages, and Pantry.
- **Dynamic Filtering**: Filter by category, price sorting, and live debounced search.
- **Stock Guard**: Live badges showing in-stock, low-stock warnings ("Only 3 left!"), and out-of-stock protections.
- **Slide-Out Basket**: Add to cart, quantity controls, real-time subtotal, free shipping calculator (orders > $25 unlock free delivery).
- **Checkout & Slots**: Name, phone, delivery address, time slot options (Express 30-min, Morning, Afternoon, Evening), and payment methods (Cash on Delivery, UPI, Cards).

### 📦 2. Order Dispatch & Live Tracking Hub
- **Status Pipeline**: 4-stage visual progress tracker (`Pending` ➔ `Packed` ➔ `Out for Delivery` ➔ `Delivered`).
- **Driver Assignment**: Instantly assign available delivery personnel from the fleet to orders.
- **Order Details**: Full customer information, delivery instructions, itemized bill, and timestamp audit history.
- **Quick Status Updates**: Fast action buttons to advance or cancel orders with live status sync.

### 🛵 3. Delivery Fleet Management
- **Courier Profiles**: View on-road drivers, assigned vehicles (Scooters, Bikes, Cargo Vans), rating, and delivery counts.
- **Driver Onboarding**: Modal form to register new delivery couriers to the dispatch pool.

### 📊 4. Store Inventory & Analytics
- **KPI Metrics**: Real-time revenue, order volume, total active catalog SKUs, and low-stock alerts.
- **Stock Management**: One-click restock buttons (`+5`, `+15`), product deletion, and Add New Product modal.
- **Demo Reseed**: One-click restore of default farm-fresh catalog items.

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Node.js & Express.js REST API
- **Frontend**: Vanilla HTML5, CSS3 (Modern Glassmorphism & Plus Jakarta Sans), and ES6+ JavaScript
- **Data Persistence**: JSON-based persistent storage (`data/groceries.json`, `data/orders.json`, `data/agents.json`)
- **Hosting Ready**: Pre-configured for **Render** (`render.yaml`) and **Vercel** (`vercel.json`)

---

## 📂 Project Structure

```text
Grocery Delivery Management App/
├── data/
│   ├── agents.json        # Pre-seeded delivery drivers
│   ├── groceries.json     # Pre-seeded grocery catalog
│   └── orders.json        # Pre-seeded orders & timelines
├── public/
│   ├── css/
│   │   └── style.css      # Polished, responsive design system
│   ├── js/
│   │   └── app.js         # Client state, API caller, UI renderers
│   └── index.html         # Single-page application interface
├── .gitignore
├── index.js               # Entry-point forwarder for hosting
├── package.json           # Dependencies and scripts
├── README.md              # Project documentation & deployment guide
├── render.yaml            # Render Web Service blueprint
└── vercel.json            # Vercel serverless deployment config
```

---

## 🏃 Local Setup & Running

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Step 1: Install Dependencies
Open your terminal in the project directory:
```bash
cd "D:\Grocery Delivery Management App"
npm install
```

### Step 2: Start the Application
```bash
npm start
```

### Step 3: Open in Browser
Visit [http://localhost:3000](http://localhost:3000)

Health check endpoint: [http://localhost:3000/health](http://localhost:3000/health)

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health and uptime check |
| `GET` | `/api/stats` | Analytics summary (revenue, orders, active fleet, low stock) |
| `GET` | `/api/items` | List grocery items (supports `?category=...&search=...`) |
| `POST` | `/api/items` | Add new item to inventory |
| `PUT` | `/api/items/:id` | Update item details or stock level |
| `DELETE` | `/api/items/:id` | Remove item from catalog |
| `GET` | `/api/orders` | List customer orders (supports `?status=...&search=...`) |
| `POST` | `/api/orders` | Place new order (deducts stock and calculates fee) |
| `PATCH` | `/api/orders/:id/status` | Advance order status (`Pending`, `Packed`, etc.) |
| `POST` | `/api/orders/:id/assign` | Assign delivery courier to order |
| `GET` | `/api/agents` | List delivery fleet personnel |
| `POST` | `/api/agents` | Onboard new delivery driver |
| `POST` | `/api/reset` | Reseed demo catalog |

---

## 🐙 Step-by-Step: Push to GitHub

1. Create a new empty repository on [GitHub](https://github.com/new) named:
   ```text
   grocery-delivery-management
   ```
2. In your terminal, initialize and push:
   ```bash
   cd "D:\Grocery Delivery Management App"
   git init
   git add .
   git commit -m "Initial commit: Grocery Delivery Management App"
   git branch -M main
   git remote add origin https://github.com/keerthikanchustambam-svg/grocery-delivery-management.git
   git push -u origin main
   ```

---

## 🌐 Deployment Instructions

### Option 1: Deploy on Render (Recommended for full Express apps)
1. Sign in to [Render](https://dashboard.render.com/).
2. Click **New +** ➔ **Web Service**.
3. Connect your GitHub repository `grocery-delivery-management`.
4. Render will auto-detect Node.js. Confirm settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Deploy Web Service**. Your app will be live with an SSL URL (`https://<your-app>.onrender.com`).

### Option 2: Deploy on Vercel
1. Sign in to [Vercel](https://vercel.com/).
2. Click **Add New...** ➔ **Project**.
3. Import your GitHub repository `grocery-delivery-management`.
4. The included `vercel.json` will automatically configure routing to `server.js`.
5. Click **Deploy**.

---

## 📝 License
ISC License
