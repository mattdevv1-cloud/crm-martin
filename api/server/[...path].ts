import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import * as kv from '../../src/server/kv_store';

const app = new Hono();

app.use('*', logger());
app.use('/*', cors({ origin: '*', allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'], allowHeaders: ['Content-Type','Authorization'] }));

type User = { id: string; email: string; name: string; role: string };
async function verifyUser(authHeader: string | null): Promise<User> {
  // For now, accept any token and return a default admin user.
  return { id: 'admin', email: 'admin@example.com', name: 'Admin', role: 'admin' };
}

async function logAudit(entity: string, entityId: string, action: string, userId: string, snapshot: any) {
  const auditKey = `audit:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  await kv.set(auditKey, { entity, entityId, action, userId, snapshot, timestamp: new Date().toISOString() });
}

app.get('/server/make-server-7614200b/health', (c) => c.json({ status: 'ok' }));

// USERS (mocked from auth)
app.get('/server/make-server-7614200b/users', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  return c.json({ users: [{ id: user.id, name: user.name, role: user.role, email: user.email }] });
});

// GROUPS
app.get('/server/make-server-7614200b/groups', async (c) => {
  const groups = await kv.getByPrefix('group:');
  return c.json({ groups: groups.sort((a: any, b: any) => a.id - b.id) });
});

app.post('/server/make-server-7614200b/groups', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  const { name, description, active } = await c.req.json();
  const id = Date.now();
  const group = { id, name, description: description || '', active: active !== false, createdAt: new Date().toISOString(), createdBy: user.id };
  await kv.set(`group:${id}`, group);
  await logAudit('group', String(id), 'create', user.id, group);
  return c.json({ group });
});

app.put('/server/make-server-7614200b/groups/:id', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  const id = c.req.param('id');
  const existing = await kv.get(`group:${id}`);
  if (!existing) return c.json({ error: 'Group not found' }, 404);
  const { name, description, active } = await c.req.json();
  const group = { ...existing, name, description, active, updatedAt: new Date().toISOString(), updatedBy: user.id };
  await kv.set(`group:${id}`, group);
  await logAudit('group', id, 'update', user.id, group);
  return c.json({ group });
});

app.delete('/server/make-server-7614200b/groups/:id', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  const id = c.req.param('id');
  const group = await kv.get(`group:${id}`);
  if (!group) return c.json({ error: 'Group not found' }, 404);
  const products = await kv.getByPrefix('product:');
  const hasProducts = products.some((p: any) => p.groupId === parseInt(id));
  if (hasProducts) return c.json({ error: 'Невозможно удалить группу с товарами' }, 400);
  await kv.del(`group:${id}`);
  await logAudit('group', id, 'delete', user.id, group);
  return c.json({ success: true });
});

// PRODUCTS
app.get('/server/make-server-7614200b/products', async (c) => {
  const products = await kv.getByPrefix('product:');
  const stockUnits = await kv.getByPrefix('stock_unit:');
  const productsWithStock = products.map((product: any) => {
    const units = stockUnits.filter((u: any) => u.productId === product.id);
    const available = units.filter((u: any) => u.status === 'available').length;
    const reserved = units.filter((u: any) => u.status === 'reserved').length;
    return { ...product, stockCount: available, reservedCount: reserved };
  });
  return c.json({ products: productsWithStock.sort((a: any, b: any) => b.id - a.id) });
});

app.get('/server/make-server-7614200b/products/:id', async (c) => {
  const id = c.req.param('id');
  const product = await kv.get(`product:${id}`);
  if (!product) return c.json({ error: 'Product not found' }, 404);
  const stockUnits = await kv.getByPrefix('stock_unit:');
  const units = stockUnits.filter((u: any) => u.productId === parseInt(id));
  return c.json({ product, stockUnits: units });
});

app.post('/server/make-server-7614200b/products', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  const data = await c.req.json();
  const id = Date.now();
  const product = { id, ...data, createdAt: new Date().toISOString(), createdBy: user.id };
  await kv.set(`product:${id}`, product);
  await logAudit('product', String(id), 'create', user.id, product);
  return c.json({ product });
});

app.put('/server/make-server-7614200b/products/:id', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  const id = c.req.param('id');
  const existing = await kv.get(`product:${id}`);
  if (!existing) return c.json({ error: 'Product not found' }, 404);
  const data = await c.req.json();
  const product = { ...existing, ...data, id: existing.id, updatedAt: new Date().toISOString(), updatedBy: user.id };
  await kv.set(`product:${id}`, product);
  await logAudit('product', id, 'update', user.id, product);
  return c.json({ product });
});

app.delete('/server/make-server-7614200b/products/:id', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  const id = c.req.param('id');
  const product = await kv.get(`product:${id}`);
  if (!product) return c.json({ error: 'Product not found' }, 404);
  const stockUnits = await kv.getByPrefix('stock_unit:');
  const hasStock = stockUnits.some((u: any) => u.productId === parseInt(id) && u.status !== 'sold');
  if (hasStock) return c.json({ error: 'Невозможно удалить товар с активными остатками' }, 400);
  await kv.del(`product:${id}`);
  await logAudit('product', id, 'delete', user.id, product);
  return c.json({ success: true });
});

// STOCK UNITS
app.post('/server/make-server-7614200b/stock-units', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  const data = await c.req.json();
  if (data.serial) {
    const units = await kv.getByPrefix('stock_unit:');
    const exists = units.some((u: any) => u.serial === data.serial && u.productId === data.productId);
    if (exists) return c.json({ error: 'Серийный номер уже существует' }, 400);
  }
  const id = Date.now();
  const unit = { id, ...data, status: 'available', arrivedAt: new Date().toISOString(), createdBy: user.id };
  await kv.set(`stock_unit:${id}`, unit);
  const moveId = Date.now() + 1;
  const movement = { id: moveId, type: 'arrival', productId: data.productId, serial: data.serial, quantity: 1, date: new Date().toISOString(), reason: data.supplier || 'Приход товара', userId: user.id };
  await kv.set(`stock_move:${moveId}`, movement);
  await logAudit('stock_unit', String(id), 'create', user.id, unit);
  return c.json({ unit });
});

app.delete('/server/make-server-7614200b/stock-units/:id', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  const id = c.req.param('id');
  const unit = await kv.get(`stock_unit:${id}`);
  if (!unit) return c.json({ error: 'Unit not found' }, 404);
  if (unit.status === 'sold') return c.json({ error: 'Невозможно удалить проданный товар' }, 400);
  await kv.del(`stock_unit:${id}`);
  await logAudit('stock_unit', id, 'delete', user.id, unit);
  return c.json({ success: true });
});

// ORDERS
app.get('/server/make-server-7614200b/orders', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  let orders = await kv.getByPrefix('order:');
  if (user.role === 'courier') {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    orders = orders.filter((order: any) => {
      const isAssignedToCourier = order.courierId === user.id;
      const isToday = order.deliveryDate === todayStr;
      const isTomorrow = order.deliveryDate === tomorrowStr;
      const deliverableStatuses = ['confirmed', 'picking', 'ready', 'shipped', 'completed'];
      const isDeliverable = deliverableStatuses.includes(order.status);
      return isAssignedToCourier && (isToday || isTomorrow) && isDeliverable;
    });
  }
  return c.json({ orders: orders.sort((a: any, b: any) => b.id - a.id) });
});

app.get('/server/make-server-7614200b/orders/:id', async (c) => {
  const id = c.req.param('id');
  const order = await kv.get(`order:${id}`);
  if (!order) return c.json({ error: 'Order not found' }, 404);
  const items = await kv.getByPrefix(`order_item:${id}:`);
  return c.json({ order, items });
});

app.post('/server/make-server-7614200b/orders', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  const { order: orderData, items } = await c.req.json();
  const id = Date.now();
  const order = { id, number: `ORD-${id}`, ...orderData, status: orderData.status || 'new', managerId: orderData.managerId || user.id, deliveryStatus: orderData.deliveryStatus || null, courierId: orderData.courierId || null, deliveredAt: orderData.deliveredAt || null, deliveredLat: orderData.deliveredLat || null, deliveredLng: orderData.deliveredLng || null, proofPhotoUrl: orderData.proofPhotoUrl || null, proofSignatureUrl: orderData.proofSignatureUrl || null, recipientName: orderData.recipientName || null, createdAt: new Date().toISOString(), createdBy: user.id };
  await kv.set(`order:${id}`, order);
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const itemId = `${id}:${i}`;
      await kv.set(`order_item:${itemId}`, { ...items[i], orderId: id, id: itemId });
    }
  }
  await logAudit('order', String(id), 'create', user.id, order);
  return c.json({ order });
});

app.put('/server/make-server-7614200b/orders/:id', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  const id = c.req.param('id');
  const existing = await kv.get(`order:${id}`);
  if (!existing) return c.json({ error: 'Order not found' }, 404);
  const { order: orderData, items } = await c.req.json();
  const order = { ...existing, ...orderData, id: existing.id, number: existing.number, updatedAt: new Date().toISOString(), updatedBy: user.id };
  await kv.set(`order:${id}`, order);
  if (items) {
    const oldItems = await kv.getByPrefix(`order_item:${id}:`);
    for (const item of oldItems) {
      await kv.del(`order_item:${item.id}`);
    }
    for (let i = 0; i < items.length; i++) {
      const itemId = `${id}:${i}`;
      await kv.set(`order_item:${itemId}`, { ...items[i], orderId: id, id: itemId });
    }
  }
  await logAudit('order', id, 'update', user.id, order);
  return c.json({ order });
});

app.post('/server/make-server-7614200b/orders/:id/status', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  const id = c.req.param('id');
  const order = await kv.get(`order:${id}`);
  if (!order) return c.json({ error: 'Order not found' }, 404);
  const { status, courierId } = await c.req.json();
  if (status === 'picking' || status === 'shipped') {
    const items = await kv.getByPrefix(`order_item:${id}:`);
    for (const item of items) {
      if (item.serial) {
        const stockUnits = await kv.getByPrefix('stock_unit:');
        const unit = stockUnits.find((u: any) => u.serial === item.serial);
        if (unit && unit.status === 'available') {
          await kv.set(`stock_unit:${unit.id}`, { ...unit, status: 'reserved', orderId: id });
          const moveId = Date.now() + Math.random();
          await kv.set(`stock_move:${moveId}`, { id: moveId, type: 'reserve', productId: item.productId, serial: item.serial, quantity: 1, date: new Date().toISOString(), reason: `Заказ #${order.number}`, userId: user.id });
        }
      }
    }
  }
  if (status === 'completed') {
    const items = await kv.getByPrefix(`order_item:${id}:`);
    for (const item of items) {
      if (item.serial) {
        const stockUnits = await kv.getByPrefix('stock_unit:');
        const unit = stockUnits.find((u: any) => u.serial === item.serial);
        if (unit) {
          await kv.set(`stock_unit:${unit.id}`, { ...unit, status: 'sold' });
          const moveId = Date.now() + Math.random();
          await kv.set(`stock_move:${moveId}`, { id: moveId, type: 'writeoff', productId: item.productId, serial: item.serial, quantity: 1, date: new Date().toISOString(), reason: `Заказ #${order.number}`, userId: user.id });
        }
      }
    }
  }
  const updatedOrder = { ...order, status, courierId: courierId !== undefined ? courierId : order.courierId, updatedAt: new Date().toISOString(), updatedBy: user.id };
  await kv.set(`order:${id}`, updatedOrder);
  await logAudit('order', id, 'status_change', user.id, { from: order.status, to: status });
  if (courierId && courierId !== order.courierId) {
    await logAudit('order', id, 'courier_assigned', user.id, { courierId });
  }
  return c.json({ order: updatedOrder });
});

