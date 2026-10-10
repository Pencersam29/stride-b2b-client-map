import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Client, ClientStatus, ClientType, STATUS_COLORS } from "@/types/client";
import ClientPopover from "./ClientPopover";

// Consistent wedge ordering so a mixed-status dot always looks the same
const STATUS_ORDER: ClientStatus[] = [
  "Signed",
  "Interested in Trial",
  "In Pipeline",
  "Prospect",
  "On Hold",
  "Not Interested",
];

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Pie wedge path, or a full circle when there's only one color
function wedgePath(cx: number, cy: number, r: number, i: number, total: number) {
  if (total === 1) {
    return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  }
  // start at 12 o'clock so a two-color dot reads as left half / right half
  const a0 = (i / total) * Math.PI * 2 - Math.PI / 2;
  const a1 = ((i + 1) / total) * Math.PI * 2 - Math.PI / 2;
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`,
    "Z",
  ].join(" ");
}

function pie(
  cx: number,
  cy: number,
  r: number,
  colors: string[],
  opacity: number,
  divider: boolean
) {
  return colors
    .map(
      (c, i) =>
        `<path d="${wedgePath(cx, cy, r, i, colors.length)}" fill="${c}" opacity="${opacity}"${
          divider && colors.length > 1
            ? ` stroke="#FFFFFF" stroke-width="1.25" stroke-linejoin="round"`
            : ""
        }/>`
    )
    .join("");
}

function createPinIcon(colors: string[], isHighlighted: boolean, isPulse: boolean) {
  const isMulti = colors.length > 1;
  // A dot standing for several businesses is bigger, so each wedge stays readable
  const base = isMulti ? 20 : 14;
  const size = isHighlighted ? base + 4 : base;
  const iconSize = size + 16;
  const c = iconSize / 2;

  // The glow washes a split dot into one muddy color, so only single dots get it
  const glow = isMulti ? "" : ` style="filter:drop-shadow(0 0 8px ${colors[0]})"`;

  const svg = `
    <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 ${iconSize} ${iconSize}" xmlns="http://www.w3.org/2000/svg">
      ${isPulse ? `
        <circle cx="${c}" cy="${c}" r="${size / 2 + 6}" fill="${colors[0]}" opacity="0.15">
          <animate attributeName="r" values="${size / 2 + 4};${size / 2 + 10};${size / 2 + 4}" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.2;0;0.2" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      ` : ""}
      ${pie(c, c, size / 2 + 3, colors, isMulti ? 0.22 : 0.18, false)}
      <g${glow}>${pie(c, c, size / 2, colors, 1, true)}</g>
      ${isMulti ? "" : `<circle cx="${c}" cy="${c}" r="${size / 4}" fill="rgba(255,255,255,0.4)"/>`}
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
  });
}

function FlyToControl({
  target,
  onDone,
}: {
  target: { lat: number; lng: number; id: string } | null;
  onDone: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 12, { duration: 1.2 });
      onDone();
    }
  }, [target]);
  return null;
}

function ZoomControls() {
  const map = useMap();
  return (
    <div
      style={{
        position: "absolute",
        bottom: "24px",
        right: "16px",
        zIndex: 999,
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(8px)",
        border: "1px solid #E2E8F0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        borderRadius: "8px",
        padding: "4px",
      }}
    >
      {(["in", "out"] as const).map((dir) => (
        <button
          key={dir}
          onClick={() => (dir === "in" ? map.zoomIn() : map.zoomOut())}
          style={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            border: "none",
            background: "transparent",
            color: "#475569",
            fontSize: "18px",
            cursor: "pointer",
            fontFamily: "monospace",
            lineHeight: 1,
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              "rgba(0,0,0,0.06)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "transparent")
          }
        >
          {dir === "in" ? "+" : "−"}
        </button>
      ))}
    </div>
  );
}

// Clients whose dots would overlap at the current zoom are drawn as one
// multi-color dot, so a city with two different statuses never reads as one.
const CLUSTER_PX = 26;

interface ClientCluster {
  lat: number;
  lng: number;
  members: Client[];
}

