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

export type DiagnosisType = "LANDING" | "SIGNUP";

export interface DiagnosisSubmitRequest {
  sessionId: string;
  type: DiagnosisType;
  answers: number[];
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

export interface OAuthTokenResponse extends LoginResponse {
  isNewUser: boolean;
}

export interface LegalConsentStatus {
  termsOfServiceAgreed: boolean;
  termsOfServiceAgreedAt: string | null;
  privacyPolicyAcknowledged: boolean;
  privacyPolicyAcknowledgedAt: string | null;
  sensitiveInformationAgreed: boolean;
  sensitiveInformationAgreedAt: string | null;
  sensitiveInformationWithdrawnAt: string | null;
  profileImageAgreed: boolean;
  profileImageAgreedAt: string | null;
  profileImageWithdrawnAt: string | null;
  biosignalAgreed: boolean; // 워치 생체신호 처리 동의 여부
  biosignalAgreedAt: string | null;
  biosignalWithdrawnAt: string | null;
  legalActionRequired: boolean;
}

export interface AcceptLegalConsentRequest {
  termsOfServiceAgreed: true;
  privacyPolicyAcknowledged: true;
  sensitiveInformationAgreed: boolean;
  profileImageAgreed: boolean;
  biosignalAgreed?: boolean; // true만 저장, false·생략은 기존 상태 유지 (철회는 DELETE로만)
}

export type OptionalLegalConsents = Pick<
  AcceptLegalConsentRequest,
  "sensitiveInformationAgreed" | "profileImageAgreed" | "biosignalAgreed"
>;

export type OAuthProvider = 'google' | 'naver' | 'apple';

export interface OAuthCodeRequest {
  code: string;
}

export interface EmailRequest {
  email: string;
}

export type EmailVerificationType = "SIGNUP" | "FIND_ID" | "RESET_PASSWORD";

export interface EmailSendRequest extends EmailRequest {
  type: EmailVerificationType;
}

export interface EmailVerificationRequest {
  email: string;
  authNum: string;
  type: EmailVerificationType;
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
  name: string;
  s3Key?: string | null;
  level?:
    | "LEVEL_1"
    | "LEVEL_2"
    | "LEVEL_3"
    | "LEVEL_4"
    | "LEVEL_5"
    | null;
  levelName?: string | null;
  diagnosisDate?: string | null;
  score?: number | null;
  trainCount?: number | null;
  attendance?: number | null;
}

export interface UpdateMyPageRequest {
  name: string;
  username: string;
  s3Key?: string | null;
}

export interface FileUploadResponse {
  fileId: number;
  title: string;
  s3Key: string;
  url: string;
}

export interface FileUrlResponse {
  url: string;
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
  /** 서버가 집계한 실제 훈련 횟수 */
  practice_count?: number;
}

export interface ScenarioListResponse {
  scenarios: ScenarioInfo[];
}

export interface ScenarioRecommendationResponse {
  scenario: ScenarioInfo;
  reason: 'CUSTOM_NOT_PRACTICED' | 'NOT_PRACTICED' | 'LONGEST_ABSENT';
  category_icon_url?: string | null;
}

export interface ExampleTurn {
  speaker: "ai" | "user";
  text: string;
}

export interface ExampleConversationResponse {
  scenario_id: number;
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

export interface CreateTrainingCallScheduleRequest {
  scenarioId: number;
  type: SpringSessionType;
  aiPersonality: SpringPersonality;
  minDelayMinutes: number;
  maxDelayMinutes: number;
  maxDurationSeconds?: number;
}

export interface TrainingCallScheduleResponse {
  scheduleId: number;
  scheduledAt?: string;
  status: "SCHEDULED" | "RINGING" | "ACCEPTED" | "CANCELED";
  sessionId?: string;
  wsUrl?: string;
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
  /** 서버 기본값은 "other" */
  category?: ScenarioCategory;
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

export type NotificationFilter = "ALL" | "UNREAD";

export interface GetNotificationsParams {
  filter?: NotificationFilter;
  page?: number;
  size?: number;
}

export interface InAppNotificationResponse {
  notificationId: number;
  type: string;
  title: string;
  message: string;
  actorUserId: number | null;
  actorName: string | null;
  actorProfileImage: string | null;
  postId: number | null;
  commentId: number | null;
  scheduleId: number | null;
  read: boolean;
  createdAt: string;
}

export interface InAppNotificationListResponse {
  notifications: PageData<InAppNotificationResponse>;
  unreadCount: number;
}

export type ApiResponseInAppNotificationListResponse =
  ApiResponse<InAppNotificationListResponse>;

export type ApiResponseInAppNotificationResponse =
  ApiResponse<InAppNotificationResponse>;

export type PushDevicePlatform = "ANDROID" | "IOS";

export interface RegisterPushDeviceRequest {
  installationId: string;
  token: string;
  platform: PushDevicePlatform;
}

export interface NotificationSettingResponse {
  allEnabled: boolean;
  communityEnabled: boolean;
  trainingEnabled: boolean;
}

export type UpdateNotificationSettingRequest = NotificationSettingResponse;
export type ApiResponseNotificationSettingResponse =
  ApiResponse<NotificationSettingResponse>;

export interface TrainingRecordResponse {
  recordId: number;
  sessionId: string;
  trainedAt: string;
  scenarioName: string;
  sessionType: SpringSessionType;
  durationSeconds: number;
  scenarioImage?: string | null;
  categoryIconUrl?: string | null;
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
  title?: string | null;
  content?: string | null;
  good_point?: string | null;
  summary?: string | null;
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
  scoreApplied?: boolean;
  scoreExclusionReason?: string | null;
  performanceScore?: number;
  performanceRiskScore?: number;
  subjectiveAnxietyScore?: number;
  trainingStateIndex?: number;
  scoreBefore?: number;
  scoreAfter?: number;
  scoreSequence?: number;
  scoringVersion?: string;
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
  title?: string | null;
  content?: string | null;
  good_point?: string | null;
}

export interface FeedbackResponse {
  sessionType: SpringSessionType;
  scenarioName: string;
  trainingTime: string;
  goodSegments: GoodSegment[];
  recordingUrl: string;
  transcript?: TranscriptTurn[];
}

// AI 서버 커뮤니티 API
export type CommunityReactionKind = "CHEER" | "RELATE" | "LIKE";

export type CommunityReportReason =
  | "ABUSE"
  | "SEXUAL"
  | "HATE"
  | "VIOLENCE"
  | "SPAM"
  | "PRIVACY"
  | "OTHER";

export interface CommunityReportRequest {
  reason: CommunityReportReason;
}

export interface CommunityReportResponse {
  report_id: number;
  target_type: "POST" | "COMMENT";
  target_id: number;
  reason: CommunityReportReason;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  created_at: string;
  due_at: string;
}

export interface CommunityAuthorInfo {
  user_id: number;
  name?: string | null;
  profile_image_url?: string | null;
}

export interface CommunityBlockedUserResponse {
  user_id: number;
  name?: string | null;
  profile_image_url?: string | null;
  blocked_at: string;
}

export interface CommunityBlockedUserListResponse {
  blocked_users: CommunityBlockedUserResponse[];
}

export type CommunityAttachmentKind = "FILE" | "SCENARIO" | "TRAINING_RECORD";

export interface CommunityAttachmentRequest {
  kind: CommunityAttachmentKind;
  ref_id: number;
}

export interface CommunityAttachedScenario {
  title: string;
  content: string;
  category: string;
  scenario_image?: string | null;
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

export interface CommunityAttachedFile {
  title?: string | null;
  url?: string | null;
  is_available?: boolean;
}

export interface CommunityPostAttachment {
  kind: CommunityAttachmentKind;
  ref_id: number;
  scenario?: CommunityAttachedScenario | null;
  training_record?: CommunityAttachedTrainingRecord | null;
  file?: CommunityAttachedFile | null;
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
  /** 값이 있으면 종류별 최대 1개 */
  attachments?: CommunityAttachmentRequest[] | null;
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

/** 폰 시계 epoch ms 구간 [시작, 끝] */
export type PhoneTimeRange = [number, number];

/** 생체신호 행 [워치 ms, 값, status]. 가속도는 [워치 ms, 크기 평균 g, 크기 표준편차 g] */
export type BiosignalRow = [number, number, number];

export interface BiosignalPpgBatch {
  t0: number; // 첫 표본의 워치 ms
  hz: number;
  green: number[];
}

export interface BiosignalDevice {
  model: string; // 64자 이하
  sdk: string; // 32자 이하
}

/** 통화 생체신호 업로드 본문. 정의되지 않은 필드를 넣으면 서버가 422로 거절한다. */
export interface BiosignalUploadRequest {
  v: 1;
  source: "samsung_sensor_sdk";
  device: BiosignalDevice | null;
  clock: {
    phone_ws_open_ms: number; // 통화 WS에 auth를 보낸 시각
    phone_call_end_ms: number; // 통화가 끝난 시각
    watch_minus_phone_ms: number; // 워치 시각 − 폰 시각
  };
  markers: {
    ringing_ms: number; // 수신 화면이 뜬 시각
    rest_baseline: PhoneTimeRange | null; // 2분 이상 휴식 구간
    meditation: PhoneTimeRange | null;
    recovery_end_ms: number; // 측정을 멈춘 시각
  };
  hr: BiosignalRow[];
  ibi: BiosignalRow[];
  eda: BiosignalRow[];
  skin_temp: BiosignalRow[];
  acc: BiosignalRow[];
  ppg: BiosignalPpgBatch[];
}

export type BiosignalReportStatus = "AWAITING_DATA" | "ANALYZED" | "EXPIRED" | "REJECTED";

/** 기준선 출처. none이면 다음 측정 통화 전에 휴식 화면을 띄운다. */
export type BiosignalBaselineSource = "rest" | "previous_sessions" | "none";

/** 지표마다 붙는 측정 상태. MEASURED일 때만 화면에 쓰고, 나머지는 그 요소를 조용히 숨긴다. */
export type BiosignalMetricStatus = "MEASURED" | "INSUFFICIENT_DATA" | "UNAVAILABLE";

/** 심박 곡선 구간의 단계. baseline은 휴식, anticipation은 벨이 울린 뒤 받기 전 */
export type BiosignalPhase = "baseline" | "anticipation" | "listen" | "speak" | "recovery";

/** 턴별 몸 반응(심박)과 목소리 흔들림을 묶은 칸 */
export type BiosignalQuadrant =
  | "body_high_voice_steady"
  | "body_high_voice_shaky"
  | "body_low_voice_steady"
  | "body_low_voice_shaky";

export interface BiosignalValueMetric {
  status: BiosignalMetricStatus;
  value?: number | null;
}

/** 리포트 심박 곡선. 휴식(없으면 벨)부터 회복 끝까지 bin_sec 간격 중앙값 */
export interface BiosignalReportTimeline {
  bin_sec: number;
  start_sec: number; // 첫 구간 시작. 통화 시작 기준 초라 보통 음수
  hr: (number | null)[]; // bpm. null은 품질이 낮아 비운 구간이라 선을 끊는다
  phase: (BiosignalPhase | null)[];
}

/** 생체신호 분석 결과(업로드 성공 응답·조회 응답). metrics는 화면에서 쓰는 필드만 적는다. */
export interface BiosignalReportResponse {
  session_id: string;
  status: BiosignalReportStatus;
  source?: string;
  analyzed_at?: string;
  metrics?: {
    cardiac?: {
      baseline?: BiosignalValueMetric & {
        source: BiosignalBaselineSource; // value는 bpm
      };
      hr?: {
        call_delta?: BiosignalValueMetric; // 통화 중 평균 − 기준선(bpm)
        peak?: {
          status: BiosignalMetricStatus;
          bpm?: number | null;
          delta?: number | null; // 기준선 대비. 기준선이 없으면 null
          at_sec?: number | null; // 통화 시작 기준 초
          phase?: "listen" | "speak" | null;
          turn?: number | null;
        };
        recovery_pct?: BiosignalValueMetric; // 끊고 60초 안에 기준선 쪽으로 돌아온 비율(%)
      };
      report_timeline?: BiosignalReportTimeline;
    };
    fusion?: {
      praise_turn?: number | null; // 몸은 반응했지만 목소리가 안정적이었던 턴
      turns?: { turn: number; quadrant: BiosignalQuadrant | null }[];
    };
  };
}
