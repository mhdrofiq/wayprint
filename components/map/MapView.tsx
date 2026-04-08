'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useState, useEffect, useRef } from 'react';
import { Map, Popup } from '@vis.gl/react-maplibre';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import type { Pin, Image, ScreenPos } from '@/types';
import { useAdminSession } from '@/hooks/useAdminSession';
import { toast } from 'sonner';
import { layers } from '@/lib/layers';
import PinMarker from './PinMarker';
import PhotoBurstSwitch from '@/components/burst/PhotoBurstSwitch';
import AdminSheet from '@/components/admin/AdminSheet';

export default function MapView() {
  const { session, signOut } = useAdminSession();

  const [pins, setPins] = useState<Pin[]>([]);
  const [pinsLoading, setPinsLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [selectedPinScreenPos, setSelectedPinScreenPos] = useState<ScreenPos | null>(null);
  const [selectedPinImages, setSelectedPinImages] = useState<Image[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [hoveredPin, setHoveredPin] = useState<Pin | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sheetExpandRequest, setSheetExpandRequest] = useState(0);

  // Cache of pin images keyed by pin id — populated on hover so data is
  // ready by the time the user clicks.
  const imageCache = useRef<Record<string, Image[]>>({});

  // Load all pins on mount
  useEffect(() => {
    setPinsLoading(true);
    fetch('/api/pins')
      .then((res) => res.json())
      .then((data) => setPins(data))
      .catch(() => toast.error('Failed to load pins'))
      .finally(() => setPinsLoading(false));
  }, []);

  // Load images whenever a pin is selected, using the cache if available.
  useEffect(() => {
    if (!selectedPin) {
      setSelectedPinImages([]);
      setImagesLoading(false);
      return;
    }
    const cached = imageCache.current[selectedPin.id];
    if (cached) {
      setSelectedPinImages(cached);
      setImagesLoading(false);
      return;
    }
    setImagesLoading(true);
    fetch(`/api/pins/${selectedPin.id}/images`)
      .then((res) => res.json())
      .then((data: Image[]) => {
        imageCache.current[selectedPin.id] = data;
        setSelectedPinImages(data);
      })
      .catch(() => toast.error('Failed to load photos'))
      .finally(() => setImagesLoading(false));
  }, [selectedPin]);

  function handlePinClick(pin: Pin, screenPos: ScreenPos) {
    setHoveredPin(null);
    if (isEditMode) {
      // Edit mode: open pin in sheet, no burst
      setSelectedPin(pin);
      setSelectedPinScreenPos(null);
    } else {
      // View mode: trigger burst
      setSelectedPin(pin);
      setSelectedPinScreenPos(screenPos);
    }
  }

  function handleClose() {
    setSelectedPin(null);
    setSelectedPinScreenPos(null);
  }

  async function handleMapClick(e: MapLayerMouseEvent) {
    if (isEditMode && !selectedPin && session) {
      const { lng, lat } = e.lngLat;
      const res = await fetch('/api/pins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ label: 'New Pin', lat, lng }),
      });
      if (res.ok) {
        const pin: Pin = await res.json();
        setPins((prev) => [...prev, pin]);
        setSelectedPin(pin);
        setSelectedPinScreenPos(null);
      } else {
        toast.error('Failed to create pin');
      }
    } else {
      handleClose();
    }
  }

  const burstOpen = selectedPin !== null && selectedPinScreenPos !== null && !isEditMode;

  return (
    <div className="fixed inset-2 rounded-xl overflow-hidden shadow-sm">
      <Map
        initialViewState={{
          longitude: 139.69,
          latitude: 35.68,
          zoom: 11,
        }}
        mapStyle={process.env.NEXT_PUBLIC_MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        onClick={handleMapClick}
        scrollZoom={!burstOpen}
        dragPan={!burstOpen}
        dragRotate={!burstOpen}
        touchZoomRotate={!burstOpen}
        doubleClickZoom={!burstOpen}
      >
        {pins.map((pin) => (
          <PinMarker
            key={pin.id}
            pin={pin}
            isSelected={selectedPin?.id === pin.id}
            onClick={(screenPos) => handlePinClick(pin, screenPos)}
            onHoverEnter={() => {
              setHoveredPin(pin);
              if (!(pin.id in imageCache.current)) {
                fetch(`/api/pins/${pin.id}/images`)
                  .then((r) => r.json())
                  .then((data: Image[]) => { imageCache.current[pin.id] = data; })
                  .catch(() => {});
              }
            }}
            onHoverLeave={() => setHoveredPin(null)}
          />
        ))}

        {hoveredPin && !selectedPin && (
          <Popup
            longitude={hoveredPin.lng}
            latitude={hoveredPin.lat}
            closeOnClick={false}
            closeButton={false}
            anchor="bottom"
            offset={33}
          >
            <span className="text-sm font-medium">{hoveredPin.label}</span>
          </Popup>
        )}
      </Map>

      {/* Pins loading indicator */}
      {pinsLoading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-zinc-500 shadow-sm pointer-events-none">
          Loading…
        </div>
      )}

      {/* Burst — view mode only */}
      {burstOpen && (
        <PhotoBurstSwitch
          pin={selectedPin}
          images={selectedPinImages}
          imagesLoading={imagesLoading}
          pinScreenPos={selectedPinScreenPos}
          onClose={handleClose}
          onOpenInSheet={session ? () => {
            setSelectedPinScreenPos(null);
            setSheetExpandRequest((n) => n + 1);
          } : undefined}
        />
      )}

      {/* Admin sheet — shown when logged in */}
      {session && (
        <AdminSheet
          pins={pins}
          selectedPin={selectedPin}
          expandRequest={sheetExpandRequest}
          images={selectedPinImages}
          token={session.access_token}
          isEditMode={isEditMode}
          onEditModeChange={setIsEditMode}
          onSelectPin={(pin) => {
            setSelectedPin(pin);
            setSelectedPinScreenPos(null);
          }}
          onPinUpdated={(updated) => {
            setPins((prev) => prev.map((p) => p.id === updated.id ? updated : p));
            setSelectedPin(updated);
          }}
          onPinDeleted={(id) => {
            setPins((prev) => prev.filter((p) => p.id !== id));
            setSelectedPin(null);
            setSelectedPinScreenPos(null);
          }}
          onImagesChange={(updater) => {
            setSelectedPinImages((prev) => {
              const next = typeof updater === 'function' ? updater(prev) : updater;
              if (selectedPin) imageCache.current[selectedPin.id] = next;
              return next;
            });
          }}
          signOut={signOut}
        />
      )}

      {/* Login link — subtle, for the owner */}
      {!session && (
        <a
          href="/login"
          className="fixed right-4 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          style={{ bottom: 'calc(1rem + var(--sab))' }}
        >
          Admin
        </a>
      )}
    </div>
  );
}
