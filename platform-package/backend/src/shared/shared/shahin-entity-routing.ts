/** Back-compat: ensure defaults are registered when this path is imported (e.g. tests). */
import { registerDefaultEntityRouting } from '../modules/platform/services/entity/entity-routing-bootstrap';

registerDefaultEntityRouting();

export {
  mergeEntityRoutingForAllTenantSchemas,
  mergeEntityRoutingFromTenantSchema,
  registerDefaultEntityRouting,
} from '../modules/platform/services/entity/entity-routing-bootstrap';
