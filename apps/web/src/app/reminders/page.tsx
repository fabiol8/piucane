import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Promemoria - PiùCane",
  description: "Gestisci i promemoria per la salute e il benessere del tuo cane",
};

export default function RemindersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">🔔 Promemoria</h1>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-gray-600">Imposta e gestisci i promemoria per il tuo cane.</p>
        </div>
      </div>
    </div>
  );
}
