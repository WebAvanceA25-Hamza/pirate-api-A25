export interface User {
  id: string;
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterUserRequest {
  username: string;
  password: string;
}

export interface LoginUserRequest {
  username: string;
  password: string;
}