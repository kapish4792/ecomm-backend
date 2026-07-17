SELECT 
  t.table_name,
  COUNT(c.column_name) as column_count
FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE t.table_schema = 'public'
GROUP BY t.table_name
ORDER BY t.table_name;

SELECT enumlabel AS status_value
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'OrderStatus'
ORDER BY enumlabel;
