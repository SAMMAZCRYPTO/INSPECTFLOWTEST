import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Phone,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Award,
  MapPin,
  Calendar,
  FileText,
  ExternalLink,
  Building2,
  Star,
  TrendingUp
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const statusColors = {
  active: "bg-green-100 text-green-800 border-green-200",
  inactive: "bg-red-100 text-red-800 border-red-200",
  on_leave: "bg-amber-100 text-amber-800 border-amber-200",
};

export default function InspectorCard({ inspector, onEdit, onDelete, agencies, queryClient }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${inspector.full_name}?`)) {
      onDelete(inspector.id);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(inspector);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
      className="bg-white rounded-xl elevation-2 hover:elevation-3 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Compact Header - Always Visible */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
              {inspector.full_name}
            </h3>
            <Badge className={`${statusColors[inspector.status]} border text-xs font-medium`}>
              {inspector.status?.replace("_", " ")}
            </Badge>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2 p-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Performance Stats - Always Visible if available */}
        {inspector.stats && (inspector.stats.reviewCount > 0 || inspector.stats.totalInspections > 0) && (
          <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-100">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Rating</span>
              <div className="flex items-center gap-1">
                <Star className={`w-4 h-4 ${inspector.stats.avgRating >= 4 ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                <span className="font-bold text-gray-900">{inspector.stats.avgRating > 0 ? inspector.stats.avgRating.toFixed(1) : "-"}</span>
              </div>
            </div>
            <div className="flex flex-col flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">Performance</span>
                <span className={`text-xs font-bold ${inspector.stats.performanceScore >= 90 ? "text-green-600" : inspector.stats.performanceScore >= 75 ? "text-amber-600" : "text-red-600"}`}>
                  {inspector.stats.performanceScore > 0 ? `${Math.round(inspector.stats.performanceScore)}%` : "-"}
                </span>
              </div>
              <Progress value={inspector.stats.performanceScore} className="h-1.5" />
            </div>
          </div>
        )}

        {/* Essential Info - Always Visible */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <a
              href={`mailto:${inspector.email}`}
              onClick={(e) => e.stopPropagation()}
              className="text-blue-600 hover:text-blue-700 hover:underline truncate"
            >
              {inspector.email}
            </a>
          </div>

          {inspector.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{inspector.phone}</span>
            </div>
          )}

          {inspector.specialization && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Award className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{inspector.specialization}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details - Show on Click/Hover */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200 bg-gray-50"
          >
            <div className="p-4 space-y-3">
              {/* Additional Details */}
              {inspector.company && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium">Company:</span>
                  <span className="truncate">{inspector.company}</span>
                </div>
              )}

              {inspector.certification_number && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Award className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium">Cert #:</span>
                  <span className="truncate">{inspector.certification_number}</span>
                </div>
              )}

              {inspector.years_of_experience && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium">Experience:</span>
                  <span>{inspector.years_of_experience} years</span>
                </div>
              )}

              {inspector.address && (
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">Address:</span>
                  <span className="flex-1">{inspector.address}</span>
                </div>
              )}

              {/* TPI Agency Selection */}
              <div className="pt-2 border-t border-gray-200">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
                  TPI Agency
                </Label>
                <Select
                  value={inspector.tpi_agency_id || "none"}
                  onValueChange={async (value) => {
                    try {
                      const { base44 } = await import("@/api/base44Client");
                      const { toast } = await import("sonner");

                      await base44.entities.Inspector.update(inspector.id, {
                        tpi_agency_id: value === "none" ? null : value
                      });
                      queryClient.invalidateQueries({ queryKey: ["inspectors"] });
                      toast.success("Inspector linked to agency");
                    } catch (error) {
                      console.error("Error updating inspector:", error);
                      const { toast } = await import("sonner");
                      toast.error("Failed to update inspector");
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select TPI Agency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {agencies.map((agency) => (
                      <SelectItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Documents */}
              {(inspector.cv_url || inspector.qualification_url) && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Documents
                  </p>
                  <div className="flex gap-2">
                    {inspector.cv_url && (
                      <a
                        href={inspector.cv_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        View CV
                      </a>
                    )}
                    {inspector.qualification_url && (
                      <a
                        href={inspector.qualification_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Certificate
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {inspector.notes && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-gray-700">{inspector.notes}</p>
                </div>
              )}

              {/* Created Date */}
              {inspector.created_at && (
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-200">
                  <Calendar className="w-3 h-3" />
                  Added on {format(parseISO(inspector.created_at), "MMM d, yyyy")}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <Button
                  onClick={handleEdit}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  size="sm"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}