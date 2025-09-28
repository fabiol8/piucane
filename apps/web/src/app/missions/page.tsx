import { Metadata } from 'next';
import MissionsHub from '@/components/missions/MissionsHub';

export const metadata: Metadata = {
  title: 'Missioni - PiuCane',
  description: 'Completa missioni, guadagna XP e sblocca ricompense per il tuo cane'
};

export default function MissionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MissionsHub />
    </div>
  );
}