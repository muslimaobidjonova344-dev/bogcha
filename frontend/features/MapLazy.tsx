'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/ui';

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> });
export default function MapLazy(props: { points: any[]; height?: string; onSelect?: (p: any) => void }) { return <LeafletMap {...props} />; }
