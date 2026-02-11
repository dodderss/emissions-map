# 🇬🇧 UK Emissions Map

An interactive, responsive mapping application designed to help UK drivers navigate Clean Air Zones (CAZ), Low Emission Zones (LEZ), Ultra Low Emission Zones (ULEZ), and Zero Emission Zones (ZEZ).

## 🚀 Features

  * **Live Vehicle Compliance:** Enter a UK registration number to instantly check if a vehicle is compliant with any specific zone.
  * **Dynamic UI:** Custom-styled UK number plate input with real-time feedback.
  * **Intelligent Filtering:** Toggle "Hide Non-Compliant Zones" to see exactly where you can drive for free.
  * **Responsive Design:** Optimized for mobile (iPhone 15 tested) with a centered, expandable dock and desktop-side toolbar.
  * **Interactive Mapbox Integration:** High-performance rendering of GeoJSON zone boundaries with alphabetical sorting and smart layer stacking.
  * **Secure API Handling:** DVLA API lookups are handled via Firebase Gen 2 Cloud Functions to keep API keys hidden and prevent CORS issues.

## 🛠 Tech Stack

  * **Frontend:** React, TypeScript, Vite
  * **Mapping:** `react-map-gl` (Mapbox)
  * **Styling:** Tailwind CSS, Headless UI, Heroicons
  * **Backend:** Firebase Functions (Gen 2 / Node.js)
  * **Data:** DVLA Vehicle Enquiry Service API
  * **Hosting:** Firebase Hosting

## 📦 Installation & Setup

### 1\. Clone the repository

```bash
git clone https://github.com/your-username/uk-emissions-map.git
cd uk-emissions-map
```

### 2\. Frontend Setup

Install dependencies and create a `.env` file for your Mapbox token.

```bash
npm install
echo "VITE_MAPBOX_TOKEN=your_mapbox_public_token" > .env
```

### 3\. Firebase Functions Setup

Navigate to the functions directory, install dependencies, and set your DVLA secret.

```bash
cd functions
npm install
firebase functions:secrets:set DVLA_API_KEY # Enter your DVLA API Key when prompted
```

### 4\. Deploy

```bash
firebase deploy
```

## 📂 Project Structure

  * `/src`: React components and application logic.
      * `App.tsx`: The main map controller and compliance logic.
      * `firebase.ts`: Firebase SDK initialization.
  * `/functions`: Node.js Firebase Gen 2 logic for secure DVLA API calls.
  * `/public/data`: GeoJSON boundary files and `zones.json` configuration.

## 🚦 Compliance Logic

The app derives compliance based on the following UK standards:

  * **Euro 4/6 (ULEZ/CAZ):** Generally Petrol vehicles registered after 2006 and Diesel vehicles after September 2015.
  * **Congestion/ZEZ:** Strictly limited to 100% Zero-Emission (Electric) vehicles.
  * **Exempt Zones:** Logic to handle Class B/C zones where private cars are exempt regardless of emissions.

## 🛡 License

Distributed under the MIT License. See `LICENSE` for more information.