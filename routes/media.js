import express from 'express';
import { query, queryOne, dbDelete } from '../database/init.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all media files
router.get('/', [authenticateToken, requireAdmin], async (req, res) => {
    try {
        const { page = 1, limit = 20, type, search } = req.query;
        const offset = (page - 1) * limit;

        let whereConditions = [];
        let queryParams = [];

        if (type) {
            whereConditions.push('file_type = ?');
            queryParams.push(type);
        }

        if (search) {
            whereConditions.push('(original_name LIKE ? OR alt_text LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const mediaFiles = await query(`
            SELECT * FROM media_files 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset]);

        const totalResult = await queryOne(`
            SELECT COUNT(*) as total FROM media_files ${whereClause}
        `, queryParams);

        res.json({
            media: mediaFiles,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult.total,
                pages: Math.ceil(totalResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Get media error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single media file
router.get('/:id', [authenticateToken, requireAdmin], async (req, res) => {
    try {
        const { id } = req.params;

        const media = await queryOne('SELECT * FROM media_files WHERE id = ?', [id]);

        if (!media) {
            return res.status(404).json({ error: 'Media file not found' });
        }

        res.json({ media });

    } catch (error) {
        console.error('Get media error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete media file
router.delete('/:id', [authenticateToken, requireAdmin], async (req, res) => {
    try {
        const { id } = req.params;

        const media = await queryOne('SELECT * FROM media_files WHERE id = ?', [id]);
        if (!media) {
            return res.status(404).json({ error: 'Media file not found' });
        }

        // Check if media is used by any products
        const productUsage = await queryOne(
            'SELECT COUNT(*) as count FROM product_media WHERE media_id = ?',
            [id]
        );

        if (productUsage.count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete media file that is being used by products',
                usageCount: productUsage.count
            });
        }

        // Delete file from filesystem
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '../../../uploads', media.file_path);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from database
        await dbDelete('media_files', id);

        res.json({ message: 'Media file deleted successfully' });

    } catch (error) {
        console.error('Delete media error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
