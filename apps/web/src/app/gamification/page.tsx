import { Metadata } from 'next';
import GamificationDashboard from '@/components/gamification/GamificationDashboard';

export const metadata: Metadata = {
  title: 'Gamification - PiùCane',
  description: 'Dashboard gamification con XP, livelli, badge e premi per il tuo cane',
};

export default function GamificationPage() {
  // In production, get userId from auth
  const userId = 'demo-user-123';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🎮 Gamification Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Monitora i tuoi progressi, completa missioni e guadagna premi fantastici!
          </p>
        </div>

        <GamificationDashboard userId={userId} />
      </div>
    </div>
  );
}