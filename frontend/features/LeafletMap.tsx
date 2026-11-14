'use client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';

const pin = (color: string) => L.divIcon({ className: '', iconSize: [30, 38], iconAnchor: [15, 38],
  html: `<svg width="30" height="38" viewBox="0 0 30 38"><path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 23 15 23s15-12 15-23C30 6.7 23.3 0 15 0z" fill="${color}"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>` });

function Fit({ points }: { points: any[] }) {
  const map = useMap();
  useEffect(() => { if (points.length) map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 14 }); }, [points.length]); // eslint-disable-line
  return null;
}

export default function LeafletMap({ points, onSelect, me, height = '60vh' }: { points: any[]; onSelect?: (p: any) => void; me?: [number, number] | null; height?: string }) {
  const tiles = process.env.NEXT_PUBLIC_MAP_TILES || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  return (
    <MapContainer center={[41.311, 69.279]} zoom={11} style={{ height, width: '100%' }} scrollWheelZoom>
      <TileLayer url={tiles} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      <Fit points={points} />
      {points.filter((p) => p.lat != null).map((p) => <Marker key={p.id} position={[p.lat, p.lng]} icon={pin('#245C43')} eventHandlers={{ click: () => onSelect?.(p) }} />)}
      {me && <Marker position={me} icon={pin('#E9C768')} />}
    </MapContainer>
  );
}
