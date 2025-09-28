import { Metadata } from 'next';
import AIChat from '@/components/ai/AIChat';

export const metadata: Metadata = {
  title: 'Chat con Esperti - PiuCane',
  description: 'Chatta con i nostri esperti AI: Veterinario, Educatore Cinofilo e Groomer'
};

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AIChat />
    </div>
  );
}