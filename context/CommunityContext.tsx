import {
  COMMUNITY_AUTHOR,
  COMMUNITY_POSTS,
} from "@/constants/community";
import type {
  CommunityAttachment,
  CommunityDraft,
  CommunityPost,
} from "@/types/community";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const EMPTY_DRAFT: CommunityDraft = {
  title: "",
  body: "",
  attachments: [],
};

interface CommunityContextValue {
  posts: CommunityPost[];
  draft: CommunityDraft;
  updateDraft: (patch: Partial<CommunityDraft>) => void;
  addDraftAttachment: (attachment: CommunityAttachment) => void;
  removeDraftAttachment: (id: string) => void;
  resetDraft: () => void;
  publishDraft: () => CommunityPost | null;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

export function CommunityProvider({ children }: PropsWithChildren) {
  const [posts, setPosts] = useState<CommunityPost[]>(COMMUNITY_POSTS);
  const [draft, setDraft] = useState<CommunityDraft>(EMPTY_DRAFT);

  const updateDraft = useCallback((patch: Partial<CommunityDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const addDraftAttachment = useCallback(
    (attachment: CommunityAttachment) => {
      setDraft((current) => {
        const withoutSameType = current.attachments.filter(
          (item) => item.type !== attachment.type,
        );
        return {
          ...current,
          attachments: [...withoutSameType, attachment],
        };
      });
    },
    [],
  );

  const removeDraftAttachment = useCallback((id: string) => {
    setDraft((current) => ({
      ...current,
      attachments: current.attachments.filter((item) => item.id !== id),
    }));
  }, []);

  const resetDraft = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const publishDraft = useCallback(() => {
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title || !body) return null;

    const post: CommunityPost = {
      id: `post-local-${Date.now()}`,
      author: COMMUNITY_AUTHOR,
      title,
      body,
      createdAt: "방금 전",
      viewCount: 0,
      mine: true,
      reactions: { cheer: 0, empathy: 0, like: 0 },
      comments: [],
      attachments: draft.attachments,
    };

    setPosts((current) => [post, ...current]);
    setDraft(EMPTY_DRAFT);
    return post;
  }, [draft]);

  const value = useMemo(
    () => ({
      posts,
      draft,
      updateDraft,
      addDraftAttachment,
      removeDraftAttachment,
      resetDraft,
      publishDraft,
    }),
    [
      addDraftAttachment,
      draft,
      posts,
      publishDraft,
      removeDraftAttachment,
      resetDraft,
      updateDraft,
    ],
  );

  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  );
}

export function useCommunity() {
  const value = useContext(CommunityContext);
  if (!value) {
    throw new Error("useCommunity must be used inside CommunityProvider");
  }
  return value;
}
