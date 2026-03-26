import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Download,
  ExternalLink,
  Trash2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Star,
  Calendar as CalendarIcon,
  AlertTriangle,
  Eye,
  Search,
  RefreshCw,
  Loader2,
  XCircle,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

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

const getSeverityColor = (severity) => {
  const sev = severity?.toLowerCase() || "";
  if (sev.includes("critical") || sev.includes("major")) return "bg-red-100 text-red-800 border-red-200";
  if (sev.includes("minor")) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-blue-100 text-blue-800 border-blue-200";
};

const getTypeColor = (type) => {
  const t = type?.toLowerCase() || "";
  if (t.includes("ncr") || t.includes("non-conformance")) return "bg-red-100 text-red-800 border-red-200";
  if (t.includes("concern")) return "bg-amber-100 text-amber-800 border-amber-200";
  if (t.includes("observation")) return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
};

const ReportCard = ({ report, reportType, onDelete, canDelete, onViewReport, onViewFindings, onApprove, onReject, canApprove, onReplace, canReplace, reportIndex }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const findingsCount = report.findings?.length || 0;

  const approvalStatusColors = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200"
  };

  const approvalStatusLabels = {
    pending: "Pending Approval",
    approved: "Approved",
    rejected: "Rejected"
  };
  const hasCriticalFindings = report.findings?.some(f =>
    f.severity?.toLowerCase().includes("critical") ||
    f.severity?.toLowerCase().includes("major")
  );

  const handleDownload = async (e, url, name) => {
    e.preventDefault();
    e.stopPropagation();
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

  return (
    <>
      <TableRow className="hover:bg-gray-50">
        <TableCell>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900">{report.name}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {report.is_final_report && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    <Star className="w-3 h-3 mr-1" />
                    Final Report
                  </Badge>
                )}
                {report.is_final_release_note && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    <Star className="w-3 h-3 mr-1" />
                    Final Release Note
                  </Badge>
                )}
                {findingsCount > 0 && (
                  <Badge className={hasCriticalFindings ? "bg-red-100 text-red-800 border-red-200" : "bg-amber-100 text-amber-800 border-amber-200"}>
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {findingsCount} Finding(s)
                  </Badge>
                )}
                {reportType === "inspection" && report.approval_status && (
                  <Badge className={approvalStatusColors[report.approval_status] || "bg-gray-100"}>
                    {approvalStatusLabels[report.approval_status] || report.approval_status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <p className="text-sm text-gray-600">{report.uploaded_by}</p>
          {report.approved_by && (
            <p className="text-xs text-gray-400 mt-1">Reviewed by: {report.approved_by}</p>
          )}
        </TableCell>
        <TableCell>
          <p className="text-sm text-gray-600">
            {formatDate(report.uploaded_date)}
          </p>
        </TableCell>
        {reportType === "inspection" && (
          <TableCell>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <CalendarIcon className="w-3 h-3" />
              {formatDate(report.report_date, "MMM d, yyyy")}
            </div>
          </TableCell>
        )}
        <TableCell>
          <div className="flex gap-1">
            {findingsCount > 0 && onViewFindings && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                onClick={() => onViewFindings(report)}
                title="View Findings"
              >
                <Search className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              onClick={() => onViewReport(report.url)}
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
              onClick={(e) => handleDownload(e, report.url, report.name)}
              title="Download"
            >
              <Download className="w-4 h-4" />
            </Button>

            {/* Replace Action - Only for inspection reports */}
            {canReplace && reportType === "inspection" && onReplace && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => onReplace(report, reportIndex)}
                title="Replace Report"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}

            {/* Approval Actions */}
            {canApprove && reportType === "inspection" && report.approval_status === "pending" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 font-medium text-xs"
                  onClick={() => onApprove(report)}
                  title="Approve Report"
                >
                  Approve
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 font-medium text-xs"
                  onClick={() => onReject(report)}
                  title="Reject Report"
                >
                  Reject
                </Button>
              </>
            )}

            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setDeleteDialogOpen(true)}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{report.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(reportType, report);
                setDeleteDialogOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default function ReportsTab({ inspection, onUploadClick, onDeleteReport, currentUser }) {
  const [activeTab, setActiveTab] = useState("inspection");
  const queryClient = useQueryClient();
  const [viewingDocumentUrl, setViewingDocumentUrl] = useState(null);
  const [replacingReport, setReplacingReport] = useState(null);
  const [replacingReportIndex, setReplacingReportIndex] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(null);

  const updateInspectionMutation = useMutation({
    mutationFn: (data) => base44.entities.Inspection.update(inspection.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      toast.success("Report status updated successfully");
    },
    onError: () => {
      toast.error("Failed to update report status");
    }
  });

  const handleApprovalClick = (report, status) => {
    setPendingApproval({ report, status });
    setApprovalDialogOpen(true);
  };

  const confirmApproval = () => {
    if (!pendingApproval) return;

    const { report, status } = pendingApproval;
    const reportIndex = inspectionReports.findIndex(r => r.url === report.url);
    if (reportIndex === -1) return;

    const updatedReports = inspectionReports.map((r, idx) => {
      if (idx === reportIndex) {
        return {
          ...r,
          approval_status: status,
          approved_by: currentUser?.email,
          approved_date: new Date().toISOString()
        };
      }
      return r;
    });

    updateInspectionMutation.mutate({ inspection_reports: updatedReports });
    toast.success(`Report ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
    setApprovalDialogOpen(false);
    setPendingApproval(null);
  };
  const [viewingDocumentTitle, setViewingDocumentTitle] = useState("");
  const [viewingFindingsReport, setViewingFindingsReport] = useState(null);

  const isAdmin = currentUser?.role === "admin" || currentUser?.inspection_role === "admin";
  const isInspectionEngineer = currentUser?.inspection_role === "inspection_engineer";
  const isQCManager = currentUser?.inspection_role === "qc_manager";
  const isInspector = currentUser?.inspection_role === "inspector";
  const isInspectionAgency = currentUser?.inspection_role === "inspection_agency";

  // Permission check for upload
  const isAssignedTPI = isInspectionAgency && inspection.tpi_agency === (currentUser?.company || currentUser?.company_affiliation);
  const isCreator = inspection.created_by === currentUser?.email;

  // Only the creator (Inspection Engineer) or Admin can approve reports
  const canApprove = (isCreator || isAdmin);

  const canUpload = isInspector || isAdmin || isInspectionEngineer || isQCManager || isAssignedTPI || isCreator;
  const canDelete = isAdmin || isInspectionEngineer || isQCManager;

  const inspectionReports = inspection.inspection_reports || [];
  const releaseNotes = inspection.release_notes || [];

  const hasFinalInspectionReport = inspectionReports.some(r => r.is_final_report);
  const hasFinalReleaseNote = releaseNotes.some(r => r.is_final_release_note);

  const requiredReportsUploaded = hasFinalInspectionReport &&
    (!inspection.is_final_inspection || hasFinalReleaseNote);

  const isFinalized = inspection.status === "finalized";

  // Count total findings
  const totalFindings = inspectionReports.reduce((sum, report) =>
    sum + (report.findings?.length || 0), 0
  );

  // Count open findings (not closed)
  const openFindings = inspectionReports.reduce((sum, report) => {
    const openCount = (report.findings || []).filter(f => f.closure_status !== "closed").length;
    return sum + openCount;
  }, 0);

  const handleViewDocument = (url, title = "Document") => {
    setViewingDocumentUrl(url);
    setViewingDocumentTitle(title);
  };

  const handleViewFindings = (report) => {
    setViewingFindingsReport(report);
  };

  const handleReplaceReport = async (report, reportIndex) => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        // Set analyzing state
        setIsAnalyzing(true);
        setAnalysisResult({ status: 'uploading', message: 'Uploading new report...' });

        // 1. Upload new file
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        // 2. Re-run AI analysis
        let newFindings = [];
        try {
          // Update status
          setAnalysisResult({ status: 'analyzing', message: 'AI is analyzing the report for NCRs, concerns, and issues...' });

          const findingsResult = await base44.integrations.Core.InvokeLLM({
            prompt: `You are an expert inspection report analyzer. Your task is to THOROUGHLY scan this inspection report and extract EVERY SINGLE finding, issue, non-conformance, concern, observation, or problem mentioned.

🔍 SEARCH FOR ALL OF THE FOLLOWING:
- Non-Conformance Reports (NCR, NCRs, Non-conformances, Non-compliance)
- Defects, Deficiencies, Deviations, Discrepancies
- Issues, Problems, Faults, Failures, Anomalies
- Concerns (Major concerns, Minor concerns, Safety concerns, Quality concerns)
- Observations (negative or cautionary ones)
- Rejections, Rejected items, "NOT OK", "NG", "FAIL", "REJECT"
- "Does not meet", "Failed to meet", "Not in accordance with", "Not acceptable", "Unacceptable"
- "Exceeds limit", "Out of specification", "Out of tolerance", "Beyond acceptable range"
- Corrective Actions Required (CAR), Hold points, Stop work orders
- Rework required, Re-inspection required, Re-test required
- Damage, Corrosion, Cracks, Leaks, Wear, Degradation
- Missing documentation, Missing records, Incomplete documentation
- Tests not performed, Inspections not performed, Steps not completed
- Requirements not met, Specifications not satisfied
- "Looking for solution", "Pending resolution", "Under investigation"
- Any mention of non-compliance with ITP (Inspection Test Plan)
- Functional test failures, Performance test failures, Torque test issues
- Dimensional issues, Measurement out of range
- ANY negative statement or concern raised

⚠️ CRITICAL: Pay special attention to:
- Sentences containing "not acceptable", "not performed", "exceeds", "more than allowed"
- References to ITP requirements not being met
- Tests or inspections that were skipped or not completed
- Measurements or values outside specified ranges
- Any statement indicating factory is "looking for solution" or similar phrases

📋 FOR EACH FINDING EXTRACT:
1. TYPE: What category (NCR, Concern, Observation, Test Not Performed, Out of Spec, etc.)
2. DESCRIPTION: Complete detailed description of the finding
3. SEVERITY: If mentioned (Critical, Major, Minor) or infer if obvious
4. ITEM/REFERENCE: Which item, clause, ITP step, drawing, specification it refers to
5. STATUS: Current status (Open, Closed, Pending, Under Investigation, etc.)

⚠️ IMPORTANT INSTRUCTIONS:
- Be EXTREMELY thorough - extract EVERYTHING negative or concerning
- Even if something seems minor, include it
- Include findings from tables, checklists, bullet points, and remarks
- If multiple similar findings exist, list each one separately
- If the report mentions corrective action needed - that's a finding
- If something is marked for follow-up or monitoring - include it
- DO NOT miss statements like "not performed", "not acceptable", "exceeds limit"
- If the report is completely positive with NO issues, return empty array
- Extract the FULL context for each finding, including reference numbers

RETURN FORMAT: JSON object with "findings" array. If NO findings, return empty array.`,
            file_urls: [file_url],
            response_json_schema: {
              type: "object",
              properties: {
                findings: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      description: { type: "string" },
                      severity: { type: "string" },
                      item_reference: { type: "string" },
                      status: { type: "string" }
                    },
                    required: ["type", "description"]
                  }
                }
              }
            }
          });

          newFindings = findingsResult?.findings || [];

          // Normalize field names from uppercase to lowercase
          newFindings = newFindings.map(f => ({
            type: f.TYPE || f.type,
            description: f.DESCRIPTION || f.description,
            severity: f.SEVERITY || f.severity,
            item_reference: f['ITEM/REFERENCE'] || f.item_reference,
            status: f.STATUS || f.status
          }));

          // DEBUG: Log extracted findings
          console.log('=== FINDINGS EXTRACTION DEBUG ===');
          console.log('Findings result:', findingsResult);
          console.log('Extracted findings count:', newFindings.length);
          console.log('Normalized findings:', JSON.stringify(newFindings, null, 2));

          // Show analysis results
          const ncrs = newFindings.filter(f => f.type?.toLowerCase().includes('ncr') || f.type?.toLowerCase().includes('non-conformance'));
          const concerns = newFindings.filter(f => f.type?.toLowerCase().includes('concern'));
          const others = newFindings.length - ncrs.length - concerns.length;

          setAnalysisResult({
            status: 'complete',
            message: 'Analysis Complete!',
            findings: newFindings,
            ncrs: ncrs.length,
            concerns: concerns.length,
            others: others
          });

        } catch (error) {
          console.error("AI analysis error:", error);
          setAnalysisResult({ status: 'error', message: 'AI analysis failed. Please review manually.' });
        }

        // 3. Update report in database
        const updatedReports = [...inspectionReports];
        updatedReports[reportIndex] = {
          ...report,
          url: file_url,
          name: file.name.replace(/\.[^/.]+$/, ""),
          uploaded_date: new Date().toISOString(),
          findings: newFindings,
          approval_status: "pending", // Reset approval
          approved_by: null,
          approved_date: null
        };

        await updateInspectionMutation.mutateAsync({
          inspection_reports: updatedReports
        });

        toast.success("✓ Report replaced and saved!");

        // Clear analysis state after 5 seconds
        setTimeout(() => {
          setIsAnalyzing(false);
          setAnalysisResult(null);
        }, 5000);

      } catch (error) {
        console.error("Replace error:", error);
        toast.error("Failed to replace report");
        setIsAnalyzing(false);
        setAnalysisResult(null);
      }
    };

    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Analysis Progress Banner */}
      {isAnalyzing && analysisResult && (
        <Alert className={
          analysisResult.status === 'complete' ? "bg-green-50 border-green-200" :
            analysisResult.status === 'error' ? "bg-red-50 border-red-200" :
              "bg-blue-50 border-blue-200"
        }>
          {analysisResult.status === 'analyzing' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
          {analysisResult.status === 'uploading' && <Upload className="h-4 w-4 text-blue-600" />}
          {analysisResult.status === 'complete' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          {analysisResult.status === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
          <AlertDescription className={
            analysisResult.status === 'complete' ? "text-green-900" :
              analysisResult.status === 'error' ? "text-red-900" :
                "text-blue-900"
          }>
            <strong>{analysisResult.message}</strong>
            {analysisResult.status === 'complete' && analysisResult.findings && analysisResult.findings.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="font-semibold">📋 Found {analysisResult.findings.length} finding(s):</p>
                {analysisResult.ncrs > 0 && <p>• {analysisResult.ncrs} NCR(s)</p>}
                {analysisResult.concerns > 0 && <p>• {analysisResult.concerns} Concern(s)</p>}
                {analysisResult.others > 0 && <p>• {analysisResult.others} Other finding(s)</p>}
              </div>
            )}
            {analysisResult.status === 'complete' && analysisResult.findings?.length === 0 && (
              <p className="mt-1">✓ No issues or concerns detected in the replacement report.</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Status Alert */}
      {isFinalized ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>✓ Inspection Finalized:</strong> All required reports have been uploaded and the inspection is complete.
            {totalFindings > 0 && (
              <p className="text-sm mt-1 text-amber-800">
                ⚠️ Note: {totalFindings} finding(s) were detected - see Actions tab for details.
              </p>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className={requiredReportsUploaded ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}>
          <AlertCircle className={`h-4 w-4 ${requiredReportsUploaded ? "text-blue-600" : "text-amber-600"}`} />
          <AlertDescription className={requiredReportsUploaded ? "text-blue-900" : "text-amber-900"}>
            {requiredReportsUploaded ? (
              <>
                <strong>Ready to Finalize:</strong> All required reports are uploaded. The inspection will be automatically finalized when the status is set to "completed".
              </>
            ) : (
              <>
                <strong>Required Reports:</strong>
                <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
                  {!hasFinalInspectionReport && <li>At least one final inspection report is required</li>}
                  {inspection.is_final_inspection && !hasFinalReleaseNote && <li>Final release note is required for final inspection</li>}
                </ul>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Button */}
      {canUpload && !isFinalized && (
        <div className="flex justify-end">
          <Button
            onClick={onUploadClick}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Reports
          </Button>
        </div>
      )}

      {/* Notification Document */}
      {inspection.document_url && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Inspection Notification Document</h4>
                <p className="text-sm text-gray-600">Original notification PDF</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewDocument(inspection.document_url, "Inspection Notification")}
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(inspection.document_url, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const response = await fetch(inspection.document_url);
                    if (!response.ok) throw new Error('Download failed');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'notification.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    toast.success("Download started");
                  } catch (error) {
                    toast.error("Failed to download document");
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="inspection">
            Inspection Reports
            <div className="flex gap-1 ml-2">
              {inspectionReports.length > 0 && (
                <Badge className="bg-blue-100 text-blue-800">{inspectionReports.length}</Badge>
              )}
              {openFindings > 0 && (
                <Badge className="bg-red-100 text-red-800 animate-pulse">{openFindings} Open</Badge>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="release">
            Release Notes
            {releaseNotes.length > 0 && (
              <Badge className="ml-2 bg-purple-100 text-purple-800">{releaseNotes.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inspection" className="mt-6">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Report Name</TableHead>
                  <TableHead className="font-semibold">Uploaded By</TableHead>
                  <TableHead className="font-semibold">Upload Date</TableHead>
                  <TableHead className="font-semibold">Report Date</TableHead>
                  <TableHead className="font-semibold w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspectionReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No inspection reports uploaded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  inspectionReports.map((report, index) => (
                    <ReportCard
                      key={index}
                      report={report}
                      reportType="inspection"
                      reportIndex={index}
                      onDelete={onDeleteReport}
                      canDelete={canDelete}
                      onViewReport={(url) => handleViewDocument(url, report.name)}
                      onViewFindings={handleViewFindings}
                      onApprove={(r) => handleApprovalClick(r, "approved")}
                      onReject={(r) => handleApprovalClick(r, "rejected")}
                      canApprove={canApprove}
                      onReplace={handleReplaceReport}
                      canReplace={true}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="release" className="mt-6">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Release Note Name</TableHead>
                  <TableHead className="font-semibold">Uploaded By</TableHead>
                  <TableHead className="font-semibold">Upload Date</TableHead>
                  <TableHead className="font-semibold w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releaseNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No release notes uploaded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  releaseNotes.map((report, index) => (
                    <ReportCard
                      key={index}
                      report={report}
                      reportType="release_note"
                      onDelete={onDeleteReport}
                      canDelete={canDelete}
                      onViewReport={(url) => handleViewDocument(url, report.name)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Document Viewer Dialog */}
      <Dialog open={!!viewingDocumentUrl} onOpenChange={() => setViewingDocumentUrl(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle>{viewingDocumentTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 px-6 pb-6 overflow-hidden bg-gray-100 flex items-center justify-center relative">
            {viewingDocumentUrl && (
              (() => {
                const urlLower = viewingDocumentUrl.toLowerCase();
                const isImage = urlLower.match(/\.(jpeg|jpg|gif|png|webp)$/) != null;
                const isPdf = urlLower.match(/\.pdf$/) != null;

                if (isImage) {
                  return (
                    <img
                      src={viewingDocumentUrl}
                      alt="Document"
                      className="max-w-full max-h-full object-contain rounded shadow-sm"
                    />
                  );
                } else {
                  // Default to iframe for PDF and others
                  return (
                    <div className="w-full h-full bg-white rounded-lg shadow-sm border overflow-hidden relative">
                      <iframe
                        src={viewingDocumentUrl}
                        className="w-full h-full"
                        title="Document Viewer"
                        onError={() => toast.error("Failed to load document preview")}
                      />
                      {/* Fallback overlay if iframe fails visually or for UX */}
                      <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded shadow text-xs text-gray-500 pointer-events-none">
                        If document doesn't load, use "Open" button
                      </div>
                    </div>
                  );
                }
              })()
            )}
          </div>
          <div className="p-4 border-t bg-gray-50 shrink-0 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(viewingDocumentUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
            <Button
              variant="default"
              onClick={() => setViewingDocumentUrl(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Findings Viewer Dialog */}
      <Dialog open={!!viewingFindingsReport} onOpenChange={() => setViewingFindingsReport(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Findings - {viewingFindingsReport?.name}</DialogTitle>
          </DialogHeader>
          {viewingFindingsReport && (
            <div className="space-y-4">
              {/* Report Info */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900">{viewingFindingsReport.name}</h4>
                    <div className="flex gap-2 mt-1">
                      {viewingFindingsReport.is_final_report && (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                          Final Report
                        </Badge>
                      )}
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        {viewingFindingsReport.findings?.length || 0} Finding(s)
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(viewingFindingsReport.url, viewingFindingsReport.name)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Report
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Findings Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold w-[120px]">Type</TableHead>
                      <TableHead className="font-semibold w-[100px]">Severity</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="font-semibold w-[150px]">Reference</TableHead>
                      <TableHead className="font-semibold w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewingFindingsReport.findings || []).map((finding, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge className={`${getTypeColor(finding.type)} font-medium`}>
                            {finding.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {finding.severity ? (
                            <Badge className={`${getSeverityColor(finding.severity)} font-medium`}>
                              {finding.severity}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-900">{finding.description}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-600">{finding.item_reference || "-"}</p>
                        </TableCell>
                        <TableCell>
                          {finding.closure_status === "closed" ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Closed
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                              {finding.status || "Open"}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900">
                  <strong>Note:</strong> To take action on these findings (close, add justifications, upload closure documents), please go to the <strong>Actions tab</strong>.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <AlertDialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingApproval?.status === 'approved' ? 'Approve Report?' : 'Reject Report?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingApproval?.status === 'approved' ? (
                <div className="space-y-2">
                  <p>You are about to approve this inspection report:</p>
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <p className="font-semibold text-gray-900">{pendingApproval?.report?.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Uploaded: {pendingApproval?.report?.uploaded_date && format(parseISO(pendingApproval.report.uploaded_date), 'MMM d, yyyy')}
                    </p>
                    {pendingApproval?.report?.findings && pendingApproval.report.findings.length > 0 && (
                      <p className="text-sm text-amber-700 mt-1 font-medium">
                        ⚠️ This report has {pendingApproval.report.findings.length} finding(s)
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    This action confirms that the report meets all requirements and is approved for use.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>You are about to reject this inspection report:</p>
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <p className="font-semibold text-gray-900">{pendingApproval?.report?.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Uploaded: {pendingApproval?.report?.uploaded_date && format(parseISO(pendingApproval.report.uploaded_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <p className="text-sm text-red-600 mt-2">
                    This action marks the report as rejected. The inspector will need to upload a corrected version.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApproval}
              className={pendingApproval?.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {pendingApproval?.status === 'approved' ? 'Approve Report' : 'Reject Report'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}