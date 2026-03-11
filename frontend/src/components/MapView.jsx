import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix default marker icons in bundled environments
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const victimIcon = L.divIcon({
  html: '<div style="background:#ef4444;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(239,68,68,0.6)"></div>',
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const responderIcon = L.divIcon({
  html: '<div style="background:#22c55e;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(34,197,94,0.6)"></div>',
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/**
 * @param {object} props
 * @param {[number,number]} props.victimPos - [lat, lng]
 * @param {[number,number]} props.responderPos - [lat, lng]
 * @param {[number,number]} props.center
 * @param {'victim'|'responder'} props.userRole - who is viewing the map
 */
export default function MapView({ victimPos, responderPos, center, userRole }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const victimMarkerRef = useRef(null);
  const responderMarkerRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const defaultCenter = center || victimPos || [20.5937, 78.9629];
    const map = L.map(mapRef.current).setView(defaultCenter, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update victim marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !victimPos) return;

    if (victimMarkerRef.current) {
      victimMarkerRef.current.setLatLng(victimPos);
    } else {
      victimMarkerRef.current = L.marker(victimPos, { icon: victimIcon })
        .addTo(map)
        .bindPopup('📍 Victim Location');
    }
  }, [victimPos]);

  // Update responder marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !responderPos) return;

    if (responderMarkerRef.current) {
      responderMarkerRef.current.setLatLng(responderPos);
    } else {
      responderMarkerRef.current = L.marker(responderPos, { icon: responderIcon })
        .addTo(map)
        .bindPopup('🚑 Responder Location');
    }

    if (victimPos) {
      const bounds = L.latLngBounds([victimPos, responderPos]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [responderPos, victimPos]);

  // Build Google Maps directions URL
  const getDirectionsUrl = (mode) => {
    let origin, destination;

    if (userRole === 'victim') {
      // Victim → wants directions FROM their location TO the responder
      origin = victimPos;
      destination = responderPos;
    } else {
      // Responder → wants directions FROM their location TO the victim
      origin = responderPos;
      destination = victimPos;
    }

    if (!origin || !destination) return null;

    return `https://www.google.com/maps/dir/?api=1&origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}&travelmode=${mode}`;
  };

  const hasDirections = victimPos && responderPos;

  return (
    <div>
      <div ref={mapRef} className="map-container" id="rescue-map" />

      {hasDirections && (
        <div className="directions-bar">
          <span className="directions-label">Get Directions</span>
          <div className="directions-buttons">
            <a
              href={getDirectionsUrl('driving')}
              target="_blank"
              rel="noopener noreferrer"
              className="directions-btn"
              id="dir-driving"
            >
              🚗 Drive
            </a>
            <a
              href={getDirectionsUrl('walking')}
              target="_blank"
              rel="noopener noreferrer"
              className="directions-btn"
              id="dir-walking"
            >
              🚶 Walk
            </a>
            <a
              href={getDirectionsUrl('transit')}
              target="_blank"
              rel="noopener noreferrer"
              className="directions-btn"
              id="dir-transit"
            >
              🚆 Transit
            </a>
            <a
              href={getDirectionsUrl('bicycling')}
              target="_blank"
              rel="noopener noreferrer"
              className="directions-btn"
              id="dir-bicycling"
            >
              🚴 Cycle
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
