import LegalDocumentScreen from "@/components/legal/LegalDocumentScreen";
import { PRIVACY_POLICY_TEXT } from "@/constants/privacyPolicyText";

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocumentScreen
      title="개인정보처리방침"
      text={PRIVACY_POLICY_TEXT}
    />
  );
}
