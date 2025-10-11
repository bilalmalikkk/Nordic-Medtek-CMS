import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the same database path logic as init.js
// Priority: 1. Custom env var, 2. Railway volume path, 3. Local path
const DB_PATH = process.env.DATABASE_PATH 
    || (process.env.NODE_ENV === 'production' ? '/data/cms.db' : path.join(__dirname, 'cms.db'));
const { Database } = sqlite3.verbose();

console.log('🔍 Migration database path:', DB_PATH);

async function runMigrations() {
    return new Promise((resolve, reject) => {
        const db = new Database(DB_PATH);
        
        console.log('🔄 Running database migrations...');
        
        Promise.all([
            checkAndAddColumn(db, 'products', 'rich_text', 'TEXT'),
            checkAndAddColumn(db, 'products', 'pdf_url', 'TEXT'),
            checkAndAddColumn(db, 'products', 'datasheet_url', 'TEXT'),
            checkAndAddColumn(db, 'products', 'detailed_description', 'TEXT'),
            updateCategoryNames(db),
            updateCategoryOrder(db)
        ])
        .then(() => {
            console.log('✅ Database migrations completed successfully');
            db.close(() => resolve());
        })
        .catch((error) => {
            console.error('❌ Migration error:', error);
            db.close(() => reject(error));
        });
    });
}

function checkAndAddColumn(db, tableName, columnName, columnType) {
    return new Promise((resolve, reject) => {
        // Check if column exists
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                reject(err);
                return;
            }
            
            const columnExists = columns.some(col => col.name === columnName);
            
            if (columnExists) {
                console.log(`  ✓ Column '${columnName}' already exists in ${tableName}`);
                resolve();
                return;
            }
            
            // Add column if it doesn't exist
            const alterQuery = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;
            console.log(`  + Adding column '${columnName}' to ${tableName}`);
            
            db.run(alterQuery, (err) => {
                if (err) {
                    console.error(`  ✗ Failed to add column '${columnName}':`, err.message);
                    reject(err);
                } else {
                    console.log(`  ✓ Column '${columnName}' added successfully`);
                    resolve();
                }
            });
        });
    });
}

function updateCategoryNames(db) {
    return new Promise((resolve, reject) => {
        console.log('  + Updating category names...');
        
        const categoryUpdates = [
            { oldName: 'Sensors', newName: 'Trygghet og fallsikring', newSlug: 'trygghet-og-fallsikring' },
            { oldName: 'Medical Devices', newName: 'Medisinsk oppfølging', newSlug: 'medisinsk-oppfolging' },
            { oldName: 'Infrastructure', newName: 'Alarm knapp og varsling', newSlug: 'alarm-knapp-og-varsling' }
        ];
        
        let completed = 0;
        const total = categoryUpdates.length;
        
        if (total === 0) {
            resolve();
            return;
        }
        
        categoryUpdates.forEach(({ oldName, newName, newSlug }) => {
            const updateQuery = `UPDATE categories SET name = ?, slug = ? WHERE name = ?`;
            db.run(updateQuery, [newName, newSlug, oldName], function(err) {
                if (err) {
                    console.error(`  ✗ Failed to update category '${oldName}':`, err.message);
                    reject(err);
                } else {
                    if (this.changes > 0) {
                        console.log(`  ✓ Updated category '${oldName}' to '${newName}'`);
                    } else {
                        console.log(`  ✓ Category '${oldName}' not found (already updated or doesn't exist)`);
                    }
                    completed++;
                    if (completed === total) {
                        resolve();
                    }
                }
            });
        });
    });
}

function updateCategoryOrder(db) {
    return new Promise((resolve, reject) => {
        console.log('  + Updating category order...');
        
        const categoryOrderUpdates = [
            { slug: 'trygghet-og-fallsikring', sortOrder: 1, name: 'Trygghet og fallsikring' },
            { slug: 'alarm-knapp-og-varsling', sortOrder: 2, name: 'Alarm knapp og varsling' },
            { slug: 'medisinsk-oppfolging', sortOrder: 3, name: 'Medisinsk oppfølging' },
            { slug: 'cameras', sortOrder: 4, name: 'Cameras' },
            { slug: 'communication', sortOrder: 5, name: 'Communication' }
        ];
        
        let completed = 0;
        const total = categoryOrderUpdates.length;
        
        categoryOrderUpdates.forEach(({ slug, sortOrder, name }) => {
            const updateQuery = `UPDATE categories SET sort_order = ? WHERE slug = ?`;
            db.run(updateQuery, [sortOrder, slug], function(err) {
                if (err) {
                    console.error(`  ✗ Failed to update category order for '${name}':`, err.message);
                    reject(err);
                } else {
                    console.log(`  ✓ Updated category order for '${name}' to position ${sortOrder}`);
                    completed++;
                    if (completed === total) {
                        resolve();
                    }
                }
            });
        });
    });
}

// Run migrations if this file is executed directly
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule || process.argv[1]?.includes('migrate.js')) {
    console.log('Starting migration script...');
    runMigrations()
        .then(() => {
            console.log('✨ Migration script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

export default runMigrations;

