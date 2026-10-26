/**
 * FreshDrop - Grocery Delivery & Logistics Management
 * Client Application Logic
 */

// Application State
const state = {
  activeTab: 'tab-store',
  items: [],
  orders: [],
  agents: [],
  stats: {},
  cart: [],
  storeCategory: 'All',
  storeSearch: '',
  storeSort: 'default',
  orderStatusFilter: 'All',
  orderSearch: ''
};

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initCartDrawer();
  initModals();
  initStoreControls();
  initOrdersControls();
  initFleetControls();
  initInventoryControls();

  // Initial Data Fetch
  loadAllData();

  // Background refresh every 12 seconds
  setInterval(() => {
    refreshStatsAndOrders();
  }, 12000);
});

// ==========================================
// DATA FETCHING & API HELPERS
// ==========================================
async function api(endpoint, options = {}) {
  try {
    const res = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    showToast(error.message, 'error');
    throw error;
  }
}

async function loadAllData() {
  await Promise.all([
    fetchStats(),
    fetchItems(),
    fetchOrders(),
    fetchAgents()
  ]);
}

async function refreshStatsAndOrders() {
  await Promise.all([
    fetchStats(true),
    fetchOrders(true),
    fetchAgents(true)
  ]);
}

async function fetchStats(silent = false) {
  try {
    state.stats = await api('/api/stats');
    renderHeaderStats();
    renderInventoryKPIs();
    renderFleetKPIs();
  } catch (e) {
    if (!silent) console.error(e);
  }
}

async function fetchItems() {
  try {
    state.items = await api('/api/items');
    renderStoreGrid();
    renderInventoryTable();
  } catch (e) {
    console.error(e);
  }
}

async function fetchOrders(silent = false) {
  try {
    state.orders = await api('/api/orders');
    renderOrdersList();
    updateOrdersBadge();
  } catch (e) {
    if (!silent) console.error(e);
  }
}

async function fetchAgents(silent = false) {
  try {
    state.agents = await api('/api/agents');
    renderFleetGrid();
    renderOrdersList(); // Re-render to refresh driver assignment dropdowns
  } catch (e) {
    if (!silent) console.error(e);
  }
}

// ==========================================
// NAVIGATION & TABS
// ==========================================
function initNavigation() {
  const tabButtons = document.querySelectorAll('.nav-tab');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      switchTab(targetId);
    });
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.nav-tab').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.toggle('active', view.id === tabId);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// STOREFRONT & CATALOG
// ==========================================
function initStoreControls() {
  // Category filter pills
  const pills = document.querySelectorAll('#category-pills .pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.storeCategory = pill.getAttribute('data-category');
      renderStoreGrid();
    });
  });

  // Search input
  const searchInput = document.getElementById('store-search-input');
  searchInput.addEventListener('input', (e) => {
    state.storeSearch = e.target.value.trim().toLowerCase();
    renderStoreGrid();
  });

  // Sort dropdown
  const sortSelect = document.getElementById('store-sort');
  sortSelect.addEventListener('change', (e) => {
    state.storeSort = e.target.value;
    renderStoreGrid();
  });
}

