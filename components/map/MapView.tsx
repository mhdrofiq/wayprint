'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Map, Popup, type MapRef } from '@vis.gl/react-maplibre';
// Imported statically so MapLibre downloads with the page's other scripts.
// Left to the wrapper, it is only requested after the page has hydrated.
import maplibregl, { type MapLayerMouseEvent } from 'maplibre-gl';
import type { Pin, Image, Collection, ScreenPos, Updater } from '@/types';
import type { CollectionId } from '@/lib/collections';
import { useAdminSession } from '@/hooks/useAdminSession';
import { toast } from 'sonner';
import { layers } from '@/lib/layers';
import { adminFetch } from '@/lib/admin-api';
import { firstPageThumbs, warmImages } from '@/lib/preload';
import type { BurstData } from '@/lib/queries';
import PinMarker from './PinMarker';
import PhotoBurstSwitch from '@/components/burst/PhotoBurstSwitch';
import PinList from '@/components/PinList';

// Only the signed-in owner sees the admin UI, so visitors never download it.
const AdminSheet = dynamic(() => import('@/components/admin/AdminSheet'), { ssr: false });

async function fetchBurst(pinId: string): Promise<BurstData> {
  const res = await fetch(`/api/pins/${pinId}/burst`);
  return res.json();
}

interface MapViewProps {
  /** Pins rendered into the page by the server. When absent, fetched on mount. */
  initialPins?: Pin[];
  /** Server-fetched burst data for initialPinId, so the deep-linked burst
   *  opens without another round trip. */
  initialBurst?: BurstData;
  /** When set, MapView flies to this pin after the pin list loads and opens
   *  its burst — used by the /pin/[id] route to deep-link from Obsidian etc. */
  initialPinId?: string;
  /** When set together with initialPinId, pre-selects this collection filter
   *  inside the burst that opens for the deep-linked pin. Only applied once —
   *  clicking other pins afterwards uses their own default collection. */
  initialCollectionId?: CollectionId;
}

