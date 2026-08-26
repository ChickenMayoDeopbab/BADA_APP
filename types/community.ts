import type { ImageSourcePropType } from "react-native";

export type CommunityReactionKey = "cheer" | "empathy" | "like";

export type CommunityReactions = Record<CommunityReactionKey, number>;

export interface CommunityAuthor {
  id: string;
  handle: string;
}

export interface CommunityReply {
  id: string;
  author: CommunityAuthor;
  body: string;
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  author: CommunityAuthor;
  body: string;
  createdAt: string;
  replies: CommunityReply[];
}

export interface CommunityScenarioAttachment {
  id: string;
  type: "scenario";
  title: string;
  trainingCount: number;
  image: ImageSourcePropType;
}

export interface CommunityRecordAttachment {
  id: string;
  type: "record";
  title: string;
  date: string;
  time: string;
  duration: string;
  feedbackCount: number;
  emoji: string;
}

export interface CommunityFileAttachment {
  id: string;
  type: "file";
  name: string;
}

export type CommunityAttachment =
  | CommunityScenarioAttachment
  | CommunityRecordAttachment
  | CommunityFileAttachment;

export interface CommunityPost {
  id: string;
  author: CommunityAuthor;
  title: string;
  body: string;
  createdAt: string;
  viewCount: number;
  mine: boolean;
  reactions: CommunityReactions;
  comments: CommunityComment[];
  attachments: CommunityAttachment[];
}

export interface CommunityDraft {
  title: string;
  body: string;
  attachments: CommunityAttachment[];
}
