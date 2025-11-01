import { ErrorBoundary } from '@/components/ErrorBoundary';
import React from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
