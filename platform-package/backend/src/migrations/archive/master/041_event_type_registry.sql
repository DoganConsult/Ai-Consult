-- Event type registry — enumerable event types per product
CREATE TABLE IF NOT EXISTS public.event_type_registry (
  event_type  VARCHAR(100) PRIMARY KEY,
  namespace   VARCHAR(50)  NOT NULL,
  event_name  VARCHAR(50)  NOT NULL,
  product_key VARCHAR(50)  REFERENCES public.platform_products(product_key),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_type_ns ON public.event_type_registry(namespace);
CREATE INDEX IF NOT EXISTS idx_event_type_product ON public.event_type_registry(product_key);
