/**
 * Booth Page
 * 特定のブースでの会話画面
 */

import { Assistant } from '@/features/components/Assistant';

type PageProps = {
  params: { booth_id: string };
};

export default function BoothPage({ params }: PageProps) {
  return <Assistant boothId={params.booth_id} />;
}
