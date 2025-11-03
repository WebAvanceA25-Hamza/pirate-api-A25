import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
//import { AppError } from '../errors/AppError';



// ChatGPT ici encore
// C'est un entre-deux entre aucun middleware et l'authentification.
// Il va mettre le user dans la requête si le token est là, mais ne va pas empêcher de continuer
// sans être connecté.
export function authLookup(req: Request, _res: Response, next: NextFunction) {

  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();
  const token = authHeader.split(' ')[1];

  try {
    (req as any).user = verifyToken(token);
  } catch (error) {

  }
  next();
}