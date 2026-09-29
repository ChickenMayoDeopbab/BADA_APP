import Top from "@/components/common/Top";
import {
  COMMUNITY_SAFETY_NOTICE,
  DEVELOPER_CONTACT_EMAIL,
} from "@/constants/legal";
import { SEMANTIC_COLORS } from "@/design-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Linking from "expo-linking";
import { ScrollView, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CommunityPolicyScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-normal">
      <Top title="커뮤니티 운영정책" back safeArea={false} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-8 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-3 rounded-component bg-fill-normal p-5">
          <View className="flex-row items-center gap-2">
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color={SEMANTIC_COLORS.primary.normal}
            />
            <Text className="text-headline1 font-bold text-label-normal">
              모두가 안전한 커뮤니티
            </Text>
          </View>
          <Text className="text-body leading-7 text-label-alternative">
            {COMMUNITY_SAFETY_NOTICE}
          </Text>
        </View>

        <View className="gap-2">
          <Text className="text-headline2 font-bold text-label-normal">
            신고 및 문의
          </Text>
          <Text className="text-body leading-6 text-label-alternative">
            부적절한 게시글이나 댓글은 해당 콘텐츠의 메뉴에서 신고해 주세요.
            서비스 이용 및 커뮤니티 운영정책에 관한 문의는 아래 이메일로 보내
            주세요.
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`개발자에게 이메일 보내기 ${DEVELOPER_CONTACT_EMAIL}`}
            className="mt-2 flex-row items-center gap-2 rounded-component border border-line-alternative px-4 py-4 active:bg-fill-pressed"
            onPress={() =>
              void Linking.openURL(`mailto:${DEVELOPER_CONTACT_EMAIL}`).catch(
                () => undefined,
              )
            }
          >
            <Ionicons
              name="mail-outline"
              size={22}
              color={SEMANTIC_COLORS.label.alternative}
            />
            <Text className="flex-1 text-body font-medium text-label-normal">
              {DEVELOPER_CONTACT_EMAIL}
            </Text>
            <Ionicons
              name="open-outline"
              size={19}
              color={SEMANTIC_COLORS.line.normal}
            />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
