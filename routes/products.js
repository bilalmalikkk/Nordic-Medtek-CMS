import express from 'express';
import { body, validationResult } from 'express-validator';
import { query, queryOne, insert, update, dbDelete, run } from '../database/init.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all products (public and admin routes)
const getProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 1000,
            category,
            status = 'PUBLISHED',
            featured,
            search,
            sort = 'sorting',
            order = 'ASC'
        } = req.query;

        const offset = (page - 1) * limit;
        let whereConditions = [];
        let queryParams = [];

        // Build WHERE conditions
        if (category) {
            whereConditions.push('p.category_id = ?');
            queryParams.push(category);
        }

        if (status) {
            whereConditions.push('p.status = ?');
            queryParams.push(status);
        }

        if (featured !== undefined) {
            whereConditions.push('p.is_featured = ?');
            queryParams.push(featured === 'true' ? 1 : 0);
        }

        if (search) {
            whereConditions.push('(p.title LIKE ? OR p.product_name LIKE ? OR p.technical_data LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Build ORDER BY clause
        const validSortFields = ['sorting', 'title', 'product_name', 'created_at', 'updated_at'];
        const sortField = validSortFields.includes(sort) ? sort : 'sorting';
        const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ${whereClause}
        `;
        const countResult = await queryOne(countQuery, queryParams);
        const total = countResult.total;

        // Get products with pagination
        const productsQuery = `
            SELECT 
                p.*,
                c.name as category_name,
                c.slug as category_slug,
                c.color as category_color,
                c.icon as category_icon
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ${whereClause}
            ORDER BY p.${sortField} ${sortOrder}
            LIMIT ? OFFSET ?
        `;
        
        const products = await query(productsQuery, [...queryParams, limit, offset]);

        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get single product
const getProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await query(`
            SELECT 
                p.*,
                c.name as category_name,
                c.slug as category_slug,
                c.color as category_color,
                c.icon as category_icon
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? OR p.slug = ? OR p.item_number = ?
        `, [id, id, id]);

        if (product.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ product: product[0] });

    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create new product (admin only)
const createProduct = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            title,
            product_name,
            item_number,
            technical_data,
            rich_text_description,
            rich_text,
            detailed_description,
            image_url,
            pdf_url,
            datasheet_url,
            category_id,
            sorting = 0,
            manual_sort,
            status = 'DRAFT',
            is_featured = false,
            publish_date,
            unpublish_date,
            external_id
        } = req.body;

        // Check if item number already exists
        const existingProduct = await queryOne(
            'SELECT id FROM products WHERE item_number = ?',
            [item_number]
        );

        if (existingProduct) {
            return res.status(400).json({ error: 'Product with this item number already exists' });
        }

        // Generate slug from title or product_name
        const slugSource = title || product_name || 'untitled';
        const slug = slugSource.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-') || 'untitled';

        const productData = {
            title,
            product_name,
            item_number,
            slug,
            technical_data,
            rich_text_description,
            rich_text,
            detailed_description,
            image_url,
            pdf_url,
            datasheet_url,
            category_id: category_id || null,
            sorting,
            manual_sort,
            status,
            is_featured: is_featured ? 1 : 0,
            publish_date,
            unpublish_date,
            external_id
        };

        const result = await insert('products', productData);

        res.status(201).json({
            message: 'Product created successfully',
            product: { id: result.id, ...productData }
        });

    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update product (admin only)
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if product exists
        const existingProduct = await queryOne('SELECT * FROM products WHERE id = ?', [id]);
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const updateData = req.body;
        
        console.log('📝 Update product request for ID:', id);
        console.log('📦 Received update data:', updateData);

        // Define allowed fields for update (exclude read-only and JOIN fields)
        const allowedFields = [
            'title', 'product_name', 'item_number', 'slug', 'technical_data',
            'rich_text_description', 'rich_text', 'detailed_description',
            'image_url', 'pdf_url', 'datasheet_url', 'category_id',
            'collection_id', 'sorting', 'manual_sort', 'status', 'is_featured',
            'publish_date', 'unpublish_date', 'external_id'
        ];
        
        console.log('📝 Allowed fields for update:', allowedFields);

        // Remove any fields that are undefined, read-only, or not allowed
        const cleanedUpdateData = {};
        for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined && 
                key !== 'id' && 
                key !== 'created_at' && 
                key !== 'updated_at' &&
                allowedFields.includes(key)) {
                cleanedUpdateData[key] = value;
            } else if (!allowedFields.includes(key) && value !== undefined) {
                console.warn(`⚠️  Skipping non-allowed field: ${key}`);
            }
        }

        // Handle boolean conversion for is_featured
        if (cleanedUpdateData.is_featured !== undefined) {
            cleanedUpdateData.is_featured = cleanedUpdateData.is_featured ? 1 : 0;
        }
        
        console.log('✅ Cleaned update data:', cleanedUpdateData);

        if (Object.keys(cleanedUpdateData).length === 0) {
            console.warn('⚠️  No valid fields to update');
            return res.json({ message: 'No changes to apply' });
        }

        const updateResult = await update('products', id, cleanedUpdateData);
        
        console.log('✅ Product updated successfully');
        console.log('📊 Update result:', updateResult);
        
        // Verify the update by fetching the updated product
        const updatedProduct = await queryOne('SELECT * FROM products WHERE id = ?', [id]);
        console.log('🔍 Verified updated product:', updatedProduct);
        
        res.json({ 
            message: 'Product updated successfully',
            updatedProduct: updatedProduct
        });

    } catch (error) {
        console.error('❌ Update product error:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Provide more detailed error information
        if (error.message && error.message.includes('no such column')) {
            const columnMatch = error.message.match(/no such column: (\w+)/);
            const columnName = columnMatch ? columnMatch[1] : 'unknown';
            res.status(500).json({ 
                error: 'Database schema error',
                details: `Column '${columnName}' does not exist in the products table. Migration may be required.`,
                message: error.message 
            });
        } else if (error.message && error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ 
                error: 'Duplicate value error',
                details: error.message
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to update product',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
};

// Delete product (admin only)
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const existingProduct = await queryOne('SELECT id FROM products WHERE id = ?', [id]);
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await dbDelete('products', id);

        res.json({ message: 'Product deleted successfully' });

    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete all products (admin only)
const deleteAllProducts = async (req, res) => {
    try {
        // First, get count of products before deletion
        const countBefore = await queryOne('SELECT COUNT(*) as count FROM products');
        console.log('Products before deletion:', countBefore.count);
        
        // Delete all products (regardless of status)
        const result = await run('DELETE FROM products');
        console.log('Products deleted:', result.changes);
        
        // Verify deletion
        const countAfter = await queryOne('SELECT COUNT(*) as count FROM products');
        console.log('Products after deletion:', countAfter.count);
        
        res.json({ 
            message: 'All products deleted successfully',
            deletedCount: result.changes,
            countBefore: countBefore.count,
            countAfter: countAfter.count
        });

    } catch (error) {
        console.error('Delete all products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Debug endpoint to check database state
const debugProducts = async (req, res) => {
    try {
        const allProducts = await query('SELECT id, product_name, item_number, status, external_id FROM products ORDER BY id');
        const countByStatus = await query('SELECT status, COUNT(*) as count FROM products GROUP BY status');
        
        // Check for duplicate item numbers
        const duplicateItems = await query(`
            SELECT item_number, COUNT(*) as count 
            FROM products 
            GROUP BY item_number 
            HAVING COUNT(*) > 1
        `);
        
        // Check for duplicate external IDs
        const duplicateExternalIds = await query(`
            SELECT external_id, COUNT(*) as count 
            FROM products 
            WHERE external_id IS NOT NULL 
            GROUP BY external_id 
            HAVING COUNT(*) > 1
        `);
        
        res.json({
            totalProducts: allProducts.length,
            products: allProducts,
            countByStatus: countByStatus,
            duplicateItemNumbers: duplicateItems,
            duplicateExternalIds: duplicateExternalIds
        });
    } catch (error) {
        console.error('Debug products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Routes
router.get('/debug', debugProducts);
router.get('/', getProducts);
router.get('/:id', getProduct);

// Admin routes (require authentication)
router.post('/', [
    authenticateToken,
    requireAdmin,
    body('title').notEmpty().withMessage('Title is required'),
    body('product_name').notEmpty().withMessage('Product name is required'),
    body('item_number').notEmpty().withMessage('Item number is required'),
    body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']).withMessage('Invalid status')
], createProduct);

router.put('/:id', [
    authenticateToken,
    requireAdmin,
    body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']).withMessage('Invalid status')
], updateProduct);

// Bulk operations (must be before /:id route to avoid conflicts)
router.delete('/bulk/delete', [authenticateToken, requireAdmin], deleteAllProducts);

router.delete('/:id', [authenticateToken, requireAdmin], deleteProduct);

export default router;
