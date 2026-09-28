import LegalDocumentScreen from "@/components/legal/LegalDocumentScreen";
import { SENSITIVE_INFORMATION_SECTIONS } from "@/constants/legalDocuments";

export default function SensitiveInformationScreen() {
  return (
    <LegalDocumentScreen
      title="민감정보 처리 동의"
      sections={SENSITIVE_INFORMATION_SECTIONS}
    />
  );
}
