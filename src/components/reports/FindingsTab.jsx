import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Download,
  ExternalLink,
  XCircle,
  Upload,
  Eye,
  Archive,
  History,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function FindingsTab({ inspection, onUpdate, currentUser }) {
  const [closingFindingId, setClosingFindingId] = useState(null);
  const [closureJustification, setClosureJustification] = useState("");
  const [closureDocuments, setClosureDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("open");
  const [viewingDocumentUrl, setViewingDocumentUrl] = useState(null);
  const [viewingDocumentTitle, setViewingDocumentTitle] = useState("");

  const inspectionReports = inspection.inspection_reports || [];

  const isAdmin = currentUser?.role === "admin" || currentUser?.inspection_role === "admin";
  const isInspectionEngineer = currentUser?.inspection_role === "inspection_engineer";
  const isQCManager = currentUser?.inspection_role === "qc_manager";
  const isInspector = currentUser?.inspection_role === "inspector";
  const isInspectionAgency = currentUser?.inspection_role === "inspection_agency";

  const isAssignedTPI = isInspectionAgency && inspection.tpi_agency === (currentUser?.company || currentUser?.company_affiliation);
  const isAssignedInspector = isInspector && (inspection.assigned_inspector_email === currentUser?.email || inspection.assigned_inspector_id === currentUser?.id);

  const canCloseFindings = isAdmin || isInspectionEngineer || isQCManager || isAssignedInspector || isAssignedTPI;

  // Group findings by report
  const reportGroups = inspectionReports
    .filter(report => report.findings && report.findings.length > 0)
    .map(report => ({
      reportName: report.name,
      reportUrl: report.url,
      reportDate: report.report_date,
      isFinalReport: report.is_final_report,
      findings: (report.findings || []).map((finding, idx) => {
        // Normalize field names (AI returns uppercase, UI expects lowercase)
        const normalizedFinding = {};
        for (const [key, value] of Object.entries(finding)) {
          const lowerKey = key.toLowerCase();
          normalizedFinding[lowerKey] = value;
        }

        return {
          ...normalizedFinding,
          id: normalizedFinding.id || `${report.url}_${idx}`,
        };
      })
    }));

  // Separate open and closed report groups
  const openReportGroups = reportGroups
    .map(group => ({
      ...group,
      findings: group.findings.filter(f => f.closure_status !== "closed")
    }))
    .filter(group => group.findings.length > 0);

  const closedReportGroups = reportGroups
    .map(group => ({
      ...group,
      findings: group.findings.filter(f => f.closure_status === "closed")
    }))
    .filter(group => group.findings.length > 0);

  // Count totals
  const totalOpenFindings = openReportGroups.reduce((sum, group) => sum + group.findings.length, 0);
  const totalClosedFindings = closedReportGroups.reduce((sum, group) => sum + group.findings.length, 0);
  const totalFindings = totalOpenFindings + totalClosedFindings;

  const criticalOpenFindings = openReportGroups.reduce((sum, group) => {
    return sum + group.findings.filter(f =>
      f.severity?.toLowerCase().includes("critical") ||
      f.severity?.toLowerCase().includes("major")
    ).length;
  }, 0);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    setClosureDocuments(prev => [...prev, ...files]);
  };

  const handleCloseFinding = async () => {
    if (!closureJustification.trim()) {
      toast.error("Please provide a justification for closing this finding");
      return;
    }

    setUploading(true);

    try {
      // Upload closure documents
      const uploadedDocs = [];
      for (const file of closureDocuments) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedDocs.push({
          name: file.name,
          url: file_url
        });
      }

      // Find the report and finding to update
      const updatedReports = inspectionReports.map(report => {
        const updatedFindings = (report.findings || []).map((finding, idx) => {
          const findingId = finding.id || `${report.url}_${idx}`;
          if (findingId === closingFindingId) {
            return {
              ...finding,
              id: findingId,
              closure_status: "closed",
              status: "Closed",
              closure_justification: closureJustification,
              closure_documents: uploadedDocs,
              closed_by: currentUser?.email,
              closed_date: new Date().toISOString()
            };
          }
          return { ...finding, id: findingId };
        });
        return { ...report, findings: updatedFindings };
      });

      await base44.entities.Inspection.update(inspection.id, {
        inspection_reports: updatedReports
      });

      // Notify QC Engineer and Manager
      try {
        // Find recipients
        const recipients = [];
        if (inspection.created_by) recipients.push(inspection.created_by); // QC Engineer (Creator)

        // If there's a specific QC Manager assigned or system-wide, we'd add them.
        // For now, we just notify the creator (QC Engineer) and try to find QC Managers
        // Since we can't easily query users here without context/hook, we will send to creator.
        // If the current user IS the creator, maybe we don't need to notify? But let's do it for audit.

        if (recipients.length > 0) {
          await base44.integrations.Core.SendEmail({
            to: recipients.join(','),
            subject: `Finding Closed - ${inspection.notification_number}`,
            body: `A finding has been closed for inspection ${inspection.notification_number} (PO: ${inspection.po_number}).\n\nClosed By: ${currentUser?.full_name} (${currentUser?.email})\nJustification: ${closureJustification}\n\nPlease log in to InspectFlow to review.`
          });
        }
      } catch (notifyError) {
        console.error("Failed to send notification email", notifyError);
      }

      toast.success("Finding closed successfully");
      setClosingFindingId(null);
      setClosureJustification("");
      setClosureDocuments([]);

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error closing finding:", error);
      toast.error("Failed to close finding");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadReport = async (url, reportName) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = reportName || 'report.pdf';
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

  const handleViewDocument = (url, title = "Document") => {
    setViewingDocumentUrl(url);
    setViewingDocumentTitle(title);
  };

  const ReportGroupDisplay = ({ reportGroups, showActions = true }) => (
    <div className="space-y-6">
      {reportGroups.map((group, groupIdx) => (
        <Card key={groupIdx} className="p-6">
          {/* Report Header */}
          <div className="flex items-start gap-3 mb-4 pb-4 border-b">
            <FileText className="w-5 h-5 text-gray-500 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">{group.reportName}</h3>
              <div className="flex gap-2 mt-1 flex-wrap">
                {group.isFinalReport && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                    Final Report
                  </Badge>
                )}
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  {group.findings.length} Finding{group.findings.length > 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewDocument(group.reportUrl, group.reportName)}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(group.reportUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadReport(group.reportUrl, group.reportName)}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>

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
                  {showActions && canCloseFindings && <TableHead className="font-semibold w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.findings.map((finding, fIdx) => (
                  <TableRow key={fIdx}>
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
                      {finding.closure_status === "closed" && (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold text-green-900 text-sm">Finding Closed</p>
                              <p className="text-xs text-green-700">
                                Closed by {finding.closed_by} on {new Date(finding.closed_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm font-medium text-green-900 mb-1">Justification:</p>
                            <p className="text-sm text-green-800 whitespace-pre-wrap">{finding.closure_justification}</p>
                          </div>
                          {finding.closure_documents && finding.closure_documents.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-green-900 mb-1">Closure Documents:</p>
                              <div className="space-y-1">
                                {finding.closure_documents.map((doc, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <FileText className="w-3 h-3 text-green-700" />
                                    <a
                                      href={doc.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-green-700 hover:text-green-900 underline"
                                    >
                                      {doc.name}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
                    {showActions && canCloseFindings && finding.closure_status !== "closed" && (
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setClosingFindingId(finding.id)}
                          className="text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Close
                        </Button>
                      </TableCell>
                    )}
                    {showActions && canCloseFindings && finding.closure_status === "closed" && (
                      <TableCell>
                        <span className="text-xs text-gray-400">Closed</span>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Alert */}
      {totalFindings === 0 ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>✓ No Issues Found:</strong> All inspection reports show no non-conformances, concerns, or findings. Everything appears to be in compliance.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <strong>⚠️ {totalOpenFindings} Open Finding(s)</strong>
              {totalClosedFindings > 0 && ` • ${totalClosedFindings} Closed`}
              {criticalOpenFindings > 0 && (
                <p className="text-sm mt-1 font-semibold text-red-800">
                  🚨 {criticalOpenFindings} Critical/Major finding(s) require immediate action!
                </p>
              )}
            </AlertDescription>
          </Alert>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Open Findings</p>
                <p className="text-3xl font-bold text-amber-600">{totalOpenFindings}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Critical/Major</p>
                <p className="text-3xl font-bold text-red-600">{criticalOpenFindings}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Closed</p>
                <p className="text-3xl font-bold text-green-600">{totalClosedFindings}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total</p>
                <p className="text-3xl font-bold text-gray-900">{totalFindings}</p>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Tabs for Open and Closed Findings */}
      {totalFindings > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="open">
              Open Findings
              {totalOpenFindings > 0 && (
                <Badge className="ml-2 bg-amber-100 text-amber-800">{totalOpenFindings}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="closed">
              <Archive className="w-4 h-4 mr-2" />
              Closed Findings
              {totalClosedFindings > 0 && (
                <Badge className="ml-2 bg-green-100 text-green-800">{totalClosedFindings}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-6">
            {openReportGroups.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  All Findings Closed!
                </h3>
                <p className="text-gray-600">
                  All findings have been addressed and closed.
                </p>
              </div>
            ) : (
              <ReportGroupDisplay reportGroups={openReportGroups} showActions={true} />
            )}
          </TabsContent>

          <TabsContent value="closed" className="mt-6">
            {closedReportGroups.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Closed Findings
                </h3>
                <p className="text-gray-600">
                  Closed findings will appear here for reference.
                </p>
              </div>
            ) : (
              <ReportGroupDisplay reportGroups={closedReportGroups} showActions={false} />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Close Finding Dialog */}
      <Dialog open={!!closingFindingId} onOpenChange={() => {
        setClosingFindingId(null);
        setClosureJustification("");
        setClosureDocuments([]);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Close Finding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Note:</strong> Closing a finding marks it as resolved. Provide a clear justification and supporting documents.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="justification">Closure Justification *</Label>
              <Textarea
                id="justification"
                value={closureJustification}
                onChange={(e) => setClosureJustification(e.target.value)}
                placeholder="Explain why this finding is being closed and what actions were taken..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Closure Documents (Optional)</Label>
              <Input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500">
                Upload supporting documents (photos, corrective action reports, etc.)
              </p>
              {closureDocuments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {closureDocuments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                      <FileText className="w-3 h-3" />
                      <span>{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setClosureDocuments(prev => prev.filter((_, i) => i !== idx))}
                        className="h-6 text-red-600"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setClosingFindingId(null);
                setClosureJustification("");
                setClosureDocuments([]);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCloseFinding}
              disabled={uploading || !closureJustification.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {uploading ? "Closing..." : "Close Finding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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