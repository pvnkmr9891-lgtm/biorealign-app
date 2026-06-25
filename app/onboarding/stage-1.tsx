import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Stage1() {
  const router = useRouter();
  useEffect(() => { router.replace('/onboarding/assessment' as any); }, []);
  return null;
}
