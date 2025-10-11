-- Migration to reorder categories
-- New order: 1. Trygghet og fallsikring, 2. Alarm knapp og varsling, 3. Medisinsk oppfølging, 4. Cameras, 5. Communication

UPDATE categories SET sort_order = 1 WHERE slug = 'trygghet-og-fallsikring';
UPDATE categories SET sort_order = 2 WHERE slug = 'alarm-knapp-og-varsling';
UPDATE categories SET sort_order = 3 WHERE slug = 'medisinsk-oppfolging';
UPDATE categories SET sort_order = 4 WHERE slug = 'cameras';
UPDATE categories SET sort_order = 5 WHERE slug = 'communication';
