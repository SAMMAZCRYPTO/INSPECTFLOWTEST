import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import InspectorForm from "../components/inspectors/InspectorForm";
import InspectorCard from "../components/inspectors/InspectorCard";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

export default function Inspectors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInspector, setEditingInspector] = useState(null);
  const queryClient = useQueryClient();

  const { data: inspectors, isLoading: inspectorsLoading } = useQuery({
    queryKey: ["inspectors"],
    queryFn: () => base44.entities.Inspector.list("-created_at"),
    initialData: [],
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => base44.entities.InspectionReview.list(),
    initialData: [],
  });

  const { data: inspections, isLoading: inspectionsLoading } = useQuery({
    queryKey: ["inspections"],
    queryFn: () => base44.entities.Inspection.list(),
    initialData: [],
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ["tpiagencies"],
    queryFn: () => base44.entities.TPIAgency.list(),
    initialData: [],
  });

  const isLoading = inspectorsLoading || reviewsLoading || inspectionsLoading;

  const inspectorsWithStats = React.useMemo(() => {
    return inspectors.map(inspector => {
      const inspectorReviews = reviews.filter(r => r.inspector_id === inspector.id);
      const inspectorInspections = inspections.filter(i => i.assigned_inspector_id === inspector.id);

      let ratingSum = 0;
      let scoreSum = 0;
      let count = 0;

      inspectorReviews.forEach(r => {
        if (r.client_rating) {
          ratingSum += r.client_rating;
        }

        // Calculate a composite score for this review
        let reviewScore = 0;
        let components = 0;

        if (r.specification_compliance_score !== undefined) {
          reviewScore += r.specification_compliance_score;
          components++;
        }
        if (r.report_quality_score !== undefined) {
          reviewScore += r.report_quality_score;
          components++;
        }
        if (r.client_rating !== undefined) {
          reviewScore += (r.client_rating * 20); // Normalize 1-5 to 0-100
          components++;
        }

        if (components > 0) {
          scoreSum += (reviewScore / components);
          count++;
        }
      });

      return {
        ...inspector,
        stats: {
          totalInspections: inspectorInspections.length,
          avgRating: count > 0 ? (ratingSum / count) : 0,
          performanceScore: count > 0 ? (scoreSum / count) : 0,
          reviewCount: count
        }
      };
    });
  }, [inspectors, reviews, inspections]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log("Creating inspector with data:", data);
      const result = await base44.entities.Inspector.create(data);
      console.log("Inspector created successfully:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("onSuccess called with:", data);
      queryClient.invalidateQueries({ queryKey: ["inspectors"] });
      handleCloseForm();
      toast.success("Inspector added successfully!");
    },
    onError: (error) => {
      console.error("Error creating inspector:", error);
      toast.error("Failed to add inspector: " + (error.message || "Unknown error"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Inspector.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspectors"] });
      handleCloseForm();
      toast.success("Inspector updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating inspector:", error);
      toast.error("Failed to update inspector. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Inspector.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspectors"] });
    },
  });

  const handleEdit = (inspector) => {
    setEditingInspector(inspector);
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const handleSave = async (data) => {
    console.log("handleSave called with:", data);
    console.log("editingInspector:", editingInspector);
    try {
      // Sanitize data: convert empty strings to null for special field types
      const sanitizedData = {
        ...data,
        // Array field - must be null or valid array, not empty string
        specialization: data.specialization && data.specialization !== '' ? data.specialization : null,
        // UUID fields - must be null, not empty string
        tpi_agency_id: data.tpi_agency_id || null,
        user_id: data.user_id || null,
      };

      if (editingInspector) {
        console.log("Updating inspector...");
        const updateData = {
          ...sanitizedData, // Use sanitizedData as base to keep other sanitizations
          user_id: editingInspector.user_id, // Preserve user_id link
        };
        const result = await updateMutation.mutateAsync({ id: editingInspector.id, data: updateData });
        console.log("Update result:", result);
      } else {
        console.log("Creating new inspector...");
        const result = await createMutation.mutateAsync(sanitizedData);
        console.log("Create result:", result);
      }
    } catch (error) {
      console.error("Mutation error in handleSave:", error);
      toast.error("Error: " + (error.message || JSON.stringify(error)));
      throw error;
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingInspector(null);
  };

  const handleOpenNewForm = () => {
    setEditingInspector(null);
    setSearchQuery("");
    setIsFormOpen(true);
  };

  const exportToExcel = () => {
    const headers = [
      "Full Name",
      "Email",
      "Phone",
      "Company/Agency",
      "Specialization",
      "Certification Number",
      "Years of Experience",
      "Status",
      "Address",
      "CV Link",
      "Qualification Link",
      "Notes",
      "Created Date"
    ];

    const rows = filteredInspectors.map((inspector) => {
      return [
        inspector.full_name || "",
        inspector.email || "",
        inspector.phone || "",
        inspector.company || "",
        inspector.specialization || "",
        inspector.certification_number || "",
        inspector.years_of_experience || "",
        inspector.status || "",
        inspector.address || "",
        inspector.cv_url || "",
        inspector.qualification_url || "",
        inspector.notes || "",
        inspector.created_at ? format(parseISO(inspector.created_at), "yyyy-MM-dd") : ""
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inspectors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInspectors = inspectorsWithStats.filter((inspector) => {
    const query = searchQuery.toLowerCase();
    return (
      inspector.full_name?.toLowerCase().includes(query) ||
      inspector.email?.toLowerCase().includes(query) ||
      inspector.phone?.toLowerCase().includes(query) ||
      inspector.specialization?.toLowerCase().includes(query) ||
      inspector.company?.toLowerCase().includes(query) ||
      inspector.certification_number?.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: inspectorsWithStats.length,
    active: inspectorsWithStats.filter((i) => i.status === "active").length,
    inactive: inspectorsWithStats.filter((i) => i.status === "inactive").length,
    on_leave: inspectorsWithStats.filter((i) => i.status === "on_leave").length,
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Inspector Management
        </h1>
        <p className="text-gray-600">
          Manage inspector profiles, qualifications, and certifications
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 elevation-2"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">
                Total Inspectors
              </p>
              <h3 className="text-4xl font-bold text-gray-900 mb-1">
                {stats.total}
              </h3>
              <p className="text-sm text-gray-500">All registered</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center elevation-1">
              <Users className="w-7 h-7 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 elevation-2"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">
                Active
              </p>
              <h3 className="text-4xl font-bold text-gray-900 mb-1">
                {stats.active}
              </h3>
              <p className="text-sm text-gray-500">Available now</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center elevation-1">
              <Users className="w-7 h-7 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 elevation-2"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">
                On Leave
              </p>
              <h3 className="text-4xl font-bold text-gray-900 mb-1">
                {stats.on_leave}
              </h3>
              <p className="text-sm text-gray-500">Temporarily unavailable</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-600 flex items-center justify-center elevation-1">
              <Users className="w-7 h-7 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 elevation-2"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">
                Inactive
              </p>
              <h3 className="text-4xl font-bold text-gray-900 mb-1">
                {stats.inactive}
              </h3>
              <p className="text-sm text-gray-500">Not available</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center elevation-1">
              <Users className="w-7 h-7 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search, Export, and Add */}
      <div className="bg-white rounded-2xl p-6 elevation-2">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by name, email, specialization, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base border-2 focus:border-indigo-600 rounded-xl"
              autoComplete="off"
              name="inspector-search"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={exportToExcel}
              variant="outline"
              className="flex-1 sm:flex-none h-12 px-6 border-2"
              disabled={filteredInspectors.length === 0}
            >
              <Download className="w-5 h-5 mr-2" />
              Export
            </Button>
            <Button
              onClick={handleOpenNewForm}
              className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 h-12 px-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Inspector
            </Button>
          </div>
        </div>
      </div>

      {/* Inspectors Grid - Compact Cards */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading inspectors...</p>
        </div>
      ) : filteredInspectors.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center elevation-2">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {searchQuery ? "No inspectors found" : "No inspectors yet"}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? "Try adjusting your search query"
              : "Add your first inspector to get started"}
          </p>
          {!searchQuery && (
            <Button
              onClick={handleOpenNewForm}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Inspector
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-900">
            <span className="font-medium">💡 Tip:</span>
            <span>Click any inspector card to expand and view full details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredInspectors.map((inspector) => (
                <InspectorCard
                  key={inspector.id}
                  inspector={inspector}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  agencies={agencies}
                  queryClient={queryClient}
                />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInspector ? "Edit Inspector" : "Add New Inspector"}
            </DialogTitle>
          </DialogHeader>
          <InspectorForm
            key={editingInspector?.id || 'new'}
            inspector={editingInspector}
            onSave={handleSave}
            onCancel={handleCloseForm}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}