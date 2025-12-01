import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'lumina.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to database.');
    
    db.serialize(() => {
        // List all tables
        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'", (err, tables) => {
            if (err) {
                console.error(err);
                return;
            }
            
            const tableNames = tables.map(t => t.name);
            
            // Function to check next table
            const checkTable = (index) => {
                if (index >= tableNames.length) return;
                
                const tableName = tableNames[index];
                
                db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
                    if (err) {
                        console.error(`Error getting data for ${tableName}:`, err);
                    } else {
                        console.log(`\n=== ${tableName.toUpperCase()} TABLE ===`);
                        if (rows.length > 0) {
                            console.table(rows);
                        } else {
                            console.log('(Empty)');
                        }
                    }
                    checkTable(index + 1);
                });
            };

            checkTable(0);
        });
    });
});
