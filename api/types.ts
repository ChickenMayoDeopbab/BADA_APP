export interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
  error: {
    code: string,
    message: string,
    details: {
      additionalProp1: string,
      additionalProp2: string,
      additionalProp3: string
    },
    timestamp: string
  }
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface Question {
  questionId: number,
  content: string,
  orderIndex: number
}

export interface Level {
  score: number,
  levelName: string,
  levelDescription: string,
  summary: string
}

export interface Answer {
  userId: number,
  sessionId: string,
  type: string,
  answers: number[]
}

export interface SignUpRequest {
  name: string;
  username: string;
  password: string;
  email: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface EmailRequest {
  email: string;
}

export interface EmailVerificationRequest {
  email: string;
  authNum: string;
}

export interface MyPageResponse {
  username: string;
  email: string;
}