import Top from "@/components/common/Top";
import { LegalDocumentSection } from "@/constants/legalDocuments";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface LegalDocumentScreenProps {
  title: string;
  sections?: LegalDocumentSection[];
  text?: string;
}

export default function LegalDocumentScreen({
  title,
  sections,
  text,
}: LegalDocumentScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background-normal">
      <Top title={title} back safeArea={false} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-8 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {text ? (
          <Text className="text-body leading-7 text-label-alternative">
            {text}
          </Text>
        ) : (
          sections?.map((section) => (
            <View key={section.title} className="gap-2">
              <Text className="text-headline2 font-bold text-label-normal">
                {section.title}
              </Text>
              <Text className="text-body leading-7 text-label-alternative">
                {section.body}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
