# UK Emissions Map

An interactive, responsive mapping application designed to help UK drivers navigate Clean Air Zones (CAZ), Low Emission Zones (LEZ), Ultra Low Emission Zones (ULEZ), and Zero Emission Zones (ZEZ).

## Features

  * **Live Vehicle Compliance:** Enter a UK registration number to instantly check if a vehicle is compliant with any specific zone.
  * **Dynamic UI:** Custom-styled UK number plate input with real-time feedback.
  * **Intelligent Filtering:** Toggle "Hide Non-Compliant Zones" to see exactly where you can drive for free.
  * **Responsive Design:** Optimized for mobile (iPhone 15 tested) with a centered, expandable dock and desktop-side toolbar.
  * **Interactive Mapbox Integration:** High-performance rendering of GeoJSON zone boundaries with alphabetical sorting and smart layer stacking.
  * **Secure API Handling:** DVLA API lookups are handled via Firebase Gen 2 Cloud Functions to keep API keys hidden and prevent CORS issues.

## Tech Stack

  * **Frontend:** React, TypeScript, Vite
  * **Mapping:** `react-map-gl` (Mapbox)
  * **Styling:** Tailwind CSS, Headless UI, Heroicons
  * **Backend:** Firebase Functions (Gen 2 / Node.js)
  * **Data:** DVLA Vehicle Enquiry Service API
  * **Hosting:** Firebase Hosting

## Compliance Logic

The app derives compliance based on the following UK standards:

  * **Euro 4/6 (ULEZ/CAZ):** Generally Petrol vehicles registered after 2006 and Diesel vehicles after September 2015.
  * **Congestion/ZEZ:** Strictly limited to 100% Zero-Emission (Electric) vehicles.
  * **Exempt Zones:** Logic to handle Class B/C zones where private cars are exempt regardless of emissions.
