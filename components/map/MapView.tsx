'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useState, useEffect, useRef } from 'react';
import { Map, Popup, type MapRef } from '@vis.gl/react-maplibre';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import type { Pin, Image, Collection, ScreenPos } from '@/types';
import type { CollectionId } from '@/hooks/useCollectionFilter';
import { useAdminSession } from '@/hooks/useAdminSession';
import { toast } from 'sonner';
import { layers } from '@/lib/layers';
import PinMarker from './PinMarker';
import PhotoBurstSwitch from '@/components/burst/PhotoBurstSwitch';
import AdminSheet from '@/components/admin/AdminSheet';
import PinList from '@/components/PinList';

interface MapViewProps {
  /** When set, MapView flies to this pin after the pin list loads and opens
   *  its burst — used by the /pin/[id] route to deep-link from Obsidian etc. */
  initialPinId?: string;
  /** When set together with initialPinId, pre-selects this collection filter
   *  inside the burst that opens for the deep-linked pin. Only applied once —
   *  clicking other pins afterwards uses their own default collection. */
  initialCollectionId?: CollectionId;
}

export default function MapView({ initialPinId, initialCollectionId }: MapViewProps = {}) {
  const { session, signOut } = useAdminSession();

  const [pins, setPins] = useState<Pin[]>([]);
  const [pinsLoading, setPinsLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [selectedPinScreenPos, setSelectedPinScreenPos] = useState<ScreenPos | null>(null);
  const [selectedPinImages, setSelectedPinImages] = useState<Image[]>([]);
  const [selectedPinCollections, setSelectedPinCollections] = useState<Collection[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [hoveredPin, setHoveredPin] = useState<Pin | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sheetExpandRequest, setSheetExpandRequest] = useState(0);
  const initialFocusDoneRef = useRef(false);

  // Cache of pin images and collections keyed by pin id — populated on hover
  // so data is ready by the time the user clicks.
  const imageCache = useRef<Record<string, Image[]>>({});
  const collectionCache = useRef<Record<string, Collection[]>>({});

  // Map ref so the public PinList can fly the camera without opening a burst.
  const mapRef = useRef<MapRef | null>(null);

  // Load all pins on mount
  useEffect(() => {
    setPinsLoading(true);
    fetch('/api/pins')
      .then((res) => res.json())
      .then((data) => setPins(data))
      .catch(() => toast.error('Failed to load pins'))
      .finally(() => setPinsLoading(false));
  }, []);

  // Deep-link: after pins load, fly to the initial pin and open its burst.
  // Guarded by a ref so a re-render (e.g. burst close) doesn't re-trigger.
  useEffect(() => {
    if (!initialPinId || initialFocusDoneRef.current || pins.length === 0) return;
    const pin = pins.find((p) => p.id === initialPinId);
    if (!pin) {
      initialFocusDoneRef.current = true; // pin id doesn't exist; give up
      return;
    }
    const map = mapRef.current;
    if (!map) return; // wait for the map ref to attach

    initialFocusDoneRef.current = true;

    function openBurstAtPin() {
      const m = mapRef.current;
      if (!m || !pin) return;
      const { x, y } = m.project([pin.lng, pin.lat]);
      setSelectedPin(pin);
      setSelectedPinScreenPos({ x, y });
    }

    function flyThenOpen() {
      const m = mapRef.current;
      if (!m || !pin) return;
      m.flyTo({ center: [pin.lng, pin.lat], zoom: 13, duration: 1200, essential: true });
      m.once('moveend', openBurstAtPin);
    }

    if (map.loaded()) {
      flyThenOpen();
    } else {
      map.once('load', flyThenOpen);
    }
  }, [pins, initialPinId]);

  // Load images and collections whenever a pin is selected, using the cache if available.
  useEffect(() => {
    if (!selectedPin) {
      setSelectedPinImages([]);
      setSelectedPinCollections([]);
      setImagesLoading(false);
      return;
    }

    const cachedImages = imageCache.current[selectedPin.id];
    const cachedCollections = collectionCache.current[selectedPin.id];

    if (cachedImages && cachedCollections) {
      setSelectedPinImages(cachedImages);
      setSelectedPinCollections(cachedCollections);
      setImagesLoading(false);
      return;
    }

    setImagesLoading(true);
    fetch(`/api/pins/${selectedPin.id}/burst`)
      .then((r) => r.json())
      .then(({ images, collections }: { images: Image[]; collections: Collection[] }) => {
        imageCache.current[selectedPin.id] = images;
        collectionCache.current[selectedPin.id] = collections;
        setSelectedPinImages(images);
        setSelectedPinCollections(collections);
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

  // Public list — fly the map to the pin and show its label briefly. No burst.
  function handleListPinFocus(pin: Pin) {
    setSelectedPin(null);
    setSelectedPinScreenPos(null);
    setHoveredPin(pin);
    const map = mapRef.current;
    if (!map) return;
    // Zoom in to at least a neighborhood-level view, but never zoom the user
    // back out if they're already closer in.
    const targetZoom = Math.max(map.getZoom(), 13);
    map.flyTo({ center: [pin.lng, pin.lat], zoom: targetZoom, duration: 1200, essential: true });
    map.once('moveend', () => {
      // Only clear if we're still focused on this pin (avoid clobbering a
      // genuine hover the user has started in the meantime).
      setHoveredPin((current) => (current?.id === pin.id ? null : current));
    });
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

  // Deep-linked pin: whenever its burst opens, seed the collection filter
  // from the URL. Clicking other pins uses their normal smart-default.
  const burstInitialCollectionId =
    selectedPin?.id === initialPinId ? initialCollectionId : undefined;

  return (
    <div className="fixed inset-2 rounded-lg overflow-hidden shadow-sm" style={burstOpen ? { zIndex: layers.BACKDROP } : undefined}>
      <Map
        ref={mapRef}
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
              if (!(pin.id in imageCache.current) || !(pin.id in collectionCache.current)) {
                fetch(`/api/pins/${pin.id}/burst`)
                  .then((r) => r.json())
                  .then(({ images, collections }: { images: Image[]; collections: Collection[] }) => {
                    imageCache.current[pin.id] = images;
                    collectionCache.current[pin.id] = collections;
                  })
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
          collections={selectedPinCollections}
          imagesLoading={imagesLoading}
          pinScreenPos={selectedPinScreenPos}
          initialCollectionId={burstInitialCollectionId}
          onClose={handleClose}
          onOpenInSheet={session ? () => {
            setSelectedPinScreenPos(null);
            setSheetExpandRequest((n) => n + 1);
          } : undefined}
          onImagesChange={(updater) => {
            setSelectedPinImages((prev) => {
              const next = typeof updater === 'function' ? updater(prev) : updater;
              if (selectedPin) imageCache.current[selectedPin.id] = next;
              return next;
            });
          }}
        />
      )}

      {/* Public pin list — hidden during burst and while the admin sheet is
          in its expanded (pin-selected or edit) state. */}
      <PinList
        pins={pins}
        onPinFocus={handleListPinFocus}
        hidden={burstOpen || (!!session && (!!selectedPin || isEditMode))}
      />

      {/* Admin sheet — shown when logged in */}
      {session && (
        <AdminSheet
          pins={pins}
          selectedPin={selectedPin}
          expandRequest={sheetExpandRequest}
          images={selectedPinImages}
          collections={selectedPinCollections}
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
          onCollectionsChange={(updater) => {
            setSelectedPinCollections((prev) => {
              const next = typeof updater === 'function' ? updater(prev) : updater;
              if (selectedPin) collectionCache.current[selectedPin.id] = next;
              return next;
            });
          }}
          signOut={signOut}
        />
      )}

    </div>
  );
}
