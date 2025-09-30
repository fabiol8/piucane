import { Metadata } from "next";
import { AccountSettings } from '@/components/account';

export const metadata: Metadata = {
  title: "Account - PiùCane",
  description: "Gestisci il tuo profilo utente e le impostazioni dell'account",
};

export default function AccountPage() {
  const userId = 'demo-user-123';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">👤 Il Mio Account</h1>
          <p className="text-gray-600">
            Gestisci il tuo profilo, le impostazioni della privacy e le preferenze di notifica.
          </p>
        </div>

        <AccountSettings userId={userId} />
      </div>
    </div>
  );
}