import { Metadata } from "next";

export const metadata: Metadata = {
  title: "I Miei Cani - PiùCane",
  description: "Gestisci i profili dei tuoi cani e monitora la loro salute",
};

export default function DogsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">🐕 I Miei Cani</h1>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-gray-600">Gestisci i profili dei tuoi cani da questa sezione.</p>
        </div>
      </div>
    </div>
  );
}
