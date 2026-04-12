import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import L from 'leaflet';

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function ClickMarker({ position, setPosition }) {
  useMapEvents({ click(e) { setPosition(e.latlng); } });
  return position ? <Marker position={position} /> : null;
}

function SearchBar({ setPosition, setAddress }) {
  const map = useMap();
  useEffect(() => {
    const provider = new OpenStreetMapProvider();
    const ctrl = new GeoSearchControl({
      provider,
      style: 'bar',
      showMarker: false,
      autoClose: true,
      keepResult: true,
      searchLabel: 'Search address or city...'
    });
    map.addControl(ctrl);
    map.on('geosearch/showlocation', (r) => {
      setPosition({ lat: r.location.y, lng: r.location.x });
      if (setAddress) setAddress(r.location.label);
    });
    return () => map.removeControl(ctrl);
  }, [map]);
  return null;
}

export default function MapPicker({ position, setPosition, setAddress, height = '240px' }) {
  const defaultPos = position || { lat: 13.0827, lng: 80.2707 };

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-earth-200 shadow-inner relative z-0">
      <MapContainer center={[defaultPos.lat, defaultPos.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        <SearchBar setPosition={setPosition} setAddress={setAddress} />
        <ClickMarker position={defaultPos} setPosition={setPosition} />
      </MapContainer>
    </div>
  );
}
