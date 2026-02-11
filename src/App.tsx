import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Map, { Source, Layer, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import { ZoneToolbar } from "./components/ZoneToolbar";
import { ZonePopup } from "./components/ZonePopup";
import { type Zone, type VehicleDetails } from "./types";

const App = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const mapRef = useRef<MapRef>(null);
  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [filterMode, setFilterMode] = useState<
    "all" | "compliant" | "non-compliant"
  >("all");
  const [popupData, setPopupData] = useState<any>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    fetch("/data/zones.json")
      .then((r) => r.json())
      .then(setZones)
      .catch(console.error);
  }, []);

  // COMPLIANCE LOGIC
  const checkCompliance = useCallback(
    (vehicle: VehicleDetails, zone: Zone): boolean => {
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
    },
    [],
  );

  // VISIBLE ZONES
  const visibleZones = useMemo(() => {
    let filtered = [...zones];

    if (vehicle) {
      if (filterMode === "compliant") {
        filtered = filtered.filter((zone) => checkCompliance(vehicle, zone));
      } else if (filterMode === "non-compliant") {
        filtered = filtered.filter((zone) => !checkCompliance(vehicle, zone));
      }
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [zones, filterMode, vehicle, checkCompliance]);

  return (
    <div className="w-full h-screen relative font-sans bg-gray-50 text-slate-900 overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: -1.5, latitude: 53.0, zoom: 5.5 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/williamd47/cmli1837u000k01sef6ej67ms"
        mapboxAccessToken={MAPBOX_TOKEN}
        interactiveLayerIds={visibleZones.map((z) => `${z.id}-fill`)}
        onMouseEnter={(e) => {
          if (e.features?.[0])
            setHoveredZoneId(e.features[0].layer!.id.replace("-fill", ""));
        }}
        onMouseLeave={() => setHoveredZoneId(null)}
        cursor={hoveredZoneId ? "pointer" : "auto"}
        onClick={(e) => {
          const ids = new Set(
            e.features?.map((f) => f.layer!.id.replace("-fill", "")),
          );
          const found = visibleZones.filter((z) => ids.has(z.id));
          if (found.length > 0) {
            setPopupData({
              longitude: e.lngLat.lng,
              latitude: e.lngLat.lat,
              foundZones: found,
            });
            setSelectedZone(found[0]);
          }
        }}
      >
        {visibleZones.map((zone) => {
          let color = zone.color;
          let opacity = hoveredZoneId === zone.id ? 0.6 : 0.25;
          if (vehicle) {
            const compliant = checkCompliance(vehicle, zone);
            color = compliant ? "#10B981" : "#DC2626";
            opacity = compliant ? 0.25 : 0.4;
          }
          return (
            <Source key={zone.id} id={zone.id} type="geojson" data={zone.url}>
              <Layer
                id={`${zone.id}-fill`}
                type="fill"
                paint={{ "fill-color": color, "fill-opacity": opacity }}
              />
              <Layer
                id={`${zone.id}-line`}
                type="line"
                paint={{ "line-color": color, "line-width": 1.5 }}
              />
            </Source>
          );
        })}

        <ZonePopup
          popupData={popupData}
          selectedZone={selectedZone}
          vehicle={vehicle}
          onClose={() => {
            setPopupData(null);
            setSelectedZone(null);
          }}
          onSelectZone={setSelectedZone}
          checkCompliance={checkCompliance}
        />
      </Map>

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
