
-- Super Admin: ALL permissions on ALL modules
INSERT INTO role_permissions (role_id, module, operation)
SELECT '89b2afd7-eaa9-47e9-8376-c484aea65e46', m, o
FROM unnest(ARRAY['dashboard','page_management','database_management','drivers','clients','orders','delivery','zones','pricing','reports','settings','notifications','permissions_management']) AS m,
     unnest(ARRAY['view','create','edit','delete','approve','export','manage']) AS o
ON CONFLICT DO NOTHING;

-- Admin: ALL permissions on ALL modules
INSERT INTO role_permissions (role_id, module, operation)
SELECT '14461190-20ee-41fe-9569-bc2a2d5ff7e0', m, o
FROM unnest(ARRAY['dashboard','page_management','database_management','drivers','clients','orders','delivery','zones','pricing','reports','settings','notifications','permissions_management']) AS m,
     unnest(ARRAY['view','create','edit','delete','approve','export','manage']) AS o
ON CONFLICT DO NOTHING;

-- Operations Manager: view/create/edit/approve/export on operational modules
INSERT INTO role_permissions (role_id, module, operation)
SELECT '24ad14fd-715e-4819-800f-066d2bdf4470', m, o
FROM unnest(ARRAY['dashboard','drivers','clients','orders','delivery','zones','reports','notifications']) AS m,
     unnest(ARRAY['view','create','edit','approve','export']) AS o
ON CONFLICT DO NOTHING;

-- Call Center Agent: view/create/edit on operational modules
INSERT INTO role_permissions (role_id, module, operation)
SELECT 'bb3a3657-c184-4d74-bed2-c0d2bc9a3dfc', m, o
FROM unnest(ARRAY['dashboard','drivers','clients','orders','delivery']) AS m,
     unnest(ARRAY['view','create','edit']) AS o
ON CONFLICT DO NOTHING;

-- Accountant: view/export on financial modules
INSERT INTO role_permissions (role_id, module, operation)
SELECT '5034db7b-c4ab-47f3-8dfc-a7a2494ab8c6', m, o
FROM unnest(ARRAY['dashboard','orders','delivery','reports','pricing']) AS m,
     unnest(ARRAY['view','export']) AS o
ON CONFLICT DO NOTHING;

-- Page Manager: all on page_management, view on dashboard
INSERT INTO role_permissions (role_id, module, operation)
SELECT 'a6e8ad7d-d7b5-4aa9-a19a-810f16f3316f', m, o
FROM unnest(ARRAY['page_management']) AS m,
     unnest(ARRAY['view','create','edit','delete','manage']) AS o
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, module, operation)
VALUES ('a6e8ad7d-d7b5-4aa9-a19a-810f16f3316f', 'dashboard', 'view')
ON CONFLICT DO NOTHING;

-- Database Manager: all on database_management, view on dashboard
INSERT INTO role_permissions (role_id, module, operation)
SELECT 'f3d7d74a-2e8f-45f9-b1ea-b815f79b5cb9', m, o
FROM unnest(ARRAY['database_management']) AS m,
     unnest(ARRAY['view','create','edit','delete','manage']) AS o
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, module, operation)
VALUES ('f3d7d74a-2e8f-45f9-b1ea-b815f79b5cb9', 'dashboard', 'view')
ON CONFLICT DO NOTHING;

-- Viewer: view only on all modules
INSERT INTO role_permissions (role_id, module, operation)
SELECT '3851dc8b-2974-4c2a-9e57-893b266be7cc', m, 'view'
FROM unnest(ARRAY['dashboard','page_management','database_management','drivers','clients','orders','delivery','zones','pricing','reports','settings','notifications']) AS m
ON CONFLICT DO NOTHING;
