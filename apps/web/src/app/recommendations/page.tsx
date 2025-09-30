import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Raccomandazioni AI - PiùCane",
  description: "Ricevi raccomandazioni personalizzate per il tuo cane basate su intelligenza artificiale",
};

export default function RecommendationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">🤖 Raccomandazioni AI</h1>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-gray-600">Scopri raccomandazioni personalizzate per il benessere del tuo cane.</p>
        </div>
      </div>
    </div>
  );
}
