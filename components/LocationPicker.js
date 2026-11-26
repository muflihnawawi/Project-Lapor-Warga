'use client';

import { useState } from 'react';
import { LocateFixed, MapPinned, Wand2 } from 'lucide-react';
import Map from '@/components/Map';
import { Spinner } from '@/components/ui';

/**
 * Pilih lokasi lewat GPS atau klik/geser penanda pada peta.
 * value: { latitude, longitude, address, region }
 */
export default function LocationPicker({ value, onChange, errors = {} }) {
  const [gpsState, setGpsState] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);
  const lat = value.latitude === '' ? null : Number(value.latitude);
  const lng = value.longitude === '' ? null : Number(value.longitude);

  const pick = (a, b) => onChange({ ...value, latitude: a.toFixed(7), longitude: b.toFixed(7) });

  const useGps = () => {
    if (!navigator.geolocation) {
      setGpsState('Perangkat tidak mendukung GPS. Silakan pilih titik pada peta.');
      return;
    }
    setGpsState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => { pick(pos.coords.latitude, pos.coords.longitude); setGpsState(''); },
      () => setGpsState('Izin lokasi ditolak atau tidak tersedia. Silakan klik titik lokasi pada peta.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  // Isi alamat otomatis dari titik peta (OpenStreetMap Nominatim) — opsional.
  const fillAddress = async () => {
    if (lat == null) return;
    setGeoBusy(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`);
      const j = await res.json();
      const a = j.address || {};
      onChange({
        ...value,
        address: (j.display_name || '').split(',').slice(0, 4).join(',').trim() || value.address,
        region: a.suburb || a.village || a.city_district || a.town || value.region,
      });
    } catch {
      /* abaikan, pengguna tetap dapat mengisi manual */
    }
    setGeoBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={useGps} className="btn-secondary" disabled={gpsState === 'loading'}>
          {gpsState === 'loading' ? <Spinner className="h-4 w-4" /> : <LocateFixed className="h-4 w-4" />} Gunakan lokasi saya (GPS)
        </button>
        <button type="button" onClick={fillAddress} className="btn-ghost" disabled={lat == null || geoBusy}>
          {geoBusy ? <Spinner className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />} Isi alamat dari peta
        </button>
      </div>
      {gpsState && gpsState !== 'loading' && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{gpsState}</p>
      )}
      <div className={`overflow-hidden rounded-2xl border ${errors.latitude ? 'border-rose-300' : 'border-slate-200'}`}>
        <Map lat={lat} lng={lng} onPick={pick} />
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <MapPinned className="h-4 w-4" />
        {lat != null ? `Titik: ${lat.toFixed(6)}, ${lng.toFixed(6)} — geser penanda untuk menyesuaikan.` : 'Klik pada peta untuk menandai lokasi kejadian.'}
      </p>
      {(errors.latitude || errors.longitude) && (
        <p className="text-xs font-medium text-rose-600">{(errors.latitude || errors.longitude)[0]}</p>
      )}
    </div>
  );
}
