import PartyDetailClient from "./PartyDetailClient";

export default function PartyDetailPage({
  params,
}: {
  params: { partyId: string };
}) {
  return <PartyDetailClient partyId={params.partyId} />;
}
