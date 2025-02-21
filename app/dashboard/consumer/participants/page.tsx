"use client";

import { ParticipantsPage } from "@/components/admin/pages/consumer/participants";
import { withPermission } from '@/components/withPermission';

const ProtectedParticipantsPage = withPermission(ParticipantsPage);

export default function ConsumerParticipantsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Participants</h1>
      <ProtectedParticipantsPage />
    </>
  );
} 