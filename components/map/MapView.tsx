import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Client, ClientStatus, ClientType, STATUS_COLORS } from "@/types/client";
import ClientPopover from "./ClientPopover";

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createPinIcon(color: string, isHighlighted: boolean, isPulse: boolean) {
  const size = isHighlighted ? 18 : 14;

  const svg = `
    <svg width="${size + 16}" height="${size + 16}" viewBox="0 0 ${size + 16} ${size + 16}" xmlns="http://www.w3.org/2000/svg">
      ${isPulse ? `
        <circle cx="${(size + 16) / 2}" cy="${(size + 16) / 2}" r="${size / 2 + 6}" fill="${color}" opacity="0.15">
          <animate attributeName="r" values="${size / 2 + 4};${size / 2 + 10};${size / 2 + 4}" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.2;0;0.2" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      ` : ""}
      <circle cx="${(size + 16) / 2}" cy="${(size + 16) / 2}" r="${size / 2 + 3}" fill="${color}" opacity="0.18"/>
      <circle cx="${(size + 16) / 2}" cy="${(size + 16) / 2}" r="${size / 2}" fill="${color}" style="filter:drop-shadow(0 0 8px ${color})"/>
      <circle cx="${(size + 16) / 2}" cy="${(size + 16) / 2}" r="${size / 4}" fill="rgba(255,255,255,0.4)"/>
    </svg>
  `;

  const iconSize = size + 16;
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
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        <FlyToControl target={flyTarget} onDone={onFlyDone} />
        <ZoomControls />

        {clients.map((client) => {
          const isFiltered =
            (activeFilter !== null && client.status !== activeFilter) ||
            (typeFilter !== null && client.type !== typeFilter);
          const isSelected = client.id === selectedClientId;
          const isHighlighted = client.id === highlightedClientId;
          const color = STATUS_COLORS[client.status];

          const icon = createPinIcon(
            color,
            isSelected || isHighlighted,
            isHighlighted && !isSelected
          );

          return (
            <Marker
              key={client.id}
              position={[client.lat, client.lng]}
              icon={icon}
              opacity={isFiltered ? 0.12 : 1}
              eventHandlers={{
                click: () => onSelectClient(isSelected ? null : client),
              }}
            />
          );
        })}
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
