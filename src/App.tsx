import { useState, useEffect, useRef, useMemo } from "react";
import Map, {
  Source,
  Layer,
  Popup,
  type MapMouseEvent,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  XMarkIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

// --- 1. Type Definitions ---
export interface Zone {
  id: string;
  name: string;
  type: string;
  ruleType?: string;
  status: "active" | "review" | "cancelled";
  url: string;
  color: string;
  price: string;
  payment_link: string;
  description: string;
  // Dynamic viewport fields from JSON
  longitude: number;
  latitude: number;
  zoom: number;
}

interface VehicleDetails {
  registration: string;
  make: string;
  fuelType: string;
  year: number;
  euroStatus: string;
}

// --- 2. Helper Components ---
const ZoneBadge = ({ type, color }: { type: string; color: string }) => (
  <span
    className="text-[10px] uppercase font-bold text-white px-2 py-0.5 rounded-full tracking-wider shadow-sm"
    style={{ backgroundColor: color }}
  >
    {type.replace("-", " ")}
  </span>
);

const NumberPlateInput = ({
  onVehicleCheck,
}: {
  onVehicleCheck: (v: VehicleDetails | null) => void;
}) => {
  const [vrm, setVrm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vrm || loading) return;
    setLoading(true);
    setError(null);
    try {
      const checkVehicle = httpsCallable(functions, "checkVehicle");
      const result = await checkVehicle({ registration: vrm });
      onVehicleCheck(result.data as VehicleDetails);
    } catch (err: any) {
      setError("Vehicle not found");
      onVehicleCheck(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <form
        onSubmit={handleSearch}
        className="flex items-center w-full bg-[#fcd116] rounded-xl border-2 border-black/5 shadow-sm overflow-hidden h-12"
      >
        {/* Blue GB Strip */}
        <div className="h-full w-7 bg-[#003399] flex flex-col items-center justify-center shrink-0">
          <span className="text-[7px] font-bold text-white leading-none">
            UK
          </span>
        </div>

        {/* Input - Added pr-2 and adjusted font size for mobile compatibility */}
        <input
          type="text"
          value={vrm}
          onChange={(e) =>
            setVrm(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
          }
          placeholder="ENTER REG"
          className="flex-1 min-w-0 bg-[#fcd116] text-black font-mono text-lg font-bold uppercase placeholder-black/20 outline-none px-2 tracking-wider text-center h-full"
          maxLength={8}
        />

        {/* Submit Button - Added min-width and distinct background for visibility */}
        <button
          type="submit"
          disabled={loading}
          className="h-full w-12 bg-black/10 hover:bg-black/20 flex items-center justify-center shrink-0 border-l border-black/5 transition-all active:scale-95"
          aria-label="Search"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <MagnifyingGlassIcon className="w-6 h-6 text-black/70" />
          )}
        </button>
      </form>

      {error && (
        <div className="mt-2 text-center text-[11px] font-bold text-rose-600 bg-rose-50 py-1 rounded-lg border border-rose-100 animate-pulse">
          {error}
        </div>
      )}
    </div>
  );
};

// --- 3. Compliance Logic ---
const checkCompliance = (vehicle: VehicleDetails, zone: Zone): boolean => {
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
};

const App = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const mapRef = useRef<MapRef>(null);

  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [showEligibleOnly, setShowEligibleOnly] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // NEW: Toolbar Toggle

  const [popupData, setPopupData] = useState<any>(null);
  const [selectedZoneInPopup, setSelectedZoneInPopup] = useState<Zone | null>(
    null,
  );
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    fetch("/data/zones.json")
      .then((r) => r.json())
      .then(setZones)
      .catch(console.error);
  }, []);

  const handleClearVehicle = () => {
    setVehicle(null);
    setShowEligibleOnly(false);
    // On mobile, keep it compact after clearing
    if (window.innerWidth < 768) setIsExpanded(false);
  };

  const getPriority = (type: string) => {
    const p: { [key: string]: number } = {
      congestion: 10,
      "congestion-charge": 10,
      zez: 5,
      caz: 4,
      lez: 2,
      ulez: 1,
    };
    return p[type] || 0;
  };

  const visibleZones = useMemo(() => {
    let filtered = [...zones];
    if (showEligibleOnly && vehicle) {
      filtered = filtered.filter((zone) => checkCompliance(vehicle, zone));
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [zones, showEligibleOnly, vehicle]);

  const getZonesFromFeatures = (event: MapMouseEvent) => {
    if (!event.features?.length) return [];
    const uniqueZoneIds = new Set<string>();
    event.features.forEach((f) => {
      if (f.layer!.id.includes("-fill"))
        uniqueZoneIds.add(f.layer!.id.replace("-fill", ""));
    });
    return Array.from(uniqueZoneIds)
      .map((id) => visibleZones.find((z) => z.id === id))
      .filter((z): z is Zone => !!z)
      .sort((a, b) => getPriority(b.type) - getPriority(a.type));
  };

  const closePopup = () => {
    setPopupData(null);
    setSelectedZoneInPopup(null);
  };

  return (
    <div className="w-full h-screen relative font-sans bg-gray-50">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: -1.5, latitude: 53.0, zoom: 5.5 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/williamd47/cmli1837u000k01sef6ej67ms"
        mapboxAccessToken={MAPBOX_TOKEN}
        interactiveLayerIds={visibleZones.map((z) => `${z.id}-fill`)}
        onClick={(e) => {
          const found = getZonesFromFeatures(e);
          if (found.length > 0) {
            setPopupData({
              longitude: e.lngLat.lng,
              latitude: e.lngLat.lat,
              foundZones: found,
            });
            setSelectedZoneInPopup(found[0]);
          }
        }}
        cursor={hoveredZoneId ? "pointer" : "auto"}
        onMouseEnter={(e) => {
          if (e.features?.[0])
            setHoveredZoneId(e.features[0].layer!.id.replace("-fill", ""));
        }}
        onMouseLeave={() => setHoveredZoneId(null)}
      >
        {visibleZones.map((zone) => {
          let renderColor = zone.color;
          let opacity = hoveredZoneId === zone.id ? 0.6 : 0.25;
          if (vehicle) {
            const isCompliant = checkCompliance(vehicle, zone);
            if (!isCompliant) {
              renderColor = "#DC2626";
              opacity = 0.4;
            } else {
              renderColor = "#10B981";
            }
          }
          return (
            <Source key={zone.id} id={zone.id} type="geojson" data={zone.url}>
              <Layer
                id={`${zone.id}-fill`}
                type="fill"
                paint={{ "fill-color": renderColor, "fill-opacity": opacity }}
              />
              <Layer
                id={`${zone.id}-line`}
                type="line"
                paint={{
                  "line-color": renderColor,
                  "line-width": hoveredZoneId === zone.id ? 3 : 1.5,
                }}
              />
            </Source>
          );
        })}

        {popupData && (
          <Popup
            longitude={popupData.longitude}
            latitude={popupData.latitude}
            anchor="bottom"
            onClose={closePopup}
            closeButton={false}
            closeOnClick={false}
            className="z-50"
            maxWidth="320px"
            offset={15}
          >
            {/* Main Container - Rounded corners match the CSS override */}
            <div className="relative overflow-hidden bg-white rounded-2xl">
              {/* Custom Close Button - Better positioning for flush design */}
              <button
                onClick={closePopup}
                className="absolute top-3 right-3 p-1.5 bg-black/10 hover:bg-black/20 backdrop-blur-md rounded-full text-white transition-all z-30"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>

              {/* VIEW 1: MULTIPLE ZONES LIST */}
              {popupData.foundZones.length > 1 &&
                selectedZoneInPopup === null && (
                  <div className="pt-5 pb-4 px-4">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                        {popupData.foundZones.length} Areas Found
                      </span>
                    </div>
                    <div className="space-y-2">
                      {popupData.foundZones.map((zone: any) => (
                        <button
                          key={zone.id}
                          onClick={() => setSelectedZoneInPopup(zone)}
                          className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-1 h-8 rounded-full"
                              style={{ backgroundColor: zone.color }}
                            ></div>
                            <div className="flex flex-col">
                              <h4 className="text-sm font-bold text-slate-800">
                                {zone.name}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-medium uppercase">
                                {zone.type}
                              </span>
                            </div>
                          </div>
                          <ChevronLeftIcon className="w-4 h-4 text-slate-300 rotate-180" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* VIEW 2: ZONE DETAIL */}
              {selectedZoneInPopup && (
                <div className="flex flex-col">
                  {/* Flush Header */}
                  <div className="relative h-20 w-full flex items-end p-4 overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{ backgroundColor: selectedZoneInPopup.color }}
                    />
                    {/* Animated-style gradient overlay */}
                    <div className="absolute inset-0 bg-linear-to-t from-white via-transparent to-transparent" />

                    <div className="relative z-10 flex items-center gap-2 w-full justify-between">
                      <div className="flex items-center gap-2">
                        {popupData.foundZones.length > 1 && (
                          <button
                            onClick={() => setSelectedZoneInPopup(null)}
                            className="p-1 -ml-1 bg-white/50 backdrop-blur-sm rounded-lg hover:bg-white transition-colors"
                          >
                            <ChevronLeftIcon className="w-4 h-4 text-slate-700" />
                          </button>
                        )}
                        <ZoneBadge
                          type={selectedZoneInPopup.type}
                          color={selectedZoneInPopup.color}
                        />
                      </div>

                      {!vehicle && (
                        <span className="font-mono font-black text-slate-700 text-[11px] bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-100">
                          {selectedZoneInPopup.price}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="px-5 pb-5 pt-2">
                    <h3 className="text-xl font-black text-slate-900 leading-none mb-3 tracking-tight">
                      {selectedZoneInPopup.name}
                    </h3>

                    {vehicle ? (
                      <div
                        className={`mb-5 rounded-2xl p-4 border-2 ${
                          checkCompliance(vehicle, selectedZoneInPopup)
                            ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                            : "bg-rose-50/50 border-rose-100 text-rose-900"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-black text-[11px] mb-1.5 uppercase tracking-widest">
                          {checkCompliance(vehicle, selectedZoneInPopup) ? (
                            <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <XCircleIcon className="w-5 h-5 text-rose-500" />
                          )}
                          {checkCompliance(vehicle, selectedZoneInPopup)
                            ? "Eligible / Free"
                            : "Daily Charge Applies"}
                        </div>
                        <p className="text-[12px] font-medium opacity-70 leading-relaxed">
                          {checkCompliance(vehicle, selectedZoneInPopup)
                            ? "Your vehicle meets standards."
                            : `Vehicle not compliant. Cost: ${selectedZoneInPopup.price}.`}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[13px] text-slate-500 font-medium leading-relaxed mb-6 italic">
                        {selectedZoneInPopup.description}
                      </p>
                    )}

                    {/* Action Button */}
                    {selectedZoneInPopup.status === "active" &&
                      selectedZoneInPopup.payment_link && (
                        <a
                          href={selectedZoneInPopup.payment_link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center w-full text-center text-xs font-black py-3.5 px-4 rounded-xl text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            backgroundColor: selectedZoneInPopup.color,
                            boxShadow: `0 10px 20px -10px ${selectedZoneInPopup.color}`,
                          }}
                        >
                          {vehicle
                            ? checkCompliance(vehicle, selectedZoneInPopup)
                              ? "VIEW RULES"
                              : `PAY ${selectedZoneInPopup.price} NOW`
                            : "CHECK VEHICLE OR PAY"}
                        </a>
                      )}
                  </div>
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>

      <div
        className={`
          absolute transition-all duration-300 ease-in-out
          top-4 left-1/2 -translate-x-1/2 w-[94%] max-w-sm
          md:left-4 md:translate-x-0 md:w-80
          bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20
          max-h-[85vh] flex flex-col z-200
        `}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              <span className="text-xl">🇬🇧</span> Emissions Map
            </h1>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="md:hidden p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ChevronDownIcon
                className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* 2. UPDATED INPUT (Adding key={vehicle?.registration} to force clear on reset) */}
          <NumberPlateInput
            key={vehicle ? vehicle.registration : "empty"}
            onVehicleCheck={(v) => {
              setVehicle(v);
              if (v) setIsExpanded(true);
            }}
          />

          {/* 3. UPDATED VEHICLE CARD WITH CLEAR BUTTON */}
          {vehicle && (
            <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
              <div className="flex-1 min-w-0 mr-2">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                  Active Vehicle
                </div>
                <div className="text-sm font-black text-slate-800 truncate">
                  {vehicle.make}
                  <span className="text-slate-400 font-mono text-xs ml-1 font-normal">
                    {vehicle.year}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg whitespace-nowrap">
                  {vehicle.euroStatus}
                </div>
                {/* CLEAR BUTTON */}
                <button
                  onClick={handleClearVehicle}
                  className="p-1.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors"
                  title="Clear Vehicle"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Expandable Section */}
        <div
          className={`
          overflow-y-auto scrollbar-hide px-4 pb-4
          ${isExpanded ? "block" : "hidden md:block"}
        `}
        >
          {/* Compliance Toggle */}
          {vehicle && (
            <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl mb-4 border border-emerald-100 shadow-sm">
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-black text-emerald-800 uppercase tracking-tight">
                  Hide Non-Compliant
                </span>
              </div>
              <button
                onClick={() => setShowEligibleOnly(!showEligibleOnly)}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${showEligibleOnly ? "bg-emerald-500" : "bg-slate-200"}`}
              >
                <span
                  className={`${showEligibleOnly ? "translate-x-5" : "translate-x-1"} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200`}
                />
              </button>
            </div>
          )}

          {/* Zone List */}
          <div className="space-y-1 mt-2">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">
              Available Zones
            </div>
            {visibleZones
              .slice()
              .map((zone) => {
                let StatusIcon = null;
                if (vehicle) {
                  const isCompliant = checkCompliance(vehicle, zone);
                  StatusIcon = isCompliant ? (
                    <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-rose-500" />
                  );
                }
                return (
                  <button
                    key={zone.id}
                    onMouseEnter={() => setHoveredZoneId(zone.id)}
                    onMouseLeave={() => setHoveredZoneId(null)}
                    className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all text-left border border-transparent ${
                      hoveredZoneId === zone.id
                        ? "bg-slate-100/50"
                        : "hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      mapRef.current?.flyTo({
                        center: [zone.longitude, zone.latitude],
                        zoom: zone.zoom,
                      });
                      if (window.innerWidth < 768) setIsExpanded(false); // Collapse on selection on mobile
                    }}
                  >
                    {StatusIcon ? (
                      StatusIcon
                    ) : (
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: zone.color }}
                      ></span>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-700 truncate">
                        {zone.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        {zone.price}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
