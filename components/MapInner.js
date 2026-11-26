'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';

const pin = L.divIcon({ className: '', html: '<div class="lw-pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30] });

function ClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], Math.max(map.getZoom(), 16));
  }, [lat, lng, map]);
  return null;
}

export default function MapInner({ lat, lng, onPick, height = 320, zoom = 16 }) {
  const has = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
  const center = has ? [lat, lng] : [-2.5, 118]; // tengah Indonesia
  return (
    <MapContainer center={center} zoom={has ? zoom : 5} style={{ height, width: '100%' }} scrollWheelZoom={!!onPick}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {has && (
        <Marker
          position={[lat, lng]}
          icon={pin}
          draggable={!!onPick}
          eventHandlers={onPick ? { dragend: (e) => { const p = e.target.getLatLng(); onPick(p.lat, p.lng); } } : undefined}
        />
      )}
      {onPick && <ClickHandler onPick={onPick} />}
      {has && <Recenter lat={lat} lng={lng} />}
    </MapContainer>
  );
}
