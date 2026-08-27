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
export type ScenarioCategory = 'work' | 'daily' | 'school' | 'other';

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
  /** 커뮤니티에서 공유받아 복사한 커스텀 시나리오 */
  is_copied?: boolean;
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

// AI 서버 커뮤니티 API
export type CommunityReactionKind = "CHEER" | "RELATE" | "LIKE";

export interface CommunityAuthorInfo {
  user_id: number;
  name?: string | null;
  profile_image_url?: string | null;
}

export type CommunityAttachmentKind = "SCENARIO" | "TRAINING_RECORD";

export interface CommunityAttachmentRequest {
  kind: CommunityAttachmentKind;
  ref_id: number;
}

export interface CommunityAttachedScenario {
  title: string;
  content: string;
  category: string;
  is_available?: boolean;
  is_mine?: boolean;
}

export interface CommunityAttachedTrainingRecord {
  scenario_name?: string | null;
  session_type?: string | null;
  started_at?: string | null;
  duration_seconds?: number | null;
  anxiety_score?: number | null;
  audio_url?: string | null;
  audio_status?: string;
  is_available?: boolean;
}

export interface CommunityPostAttachment {
  kind: CommunityAttachmentKind;
  ref_id: number;
  scenario?: CommunityAttachedScenario | null;
  training_record?: CommunityAttachedTrainingRecord | null;
}

export interface CommunityScenarioCopyResponse {
  scenario_id: number;
  title: string;
  category: string;
  already_copied?: boolean;
}

export interface CommunityPostCreateRequest {
  /** 1자 이상 100자 이하 */
  title: string;
  /** 1자 이상 5,000자 이하 */
  content: string;
  /** 종류별 최대 1개 */
  attachments?: CommunityAttachmentRequest[];
}

export interface CommunityPostUpdateRequest {
  /** 값이 있으면 1자 이상 100자 이하 */
  title?: string | null;
  /** 값이 있으면 1자 이상 5,000자 이하 */
  content?: string | null;
}

export interface GetCommunityPostsParams {
  /** 1부터 시작 */
  page?: number;
  /** 1 이상 50 이하 */
  size?: number;
  /** 제목 또는 내용 검색어 */
  q?: string | null;
}

export type GetMyCommunityPostsParams = Omit<GetCommunityPostsParams, "q">;

export interface CommunityReactionCounts {
  cheer?: number;
  relate?: number;
  like?: number;
  total?: number;
}

export interface CommunityReactionRequest {
  kind: CommunityReactionKind;
}

export interface CommunityReactionStateResponse {
  post_id: number;
  reactions: CommunityReactionCounts;
  my_reaction?: CommunityReactionKind | null;
}

export interface CommunityPostSummary {
  post_id: number;
  title: string;
  content_preview: string;
  author: CommunityAuthorInfo;
  view_count: number;
  comment_count: number;
  reactions: CommunityReactionCounts;
  my_reaction?: CommunityReactionKind | null;
  attachment_kinds?: CommunityAttachmentKind[];
  created_at: string;
  updated_at: string;
}

export interface CommunityPostDetailResponse {
  post_id: number;
  title: string;
  content: string;
  author: CommunityAuthorInfo;
  view_count: number;
  comment_count?: number;
  reactions?: CommunityReactionCounts;
  my_reaction?: CommunityReactionKind | null;
  attachments?: CommunityPostAttachment[];
  created_at: string;
  updated_at: string;
}

export interface CommunityPostListResponse {
  posts: CommunityPostSummary[];
  page: number;
  size: number;
  total: number;
  has_next: boolean;
}

export interface CommunityCommentCreateRequest {
  /** 1자 이상 1,000자 이하 */
  content: string;
  /** 지정하면 최상위 댓글에 대한 답글로 등록 */
  parent_comment_id?: number | null;
}

export interface CommunityCommentUpdateRequest {
  /** 1자 이상 1,000자 이하 */
  content: string;
}

export interface CommunityCommentResponse {
  comment_id: number;
  parent_comment_id?: number | null;
  content: string;
  author: CommunityAuthorInfo;
  created_at: string;
  updated_at: string;
}

export interface CommunityCommentThread extends CommunityCommentResponse {
  replies?: CommunityCommentResponse[];
}

export interface CommunityCommentListResponse {
  comments: CommunityCommentThread[];
}