function renderStoreGrid() {
  const grid = document.getElementById('grocery-grid');
  let filtered = [...state.items];

  // Category filter
  if (state.storeCategory !== 'All') {
    filtered = filtered.filter(item => item.category.toLowerCase() === state.storeCategory.toLowerCase());
  }

  // Search filter
  if (state.storeSearch) {
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(state.storeSearch) ||
      (item.description && item.description.toLowerCase().includes(state.storeSearch)) ||
      item.category.toLowerCase().includes(state.storeSearch)
    );
  }

  // Sorting
  if (state.storeSort === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (state.storeSort === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (state.storeSort === 'name-asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🔍</div>
        <h3>No grocery products found</h3>
        <p>Try adjusting your search terms or select another category.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const isOutOfStock = item.stock <= 0;
    const isLowStock = item.stock > 0 && item.stock <= 5;
    
    let stockBadge = `<span class="stock-tag in-stock">${item.stock} in stock</span>`;
    if (isOutOfStock) {
      stockBadge = `<span class="stock-tag out-of-stock">Out of Stock</span>`;
    } else if (isLowStock) {
      stockBadge = `<span class="stock-tag low-stock">Only ${item.stock} left!</span>`;
    }

    // Check if in cart
    const cartItem = state.cart.find(c => c.id === item.id);
    const cartQty = cartItem ? cartItem.quantity : 0;

    return `
      <div class="product-card" data-id="${item.id}">
        <div class="product-badge-wrap">
          <span class="category-tag">${item.category}</span>
          ${stockBadge}
        </div>
        <div class="product-visual">${item.image || '🛒'}</div>
        <div class="product-info">
          <h3>${escapeHtml(item.name)}</h3>
          <div class="product-packaging">${escapeHtml(item.unit || '1 unit')}</div>
          <p class="product-desc">${escapeHtml(item.description || '')}</p>
        </div>
        <div class="product-bottom">
          <div class="product-price">
            <span class="currency">$</span>${Number(item.price).toFixed(2)}
          </div>
          <button class="btn-add-cart" 
            onclick="addToCart('${item.id}')"
            ${isOutOfStock ? 'disabled' : ''}>
            ${cartQty > 0 ? `<span>✓ In Cart (${cartQty})</span>` : '<span>➕ Add to Cart</span>'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// SHOPPING BASKET & CART
// ==========================================
function initCartDrawer() {
  const toggleBtn = document.getElementById('cart-toggle-btn');
  const closeBtn = document.getElementById('cart-close-btn');
  const overlay = document.getElementById('cart-drawer-overlay');
  const startShopBtn = document.getElementById('btn-start-shopping');
  const checkoutForm = document.getElementById('checkout-form');

  toggleBtn.addEventListener('click', openCart);
  closeBtn.addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);
  startShopBtn.addEventListener('click', () => {
    closeCart();
    switchTab('tab-store');
  });

  checkoutForm.addEventListener('submit', handleCheckout);
}

function openCart() {
  renderCart();
  document.getElementById('cart-drawer').classList.add('active');
  document.getElementById('cart-drawer-overlay').classList.add('active');
}

function closeCart() {
  document.getElementById('cart-drawer').classList.remove('active');
  document.getElementById('cart-drawer-overlay').classList.remove('active');
}

function addToCart(itemId) {
  const product = state.items.find(i => i.id === itemId);
  if (!product || product.stock <= 0) return;

  const existing = state.cart.find(c => c.id === itemId);
  if (existing) {
    if (existing.quantity < product.stock) {
      existing.quantity += 1;
      showToast(`Added another ${product.name} to cart`, 'success');
    } else {
      showToast(`Maximum available stock reached for ${product.name}`, 'info');
      return;
    }
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    });
    showToast(`${product.name} added to cart!`, 'success');
  }

  updateCartBadge();
  renderStoreGrid();
}

function updateCartQty(itemId, delta) {
  const product = state.items.find(i => i.id === itemId);
  const cartItem = state.cart.find(c => c.id === itemId);
  if (!cartItem) return;

  const newQty = cartItem.quantity + delta;

  if (newQty <= 0) {
    state.cart = state.cart.filter(c => c.id !== itemId);
    showToast(`Removed from basket`, 'info');
  } else {
    if (product && newQty > product.stock) {
      showToast(`Only ${product.stock} units available in stock`, 'info');
      return;
    }
    cartItem.quantity = newQty;
  }

  updateCartBadge();
  renderCart();
  renderStoreGrid();
}

function updateCartBadge() {
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cart-count').textContent = totalCount;
}

function renderCart() {
  const emptyView = document.getElementById('cart-empty-view');
  const filledView = document.getElementById('cart-filled-view');
  const container = document.getElementById('cart-items-container');

  if (state.cart.length === 0) {
    emptyView.style.display = 'flex';
    filledView.style.display = 'none';
    return;
  }

  emptyView.style.display = 'none';
  filledView.style.display = 'flex';

  container.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <span class="cart-item-icon">${item.image || '🛒'}</span>
        <div>
          <div class="cart-item-title">${escapeHtml(item.name)}</div>
          <div class="cart-item-price">$${Number(item.price).toFixed(2)} each</div>
        </div>
      </div>
      <div class="cart-qty-controls">
        <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)">-</button>
        <span class="qty-count">${item.quantity}</span>
        <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
      </div>
      <div style="font-weight: 700; font-size: 0.9rem; min-width: 50px; text-align: right;">
        $${(item.price * item.quantity).toFixed(2)}
      </div>
    </div>
  `).join('');

  // Cost calculations
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const isFreeDelivery = subtotal >= 25;
  const deliveryFee = isFreeDelivery ? 0 : 1.99;
  const total = subtotal + deliveryFee;

  document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('cart-delivery-fee').textContent = isFreeDelivery ? 'FREE' : `$${deliveryFee.toFixed(2)}`;
  document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;

  const freeShippingNote = document.getElementById('free-shipping-note');
  if (isFreeDelivery) {
    freeShippingNote.innerHTML = '🎉 You unlocked <strong>FREE Delivery</strong>!';
    freeShippingNote.style.color = '#065f46';
    freeShippingNote.style.backgroundColor = '#ecfdf5';
  } else {
    const diff = (25 - subtotal).toFixed(2);
    freeShippingNote.innerHTML = `Add <strong>$${diff}</strong> more for <strong>FREE Delivery</strong>!`;
    freeShippingNote.style.color = '#b45309';
    freeShippingNote.style.backgroundColor = '#fef3c7';
  }
}

async function handleCheckout(e) {
  e.preventDefault();

  if (state.cart.length === 0) {
    showToast('Your basket is empty!', 'error');
    return;
  }

  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const slot = document.getElementById('cust-slot').value;
  const payment = document.getElementById('cust-payment').value;
  const notes = document.getElementById('cust-notes').value.trim();

  const submitBtn = document.getElementById('btn-place-order');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing Order...';

  try {
    const orderPayload = {
      customer: { name, phone, address },
      items: state.cart.map(c => ({
        id: c.id,
        name: c.name,
        price: c.price,
        quantity: c.quantity
      })),
      deliverySlot: slot,
      paymentMethod: payment,
      notes
    };

    const newOrder = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    });

    // Clear cart
    state.cart = [];
    updateCartBadge();
    closeCart();
    document.getElementById('checkout-form').reset();

    // Refresh store & orders
    await loadAllData();

    // Show order success modal
    showOrderSuccessModal(newOrder);

  } catch (err) {
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm & Place Order';
  }
}

