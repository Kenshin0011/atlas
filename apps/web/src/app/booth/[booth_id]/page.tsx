/**
 * Booth Page
 * 特定のブースでの会話画面
 */

import { Assistant } from '@/features/components/Assistant';

type PageProps = {
  params: { booth_id: string };
};

export default async function BoothPage({ params }: PageProps) {
  const { booth_id } = await params;
  return <Assistant boothId={booth_id} />;
}
