import { AuthRepository } from "../repositories/auth.repository";
import { User, LoginUserRequest, RegisterUserRequest } from '../types/user.types'
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';
import { AppError } from "../errors/AppError";

const authRepository = new AuthRepository();

export class AuthService {

  async getUserById(id: string): Promise<User | null> {
    return authRepository.findById(id);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return authRepository.findByUsername(username);
  }
  async setAdmin (username: string): Promise<void>  {
    const user = await authRepository.findByUsername(username);
    if (!user) {
      throw new AppError("User not found", { statusCode: 404, code: "USER_NOT_FOUND", details: `No user found with username ${username}` });
    }
    await authRepository.updateUserRole(username);
  }
  async createUser(user: RegisterUserRequest): Promise<User> {
    if (user.username.length > 50) {
      throw new AppError("Invalid username length", { statusCode: 400, code: "VALIDATION_ERROR", details: "Username must be less than 50 characters long" });
    }
    if (!this.isValidPassword(user.password)) {
      throw new AppError("Invalid password", { statusCode: 400, code: "VALIDATION_ERROR", details: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number" });
    }
    if (await authRepository.findByUsername(user.username)) {
      throw new AppError("User already exists", { statusCode: 409, code: "VALIDATION_ERROR", details: "A user with this username already exists" });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(user.password, 10);
    const userToCreate = { username: user.username, passwordHash: passwordHash, id: userId };

    return authRepository.create(userToCreate);
  }

  async verifyLoginUser(loginCredentials: LoginUserRequest): Promise<User> {
    const user = await authRepository.findByUsername(loginCredentials.username);
    if (!user) {
      // Juste pour que ça ne paraisse pas lors de l'exécution si l'utilisateur n'existe pas
      const passwordHash = await bcrypt.hash("dsjkJSHAU3892eiuHUIE9", 10);
      throw new AppError("Invalid username or password", { statusCode: 401, code: "AUTH_INVALID_CREDENTIALS", details: "Invalid username or password" });
    } else {
      const passwordMatch = await bcrypt.compare(loginCredentials.password, user.passwordHash);
      if (!passwordMatch) {
        throw new AppError("Invalid username or password", { statusCode: 401, code: "AUTH_INVALID_CREDENTIALS", details: "Invalid username or password" });
      }
      return user;
    }
  }

  async registerUser(registerCredentials: RegisterUserRequest): Promise<string> {
    const user = await this.createUser(registerCredentials);
    return generateToken(user);
  }

  async loginUser(loginCredentials: LoginUserRequest): Promise<string> {

    const user = await this.verifyLoginUser(loginCredentials);
    return generateToken(user);
  }

  // ChatGPT, ça me tentait vraiment pas de faire du regex
  isValidPassword(password: string): boolean {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(password);
  }
}