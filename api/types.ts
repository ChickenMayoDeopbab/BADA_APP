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

// Spring 서버 전용 타입 (대문자 enum, neutral → NORMAL)
export type SpringSessionType = 'SCENARIO' | 'CUSTOM' | 'WARMUP';
export type SpringPersonality = 'KIND' | 'NORMAL' | 'TOUGH' | 'RUDE';

export interface ScenarioInfo {
  scenario_id: number;
  title: string;
  content: string;
  category: ScenarioCategory;
  difficulties: Difficulty[];
  personalities: SpringPersonality[];
  scenario_image: string | null;
  tts_voice_id: string | null;
  ai_prompt: string;
  is_custom: boolean;
}

export interface ScenarioListResponse {
  scenarios: ScenarioInfo[];
}

// Spring POST /api/v1/session
export interface CreateSessionRequest {
  scenarioId?: number;
  type: SpringSessionType;
  aiPersonality?: SpringPersonality;
  difficulty?: Difficulty;
  maxDurationSeconds?: number;
}

export interface CreateSessionResponse {
  sessionId: string;
  wsUrl: string;
}

export interface ScriptTurnContext {
  step: number;
  aiGoal: string;
  hint?: string;
}

// AI 서버 POST /api/v1/scenario/custom
export interface CustomSessionRequest {
  title: string;
  call_target: string;
  call_purpose: string;
  personality?: SpringPersonality;
  difficulty?: Difficulty;
}

export interface GenerateDetailScenario {
  scenario_id: number;
  title: string;
  content: string;
  ai_prompt: string;
  tts_voice_id: string | null;
  script: ScriptTurnContext[];
}

// POST /api/v1/scenario/custom (AI 서버) 응답
export interface CustomScenarioResponse {
  scenario: GenerateDetailScenario;
  created_at: string;
  message: string;
}