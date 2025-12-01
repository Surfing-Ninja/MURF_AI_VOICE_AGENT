
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'lumina.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
});

console.log("=== PRODUCTS TABLE ===");
db.all("SELECT id, name, price, stock FROM products", [], (err, rows) => {
    if (err) console.error(err);
    else console.table(rows);

    console.log("\n=== ORDERS TABLE ===");
    db.all("SELECT * FROM orders", [], (err, rows) => {
        if (err) console.error(err);
        else {
            if (rows.length === 0) console.log("No orders found.");
            else console.table(rows);
        }
        db.close();
    });
});
