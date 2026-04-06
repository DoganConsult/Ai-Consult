/**
 * Access Contract Routes
 *
 * Exposes frontend access contract endpoints for navigation gating,
 * permission checks, and incremental cache invalidation.
 *
 * Law 2: DAuth owns access contract serialization.
 * Law 4: Frontend may render or cache truth but not define it.
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '..';
import { asyncHandler } from '../../dos/http/error-handling/async-handler';
import {
  buildFrontendAccessContract,
  getMinimalAccessContract,
  getNavigationContract,
  getPermissionContract,
  getContractVersion,
  diffAccessContract,
  type FrontendAccessContract,
} from '..';

const router: Router = Router();

/** GET /access-contract — full frontend access contract */
router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const contract = await buildFrontendAccessContract(user.userId, user.tenantId);
  res.json(contract);
}));

/** GET /access-contract/minimal — permissions and modules only */
router.get('/minimal', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const contract = await getMinimalAccessContract(user.userId, user.tenantId);
  res.json(contract);
}));

/** GET /access-contract/nav — navigation-specific subset */
router.get('/nav', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const contract = await getNavigationContract(user.userId, user.tenantId);
  res.json(contract);
}));

/** GET /access-contract/perms — permission-only subset */
router.get('/perms', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const contract = await getPermissionContract(user.userId, user.tenantId);
  res.json(contract);
}));

/** GET /access-contract/version — contract version hash for staleness polling */
router.get('/version', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const version = await getContractVersion(user.userId, user.tenantId);
  res.json(version);
}));

/** POST /access-contract/diff — diff previous contract against current state */
router.post('/diff', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const previous = req.body as FrontendAccessContract;

  if (!previous || !previous.version) {
    res.status(400).json({ error: 'Request body must contain a valid previous FrontendAccessContract' });
    return;
  }

  const current = await buildFrontendAccessContract(user.userId, user.tenantId);
  const diff = diffAccessContract(previous, current);
  res.json(diff);
}));

export default router;