function ClientMarkers({
  clients,
  activeFilter,
  typeFilter,
  selectedClientId,
  onSelectClient,
  highlightedClientId,
}: {
  clients: Client[];
  activeFilter: ClientStatus | null;
  typeFilter: ClientType | null;
  selectedClientId: string | null;
  onSelectClient: (client: Client | null) => void;
  highlightedClientId: string | null;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const clusters = useMemo(() => {
    const out: ClientCluster[] = [];
    for (const client of clients) {
      const p = map.project([client.lat, client.lng], zoom);
      const hit = out.find((c) => {
        const q = map.project([c.lat, c.lng], zoom);
        return Math.hypot(p.x - q.x, p.y - q.y) <= CLUSTER_PX;
      });
      if (hit) {
        hit.members.push(client);
        hit.lat =
          hit.members.reduce((s, m) => s + m.lat, 0) / hit.members.length;
        hit.lng =
          hit.members.reduce((s, m) => s + m.lng, 0) / hit.members.length;
      } else {
        out.push({ lat: client.lat, lng: client.lng, members: [client] });
      }
    }
    return out;
  }, [clients, zoom, map]);

  return (
    <>
      {clusters.map((cluster) => {
        const passes = (c: Client) =>
          (activeFilter === null || c.status === activeFilter) &&
          (typeFilter === null || c.type === typeFilter);

        const visible = cluster.members.filter(passes);
        const isFiltered = visible.length === 0;
        // Dim a whole cluster only when nothing in it passes the filter
        const shown = isFiltered ? cluster.members : visible;

        const statuses = STATUS_ORDER.filter((s) =>
          shown.some((c) => c.status === s)
        );
        const colors = statuses.map((s) => STATUS_COLORS[s]);

        const isSelected = shown.some((c) => c.id === selectedClientId);
        const isHighlighted = shown.some((c) => c.id === highlightedClientId);

        const icon = createPinIcon(
          colors,
          isSelected || isHighlighted,
          isHighlighted && !isSelected
        );

        return (
          <Marker
            key={cluster.members.map((c) => c.id).join("|")}
            position={[cluster.lat, cluster.lng]}
            icon={icon}
            opacity={isFiltered ? 0.12 : 1}
            eventHandlers={{
              click: () => {
                // Several businesses under one dot: zoom in to split them apart
                if (shown.length > 1 && zoom < 13) {
                  map.flyTo([cluster.lat, cluster.lng], Math.min(zoom + 4, 13), {
                    duration: 0.8,
                  });
                  return;
                }
                const target = shown[0];
                onSelectClient(
                  target.id === selectedClientId ? null : target
                );
              },
            }}
          />
        );
      })}
    </>
  );
}

interface MapViewProps {
  clients: Client[];
  activeFilter: ClientStatus | null;
  typeFilter: ClientType | null;
  flyTarget: { lat: number; lng: number; id: string } | null;
  onFlyDone: () => void;
  selectedClientId: string | null;
  onSelectClient: (client: Client | null) => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onStatusChange: (clientId: string, status: ClientStatus) => void;
  highlightedClientId: string | null;
}

export default function MapView({
  clients,
  activeFilter,
  typeFilter,
  flyTarget,
  onFlyDone,
  selectedClientId,
  onSelectClient,
  onEditClient,
  onDeleteClient,
  onStatusChange,
  highlightedClientId,
}: MapViewProps) {
  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[45.0, -90.0]}
        zoom={4}
        style={{ width: "100%", height: "100%", background: "#F8FAFC" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          subdomains={["a", "b", "c"]}
        />

        <FlyToControl target={flyTarget} onDone={onFlyDone} />
        <ZoomControls />

        <ClientMarkers
          clients={clients}
          activeFilter={activeFilter}
          typeFilter={typeFilter}
          selectedClientId={selectedClientId}
          onSelectClient={onSelectClient}
          highlightedClientId={highlightedClientId}
        />
      </MapContainer>

      {/* Client Popover */}
      {selectedClient && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: "80px",
              right: "16px",
              pointerEvents: "auto",
            }}
          >
            <ClientPopover
              client={selectedClient}
              onClose={() => onSelectClient(null)}
              onEdit={() => onEditClient(selectedClient)}
              onDelete={() => {
                onDeleteClient(selectedClient.id);
                onSelectClient(null);
              }}
              onStatusChange={(status) =>
                onStatusChange(selectedClient.id, status)
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
