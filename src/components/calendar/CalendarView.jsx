import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, parseISO, addMonths, subMonths, isValid } from "date-fns";
import { Badge } from "@/components/ui/badge";

const statusColors = {
  received: "bg-gray-500",
  scheduled: "bg-blue-500",
  completed: "bg-green-500",
  finalized: "bg-purple-500",
  delayed: "bg-red-600",
};

// Helper function to safely parse dates
const safeParseDate = (dateString) => {
  if (!dateString) return null;
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    if (isValid(date)) {
      return date;
    }
    return null;
  } catch (error) {
    console.error("Date parsing error:", error);
    return null;
  }
};

export default function CalendarView({ inspections, onSelectInspection }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getInspectionsForDay = (day) => {
    return inspections.filter((inspection) => {
      if (!inspection.start_date) return false;
      
      const startDate = safeParseDate(inspection.start_date);
      if (!startDate) return false;
      
      if (inspection.end_date) {
        const endDate = safeParseDate(inspection.end_date);
        if (endDate) {
          try {
            return isWithinInterval(day, { start: startDate, end: endDate });
          } catch (error) {
            console.error("Date interval error:", error);
            return false;
          }
        }
      }
      
      try {
        return isSameDay(day, startDate);
      } catch (error) {
        console.error("Date comparison error:", error);
        return false;
      }
    });
  };

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <Card className="p-6 elevation-2">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={previousMonth}
            variant="outline"
            size="icon"
            className="elevation-1 hover:elevation-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            onClick={nextMonth}
            variant="outline"
            size="icon"
            className="elevation-1 hover:elevation-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-gray-600 py-2"
          >
            {day}
          </div>
        ))}

        {days.map((day) => {
          const dayInspections = getInspectionsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toString()}
              className={`min-h-24 p-2 border rounded-lg transition-all ${
                isToday
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="text-sm font-medium mb-1">
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayInspections.map((inspection, idx) => {
                  // Check for delay: Completed, No Report, 48h passed since end_date (or start_date)
                  let isDelayed = false;
                  if (inspection.status === "completed") {
                     const inspectionDateStr = inspection.end_date || inspection.start_date;
                     if (inspectionDateStr) {
                       const inspectionDate = safeParseDate(inspectionDateStr);
                       if (inspectionDate) {
                         const hoursDiff = (new Date() - inspectionDate) / (1000 * 60 * 60);
                         // Check if report submitted
                         const hasReport = inspection.inspection_reports && inspection.inspection_reports.length > 0;
                         if (!hasReport && hoursDiff > 48) {
                           isDelayed = true;
                         }
                       }
                     }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => onSelectInspection && onSelectInspection(inspection)}
                      className={`w-full text-left px-2 py-1 rounded text-xs font-medium text-white ${
                        isDelayed ? statusColors['delayed'] : statusColors[inspection.status]
                      } hover:opacity-80 transition-opacity truncate`}
                    >
                      {inspection.notification_number || "Inspection"}
                      {isDelayed && <span className="ml-1 font-bold">!</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-6 pt-6 border-t">
        <span className="text-sm font-medium text-gray-600">Legend:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-500" />
          <span className="text-sm text-gray-600">Received</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-sm text-gray-600">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-sm text-gray-600">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span className="text-sm text-gray-600">Finalized</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-600" />
          <span className="text-sm text-gray-600">Delayed (Report &gt;48h)</span>
        </div>
      </div>
    </Card>
  );
}