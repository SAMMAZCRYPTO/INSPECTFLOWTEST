import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Clock, Calendar, Navigation, User } from "lucide-react";
import { format } from "date-fns";
import LocationMap from "../maps/LocationMap";

export default function AttendanceDialog({ inspection, isOpen, onClose }) {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [locationType, setLocationType] = useState('check_in'); // 'check_in' or 'check_out'

  // Helper to parse PostGIS POINT string or GeoJSON object
  const parseCoordinates = (coords) => {
    console.log("Parsing coordinates:", coords, "Type:", typeof coords);

    if (!coords) return null;

    try {
      // If it's already an object with x/y or longitude/latitude
      if (typeof coords === 'object') {
        if (coords.coordinates && Array.isArray(coords.coordinates)) {
          // GeoJSON format: { type: "Point", coordinates: [lng, lat] }
          return {
            lng: coords.coordinates[0],
            lat: coords.coordinates[1]
          };
        }
        if (coords.x !== undefined && coords.y !== undefined) {
          // PostGIS Point object format: { x: lng, y: lat }
          return {
            lng: coords.x,
            lat: coords.y
          };
        }
        if (coords.lng !== undefined && coords.lat !== undefined) {
          // Already in correct format
          return coords;
        }
      }

      // If it's a string, parse PostGIS POINT format
      if (typeof coords === 'string') {
        // Format: POINT(lng lat)
        const match = coords.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
        if (match) {
          const result = {
            lng: parseFloat(match[1]),
            lat: parseFloat(match[2])
          };
          console.log("Parsed POINT string to:", result);
          return result;
        }
      }
    } catch (e) {
      console.error("Error parsing coordinates:", e);
    }
    return null;
  };

  // Fetch attendance records for this inspection
  const { data: attendanceRecords = [], isLoading } = useQuery({
    queryKey: ["attendance", inspection?.id],
    queryFn: async () => {
      if (!inspection?.id) return [];
      try {
        // Call RPC function that converts PostGIS geometry to text
        const { data, error } = await supabase.rpc('get_inspection_attendance', {
          p_inspection_id: inspection.id
        });

        if (error) throw error;

        console.log("RPC returned data:", data);
        if (data && data.length > 0) {
          console.log("First record:", data[0]);
          console.log("Check-in coords text:", data[0].check_in_coordinates_text);
          console.log("Check-out coords text:", data[0].check_out_coordinates_text);
        }

        return data || [];
      } catch (e) {
        console.error("Error fetching attendance:", e);
        return [];
      }
    },
    enabled: !!inspection?.id && isOpen,
  });

  // Calculate markers for the map based on selected location type
  const getMarkers = () => {
    const markers = [];
    const recordToUse = selectedRecord || attendanceRecords[0];

    if (recordToUse) {
      if (locationType === 'check_in') {
        // Show check-in location
        const checkInCoords = parseCoordinates(recordToUse.check_in_coordinates_text);
        if (checkInCoords) {
          markers.push({
            lat: checkInCoords.lat,
            lng: checkInCoords.lng,
            title: `Check In: ${recordToUse.inspector_name || 'Inspector'}`,
            description: format(new Date(recordToUse.check_in_time), "MMM d, h:mm a")
          });
        }
      } else if (locationType === 'check_out' && recordToUse.check_out_coordinates_text) {
        // Show check-out location
        const checkOutCoords = parseCoordinates(recordToUse.check_out_coordinates_text);
        if (checkOutCoords) {
          markers.push({
            lat: checkOutCoords.lat,
            lng: checkOutCoords.lng,
            title: `Check Out: ${recordToUse.inspector_name || 'Inspector'}`,
            description: format(new Date(recordToUse.check_out_time), "MMM d, h:mm a")
          });
        }
      }
    }

    return markers;
  };

  const markers = getMarkers();
  const mapCenter = markers.length > 0 ? [markers[0].lat, markers[0].lng] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            Attendance & Location Details
          </DialogTitle>
          <DialogDescription>
            PO: {inspection?.po_number} • Notification: {inspection?.notification_number}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-6 mt-4 h-full overflow-hidden">
          {/* Left Side: List of Records */}
          <div className="w-full md:w-1/3 flex flex-col h-[500px]">
            <h3 className="font-semibold text-gray-900 mb-2 px-1">Check-in History</h3>
            <ScrollArea className="flex-1 pr-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                  <p className="font-medium">No attendance records found.</p>
                  <p className="text-sm mt-1">Check in first to create location records.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attendanceRecords.map((record) => (
                    <Card
                      key={record.id}
                      className={`p-3 cursor-pointer transition-all hover:shadow-md ${selectedRecord?.id === record.id ? 'border-indigo-500 bg-indigo-50' : ''}`}
                      onClick={() => setSelectedRecord(record)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-gray-500" />
                          <span className="text-sm font-medium">{record.inspector_name}</span>
                        </div>
                        <Badge variant={record.status === 'checked_in' ? 'default' : 'secondary'} className="text-[10px]">
                          {record.status === 'checked_in' ? 'Active' : 'Completed'}
                        </Badge>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Clock className="w-3 h-3 text-green-600" />
                          <span className="font-medium">In:</span>
                          {format(new Date(record.check_in_time), "MMM d, h:mm a")}
                        </div>

                        {record.check_out_time && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Clock className="w-3 h-3 text-red-600" />
                            <span className="font-medium">Out:</span>
                            {format(new Date(record.check_out_time), "MMM d, h:mm a")}
                          </div>
                        )}

                        {record.distance_from_site !== undefined && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100">
                            <Navigation className="w-3 h-3 text-blue-500" />
                            <span>Distance: {(record.distance_from_site / 1000).toFixed(2)} km from site</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Side: Map */}
          <div className="w-full md:w-2/3 flex flex-col h-[500px]">
            <div className="mb-2 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Location Map</h3>
              <div className="flex gap-2">
                {selectedRecord && (
                  <>
                    <button
                      onClick={() => setLocationType('check_in')}
                      className={`px-3 py-1 text-xs font-medium rounded ${locationType === 'check_in'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      Check-In
                    </button>
                    {selectedRecord.check_out_coordinates_text && (
                      <button
                        onClick={() => setLocationType('check_out')}
                        className={`px-3 py-1 text-xs font-medium rounded ${locationType === 'check_out'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        Check-Out
                      </button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(null)} className="text-xs h-6">
                      Reset View
                    </Button>
                  </>
                )}
              </div>
            </div>

            {mapCenter ? (
              <LocationMap
                center={mapCenter}
                markers={markers}
                zoom={13}
                height="100%"
              />
            ) : (
              <div className="flex-1 bg-gray-100 rounded-lg flex items-center justify-center border text-gray-500">
                No location data available to display on map
              </div>
            )}

            <div className="mt-3 text-xs text-gray-500">
              <p>Showing location for: {locationType === 'check_in' ? 'Check-In' : 'Check-Out'} {selectedRecord ? `(${format(new Date(selectedRecord.check_in_time), "MMM d")})` : "(Latest)"}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}