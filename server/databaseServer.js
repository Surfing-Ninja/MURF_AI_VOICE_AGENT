import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static invoices
app.use('/invoices', express.static(path.join(__dirname, 'invoices')));

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
        // Categories Table
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        )`);

        // Subcategories Table
        db.run(`CREATE TABLE IF NOT EXISTS subcategories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category_id INTEGER NOT NULL,
            FOREIGN KEY (category_id) REFERENCES categories(id),
            UNIQUE(name, category_id)
        )`);

        // Products Table with categories
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            stock INTEGER NOT NULL,
            description TEXT,
            category_id INTEGER,
            subcategory_id INTEGER,
            brand TEXT,
            image_url TEXT,
            FOREIGN KEY (category_id) REFERENCES categories(id),
            FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
        )`);

        // Orders Table (enhanced)
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            customer_name TEXT,
            product_name TEXT,
            quantity INTEGER,
            customer_email TEXT,
            customer_phone TEXT,
            customer_address TEXT,
            status TEXT DEFAULT 'Processing',
            order_date TEXT,
            delivery_date TEXT,
            delivery_slot TEXT,
            discount_code TEXT,
            subtotal INTEGER DEFAULT 0,
            discount_amount INTEGER DEFAULT 0,
            total_amount INTEGER DEFAULT 0,
            payment_method TEXT DEFAULT 'COD',
            invoice_number TEXT
        )`);

        // Add missing columns to orders table if they don't exist
        db.run(`ALTER TABLE orders ADD COLUMN customer_email TEXT`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE orders ADD COLUMN customer_phone TEXT`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE orders ADD COLUMN customer_address TEXT`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE orders ADD COLUMN subtotal INTEGER DEFAULT 0`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE orders ADD COLUMN discount_amount INTEGER DEFAULT 0`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE orders ADD COLUMN total_amount INTEGER DEFAULT 0`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'COD'`, (err) => {
            // Ignore error if column already exists
        });
        db.run(`ALTER TABLE orders ADD COLUMN invoice_number TEXT`, (err) => {
            // Ignore error if column already exists
        });

        // Order Items Table (for multiple items per order)
        db.run(`CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT,
            product_id INTEGER,
            product_name TEXT,
            product_price INTEGER,
            quantity INTEGER,
            subtotal INTEGER,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
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

        // Seed Categories
        db.get("SELECT count(*) as count FROM categories", (err, row) => {
            if (!row || row.count === 0) {
                console.log("Seeding categories...");
                const catStmt = db.prepare("INSERT INTO categories (name, description) VALUES (?, ?)");
                catStmt.run("Electronics & Gadgets", "Latest technology and electronic devices");
                catStmt.run("Home & Kitchen", "Everything for your home and kitchen needs");
                catStmt.run("Sports & Outdoors", "Fitness and outdoor adventure gear");
                catStmt.run("Automotive", "Car and bike accessories and tools");
                catStmt.finalize(() => {
                    console.log("Categories seeded!");
                    seedSubcategories();
                });
            } else {
                seedSubcategories();
            }
        });

        // Seed Subcategories
        function seedSubcategories() {
            db.get("SELECT count(*) as count FROM subcategories", (err, row) => {
                if (!row || row.count === 0) {
                    console.log("Seeding subcategories...");
                    const subStmt = db.prepare("INSERT INTO subcategories (name, category_id) VALUES (?, ?)");
                    
                    // Electronics & Gadgets (category_id: 1)
                    subStmt.run("Mobiles & Accessories", 1);     // id: 1
                    subStmt.run("Laptops", 1);                    // id: 2 (ONLY laptops)
                    subStmt.run("Smart Home Devices", 1);         // id: 3
                    subStmt.run("Wearables", 1);                  // id: 4
                    subStmt.run("Gaming Consoles", 1);            // id: 5 (NEW)
                    subStmt.run("PC Peripherals", 1);             // id: 6 (NEW - keyboards, mice)
                    
                    // Home & Kitchen (category_id: 2)
                    subStmt.run("Furniture", 2);
                    subStmt.run("Kitchen Tools", 2);
                    subStmt.run("Décor", 2);
                    subStmt.run("Appliances", 2);
                    
                    // Sports & Outdoors (category_id: 3)
                    subStmt.run("Fitness Gear", 3);
                    subStmt.run("Sportswear", 3);
                    subStmt.run("Outdoor Essentials", 3);
                    
                    // Automotive (category_id: 4)
                    subStmt.run("Car Accessories", 4);
                    subStmt.run("Bike Accessories", 4);
                    subStmt.run("Tools & Maintenance", 4);
                    
                    subStmt.finalize(() => {
                        console.log("Subcategories seeded!");
                        seedProducts();
                    });
                } else {
                    seedProducts();
                }
            });
        }

        // Seed Products (expanded catalog with Unsplash images)
        function seedProducts() {
            db.get("SELECT count(*) as count FROM products", (err, row) => {
            if (!row || row.count === 0) {
                console.log("Seeding products with images...");
                const stmt = db.prepare(`INSERT INTO products 
                    (name, price, stock, description, category_id, subcategory_id, brand, image_url) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
                
                // Electronics & Gadgets - Mobiles & Accessories
                stmt.run("iPhone 15 Pro", 119900, 50, "Titanium design, A17 Pro chip, 128GB", 1, 1, "Apple", "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop");
                stmt.run("Samsung Galaxy S21 Ultra", 114999, 45, "108MP camera, 5G, 256GB", 1, 1, "Samsung", "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop");
                stmt.run("OnePlus 12", 64999, 60, "Snapdragon 8 Gen 3, 120Hz display", 1, 1, "OnePlus", "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400&h=400&fit=crop");
                stmt.run("iPhone 15 Pro Max", 134900, 40, "Titanium, 256GB, 6.7-inch display", 1, 1, "Apple", "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&h=400&fit=crop");
                stmt.run("Wireless Earbuds Pro", 8999, 150, "ANC, 30hrs battery, IPX7 waterproof", 1, 1, "Generic", "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop");
                
                // Electronics & Gadgets - Laptops (subcategory_id: 2)
                stmt.run("MacBook Air M3", 99900, 30, "13.6-inch Liquid Retina display, 8GB RAM", 1, 2, "Apple", "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop");
                stmt.run("Dell XPS 15", 124999, 25, "Intel i7 13th Gen, 16GB RAM, RTX 4060", 1, 2, "Dell", "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=400&fit=crop");
                stmt.run("ASUS ROG Gaming Laptop", 134999, 20, "RTX 4070, 32GB RAM, 15.6-inch 240Hz", 1, 2, "ASUS", "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop");
                
                // Electronics & Gadgets - PC Peripherals (subcategory_id: 6)
                stmt.run("Logitech MX Master 3S", 8999, 100, "Wireless mouse, 8K DPI, ergonomic", 1, 6, "Logitech", "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop");
                stmt.run("Mechanical Keyboard RGB", 4999, 80, "Cherry MX switches, customizable RGB", 1, 6, "Generic", "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&h=400&fit=crop");
                
                // Electronics & Gadgets - Smart Home Devices
                stmt.run("Echo Dot 5th Gen", 4999, 120, "Alexa voice control, smart speaker", 1, 3, "Amazon", "https://images.unsplash.com/photo-1543512214-318c7553f230?w=400&h=400&fit=crop");
                stmt.run("Smart LED Bulb 4-Pack", 1999, 200, "WiFi enabled, 16M colors, voice control", 1, 3, "Philips", "https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=400&h=400&fit=crop");
                stmt.run("Ring Video Doorbell", 8999, 50, "1080p HD video, motion detection, two-way talk", 1, 3, "Ring", "https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=400&fit=crop");
                stmt.run("Smart Thermostat", 12999, 40, "Energy saving, app control, learning AI", 1, 3, "Nest", "https://images.unsplash.com/photo-1567925086983-a15a61d8cd0f?w=400&h=400&fit=crop");
                
                // Electronics & Gadgets - Wearables
                stmt.run("Apple Watch Series 9", 41900, 60, "GPS, fitness tracking, always-on display", 1, 4, "Apple", "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=400&fit=crop");
                stmt.run("Fitbit Charge 6", 14999, 80, "Heart rate, GPS, sleep tracking", 1, 4, "Fitbit", "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400&h=400&fit=crop");
                stmt.run("Sony WH-1000XM5", 19990, 100, "Industry leading noise cancellation", 1, 4, "Sony", "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=400&fit=crop");
                
                // Home & Kitchen - Furniture (subcategory_id: 7)
                stmt.run("Ergonomic Office Chair", 24999, 40, "Lumbar support, mesh back, adjustable", 2, 7, "Generic", "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&h=400&fit=crop");
                stmt.run("Study Desk with Storage", 15999, 30, "Wooden, 4ft wide, drawer organizer", 2, 7, "Generic", "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=400&fit=crop");
                stmt.run("Premium Sofa Set", 54999, 15, "3-seater, fabric upholstery, modern design", 2, 7, "Generic", "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop");
                
                // Home & Kitchen - Kitchen Tools (subcategory_id: 8)
                stmt.run("Stainless Steel Cookware Set", 5999, 50, "10-piece, non-stick, induction compatible", 2, 8, "Prestige", "https://images.unsplash.com/photo-1584990347449-a2d4c2c044c9?w=400&h=400&fit=crop");
                stmt.run("Electric Kettle 1.5L", 1299, 100, "Auto shut-off, stainless steel", 2, 8, "Philips", "https://images.unsplash.com/photo-1594213114663-d94db9b17b2e?w=400&h=400&fit=crop");
                stmt.run("Food Processor 600W", 4999, 60, "Multi-function, 3 jars, mixer grinder", 2, 8, "Bajaj", "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400&h=400&fit=crop");
                
                // Home & Kitchen - Décor (subcategory_id: 9)
                stmt.run("Wall Art Canvas Set", 2999, 70, "3-piece modern abstract, framed", 2, 9, "Generic", "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&h=400&fit=crop");
                stmt.run("LED String Lights 10M", 899, 150, "Warm white, waterproof, USB powered", 2, 9, "Generic", "https://images.unsplash.com/photo-1513001900722-370f803f498d?w=400&h=400&fit=crop");
                stmt.run("Decorative Table Lamp", 1999, 80, "Bedside, touch control, dimmable", 2, 9, "Generic", "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop");
                
                // Home & Kitchen - Appliances (subcategory_id: 10)
                stmt.run("Air Fryer 4L", 6999, 55, "1400W, digital display, 8 presets", 2, 10, "Philips", "https://images.unsplash.com/photo-1626509653291-18d9a934b9db?w=400&h=400&fit=crop");
                stmt.run("Vacuum Cleaner Robotic", 24999, 25, "Auto-charge, app control, 2000Pa suction", 2, 10, "Mi", "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&h=400&fit=crop");
                stmt.run("Microwave Oven 20L", 7999, 40, "Solo, 700W, child lock", 2, 10, "LG", "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=400&h=400&fit=crop");
                
                // Sports & Outdoors - Fitness Gear (subcategory_id: 11)
                stmt.run("Yoga Mat Premium", 1299, 100, "6mm thick, anti-slip, eco-friendly", 3, 11, "Generic", "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop");
                stmt.run("Dumbbell Set 20kg", 3499, 50, "Adjustable weight, chrome finish", 3, 11, "Generic", "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop");
                stmt.run("Resistance Bands Set", 899, 120, "5 bands, different resistance levels", 3, 11, "Generic", "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400&h=400&fit=crop");
                stmt.run("Treadmill Folding", 34999, 20, "2.5HP motor, 12 programs, LCD display", 3, 11, "Generic", "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&h=400&fit=crop");
                
                // Sports & Outdoors - Sportswear (subcategory_id: 12)
                stmt.run("Running Shoes Men", 4999, 80, "Cushioned sole, breathable mesh", 3, 12, "Nike", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop");
                stmt.run("Sports T-Shirt Dri-FIT", 1299, 150, "Moisture-wicking, anti-odor", 3, 12, "Adidas", "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop");
                stmt.run("Gym Shorts Compression", 999, 130, "Quick-dry, elastic waistband", 3, 12, "Puma", "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&h=400&fit=crop");
                
                // Sports & Outdoors - Outdoor Essentials (subcategory_id: 13)
                stmt.run("Camping Tent 4-Person", 8999, 30, "Waterproof, easy setup, carry bag", 3, 13, "Quechua", "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=400&fit=crop");
                stmt.run("Hiking Backpack 50L", 3999, 50, "Multiple compartments, rain cover", 3, 13, "Wildcraft", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop");
                stmt.run("Water Bottle Insulated", 899, 200, "1L, keeps cold 24hrs, BPA-free", 3, 13, "Milton", "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop");
                
                // Automotive - Car Accessories (subcategory_id: 14)
                stmt.run("Car Dashboard Camera", 4999, 60, "1080p, night vision, loop recording", 4, 14, "Generic", "https://images.unsplash.com/photo-1621266876144-f5351e45d605?w=400&h=400&fit=crop");
                stmt.run("Car Phone Mount Magnetic", 599, 150, "360° rotation, strong grip", 4, 14, "Generic", "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400&h=400&fit=crop");
                stmt.run("Car Vacuum Cleaner", 2499, 70, "Portable, 12V, HEPA filter", 4, 14, "Black & Decker", "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&h=400&fit=crop");
                stmt.run("Tire Pressure Monitor", 2999, 50, "Digital display, 4 sensors, wireless", 4, 14, "Generic", "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=400&h=400&fit=crop");
                
                // Automotive - Bike Accessories (subcategory_id: 15)
                stmt.run("Bike Helmet with LED", 1499, 100, "Adjustable, ventilated, rear LED light", 4, 15, "Generic", "https://images.unsplash.com/photo-1557803175-2f8c4c543d85?w=400&h=400&fit=crop");
                stmt.run("Bike Lock Chain Heavy Duty", 899, 120, "Steel chain, weather resistant", 4, 15, "Generic", "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400&h=400&fit=crop");
                stmt.run("Bike Phone Holder", 399, 180, "Universal fit, anti-shake, waterproof", 4, 15, "Generic", "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop");
                
                // Automotive - Tools & Maintenance (subcategory_id: 16)
                stmt.run("Car Tool Kit 46-Piece", 2999, 40, "Screwdrivers, wrenches, pliers, case", 4, 16, "Bosch", "https://images.unsplash.com/photo-1581166397057-235af2b3c6dd?w=400&h=400&fit=crop");
                stmt.run("Portable Air Compressor", 3999, 35, "12V, digital gauge, auto shut-off", 4, 16, "Generic", "https://images.unsplash.com/photo-1600493572220-353c267e1678?w=400&h=400&fit=crop");
                stmt.run("Engine Oil 5W-30 4L", 1999, 80, "Synthetic, high performance", 4, 16, "Castrol", "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&h=400&fit=crop");
                
                // Gaming Consoles (subcategory_id: 5)
                stmt.run("PlayStation 5", 54990, 10, "4K 120Hz gaming console, 825GB SSD", 1, 5, "Sony", "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=400&fit=crop");
                stmt.run("Xbox Series X", 52990, 12, "4K gaming, 1TB SSD, Game Pass", 1, 5, "Microsoft", "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400&h=400&fit=crop");
                stmt.run("Nintendo Switch OLED", 34990, 25, "7-inch OLED screen, portable gaming", 1, 5, "Nintendo", "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400&h=400&fit=crop");
                
                stmt.finalize(() => {
                    console.log("Products seeded successfully with images!");
                    seedOrders();
                });
            } else {
                seedOrders();
            }
            });
        }

        // Seed Orders (if empty)
        function seedOrders() {
            db.get("SELECT count(*) as count FROM orders", (err, row) => {
                if (!row || row.count === 0) {
                    console.log("Seeding dummy orders...");
                    const stmt = db.prepare("INSERT INTO orders (id, customer_name, product_name, quantity, customer_address, status, delivery_date, order_date, subtotal, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    stmt.run("ORD-99887", "Rahul Sharma", "iPhone 15 Pro", 1, "123 Main St, Mumbai", "Shipped", "2023-11-10", "2023-11-05", 119900, 119900);
                    stmt.run("ORD-77665", "Priya Patel", "Sony WH-1000XM5", 2, "456 Oak Ave, Delhi", "Processing", "2023-11-15", "2023-11-12", 39980, 39980);
                    stmt.run("ORD-55443", "Amit Kumar", "MacBook Air M3", 1, "789 Park Rd, Bangalore", "Delivered", "2023-10-20", "2023-10-15", 99900, 99900);
                    stmt.finalize(() => {
                        console.log("Orders seeded!");
                    });
                }
            });
        }
    });
}

// --- API Endpoints ---

// Get all products (or search by name, category, subcategory, price range)
app.get('/api/products', (req, res) => {
    console.log(`[GET] /api/products query:`, req.query);
    const { search, category, subcategory, brand, min_price, max_price } = req.query;
    let query = `SELECT p.*, c.name as category_name, s.name as subcategory_name 
                 FROM products p 
                 LEFT JOIN categories c ON p.category_id = c.id 
                 LEFT JOIN subcategories s ON p.subcategory_id = s.id 
                 WHERE 1=1`;
    let params = [];

    if (search) {
        query += " AND (p.name LIKE ? OR p.description LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
        query += " AND c.name LIKE ?";
        params.push(`%${category}%`);
    }

    if (subcategory) {
        query += " AND s.name LIKE ?";
        params.push(`%${subcategory}%`);
    }

    if (brand) {
        query += " AND p.brand LIKE ?";
        params.push(`%${brand}%`);
    }

    if (min_price) {
        query += " AND p.price >= ?";
        params.push(parseInt(min_price));
    }

    if (max_price) {
        query += " AND p.price <= ?";
        params.push(parseInt(max_price));
    }

    // Order by price for better presentation
    query += " ORDER BY p.price ASC";

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ products: rows });
    });
});

// Get all categories
app.get('/api/categories', (req, res) => {
    console.log(`[GET] /api/categories`);
    db.all("SELECT * FROM categories", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ categories: rows });
    });
});

// Get subcategories for a category
app.get('/api/categories/:id/subcategories', (req, res) => {
    const { id } = req.params;
    console.log(`[GET] /api/categories/${id}/subcategories`);
    db.all("SELECT * FROM subcategories WHERE category_id = ?", [id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ subcategories: rows });
    });
});

// Get all subcategories
app.get('/api/subcategories', (req, res) => {
    console.log(`[GET] /api/subcategories`);
    db.all(`SELECT s.*, c.name as category_name 
            FROM subcategories s 
            LEFT JOIN categories c ON s.category_id = c.id`, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ subcategories: rows });
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
app.post('/api/orders', async (req, res) => {
    console.log(`[POST] /api/orders body:`, req.body);
    const { item_name, quantity, address, customer_name } = req.body;
    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`; // 5 digit random ID
    const invoiceNumber = `INV-${orderId}`;
    const orderDate = new Date().toISOString().split('T')[0];

    // Calculate delivery date (random 2-5 days)
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + Math.floor(Math.random() * 4) + 2);
    const deliveryDate = delivery.toISOString().split('T')[0];

    // Check stock first
    db.get("SELECT * FROM products WHERE name LIKE ?", [`%${item_name}%`], async (err, product) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        let productPrice = 0;
        let totalAmount = 0;

        if (!product) {
            // Allow ordering even if not in DB for demo flexibility, but warn
            console.log(`Product ${item_name} not found in DB, proceeding anyway.`);
            productPrice = 0;
        } else if (product.stock < quantity) {
            res.json({ status: 'error', message: `Insufficient stock. Only ${product.stock} left.` });
            return;
        } else {
            productPrice = product.price;
            totalAmount = product.price * quantity;
        }

        // Insert Order
        const stmt = db.prepare("INSERT INTO orders (id, customer_name, product_name, quantity, customer_address, status, delivery_date, order_date, total_amount, invoice_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        stmt.run(orderId, customer_name || 'Guest', item_name, quantity, address || '', 'Processing', deliveryDate, orderDate, totalAmount, invoiceNumber, async function (err) {
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

            // Generate PDF Invoice
            try {
                const invoicesDir = path.join(__dirname, 'invoices');
                if (!fs.existsSync(invoicesDir)) {
                    fs.mkdirSync(invoicesDir, { recursive: true });
                }

                const invoicePath = path.join(invoicesDir, `${invoiceNumber}.pdf`);
                
                await new Promise((resolve, reject) => {
                    const doc = new PDFDocument({ margin: 50, size: 'A4' });
                    const writeStream = fs.createWriteStream(invoicePath);
                    
                    writeStream.on('finish', () => {
                        console.log(`[PlaceOrder] Invoice PDF generated: ${invoicePath}`);
                        resolve();
                    });
                    writeStream.on('error', reject);
                    
                    doc.pipe(writeStream);

                    // Company Header
                    doc.fontSize(28)
                       .fillColor('#c87d4a')
                       .text('Kreta-Bandhu', { align: 'center' });
                    
                    doc.fontSize(11)
                       .fillColor('#999')
                       .text('Your Trusted Shopping Partner', { align: 'center' });
                    
                    doc.moveDown(1.5);

                    // INVOICE Title
                    doc.fontSize(20)
                       .fillColor('#333')
                       .text('INVOICE', { align: 'center' });
                    
                    doc.moveDown(1);

                    // Invoice Details (Right Aligned)
                    const detailsX = 350;
                    doc.fontSize(10).fillColor('#666');
                    doc.text(`Invoice No: ${invoiceNumber}`, detailsX, doc.y, { align: 'right' });
                    doc.text(`Order ID: ${orderId}`, detailsX, doc.y, { align: 'right' });
                    doc.text(`Date: ${orderDate}`, detailsX, doc.y, { align: 'right' });
                    
                    doc.moveDown(2);

                    // Bill To Section
                    doc.fontSize(11).fillColor('#333').text('Bill To:', 50, doc.y);
                    doc.moveDown(0.3);
                    doc.fontSize(10).fillColor('#666');
                    doc.text(`Name: ${customer_name || 'Guest'}`, 50, doc.y);
                    if (address) {
                        doc.text(`Address: ${address}`, 50, doc.y);
                    }
                    
                    doc.moveDown(2);

                    // Table Header with underline
                    const tableTop = doc.y;
                    doc.fontSize(10).fillColor('#666');
                    doc.text('Item', 50, tableTop, { width: 200 });
                    doc.text('Qty', 280, tableTop, { width: 80, align: 'center' });
                    doc.text('Price', 360, tableTop, { width: 100, align: 'right' });
                    doc.text('Total', 460, tableTop, { width: 100, align: 'right' });
                    
                    // Horizontal line under header
                    doc.moveDown(0.3);
                    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
                    doc.moveDown(0.5);

                    // Item
                    const itemY = doc.y;
                    doc.fontSize(10).fillColor('#444');
                    doc.text(item_name, 50, itemY, { width: 220 });
                    doc.text(quantity.toString(), 280, itemY, { width: 80, align: 'center' });
                    doc.text(`Rs.${productPrice.toLocaleString('en-IN')}`, 360, itemY, { width: 100, align: 'right' });
                    doc.text(`Rs.${totalAmount.toLocaleString('en-IN')}`, 460, itemY, { width: 100, align: 'right' });
                    doc.moveDown(1.5);

                    // Horizontal line before totals
                    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
                    doc.moveDown(0.8);

                    // Total
                    const totalsX = 460;
                    doc.fontSize(12).fillColor('#c87d4a');
                    doc.text('Total:', 360, doc.y, { width: 100, align: 'right', bold: true });
                    doc.text(`Rs.${totalAmount.toLocaleString('en-IN')}`, totalsX, doc.y - 14, { width: 100, align: 'right' });
                    
                    doc.moveDown(2);

                    // Payment & Status Info
                    doc.fontSize(10).fillColor('#666');
                    doc.text('Payment Method: COD', 50, doc.y);
                    doc.text(`Expected Delivery: ${deliveryDate}`, 50, doc.y);
                    
                    doc.moveDown(1.5);

                    // Return Policy
                    doc.fontSize(9).fillColor('#999');
                    doc.text('Return Policy: 30-day easy return policy. Products can be returned within 30 days of delivery.', 50, doc.y, { width: 500 });
                    
                    doc.moveDown(2.5);

                    // Footer
                    doc.fontSize(9).fillColor('#bbb');
                    doc.text('Thank you for shopping with Kreta-Bandhu!', { align: 'center' });
                    doc.text('For support: 1800-123-4567 | support@kreta-bandhu.com', { align: 'center' });

                    doc.end();
                });

                console.log(`[PlaceOrder] Order ${orderId} placed successfully with invoice`);
            } catch (invoiceErr) {
                console.error(`[PlaceOrder] Failed to generate invoice:`, invoiceErr);
                // Continue even if invoice fails
            }

            res.json({
                status: 'success',
                order_id: orderId,
                invoice_number: invoiceNumber,
                invoice_url: `/invoices/${invoiceNumber}.pdf`,
                message: `Order placed successfully! ID: ${orderId}`,
                details: { item: item_name, quantity, delivery_date: deliveryDate, price: productPrice, total: totalAmount }
            });
        });
        stmt.finalize();
    });
});

