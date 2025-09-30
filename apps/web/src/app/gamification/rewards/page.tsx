import { Metadata } from 'next';
import RewardCenter from '@/components/gamification/RewardCenter';

export const metadata: Metadata = {
  title: 'Centro Premi - PiùCane',
  description: 'Riscatta i tuoi premi guadagnati: sconti, oggetti gratuiti e contenuti esclusivi',
};

export default function RewardsPage() {
  const userId = 'demo-user-123';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🎁 Centro Premi</h1>
          <p className="text-gray-600 mt-2">
            Riscatta i premi che hai guadagnato completando missioni e raggiungendo traguardi!
          </p>
        </div>

        <RewardCenter userId={userId} />
      </div>
    </div>
  );
}