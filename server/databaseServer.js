
import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Database Setup
const dbPath = path.join(__dirname, 'lumina.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      description TEXT
    )`);

        // Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT,
      product_name TEXT,
      quantity INTEGER,
      status TEXT,
      delivery_date TEXT,
      order_date TEXT
    )`);

        // Seed Products (if empty)
        db.get("SELECT count(*) as count FROM products", (err, row) => {
            if (row.count === 0) {
                console.log("Seeding products...");
                const stmt = db.prepare("INSERT INTO products (name, price, stock, description) VALUES (?, ?, ?, ?)");
                stmt.run("iPhone 15 Pro", 119900, 50, "Titanium design, A17 Pro chip");
                stmt.run("Samsung Galaxy S24 Ultra", 114999, 45, "AI features, 200MP camera");
                stmt.run("MacBook Air M3", 99900, 30, "13.6-inch Liquid Retina display");
                stmt.run("Sony WH-1000XM5", 19990, 100, "Industry leading noise cancellation");
                stmt.run("PlayStation 5", 54990, 10, "4K 120Hz gaming console");
                stmt.finalize();
            }
        });

        // Seed Orders (if empty)
        db.get("SELECT count(*) as count FROM orders", (err, row) => {
            if (row.count === 0) {
                console.log("Seeding dummy orders...");
                const stmt = db.prepare("INSERT INTO orders (id, customer_name, product_name, quantity, status, delivery_date, order_date) VALUES (?, ?, ?, ?, ?, ?, ?)");
                stmt.run("ORD-99887", "Rahul Sharma", "iPhone 15 Pro", 1, "Shipped", "2023-11-10", "2023-11-05");
                stmt.run("ORD-77665", "Priya Patel", "Sony WH-1000XM5", 2, "Processing", "2023-11-15", "2023-11-12");
                stmt.run("ORD-55443", "Amit Kumar", "MacBook Air M3", 1, "Delivered", "2023-10-20", "2023-10-15");
                stmt.finalize();
            }
        });
    });
}

// --- API Endpoints ---

// Get all products (or search by name)
app.get('/api/products', (req, res) => {
    console.log(`[GET] /api/products query:`, req.query);
    const { search } = req.query;
    let query = "SELECT * FROM products";
    let params = [];

    if (search) {
        query += " WHERE name LIKE ?";
        params.push(`%${search}%`);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ products: rows });
    });
});

// Get Order Details
app.get('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    console.log(`[GET] /api/orders/${id}`);
    db.get("SELECT * FROM orders WHERE id = ?", [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row) {
            res.json({ status: 'found', order: row });
        } else {
            res.json({ status: 'not_found', message: 'Order ID not found' });
        }
    });
});

// Place Order
app.post('/api/orders', (req, res) => {
    console.log(`[POST] /api/orders body:`, req.body);
    const { item_name, quantity, address, customer_name } = req.body;
    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`; // 5 digit random ID
    const orderDate = new Date().toISOString().split('T')[0];

    // Calculate delivery date (random 2-5 days)
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + Math.floor(Math.random() * 4) + 2);
    const deliveryDate = delivery.toISOString().split('T')[0];

    // Check stock first
    db.get("SELECT * FROM products WHERE name LIKE ?", [`%${item_name}%`], (err, product) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (!product) {
            // Allow ordering even if not in DB for demo flexibility, but warn
            console.log(`Product ${item_name} not found in DB, proceeding anyway.`);
        } else if (product.stock < quantity) {
            res.json({ status: 'error', message: `Insufficient stock. Only ${product.stock} left.` });
            return;
        }

        // Insert Order
        const stmt = db.prepare("INSERT INTO orders (id, customer_name, product_name, quantity, status, delivery_date, order_date) VALUES (?, ?, ?, ?, ?, ?, ?)");
        stmt.run(orderId, customer_name || 'Guest', item_name, quantity, 'Processing', deliveryDate, orderDate, function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            // Update Stock
            if (product) {
                db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [quantity, product.id]);
            }

            res.json({
                status: 'success',
                order_id: orderId,
                message: `Order placed successfully! ID: ${orderId}`,
                details: { item: item_name, quantity, delivery_date: deliveryDate }
            });
        });
        stmt.finalize();
    });
});

// Cancel Order
app.post('/api/orders/:id/cancel', (req, res) => {
    const { id } = req.params;
    console.log(`[POST] /api/orders/${id}/cancel`);

    db.get("SELECT * FROM orders WHERE id = ?", [id], (err, order) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!order) {
            res.json({ status: 'not_found', message: 'Order not found' });
            return;
        }
        if (order.status === 'Cancelled') {
            res.json({ status: 'error', message: 'Order is already cancelled' });
            return;
        }
        if (order.status === 'Delivered') {
            res.json({ status: 'error', message: 'Cannot cancel delivered order' });
            return;
        }

        db.run("UPDATE orders SET status = 'Cancelled' WHERE id = ?", [id], function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            // Restore stock (optional, skipping for simplicity)
            res.json({ status: 'success', message: 'Order cancelled successfully' });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Database Server running on http://localhost:${PORT}`);
});
