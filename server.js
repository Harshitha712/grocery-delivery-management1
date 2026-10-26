const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data directory
const DATA_DIR = path.join(__dirname, 'data');
const GROCERIES_FILE = path.join(DATA_DIR, 'groceries.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');

// Helper to ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Data helpers
function readJSON(filePath, defaultData = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return defaultData;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
    return false;
  }
}

// Initialize files if empty
let groceries = readJSON(GROCERIES_FILE, []);
let orders = readJSON(ORDERS_FILE, []);
let agents = readJSON(AGENTS_FILE, []);

// ==========================================
// API ROUTES
// ==========================================

// 1. Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Grocery Delivery Management API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 2. Analytics & KPI Overview
app.get('/api/stats', (req, res) => {
  groceries = readJSON(GROCERIES_FILE, groceries);
  orders = readJSON(ORDERS_FILE, orders);
  agents = readJSON(AGENTS_FILE, agents);

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'Delivered').length;
  const activeDeliveries = orders.filter(o => o.status === 'Out for Delivery' || o.status === 'Packed').length;
  const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Confirmed').length;

  const totalRevenue = orders
    .filter(o => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const lowStockItems = groceries.filter(g => g.stock <= 5);
  const totalStockCount = groceries.reduce((sum, g) => sum + (Number(g.stock) || 0), 0);
  const activeAgents = agents.filter(a => a.status === 'On Delivery').length;

  res.json({
    totalOrders,
    completedOrders,
    activeDeliveries,
    pendingOrders,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalProducts: groceries.length,
    lowStockCount: lowStockItems.length,
    totalStockCount,
    totalAgents: agents.length,
    activeAgents
  });
});

