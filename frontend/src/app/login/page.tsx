import type { Metadata } from 'next';
import { LoginScreen } from '@/components/auth/LoginScreen';

export const metadata: Metadata = {
  title: 'Masuk — DinusNexus',
  description: 'Masuk ke workspace Unified AI Digital Campus Worker.',
};

export default function LoginPage() { return <LoginScreen />; }
