import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle Railway deployment database path
// Priority: 1. Custom env var, 2. Railway volume path, 3. Local path
const DB_PATH = process.env.DATABASE_PATH 
    || (process.env.NODE_ENV === 'production' ? '/data/cms.db' : path.join(__dirname, 'cms.db'));
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Create database connection with error handling
const { Database } = sqlite3.verbose();

console.log('🔍 Database configuration:');
console.log('   Environment:', process.env.NODE_ENV);
console.log('   Database path:', DB_PATH);
console.log('   Schema path:', SCHEMA_PATH);

// Ensure the database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    console.log('📁 Creating database directory:', dbDir);
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err);
        throw err;
    } else {
        console.log('✅ Database connection established successfully');
    }
});

async function ensureAdminUser() {
    try {
        const existingAdmin = await dbHelpers.queryOne('SELECT * FROM users WHERE username = ?', ['admin']);
        if (!existingAdmin) {
            console.log('Creating default admin user...');
            
            // Use environment variables for admin credentials
            const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
            const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@nordicmedtek.com';
            const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
            
            // Hash the password using bcrypt
            const bcrypt = await import('bcryptjs');
            const passwordHash = await bcrypt.hash(adminPassword, parseInt(process.env.BCRYPT_ROUNDS) || 10);
            
            await db.run(
                "INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, 'admin', 1)",
                [adminUsername, adminEmail, passwordHash]
            );
            console.log('✅ Default admin user created with username:', adminUsername);
        } else {
            console.log('✅ Admin user already exists');
        }
    } catch (error) {
        console.error('❌ Error ensuring admin user:', error);
        throw error;
    }
}

async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Initializing database...');
        
        if (!fs.existsSync(SCHEMA_PATH)) {
            const error = new Error(`Schema file not found at: ${SCHEMA_PATH}`);
            console.error('❌', error.message);
            reject(error);
            return;
        }

        console.log('📄 Reading schema file...');
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        
        console.log('🔧 Executing database schema...');
        db.exec(schema, async (err) => {
            if (err) {
                console.error('❌ Error initializing database:', err);
                reject(err);
            } else {
                console.log('✅ Database schema loaded successfully');
                try {
                    await ensureAdminUser();
                    console.log('✅ Database initialization completed');
                    resolve();
                } catch (adminError) {
                    console.error('❌ Error creating admin user:', adminError);
                    reject(adminError);
                }
            }
        });
    });
}

// Database query helper functions
const dbHelpers = {
    // Get all records from a table
    getAll: (table, conditions = '') => {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM ${table} ${conditions}`;
            db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Get single record by ID
    getById: (table, id) => {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM ${table} WHERE id = ?`;
            db.get(query, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    // Insert new record
    insert: (table, data) => {
        return new Promise((resolve, reject) => {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map(() => '?').join(', ');
            
            const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
            
            db.run(query, values, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    },

    // Update record
    update: (table, id, data) => {
        return new Promise((resolve, reject) => {
            const keys = Object.keys(data);
            
            if (keys.length === 0) {
                console.warn('No data to update');
                resolve({ changes: 0 });
                return;
            }
            
            const values = Object.values(data);
            const setClause = keys.map(key => `${key} = ?`).join(', ');
            
            const query = `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            
            console.log('About to update product with data:', data);
            console.log('Database update query:', query);
            console.log('Database update values:', [...values, id]);
            
            db.run(query, [...values, id], function(err) {
                if (err) {
                    console.error('❌ Database update error:', err);
                    console.error('   Table:', table);
                    console.error('   Query:', query);
                    console.error('   Values:', [...values, id]);
                    console.error('   Error message:', err.message);
                    reject(err);
                } else {
                    console.log(`✅ Successfully updated ${this.changes} row(s) in ${table}`);
                    resolve({ changes: this.changes });
                }
            });
        });
    },

    // Delete record
    delete: (table, id) => {
        return new Promise((resolve, reject) => {
            const query = `DELETE FROM ${table} WHERE id = ?`;
            db.run(query, [id], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    },

    // Execute custom query
    query: (query, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Execute custom query (single row)
    queryOne: (query, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(query, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    // Execute custom query (run - for INSERT/UPDATE/DELETE)
    run: (query, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(query, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }
};

// Close database connection
function closeDatabase() {
    return new Promise((resolve) => {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
            resolve();
        });
    });
}

export {
    db,
    initializeDatabase,
    closeDatabase
};

export const {
    getAll,
    getById,
    insert,
    update,
    delete: deleteRecord,
    query,
    queryOne,
    run
} = dbHelpers;

// Export delete as dbDelete for backward compatibility
export { deleteRecord as dbDelete };
