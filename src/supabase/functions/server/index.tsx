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
  await createClient(supabaseUrl, supabaseServiceKey)
    .from('audit')
    .insert([{ entity, entity_id: entityId, action, user_id: userId, snapshot }]);
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
    const { data: groups, error } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('groups').select('*').order('id', { ascending: true });
    if (error) throw error;
    return c.json({ groups });
  } catch (error) {
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
      created_by: user.id,
    };
    await createClient(supabaseUrl, supabaseServiceKey)
      .from('groups').insert([group]);
    await logAudit('group', id.toString(), 'create', user.id, group);
    return c.json({ group });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/make-server-7614200b/groups/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    const { data: [existing], error } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('groups').select('*').eq('id', id);
    if (error || !existing) return c.json({ error: 'Group not found' }, 404);
    const { name, description, active } = await c.req.json();
    const group = {
      ...existing,
      name,
      description,
      active,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };
    await createClient(supabaseUrl, supabaseServiceKey)
      .from('groups').update(group).eq('id', id);
    await logAudit('group', id, 'update', user.id, group);
    return c.json({ group });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-7614200b/groups/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    const { data: [group], error } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('groups').select('*').eq('id', id);
    if (error || !group) return c.json({ error: 'Group not found' }, 404);
    // Проверить есть ли продукты в группе
    const { data: products } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('products').select('id').eq('group_id', id);
    if (products && products.length > 0) return c.json({ error: 'Невозможно удалить группу с товарами' }, 400);
    await createClient(supabaseUrl, supabaseServiceKey).from('groups').delete().eq('id', id);
    await logAudit('group', id, 'delete', user.id, group);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ========== PRODUCTS ==========
