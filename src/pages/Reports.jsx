import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Trash2,
  Star,
  Paperclip,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// Helper function to safely format dates
const formatDate = (dateString, formatStr = "MMM d, yyyy HH:mm") => {
  if (!dateString) return "-";
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    if (isValid(date)) {
      return format(date, formatStr);
    }
    return "-";
  } catch (error) {
    console.error("Date formatting error:", error);
    return "-";
  }
};

const handleDownload = async (url, name) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = name || 'report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    toast.success("Download started");
  } catch (error) {
    console.error("Download error:", error);
    toast.error("Failed to download report");
  }
};

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("inspection");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [testReportsDialogOpen, setTestReportsDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [viewingDocumentUrl, setViewingDocumentUrl] = useState(null);
  const [viewingDocumentTitle, setViewingDocumentTitle] = useState("");

  const queryClient = useQueryClient();

  React.useEffect(() => {
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

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ["inspections"],
    queryFn: () => base44.entities.Inspection.list("-created_at"),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Inspection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      toast.success("Report deleted successfully");
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    },
  });

  const isAdmin = currentUser?.role === "admin" || currentUser?.inspection_role === "admin";
  const isInspectionEngineer = currentUser?.inspection_role === "inspection_engineer";
  const isQCManager = currentUser?.inspection_role === "qc_manager";
  const isInspector = currentUser?.inspection_role === "inspector";
  const canDelete = isAdmin || isInspectionEngineer || isQCManager;

  // Filter inspections based on role
  const roleFilteredInspections = React.useMemo(() => {
    if (isInspector) {
      return inspections.filter(inspection => inspection.assigned_inspector_email === currentUser?.email);
    }
    return inspections;
  }, [inspections, currentUser, isInspector]);

  // Aggregate all reports
  const allReports = roleFilteredInspections.flatMap((inspection) => {
    const reports = [];

    (inspection.inspection_reports || []).forEach((report) => {
      reports.push({
        ...report,
        type: "Inspection Report",
        reportType: "inspection",
        inspection_number: inspection.notification_number,
        po_number: inspection.po_number,
        supplier: inspection.supplier_name,
        inspectionId: inspection.id,
        inspection: inspection,
        findings: report.findings || [],
      });
    });

    (inspection.release_notes || []).forEach((report) => {
      const associatedReport = (inspection.inspection_reports || []).find(r => r.is_final_report);
      
      reports.push({
        ...report,
        type: "Release Note",
        reportType: "release_note",
        inspection_number: inspection.notification_number,
        po_number: inspection.po_number,
        supplier: inspection.supplier_name,
        report_number: associatedReport?.name || "-",
        inspectionId: inspection.id,
        inspection: inspection,
      });
    });

    return reports;
  });

  // Filter by tab
  const reportsByTab = allReports.filter((report) => {
    if (activeTab === "inspection") return report.reportType === "inspection";
    if (activeTab === "release") return report.reportType === "release_note";
    return true;
  });

  // Filter by search
  const filteredReports = reportsByTab.filter((report) => {
    const query = searchQuery.toLowerCase();
    return (
      report.name?.toLowerCase().includes(query) ||
      report.inspection_number?.toLowerCase().includes(query) ||
      report.po_number?.toLowerCase().includes(query) ||
      report.supplier?.toLowerCase().includes(query) ||
      report.uploaded_by?.toLowerCase().includes(query)
    );
  });

  // Stats
  const stats = {
    inspection: allReports.filter(r => r.reportType === "inspection").length,
    release: allReports.filter(r => r.reportType === "release_note").length,
  };

  const handleDeleteClick = (report) => {
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;

    const inspection = reportToDelete.inspection;
    const updatedData = {};

    if (reportToDelete.reportType === "inspection") {
      updatedData.inspection_reports = (inspection.inspection_reports || []).filter(
        (r) => r.url !== reportToDelete.url
      );
    } else if (reportToDelete.reportType === "release_note") {
      updatedData.release_notes = (inspection.release_notes || []).filter(
        (r) => r.url !== reportToDelete.url
      );
    }

    await updateMutation.mutateAsync({
      id: inspection.id,
      data: updatedData,
    });
  };

  const handleViewTestReports = (report) => {
    setSelectedInspection(report.inspection);
    setTestReportsDialogOpen(true);
  };

  const handleViewDocument = (url, title = "Document") => {
    setViewingDocumentUrl(url);
    setViewingDocumentTitle(title);
  };

  const exportToExcel = () => {
    const headers = activeTab === "inspection" 
      ? ["Report Name", "Notification #", "PO Number", "Supplier", "Findings", "Uploaded By", "Upload Date"]
      : ["Report Name", "Notification Number", "Report Number", "PO Number", "Supplier", "Uploaded By", "Upload Date"];

    const rows = filteredReports.map((report) => {
      const baseData = [
        report.name || "",
        report.inspection_number || "",
      ];
      
      if (activeTab === "release") {
        baseData.push(report.report_number || "");
      }
      
      if (activeTab === "inspection") {
        baseData.push(
          report.po_number || "",
          report.supplier || "",
          report.findings?.length || 0,
          report.uploaded_by || "",
          formatDate(report.uploaded_date, "yyyy-MM-dd HH:mm")
        );
      } else {
        baseData.push(
          report.po_number || "",
          report.supplier || "",
          report.uploaded_by || "",
          formatDate(report.uploaded_date, "yyyy-MM-dd HH:mm")
        );
      }
      
      return baseData;
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
    link.setAttribute("download", `reports_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Reports & Release</h1>
        <p className="text-gray-600">View and manage all inspection reports and release notes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Inspection Reports</p>
              <p className="text-3xl font-bold text-blue-600">{stats.inspection}</p>
            </div>
            <FileText className="w-10 h-10 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Release Notes</p>
              <p className="text-3xl font-bold text-purple-600">{stats.release}</p>
            </div>
            <FileText className="w-10 h-10 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Search and Export */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search by report name, notification number, PO, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base border-2 focus:border-indigo-600 rounded-xl"
          />
        </div>
        <Button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 h-12 px-6"
          disabled={filteredReports.length === 0}
        >
          <FileSpreadsheet className="w-5 h-5 mr-2" />
          Export to Excel
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="inspection">
            Inspection Reports
            {stats.inspection > 0 && (
              <Badge className="ml-2 bg-blue-100 text-blue-800">{stats.inspection}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="release">
            Release Notes
            {stats.release > 0 && (
              <Badge className="ml-2 bg-purple-100 text-purple-800">{stats.release}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Inspection Reports Tab */}
        <TabsContent value="inspection" className="mt-6">
          <Card className="elevation-2">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading reports...</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No reports found
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery
                      ? "Try adjusting your search query"
                      : "Reports will appear here once they are uploaded"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Report Name</TableHead>
                      <TableHead className="font-semibold">Notification #</TableHead>
                      <TableHead className="font-semibold">PO Number</TableHead>
                      <TableHead className="font-semibold">Supplier</TableHead>
                      <TableHead className="font-semibold">Uploaded By</TableHead>
                      <TableHead className="font-semibold">Upload Date</TableHead>
                      <TableHead className="font-semibold w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report, index) => {
                      const findingsCount = report.findings?.length || 0;
                      const hasCriticalFindings = report.findings?.some(f => 
                        f.severity?.toLowerCase().includes("critical") || 
                        f.severity?.toLowerCase().includes("major")
                      );

                      return (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-gray-900">{report.name}</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {report.is_final_report && (
                                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                      <Star className="w-3 h-3 mr-1" />
                                      Final
                                    </Badge>
                                  )}
                                  {findingsCount > 0 && (
                                    <Badge className={hasCriticalFindings ? "bg-red-100 text-red-800 border-red-200" : "bg-amber-100 text-amber-800 border-amber-200"}>
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      {findingsCount} Finding(s)
                                    </Badge>
                                  )}
                                  {report.approval_status === "pending" && (
                                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                      Pending Approval
                                    </Badge>
                                  )}
                                  {report.approval_status === "approved" && (
                                    <Badge className="bg-green-100 text-green-800 border-green-200">
                                      Approved
                                    </Badge>
                                  )}
                                  {report.approval_status === "rejected" && (
                                    <Badge className="bg-red-100 text-red-800 border-red-200">
                                      Rejected
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-900">{report.inspection_number || "-"}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-900">{report.po_number || "-"}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-900">{report.supplier || "-"}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-600">{report.uploaded_by || "-"}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-600">
                              {formatDate(report.uploaded_date)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                onClick={() => handleViewDocument(report.url, report.name)}
                                title="View Document"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => window.open(report.url, '_blank')}
                                title="Open in New Tab"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleDownload(report.url, report.name)}
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteClick(report)}
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            {!isLoading && filteredReports.length > 0 && (
              <div className="p-3 border-t bg-gray-50 text-xs text-gray-600">
                <div className="flex items-center justify-between">
                  <span>
                    Showing {filteredReports.length} of {reportsByTab.length} reports
                    {searchQuery && " (filtered)"}
                  </span>
                  <span>
                    💡 Tip: View • Open • Download • Delete
                  </span>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Release Notes Tab */}
        <TabsContent value="release" className="mt-6">
          <Card className="elevation-2">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading reports...</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No release notes found
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery
                      ? "Try adjusting your search query"
                      : "Release notes will appear here once they are uploaded"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Report Name</TableHead>
                      <TableHead className="font-semibold">Notification Number</TableHead>
                      <TableHead className="font-semibold">Report Number</TableHead>
                      <TableHead className="font-semibold">PO Number</TableHead>
                      <TableHead className="font-semibold">Supplier</TableHead>
                      <TableHead className="font-semibold">Uploaded By</TableHead>
                      <TableHead className="font-semibold">Upload Date</TableHead>
                      <TableHead className="font-semibold w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-900">{report.name}</p>
                              {report.is_final_release_note && (
                                <Badge className="mt-1 bg-amber-100 text-amber-800 border-amber-200">
                                  <Star className="w-3 h-3 mr-1" />
                                  Final
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-900">{report.inspection_number || "-"}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-900">{report.report_number}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-900">{report.po_number || "-"}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-900">{report.supplier || "-"}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-600">{report.uploaded_by || "-"}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-600">
                            {formatDate(report.uploaded_date)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              onClick={() => handleViewTestReports(report)}
                              title="View Test Reports/MTCs"
                            >
                              <Paperclip className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              onClick={() => handleViewDocument(report.url, report.name)}
                              title="View Document"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => window.open(report.url, '_blank')}
                              title="Open in New Tab"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleDownload(report.url, report.name)}
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteClick(report)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {!isLoading && filteredReports.length > 0 && (
              <div className="p-3 border-t bg-gray-50 text-xs text-gray-600">
                <div className="flex items-center justify-between">
                  <span>
                    Showing {filteredReports.length} of {reportsByTab.length} release notes
                    {searchQuery && " (filtered)"}
                  </span>
                  <span>
                    💡 Tip: 📎 Test Reports • View • Open • Download • Delete
                  </span>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Reports/MTCs Dialog */}
      <Dialog open={testReportsDialogOpen} onOpenChange={setTestReportsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Reports / MTCs</DialogTitle>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Inspection Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-blue-700">Notification #:</span>{" "}
                    <span className="text-blue-900 font-medium">{selectedInspection.notification_number || "-"}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">PO #:</span>{" "}
                    <span className="text-blue-900 font-medium">{selectedInspection.po_number || "-"}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Supplier:</span>{" "}
                    <span className="text-blue-900 font-medium">{selectedInspection.supplier_name || "-"}</span>
                  </div>
                </div>
              </div>

              {selectedInspection.test_reports && selectedInspection.test_reports.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Document Name</TableHead>
                        <TableHead className="font-semibold">Uploaded By</TableHead>
                        <TableHead className="font-semibold">Upload Date</TableHead>
                        <TableHead className="font-semibold w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInspection.test_reports.map((testReport, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-500" />
                              <p className="font-medium text-gray-900">{testReport.name}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-600">{testReport.uploaded_by || "-"}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-600">
                              {formatDate(testReport.uploaded_date)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                onClick={() => handleViewDocument(testReport.url, testReport.name)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => window.open(testReport.url, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleDownload(testReport.url, testReport.name)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No test reports or MTCs uploaded for this inspection.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report?
              {reportToDelete && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{reportToDelete.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Type: {reportToDelete.type}
                  </p>
                  <p className="text-sm text-gray-600">
                    Notification: {reportToDelete.inspection_number}
                  </p>
                </div>
              )}
              <p className="mt-3 text-red-600 font-medium">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Viewer Dialog */}
      <Dialog open={!!viewingDocumentUrl} onOpenChange={() => setViewingDocumentUrl(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>{viewingDocumentTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 px-6 pb-6 overflow-hidden">
            <iframe
              src={viewingDocumentUrl}
              className="w-full h-full border-2 rounded-lg"
              title="Document Viewer"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}