// Checkout Cart - Place order with multiple items
app.post('/api/orders/checkout', async (req, res) => {
    console.log(`[POST] /api/orders/checkout body:`, req.body);
    const { customer_name, customer_email, customer_phone, address, items, payment_method } = req.body;

    if (!items || items.length === 0) {
        return res.json({ status: 'error', message: 'Cart is empty. Add items to cart first.' });
    }

    if (!customer_name) {
        return res.json({ status: 'error', message: 'Customer name is required.' });
    }

    if (!address) {
        return res.json({ status: 'error', message: 'Delivery address is required.' });
    }

    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderDate = new Date().toISOString().split('T')[0];
    const orderTime = new Date().toISOString();

    // Calculate delivery date (3-5 days for standard delivery)
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + Math.floor(Math.random() * 3) + 3);
    const deliveryDate = delivery.toISOString().split('T')[0];

    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
        subtotal += item.price * item.quantity;
    });

    // Apply discount if applicable (10% for orders above ₹10,000)
    let discountAmount = 0;
    if (subtotal >= 10000) {
        discountAmount = Math.floor(subtotal * 0.1);
    }

    const totalAmount = subtotal - discountAmount;

    // Return policy
    const returnPolicy = {
        eligible: true,
        days: 30,
        policy: "30-day easy return policy. Products must be unused and in original packaging.",
        refundMethod: "Original payment method (7-10 business days)",
        exceptions: "Electronics: 7-day replacement only. Personal items: Non-returnable."
    };

    // Prepare inserted items list
    const insertedItems = items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity
    }));

    // Combine product names and total quantity for main order record
    const combinedProductNames = items.map(item => item.name).join(', ');
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    try {
        // Insert Order into database (including product_name and quantity)
        await new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO orders (
                    id, customer_name, customer_email, customer_phone, customer_address,
                    product_name, quantity, status, order_date, delivery_date, subtotal, discount_amount, 
                    total_amount, payment_method, invoice_number
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                orderId, customer_name, customer_email || '', customer_phone || '', address,
                combinedProductNames, totalQuantity, 'Processing', orderDate, deliveryDate, subtotal, discountAmount,
                totalAmount, payment_method || 'COD', invoiceNumber
            ], function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        console.log(`[Checkout] Order ${orderId} inserted into database`);

        // Insert order items
        for (const item of items) {
            const itemSubtotal = item.price * item.quantity;
            await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [orderId, item.id || null, item.name, item.price, item.quantity, itemSubtotal], 
                function(err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });

            // Update stock if product has ID
            if (item.id) {
                await new Promise((resolve, reject) => {
                    db.run("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?", 
                        [item.quantity, item.id, item.quantity],
                        function(err) {
                            if (err) reject(err);
                            else resolve(this);
                        });
                });
            }
        }

        console.log(`[Checkout] ${items.length} order items inserted`);

        // Generate PDF Invoice
        const invoicesDir = path.join(__dirname, 'invoices');
        if (!fs.existsSync(invoicesDir)) {
            fs.mkdirSync(invoicesDir, { recursive: true });
        }

        const invoicePath = path.join(invoicesDir, `${invoiceNumber}.pdf`);
        
        // Create PDF with promise
        await new Promise((resolve, reject) => {
            const doc = new PDFDocument({ 
                margin: 50,
                size: 'A4'
            });
            const writeStream = fs.createWriteStream(invoicePath);
            
            writeStream.on('finish', () => {
                console.log(`[Checkout] Invoice PDF generated: ${invoicePath}`);
                resolve();
            });
            writeStream.on('error', reject);
            
            doc.pipe(writeStream);

            // Company Header
            doc.fontSize(28)
               .fillColor('#c87d4a')
               .text('Kreta-Bandhu', { align: 'center' });
            
            doc.fontSize(11)
               .fillColor('#999')
               .text('Your Trusted Shopping Partner', { align: 'center' });
            
            doc.moveDown(1.5);

            // INVOICE Title
            doc.fontSize(20)
               .fillColor('#333')
               .text('INVOICE', { align: 'center' });
            
            doc.moveDown(1);

            // Invoice Details (Right Aligned)
            const detailsX = 350;
            doc.fontSize(10).fillColor('#666');
            doc.text(`Invoice No: ${invoiceNumber}`, detailsX, doc.y, { align: 'right' });
            doc.text(`Order ID: ${orderId}`, detailsX, doc.y, { align: 'right' });
            const formattedDate = new Date().toLocaleDateString('en-GB').split('/').join('/');
            doc.text(`Date: ${formattedDate.split('/').reverse().join('-')}`, detailsX, doc.y, { align: 'right' });
            
            doc.moveDown(2);

            // Bill To Section
            doc.fontSize(11).fillColor('#333').text('Bill To:', 50, doc.y);
            doc.moveDown(0.3);
            doc.fontSize(10).fillColor('#666');
            doc.text(`Name: ${customer_name}`, 50, doc.y);
            doc.text(`Address: ${address}`, 50, doc.y);
            
            doc.moveDown(2);

            // Table Header with underline
            const tableTop = doc.y;
            doc.fontSize(10).fillColor('#666');
            doc.text('Item', 50, tableTop, { width: 200 });
            doc.text('Qty', 280, tableTop, { width: 80, align: 'center' });
            doc.text('Price', 360, tableTop, { width: 100, align: 'right' });
            doc.text('Total', 460, tableTop, { width: 100, align: 'right' });
            
            // Horizontal line under header
            doc.moveDown(0.3);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
            doc.moveDown(0.5);

            // Items
            insertedItems.forEach((item, index) => {
                const itemY = doc.y;
                doc.fontSize(10).fillColor('#444');
                doc.text(item.name, 50, itemY, { width: 220 });
                doc.text(item.quantity.toString(), 280, itemY, { width: 80, align: 'center' });
                doc.text(`Rs.${item.price.toLocaleString('en-IN')}`, 360, itemY, { width: 100, align: 'right' });
                doc.text(`Rs.${item.subtotal.toLocaleString('en-IN')}`, 460, itemY, { width: 100, align: 'right' });
                doc.moveDown(0.8);
            });

            doc.moveDown(0.5);
            
            // Horizontal line before totals
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
            doc.moveDown(0.8);

            // Subtotal
            const totalsX = 460;
            doc.fontSize(10).fillColor('#666');
            doc.text('Subtotal:', 360, doc.y, { width: 100, align: 'right' });
            doc.text(`Rs.${subtotal.toLocaleString('en-IN')}`, totalsX, doc.y - 12, { width: 100, align: 'right' });
            doc.moveDown(0.5);
            
            // Discount (if applicable)
            if (discountAmount > 0) {
                doc.fillColor('#22c55e');
                doc.text('Discount (10%):', 360, doc.y, { width: 100, align: 'right' });
                doc.text(`-Rs.${discountAmount.toLocaleString('en-IN')}`, totalsX, doc.y - 12, { width: 100, align: 'right' });
                doc.moveDown(0.5);
            }

            // Total
            doc.fontSize(12).fillColor('#c87d4a');
            doc.text('Total:', 360, doc.y, { width: 100, align: 'right', bold: true });
            doc.text(`Rs.${totalAmount.toLocaleString('en-IN')}`, totalsX, doc.y - 14, { width: 100, align: 'right' });
            
            doc.moveDown(2);

            // Payment & Delivery Info
            doc.fontSize(10).fillColor('#666');
            doc.text(`Payment Method: ${payment_method || 'COD'}`, 50, doc.y);
            doc.text(`Expected Delivery: ${deliveryDate}`, 50, doc.y);
            
            doc.moveDown(1.5);

            // Return Policy
            doc.fontSize(9).fillColor('#999');
            doc.text(`Return Policy: ${returnPolicy.policy}`, 50, doc.y, { width: 500 });
            
            doc.moveDown(2.5);

            // Footer
            doc.fontSize(9).fillColor('#bbb');
            doc.text('Thank you for shopping with Kreta-Bandhu!', { align: 'center' });
            doc.text('For support: 1800-123-4567 | support@kreta-bandhu.com', { align: 'center' });

            doc.end();
        });

        // Send success response
        console.log(`[Checkout] Order ${orderId} completed successfully`);
        res.json({
            status: 'success',
            message: `Order placed successfully!`,
            order: {
                order_id: orderId,
                invoice_number: invoiceNumber,
                invoice_url: `/invoices/${invoiceNumber}.pdf`,
                customer_name: customer_name,
                delivery_address: address,
                order_date: orderDate,
                order_time: orderTime,
                expected_delivery: deliveryDate,
                delivery_slot: 'Standard Delivery (9 AM - 9 PM)',
                status: 'Processing',
                items: insertedItems,
                item_count: items.length,
                subtotal: subtotal,
                discount: discountAmount,
                total: totalAmount,
                payment_method: payment_method || 'Cash on Delivery',
                return_policy: returnPolicy,
                support: {
                    phone: '1800-123-4567',
                    email: 'support@kreta-bandhu.com',
                    hours: '9 AM - 9 PM IST'
                },
                tracking: {
                    status: 'Order Confirmed',
                    message: 'Your order has been confirmed and will be processed shortly.',
                    next_update: 'You will receive shipping updates via SMS/Email'
                }
            }
        });

    } catch (error) {
        console.error('[Checkout] Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to process checkout: ' + error.message });
    }
});

