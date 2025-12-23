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
// Use persistent volume subdirectory in production, local uploads in development
// Must match the path used in server.js
const uploadsDir = process.env.NODE_ENV === 'production' 
    ? '/data/uploads' 
    : path.join(__dirname, '../uploads');
const imagesDir = path.join(uploadsDir, 'images');
const documentsDir = path.join(uploadsDir, 'documents');

// Ensure upload directories exist with error handling
[uploadsDir, imagesDir, documentsDir].forEach(dir => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created upload directory: ${dir}`);
        }
    } catch (error) {
        console.error(`❌ Failed to create directory ${dir}:`, error);
        throw new Error(`Cannot create upload directory: ${dir}. Check permissions.`);
    }
});

console.log('📁 Upload directories configured:');
console.log('  - Uploads:', uploadsDir);
console.log('  - Images:', imagesDir);
console.log('  - Documents:', documentsDir);

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

        // Process image if it's an image (optional - skip if Sharp fails)
        let processedFilePath = file.path;
        if (fileType === 'image') {
            try {
                // Check if Sharp is available and file is readable
                if (!fs.existsSync(file.path)) {
                    throw new Error('Uploaded file not found');
                }

                const processedFileName = `processed-${path.basename(file.filename)}`;
                const processedPath = path.join(path.dirname(file.path), processedFileName);
                
                // Get image format
                const image = sharp(file.path);
                const metadata = await image.metadata();
                const format = metadata.format;
                
                // Resize and optimize image based on format
                let sharpPipeline = image.resize(1200, 1200, { 
                    fit: 'inside',
                    withoutEnlargement: true
                });
                
                // Apply format-specific optimization
                if (format === 'jpeg' || format === 'jpg') {
                    sharpPipeline = sharpPipeline.jpeg({ quality: 85 });
                } else if (format === 'png') {
                    sharpPipeline = sharpPipeline.png({ quality: 85 });
                } else if (format === 'webp') {
                    sharpPipeline = sharpPipeline.webp({ quality: 85 });
                } else {
                    // For other formats, convert to JPEG
                    sharpPipeline = sharpPipeline.jpeg({ quality: 85 });
                }
                
                await sharpPipeline.toFile(processedPath);

                // Verify processed file exists before removing original
                if (fs.existsSync(processedPath)) {
                    // Remove original file
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                    processedFilePath = processedPath;
                    file.filename = processedFileName;
                    console.log('✅ Image processed successfully:', processedPath);
                } else {
                    console.warn('⚠️  Processed file not created, using original');
                }
            } catch (error) {
                console.error('❌ Image processing error:', error.message);
                console.error('❌ Error details:', {
                    filePath: file.path,
                    fileExists: fs.existsSync(file.path),
                    error: error.message
                });
                // Continue with original file if processing fails
                // This is not a fatal error - we can still use the original file
                console.log('ℹ️  Using original file without processing');
            }
        }

        // Save to database
        // Calculate relative path - handle both absolute and relative paths
        let relativePath;
        if (path.isAbsolute(processedFilePath)) {
            relativePath = path.relative(uploadsDir, processedFilePath);
        } else {
            relativePath = processedFilePath;
        }
        
        // Normalize path separators for cross-platform compatibility
        relativePath = relativePath.replace(/\\/g, '/');
        
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

        // Construct URL - ensure it starts with /
        const fileUrl = relativePath.startsWith('/') 
            ? `/uploads${relativePath}` 
            : `/uploads/${relativePath}`;

        res.json({
            message: 'File uploaded successfully',
            media: {
                id: result.id,
                ...mediaData,
                url: fileUrl
            }
        });

    } catch (error) {
        console.error('❌ Upload error:', error);
        console.error('❌ Upload error message:', error.message);
        console.error('❌ Upload error stack:', error.stack);
        console.error('❌ Upload context:', {
            hasFile: !!req.file,
            fileName: req.file?.originalname,
            filePath: req.file?.path,
            uploadsDir,
            imagesDir,
            documentsDir
        });
        
        res.status(500).json({ 
            error: 'Upload failed',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? {
                stack: error.stack,
                uploadsDir,
                imagesDir,
                documentsDir,
                filePath: req.file?.path
            } : 'Check server logs for details'
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
