import express from 'express';
import { body, validationResult } from 'express-validator';
import { query, queryOne, insert, update } from '../database/init.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all settings
router.get('/', [authenticateToken, requireAdmin], async (req, res) => {
    try {
        const settings = await query('SELECT * FROM settings ORDER BY setting_key ASC');
        
        // Convert to key-value object
        const settingsObj = {};
        settings.forEach(setting => {
            let value = setting.setting_value;
            
            // Parse based on type
            switch (setting.setting_type) {
                case 'number':
                    value = parseFloat(value);
                    break;
                case 'boolean':
                    value = value === 'true';
                    break;
                case 'json':
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        value = value;
                    }
                    break;
                default:
                    value = value;
            }
            
            settingsObj[setting.setting_key] = {
                value,
                type: setting.setting_type,
                description: setting.description
            };
        });

        res.json({ settings: settingsObj });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single setting
router.get('/:key', [authenticateToken, requireAdmin], async (req, res) => {
    try {
        const { key } = req.params;

        const setting = await queryOne(
            'SELECT * FROM settings WHERE setting_key = ?',
            [key]
        );

        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        let value = setting.setting_value;
        
        // Parse based on type
        switch (setting.setting_type) {
            case 'number':
                value = parseFloat(value);
                break;
            case 'boolean':
                value = value === 'true';
                break;
            case 'json':
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    value = value;
                }
                break;
        }

        res.json({ 
            setting: {
                key: setting.setting_key,
                value,
                type: setting.setting_type,
                description: setting.description
            }
        });

    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update setting
router.put('/:key', [
    authenticateToken,
    requireAdmin,
    body('value').notEmpty().withMessage('Value is required')
], async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const existingSetting = await queryOne(
            'SELECT * FROM settings WHERE setting_key = ?',
            [key]
        );

        let settingValue = value;
        let settingType = 'string';

        // Determine type and convert value
        if (typeof value === 'number') {
            settingType = 'number';
        } else if (typeof value === 'boolean') {
            settingType = 'boolean';
            settingValue = value.toString();
        } else if (typeof value === 'object') {
            settingType = 'json';
            settingValue = JSON.stringify(value);
        }

        if (existingSetting) {
            // Update existing setting
            await update('settings', existingSetting.id, {
                setting_value: settingValue,
                setting_type: settingType
            });
        } else {
            // Create new setting
            await insert('settings', {
                setting_key: key,
                setting_value: settingValue,
                setting_type: settingType,
                description: 'Custom setting'
            });
        }

        res.json({ 
            message: 'Setting updated successfully',
            setting: {
                key,
                value,
                type: settingType
            }
        });

    } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update multiple settings
router.put('/', [
    authenticateToken,
    requireAdmin,
    body('settings').isObject().withMessage('Settings object is required')
], async (req, res) => {
    try {
        const { settings } = req.body;
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const results = [];

        for (const [key, value] of Object.entries(settings)) {
            try {
                const existingSetting = await queryOne(
                    'SELECT * FROM settings WHERE setting_key = ?',
                    [key]
                );

                let settingValue = value;
                let settingType = 'string';

                // Determine type and convert value
                if (typeof value === 'number') {
                    settingType = 'number';
                } else if (typeof value === 'boolean') {
                    settingType = 'boolean';
                    settingValue = value.toString();
                } else if (typeof value === 'object') {
                    settingType = 'json';
                    settingValue = JSON.stringify(value);
                }

                if (existingSetting) {
                    await update('settings', existingSetting.id, {
                        setting_value: settingValue,
                        setting_type: settingType
                    });
                } else {
                    await insert('settings', {
                        setting_key: key,
                        setting_value: settingValue,
                        setting_type: settingType,
                        description: 'Custom setting'
                    });
                }

                results.push({ key, success: true });

            } catch (error) {
                console.error(`Error updating setting ${key}:`, error);
                results.push({ key, success: false, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        res.json({
            message: `${successCount} settings updated successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
            results
        });

    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
