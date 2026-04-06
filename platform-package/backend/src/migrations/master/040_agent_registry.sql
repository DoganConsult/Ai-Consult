-- Agent registry — DB-backed agent definitions per product
CREATE TABLE IF NOT EXISTS public.agent_registry (
  agent_id          VARCHAR(10)  PRIMARY KEY,
  product_key       VARCHAR(50)  NOT NULL REFERENCES public.platform_products(product_key),
  name_en           VARCHAR(200) NOT NULL,
  name_ar           VARCHAR(200),
  domain_en         VARCHAR(100),
  domain_ar         VARCHAR(100),
  icon              VARCHAR(50),
  color             VARCHAR(20),
  route_patterns    TEXT[]       DEFAULT '{}',
  delegation_scope  VARCHAR(50),
  quick_prompts     JSONB        DEFAULT '[]',
  enabled           BOOLEAN      NOT NULL DEFAULT true,
  sort_order        INTEGER      NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_registry_product ON public.agent_registry(product_key);