// 3. Grocery Items (Store Catalog & Inventory)
app.get('/api/items', (req, res) => {
  groceries = readJSON(GROCERIES_FILE, groceries);
  const { category, search, lowStock } = req.query;

  let filtered = [...groceries];

  if (category && category !== 'All') {
    filtered = filtered.filter(item => item.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  }

  if (lowStock === 'true') {
    filtered = filtered.filter(item => item.stock <= 5);
  }

  res.json(filtered);
});

app.get('/api/items/:id', (req, res) => {
  groceries = readJSON(GROCERIES_FILE, groceries);
  const item = groceries.find(g => g.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(item);
});

app.post('/api/items', (req, res) => {
  const { name, category, price, unit, stock, image, description } = req.body;

  if (!name || price === undefined || !category) {
    return res.status(400).json({ error: 'Name, category, and price are required' });
  }

  groceries = readJSON(GROCERIES_FILE, groceries);

  const newItem = {
    id: `GROC-${Date.now().toString().slice(-4)}`,
    name: name.trim(),
    category: category.trim(),
    price: parseFloat(price) || 0,
    unit: unit ? unit.trim() : '1 unit',
    stock: parseInt(stock, 10) || 10,
    image: image ? image.trim() : '🛒',
    description: description ? description.trim() : 'Fresh grocery product.'
  };

  groceries.unshift(newItem);
  writeJSON(GROCERIES_FILE, groceries);

  res.status(201).json(newItem);
});

app.put('/api/items/:id', (req, res) => {
  groceries = readJSON(GROCERIES_FILE, groceries);
  const index = groceries.findIndex(g => g.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const existing = groceries[index];
  const { name, category, price, unit, stock, image, description } = req.body;

  groceries[index] = {
    ...existing,
    name: name !== undefined ? name.trim() : existing.name,
    category: category !== undefined ? category.trim() : existing.category,
    price: price !== undefined ? parseFloat(price) : existing.price,
    unit: unit !== undefined ? unit.trim() : existing.unit,
    stock: stock !== undefined ? parseInt(stock, 10) : existing.stock,
    image: image !== undefined ? image.trim() : existing.image,
    description: description !== undefined ? description.trim() : existing.description
  };

  writeJSON(GROCERIES_FILE, groceries);
  res.json(groceries[index]);
});

app.delete('/api/items/:id', (req, res) => {
  groceries = readJSON(GROCERIES_FILE, groceries);
  const index = groceries.findIndex(g => g.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const deleted = groceries.splice(index, 1)[0];
  writeJSON(GROCERIES_FILE, groceries);

  res.json({ message: 'Item deleted', item: deleted });
});

// 4. Orders Management
app.get('/api/orders', (req, res) => {
  orders = readJSON(ORDERS_FILE, orders);
  const { status, search } = req.query;

  let filtered = [...orders];

  if (status && status !== 'All') {
    filtered = filtered.filter(o => o.status.toLowerCase() === status.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(o =>
      o.id.toLowerCase().includes(q) ||
      (o.customer && o.customer.name.toLowerCase().includes(q)) ||
      (o.customer && o.customer.phone.includes(q))
    );
  }

  res.json(filtered);
});

app.get('/api/orders/:id', (req, res) => {
  orders = readJSON(ORDERS_FILE, orders);
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

app.post('/api/orders', (req, res) => {
  const { customer, items, paymentMethod, deliverySlot, notes } = req.body;

  if (!customer || !customer.name || !customer.address || !items || !items.length) {
    return res.status(400).json({ error: 'Customer details and items are required' });
  }

  groceries = readJSON(GROCERIES_FILE, groceries);
  orders = readJSON(ORDERS_FILE, orders);

  // Validate items and deduct stock
  let subtotal = 0;
  const verifiedItems = [];

  for (const requested of items) {
    const product = groceries.find(g => g.id === requested.id);
    const quantity = Math.max(1, parseInt(requested.quantity, 10) || 1);

    if (product) {
      // Deduct stock safely
      product.stock = Math.max(0, product.stock - quantity);
      subtotal += product.price * quantity;
      verifiedItems.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity
      });
    } else {
      subtotal += (parseFloat(requested.price) || 0) * quantity;
      verifiedItems.push({
        id: requested.id || 'CUSTOM',
        name: requested.name || 'Item',
        price: parseFloat(requested.price) || 0,
        quantity
      });
    }
  }

  // Update groceries with deducted stock
  writeJSON(GROCERIES_FILE, groceries);

  const deliveryFee = subtotal > 25 ? 0.0 : 1.99;
  const total = parseFloat((subtotal + deliveryFee).toFixed(2));
  const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const newOrder = {
    id: orderId,
    customer: {
      name: customer.name.trim(),
      phone: (customer.phone || '').trim(),
      address: customer.address.trim()
    },
    items: verifiedItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    deliveryFee,
    total,
    paymentMethod: paymentMethod || 'Cash on Delivery',
    deliverySlot: deliverySlot || 'Standard Delivery (Within 2 Hours)',
    status: 'Pending',
    assignedAgent: null,
    notes: (notes || '').trim(),
    createdAt: now,
    updatedAt: now,
    timeline: [
      {
        status: 'Pending',
        time: now,
        detail: 'Order received and confirmed by grocery store.'
      }
    ]
  };

  orders.unshift(newOrder);
  writeJSON(ORDERS_FILE, orders);

  res.status(201).json(newOrder);
});

// Update order status
app.patch('/api/orders/:id/status', (req, res) => {
  const { status, note } = req.body;
  const validStatuses = ['Pending', 'Confirmed', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  orders = readJSON(ORDERS_FILE, orders);
  const order = orders.find(o => o.id === req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const now = new Date().toISOString();
  order.status = status;
  order.updatedAt = now;

  let timelineDetail = note || `Order marked as ${status}`;
  if (status === 'Packed') timelineDetail = 'Items assembled, sealed, and ready at the dispatch counter.';
  if (status === 'Out for Delivery') timelineDetail = 'Picked up by courier and on the way to delivery address.';
  if (status === 'Delivered') timelineDetail = 'Package safely delivered to customer.';
  if (status === 'Cancelled') timelineDetail = 'Order was cancelled.';

  order.timeline.push({
    status,
    time: now,
    detail: timelineDetail
  });

  // If delivered or cancelled, release agent
  if ((status === 'Delivered' || status === 'Cancelled') && order.assignedAgent) {
    agents = readJSON(AGENTS_FILE, agents);
    const agent = agents.find(a => a.id === order.assignedAgent.id);
    if (agent) {
      agent.status = 'Available';
      if (status === 'Delivered') {
        agent.totalDeliveries = (agent.totalDeliveries || 0) + 1;
      }
      writeJSON(AGENTS_FILE, agents);
    }
  }

  writeJSON(ORDERS_FILE, orders);
  res.json(order);
});

// Assign delivery driver/agent
app.post('/api/orders/:id/assign', (req, res) => {
  const { agentId } = req.body;

  orders = readJSON(ORDERS_FILE, orders);
  agents = readJSON(AGENTS_FILE, agents);

  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const agent = agents.find(a => a.id === agentId);
  if (!agent) {
    return res.status(404).json({ error: 'Delivery agent not found' });
  }

  order.assignedAgent = {
    id: agent.id,
    name: agent.name,
    phone: agent.phone,
    vehicle: agent.vehicle
  };

  // If status was Pending/Confirmed/Packed, advance to Out for Delivery
  if (order.status !== 'Delivered' && order.status !== 'Cancelled') {
    order.status = 'Out for Delivery';
  }

  agent.status = 'On Delivery';
  const now = new Date().toISOString();
  order.updatedAt = now;
  order.timeline.push({
    status: 'Out for Delivery',
    time: now,
    detail: `Assigned to delivery driver ${agent.name} (${agent.vehicle})`
  });

  writeJSON(ORDERS_FILE, orders);
  writeJSON(AGENTS_FILE, agents);

  res.json({ order, agent });
});

// 5. Delivery Agents Fleet
app.get('/api/agents', (req, res) => {
  agents = readJSON(AGENTS_FILE, agents);
  res.json(agents);
});

app.post('/api/agents', (req, res) => {
  const { name, phone, vehicle } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Agent name and phone are required' });
  }

  agents = readJSON(AGENTS_FILE, agents);

  const newAgent = {
    id: `AGT-0${agents.length + 1}`,
    name: name.trim(),
    phone: phone.trim(),
    vehicle: vehicle ? vehicle.trim() : 'Electric Scooter',
    status: 'Available',
    rating: 5.0,
    totalDeliveries: 0
  };

  agents.push(newAgent);
  writeJSON(AGENTS_FILE, agents);

  res.status(201).json(newAgent);
});

// 6. Reset to seed defaults
app.post('/api/reset', (req, res) => {
  const initialGroceries = [
    { id: "GROC-101", name: "Fresh Organic Bananas", category: "Fruits", price: 1.49, unit: "1 bunch (5-6 pcs)", stock: 42, image: "🍌", description: "Sweet, naturally ripened bananas." },
    { id: "GROC-102", name: "Crisp Honeycrisp Apples", category: "Fruits", price: 3.99, unit: "1 kg bag", stock: 25, image: "🍎", description: "Juicy and crunchy premium apples." },
    { id: "GROC-103", name: "Organic Roma Tomatoes", category: "Vegetables", price: 2.29, unit: "500g pack", stock: 35, image: "🍅", description: "Vine-ripened plum tomatoes." },
    { id: "GROC-104", name: "Fresh Baby Spinach", category: "Vegetables", price: 2.99, unit: "250g box", stock: 18, image: "🥬", description: "Washed tender baby spinach leaves." },
    { id: "GROC-105", name: "Organic Whole Milk", category: "Dairy & Eggs", price: 3.49, unit: "1 Gallon", stock: 14, image: "🥛", description: "Pasteurized farm-fresh whole milk." },
    { id: "GROC-106", name: "Pasture-Raised Brown Eggs", category: "Dairy & Eggs", price: 4.89, unit: "Dozen (12 pcs)", stock: 28, image: "🥚", description: "Grade-A large brown eggs from free-range hens." },
    { id: "GROC-107", name: "Artisan Sourdough Bread", category: "Bakery", price: 4.50, unit: "1 Loaf (500g)", stock: 10, image: "🍞", description: "Crusty sourdough bread with soft airy crumb." },
    { id: "GROC-108", name: "Greek Yogurt Plain", category: "Dairy & Eggs", price: 3.79, unit: "500g tub", stock: 4, image: "🥣", description: "Authentic thick strained Greek yogurt." },
    { id: "GROC-109", name: "Cold-Pressed Orange Juice", category: "Beverages", price: 4.29, unit: "1L bottle", stock: 19, image: "🍊", description: "100% pure squeezed Valencia oranges." },
    { id: "GROC-110", name: "Extra Virgin Olive Oil", category: "Pantry", price: 11.99, unit: "750ml bottle", stock: 15, image: "🫒", description: "First cold-pressed Mediterranean olive oil." },
    { id: "GROC-111", name: "Royal Aged Basmati Rice", category: "Pantry", price: 8.99, unit: "2 kg bag", stock: 20, image: "🍚", description: "Long grain aromatic basmati rice." },
    { id: "GROC-112", name: "Organic Hass Avocados", category: "Fruits", price: 4.49, unit: "Pack of 3", stock: 6, image: "🥑", description: "Creamy ripe Hass avocados." }
  ];

  writeJSON(GROCERIES_FILE, initialGroceries);
  groceries = initialGroceries;

  res.json({ message: 'Catalog reseeded successfully', count: groceries.length });
});

// Fallback to SPA index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🛒 Grocery Delivery Management App is LIVE!`);
  console.log(`📡 Local: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/health`);
  console.log(`📦 REST Endpoints: /api/items, /api/orders, /api/agents, /api/stats`);
  console.log(`=================================================`);
});

module.exports = app;
