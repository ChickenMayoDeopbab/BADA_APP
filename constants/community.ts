import type {
  CommunityAuthor,
  CommunityFileAttachment,
  CommunityPost,
  CommunityRecordAttachment,
  CommunityScenarioAttachment,
} from "@/types/community";

export const COMMUNITY_AUTHOR: CommunityAuthor = {
  id: "user-b2ong222",
  handle: "@b2ong222",
};

export const COMMUNITY_RECENT_SEARCHES = [
  "극복",
  "콜포비아",
  "시나리오",
  "배준하피자",
  "배놈",
  "배파이더맨",
];

export const COMMUNITY_SCENARIOS: CommunityScenarioAttachment[] = [
  {
    id: "scenario-venom",
    type: "scenario",
    title: "배놈",
    trainingCount: 5,
    image: require("@/assets/Q3_l.png"),
  },
  {
    id: "scenario-batman",
    type: "scenario",
    title: "배놈 비슷한 배트맨",
    trainingCount: 3,
    image: require("@/assets/Q2_l.png"),
  },
];

export const COMMUNITY_TRAINING_RECORDS: CommunityRecordAttachment[] = [
  {
    id: "record-pizza",
    type: "record",
    title: "피자 주문하기",
    date: "2026-08-12",
    time: "오후 01:22",
    duration: "3분 12초",
    feedbackCount: 3,
    emoji: "🍕",
  },
  {
    id: "record-hospital",
    type: "record",
    title: "병원 예약하기",
    date: "2026-08-12",
    time: "오후 02:15",
    duration: "2분 3초",
    feedbackCount: 4,
    emoji: "🏥",
  },
  {
    id: "record-delivery",
    type: "record",
    title: "배달 문의하기",
    date: "2026-08-12",
    time: "오후 02:31",
    duration: "4분 22초",
    feedbackCount: 6,
    emoji: "🛵",
  },
];

export const COMMUNITY_DUMMY_FILE: CommunityFileAttachment = {
  id: "file-bada-png",
  type: "file",
  name: "bada.png",
};

const POST_BODY = `솔직히 콜포비아? 별거 아니더라
나도 처음엔 전화 걸고 한마디도 못했는데
바다 접하고 나서 시나리오 훈련 좀 해보니깐 바로 효과 보는 것 같음ㅇㅇ

나는 특히 커스텀 시나리오 기능으로 내가 평소에 많이 접하는 상황을 연습해보니깐 확실히 실제 통화 할 때 떨리는게 많이 줄었음

만약에 본인이 콜포비아 진짜 심하다?
그럼 무조건 시나리오 훈련 반복해봐라ㅇㅇ`;

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "post-1",
    author: COMMUNITY_AUTHOR,
    title: "콜포비아 1년 만에 극복한 썰 푼다",
    body: POST_BODY,
    createdAt: "3시간 전",
    viewCount: 31,
    mine: true,
    reactions: { cheer: 3, empathy: 8, like: 2 },
    comments: [
      {
        id: "comment-1",
        author: COMMUNITY_AUTHOR,
        body: "혹시 광고인가요?",
        createdAt: "3분 전",
        replies: [
          {
            id: "reply-1",
            author: COMMUNITY_AUTHOR,
            body: "그런 것 같습니다",
            createdAt: "1분 전",
          },
        ],
      },
    ],
    attachments: [COMMUNITY_TRAINING_RECORDS[0], COMMUNITY_SCENARIOS[1]],
  },
  {
    id: "post-2",
    author: COMMUNITY_AUTHOR,
    title: "전화 너무 두려운데 어떡하죠...?",
    body: "전화가 오기만 해도 긴장돼요. 작은 방법부터 같이 공유해요.",
    createdAt: "3시간 전",
    viewCount: 31,
    mine: false,
    reactions: { cheer: 3, empathy: 8, like: 2 },
    comments: [
      {
        id: "comment-2",
        author: COMMUNITY_AUTHOR,
        body: "짧은 통화부터 연습해보세요!",
        createdAt: "12분 전",
        replies: [],
      },
    ],
    attachments: [],
  },
  {
    id: "post-3",
    author: COMMUNITY_AUTHOR,
    title: "요즘 전화를 못 받겠음;",
    body: "벨소리만 울려도 머리가 하얘지는데 다들 어떻게 연습하시나요?",
    createdAt: "3시간 전",
    viewCount: 31,
    mine: false,
    reactions: { cheer: 3, empathy: 8, like: 2 },
    comments: [
      {
        id: "comment-3",
        author: COMMUNITY_AUTHOR,
        body: "바다 시나리오 훈련이 도움 됐어요.",
        createdAt: "20분 전",
        replies: [],
      },
    ],
    attachments: [],
  },
  {
    id: "post-4",
    author: COMMUNITY_AUTHOR,
    title: "전화 잘 하는 법 찾음",
    body: "통화 전에 할 말을 세 줄만 적어두니까 훨씬 편해졌어요.",
    createdAt: "3시간 전",
    viewCount: 31,
    mine: true,
    reactions: { cheer: 3, empathy: 8, like: 2 },
    comments: [
      {
        id: "comment-4",
        author: COMMUNITY_AUTHOR,
        body: "저도 해봐야겠네요.",
        createdAt: "35분 전",
        replies: [],
      },
    ],
    attachments: [],
  },
  {
    id: "post-5",
    author: COMMUNITY_AUTHOR,
    title: "솔직히 바다 개좋은듯",
    body: "연습할수록 긴장이 줄어드는 게 느껴져서 꾸준히 쓰는 중입니다.",
    createdAt: "1일 전",
    viewCount: 121,
    mine: true,
    reactions: { cheer: 50, empathy: 1, like: 23 },
    comments: Array.from({ length: 11 }, (_, index) => ({
      id: `comment-sample-${index}`,
      author: COMMUNITY_AUTHOR,
      body: "공감합니다!",
      createdAt: "1일 전",
      replies: [],
    })),
    attachments: [],
  },
];
