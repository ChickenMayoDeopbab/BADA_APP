import { getApiErrorMessage } from "@/api/error";
import { resolveProfileImage } from "@/utils/profileImage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

export function useProfileImage(s3Key?: string | null) {
  const [revision, setRevision] = useState(0);
  const requestKey = `${s3Key ?? ""}:${revision}`;
  const [state, setState] = useState({ key: requestKey, uri: "", error: "" });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setState({ key: requestKey, uri: "", error: "" });
      if (s3Key) {
        void resolveProfileImage(s3Key)
          .then((uri) => {
            if (active) setState({ key: requestKey, uri, error: "" });
          })
          .catch((error: unknown) => {
            if (!active) return;
            setState({
              key: requestKey,
              uri: "",
              error: getApiErrorMessage(
                error,
                error instanceof Error ? error.message : "사진을 불러오지 못했어요.",
              ),
            });
          });
      }
      return () => {
        active = false;
      };
    }, [s3Key, requestKey]),
  );

  return {
    uri: state.key === requestKey ? state.uri : "",
    error: state.key === requestKey ? state.error : "",
    retry: () => setRevision((value) => value + 1),
    onError: () => setState({
      key: requestKey,
      uri: "",
      error: "사진을 불러오지 못했어요. 다시 시도해주세요.",
    }),
  };
}
