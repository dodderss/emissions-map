import { useState, useEffect, useRef } from "react";
import {
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MapPinIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import * as turf from "@turf/turf";
import { type Zone, type VehicleDetails } from "../types";

interface RouteCheckerProps {
  zones: Zone[];
  vehicle: VehicleDetails | null;
  onRouteFound: (routeGeoJSON: any) => void;
  checkCompliance: (v: VehicleDetails, z: Zone) => boolean;
  // NEW PROPS FOR STATE LIFTING
  origin: string;
  setOrigin: (val: string) => void;
  destination: string;
  setDestination: (val: string) => void;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// --- NEW: Autocomplete Input Component ---
interface LocationAutocompleteProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  icon?: React.ReactNode;
}

const LocationAutocomplete = ({
  placeholder,
  value,
  onChange,
  icon,
}: LocationAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions when typing (Debounced slightly)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (value.length > 2 && showSuggestions) {
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&country=gb`,
          );
          const data = await res.json();
          setSuggestions(data.features || []);
        } catch (err) {
          console.error("Autocomplete error", err);
        }
      } else if (value.length <= 2) {
        setSuggestions([]);
      }
    }, 300); // 300ms delay to save API calls

    return () => clearTimeout(timer);
  }, [value, showSuggestions]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="absolute left-3 top-3 text-slate-400">
        {icon || (
          <div className="w-2 h-2 rounded-full border-2 border-slate-400"></div>
        )}
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => {
          if (value.length > 2) setShowSuggestions(true);
        }}
        className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        autoComplete="off"
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {suggestions.map((place) => (
            <button
              key={place.id}
              onClick={() => {
                onChange(place.place_name); // Fill input with full name
                setShowSuggestions(false); // Hide dropdown
              }}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors flex items-center gap-3 group"
            >
              <div className="bg-slate-100 p-1.5 rounded-full group-hover:bg-blue-100 transition-colors">
                <MapPinIcon className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 truncate pr-2">
                  {place.text}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {place.place_name.replace(place.text + ", ", "")}
                </div>
              </div>
            </button>
          ))}
          <div className="bg-slate-50 px-3 py-1 text-[9px] font-bold text-right text-slate-400 tracking-widest uppercase">
            Mapbox
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Route Checker Component ---
export const RouteChecker = ({ 
  zones, 
  vehicle, 
  onRouteFound, 
  checkCompliance,
  origin,
  setOrigin,
  destination,
  setDestination
}: RouteCheckerProps) => {
  const [loading, setLoading] = useState(false);
  const [intersects, setIntersects] = useState<Zone[]>([]);
  const [routeData, setRouteData] = useState<any>(null);

  // Helper: Geocode
  const geocode = async (query: string) => {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    );
    const data = await res.json();
    return data.features?.[0]?.center;
  };

  const handleCheckRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;
    
    setLoading(true);
    setIntersects([]);
    setRouteData(null);
    onRouteFound(null);

    try {
      const startCoords = await geocode(origin);
      const endCoords = await geocode(destination);

      if (!startCoords || !endCoords) {
        alert("Could not find one of those locations.");
        setLoading(false);
        return;
      }

      const dirRes = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoords.join(",")};${endCoords.join(",")}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      const dirData = await dirRes.json();
      const route = dirData.routes?.[0];

      if (!route) {
        alert("No route found.");
        setLoading(false);
        return;
      }

      const routeLine = turf.lineString(route.geometry.coordinates);
      
      const checkPromises = zones.map(async (zone) => {
        try {
            const res = await fetch(zone.url);
            const geoJson = await res.json();
            let hits = false;
            turf.featureEach(geoJson, (feature) => {
                if (!hits && (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")) {
                    // @ts-ignore
                    if (turf.booleanIntersects(routeLine, feature)) hits = true;
                }
            });
            if (hits) return zone;
        } catch (err) {
            console.error("Failed to check zone", zone.name);
        }
        return null;
      });

      const results = await Promise.all(checkPromises);
      const validHits = results.filter((z): z is Zone => z !== null);

      setIntersects(validHits);
      setRouteData({
        duration: Math.round(route.duration / 60),
        distance: (route.distance / 1609.34).toFixed(1)
      });

      onRouteFound({
        type: "Feature",
        properties: {},
        geometry: route.geometry
      });

    } catch (err) {
      console.error(err);
      alert("Error calculating route");
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Helper for description text ---
  const getActionDescription = (zone: Zone, isCompliant: boolean | null) => {
    if (isCompliant === null) return "Enter your registration to check compliance.";
    
    if (isCompliant) {
        return "Allowed. Your vehicle meets the emission standards for this zone.";
    }
    
    // Check if it's a "Ban" type (usually indicated by 'Fine' in price)
    if (zone.price.toLowerCase().includes("fine")) {
        return "Strict Ban. Non-compliant vehicles cannot enter (Penalty applies).";
    }

    return `Charge Applies. You must pay the daily charge of ${zone.price}.`;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <form onSubmit={handleCheckRoute} className="space-y-3 mb-6">
        <LocationAutocomplete 
          label="Start"
          placeholder="Start Location"
          value={origin}
          onChange={setOrigin}
        />
        <LocationAutocomplete 
          label="End"
          placeholder="Destination"
          value={destination}
          onChange={setDestination}
          icon={<MapPinIcon className="w-3 h-3 text-rose-500" />}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
        >
          {loading ? "Calculating..." : <><ArrowRightIcon className="w-4 h-4" /> Check Route</>}
        </button>
      </form>

      {routeData && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex justify-between items-center mb-4 text-xs font-bold text-slate-500 border-b border-slate-200 pb-2">
            <span>{routeData.distance} miles</span>
            <span>~{routeData.duration} mins</span>
          </div>

          {intersects.length === 0 ? (
            <div className="flex flex-col items-center py-4 text-center">
              <CheckCircleIcon className="w-10 h-10 text-emerald-500 mb-2" />
              <h3 className="font-black text-slate-900">Clear Route!</h3>
              <p className="text-xs text-slate-500 mt-1">This route does not pass through any known zones.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-rose-600 font-black text-xs uppercase tracking-widest mb-3">
                <ExclamationTriangleIcon className="w-4 h-4" />
                Zones on Route
              </div>
              <div className="space-y-3">
                {intersects.map(zone => {
                  const isCompliant = vehicle ? checkCompliance(vehicle, zone) : null;
                  const description = getActionDescription(zone, isCompliant);

                  return (
                    <div key={zone.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-slate-300">
                      {/* Top Row: Name and Price */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-xs font-bold text-slate-800">{zone.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{zone.type}</div>
                        </div>
                        <div className={`text-[10px] font-black px-2 py-1 rounded ${isCompliant ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                           {vehicle ? (isCompliant ? 'FREE' : zone.price) : zone.price}
                        </div>
                      </div>

                      {/* Bottom Row: Action Description */}
                      <div className="flex gap-2 items-start pt-2 border-t border-slate-50">
                        <InformationCircleIcon className={`w-3 h-3 mt-0.5 shrink-0 ${isCompliant ? 'text-emerald-500' : 'text-rose-500'}`} />
                        <p className="text-[11px] font-medium text-slate-600 leading-tight">
                          {description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};