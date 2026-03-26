import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Calendar as CalendarIconLucide,
  Table as TableIconLucide,
  Upload,
  Filter,
  X,
  AlertTriangle,
  FileWarning,
  ClipboardCheck,
} from "lucide-react";
import StatsCard from "../components/dashboard/StatsCard";
import CalendarView from "../components/calendar/CalendarView";
import InspectionTable from "../components/table/InspectionTable";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReviewForm from "../components/upload/ReviewForm";
import UploadZone from "../components/upload/UploadZone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import ReportsTab from "../components/reports/ReportsTab";
import FindingsTab from "../components/reports/FindingsTab";
import UploadReportsDialog from "../components/reports/UploadReportsDialog";
import { Badge } from "@/components/ui/badge"; // Added import
import { useProject } from "../components/context/ProjectContext";
import ChatWidget from "../components/chat/ChatWidget";
import AttendanceDialog from "../components/dashboard/AttendanceDialog";
import { toast } from "sonner";

export default function Dashboard() {
  const { selectedProjectId, currentProject } = useProject();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingInspection, setEditingInspection] = useState(null);
  const [viewingReportsInspection, setViewingReportsInspection] = useState(null);
  const [viewingLocationInspection, setViewingLocationInspection] = useState(null);
  const [uploadReportsDialogOpen, setUploadReportsDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState("table");
  const [currentUser, setCurrentUser] = useState(null);
  const [reportsDialogTab, setReportsDialogTab] = useState("reports");

  // Filter states (Week 3: Using computed columns from Week 1)
  const [filterNCRs, setFilterNCRs] = useState(false);
  const [filterFindings, setFilterFindings] = useState(false);
  const [filterPending, setFilterPending] = useState(false);

  // Upload modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [extractedDataList, setExtractedDataList] = useState([]);
  const [processingStatus, setProcessingStatus] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [currentEditingIndex, setCurrentEditingIndex] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: inspections, isLoading } = useQuery({
    queryKey: ["inspections"],
    queryFn: () => base44.entities.Inspection.list("-created_at"),
    initialData: [],
  });

  // Fetch inspectors to match user email with inspector profile
  const { data: inspectors = [] } = useQuery({
    queryKey: ["inspectors"],
    queryFn: () => base44.entities.Inspector.list(),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Inspection.update(id, data),
    onSuccess: (updatedInspection) => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      setEditingInspection(null);
      // Update viewingReportsInspection with the fresh data
      if (viewingReportsInspection && viewingReportsInspection.id === updatedInspection.id) {
        setViewingReportsInspection(updatedInspection);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Inspection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Inspection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
    },
  });

  // Fetch active attendance records for the current inspector
  const { data: activeAttendance = {}, refetch: refetchAttendance } = useQuery({
    queryKey: ["activeAttendance", currentUser?.email], // Use email or ID
    queryFn: async () => {
      // Find inspector profile first if checking by ID, or just list by email if supported
      // Better: List all open attendance for *this user* (if they are inspector)
      // Since we don't have inspector ID handy in a stable way at top level without effect,
      // let's rely on finding it from the inspectors list which is already fetched.
      const profile = inspectors.find(i => i.email === currentUser?.email);
      if (!profile) return {};

      try {
        const records = await base44.entities.InspectionAttendance.list({
          inspector_id: profile.id,
        });
        const openRecords = records.filter(r => !r.check_out_time);
        return openRecords.reduce((acc, record) => {
          acc[record.inspection_id] = record;
          return acc;
        }, {});
      } catch (e) {
        return {};
      }
    },
    enabled: !!currentUser?.email && inspectors.length > 0,
  });

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            reject(error);
          }
        );
      }
    });
  };

  const handleCheckIn = async (inspectionId) => {
    const profile = inspectors.find(i => i.email === currentUser?.email);
    if (!profile) {
      // toast.error("Inspector profile not found");
      return;
    }

    try {
      setIsProcessing(true); // Re-using existing state or should create new loading state? 
      // Existing isProcessing is for file upload... might conflict visually but functionally ok.

      const location = await getCurrentLocation();
      const pointStr = `POINT(${location.longitude} ${location.latitude})`;

      await base44.entities.InspectionAttendance.create({
        inspection_id: inspectionId,
        inspector_id: profile.id,
        check_in_time: new Date().toISOString(),
        check_in_coordinates: pointStr,
        location_verified: true,
        check_in_notes: "Checked in via Dashboard"
      });

      await refetchAttendance();
      toast.success("Successfully checked in!");
    } catch (error) {
      console.error("Check-in error:", error);
      toast.error(`Check-in failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckOut = async (inspectionId) => {
    const record = activeAttendance[inspectionId];
    if (!record) return;

    try {
      setIsProcessing(true);
      const location = await getCurrentLocation();
      const pointStr = `POINT(${location.longitude} ${location.latitude})`;

      await base44.entities.InspectionAttendance.update(record.id, {
        check_out_time: new Date().toISOString(),
        check_out_coordinates: pointStr,
        check_out_notes: "Checked out via Dashboard"
      });

      await refetchAttendance();
      toast.success("Successfully checked out!");
    } catch (error) {
      console.error("Check-out error:", error);
      toast.error(`Check-out failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Role-based access control
  const isAdmin = currentUser?.role === "admin" || currentUser?.inspection_role === "admin";
  const isInspectionEngineer = currentUser?.inspection_role === "inspection_engineer";
  const isQCManager = currentUser?.inspection_role === "qc_manager";
  const isInspector = currentUser?.inspection_role === "inspector";
  const isInspectionAgency = currentUser?.inspection_role === "inspection_agency";

  const canAccessChat = isAdmin || isQCManager || isInspectionEngineer;

  // Filter inspections based on role
  const roleFilteredInspections = React.useMemo(() => {
    if (isAdmin || isQCManager) {
      return inspections;
    } else if (isInspectionEngineer) {
      return inspections.filter(inspection => inspection.created_by === currentUser?.email);
    } else if (isInspectionAgency) {
      const agencyName = currentUser?.company || currentUser?.company_affiliation;
      if (!agencyName) return [];
      return inspections.filter(inspection => inspection.tpi_agency === agencyName);
    } else if (isInspector) {
      // Find the inspector profile matching current user's email
      const inspectorProfile = inspectors.find(i => i.email === currentUser?.email);

      console.log("=== INSPECTOR DASHBOARD DEBUG ===");
      console.log("Current user email:", currentUser?.email);
      console.log("Inspectors list length:", inspectors.length);
      console.log("Inspector profile found:", inspectorProfile);
      if (inspectors.length > 0) {
        console.log("First inspector:", inspectors[0]);
      }
      console.log("Total inspections:", inspections.length);

      // Filter by assigned inspector email OR assigned inspector ID
      return inspections.filter(i =>
        (currentUser?.email && i.assigned_inspector_email === currentUser.email) ||
        (inspectorProfile && i.assigned_inspector_id === inspectorProfile.id)
      );
    }
    return [];
  }, [inspections, currentUser, isAdmin, isQCManager, isInspectionEngineer, isInspector, isInspectionAgency, inspectors]);

  // Filter by Project ID first
  const projectFilteredInspections = React.useMemo(() => {
    if (!selectedProjectId) return roleFilteredInspections;
    return roleFilteredInspections.filter(i => !i.project_id || i.project_id === selectedProjectId);
  }, [roleFilteredInspections, selectedProjectId]);

  // Week 3: Apply search + quick filters (using computed columns from Week 1)
  const filteredInspections = projectFilteredInspections.filter((inspection) => {
    // Search filter
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      inspection.po_number?.toLowerCase().includes(query) ||
      inspection.notification_number?.toLowerCase().includes(query) ||
      inspection.inspection_location?.toLowerCase().includes(query) ||
      inspection.inspection_type?.toLowerCase().includes(query) ||
      inspection.vendor_contact_name?.toLowerCase().includes(query) ||
      inspection.supplier_name?.toLowerCase().includes(query) ||
      inspection.subsupplier_name?.toLowerCase().includes(query) ||
      inspection.country?.toLowerCase().includes(query);

    // Quick filters (using computed columns from Week 1)
    const matchesNCRs = !filterNCRs || (inspection.ncr_count && inspection.ncr_count > 0);
    const matchesFindings = !filterFindings || (inspection.findings_count && inspection.findings_count > 0);
    const matchesPending = !filterPending || inspection.has_pending_reports === true;

    return matchesSearch && matchesNCRs && matchesFindings && matchesPending;
  });

  const stats = {
    total: roleFilteredInspections.length,
    received: roleFilteredInspections.filter((i) => i.status === "received").length,
    scheduled: roleFilteredInspections.filter((i) => i.status === "scheduled").length,
    completed: roleFilteredInspections.filter((i) => i.status === "completed").length,
    finalized: roleFilteredInspections.filter((i) => i.status === "finalized").length,
  };

  // Upload functions
  const handleDrag = React.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = React.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, []);

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
  };

  const inspectionSchema = {
    type: "object",
    properties: {
      po_number: { type: "string", description: "Purchase Order number or PO number" },
      notification_number: { type: "string", description: "Inspection notification number or reference number" },
      notification_revision: { type: "string", description: "Notification revision number or version" },
      notification_receipt_date: { type: "string", format: "date", description: "Inspection notification receipt date in YYYY-MM-DD format" },
      supplier_name: { type: "string", description: "Name of supplier where the purchase order (PO) is issued" },
      subsupplier_name: { type: "string", description: "Name of the manufacturer or sub-supplier" },
      country: { type: "string", description: "Country where inspection will take place" },
      inspection_location: { type: "string", description: "Location or address where the inspection will take place" },
      latitude: { type: "number", description: "Latitude of the inspection location if mentioned or inferable (e.g., 24.4539)" },
      longitude: { type: "number", description: "Longitude of the inspection location if mentioned or inferable (e.g., 54.3773)" },
      start_date: { type: "string", format: "date", description: "The EARLIEST inspection date in YYYY-MM-DD format" },
      end_date: { type: "string", format: "date", description: "The LATEST inspection date in YYYY-MM-DD format" },
      all_inspection_dates: { type: "string", description: "ALL inspection dates found" },
      inspection_activities: {
        type: "array",
        description: "Array of inspection activities from tables. Extract ALL columns including date, time, ITP step, activity, intervention points, and remarks.",
        items: {
          type: "object",
          properties: {
            date: { type: "string", description: "Date of inspection activity (e.g., '07/11/2024')" },
            time: { type: "string", description: "Time of activity (e.g., '10:00 AM' or '14:00')" },
            itp_step: { type: "string", description: "ITP Step Number (e.g., '4.2', '5.1')" },
            activity: { type: "string", description: "Inspection activity description" },
            supplier: { type: "string", description: "Supplier intervention point (W/H/R or percentage)" },
            contractor: { type: "string", description: "Contractor intervention point (W/H/R or percentage)" },
            company_tpa: { type: "string", description: "Company (TPA) intervention point (W/H/R or percentage)" },
            remarks: { type: "string", description: "Any remarks or notes" }
          },
          required: ["date", "itp_step", "activity"]
        }
      },
      inspection_time: { type: "string", description: "Time of inspection (e.g., '10:00 AM' or '14:00')" },
      po_description: { type: "string", description: "Purchase Order description" },
      inspection_type: { type: "string", description: "Type of inspection" },
      vendor_contact_name: { type: "string", description: "Vendor contact name" },
      vendor_contact_phone: { type: "string", description: "Vendor contact phone" },
      vendor_contact_email: { type: "string", description: "Vendor contact email" },
      items_being_offered: {
        type: "array",
        description: "Array of items being offered for inspection. Extract from tables or listings in the document.",
        items: {
          type: "object",
          properties: {
            itemNumber: { type: "string", description: "PO item number (e.g., '10', '20', '30')" },
            description: { type: "string", description: "Complete item description" },
            quantity: { type: "string", description: "Quantity with unit (e.g., '5 EA', '10 PCS', '100 KG')" }
          },
          required: ["itemNumber", "description", "quantity"]
        }
      },
      notes: { type: "string", description: "Additional notes" }
    }
  };

  const checkForDuplicate = (extractedData) => {
    if (!extractedData.po_number || !extractedData.notification_number) return null;
    return inspections.find(
      (inspection) =>
        inspection.po_number === extractedData.po_number &&
        inspection.notification_number === extractedData.notification_number
    );
  };

  const processFiles = async (selectedFiles) => {
    setFiles(selectedFiles);
    setError(null);
    setIsProcessing(true);
    setExtractedDataList([]);

    const statuses = selectedFiles.map((file) => ({
      fileName: file.name,
      status: 'uploading',
      progress: 0,
    }));
    setProcessingStatus(statuses);

    const results = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileName = file.name.toLowerCase();
      const isWordFile = fileName.endsWith('.doc') || fileName.endsWith('.docx');

      try {
        if (isWordFile) {
          throw new Error("Word files are not supported. Please convert to PDF first.");
        }

        setProcessingStatus(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'uploading', progress: 30 } : s
        ));

        const { file_url } = await base44.integrations.Core.UploadFile({ file: file });

        setProcessingStatus(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'extracting', progress: 60 } : s
        ));

        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: inspectionSchema,
        });

        if (result.status === "success" && result.output) {
          const extractedData = result.output;
          const duplicate = checkForDuplicate(extractedData);

          const dataToAdd = {
            ...extractedData,
            document_url: file_url,
            status: "received",
            fileName: file.name,
            isDuplicate: !!duplicate,
            duplicateRecord: duplicate,
          };

          results.push(dataToAdd);

          setProcessingStatus(prev => prev.map((s, idx) =>
            idx === i ? {
              ...s,
              status: duplicate ? 'warning' : 'success',
              progress: 100,
              warning: duplicate ? `Duplicate found` : null
            } : s
          ));
        } else {
          throw new Error(result.details || "Failed to extract data");
        }
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
        setProcessingStatus(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'error', progress: 0, error: err.message } : s
        ));
      }
    }

    setExtractedDataList(results);
    setIsProcessing(false);

    if (results.length === 0) {
      setError("Failed to process files. Please check file formats and try again.");
      setFiles([]);
    }
  };

  const handleSave = async (data, index) => {
    // Sanitize UUID fields - convert empty strings to null
    const sanitizedData = {
      ...data,
      project_id: data.project_id || null,
      inspector_id: data.inspector_id || null,
      tpi_agency_id: data.tpi_agency_id || null,
      assigned_inspector_id: data.assigned_inspector_id || null,
      assigned_by: data.assigned_by || null,
    };

    // Ensure project_id is set to current project if available
    if (selectedProjectId) {
      sanitizedData.project_id = selectedProjectId;
    }

    await createMutation.mutateAsync(sanitizedData);
    setExtractedDataList(prev => prev.filter((_, idx) => idx !== index));
    setCurrentEditingIndex(null);

    if (extractedDataList.length === 1) {
      handleCloseUploadModal();
    }
  };

  const handleCloseUploadModal = () => {
    setUploadModalOpen(false);
    setFiles([]);
    setExtractedDataList([]);
    setProcessingStatus([]);
    setError(null);
    setCurrentEditingIndex(null);
  };

  const handleDeleteReport = async (reportType, report) => {
    if (!viewingReportsInspection) return;

    const updatedData = {};

    if (reportType === "inspection") {
      const inspectionReports = viewingReportsInspection.inspection_reports || [];
      updatedData.inspection_reports = inspectionReports.filter(r => r.url !== report.url);
    } else if (reportType === "test") {
      const testReports = viewingReportsInspection.test_reports || [];
      updatedData.test_reports = testReports.filter(r => r.url !== report.url);
    } else if (reportType === "release_note") {
      const releaseNotes = viewingReportsInspection.release_notes || [];
      updatedData.release_notes = releaseNotes.filter(r => r.url !== report.url);
    } else if (reportType === "additional") {
      const additionalReports = viewingReportsInspection.additional_reports || [];
      updatedData.additional_reports = additionalReports.filter(r => r.url !== report.url);
    }

    await updateMutation.mutateAsync({
      id: viewingReportsInspection.id,
      data: updatedData,
    });
  };

  const handleFindingsUpdate = async () => {
    // Refresh the inspection data to get the latest findings status
    const updatedInspections = await base44.entities.Inspection.list("-created_at");
    const updatedInspection = updatedInspections.find(i => i.id === viewingReportsInspection.id);
    if (updatedInspection) {
      setViewingReportsInspection(updatedInspection);
    }
    queryClient.invalidateQueries({ queryKey: ["inspections"] });
  };

  const canUpload = isAdmin || isInspectionEngineer;
  const canEdit = isAdmin || isInspectionEngineer || isQCManager;
  const canDelete = isAdmin || isInspectionEngineer;

  const getDashboardTitle = () => {
    const projectPrefix = currentProject ? `${currentProject.name} - ` : "";
    if (isInspector) return `${projectPrefix}My Assigned Inspections`;
    if (isInspectionEngineer) return `${projectPrefix}My Inspection Notifications`;
    if (isQCManager) return `${projectPrefix}Project Oversight`;
    return `${projectPrefix}Dashboard`;
  };

  const getDashboardDescription = () => {
    if (isInspector) return "View and track inspections assigned to you for this project";
    if (isInspectionEngineer) return "Manage your inspection notifications for this project";
    if (isQCManager) return "Monitor and manage all inspection notifications for this project";
    return "Manage and track all inspection notifications for this project";
  };

  // Count open findings for badge
  const getOpenFindingsCount = (inspection) => {
    const reports = inspection.inspection_reports || [];
    return reports.reduce((sum, report) => {
      const openFindings = (report.findings || []).filter(f => f.closure_status !== "closed");
      return sum + openFindings.length;
    }, 0);
  };

  // Debug info - always calculate
  const inspectorProfile = inspectors.find(i => i.email === currentUser?.email) || null;
  const assignedInspections = inspections.filter(i => i.assigned_inspector_email || i.assigned_inspector_id);

  return (
    <div className="space-y-8 pb-8">
      {/* Header with Upload Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{getDashboardTitle()}</h1>
          <p className="text-gray-600">{getDashboardDescription()}</p>
        </div>
        {canUpload && (
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 h-12 px-6 elevation-2 hover:elevation-3 w-full md:w-auto"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Notification
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard
          title={isInspector ? "My Inspections" : "Total Inspections"}
          value={stats.total}
          icon={FileText}
          color="bg-indigo-600"
          trend={isInspector ? "Assigned to me" : isInspectionEngineer ? "Your notifications" : "All notifications"}
        />
        <StatsCard
          title="Received"
          value={stats.received}
          icon={FileText}
          color="bg-gray-600"
          trend="Not yet assigned"
        />
        <StatsCard
          title="Scheduled"
          value={stats.scheduled}
          icon={Clock}
          color="bg-blue-600"
          trend="Inspector assigned"
        />
        <StatsCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle}
          color="bg-green-600"
          trend="Event finished"
        />
        <StatsCard
          title="Finalized"
          value={stats.finalized}
          icon={AlertCircle}
          color="bg-purple-600"
          trend="Report uploaded"
        />
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-6 elevation-2">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search by PO number, notification number, location, supplier, country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base border-2 focus:border-indigo-600 rounded-xl"
          />
        </div>

        {/* Week 3: Quick Filter Toggles */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
            <Filter className="w-4 h-4" />
            Quick Filters:
          </div>

          {/* NCRs Filter */}
          <Button
            variant={filterNCRs ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterNCRs(!filterNCRs)}
            className={`h-8 transition-all ${filterNCRs
              ? "bg-red-100 text-red-700 border-red-300 hover:bg-red-200"
              : "border-gray-300 hover:border-red-300 hover:bg-red-50"
              }`}
          >
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            NCRs Only
            {filterNCRs && <X className="w-3 h-3 ml-1.5" />}
          </Button>

          {/* Findings Filter */}
          <Button
            variant={filterFindings ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterFindings(!filterFindings)}
            className={`h-8 transition-all ${filterFindings
              ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
              : "border-gray-300 hover:border-amber-300 hover:bg-amber-50"
              }`}
          >
            <FileWarning className="w-4 h-4 mr-1.5" />
            Findings Only
            {filterFindings && <X className="w-3 h-3 ml-1.5" />}
          </Button>

          {/* Pending Reports Filter */}
          <Button
            variant={filterPending ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterPending(!filterPending)}
            className={`h-8 transition-all ${filterPending
              ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
              : "border-gray-300 hover:border-blue-300 hover:bg-blue-50"
              }`}
          >
            <ClipboardCheck className="w-4 h-4 mr-1.5" />
            Pending Reports
            {filterPending && <X className="w-3 h-3 ml-1.5" />}
          </Button>

          {/* Clear All Filters */}
          {(filterNCRs || filterFindings || filterPending) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterNCRs(false);
                setFilterFindings(false);
                setFilterPending(false);
              }}
              className="h-8 text-gray-600 hover:text-gray-900"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* View Toggle */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
          <TabsTrigger value="table" className="flex items-center gap-2">
            <TableIconLucide className="w-4 h-4" />
            Table View
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIconLucide className="w-4 h-4" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-0">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading inspections...</p>
            </div>
          ) : (
            <InspectionTable
              inspections={filteredInspections}
              onEdit={canEdit ? setEditingInspection : null}
              onDelete={canDelete ? (id) => deleteMutation.mutate(id) : null}
              onViewReports={setViewingReportsInspection}
              onViewLocation={setViewingLocationInspection}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              activeAttendance={activeAttendance}
              currentUser={currentUser}
              onReplaceReport={(inspection) => {
                setViewingReportsInspection(inspection);
                setUploadReportsDialogOpen(true);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading inspections...</p>
            </div>
          ) : (
            <CalendarView
              inspections={filteredInspections}
              onSelectInspection={canEdit ? setEditingInspection : null}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingInspection} onOpenChange={() => setEditingInspection(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Inspection Details</DialogTitle>
          </DialogHeader>
          {editingInspection && (
            <ReviewForm
              extractedData={editingInspection}
              onSave={(data) => {
                // Sanitize UUID fields - convert empty strings to null
                const sanitizedData = {
                  ...data,
                  project_id: data.project_id || null,
                  inspector_id: data.inspector_id || null,
                  tpi_agency_id: data.tpi_agency_id || null,
                  assigned_inspector_id: data.assigned_inspector_id || null,
                  assigned_by: data.assigned_by || null,
                };

                // Ensure project_id is set to current project if available
                if (selectedProjectId) {
                  sanitizedData.project_id = selectedProjectId;
                }

                updateMutation.mutate({ id: editingInspection.id, data: sanitizedData });
              }}
              onCancel={() => setEditingInspection(null)}
              isSaving={updateMutation.isPending}
              currentUser={currentUser}
              currentProjectId={selectedProjectId}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reports Dialog - Now with tabs for Reports and Actions */}
      <Dialog open={!!viewingReportsInspection} onOpenChange={() => {
        setViewingReportsInspection(null);
        setReportsDialogTab("reports"); // Reset tab on close
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Findings
            </DialogTitle>
          </DialogHeader>
          {viewingReportsInspection && (
            <Tabs value={reportsDialogTab} onValueChange={setReportsDialogTab} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="reports">Reports & Release</TabsTrigger>
                <TabsTrigger value="actions">
                  Actions
                  {getOpenFindingsCount(viewingReportsInspection) > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white animate-pulse">
                      {getOpenFindingsCount(viewingReportsInspection)}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="reports">
                <ReportsTab
                  inspection={viewingReportsInspection}
                  onUploadClick={() => setUploadReportsDialogOpen(true)}
                  onDeleteReport={handleDeleteReport}
                  currentUser={currentUser}
                />
              </TabsContent>

              <TabsContent value="actions">
                <FindingsTab
                  inspection={viewingReportsInspection}
                  onUpdate={handleFindingsUpdate}
                  currentUser={currentUser}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Reports Dialog */}
      {viewingReportsInspection && ( // Only render if an inspection is selected for reports
        <UploadReportsDialog
          open={uploadReportsDialogOpen}
          onClose={() => setUploadReportsDialogOpen(false)}
          inspection={viewingReportsInspection}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["inspections"] });
            handleFindingsUpdate(); // Also refresh findings when reports are uploaded
          }}
          currentUser={currentUser}
        />
      )}

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={handleCloseUploadModal}>
        <DialogContent className={`max-h-[95vh] overflow-y-auto transition-all duration-300 ${currentEditingIndex !== null ? 'max-w-[95vw] w-[95vw]' : 'max-w-5xl'}`}>
          <DialogHeader>
            <DialogTitle className="text-2xl">Upload Notifications</DialogTitle>
          </DialogHeader>

          {error && (
            <Alert variant={extractedDataList.length > 0 ? "default" : "destructive"} className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <AnimatePresence mode="wait">
            {extractedDataList.length === 0 ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <UploadZone
                    onFileSelect={handleFileInput}
                    dragActive={dragActive}
                    files={files}
                  />
                </div>

                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6"
                  >
                    <div className="space-y-4">
                      {processingStatus.map((status, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {status.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
                              {status.status === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />}
                              {status.status === 'error' && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                              {(status.status === 'uploading' || status.status === 'extracting') && (
                                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin flex-shrink-0" />
                              )}
                              <span className="text-sm font-medium text-gray-900 truncate">{status.fileName}</span>
                            </div>
                            <span className="text-xs text-gray-500 ml-2">
                              {status.status === 'uploading' && 'Uploading...'}
                              {status.status === 'extracting' && 'Extracting...'}
                              {status.status === 'success' && 'Complete'}
                              {status.status === 'warning' && 'Duplicate'}
                              {status.status === 'error' && 'Failed'}
                            </span>
                          </div>
                          {status.status !== 'error' && status.status !== 'warning' && (
                            <Progress value={status.progress} className="h-2" />
                          )}
                          {status.error && <p className="text-xs text-red-600 mt-2">{status.error}</p>}
                          {status.warning && <p className="text-xs text-amber-600 mt-2">{status.warning}</p>}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : currentEditingIndex !== null ? (
              <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-900">
                    Reviewing {currentEditingIndex + 1} of {extractedDataList.length} notifications
                  </p>
                </div>
                <ReviewForm
                  extractedData={extractedDataList[currentEditingIndex]}
                  onSave={(data) => handleSave(data, currentEditingIndex)}
                  onCancel={() => setCurrentEditingIndex(null)}
                  isSaving={createMutation.isPending}
                  currentUser={currentUser}
                  showPdf={true}
                />
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mb-4">
                  <p className="text-gray-600">
                    {extractedDataList.length} notification{extractedDataList.length > 1 ? 's' : ''} ready to review
                  </p>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {extractedDataList.map((data, idx) => (
                    <div
                      key={idx}
                      className={`border-2 rounded-xl p-4 ${data.isDuplicate ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">
                            {data.notification_number || data.fileName}
                          </h4>
                          <p className="text-sm text-gray-600">PO: {data.po_number || 'N/A'}</p>
                        </div>
                        <Button onClick={() => setCurrentEditingIndex(idx)} variant="outline" size="sm">
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {canAccessChat && (
        <ChatWidget
          currentUser={currentUser}
          currentProject={currentProject}
        />
      )}

      {/* Attendance & Location Dialog */}
      <AttendanceDialog
        inspection={viewingLocationInspection}
        isOpen={!!viewingLocationInspection}
        onClose={() => setViewingLocationInspection(null)}
      />
    </div>
  );
}