function showOrderSuccessModal(order) {
  document.getElementById('success-order-id').textContent = order.id;
  document.getElementById('success-order-total').textContent = `$${Number(order.total).toFixed(2)}`;
  document.getElementById('success-order-address').textContent = order.customer.address;
  document.getElementById('success-order-slot').textContent = order.deliverySlot;

  const modal = document.getElementById('order-success-modal');
  modal.classList.add('active');

  document.getElementById('btn-view-order-status').onclick = () => {
    modal.classList.remove('active');
    switchTab('tab-orders');
  };

  document.getElementById('btn-close-success-modal').onclick = () => {
    modal.classList.remove('active');
  };
}

// ==========================================
// ORDER DISPATCH & LIVE TRACKING
// ==========================================
function initOrdersControls() {
  // Status filter pills
  const pills = document.querySelectorAll('#orders-status-filters .pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.orderStatusFilter = pill.getAttribute('data-status');
      renderOrdersList();
    });
  });

  // Search input
  const searchInput = document.getElementById('orders-search-input');
  searchInput.addEventListener('input', (e) => {
    state.orderSearch = e.target.value.trim().toLowerCase();
    renderOrdersList();
  });

  // Refresh button
  document.getElementById('btn-refresh-orders').addEventListener('click', async () => {
    await fetchOrders();
    await fetchStats();
    showToast('Orders list refreshed', 'info');
  });
}

function updateOrdersBadge() {
  const activeCount = state.orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
  document.getElementById('orders-badge').textContent = activeCount;
}

