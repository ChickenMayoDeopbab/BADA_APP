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

export type Personality = 'kind' | 'neutral' | 'tough' | 'rude';
export type Difficulty = 'high' | 'medium' | 'low';
export type ScenarioCategory = 'restaurant' | 'hospital' | 'complaint' | 'delivery' | 'bank' | 'custom';
export type SessionType = 'warmup' | 'training';

export interface ScenarioInfo {
  scenario_id: number;
  title: string;
  content: string;
  category: ScenarioCategory;
  difficulties: Difficulty[];
  personalities: Personality[];
  scenario_image: string | null;
  tts_voice_id: string | null;
  ai_prompt: string;
  is_custom: boolean;
}

export interface ScenarioListResponse {
  scenarios: ScenarioInfo[];
}

export interface CreateSessionRequest {
  scenario_id: number;
  session_type?: SessionType;
  personality?: Personality;
  difficulty?: Difficulty;
}

export interface CreateSessionResponse {
  session_id: number;
  scenario_id: number;
  session_type: SessionType;
  personality: Personality;
  difficulty: Difficulty;
  ai_prompt: string;
  tts_voice_id: string | null;
  created_at: string;
  message: string;
}

export interface CustomSessionRequest {
  call_target: string;
  call_purpose: string;
  personality?: Personality;
  difficulty?: Difficulty;
}

export interface GenerateDetailScenario {
  scenario_id: number;
  title: string;
  content: string;
  ai_prompt: string;
  tts_voice_id: string | null;
}

export interface CustomSessionResponse {
  session_id: number;
  scenario: GenerateDetailScenario;
  personality: Personality;
  difficulty: Difficulty;
  created_at: string;
  message: string;
}