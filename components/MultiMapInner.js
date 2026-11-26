'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';

export const STATUS_HEX = {
  submitted: '#94a3b8',
  under_review: '#f59e0b',
  verified: '#0ea5e9',
  in_progress: '#8b5cf6',
  resolved: '#10b981',
  rejected: '#f43f5e',
};

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView([points[0].latitude, points[0].longitude], 15);
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude])), { padding: [40, 40], maxZoom: 16 });
  }, [points, map]);
  return null;
}

/** Peta dengan banyak titik laporan, diwarnai sesuai status. */
export default function MultiMapInner({ points, height = 420, renderPopup }) {
  return (
    <MapContainer center={[-2.5, 118]} zoom={5} style={{ height, width: '100%' }} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p) => (
        <CircleMarker key={p.report_number} center={[p.latitude, p.longitude]} radius={9}
          pathOptions={{ color: '#fff', weight: 2, fillColor: STATUS_HEX[p.status], fillOpacity: 0.95 }}>
          {renderPopup && <Popup>{renderPopup(p)}</Popup>}
        </CircleMarker>
      ))}
      <FitBounds points={points} />
    </MapContainer>
  );
}
