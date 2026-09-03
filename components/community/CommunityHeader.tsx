import Top from "@/components/common/Top";
import { ReactNode } from "react";

interface CommunityHeaderProps {
  title: string;
  back?: boolean;
  right?: ReactNode;
  onBack?: () => void;
}

export default function CommunityHeader({
  title,
  back = true,
  right,
  onBack,
}: CommunityHeaderProps) {
  return <Top title={title} back={back} onBack={onBack} right={right} safeArea={false} />;
}
