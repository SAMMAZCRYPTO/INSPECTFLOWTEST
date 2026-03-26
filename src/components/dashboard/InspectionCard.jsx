import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CheckInButton from "./CheckInButton";
import { base44 } from "@/api/base44Client";
import {
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  ExternalLink,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function InspectionCard({ inspection, onEdit }) {
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl p-6 elevation-2 hover:elevation-3 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-gray-900">
              {inspection.inspection_type || "Inspection"}
            </h3>
            <Badge className={`${statusColors[inspection.status]} border font-medium`}>
              {inspection.status?.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <FileText className="w-4 h-4" />
            Ref: {inspection.reference_number || "N/A"}
          </p>
        </div>
        {inspection.document_url && (
          <a
            href={inspection.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-gray-500" />
          </a>
        )}
      </div>

      <div className="space-y-3 mb-4">
        {inspection.property_address && (
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{inspection.property_address}</span>
          </div>
        )}

        {inspection.scheduled_date && (
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <span className="text-gray-700">
              {format(new Date(inspection.scheduled_date), "MMMM d, yyyy")}
              {inspection.scheduled_time && ` at ${inspection.scheduled_time}`}
            </span>
          </div>
        )}

        {inspection.inspector_name && (
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <span className="text-gray-700">{inspection.inspector_name}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {inspection.contact_phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{inspection.contact_phone}</span>
            </div>
          )}
          {inspection.contact_email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{inspection.contact_email}</span>
            </div>
          )}
        </div>
      </div>

      {inspection.requirements && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Requirements:</p>
          <p className="text-sm text-gray-600">{inspection.requirements}</p>
        </div>
      )}

      {inspection.notes && (
        <div className="bg-blue-50 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
          <p className="text-sm text-gray-600">{inspection.notes}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-4 border-t">
        <div className="flex gap-2">
          <Button
            onClick={() => onEdit(inspection)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 ripple"
          >
            Edit Details
          </Button>
        </div>
        <CheckInButton 
          inspection={inspection} 
          currentUser={currentUser} 
        />
      </div>
    </motion.div>
  );
}