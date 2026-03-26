import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function CalendarConnect() {
  const handleCalendarConnect = () => {
    // This would typically open Google Calendar OAuth flow
    // For now, we'll show instructions
    window.open("https://calendar.google.com", "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 elevation-3 text-white"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Calendar className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold mb-2">Sync with Google Calendar</h3>
          <p className="text-indigo-100 text-sm mb-4">
            Connect your Google Calendar to automatically sync inspection dates and receive reminders.
          </p>
          <Button
            onClick={handleCalendarConnect}
            className="bg-white text-indigo-600 hover:bg-indigo-50 ripple"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Connect Calendar
          </Button>
        </div>
      </div>
    </motion.div>
  );
}