export interface UserRegistrationRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface UserLoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber?: string;
  addressType?: string;
  fullAddress?: string;
  city?: string;
  state?: string;
  role: string;
}

// Alias for backward compatibility across UI components
export type User = UserResponse;

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
