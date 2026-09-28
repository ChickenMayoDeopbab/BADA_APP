import LegalDocumentScreen from "@/components/legal/LegalDocumentScreen";
import { PRIVACY_POLICY_SECTIONS } from "@/constants/legalDocuments";

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocumentScreen
      title="개인정보처리방침"
      sections={PRIVACY_POLICY_SECTIONS}
    />
  );
}
