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

export interface RefreshTokenRequest {
  refreshToken: string;
  userId: number;
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

export type OAuthProvider = 'google' | 'naver' | 'apple';

export interface OAuthCodeRequest {
  code: string;
}

export interface EmailRequest {
  email: string;
}

export interface EmailVerificationRequest {
  email: string;
  authNum: string;
}

export interface FindIdRequest {
  email: string;
}

export type FindIdResponse = string;

export interface CheckUsernameRequest {
  username: string;
}

export interface ChangePasswordRequest {
  email: string;
  oldPassword: string;
  newPassword: string;
}

export interface MyPageResponse {
  username: string;
  email: string;
  /** 백엔드 응답 버전에 따라 포함될 수 있는 계정 이름 */
  name?: string;
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

export interface ExampleTurn {
  speaker: string;
  text: string;
}

export interface ExampleConversationResponse {
  scenario_id: string;
  dialogue: ExampleTurn[];
  audio_url: string | null;
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
  is_warmup?: boolean;
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

export interface GetTrainingRecordsParams {
  page?: number;
  size?: number;
}

export interface SortObject {
  unsorted: boolean;
  sorted: boolean;
  empty: boolean;
}

export interface PageableObject {
  pageNumber: number;
  pageSize: number;
  paged: boolean;
  unpaged: boolean;
  offset: number;
  sort: SortObject;
}

export interface PageData<T> {
  totalElements: number;
  totalPages: number;
  pageable: PageableObject;
  numberOfElements: number;
  size: number;
  content: T[];
  number: number;
  sort: SortObject;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface TrainingRecordResponse {
  recordId: number;
  sessionId: string;
  trainedAt: string;
  scenarioName: string;
  sessionType: SpringSessionType;
  durationSeconds: number;
}

export type TrainingRecordItem = TrainingRecordResponse;
export type PageTrainingRecordResponse = PageData<TrainingRecordResponse>;
export type ApiResponsePageTrainingRecordResponse =
  ApiResponse<PageTrainingRecordResponse>;

export interface TranscriptTurn {
  role: string;
  text: string;
}

export interface PositiveFeedbackResponse {
  startSecond: number;
  endSecond: number;
  good_point: string;
  summary: string;
  audioUrl: string;
}

export type PositiveFeedback = PositiveFeedbackResponse;

export interface TrainingRecordDetailResponse {
  recordId: number;
  sessionId: string;
  trainedAt: string;
  scenarioId: number;
  scenarioName: string;
  sessionType: SpringSessionType;
  aiPersonality: SpringPersonality;
  durationSeconds: number;
  recordingUrl: string;
  anxietyScore: number;
  transcript: TranscriptTurn[];
  positiveFeedbacks: PositiveFeedbackResponse[];
}

export type ApiResponseTrainingRecordDetailResponse =
  ApiResponse<TrainingRecordDetailResponse>;

export interface RecordAnxietyScoreRequest {
  /** 0 이상 10 이하의 정수 */
  score: number;
}

export interface AnxietyScoreResponse {
  recordId: number;
  sessionId: string;
  anxietyScore: number;
}

export type ApiResponseAnxietyScoreResponse = ApiResponse<AnxietyScoreResponse>;

export interface GetFeedbackParams {
  scenarioId: number;
}

export type ApiVoidData = Record<string, never> | null;
export type ApiResponseVoid = ApiResponse<ApiVoidData>;

export interface GoodSegment {
  start: number;
  end: number;
  good_point: string;
}

export interface FeedbackResponse {
  sessionType: SpringSessionType;
  scenarioName: string;
  trainingTime: string;
  goodSegments: GoodSegment[];
  recordingUrl: string;
}
