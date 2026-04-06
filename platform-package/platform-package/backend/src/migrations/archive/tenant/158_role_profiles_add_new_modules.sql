-- Migration 158: Add incidents, bcp, vendors, training modules to role_profiles
-- Ensures new sidebar navigation groups are visible for all existing tenants.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'role_profiles') THEN

    UPDATE role_profiles
    SET modules = (
      SELECT jsonb_agg(DISTINCT m)
      FROM (
        SELECT jsonb_array_elements_text(
          CASE WHEN jsonb_typeof(modules) = 'array' THEN modules ELSE '[]'::jsonb END
        ) AS m
        UNION
        SELECT unnest(ARRAY['incidents', 'bcp', 'vendors', 'training'])
      ) sub(m)
    )
    WHERE jsonb_typeof(modules) = 'array'
      AND NOT (
        modules ? 'incidents'
        AND modules ? 'bcp'
        AND modules ? 'vendors'
        AND modules ? 'training'
      );

  END IF;
END $$;