app.delete('/server/make-server-7614200b/orders/:id', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  const id = c.req.param('id');
  const order = await kv.get(`order:${id}`);
  if (!order) return c.json({ error: 'Order not found' }, 404);
  if (order.status !== 'new' && order.status !== 'cancelled') return c.json({ error: 'Можно удалить только новые или отменённые заказы' }, 400);
  const items = await kv.getByPrefix(`order_item:${id}:`);
  for (const item of items) await kv.del(`order_item:${item.id}`);
  await kv.del(`order:${id}`);
  await logAudit('order', id, 'delete', user.id, order);
  return c.json({ success: true });
});

// PLATFORMS
app.get('/server/make-server-7614200b/platforms', async (c) => {
  const platforms = await kv.getByPrefix('platform:');
  return c.json({ platforms: platforms.sort((a: any, b: any) => a.id - b.id) });
});

app.post('/server/make-server-7614200b/platforms', async (c) => {
  const user = await verifyUser(c.req.header('Authorization'));
  const { name, description } = await c.req.json();
  const id = Date.now();
  const platform = { id, name, description: description || '', createdAt: new Date().toISOString(), createdBy: user.id };
  await kv.set(`platform:${id}`, platform);
  await logAudit('platform', String(id), 'create', user.id, platform);
  return c.json({ platform });
});

