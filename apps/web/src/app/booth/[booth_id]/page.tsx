/**
 * Booth Page
 * 特定のブースでの会話画面
 */

import { CtideAssistant } from '@/features/components/CtideAssistant';

type PageProps = {
  params: { booth_id: string };
};

export default function BoothPage({ params }: PageProps) {
  return <CtideAssistant boothId={params.booth_id} />;
}