export default function MapView({ initialPins, initialBurst, initialPinId, initialCollectionId }: MapViewProps = {}) {
  const { session, signOut } = useAdminSession();

  const [pins, setPins] = useState<Pin[]>(initialPins ?? []);
  const [pinsLoading, setPinsLoading] = useState(!initialPins);
  const [mapLoaded, setMapLoaded] = useState(false);
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
  const imageCache = useRef<Record<string, Image[]>>(
    initialPinId && initialBurst ? { [initialPinId]: initialBurst.images } : {},
  );
  const collectionCache = useRef<Record<string, Collection[]>>(
    initialPinId && initialBurst ? { [initialPinId]: initialBurst.collections } : {},
  );

  // Map ref so the public PinList can fly the camera without opening a burst.
  const mapRef = useRef<MapRef | null>(null);

  // Load all pins on mount, unless the server already provided them
  useEffect(() => {
    if (initialPins) return;
    setPinsLoading(true);
    fetch('/api/pins')
      .then((res) => res.json())
      .then((data) => setPins(data))
      .catch(() => toast.error('Failed to load pins'))
      .finally(() => setPinsLoading(false));
  }, [initialPins]);

  // Deep-link: once the map and pins have loaded, fly to the initial pin and
  // open its burst. Guarded by a ref so a re-render (e.g. burst close)
  // doesn't re-trigger.
  useEffect(() => {
    if (!initialPinId || initialFocusDoneRef.current || pins.length === 0) return;
    const pin = pins.find((p) => p.id === initialPinId);
    if (!pin) {
      initialFocusDoneRef.current = true; // pin id doesn't exist; give up
      return;
    }
    const map = mapRef.current;
    if (!map || !mapLoaded) return; // re-runs when the map's load event fires

    initialFocusDoneRef.current = true;

    map.flyTo({ center: [pin.lng, pin.lat], zoom: 13, duration: 1200, essential: true });
    map.once('moveend', () => {
      const { x, y } = map.project([pin.lng, pin.lat]);
      setSelectedPin(pin);
      setSelectedPinScreenPos({ x, y });
    });
  }, [pins, initialPinId, mapLoaded]);

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
    fetchBurst(selectedPin.id)
      .then(({ images, collections }) => {
        imageCache.current[selectedPin.id] = images;
        collectionCache.current[selectedPin.id] = collections;
        setSelectedPinImages(images);
        setSelectedPinCollections(collections);
      })
      .catch(() => toast.error('Failed to load photos'))
      .finally(() => setImagesLoading(false));
  }, [selectedPin]);

  // Warm the cache on hover (or touch-down) so the burst opens instantly on
  // click: its data, then the photos on its first page.
  function prefetchBurst(pinId: string) {
    const cachedImages = imageCache.current[pinId];
    const cachedCollections = collectionCache.current[pinId];
    if (cachedImages && cachedCollections) {
      warmImages(firstPageThumbs(cachedImages, cachedCollections));
      return;
    }
    fetchBurst(pinId)
      .then(({ images, collections }) => {
        imageCache.current[pinId] = images;
        collectionCache.current[pinId] = collections;
        warmImages(firstPageThumbs(images, collections));
      })
      .catch(() => {});
  }

  // Id of the pin whose images are on screen, for async callbacks that finish
  // after the selection has moved on.
  const selectedPinIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedPinIdRef.current = selectedPin?.id ?? null;
  }, [selectedPin]);

  // Changes from the burst or the admin sheet, bound to the pin they were made
  // on. A save or upload that lands after the selection changed updates that
  // pin's cache only, never the photos of the pin now on screen.
  function imagesUpdaterFor(pinId: string): Updater<Image[]> {
    return (updater) => {
      const apply = (prev: Image[]) => (typeof updater === 'function' ? updater(prev) : updater);
      if (selectedPinIdRef.current === pinId) {
        setSelectedPinImages((prev) => {
          const next = apply(prev);
          imageCache.current[pinId] = next;
          return next;
        });
      } else if (imageCache.current[pinId]) {
        imageCache.current[pinId] = apply(imageCache.current[pinId]);
      }
    };
  }

  function collectionsUpdaterFor(pinId: string): Updater<Collection[]> {
    return (updater) => {
      const apply = (prev: Collection[]) => (typeof updater === 'function' ? updater(prev) : updater);
      if (selectedPinIdRef.current === pinId) {
        setSelectedPinCollections((prev) => {
          const next = apply(prev);
          collectionCache.current[pinId] = next;
          return next;
        });
      } else if (collectionCache.current[pinId]) {
        collectionCache.current[pinId] = apply(collectionCache.current[pinId]);
      }
    };
  }

  const noopUpdater = () => {};
  const updateImages: Updater<Image[]> = selectedPin ? imagesUpdaterFor(selectedPin.id) : noopUpdater;
  const updateCollections: Updater<Collection[]> = selectedPin ? collectionsUpdaterFor(selectedPin.id) : noopUpdater;

  function handlePinClick(pin: Pin, screenPos: ScreenPos) {
    setHoveredPin(null);
    setSelectedPin(pin);
    // Edit mode opens the pin in the sheet; view mode bursts from the marker.
    setSelectedPinScreenPos(isEditMode ? null : screenPos);
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
      const res = await adminFetch('/api/pins', session.access_token, 'POST', { label: 'New Pin', lat, lng });
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
        mapLib={maplibregl}
        mapStyle={process.env.NEXT_PUBLIC_MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        onLoad={() => setMapLoaded(true)}
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
              prefetchBurst(pin.id);
            }}
            onHoverLeave={() => setHoveredPin(null)}
            onPressStart={() => prefetchBurst(pin.id)}
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
          onImagesChange={updateImages}
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
            // The save may land after the admin moved to another pin: only
            // refresh the selection if it's still this pin.
            setSelectedPin((current) => (current?.id === updated.id ? updated : current));
          }}
          onPinDeleted={(id) => {
            setPins((prev) => prev.filter((p) => p.id !== id));
            setSelectedPin(null);
            setSelectedPinScreenPos(null);
          }}
          onImagesChange={updateImages}
          onCollectionsChange={updateCollections}
          signOut={signOut}
        />
      )}

    </div>
  );
}