// CUSTOMERS
app.get('/server/make-server-7614200b/customers', async (c) => {
  const orders = await kv.getByPrefix('order:');
  const customersMap = new Map<string, any>();
  orders.forEach((order: any) => {
    const key = order.customerPhone || order.customerEmail;
    if (key && !customersMap.has(key)) {
      customersMap.set(key, { id: key, name: order.customerName, phone: order.customerPhone, email: order.customerEmail, lastOrderDate: order.createdAt, orderCount: 1, totalSpent: order.total || 0 });
    } else if (key) {
      const customer = customersMap.get(key);
      customer.orderCount++;
      customer.totalSpent += order.total || 0;
      if (order.createdAt > customer.lastOrderDate) customer.lastOrderDate = order.createdAt;
    }
  });
  return c.json({ customers: Array.from(customersMap.values()) });
});

// STATS
app.get('/server/make-server-7614200b/stats/dashboard', async (c) => {
  const orders = await kv.getByPrefix('order:');
  const products = await kv.getByPrefix('product:');
  const stockUnits = await kv.getByPrefix('stock_unit:');
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter((o: any) => o.createdAt?.startsWith(today));
  const stats = {
    totalOrders: orders.length,
    todayOrders: todayOrders.length,
    newOrders: orders.filter((o: any) => o.status === 'new').length,
    inProgressOrders: orders.filter((o: any) => ['in_progress','confirmed','picking'].includes(o.status)).length,
    totalProducts: products.length,
    totalStock: stockUnits.filter((u: any) => u.status === 'available').length,
    lowStock: products.filter((p: any) => stockUnits.filter((u: any) => u.productId === p.id && u.status === 'available').length < (p.minStock || 0)).length,
  };
  return c.json({ stats });
});

// AUDIT
app.get('/server/make-server-7614200b/audit', async (c) => {
  const logs = await kv.getByPrefix('audit:');
  return c.json({ logs: logs.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp)) });
});

export const config = { runtime: 'edge' };
export default app.fetch;


