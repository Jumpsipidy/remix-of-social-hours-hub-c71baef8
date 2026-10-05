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
const countCache = new Map<number, L.DivIcon>();
function countPin(n: number) {
  if (!countCache.has(n)) countCache.set(n, L.divIcon({ className: "", iconSize: [30, 30], iconAnchor: [15, 15],
    html: `<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:9999px;background:#f97316;color:#fff;font:700 12px system-ui;border:3px solid #fff;box-shadow:0 0 0 5px #f9731655">${n}</span>` }));
  return countCache.get(n)!;
}
const DefaultIcon = pin("#f97316");
const TaskIcon = pin("#f97316");
const OrgIcon = pin("#94a3b8", 14);
const UserIcon = pin("#3b82f6", 16);

export type MapMarker = { id: string; lat: number; lng: number; label: string; kind: "task" | "organization"; count?: number };
L.Marker.prototype.options.icon = DefaultIcon;

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined) || (import.meta.env.VITE_LOVABLE_CONNECTOR_MAPBOX_PUBLIC_TOKEN as string | undefined);
const USE_MAPBOX = !!MAPBOX_TOKEN && MAPBOX_TOKEN.startsWith("pk.");
const DARK_TILES = USE_MAPBOX
  ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = USE_MAPBOX
  ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://openstreetmap.org">OSM</a>'
  : '&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';
export const MAP_PROVIDER = USE_MAPBOX ? "mapbox" : "carto";

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
      <TileLayer url={DARK_TILES} attribution={ATTRIBUTION} {...(USE_MAPBOX ? { tileSize: 512, zoomOffset: -1 } : {})} />
      <Recenter center={{ lat, lng }} zoom={zoom} />
      {showCenter && <Marker position={[lat, lng]} icon={markers ? UserIcon : DefaultIcon} />}
      {markers?.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={m.kind === "task" ? (m.count && m.count > 1 ? countPin(m.count) : TaskIcon) : OrgIcon}
          eventHandlers={{ click: () => onMarkerClick?.(m.id) }}
        >
          <Tooltip direction="top" offset={[0, -8]}>{m.label}</Tooltip>
        </Marker>
      ))}
      {onPick && <ClickHandler onPick={onPick} />}
    </MapContainer>
  );
}
