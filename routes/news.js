import express from 'express';
import { body, validationResult } from 'express-validator';
import { query, queryOne, insert, update, dbDelete } from '../database/init.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all news (public route, optional auth for admin)
const getNews = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 100,
            status,
            language,
            sort = 'date',
            order = 'DESC',
            all = false // Query param to show all statuses (admin only)
        } = req.query;

        const offset = (page - 1) * limit;
        let whereConditions = [];
        let queryParams = [];
        
        // If status is provided and not empty, filter by it
        if (status && status !== '') {
            whereConditions.push('status = ?');
            queryParams.push(status);
        } else if (all === 'true' || all === true) {
            // If 'all' parameter is true, show all statuses (admin feature)
            // No status filter added
        } else {
            // Default to PUBLISHED for public access
            whereConditions.push('status = ?');
            queryParams.push('PUBLISHED');
        }

        // Filter by language if provided
        if (language) {
            whereConditions.push('language = ?');
            queryParams.push(language);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Build ORDER BY clause
        const validSortFields = ['date', 'created_at', 'updated_at', 'title'];
        const sortField = validSortFields.includes(sort) ? sort : 'date';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM news 
            ${whereClause}
        `;
        const countResult = await queryOne(countQuery, queryParams);
        const total = countResult.total;

        // Get news with pagination
        const newsQuery = `
            SELECT *
            FROM news
            ${whereClause}
            ORDER BY ${sortField} ${sortOrder}
            LIMIT ? OFFSET ?
        `;
        
        const newsItems = await query(newsQuery, [...queryParams, limit, offset]);

        res.json({
            news: newsItems,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get news error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get single news item (public route)
const getNewsItem = async (req, res) => {
    try {
        const { id } = req.params;

        const newsItem = await queryOne(
            'SELECT * FROM news WHERE id = ? OR slug = ?',
            [id, id]
        );

        if (!newsItem) {
            return res.status(404).json({ error: 'News item not found' });
        }

        res.json({ news: newsItem });

    } catch (error) {
        console.error('Get news item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create new news item (admin only)
const createNews = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            title,
            description,
            content,
            image_key,
            image_url,
            date,
            status = 'DRAFT',
            language = 'no',
            link
        } = req.body;

        // Generate slug from title
        const slugSource = title || 'untitled';
        let baseSlug = slugSource.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-') || 'untitled';
        
        // Check for existing slugs and add suffix if needed
        let slug = baseSlug;
        let counter = 1;
        while (true) {
            const existingSlug = await queryOne('SELECT id FROM news WHERE slug = ?', [slug]);
            if (!existingSlug) {
                break; // Slug is unique
            }
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // Convert date to ISO format if it's in YYYY-MM-DD format
        let formattedDate = date || new Date().toISOString();
        if (formattedDate && /^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
            // Convert YYYY-MM-DD to ISO 8601
            formattedDate = `${formattedDate}T00:00:00.000Z`;
        }

        const newsData = {
            title,
            slug,
            description: description || null,
            content: content || null,
            image_key: image_key || null,
            image_url: image_url || null,
            date: formattedDate,
            status,
            language,
            link: link || null
        };

        const result = await insert('news', newsData);

        res.status(201).json({
            message: 'News item created successfully',
            news: { id: result.id, ...newsData }
        });

    } catch (error) {
        console.error('Create news error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update news item (admin only)
const updateNews = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if news item exists
        const existingNews = await queryOne('SELECT * FROM news WHERE id = ?', [id]);
        if (!existingNews) {
            return res.status(404).json({ error: 'News item not found' });
        }

        const updateData = req.body;
        
        // Define allowed fields for update
        const allowedFields = [
            'title', 'slug', 'description', 'content', 'image_key', 'image_url',
            'date', 'status', 'language', 'link'
        ];
        
        // Remove any fields that are undefined or not allowed
        const cleanedUpdateData = {};
        for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined && 
                key !== 'id' && 
                key !== 'created_at' && 
                key !== 'updated_at' &&
                allowedFields.includes(key)) {
                cleanedUpdateData[key] = value;
            }
        }

        // Handle slug uniqueness if slug is being updated
        if (cleanedUpdateData.slug) {
            const existingSlug = await queryOne('SELECT id FROM news WHERE slug = ? AND id != ?', [cleanedUpdateData.slug, id]);
            if (existingSlug) {
                return res.status(400).json({ error: 'Slug already exists' });
            }
        }

        if (Object.keys(cleanedUpdateData).length === 0) {
            return res.json({ message: 'No changes to apply' });
        }

        // Add updated_at timestamp
        cleanedUpdateData.updated_at = new Date().toISOString();

        await update('news', id, cleanedUpdateData);
        
        // Fetch updated news item
        const updatedNews = await queryOne('SELECT * FROM news WHERE id = ?', [id]);
        
        res.json({ 
            message: 'News item updated successfully',
            news: updatedNews
        });

    } catch (error) {
        console.error('Update news error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete news item (admin only)
const deleteNews = async (req, res) => {
    try {
        const { id } = req.params;

        const existingNews = await queryOne('SELECT id FROM news WHERE id = ?', [id]);
        if (!existingNews) {
            return res.status(404).json({ error: 'News item not found' });
        }

        await dbDelete('news', id);

        res.json({ message: 'News item deleted successfully' });

    } catch (error) {
        console.error('Delete news error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Routes
router.get('/', getNews);
router.get('/:id', getNewsItem);

// Admin routes (require authentication)
router.post('/', [
    authenticateToken,
    requireAdmin,
    body('title').notEmpty().withMessage('Title is required'),
    body('date').optional().custom((value) => {
        // Accept both ISO 8601 and YYYY-MM-DD formats
        if (!value) return true;
        const isoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
        const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
        if (isoDate || dateOnly) return true;
        throw new Error('Date must be in ISO 8601 or YYYY-MM-DD format');
    }),
    body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']).withMessage('Invalid status'),
    body('language').optional().isIn(['no', 'en']).withMessage('Language must be "no" or "en"')
], createNews);

router.put('/:id', [
    authenticateToken,
    requireAdmin,
    body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
    body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']).withMessage('Invalid status'),
    body('language').optional().isIn(['no', 'en']).withMessage('Language must be "no" or "en"')
], updateNews);

router.delete('/:id', [authenticateToken, requireAdmin], deleteNews);

export default router;

