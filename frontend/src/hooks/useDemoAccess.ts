'use client';

import { useEffect, useState } from 'react';
import { hasWorkspaceAccess, hasApiKey } from '@/lib/api';

export function useDemoAccess(): boolean {
  const [available, setAvailable] = useState(hasApiKey);
  useEffect(() => { setAvailable(hasWorkspaceAccess()); }, []);
  return available;
}
