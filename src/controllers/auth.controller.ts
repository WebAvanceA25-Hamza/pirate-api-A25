import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { LoginUserRequest, RegisterUserRequest } from "../types/user.types";

import { AppError } from "../errors/AppError";

const authService = new AuthService();

export class AuthController {
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).user) {
        return next(new AppError("You are already logged in", {
          statusCode: 403,
          code: "CANNOT_REGISTER_WHEN_LOGGED_IN",
          details: "You are already logged in. Please log out before registering"
        }))
      }
      const { username, password } = req.body as RegisterUserRequest;
      const token = await authService.registerUser({ username, password });

      res.status(200).json({ message: 'Register successful. You are now logged in.', token: token });
    } catch (error) {
      next(error);
    }
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body as LoginUserRequest;
      const token = await authService.loginUser({ username, password });

      res.status(200).json({ message: 'Login successful', token: token });
    } catch (error) {
      next(error);
    }
  }
  setAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username } = req.params;
      await authService.setAdmin(username);
      res.status(200).json({ message: `User ${username} is now an admin.` });
    } catch (error) {
      next(error);
    }
  }
  logout = async (req: Request, res: Response, next: NextFunction) => {

    return res.status(200).json({ message: "Logged out" });
  }

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(req as any).user) {
        return next(new AppError("You are not logged in", {
          statusCode: 401,
          code: "AUTH_REQUIRED",
          details: "You need to be logged in to access this resource."
        }))
      }

      const user = await authService.getUserByUsername((req as any).user.username);
      const response = {
        message: 'You are logged in', user: {
          id: user?.id,
          username: user?.username,
          createdAt: user?.createdAt,
          updatedAt: user?.updatedAt
        }
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}