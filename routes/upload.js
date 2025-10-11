import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { insert } from '../database/init.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '../../../uploads');
const imagesDir = path.join(uploadsDir, 'images');
const documentsDir = path.join(uploadsDir, 'documents');

[uploadsDir, imagesDir, documentsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, imagesDir);
        } else {
            cb(null, documentsDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed types: images (JPEG, PNG, GIF, WebP), PDF, Word documents'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Upload single file
router.post('/single', [
    authenticateToken,
    requireAdmin,
    upload.single('file')
], async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.file;
        const { alt_text } = req.body;

        // Determine file type
        let fileType = 'document';
        if (file.mimetype.startsWith('image/')) {
            fileType = 'image';
        }

        // Process image if it's an image
        let processedFilePath = file.path;
        if (fileType === 'image') {
            try {
                const processedFileName = `processed-${path.basename(file.filename)}`;
                const processedPath = path.join(path.dirname(file.path), processedFileName);
                
                // Resize and optimize image
                await sharp(file.path)
                    .resize(1200, 1200, { 
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .jpeg({ quality: 85 })
                    .png({ quality: 85 })
                    .toFile(processedPath);

                // Remove original file
                fs.unlinkSync(file.path);
                processedFilePath = processedPath;
                file.filename = processedFileName;
            } catch (error) {
                console.error('Image processing error:', error);
                // Continue with original file if processing fails
            }
        }

        // Save to database
        const relativePath = path.relative(uploadsDir, processedFilePath);
        const mediaData = {
            filename: file.filename,
            original_name: file.originalname,
            file_path: relativePath,
            file_size: file.size,
            mime_type: file.mimetype,
            file_type: fileType,
            alt_text: alt_text || file.originalname
        };

        const result = await insert('media_files', mediaData);

        res.json({
            message: 'File uploaded successfully',
            media: {
                id: result.id,
                ...mediaData,
                url: `/uploads/${relativePath}`
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Upload failed',
            message: error.message
        });
    }
});

// Upload multiple files
router.post('/multiple', [
    authenticateToken,
    requireAdmin,
    upload.array('files', 10) // Max 10 files
], async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedFiles = [];

        for (const file of req.files) {
            try {
                // Determine file type
                let fileType = 'document';
                if (file.mimetype.startsWith('image/')) {
                    fileType = 'image';
                }

                // Process image if it's an image
                let processedFilePath = file.path;
                if (fileType === 'image') {
                    try {
                        const processedFileName = `processed-${path.basename(file.filename)}`;
                        const processedPath = path.join(path.dirname(file.path), processedFileName);
                        
                        await sharp(file.path)
                            .resize(1200, 1200, { 
                                fit: 'inside',
                                withoutEnlargement: true
                            })
                            .jpeg({ quality: 85 })
                            .png({ quality: 85 })
                            .toFile(processedPath);

                        fs.unlinkSync(file.path);
                        processedFilePath = processedPath;
                        file.filename = processedFileName;
                    } catch (error) {
                        console.error('Image processing error:', error);
                    }
                }

                // Save to database
                const relativePath = path.relative(uploadsDir, processedFilePath);
                const mediaData = {
                    filename: file.filename,
                    original_name: file.originalname,
                    file_path: relativePath,
                    file_size: file.size,
                    mime_type: file.mimetype,
                    file_type: fileType,
                    alt_text: file.originalname
                };

                const result = await insert('media_files', mediaData);

                uploadedFiles.push({
                    id: result.id,
                    ...mediaData,
                    url: `/uploads/${relativePath}`
                });

            } catch (error) {
                console.error(`Error processing file ${file.originalname}:`, error);
                // Continue with other files
            }
        }

        res.json({
            message: `${uploadedFiles.length} files uploaded successfully`,
            media: uploadedFiles
        });

    } catch (error) {
        console.error('Multiple upload error:', error);
        res.status(500).json({ 
            error: 'Upload failed',
            message: error.message
        });
    }
});

export default router;