function renderOrdersList() {
  const container = document.getElementById('orders-list');
  let filtered = [...state.orders];

  if (state.orderStatusFilter !== 'All') {
    filtered = filtered.filter(o => o.status.toLowerCase() === state.orderStatusFilter.toLowerCase());
  }

  if (state.orderSearch) {
    filtered = filtered.filter(o =>
      o.id.toLowerCase().includes(state.orderSearch) ||
      o.customer.name.toLowerCase().includes(state.orderSearch) ||
      o.customer.phone.includes(state.orderSearch) ||
      o.customer.address.toLowerCase().includes(state.orderSearch)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="background: white; border: 1px solid var(--border); border-radius: var(--radius-lg); text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">📦</div>
        <h3>No matching orders</h3>
        <p>There are no orders for this filter. New customer orders will show up here live.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(order => {
    return generateOrderCardHtml(order);
  }).join('');
}

function generateOrderCardHtml(order) {
  const statusSlug = order.status.toLowerCase().replace(/\s+/g, '-');
  
  // Progress stepper calculations
  const steps = [
    { label: 'Pending', key: 'Pending' },
    { label: 'Packed', key: 'Packed' },
    { label: 'Out for Delivery', key: 'Out for Delivery' },
    { label: 'Delivered', key: 'Delivered' }
  ];

  let currentStepIdx = 0;
  if (order.status === 'Confirmed') currentStepIdx = 0;
  else if (order.status === 'Packed') currentStepIdx = 1;
  else if (order.status === 'Out for Delivery') currentStepIdx = 2;
  else if (order.status === 'Delivered') currentStepIdx = 3;
  else if (order.status === 'Cancelled') currentStepIdx = -1;

  const progressPercent = currentStepIdx >= 0 ? (currentStepIdx / (steps.length - 1)) * 100 : 0;

  // Available drivers dropdown options
  const driverOptions = state.agents.map(a => `
    <option value="${a.id}" ${order.assignedAgent && order.assignedAgent.id === a.id ? 'selected' : ''}>
      ${escapeHtml(a.name)} (${a.vehicle}) - ${a.status}
    </option>
  `).join('');

  // Items string
  const itemsList = order.items.map(i => `${i.quantity}x ${escapeHtml(i.name)}`).join(', ');

  const dateStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });

  return `
    <div class="order-card" id="card-${order.id}">
      <div class="order-card-header">
        <div class="order-id-group">
          <span class="order-id">${order.id}</span>
          <span class="order-status-badge ${statusSlug}">${order.status}</span>
        </div>
        <div class="order-time">Placed: ${dateStr}</div>
      </div>

      <!-- Stepper (hidden if cancelled) -->
      ${order.status !== 'Cancelled' ? `
        <div class="order-stepper">
          <div class="stepper-progress" style="width: ${progressPercent}%;"></div>
          ${steps.map((step, idx) => {
            const isCompleted = idx < currentStepIdx || order.status === 'Delivered';
            const isCurrent = idx === currentStepIdx && order.status !== 'Delivered';
            return `
              <div class="step-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                <div class="step-circle">${isCompleted ? '✓' : (idx + 1)}</div>
                <div class="step-label">${step.label}</div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div style="background: var(--danger-light); color: var(--danger); padding: 0.5rem 1rem; border-radius: var(--radius-md); font-weight: 600; font-size: 0.85rem; margin-bottom: 1rem;">
          ❌ This order was cancelled.
        </div>
      `}

      <!-- Details Block -->
      <div class="order-grid-details">
        <div class="detail-block">
          <h4>Customer & Delivery</h4>
          <strong>${escapeHtml(order.customer.name)}</strong>
          <p>📞 ${escapeHtml(order.customer.phone || 'N/A')}</p>
          <p>📍 ${escapeHtml(order.customer.address)}</p>
          <p style="font-size: 0.775rem; color: var(--text-muted); margin-top: 0.25rem;">Slot: ${escapeHtml(order.deliverySlot)}</p>
        </div>

        <div class="detail-block">
          <h4>Order Basket (${order.items.length} items)</h4>
          <p class="order-items-snippet">${itemsList}</p>
          <p style="margin-top: 0.4rem;"><strong>Payment:</strong> ${escapeHtml(order.paymentMethod)}</p>
          ${order.notes ? `<p style="font-style: italic; color: #b45309; font-size: 0.775rem;">Note: ${escapeHtml(order.notes)}</p>` : ''}
        </div>

        <div class="detail-block">
          <h4>Fulfillment & Dispatch</h4>
          <p><strong>Courier:</strong> ${order.assignedAgent ? `🛵 ${escapeHtml(order.assignedAgent.name)}` : '<span style="color: #b45309;">Unassigned</span>'}</p>
          <p><strong>Subtotal:</strong> $${Number(order.subtotal).toFixed(2)}</p>
          <p><strong>Delivery:</strong> $${Number(order.deliveryFee).toFixed(2)}</p>
          <p style="font-size: 1.05rem; font-weight: 800; color: var(--primary-dark); margin-top: 0.25rem;">Total: $${Number(order.total).toFixed(2)}</p>
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div class="order-card-actions">
        <div class="assign-driver-box">
          <label style="font-size: 0.8rem; font-weight: 600;">Assign Courier:</label>
          <select id="assign-select-${order.id}">
            <option value="">-- Choose Courier --</option>
            ${driverOptions}
          </select>
          <button class="btn btn-secondary btn-sm" onclick="handleAssignDriver('${order.id}')">
            Dispatch
          </button>
        </div>

        <div class="quick-status-btns">
          ${order.status === 'Pending' || order.status === 'Confirmed' ? `
            <button class="btn btn-secondary btn-sm" onclick="updateOrderStatus('${order.id}', 'Packed')">
              📦 Mark Packed
            </button>
          ` : ''}

          ${order.status === 'Packed' ? `
            <button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${order.id}', 'Out for Delivery')">
              🛵 Mark Out for Delivery
            </button>
          ` : ''}

          ${order.status === 'Out for Delivery' ? `
            <button class="btn btn-success btn-sm" onclick="updateOrderStatus('${order.id}', 'Delivered')">
              ✅ Mark Delivered
            </button>
          ` : ''}

          ${order.status !== 'Delivered' && order.status !== 'Cancelled' ? `
            <button class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="updateOrderStatus('${order.id}', 'Cancelled')">
              Cancel
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

async function updateOrderStatus(orderId, status) {
  try {
    await api(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    showToast(`Order ${orderId} marked as ${status}`, 'success');
    await fetchOrders();
    await fetchStats();
  } catch (err) {
    console.error(err);
  }
}

async function handleAssignDriver(orderId) {
  const select = document.getElementById(`assign-select-${orderId}`);
  const agentId = select ? select.value : null;

  if (!agentId) {
    showToast('Please select a driver from the dropdown', 'info');
    return;
  }

  try {
    await api(`/api/orders/${orderId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ agentId })
    });
    showToast(`Driver assigned to order ${orderId}`, 'success');
    await fetchOrders();
    await fetchAgents();
    await fetchStats();
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// DELIVERY FLEET (TAB 3)
// ==========================================
function initFleetControls() {
  const openModalBtn = document.getElementById('btn-open-driver-modal');
  const modal = document.getElementById('driver-modal');
  const closeBtn = document.getElementById('driver-modal-close');
  const cancelBtn = document.getElementById('driver-modal-cancel');
  const form = document.getElementById('add-driver-form');

  openModalBtn.addEventListener('click', () => modal.classList.add('active'));
  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  cancelBtn.addEventListener('click', () => modal.classList.remove('active'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('driver-name').value.trim();
    const phone = document.getElementById('driver-phone').value.trim();
    const vehicle = document.getElementById('driver-vehicle').value;

    try {
      await api('/api/agents', {
        method: 'POST',
        body: JSON.stringify({ name, phone, vehicle })
      });
      showToast(`Driver ${name} onboarded!`, 'success');
      form.reset();
      modal.classList.remove('active');
      await fetchAgents();
      await fetchStats();
    } catch (err) {
      console.error(err);
    }
  });
}

function renderFleetKPIs() {
  const total = state.agents.length;
  const onDelivery = state.agents.filter(a => a.status === 'On Delivery').length;
  const available = total - onDelivery;

  document.getElementById('fleet-total-drivers').textContent = total;
  document.getElementById('fleet-on-delivery').textContent = onDelivery;
  document.getElementById('fleet-available').textContent = available;
}

function renderFleetGrid() {
  const grid = document.getElementById('driver-grid');
  if (state.agents.length === 0) {
    grid.innerHTML = '<p style="color: var(--text-muted);">No drivers registered.</p>';
    return;
  }

  grid.innerHTML = state.agents.map(agent => {
    const isAvailable = agent.status === 'Available';
    const initials = agent.name.split(' ').map(n => n[0]).join('').slice(0, 2);

    return `
      <div class="driver-card">
        <div class="driver-header">
          <div class="driver-profile">
            <div class="driver-avatar">${initials}</div>
            <div>
              <div class="driver-name">${escapeHtml(agent.name)}</div>
              <div class="driver-vehicle">${escapeHtml(agent.vehicle)}</div>
            </div>
          </div>
          <span class="stock-tag ${isAvailable ? 'in-stock' : 'low-stock'}">
            ${agent.status}
          </span>
        </div>

        <div class="driver-meta">
          <div>
            <span style="color: var(--text-muted); display: block; font-size: 0.7rem;">Rating</span>
            <strong>⭐ ${agent.rating || '5.0'}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted); display: block; font-size: 0.7rem;">Completed</span>
            <strong>${agent.totalDeliveries || 0} deliveries</strong>
          </div>
          <div>
            <span style="color: var(--text-muted); display: block; font-size: 0.7rem;">Phone</span>
            <strong>${escapeHtml(agent.phone)}</strong>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// INVENTORY & ADMIN (TAB 4)
// ==========================================
function initInventoryControls() {
  const openModalBtn = document.getElementById('btn-open-product-modal');
  const modal = document.getElementById('product-modal');
  const closeBtn = document.getElementById('product-modal-close');
  const cancelBtn = document.getElementById('product-modal-cancel');
  const form = document.getElementById('add-product-form');
  const resetBtn = document.getElementById('btn-reset-demo');

  openModalBtn.addEventListener('click', () => modal.classList.add('active'));
  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  cancelBtn.addEventListener('click', () => modal.classList.remove('active'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('prod-name').value.trim();
    const category = document.getElementById('prod-category').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const unit = document.getElementById('prod-unit').value.trim();
    const stock = parseInt(document.getElementById('prod-stock').value, 10);
    const image = document.getElementById('prod-image').value.trim() || '🛒';
    const description = document.getElementById('prod-desc').value.trim();

    try {
      await api('/api/items', {
        method: 'POST',
        body: JSON.stringify({ name, category, price, unit, stock, image, description })
      });
      showToast(`${name} added to grocery catalog!`, 'success');
      form.reset();
      modal.classList.remove('active');
      await fetchItems();
      await fetchStats();
    } catch (err) {
      console.error(err);
    }
  });

  resetBtn.addEventListener('click', async () => {
    if (!confirm('Reset product catalog to default farm-fresh items?')) return;
    try {
      await api('/api/reset', { method: 'POST' });
      showToast('Catalog reseeded successfully!', 'success');
      await fetchItems();
      await fetchStats();
    } catch (err) {
      console.error(err);
    }
  });
}

function renderInventoryKPIs() {
  document.getElementById('kpi-revenue').textContent = `$${Number(state.stats.totalRevenue || 0).toFixed(2)}`;
  document.getElementById('kpi-orders').textContent = state.stats.totalOrders || 0;
  document.getElementById('kpi-skus').textContent = state.stats.totalProducts || 0;
  document.getElementById('kpi-low-stock').textContent = state.stats.lowStockCount || 0;
}

function renderHeaderStats() {
  document.getElementById('stat-active-orders').textContent = state.stats.activeDeliveries || 0;
  document.getElementById('stat-active-fleet').textContent = state.stats.activeAgents || 0;

  const lowStockPill = document.getElementById('stat-low-stock-pill');
  if (state.stats.lowStockCount > 0) {
    lowStockPill.style.display = 'inline-flex';
    document.getElementById('stat-low-stock').textContent = state.stats.lowStockCount;
  } else {
    lowStockPill.style.display = 'none';
  }
}

function renderInventoryTable() {
  const tbody = document.getElementById('inventory-table-body');
  if (state.items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No items found.</td></tr>';
    return;
  }

  tbody.innerHTML = state.items.map(item => {
    const isLow = item.stock <= 5;
    const isOut = item.stock <= 0;

    let statusPill = `<span class="stock-tag in-stock">Good</span>`;
    if (isOut) statusPill = `<span class="stock-tag out-of-stock">Depleted</span>`;
    else if (isLow) statusPill = `<span class="stock-tag low-stock">Low Stock</span>`;

    return `
      <tr>
        <td>
          <div class="item-cell">
            <span class="item-cell-icon">${item.image || '🛒'}</span>
            <div class="item-cell-info">
              <strong>${escapeHtml(item.name)}</strong>
              <span>${item.id}</span>
            </div>
          </div>
        </td>
        <td><span class="pill" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;">${item.category}</span></td>
        <td><strong>$${Number(item.price).toFixed(2)}</strong></td>
        <td>${escapeHtml(item.unit || '1 unit')}</td>
        <td><strong style="color: ${isOut ? 'var(--danger)' : (isLow ? '#b45309' : 'inherit')}">${item.stock}</strong></td>
        <td>${statusPill}</td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-secondary btn-sm" onclick="restockItem('${item.id}', 5)">+5</button>
            <button class="btn btn-secondary btn-sm" onclick="restockItem('${item.id}', 15)">+15</button>
          </div>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="deleteItem('${item.id}')">
            🗑️
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function restockItem(itemId, amount) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  const newStock = item.stock + amount;
  try {
    await api(`/api/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ stock: newStock })
    });
    showToast(`Restocked ${item.name} (+${amount})`, 'success');
    await fetchItems();
    await fetchStats();
  } catch (err) {
    console.error(err);
  }
}

async function deleteItem(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item || !confirm(`Delete "${item.name}" from catalog?`)) return;

  try {
    await api(`/api/items/${itemId}`, { method: 'DELETE' });
    showToast(`Deleted ${item.name}`, 'info');
    await fetchItems();
    await fetchStats();
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// MODALS & COMMON HELPERS
// ==========================================
function initModals() {
  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
