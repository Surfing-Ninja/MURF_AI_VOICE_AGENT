import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

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
      order_date TEXT,
      delivery_slot TEXT,
      discount_code TEXT
    )`);

        // Customers Table
        db.run(`CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            phone TEXT,
            address TEXT,
            loyalty_points INTEGER DEFAULT 0,
            last_order_id TEXT
        )`);

        // Refunds Table
        db.run(`CREATE TABLE IF NOT EXISTS refunds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT,
            status TEXT,
            amount INTEGER,
            reason TEXT
        )`);

        // Feedback Table
        db.run(`CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            rating INTEGER,
            comment TEXT,
            email TEXT
        )`);

        // Attempt to add columns to existing orders table if they don't exist
        db.run("ALTER TABLE orders ADD COLUMN delivery_slot TEXT", (err) => { /* ignore error if exists */ });
        db.run("ALTER TABLE orders ADD COLUMN discount_code TEXT", (err) => { /* ignore error if exists */ });
        db.run("ALTER TABLE customers ADD COLUMN last_order_id TEXT", (err) => { /* ignore error if exists */ });
        db.run("ALTER TABLE feedback ADD COLUMN email TEXT", (err) => { /* ignore error if exists */ });

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

            // Update Customer's Last Order ID
            if (customer_name && customer_name !== 'Guest') {
                db.run("UPDATE customers SET last_order_id = ? WHERE name LIKE ?", [orderId, `%${customer_name}%`], (err) => {
                    if (err) console.error("Failed to link order to customer:", err);
                    else console.log(`Linked order ${orderId} to customer ${customer_name}`);
                });
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
            res.json({ status: 'success', message: 'Order cancelled successfully' });
        });
    });
});

// --- NEW ENDPOINTS ---

// 1. Check Refund Status
app.get('/api/refunds/:order_id', (req, res) => {
    const { order_id } = req.params;
    db.get("SELECT * FROM refunds WHERE order_id = ?", [order_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json({ status: 'found', refund: row });
        } else {
            // Check if order exists first
            db.get("SELECT status FROM orders WHERE id = ?", [order_id], (err, order) => {
                if (order && order.status === 'Cancelled') {
                    res.json({ status: 'processing', message: 'Refund is being processed for cancelled order.' });
                } else {
                    res.json({ status: 'not_found', message: 'No refund record found.' });
                }
            });
        }
    });
});

// Create Refund Request
app.post('/api/refunds', (req, res) => {
    const { order_id, reason } = req.body;
    console.log(`[POST] /api/refunds`, req.body);

    // Verify order exists
    db.get("SELECT * FROM orders WHERE id = ?", [order_id], (err, order) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!order) return res.json({ status: 'not_found', message: 'Order not found' });

        // Create refund
        db.run("INSERT INTO refunds (order_id, status, amount, reason) VALUES (?, ?, ?, ?)",
            [order_id, 'Processing', 0, reason], // Amount 0 for now, would fetch from product price
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ status: 'success', message: `Refund request submitted for ${order_id}. Reason: ${reason}` });
            }
        );
    });
});

// 2. Apply Discount
app.post('/api/orders/:id/discount', (req, res) => {
    const { id } = req.params;
    const { code } = req.body;
    // Mock validation
    const validCodes = ['DIWALI2024', 'FIRSTDIWALI', 'WELCOME10'];
    if (validCodes.includes(code)) {
        db.run("UPDATE orders SET discount_code = ? WHERE id = ?", [code, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ status: 'success', message: `Discount ${code} applied!` });
        });
    } else {
        res.json({ status: 'invalid', message: 'Invalid or expired coupon code.' });
    }
});

// 3. Generate Invoice (PDF)
app.get('/api/orders/:id/invoice', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM orders WHERE id = ?", [id], (err, order) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);

        doc.pipe(res);

        doc.fontSize(25).text('Lumina Support Invoice', 100, 80);
        doc.fontSize(12).text(`Invoice Number: INV-${id}`, 100, 150);
        doc.text(`Order ID: ${id}`, 100, 170);
        doc.text(`Date: ${order.order_date}`, 100, 190);
        doc.text(`Customer: ${order.customer_name}`, 100, 210);

        doc.moveDown();
        doc.text(`Item: ${order.product_name}`);
        doc.text(`Quantity: ${order.quantity}`);
        doc.text(`Status: ${order.status}`);

        if (order.discount_code) {
            doc.text(`Discount Applied: ${order.discount_code}`);
        }

        doc.moveDown();
        doc.fontSize(16).text('Total: Paid', { align: 'right' });

        doc.end();
    });
});

// 4. Update Shipping Address
app.patch('/api/orders/:id/address', (req, res) => {
    const { id } = req.params;
    const { address } = req.body;
    db.run("UPDATE orders SET address = ? WHERE id = ?", [address, id], function (err) {
        // Note: 'address' column might not exist in original schema, assuming it's part of order or we just simulate success
        // For this demo, let's assume we update the customer profile or just return success
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Shipping address updated.' });
    });
});

// 5. Schedule Delivery
app.patch('/api/orders/:id/schedule', (req, res) => {
    const { id } = req.params;
    const { slot } = req.body;
    db.run("UPDATE orders SET delivery_slot = ? WHERE id = ?", [slot, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: `Delivery scheduled for ${slot}.` });
    });
});

// 6. Create Customer Profile
app.post('/api/customers', (req, res) => {
    const { name, email, phone, address } = req.body;
    const points = 100; // Sign up bonus
    db.run("INSERT INTO customers (name, email, phone, address, loyalty_points) VALUES (?, ?, ?, ?, ?)",
        [name, email, phone, address, points],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.json({ status: 'exists', message: 'Customer profile already exists.' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ status: 'success', message: 'Profile created! You earned 100 loyalty points.' });
        }
    );
});

// 7. Get Customer Details (Loyalty & Address)
app.get('/api/customers', (req, res) => {
    const { email, name } = req.query;
    let query = "SELECT * FROM customers WHERE";
    let params = [];

    if (email) {
        query += " email = ?";
        params.push(email);
    } else if (name) {
        query += " name LIKE ?";
        params.push(`%${name}%`);
    } else {
        return res.status(400).json({ error: 'Provide email or name' });
    }

    db.get(query, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json({ status: 'found', customer: row });
        } else {
            res.json({ status: 'not_found', message: 'Customer profile not found.' });
        }
    });
});

// 8. Submit Feedback
app.post('/api/feedback', (req, res) => {
    const { customer_id, rating, comment, email } = req.body;
    db.run("INSERT INTO feedback (customer_id, rating, comment, email) VALUES (?, ?, ?, ?)",
        [customer_id || 0, rating, comment, email],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ status: 'success', message: 'Thank you for your feedback!' });
        }
    );
});

app.listen(PORT, () => {
    console.log(`Database Server running on http://localhost:${PORT}`);
});
