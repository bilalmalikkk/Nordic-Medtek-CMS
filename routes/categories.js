import express from 'express';
import { query, queryOne, insert, update, dbDelete, run } from '../database/init.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await query(`
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.status = 'PUBLISHED'
            WHERE c.is_active = 1
            GROUP BY c.id
            ORDER BY c.sort_order ASC, c.name ASC
        `);

        res.json({ categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single category
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const category = await queryOne(`
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.status = 'PUBLISHED'
            WHERE c.id = ? OR c.slug = ?
            GROUP BY c.id
        `, [id, id]);

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ category });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create category (admin only)
router.post('/', [authenticateToken, requireAdmin], async (req, res) => {
    try {
        const { name, slug, description, icon, color, sort_order = 0 } = req.body;

        // Generate slug if not provided
        const categorySlug = slug || name.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');

        // Check if slug already exists
        const existingCategory = await queryOne(
            'SELECT id FROM categories WHERE slug = ?',
            [categorySlug]
        );

        if (existingCategory) {
            return res.status(400).json({ error: 'Category with this slug already exists' });
        }

        const categoryData = {
            name,
            slug: categorySlug,
            description,
            icon,
            color,
            sort_order,
            is_active: 1
        };

        const result = await insert('categories', categoryData);

        res.status(201).json({
            message: 'Category created successfully',
            category: { id: result.id, ...categoryData }
        });

    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update category (admin only)
router.put('/:id', [authenticateToken, requireAdmin], async (req, res) => {
    try {
        const { id } = req.params;

        const existingCategory = await queryOne('SELECT * FROM categories WHERE id = ?', [id]);
        if (!existingCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const updateData = req.body;
        await update('categories', id, updateData);

        res.json({ message: 'Category updated successfully' });

    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete category (admin only)
router.delete('/:id', [authenticateToken, requireAdmin], async (req, res) => {
    try {
        const { id } = req.params;

        const existingCategory = await queryOne('SELECT id FROM categories WHERE id = ?', [id]);
        if (!existingCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Check if category has products
        const productsInCategory = await queryOne(
            'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
            [id]
        );

        if (productsInCategory.count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete category that contains products',
                productCount: productsInCategory.count
            });
        }

        await dbDelete('categories', id);

        res.json({ message: 'Category deleted successfully' });

    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Debug endpoint to check category order (admin only)
router.get('/debug/order', [authenticateToken, requireAdmin], async (req, res) => {
    try {
        const categories = await query(`
            SELECT id, name, slug, sort_order, is_active
            FROM categories
            ORDER BY sort_order ASC, name ASC
        `);
        
        res.json({ 
            message: 'Current category order',
            categories: categories,
            total: categories.length
        });
    } catch (error) {
        console.error('Debug category order error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Manual migration endpoint to update category order (admin only)
router.post('/migrate-order', [authenticateToken, requireAdmin], async (req, res) => {
    try {
        console.log('🔄 Running manual category order migration...');
        
        const categoryOrderUpdates = [
            { slug: 'trygghet-og-fallsikring', sortOrder: 1, name: 'Trygghet og fallsikring' },
            { slug: 'alarm-knapp-og-varsling', sortOrder: 2, name: 'Alarm knapp og varsling' },
            { slug: 'medisinsk-oppfolging', sortOrder: 3, name: 'Medisinsk oppfølging' },
            { slug: 'cameras', sortOrder: 4, name: 'Cameras' },
            { slug: 'communication', sortOrder: 5, name: 'Communication' }
        ];
        
        const results = [];
        
        for (const { slug, sortOrder, name } of categoryOrderUpdates) {
            const updateQuery = `UPDATE categories SET sort_order = ? WHERE slug = ?`;
            const result = await run(updateQuery, [sortOrder, slug]);
            results.push({
                category: name,
                slug: slug,
                sortOrder: sortOrder,
                changes: result.changes
            });
            console.log(`✓ Updated category order for '${name}' to position ${sortOrder}`);
        }
        
        console.log('✅ Manual category order migration completed');
        
        res.json({ 
            message: 'Category order migration completed successfully',
            results: results
        });

    } catch (error) {
        console.error('❌ Manual category order migration error:', error);
        res.status(500).json({ 
            error: 'Failed to update category order',
            details: error.message
        });
    }
});

export default router;