app.get("/make-server-7614200b/products", async (c) => {
  try {
    const client = createClient(supabaseUrl, supabaseServiceKey);
    const { data: products, error } = await client.from('products').select('*').order('id', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    // Получаем по каждому продукту агрегированные остатки
    const { data: stock, error: se } = await client.from('stock_units').select('*');
    if (se) return c.json({ error: se.message }, 500);
    const productsWithStock = products.map(product => {
      const units = stock.filter(u => u.product_id === product.id);
      const available = units.filter(u => u.status === 'available').length;
      const reserved = units.filter(u => u.status === 'reserved').length;
      return { ...product, stockCount: available, reservedCount: reserved };
    });
    return c.json({ products: productsWithStock });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-7614200b/products/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const client = createClient(supabaseUrl, supabaseServiceKey);
    const { data: product, error } = await client.from('products').select('*').eq('id', id).single();
    if (error || !product) return c.json({ error: 'Product not found' }, 404);
    const { data: stockUnits, error: se } = await client.from('stock_units').select('*').eq('product_id', id);
    return c.json({ product, stockUnits });
  } catch (error) {
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
      created_by: user.id,
      created_at: new Date().toISOString(),
    };
    const client = createClient(supabaseUrl, supabaseServiceKey);
    await client.from('products').insert([product]);
    await logAudit('product', id.toString(), 'create', user.id, product);
    return c.json({ product });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/make-server-7614200b/products/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    const client = createClient(supabaseUrl, supabaseServiceKey);
    const { data: [existing], error } = await client.from('products').select('*').eq('id', id);
    if (error || !existing) return c.json({ error: 'Product not found' }, 404);
    const data = await c.req.json();
    const upd = { ...existing, ...data, updated_at: new Date().toISOString(), updated_by: user.id };
    await client.from('products').update(upd).eq('id', id);
    await logAudit('product', id, 'update', user.id, upd);
    return c.json({ product: upd });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-7614200b/products/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    const client = createClient(supabaseUrl, supabaseServiceKey);
    const { data: [product], error: pe } = await client.from('products').select('*').eq('id', id);
    if (pe || !product) return c.json({ error: 'Product not found' }, 404);
    const { data: stockUnits } = await client.from('stock_units').select('*').eq('product_id', id);
    const hasStock = (stockUnits || []).some(u => u.status !== 'sold');
    if (hasStock) return c.json({ error: 'Невозможно удалить товар с активными остатками' }, 400);
    await client.from('products').delete().eq('id', id);
    await logAudit('product', id, 'delete', user.id, product);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ========== STOCK UNITS ==========
app.post("/make-server-7614200b/stock-units", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const data = await c.req.json();
    const client = createClient(supabaseUrl, supabaseServiceKey);
    // Проверка на уникальность serial
    if (data.serial) {
      const { data: units } = await client.from('stock_units').select('*').eq('serial', data.serial).eq('product_id', data.product_id);
      if ((units || []).length > 0) return c.json({ error: 'Серийный номер уже существует' }, 400);
    }
    const id = Date.now();
    const unit = {
      id,
      ...data,
      status: 'available',
      arrived_at: new Date().toISOString(),
      created_by: user.id,
    };
    await client.from('stock_units').insert([unit]);
    // Записываем движение склада
    const moveId = id + 1;
    const movement = {
      id: moveId,
      type: 'arrival',
      product_id: data.product_id,
      serial: data.serial,
      quantity: 1,
      date: new Date().toISOString(),
      reason: data.supplier || 'Приход товара',
      user_id: user.id,
    };
    await client.from('stock_moves').insert([movement]);
    await logAudit('stock_unit', id.toString(), 'create', user.id, unit);
    return c.json({ unit });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-7614200b/stock-units/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    const client = createClient(supabaseUrl, supabaseServiceKey);
    const { data: [unit], error } = await client.from('stock_units').select('*').eq('id', id);
    if (error || !unit) return c.json({ error: 'Unit not found' }, 404);
    if (unit.status === 'sold') return c.json({ error: 'Невозможно удалить проданный товар' }, 400);
    await client.from('stock_units').delete().eq('id', id);
    await logAudit('stock_unit', id, 'delete', user.id, unit);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ========== ORDERS и ORDER_ITEMS ==========
app.get("/make-server-7614200b/orders", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    let { data: orders, error } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('orders').select('*').order('id', { ascending: false });
    if (error) throw error;
    
    // Filter for courier role - only their orders for today/tomorrow
    if (user.role === 'courier') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      orders = orders.filter(order => {
        // Must be assigned to this courier
        const isAssignedToCourier = order.courier_id === user.id;
        
        // Must be today or tomorrow
        const isToday = order.delivery_date === todayStr;
        const isTomorrow = order.delivery_date === tomorrowStr;
        
        // Must be in deliverable status (not new, not cancelled)
        // Statuses that courier can work with: confirmed, picking, ready, shipped, completed
        const deliverableStatuses = ['confirmed', 'picking', 'ready', 'shipped', 'completed'];
        const isDeliverable = deliverableStatuses.includes(order.status);
        
        return isAssignedToCourier && (isToday || isTomorrow) && isDeliverable;
      });
    }
    
    return c.json({ orders });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-7614200b/orders/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const { data: [order], error } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('orders').select('*').eq('id', id);
    if (error || !order) return c.json({ error: 'Order not found' }, 404);
    
    // Get order items
    const { data: items, error: itemsError } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('order_items').select('*').eq('order_id', id);
    if (itemsError) throw itemsError;
    
    return c.json({ order, items });
  } catch (error) {
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
      manager_id: orderData.managerId || user.id,
      delivery_status: orderData.deliveryStatus || null,
      courier_id: orderData.courierId || null,
      delivered_at: orderData.deliveredAt || null,
      delivered_lat: orderData.deliveredLat || null,
      delivered_lng: orderData.deliveredLng || null,
      proof_photo_url: orderData.proofPhotoUrl || null,
      proof_signature_url: orderData.proofSignatureUrl || null,
      recipient_name: orderData.recipientName || null,
      created_at: new Date().toISOString(),
      created_by: user.id,
    };

    await createClient(supabaseUrl, supabaseServiceKey)
      .from('orders').insert([order]);

    // Save order items
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const itemId = `${id}:${i}`;
        await createClient(supabaseUrl, supabaseServiceKey)
          .from('order_items').insert([{
            ...items[i],
            order_id: id,
            id: itemId,
          }]);
      }
    }
    
    await logAudit('order', id.toString(), 'create', user.id, order);
    
    return c.json({ order });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/make-server-7614200b/orders/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const { data: [existing], error } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('orders').select('*').eq('id', id);
    if (error || !existing) return c.json({ error: 'Order not found' }, 404);

    const { order: orderData, items } = await c.req.json();
    const order = {
      ...existing,
      ...orderData,
      id: existing.id,
      number: existing.number,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    await createClient(supabaseUrl, supabaseServiceKey)
      .from('orders').update(order).eq('id', id);

    // Update order items
    if (items) {
      // Delete old items
      const oldItems = await createClient(supabaseUrl, supabaseServiceKey)
        .from('order_items').select('*').eq('order_id', id);
      for (const item of oldItems) {
        await createClient(supabaseUrl, supabaseServiceKey).from('order_items').delete().eq('id', item.id);
      }
      
      // Save new items
      for (let i = 0; i < items.length; i++) {
        const itemId = `${id}:${i}`;
        await createClient(supabaseUrl, supabaseServiceKey)
          .from('order_items').insert([{
            ...items[i],
            order_id: id,
            id: itemId,
          }]);
      }
    }
    
    await logAudit('order', id, 'update', user.id, order);
    
    return c.json({ order });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-7614200b/orders/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const id = c.req.param('id');
    const { data: [order], error } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('orders').select('*').eq('id', id);
    if (error || !order) return c.json({ error: 'Order not found' }, 404);

    // Check if order can be deleted
    if (order.status !== 'new' && order.status !== 'cancelled') {
      return c.json({ error: 'Можно удалить только новые или отменённые заказы' }, 400);
    }

    // Delete order items
    const { data: items, error: itemsError } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('order_items').select('*').eq('order_id', id);
    if (itemsError) throw itemsError;
    for (const item of items) {
      await createClient(supabaseUrl, supabaseServiceKey).from('order_items').delete().eq('id', item.id);
    }

    await createClient(supabaseUrl, supabaseServiceKey).from('orders').delete().eq('id', id);
    await logAudit('order', id, 'delete', user.id, order);
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ========== PLATFORMS ==========
app.get('/make-server-7614200b/platforms', async (c) => {
  try {
    const { data: platforms, error } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('platforms').select('*').order('id', { ascending: true });
    if (error) throw error;
    return c.json({ platforms });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-7614200b/platforms', async (c) => {
  try {
    const user = await verifyUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const { name, description } = await c.req.json();
    const id = Date.now();
    const platform = {
      id,
      name,
      description: description || '',
      created_by: user.id,
      created_at: new Date().toISOString(),
    };
    await createClient(supabaseUrl, supabaseServiceKey)
      .from('platforms').insert([platform]);
    await logAudit('platform', id.toString(), 'create', user.id, platform);
    return c.json({ platform });
  } catch (error) {
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
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ========== CUSTOMERS ==========
app.get("/make-server-7614200b/customers", async (c) => {
  try {
    const { data: orders, error } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('orders').select('*');
    if (error) throw error;
    
    // Aggregate unique customers from orders
    const customersMap = new Map();
    orders.forEach(order => {
      const key = order.customer_phone || order.customer_email;
      if (key && !customersMap.has(key)) {
        customersMap.set(key, {
          id: key,
          name: order.customer_name,
          phone: order.customer_phone,
          email: order.customer_email,
          last_order_date: order.created_at,
          order_count: 1,
          total_spent: order.total || 0,
        });
      } else if (key) {
        const customer = customersMap.get(key);
        customer.order_count++;
        customer.total_spent += order.total || 0;
        if (order.created_at > customer.last_order_date) {
          customer.last_order_date = order.created_at;
        }
      }
    });
    
    return c.json({ customers: Array.from(customersMap.values()) });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ========== STATS ==========
app.get("/make-server-7614200b/stats/dashboard", async (c) => {
  try {
    const { data: orders, error } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('orders').select('*');
    if (error) throw error;
    const { data: products, error: productsError } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('products').select('*');
    if (productsError) throw productsError;
    const { data: stockUnits, error: stockUnitsError } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('stock_units').select('*');
    if (stockUnitsError) throw stockUnitsError;
    
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.created_at?.startsWith(today));
    
    const stats = {
      totalOrders: orders.length,
      todayOrders: todayOrders.length,
      newOrders: orders.filter(o => o.status === 'new').length,
      inProgressOrders: orders.filter(o => ['in_progress', 'confirmed', 'picking'].includes(o.status)).length,
      totalProducts: products.length,
      totalStock: stockUnits.filter(u => u.status === 'available').length,
      lowStock: products.filter(p => {
        const units = stockUnits.filter(u => u.product_id === p.id && u.status === 'available');
        return units.length < (p.min_stock || 0);
      }).length,
    };
    
    return c.json({ stats });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ========== AUDIT LOG ==========
app.get("/make-server-7614200b/audit", async (c) => {
  try {
    const { data: logs, error } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('audit').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    return c.json({ logs });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ========== STOCK MOVEMENTS ==========
app.get("/make-server-7614200b/stock-moves", async (c) => {
  try {
    const { data: moves, error } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('stock_moves').select('*').order('date', { ascending: false });
    if (error) throw error;
    return c.json({ moves });
  } catch (error) {
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
      const { data: items, error } = await createClient(supabaseUrl, supabaseServiceKey)
        .from('groups').select('*').eq('id', parseInt(prefix.replace(':', ''))); // Assuming ID is the key
      if (error) throw error;
      for (const item of items) {
        // Construct the key based on item structure
        if (item.id) {
          if (prefix === 'order_item:') {
            await createClient(supabaseUrl, supabaseServiceKey).from('order_items').delete().eq('id', item.id);
          } else {
            await createClient(supabaseUrl, supabaseServiceKey).from(prefix.replace(':', '')).delete().eq('id', item.id);
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
  } catch (error) {
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
      { id: 1, name: 'Смартфоны', description: 'Мобильные телефоны', active: true, created_at: new Date().toISOString() },
      { id: 2, name: 'Ноутбуки', description: 'Портативные компьютеры', active: true, created_at: new Date().toISOString() },
      { id: 3, name: 'Аксессуары', description: 'Чехлы, наушники, кабели', active: true, created_at: new Date().toISOString() },
    ];

    for (const group of groups) {
      await createClient(supabaseUrl, supabaseServiceKey)
        .from('groups').insert([group]);
    }

    // Create demo platforms
    const platforms = [
      { id: 1, name: 'Сайт', description: 'Собственный интернет-магазин', created_at: new Date().toISOString() },
      { id: 2, name: 'Instagram', description: 'Социальная сеть', created_at: new Date().toISOString() },
      { id: 3, name: 'Wildberries', description: 'Маркетплейс', created_at: new Date().toISOString() },
    ];

    for (const platform of platforms) {
      await createClient(supabaseUrl, supabaseServiceKey)
        .from('platforms').insert([platform]);
    }

    // Create demo products
    const products = [
      {
        id: 1001,
        sku: 'IPH15-BLK-128',
        group_id: 1,
        brand: 'Apple',
        model: 'iPhone 15 Pro 128GB Black',
        description: 'Новейший флагман от Apple',
        price_buy: 2500,
        price_sell: 3200,
        currency: 'BYN',
        unit: 'шт',
        min_stock: 5,
        location: 'A1-01',
        has_serial: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 1002,
        sku: 'SAM-S24-512',
        group_id: 1,
        brand: 'Samsung',
        model: 'Galaxy S24 Ultra 512GB',
        description: 'Топовый Android смартфон',
        price_buy: 2800,
        price_sell: 3500,
        currency: 'BYN',
        unit: 'шт',
        min_stock: 3,
        location: 'A1-02',
        has_serial: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 1003,
        sku: 'MAC-M3-PRO',
        group_id: 2,
        brand: 'Apple',
        model: 'MacBook Pro 14" M3',
        description: 'Профессиональный ноутбук',
        price_buy: 4500,
        price_sell: 5500,
        currency: 'BYN',
        unit: 'шт',
        min_stock: 2,
        location: 'B1-01',
        has_serial: true,
        created_at: new Date().toISOString(),
      },
    ];

    for (const product of products) {
      await createClient(supabaseUrl, supabaseServiceKey)
        .from('products').insert([product]);
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
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);
