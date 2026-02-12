import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Suspense,
  lazy,
} from "react";
import { type MapRef } from "react-map-gl/mapbox";
import { ZoneToolbar } from "./components/ZoneToolbar";
import { type Zone, type VehicleDetails } from "./types";

// 1. DYNAMIC IMPORT
// This tells Vite: "Don't load MapContainer.js until we actually render it"
const MapContainer = lazy(() => import("./components/MapContainer"));

const App = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const mapRef = useRef<MapRef>(null);

  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [filterMode, setFilterMode] = useState<
    "all" | "compliant" | "non-compliant"
  >("all");
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/zones.json")
      .then((r) => r.json())
      .then(setZones)
      .catch(console.error);
  }, []);

  const checkCompliance = useCallback((vehicle: VehicleDetails, zone: Zone): boolean => {
    const fuel = vehicle.fuelType.toUpperCase();
    const euro = vehicle.euroStatus.toUpperCase();
    const rule = zone.ruleType;

    if (rule === "congestion" || rule === "zero_emission") {
      return fuel === "ELECTRIC" || euro === "ZERO EMISSION";
    }
    if (rule === "exempt_cars") return true;
    if (fuel === "ELECTRIC" || euro === "ZERO EMISSION") return true;
    if (euro.includes("EURO 6")) return true;
    if (euro.includes("EURO 5") && fuel === "PETROL") return true;
    if (euro.includes("EURO 4") && fuel === "PETROL") return true;
    return false;
  }, []);

  // VISIBLE ZONES
  const visibleZones = useMemo(() => {
    let filtered = [...zones];
    if (vehicle) {
      if (filterMode === 'compliant') {
        filtered = filtered.filter(zone => checkCompliance(vehicle, zone));
      } else if (filterMode === 'non-compliant') {
        filtered = filtered.filter(zone => !checkCompliance(vehicle, zone));
      }
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [zones, filterMode, vehicle, checkCompliance]);

  

  return (
    <div className="w-full h-screen relative font-sans bg-gray-50 text-slate-900 overflow-hidden">
      {/* 2. LOADING STATE */}
      {/* This shows while the Map chunk is downloading */}
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-200 rounded-full animate-spin" />
              <span className="text-slate-400 font-black tracking-widest text-xs animate-pulse">
                LOADING MAP...
              </span>
            </div>
          </div>
        }
      >
        <MapContainer
          mapRef={mapRef}
          visibleZones={visibleZones}
          vehicle={vehicle}
          checkCompliance={checkCompliance}
          onHoverZone={setHoveredZoneId}
          hoveredZoneId={hoveredZoneId}
        />
      </Suspense>

      <ZoneToolbar
        zones={visibleZones}
        vehicle={vehicle}
        filterMode={filterMode}
        hoveredZoneId={hoveredZoneId}
        onVehicleCheck={setVehicle}
        onClearVehicle={() => {
          setVehicle(null);
          setFilterMode("all");
        }}
        onFilterChange={setFilterMode}
        onHoverZone={setHoveredZoneId}
        checkCompliance={checkCompliance}
        onZoneClick={(z) =>
          mapRef.current?.flyTo({
            center: [z.longitude, z.latitude],
            zoom: z.zoom,
            essential: true,
          })
        }
      />
    </div>
  );
};

export default App;
