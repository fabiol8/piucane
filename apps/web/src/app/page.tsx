import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'PiuCane - Il benessere del tuo cane',
  description: 'Cibo personalizzato, integratori e consulenza veterinaria per il tuo cane'
};

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="bg-gradient-to-r from-brand-primary to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Il benessere del tuo cane
            </h1>
            <p className="mt-6 text-xl leading-8 text-orange-100">
              Cibo personalizzato, integratori naturali e consulenza veterinaria per una vita più sana e felice
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/onboarding"
                className="btn-primary text-lg px-8 py-3"
                data-cta-id="home.hero.onboarding.click"
              >
                Inizia ora
              </Link>
              <Link
                href="/prodotti"
                className="text-lg font-semibold leading-6 text-white hover:text-orange-100"
                data-cta-id="home.hero.products.click"
              >
                Scopri i prodotti <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Tutto quello che serve al tuo cane
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Un ecosistema completo per la salute, l'alimentazione e il benessere del tuo migliore amico
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  🍽️ Alimentazione personalizzata
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Piani alimentari studiati su misura per età, taglia, condizioni di salute e stile di vita del tuo cane
                  </p>
                </dd>
              </div>

              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  🩺 Consulenza veterinaria
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Chat diretta con veterinari qualificati per consigli, monitoraggio salute e emergenze
                  </p>
                </dd>
              </div>

              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  🎯 Missioni e gamification
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Obiettivi quotidiani, badge e premi per rendere divertente la cura del tuo cane
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </main>
  );
}