export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
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