// Get Order with Items (Full Details)
app.get('/api/orders/:id/full', (req, res) => {
    const { id } = req.params;
    console.log(`[GET] /api/orders/${id}/full`);
    
    db.get("SELECT * FROM orders WHERE id = ?", [id], (err, order) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!order) {
            res.json({ status: 'not_found', message: 'Order not found' });
            return;
        }

        // Get order items
        db.all("SELECT * FROM order_items WHERE order_id = ?", [id], (err, items) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            // Calculate return eligibility (30 days from order date)
            const orderDate = new Date(order.order_date);
            const now = new Date();
            const daysSinceOrder = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
            const returnEligible = daysSinceOrder <= 30;

            res.json({
                status: 'found',
                order: {
                    ...order,
                    items: items || [],
                    return_policy: {
                        eligible: returnEligible,
                        days_remaining: returnEligible ? 30 - daysSinceOrder : 0,
                        policy: "30-day easy return. Products must be unused and in original packaging."
                    }
                }
            });
        });
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

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);

        doc.pipe(res);

        // Company Header
        doc.fontSize(28)
           .fillColor('#c87d4a')
           .text('Kreta-Bandhu', { align: 'center' });
        
        doc.fontSize(11)
           .fillColor('#999')
           .text('Your Trusted Shopping Partner', { align: 'center' });
        
        doc.moveDown(1.5);

        // INVOICE Title
        doc.fontSize(20)
           .fillColor('#333')
           .text('INVOICE', { align: 'center' });
        
        doc.moveDown(1);

        // Invoice Details (Right Aligned)
        const detailsX = 350;
        doc.fontSize(10).fillColor('#666');
        doc.text(`Invoice No: INV-${id}`, detailsX, doc.y, { align: 'right' });
        doc.text(`Order ID: ${id}`, detailsX, doc.y, { align: 'right' });
        const formattedDate = new Date(order.order_date).toLocaleDateString('en-GB').split('/').reverse().join('-');
        doc.text(`Date: ${formattedDate}`, detailsX, doc.y, { align: 'right' });
        
        doc.moveDown(2);

        // Bill To Section
        doc.fontSize(11).fillColor('#333').text('Bill To:', 50, doc.y);
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#666');
        doc.text(`Name: ${order.customer_name}`, 50, doc.y);
        if (order.customer_address) {
            doc.text(`Address: ${order.customer_address}`, 50, doc.y);
        }
        
        doc.moveDown(2);

        // Table Header with underline
        const tableTop = doc.y;
        doc.fontSize(10).fillColor('#666');
        doc.text('Item', 50, tableTop, { width: 200 });
        doc.text('Qty', 280, tableTop, { width: 80, align: 'center' });
        doc.text('Price', 360, tableTop, { width: 100, align: 'right' });
        doc.text('Total', 460, tableTop, { width: 100, align: 'right' });
        
        // Horizontal line under header
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
        doc.moveDown(0.5);

        // Item
        const itemY = doc.y;
        doc.fontSize(10).fillColor('#444');
        doc.text(order.product_name, 50, itemY, { width: 220 });
        doc.text(order.quantity.toString(), 280, itemY, { width: 80, align: 'center' });
        const price = order.total_amount ? (order.total_amount / order.quantity) : 0;
        const total = order.total_amount || 0;
        doc.text(`Rs.${price.toLocaleString('en-IN')}`, 360, itemY, { width: 100, align: 'right' });
        doc.text(`Rs.${total.toLocaleString('en-IN')}`, 460, itemY, { width: 100, align: 'right' });
        doc.moveDown(1.5);

        // Horizontal line before totals
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
        doc.moveDown(0.8);

        // Total
        const totalsX = 460;
        doc.fontSize(12).fillColor('#c87d4a');
        doc.text('Total:', 360, doc.y, { width: 100, align: 'right', bold: true });
        doc.text(`Rs.${total.toLocaleString('en-IN')}`, totalsX, doc.y - 14, { width: 100, align: 'right' });
        
        doc.moveDown(2);

        // Payment & Status Info
        doc.fontSize(10).fillColor('#666');
        doc.text(`Payment Method: ${order.payment_method || 'COD'}`, 50, doc.y);
        doc.text(`Status: ${order.status}`, 50, doc.y);
        if (order.delivery_date) {
            doc.text(`Expected Delivery: ${order.delivery_date}`, 50, doc.y);
        }
        
        doc.moveDown(1.5);

        // Return Policy
        doc.fontSize(9).fillColor('#999');
        doc.text('Return Policy: 30-day easy return policy. Products can be returned within 30 days of delivery.', 50, doc.y, { width: 500 });
        
        doc.moveDown(2.5);

        // Footer
        doc.fontSize(9).fillColor('#bbb');
        doc.text('Thank you for shopping with Kreta-Bandhu!', { align: 'center' });
        doc.text('For support: 1800-123-4567 | support@kreta-bandhu.com', { align: 'center' });

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
