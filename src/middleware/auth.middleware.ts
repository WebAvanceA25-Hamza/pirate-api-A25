import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../errors/AppError';



// ChatGPT pour l'idée de mettre l'utilisateur dans la requête et de next() l'erreur plutôt que throw.
// Je connaissais déjà pour le reste.
export function authenticate(req: Request, _res: Response, next: NextFunction) {

  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return next(new AppError("Unauthorized", { statusCode: 401, code: "AUTH_REQUIRED", details: "You need to be logged in to access this resource." }));
  }

  const token = authHeader.split(' ')[1];

  try {
    (req as any).user = verifyToken(token);
    return next();
  } catch (error) {

    return next(new AppError("Unauthorized", { statusCode: 401, code: "AUTH_REQUIRED", details: "Invalid or expired login token. Please log in and try again." }));
  }
}
export function authenticateAdmin(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return next(new AppError("Unauthorized", { statusCode: 401, code: "AUTH_REQUIRED", details: "You need to be logged in to access this resource." }));
  }
  const token = authHeader.split(' ')[1];
  try {
    (req as any).user = verifyToken(token);
    if ((req as any).user.isAdmin !== true) return next(new AppError("Forbidden, no access to ressource", { statusCode: 403, code: "FORBIDDEN", details: "You do not have permission to access this resource." }));
    return next();
  } catch (error) {

    return next(new AppError("Unauthorized", { statusCode: 401, code: "AUTH_REQUIRED", details: "Invalid or expired login token. Please log in and try again." }));
  }
}