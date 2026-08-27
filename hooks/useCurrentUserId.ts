import { getAccessToken } from "@/utils/authTokenStorage";
import { useQuery } from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";

interface AccessTokenClaims {
  sub?: string;
}

export const useCurrentUserId = () =>
  useQuery({
    queryKey: ["auth", "currentUserId"],
    queryFn: async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) return null;

      try {
        const { sub } = jwtDecode<AccessTokenClaims>(accessToken);
        const userId = Number(sub);
        return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
      } catch {
        return null;
      }
    },
  });
