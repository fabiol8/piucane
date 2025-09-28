import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dashboard - PiuCane Admin'
};

export default function AdminDashboard() {
  return (
    <div className="flex h-screen">
      <aside className="admin-sidebar">
        <div className="p-6">
          <h1 className="text-white text-xl font-bold">PiuCane Admin</h1>
        </div>
        <nav className="mt-6">
          <div className="px-3">
            <ul className="space-y-1">
              <li>
                <Link href="/dashboard" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                  📊 Dashboard
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                  🛍️ Prodotti
                </Link>
              </li>
              <li>
                <Link href="/orders" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                  📦 Ordini
                </Link>
              </li>
              <li>
                <Link href="/subscriptions" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                  🔄 Abbonamenti
                </Link>
              </li>
              <li>
                <Link href="/customers" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                  👥 Clienti
                </Link>
              </li>
              <li>
                <Link href="/cms" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                  📝 CMS
                </Link>
              </li>
              <li>
                <Link href="/messaging" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                  💬 Messaggi
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                  📈 Analytics
                </Link>
              </li>
              <li>
                <Link href="/settings" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                  ⚙️ Impostazioni
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <main className="admin-main">
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-600">Panoramica generale del sistema PiuCane</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="admin-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    👥
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Utenti Attivi</p>
                  <p className="text-2xl font-semibold text-gray-900">1,234</p>
                </div>
              </div>
            </div>

            <div className="admin-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    📦
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Ordini Oggi</p>
                  <p className="text-2xl font-semibold text-gray-900">89</p>
                </div>
              </div>
            </div>

            <div className="admin-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                    🔄
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Abbonamenti</p>
                  <p className="text-2xl font-semibold text-gray-900">567</p>
                </div>
              </div>
            </div>

            <div className="admin-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                    💰
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Fatturato Mese</p>
                  <p className="text-2xl font-semibold text-gray-900">€12.4k</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}