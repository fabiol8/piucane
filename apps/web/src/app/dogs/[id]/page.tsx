import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DogProfile from '@/components/dogs/DogProfile';

interface DogPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: DogPageProps): Promise<Metadata> {
  // In production, fetch dog data for metadata
  return {
    title: 'Profilo Cane - PiuCane',
    description: 'Gestisci il profilo completo del tuo cane'
  };
}

export default async function DogPage({ params }: DogPageProps) {
  // In production, validate dog ownership server-side
  const dogId = params.id;

  if (!dogId) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DogProfile dogId={dogId} />
    </div>
  );
}