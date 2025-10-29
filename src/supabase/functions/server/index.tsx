import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// Create Supabase clients
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper function to verify user
async function verifyUser(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || '',
    role: user.user_metadata?.role || 'manager',
  };
}

// Helper function to log audit
async function logAudit(entity: string, entityId: string, action: string, userId: string, snapshot: any) {
  const auditKey = `audit:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  await kv.set(auditKey, {
    entity,
    entityId,
    action,
    userId,
    snapshot,
    timestamp: new Date().toISOString(),
  });
}

// Health check endpoint
app.get("/make-server-7614200b/health", (c) => {
  return c.json({ status: "ok" });
});

// ========== AUTH ==========
app.post("/make-server-7614200b/auth/signup", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      email_confirm: true, // Auto-confirm email since no email server configured
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user });
  } catch (error: any) {
    console.error('Signup error:', error);
    return c.json({ error: error.message || 'Signup failed' }, 500);
  }
});

// ========== USERS ==========
app.get("/make-server-7614200b/users", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all users from Supabase Auth
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Failed to list users:', error);
      return c.json({ error: error.message }, 500);
    }

    // Map to simple user objects
    const users = data.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name || u.email,
      role: u.user_metadata?.role || 'sales_manager',
      createdAt: u.created_at,
    }));

    return c.json({ users });
  } catch (error: any) {
    console.error('Failed to get users:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== GROUPS ==========
app.get("/make-server-7614200b/groups", async (c) => {
  try {
    const groups = await kv.getByPrefix('group:');
    return c.json({ groups: groups.sort((a, b) => a.id - b.id) });
  } catch (error: any) {
    console.error('Failed to get groups:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-7614200b/groups", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { name, description, active } = await c.req.json();
    const id = Date.now();
    const group = {
      id,
      name,
      description: description || '',
      active: active !== false,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };

    await kv.set(`group:${id}`, group);
    await logAudit('group', id.toString(), 'create', user.id, group);
    
    return c.json({ group });
  } catch (error: any) {
    console.error('Failed to create group:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put("/make-server-7614200b/groups/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const existing = await kv.get(`group:${id}`);
    if (!existing) return c.json({ error: 'Group not found' }, 404);

    const { name, description, active } = await c.req.json();
    const group = {
      ...existing,
      name,
      description,
      active,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    };

    await kv.set(`group:${id}`, group);
    await logAudit('group', id, 'update', user.id, group);
    
    return c.json({ group });
  } catch (error: any) {
    console.error('Failed to update group:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-7614200b/groups/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const group = await kv.get(`group:${id}`);
    if (!group) return c.json({ error: 'Group not found' }, 404);

    // Check if group has products
    const products = await kv.getByPrefix('product:');
    const hasProducts = products.some(p => p.groupId === parseInt(id));
    if (hasProducts) {
      return c.json({ error: 'Невозможно удалить группу с товарами' }, 400);
    }

    await kv.del(`group:${id}`);
    await logAudit('group', id, 'delete', user.id, group);
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete group:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== PRODUCTS ==========
app.get("/make-server-7614200b/products", async (c) => {
  try {
    const products = await kv.getByPrefix('product:');
    
    // Get stock units for each product
    const stockUnits = await kv.getByPrefix('stock_unit:');
    
    const productsWithStock = products.map(product => {
      const units = stockUnits.filter(u => u.productId === product.id);
      const available = units.filter(u => u.status === 'available').length;
      const reserved = units.filter(u => u.status === 'reserved').length;
      
      return {
        ...product,
        stockCount: available,
        reservedCount: reserved,
      };
    });
    
    return c.json({ products: productsWithStock.sort((a, b) => b.id - a.id) });
  } catch (error: any) {
    console.error('Failed to get products:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-7614200b/products/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const product = await kv.get(`product:${id}`);
    if (!product) return c.json({ error: 'Product not found' }, 404);
    
    // Get stock units
    const stockUnits = await kv.getByPrefix('stock_unit:');
    const units = stockUnits.filter(u => u.productId === parseInt(id));
    
    return c.json({ product, stockUnits: units });
  } catch (error: any) {
    console.error('Failed to get product:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-7614200b/products", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const data = await c.req.json();
    const id = Date.now();
    const product = {
      id,
      ...data,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };

    await kv.set(`product:${id}`, product);
    await logAudit('product', id.toString(), 'create', user.id, product);
    
    return c.json({ product });
  } catch (error: any) {
    console.error('Failed to create product:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put("/make-server-7614200b/products/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const existing = await kv.get(`product:${id}`);
    if (!existing) return c.json({ error: 'Product not found' }, 404);

    const data = await c.req.json();
    const product = {
      ...existing,
      ...data,
      id: existing.id,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    };

    await kv.set(`product:${id}`, product);
    await logAudit('product', id, 'update', user.id, product);
    
    return c.json({ product });
  } catch (error: any) {
    console.error('Failed to update product:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-7614200b/products/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const product = await kv.get(`product:${id}`);
    if (!product) return c.json({ error: 'Product not found' }, 404);

    // Check if product has stock
    const stockUnits = await kv.getByPrefix('stock_unit:');
    const hasStock = stockUnits.some(u => u.productId === parseInt(id) && u.status !== 'sold');
    if (hasStock) {
      return c.json({ error: 'Невозможно удалить товар с активными остатками' }, 400);
    }

    await kv.del(`product:${id}`);
    await logAudit('product', id, 'delete', user.id, product);
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete product:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== STOCK UNITS ==========
app.post("/make-server-7614200b/stock-units", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const data = await c.req.json();
    
    // Check serial uniqueness
    if (data.serial) {
      const units = await kv.getByPrefix('stock_unit:');
      const exists = units.some(u => u.serial === data.serial && u.productId === data.productId);
      if (exists) {
        return c.json({ error: 'Серийный номер уже существует' }, 400);
      }
    }
    
    const id = Date.now();
    const unit = {
      id,
      ...data,
      status: 'available',
      arrivedAt: new Date().toISOString(),
      createdBy: user.id,
    };

    await kv.set(`stock_unit:${id}`, unit);
    
    // Create stock movement
    const moveId = Date.now() + 1;
    const movement = {
      id: moveId,
      type: 'arrival',
      productId: data.productId,
      serial: data.serial,
      quantity: 1,
      date: new Date().toISOString(),
      reason: data.supplier || 'Приход товара',
      userId: user.id,
    };
    await kv.set(`stock_move:${moveId}`, movement);
    
    await logAudit('stock_unit', id.toString(), 'create', user.id, unit);
    
    return c.json({ unit });
  } catch (error: any) {
    console.error('Failed to create stock unit:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-7614200b/stock-units/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const unit = await kv.get(`stock_unit:${id}`);
    if (!unit) return c.json({ error: 'Unit not found' }, 404);

    if (unit.status === 'sold') {
      return c.json({ error: 'Невозможно удалить проданный товар' }, 400);
    }

    await kv.del(`stock_unit:${id}`);
    await logAudit('stock_unit', id, 'delete', user.id, unit);
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete stock unit:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== ORDERS ==========
app.get("/make-server-7614200b/orders", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    let orders = await kv.getByPrefix('order:');
    
    // Filter for courier role - only their orders for today/tomorrow
    if (user.role === 'courier') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      orders = orders.filter(order => {
        // Must be assigned to this courier
        const isAssignedToCourier = order.courierId === user.id;
        
        // Must be today or tomorrow
        const isToday = order.deliveryDate === todayStr;
        const isTomorrow = order.deliveryDate === tomorrowStr;
        
        // Must be in deliverable status (not new, not cancelled)
        // Statuses that courier can work with: confirmed, picking, ready, shipped, completed
        const deliverableStatuses = ['confirmed', 'picking', 'ready', 'shipped', 'completed'];
        const isDeliverable = deliverableStatuses.includes(order.status);
        
        return isAssignedToCourier && (isToday || isTomorrow) && isDeliverable;
      });
    }
    
    return c.json({ orders: orders.sort((a, b) => b.id - a.id) });
  } catch (error: any) {
    console.error('Failed to get orders:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-7614200b/orders/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const order = await kv.get(`order:${id}`);
    if (!order) return c.json({ error: 'Order not found' }, 404);
    
    // Get order items
    const items = await kv.getByPrefix(`order_item:${id}:`);
    
    return c.json({ order, items });
  } catch (error: any) {
    console.error('Failed to get order:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-7614200b/orders", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { order: orderData, items } = await c.req.json();
    const id = Date.now();
    const order = {
      id,
      number: `ORD-${id}`,
      ...orderData,
      status: orderData.status || 'new',
      managerId: orderData.managerId || user.id,
      deliveryStatus: orderData.deliveryStatus || null,
      courierId: orderData.courierId || null,
      deliveredAt: orderData.deliveredAt || null,
      deliveredLat: orderData.deliveredLat || null,
      deliveredLng: orderData.deliveredLng || null,
      proofPhotoUrl: orderData.proofPhotoUrl || null,
      proofSignatureUrl: orderData.proofSignatureUrl || null,
      recipientName: orderData.recipientName || null,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };

    await kv.set(`order:${id}`, order);

    // Save order items
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const itemId = `${id}:${i}`;
        await kv.set(`order_item:${itemId}`, {
          ...items[i],
          orderId: id,
          id: itemId,
        });
      }
    }
    
    await logAudit('order', id.toString(), 'create', user.id, order);
    
    return c.json({ order });
  } catch (error: any) {
    console.error('Failed to create order:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put("/make-server-7614200b/orders/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const existing = await kv.get(`order:${id}`);
    if (!existing) return c.json({ error: 'Order not found' }, 404);

    const { order: orderData, items } = await c.req.json();
    const order = {
      ...existing,
      ...orderData,
      id: existing.id,
      number: existing.number,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    };

    await kv.set(`order:${id}`, order);

    // Update order items
    if (items) {
      // Delete old items
      const oldItems = await kv.getByPrefix(`order_item:${id}:`);
      for (const item of oldItems) {
        await kv.del(`order_item:${item.id}`);
      }
      
      // Save new items
      for (let i = 0; i < items.length; i++) {
        const itemId = `${id}:${i}`;
        await kv.set(`order_item:${itemId}`, {
          ...items[i],
          orderId: id,
          id: itemId,
        });
      }
    }
    
    await logAudit('order', id, 'update', user.id, order);
    
    return c.json({ order });
  } catch (error: any) {
    console.error('Failed to update order:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== DELIVERY STATUS (COURIER) ==========
app.post("/make-server-7614200b/orders/:id/delivery-status", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const order = await kv.get(`order:${id}`);
    if (!order) return c.json({ error: 'Order not found' }, 404);

    // Check if courier is assigned to this order
    if (user.role === 'courier' && order.courierId !== user.id) {
      return c.json({ error: 'Not assigned to this order' }, 403);
    }

    const { 
      deliveryStatus, 
      proofPhotoUrl, 
      proofSignatureUrl, 
      recipientName,
      lat,
      lng 
    } = await c.req.json();

    const updatedOrder = {
      ...order,
      deliveryStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    };

    // If delivered, save proof
    if (deliveryStatus === 'delivered') {
      updatedOrder.deliveredAt = new Date().toISOString();
      updatedOrder.deliveredLat = lat;
      updatedOrder.deliveredLng = lng;
      updatedOrder.proofPhotoUrl = proofPhotoUrl;
      updatedOrder.proofSignatureUrl = proofSignatureUrl;
      updatedOrder.recipientName = recipientName;
    }

    await kv.set(`order:${id}`, updatedOrder);
    
    // Log to audit
    await logAudit('order', id, 'delivery_status_change', user.id, {
      from: order.deliveryStatus,
      to: deliveryStatus,
      courier: user.name,
    });

    return c.json({ order: updatedOrder });
  } catch (error: any) {
    console.error('Failed to update delivery status:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-7614200b/orders/:id/status", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const order = await kv.get(`order:${id}`);
    if (!order) return c.json({ error: 'Order not found' }, 404);

    const { status, courierId } = await c.req.json();
    
    // Handle status transitions
    if (status === 'picking' || status === 'shipped') {
      // Reserve stock
      const items = await kv.getByPrefix(`order_item:${id}:`);
      for (const item of items) {
        if (item.serial) {
          const stockUnits = await kv.getByPrefix('stock_unit:');
          const unit = stockUnits.find(u => u.serial === item.serial);
          if (unit && unit.status === 'available') {
            await kv.set(`stock_unit:${unit.id}`, { ...unit, status: 'reserved', orderId: id });
            
            // Create movement
            const moveId = Date.now() + Math.random();
            await kv.set(`stock_move:${moveId}`, {
              id: moveId,
              type: 'reserve',
              productId: item.productId,
              serial: item.serial,
              quantity: 1,
              date: new Date().toISOString(),
              reason: `Заказ #${order.number}`,
              userId: user.id,
            });
          }
        }
      }
    }
    
    if (status === 'completed') {
      // Write off stock
      const items = await kv.getByPrefix(`order_item:${id}:`);
      for (const item of items) {
        if (item.serial) {
          const stockUnits = await kv.getByPrefix('stock_unit:');
          const unit = stockUnits.find(u => u.serial === item.serial);
          if (unit) {
            await kv.set(`stock_unit:${unit.id}`, { ...unit, status: 'sold' });
            
            // Create movement
            const moveId = Date.now() + Math.random();
            await kv.set(`stock_move:${moveId}`, {
              id: moveId,
              type: 'writeoff',
              productId: item.productId,
              serial: item.serial,
              quantity: 1,
              date: new Date().toISOString(),
              reason: `Заказ #${order.number}`,
              userId: user.id,
            });
          }
        }
      }
    }

    const updatedOrder = {
      ...order,
      status,
      courierId: courierId !== undefined ? courierId : order.courierId,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    };

    await kv.set(`order:${id}`, updatedOrder);
    
    // Log status change
    await logAudit('order', id, 'status_change', user.id, { from: order.status, to: status });
    
    // If courier assigned, log that too
    if (courierId && courierId !== order.courierId) {
      await logAudit('order', id, 'courier_assigned', user.id, { courierId });
    }
    
    return c.json({ order: updatedOrder });
  } catch (error: any) {
    console.error('Failed to update order status:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-7614200b/orders/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const order = await kv.get(`order:${id}`);
    if (!order) return c.json({ error: 'Order not found' }, 404);

    // Check if order can be deleted
    if (order.status !== 'new' && order.status !== 'cancelled') {
      return c.json({ error: 'Можно удалить только новые или отменённые заказы' }, 400);
    }

    // Delete order items
    const items = await kv.getByPrefix(`order_item:${id}:`);
    for (const item of items) {
      await kv.del(`order_item:${item.id}`);
    }

    await kv.del(`order:${id}`);
    await logAudit('order', id, 'delete', user.id, order);
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete order:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== PLATFORMS ==========
app.get("/make-server-7614200b/platforms", async (c) => {
  try {
    const platforms = await kv.getByPrefix('platform:');
    return c.json({ platforms: platforms.sort((a, b) => a.id - b.id) });
  } catch (error: any) {
    console.error('Failed to get platforms:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-7614200b/platforms", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { name, description } = await c.req.json();
    const id = Date.now();
    const platform = {
      id,
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };

    await kv.set(`platform:${id}`, platform);
    await logAudit('platform', id.toString(), 'create', user.id, platform);
    
    return c.json({ platform });
  } catch (error: any) {
    console.error('Failed to create platform:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== USERS/COURIERS ==========
app.get("/make-server-7614200b/users", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    // For now, return mock users from Supabase Auth metadata
    // In real implementation, you would fetch from database
    const mockUsers = [
      { id: user.id, name: user.name, role: user.role, email: user.email },
    ];

    return c.json({ users: mockUsers });
  } catch (error: any) {
    console.error('Failed to get users:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== CUSTOMERS ==========
app.get("/make-server-7614200b/customers", async (c) => {
  try {
    const orders = await kv.getByPrefix('order:');
    
    // Aggregate unique customers from orders
    const customersMap = new Map();
    orders.forEach(order => {
      const key = order.customerPhone || order.customerEmail;
      if (key && !customersMap.has(key)) {
        customersMap.set(key, {
          id: key,
          name: order.customerName,
          phone: order.customerPhone,
          email: order.customerEmail,
          lastOrderDate: order.createdAt,
          orderCount: 1,
          totalSpent: order.total || 0,
        });
      } else if (key) {
        const customer = customersMap.get(key);
        customer.orderCount++;
        customer.totalSpent += order.total || 0;
        if (order.createdAt > customer.lastOrderDate) {
          customer.lastOrderDate = order.createdAt;
        }
      }
    });
    
    return c.json({ customers: Array.from(customersMap.values()) });
  } catch (error: any) {
    console.error('Failed to get customers:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== STATS ==========
app.get("/make-server-7614200b/stats/dashboard", async (c) => {
  try {
    const orders = await kv.getByPrefix('order:');
    const products = await kv.getByPrefix('product:');
    const stockUnits = await kv.getByPrefix('stock_unit:');
    
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.createdAt?.startsWith(today));
    
    const stats = {
      totalOrders: orders.length,
      todayOrders: todayOrders.length,
      newOrders: orders.filter(o => o.status === 'new').length,
      inProgressOrders: orders.filter(o => ['in_progress', 'confirmed', 'picking'].includes(o.status)).length,
      totalProducts: products.length,
      totalStock: stockUnits.filter(u => u.status === 'available').length,
      lowStock: products.filter(p => {
        const units = stockUnits.filter(u => u.productId === p.id && u.status === 'available');
        return units.length < (p.minStock || 0);
      }).length,
    };
    
    return c.json({ stats });
  } catch (error: any) {
    console.error('Failed to get stats:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== AUDIT LOG ==========
app.get("/make-server-7614200b/audit", async (c) => {
  try {
    const logs = await kv.getByPrefix('audit:');
    return c.json({ logs: logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)) });
  } catch (error: any) {
    console.error('Failed to get audit logs:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== STOCK MOVEMENTS ==========
app.get("/make-server-7614200b/stock-moves", async (c) => {
  try {
    const moves = await kv.getByPrefix('stock_move:');
    return c.json({ moves: moves.sort((a, b) => b.date.localeCompare(a.date)) });
  } catch (error: any) {
    console.error('Failed to get stock movements:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== CLEAR ALL DATA ==========
app.post("/make-server-7614200b/clear-all", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user || user.role !== 'admin') {
      return c.json({ error: 'Unauthorized - Admin only' }, 401);
    }

    // Get all keys by prefix and delete them
    const prefixes = ['group:', 'product:', 'stock_unit:', 'order:', 'order_item:', 'stock_move:', 'platform:', 'audit:'];
    let totalDeleted = 0;

    for (const prefix of prefixes) {
      const items = await kv.getByPrefix(prefix);
      for (const item of items) {
        // Construct the key based on item structure
        if (item.id) {
          if (prefix === 'order_item:') {
            await kv.del(`${prefix}${item.id}`);
          } else {
            await kv.del(`${prefix}${item.id}`);
          }
          totalDeleted++;
        }
      }
    }

    console.log(`Cleared ${totalDeleted} records from database`);

    return c.json({ 
      success: true, 
      message: `Успешно удалено ${totalDeleted} записей`,
      deleted: totalDeleted
    });
  } catch (error: any) {
    console.error('Failed to clear data:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== DEMO DATA INITIALIZATION ==========
app.post("/make-server-7614200b/init-demo", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user || user.role !== 'admin') {
      return c.json({ error: 'Unauthorized - Admin only' }, 401);
    }

    // Create demo groups
    const groups = [
      { id: 1, name: 'Смартфоны', description: 'Мобильные телефоны', active: true, createdAt: new Date().toISOString() },
      { id: 2, name: 'Ноутбуки', description: 'Портативные компьютеры', active: true, createdAt: new Date().toISOString() },
      { id: 3, name: 'Аксессуары', description: 'Чехлы, наушники, кабели', active: true, createdAt: new Date().toISOString() },
    ];

    for (const group of groups) {
      await kv.set(`group:${group.id}`, group);
    }

    // Create demo platforms
    const platforms = [
      { id: 1, name: 'Сайт', description: 'Собственный интернет-магазин', createdAt: new Date().toISOString() },
      { id: 2, name: 'Instagram', description: 'Социальная сеть', createdAt: new Date().toISOString() },
      { id: 3, name: 'Wildberries', description: 'Маркетплейс', createdAt: new Date().toISOString() },
    ];

    for (const platform of platforms) {
      await kv.set(`platform:${platform.id}`, platform);
    }

    // Create demo products
    const products = [
      {
        id: 1001,
        sku: 'IPH15-BLK-128',
        groupId: 1,
        brand: 'Apple',
        model: 'iPhone 15 Pro 128GB Black',
        description: 'Новейший флагман от Apple',
        priceBuy: 2500,
        priceSell: 3200,
        currency: 'BYN',
        unit: 'шт',
        minStock: 5,
        location: 'A1-01',
        hasSerial: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 1002,
        sku: 'SAM-S24-512',
        groupId: 1,
        brand: 'Samsung',
        model: 'Galaxy S24 Ultra 512GB',
        description: 'Топовый Android смартфон',
        priceBuy: 2800,
        priceSell: 3500,
        currency: 'BYN',
        unit: 'шт',
        minStock: 3,
        location: 'A1-02',
        hasSerial: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 1003,
        sku: 'MAC-M3-PRO',
        groupId: 2,
        brand: 'Apple',
        model: 'MacBook Pro 14" M3',
        description: 'Профессиональный ноутбук',
        priceBuy: 4500,
        priceSell: 5500,
        currency: 'BYN',
        unit: 'шт',
        minStock: 2,
        location: 'B1-01',
        hasSerial: true,
        createdAt: new Date().toISOString(),
      },
    ];

    for (const product of products) {
      await kv.set(`product:${product.id}`, product);
    }

    return c.json({ 
      success: true, 
      message: 'Демо-данные созданы',
      stats: {
        groups: groups.length,
        platforms: platforms.length,
        products: products.length,
      }
    });
  } catch (error: any) {
    console.error('Failed to initialize demo data:', error);
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);
