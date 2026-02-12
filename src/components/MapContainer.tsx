import { useState, useMemo } from "react";
import Map, {
  Source,
  Layer,
  type MapRef,
  type MapMouseEvent,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { ZonePopup } from "./ZonePopup";
import { type Zone, type VehicleDetails } from "../types";

// Helper to estimate zone "size" for sorting (approximate area)
// We just need a rough priority: Congestion/ZEZ (Small) > CAZ (Medium) > ULEZ/LEZ (Large)
const getZonePriority = (type: string) => {
  if (type.includes("congestion") || type.includes("zez")) return 3; // Smallest (Render last/top)
  if (type.includes("caz")) return 2; // Medium
  return 1; // Largest (Render first/bottom)
};

interface MapContainerProps {
  mapRef: React.RefObject<MapRef | null>;
  visibleZones: Zone[];
  vehicle: VehicleDetails | null;
  checkCompliance: (v: VehicleDetails, z: Zone) => boolean;
  onHoverZone: (id: string | null) => void;
  hoveredZoneId: string | null;
  routeGeoJSON: any;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const MapContainer = ({
  mapRef,
  visibleZones,
  vehicle,
  checkCompliance,
  onHoverZone,
  hoveredZoneId,
  routeGeoJSON,
}: MapContainerProps) => {
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const [popupData, setPopupData] = useState<{
    longitude: number;
    latitude: number;
    foundZones: Zone[];
  } | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  // 1. STABLE SORT: Always render Big -> Small
  // This ensures Congestion Charge (Small) is ALWAYS on top of ULEZ (Big)
  const sortedZones = useMemo(() => {
    return [...visibleZones].sort(
      (a, b) => getZonePriority(a.type) - getZonePriority(b.type),
    );
  }, [visibleZones]);

  const handleMapClick = (e: MapMouseEvent) => {
    if (!e.features?.length) {
      setPopupData(null);
      return;
    }
    const uniqueZoneIds = new Set<string>();
    e.features.forEach((f) => {
      if (f.layer?.id.includes("-fill")) {
        uniqueZoneIds.add(f.layer.id.replace("-fill", ""));
      }
    });
    const found = visibleZones.filter((z) => uniqueZoneIds.has(z.id));

    if (found.length > 0) {
      setPopupData({
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        foundZones: found,
      });
      setSelectedZone(found[0]);
    } else {
      setPopupData(null);
    }
  };

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: -1.5, latitude: 53.0, zoom: 5.5 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/williamd47/cmli1837u000k01sef6ej67ms"
      mapboxAccessToken={MAPBOX_TOKEN}
      interactiveLayerIds={sortedZones.map((z) => `${z.id}-fill`)}
      onLoad={() => setIsStyleLoaded(true)}
      onMouseEnter={(e) => {
        if (e.features?.[0])
          onHoverZone(e.features[0].layer!.id.replace("-fill", ""));
      }}
      onMouseLeave={() => onHoverZone(null)}
      cursor={hoveredZoneId ? "pointer" : "auto"}
      onClick={handleMapClick}
      reuseMaps
    >
      {/* 2. RENDER LOOP: Just map through the pre-sorted list. No hover flickering. */}
      {isStyleLoaded &&
        sortedZones.map((zone) => {
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

      {routeGeoJSON && (
        <Source id="route-source" type="geojson" data={routeGeoJSON}>
          <Layer
            id="route-line"
            type="line"
            layout={{
              "line-join": "round",
              "line-cap": "round",
            }}
            paint={{
              "line-color": "#3b82f6", // Blue
              "line-width": 5,
              "line-opacity": 0.8,
            }}
            // Ensure the route is drawn BELOW the zones if you prefer, or ABOVE.
            // Putting it here draws it ON TOP of the zones.
          />
        </Source>
      )}

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
  );
};

export default MapContainer;
