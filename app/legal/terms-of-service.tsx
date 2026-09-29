import LegalDocumentScreen from "@/components/legal/LegalDocumentScreen";
import { TERMS_OF_SERVICE_SECTIONS } from "@/constants/legalDocuments";

export default function TermsOfServiceScreen() {
  return (
    <LegalDocumentScreen
      title="서비스 이용약관"
      sections={TERMS_OF_SERVICE_SECTIONS}
    />
  );
}
