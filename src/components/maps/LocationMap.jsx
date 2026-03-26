import React from 'react';

export default function LocationMap({ center, markers = [], zoom = 13, height = "300px" }) {
  // Use the first marker if no center provided
  const mapCenter = center || (markers.length > 0 ? [markers[0].lat, markers[0].lng] : [25.2048, 55.2708]);

  const lat = mapCenter[0];
  const lng = mapCenter[1];

  // Use OpenStreetMap-based static map service (no API key required)
  // Format: https://www.openstreetmap.org/export/embed.html?bbox=LEFT,BOTTOM,RIGHT,TOP&layer=mapnik&marker=LAT,LON
  const delta = 0.01; // Zoom level approximation
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height }}>
      <iframe
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        title="Location Map"
        src={mapUrl}
      />
    </div>
  );
}