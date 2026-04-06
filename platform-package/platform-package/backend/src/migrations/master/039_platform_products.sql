-- Platform product registry (multi-product architecture)
CREATE TABLE IF NOT EXISTS public.platform_products (
  product_key   VARCHAR(50)  PRIMARY KEY,
  name_en       VARCHAR(200) NOT NULL,
  name_ar       VARCHAR(200),
  version       VARCHAR(20)  NOT NULL DEFAULT '1.0.0',
  enabled       BOOLEAN      NOT NULL DEFAULT true,
  manifest      JSONB        NOT NULL DEFAULT '{}',
  registered_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
