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
import bbox from "@turf/bbox"; // Optional: To zoom to route

// 1. DYNAMIC IMPORT
const MapContainer = lazy(() => import("./components/MapContainer"));

const App = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const mapRef = useRef<MapRef>(null);

  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [filterMode, setFilterMode] = useState<
    "all" | "compliant" | "non-compliant"
  >("all");
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  
  // NEW: State to hold the calculated route line
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);

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

  // NEW: Handler for when a route is found
  const handleRouteFound = (geoJson: any) => {
    setRouteGeoJSON(geoJson);

    // Optional: Fly the map to fit the new route
    if (geoJson && mapRef.current) {
      // Calculate bounding box of the route to zoom nicely
      // You might need to install @turf/bbox: npm install @turf/bbox
       try {
         const [minLng, minLat, maxLng, maxLat] = bbox(geoJson);
         mapRef.current.fitBounds(
           [[minLng, minLat], [maxLng, maxLat]],
           { padding: 50, duration: 1000 }
         );
       } catch (e) {
         console.log("Could not fit bounds", e);
       }
    }
  };

  return (
    <div className="w-full h-screen relative font-sans bg-gray-50 text-slate-900 overflow-hidden">
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
          // PASS THE ROUTE DATA DOWN
          routeGeoJSON={routeGeoJSON}
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
          setRouteGeoJSON(null); // Clear route when clearing vehicle
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
        // PASS THE HANDLER DOWN
        onRouteFound={handleRouteFound}
      />
    </div>
  );
};

export default App;