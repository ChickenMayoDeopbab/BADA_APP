import LegalDocumentScreen from "@/components/legal/LegalDocumentScreen";
import { BIOSIGNAL_SECTIONS } from "@/constants/legalDocuments";

export default function BiosignalInformationScreen() {
  return (
    <LegalDocumentScreen
      title="생체신호 처리 동의"
      sections={BIOSIGNAL_SECTIONS}
    />
  );
}
