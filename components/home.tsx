import { useState, useCallback, useEffect } from "react";
import { Client, ClientStatus, ClientType } from "@/types/client";
import { supabase } from "@/lib/supabase";
import Header from "@/components/map/Header";
import StatsStrip from "@/components/map/StatsStrip";
import Sidebar from "@/components/map/Sidebar";
import MapView from "@/components/map/MapView";
import StatusLegend from "@/components/map/StatusLegend";
import ClientModal from "@/components/map/ClientModal";
import CommandCenter from "@/components/map/CommandCenter";

function dbRowToClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as Client["type"],
    address: (row.address as string) ?? "",
    city: row.city as string,
    provinceState: row.province_state as string,
    country: row.country as string,
    contactName: row.contact_name as string,
    contactEmail: (row.contact_email as string) ?? "",
    phoneCell: (row.phone_cell as string) ?? "",
    phoneWork: (row.phone_work as string) ?? "",
    status: row.status as ClientStatus,
    notes: (row.notes as string) ?? "",
    lat: row.lat as number,
    lng: row.lng as number,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

function clientToDbRow(data: Omit<Client, "id" | "createdAt">) {
  return {
    name: data.name,
    type: data.type,
    address: data.address || null,
    city: data.city,
    province_state: data.provinceState,
    country: data.country,
    contact_name: data.contactName,
    contact_email: data.contactEmail || null,
    phone_cell: data.phoneCell || null,
    phone_work: data.phoneWork || null,
    status: data.status,
    notes: data.notes,
    lat: data.lat,
    lng: data.lng,
  };
}

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ClientStatus | null>(null);
  const [typeFilter, setTypeFilter] = useState<ClientType | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [highlightedClientId, setHighlightedClientId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{
    lat: number;
    lng: number;
    id: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<"map" | "command">("map");
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Load clients from Supabase on mount
  useEffect(() => {
    async function loadClients() {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data) {
        setClients(data.map(dbRowToClient));
      }
      setLoading(false);
    }
    loadClients();
  }, []);

  const handleAddClient = useCallback(() => {
    setEditingClient(null);
    setModalOpen(true);
  }, []);

  const handleEditClient = useCallback((client: Client) => {
    setEditingClient(client);
    setModalOpen(true);
  }, []);

  const handleSaveClient = useCallback(
    async (data: Omit<Client, "id" | "createdAt">) => {
      if (editingClient) {
        const { data: updated, error } = await supabase
          .from("clients")
          .update(clientToDbRow(data))
          .eq("id", editingClient.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        if (updated) {
          const updatedClient = dbRowToClient(updated as Record<string, unknown>);
          setClients((prev) =>
            prev.map((c) => (c.id === editingClient.id ? updatedClient : c))
          );
          setFlyTarget({ lat: updatedClient.lat, lng: updatedClient.lng, id: updatedClient.id });
          setSelectedClientId(updatedClient.id);
        }
      } else {
        const { data: inserted, error } = await supabase
          .from("clients")
          .insert(clientToDbRow(data))
          .select()
          .single();
        if (error) throw new Error(error.message);
        if (inserted) {
          const newClient = dbRowToClient(inserted as Record<string, unknown>);
          setClients((prev) => [...prev, newClient]);
          setFlyTarget({ lat: newClient.lat, lng: newClient.lng, id: newClient.id });
          setTimeout(() => {
            setSelectedClientId(newClient.id);
          }, 1300);
        }
      }
    },
    [editingClient]
  );

  const handleDeleteClient = useCallback(async (clientId: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", clientId);
    if (!error) {
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      setSelectedClientId(null);
    }
  }, []);

  const handleStatusChange = useCallback(
    async (clientId: string, status: ClientStatus) => {
      const { error } = await supabase
        .from("clients")
        .update({ status })
        .eq("id", clientId);
      if (!error) {
        setClients((prev) =>
          prev.map((c) => (c.id === clientId ? { ...c, status } : c))
        );
      }
    },
    []
  );

  const handleClientSelectFromSidebar = useCallback((client: Client) => {
    setFlyTarget({ lat: client.lat, lng: client.lng, id: client.id });
    setSelectedClientId(client.id);
    setHighlightedClientId(client.id);
    setTimeout(() => setHighlightedClientId(null), 3000);
  }, []);

  const handleSearchSelect = useCallback((client: Client) => {
    setFlyTarget({ lat: client.lat, lng: client.lng, id: client.id });
    setSelectedClientId(client.id);
    setHighlightedClientId(client.id);
    setTimeout(() => setHighlightedClientId(null), 3000);
  }, []);

  const mapLeft = sidebarCollapsed ? 0 : 320;

  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      style={{ background: "#0E1117", fontFamily: "Space Grotesk, sans-serif" }}
    >
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <Header
        clients={clients}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        onAddClient={handleAddClient}
          activeView={activeView}
          onViewChange={setActiveView}
        onSearchSelect={handleSearchSelect}
      />

      {activeView === "command" ? (
        <div
          className="fixed bottom-0"
          style={{ top: "56px", left: 0, right: 0 }}
        >
          <CommandCenter clients={clients} />
        </div>
      ) : (
        <>
          {/* Stats Strip */}
          <StatsStrip clients={clients} typeFilter={typeFilter} />

          {/* Sidebar */}
          <Sidebar
            clients={clients}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            onClientSelect={handleClientSelectFromSidebar}
            selectedClientId={selectedClientId}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          />

          {/* Map area */}
          <div
            className="fixed bottom-0 transition-all duration-300"
            style={{
              top: "88px",
              left: mapLeft,
              right: 0,
            }}
          >
            {loading && (
              <div
                className="absolute inset-0 flex items-center justify-center z-50"
                style={{ background: "rgba(14,17,23,0.75)" }}
              >
                <span
                  className="text-sm tracking-widest uppercase"
                  style={{ color: "#00E5CC", fontFamily: "JetBrains Mono, monospace" }}
                >
                  Loading clients…
                </span>
              </div>
            )}
            <MapView
              clients={clients}
              activeFilter={activeFilter}
              typeFilter={typeFilter}
              flyTarget={flyTarget}
              onFlyDone={() => setFlyTarget(null)}
              selectedClientId={selectedClientId}
              onSelectClient={(client) =>
                setSelectedClientId(client ? client.id : null)
              }
              onEditClient={handleEditClient}
              onDeleteClient={handleDeleteClient}
              onStatusChange={handleStatusChange}
              highlightedClientId={highlightedClientId}
            />

            {/* Status Legend */}
            <div className="absolute bottom-6 left-6 z-[500]">
              <StatusLegend
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />
            </div>
          </div>
        </>
      )}

      {/* Client Modal */}
      <ClientModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClient}
        editClient={editingClient}
      />
    </div>
  );
}
