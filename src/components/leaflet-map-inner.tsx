import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION =
  '&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

type Coords = { lat: number; lng: number };

function Recenter({ center, zoom }: { center: Coords; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], zoom ?? map.getZoom(), { duration: 0.6 });
  }, [center.lat, center.lng, zoom, map]);
  return null;
}

function ClickHandler({ onPick }: { onPick: (c: Coords) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export type LeafletMapInnerProps = {
  lat: number;
  lng: number;
  zoom?: number;
  interactive?: boolean;
  onPick?: (c: Coords) => void;
};

export default function LeafletMapInner({
  lat,
  lng,
  zoom = 15,
  interactive = true,
  onPick,
}: LeafletMapInnerProps) {
  const ref = useRef<L.Map | null>(null);
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={zoom}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      zoomControl={interactive}
      style={{ height: "100%", width: "100%", background: "#0b1220" }}
      ref={(m) => {
        if (m) ref.current = m;
      }}
    >
      <TileLayer url={DARK_TILES} attribution={ATTRIBUTION} />
      <Recenter center={{ lat, lng }} zoom={zoom} />
      <Marker position={[lat, lng]} />
      {onPick && <ClickHandler onPick={onPick} />}
    </MapContainer>
  );
}
