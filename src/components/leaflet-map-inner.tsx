import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function pin(color: string, size = 18) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 0 0 4px ${color}55,0 4px 12px rgba(0,0,0,.4)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
const DefaultIcon = pin("#f97316");
const TaskIcon = pin("#f97316");
const OrgIcon = pin("#94a3b8", 14);
const UserIcon = pin("#3b82f6", 16);

export type MapMarker = { id: string; lat: number; lng: number; label: string; kind: "task" | "organization" };
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
  markers?: MapMarker[];
  onMarkerClick?: (id: string) => void;
  showCenter?: boolean;
};

export default function LeafletMapInner({
  lat,
  lng,
  zoom = 15,
  interactive = true,
  onPick,
  markers,
  onMarkerClick,
  showCenter = true,
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
      {showCenter && <Marker position={[lat, lng]} icon={markers ? UserIcon : DefaultIcon} />}
      {markers?.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={m.kind === "task" ? TaskIcon : OrgIcon}
          eventHandlers={{ click: () => onMarkerClick?.(m.id) }}
        >
          <Tooltip direction="top" offset={[0, -8]}>{m.label}</Tooltip>
        </Marker>
      ))}
      {onPick && <ClickHandler onPick={onPick} />}
    </MapContainer>
  );
}
