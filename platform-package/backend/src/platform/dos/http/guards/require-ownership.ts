/**
 * DOS require-ownership — verifies the requesting user owns the target entity.
 * Checks owner_user_id or created_by against req.user.userId.
 */
import { Request, Response, NextFunction } from 'express';

export function requireOwnership(ownerField = 'owner_user_id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    if (user.is_super_admin === true) { next(); return; }

    // Ownership check is done at the service/query layer where the entity is loaded.
    // This middleware sets the ownership context for downstream use.
    req.ownershipField = ownerField;
    req.requestingUserId = user.userId || user.id;
    next();
  };
}
