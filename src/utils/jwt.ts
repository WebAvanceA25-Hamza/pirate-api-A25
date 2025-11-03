import {User} from "../types/user.types";
import jwt from 'jsonwebtoken';

// ChatGPT juste pour savoir comment importer jwt et l'utiliser
export const generateToken = (user: User) : string => {
  const payload = {username: user.username, isAdmin: user.isAdmin};
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  const options = {expiresIn: 3600};

  return jwt.sign(payload, secret, options);
}

export function verifyToken(token: string) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.verify(token, secret);
}