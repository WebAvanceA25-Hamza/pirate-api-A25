import { Request, Response, NextFunction } from 'express';
import { AppError } from "../errors/AppError"; // the class we defined

// Handler adapté avec l'aide de ChatGPT

// Il handle maintenant toutes les sortes d'erreur.

export const errorHandler = (error: unknown, req: Request, res: Response, next: NextFunction) => {
  // Obtenir les informations de l'erreur
  const isAppError = error instanceof AppError;

  const statusCode = isAppError ? error.statusCode : 500;
  const code = isAppError ? error.code : 'INTERNAL_ERROR';
  const message = isAppError ? error.message : 'Internal Server Error';
  const details = isAppError ? error.details : undefined;

  // Log de l'erreur sur le serveur
  console.error(`[${code}}] ${message}`);
  if (error instanceof Error) {
    console.error(error.stack);
    if((error as any).cause) console.error("Cause:", (error as any).cause);
  }

  // Préparation sur JSON pour la réponse HTTP
  const payload: any = { error: { code, message } };
  if (details) payload.error.details = details;

  // Partie 2 de la préparation si en dev
  if (process.env.NODE_ENV === 'development' && error instanceof Error) {
    payload.error.stack = error.stack;
    if((error as any).cause) payload.error.cause = (error as any).cause;
  }

  // Envoi de la réponse HTTP
  res.status(statusCode).json(payload);
};