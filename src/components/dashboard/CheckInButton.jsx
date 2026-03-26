import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is used

export default function CheckInButton({
  inspection,
  currentUser,
  activeAttendance = {},
  onCheckIn,
  onCheckOut,
  compact = false
}) {
  const [loading, setLoading] = useState(false);

  // Check if currently checked in
  const attendanceRecord = activeAttendance[inspection.id];
  const isCheckedIn = !!attendanceRecord;

  const handleClick = async (e) => {
    e.stopPropagation();

    if (loading) return;
    setLoading(true);

    try {
      if (isCheckedIn) {
        await onCheckOut(inspection.id);
        toast.success("Checked out successfully");
      } else {
        await onCheckIn(inspection.id);
        toast.success("Checked in successfully");
      }
    } catch (error) {
      console.error("Attendance action failed:", error);
      toast.error("Action failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // If compact (for table), show just icon
  if (compact) {
    return (
      <Button
        variant={isCheckedIn ? "destructive" : "default"} // Red if checked in (to logout), Blue/Green if out (to login)
        size="icon"
        className={`h-8 w-8 ${isCheckedIn ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
        onClick={handleClick}
        disabled={loading}
        title={isCheckedIn ? "Check Out" : "Check In"}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isCheckedIn ? (
          <LogOut className="w-4 h-4" />
        ) : (
          <LogIn className="w-4 h-4" />
        )}
      </Button>
    );
  }

  // Full button (for details view etc)
  return (
    <Button
      variant={isCheckedIn ? "destructive" : "default"}
      className={isCheckedIn ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : isCheckedIn ? (
        <LogOut className="w-4 h-4 mr-2" />
      ) : (
        <LogIn className="w-4 h-4 mr-2" />
      )}
      {isCheckedIn ? "Check Out" : "Check In"}
    </Button>
  );
}