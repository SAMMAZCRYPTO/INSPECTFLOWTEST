import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { X, Upload, FileText, AlertCircle, Loader2, CheckCircle2, Star, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { isPast, isFuture, parseISO, startOfDay, isAfter } from "date-fns";

export default function UploadReportsDialog({ open, onClose, inspection, onSuccess, currentUser }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingFindings, setProcessingFindings] = useState(false);
  const [extractedFindings, setExtractedFindings] = useState([]);

  const [inspectionReportFiles, setInspectionReportFiles] = useState([]);
  const [testReportFiles, setTestReportFiles] = useState([]);
  const [releaseNoteFiles, setReleaseNoteFiles] = useState([]);
  const [additionalFiles, setAdditionalFiles] = useState([]);

  const [requiredDocs, setRequiredDocs] = useState({
    inspection_report: inspection?.required_documents?.inspection_report ?? true,
    test_reports: inspection?.required_documents?.test_reports ?? false,
    release_note: inspection?.required_documents?.release_note ?? false,
  });

  const handleFileChange = (e, setter, defaultType = "Flash") => {
    const files = Array.from(e.target.files);
    setter(prev => [
      ...prev,
      ...files.map(file => ({
        file,
        name: file.name.replace(/\.[^/.]+$/, ""),
        isFinal: false,
        reportType: defaultType,
        reportDate: new Date().toISOString().split('T')[0]
      }))
    ]);
  };

  const removeFile = (setter, index) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileName = (setter, index, newName) => {
    setter(prev => prev.map((item, i) => i === index ? { ...item, name: newName } : item));
  };

  const updateFileDate = (setter, index, newDate) => {
    setter(prev => prev.map((item, i) => i === index ? { ...item, reportDate: newDate } : item));
  };

  const updateFileType = (setter, index, newType) => {
    setter(prev => prev.map((item, i) => i === index ? { ...item, reportType: newType } : item));
  };

  const toggleFinal = (setter, index) => {
    setter(prev => prev.map((item, i) => ({
      ...item,
      isFinal: i === index ? !item.isFinal : false
    })));
  };

  const handleUpload = async () => {
    // VALIDATION 1: Check if inspection is scheduled
    if (inspection.status === "received") {
      toast.error("❌ Cannot upload reports: Inspection is not yet scheduled. Please assign an inspector first.");
      return;
    }

    // VALIDATION 2: Check if inspection date has started (must be today or past)
    if (inspection.start_date) {
      const startDate = startOfDay(parseISO(inspection.start_date));
      const today = startOfDay(new Date());

      if (isAfter(startDate, today)) {
        toast.error("❌ Cannot upload reports: Inspection has not started yet. The inspection date is in the future.");
        return;
      }
    }

    // VALIDATION 3: Check required documents based on checkboxes
    if (requiredDocs.inspection_report && inspectionReportFiles.length === 0) {
      toast.error("Please upload at least one inspection report (marked as required)");
      return;
    }

    if (requiredDocs.test_reports && testReportFiles.length === 0) {
      toast.error("Please upload at least one test report/MTC (marked as required)");
      return;
    }

    if (requiredDocs.release_note && releaseNoteFiles.length === 0) {
      toast.error("Please upload at least one IRC/release note (marked as required)");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const totalFiles = inspectionReportFiles.length + testReportFiles.length + releaseNoteFiles.length + additionalFiles.length;
      let uploadedCount = 0;

      // Helper function to upload files and extract findings for inspection reports
      const uploadFiles = async (files, reportType) => {
        const uploadedReports = [];
        for (const fileItem of files) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: fileItem.file });

          let findings = [];

          // Extract findings only for inspection reports
          if (reportType === "inspection") {
            setProcessingFindings(true);
            try {
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

              findings = findingsResult?.findings || [];

              // Show findings to user
              if (findings.length > 0) {
                setExtractedFindings(prev => [...prev, {
                  reportName: fileItem.name,
                  findings: findings
                }]);
              }
            } catch (error) {
              console.error("Error extracting findings:", error);
              // Don't fail upload if AI extraction fails
              toast.warning(`Uploaded ${fileItem.name} but could not auto-extract findings`);
            } finally {
              setProcessingFindings(false);
            }
          }

          uploadedReports.push({
            name: fileItem.name,
            url: file_url,
            uploaded_by: currentUser?.email || "unknown",
            uploaded_date: new Date().toISOString(),
            ...(reportType === "inspection" && {
              report_date: fileItem.reportDate,
              report_type: fileItem.reportType,
              is_final_report: fileItem.isFinal,
              approval_status: "pending", // Default to pending approval
              findings: findings
            }),
            ...(reportType === "release_note" && {
              is_final_release_note: fileItem.isFinal
            })
          });
          uploadedCount++;
          setProgress((uploadedCount / totalFiles) * 100);
        }
        return uploadedReports;
      };

      // Upload all files
      const newInspectionReports = await uploadFiles(inspectionReportFiles, "inspection");
      const newTestReports = await uploadFiles(testReportFiles, "test");
      const newReleaseNotes = await uploadFiles(releaseNoteFiles, "release_note");
      const newAdditionalReports = await uploadFiles(additionalFiles, "additional");

      // Get existing reports
      const existingReports = inspection.inspection_reports || [];

      // Merge all uploads into inspection_reports (the only reports column that exists)
      // Tag each report with its type for filtering later
      const allNewReports = [
        ...newInspectionReports.map(r => ({ ...r, category: 'inspection' })),
        ...newTestReports.map(r => ({ ...r, category: 'test' })),
        ...newReleaseNotes.map(r => ({ ...r, category: 'release_note' })),
        ...newAdditionalReports.map(r => ({ ...r, category: 'additional' }))
      ];

      const updatedReports = [...existingReports, ...allNewReports];

      // Auto-finalize if any inspection report is uploaded
      const shouldFinalize = newInspectionReports.length > 0;

      // Update inspection - only inspection_reports column exists
      await base44.entities.Inspection.update(inspection.id, {
        inspection_reports: updatedReports,
        ...(shouldFinalize && { status: "finalized" })
      });

      // Show findings summary if any were found
      const totalFindings = extractedFindings.reduce((sum, r) => sum + r.findings.length, 0);
      if (totalFindings > 0) {
        toast.success(`✓ Reports uploaded! Found ${totalFindings} finding(s) that need attention.`, {
          duration: 5000,
        });
      } else {
        toast.success(shouldFinalize
          ? "✓ Reports uploaded and inspection finalized!"
          : "✓ Reports uploaded successfully!"
        );
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload reports. Please try again.");
    } finally {
      setUploading(false);
      setProgress(0);
      setProcessingFindings(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setInspectionReportFiles([]);
      setTestReportFiles([]);
      setReleaseNoteFiles([]);
      setAdditionalFiles([]);
      setExtractedFindings([]);
      setProgress(0);
      onClose();
    }
  };

  const canUpload = inspection.status !== "received" &&
    (!inspection.start_date || !isAfter(startOfDay(parseISO(inspection.start_date)), startOfDay(new Date())));

  const uploadBlockedReason = !canUpload ? (
    inspection.status === "received" ?
      "Inspection must be scheduled before uploading reports" :
      "Inspection date has not started yet"
  ) : null;

  const getSeverityColor = (severity) => {
    const sev = severity?.toLowerCase() || "";
    if (sev.includes("critical") || sev.includes("major")) return "bg-red-100 text-red-800 border-red-200";
    if (sev.includes("minor")) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  const FileList = ({ files, setter, allowFinal = false, allowDate = false, label }) => (
    <div className="space-y-2">
      {files.map((fileItem, index) => (
        <div key={index} className="border rounded-lg p-3 bg-gray-50">
          <div className="flex items-start gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Input
                value={fileItem.name}
                onChange={(e) => updateFileName(setter, index, e.target.value)}
                placeholder="Report name"
                className="text-sm"
              />
              {allowDate && (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={fileItem.reportDate}
                    onChange={(e) => updateFileDate(setter, index, e.target.value)}
                    className="text-sm flex-1"
                  />
                  {label === "Inspection Report" && (
                    <Select
                      value={fileItem.reportType}
                      onValueChange={(val) => updateFileType(setter, index, val)}
                    >
                      <SelectTrigger className="w-[120px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Flash">Flash</SelectItem>
                        <SelectItem value="Interim">Interim</SelectItem>
                        <SelectItem value="Final">Final</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              {allowFinal && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={fileItem.isFinal}
                    onCheckedChange={() => toggleFinal(setter, index)}
                  />
                  <span className="text-sm font-medium text-amber-700 flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Mark as Final {label} (optional - for finalization)
                  </span>
                </label>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeFile(setter, index)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 pl-6">
            File: {fileItem.file.name}
          </p>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Inspection Reports</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!canUpload && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>❌ Upload Blocked:</strong> {uploadBlockedReason}
                {inspection.status === "received" && (
                  <div className="mt-2">
                    <p className="text-sm">→ Please assign a TPI agency and inspector to schedule this inspection first.</p>
                  </div>
                )}
                {inspection.start_date && isAfter(startOfDay(parseISO(inspection.start_date)), startOfDay(new Date())) && (
                  <div className="mt-2">
                    <p className="text-sm">→ The inspection is scheduled for the future. You can amend the notification date to an earlier date if needed.</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {extractedFindings.length > 0 && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <strong>⚠️ Findings Detected in Inspection Reports:</strong>
                <div className="mt-3 space-y-3 max-h-64 overflow-y-auto">
                  {extractedFindings.map((reportFindings, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-amber-200">
                      <p className="font-semibold text-amber-900 mb-2 text-sm">
                        📄 {reportFindings.reportName}
                      </p>
                      <div className="space-y-2">
                        {reportFindings.findings.map((finding, fIdx) => (
                          <div key={fIdx} className="bg-amber-50 rounded p-2 border border-amber-100">
                            <div className="flex items-start gap-2 mb-1">
                              <Badge className={`${getSeverityColor(finding.severity)} text-xs`}>
                                {finding.type}
                              </Badge>
                              {finding.severity && (
                                <Badge variant="outline" className="text-xs">
                                  {finding.severity}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-900">{finding.description}</p>
                            {finding.item_reference && (
                              <p className="text-xs text-gray-600 mt-1">
                                Reference: {finding.item_reference}
                              </p>
                            )}
                            {finding.status && (
                              <p className="text-xs text-gray-600">
                                Status: {finding.status}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm mt-2">
                  These findings will be saved and accessible in the Actions section for follow-up.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <Alert className="bg-indigo-50 border-indigo-200">
            <AlertCircle className="h-4 w-4 text-indigo-600" />
            <AlertDescription className="text-indigo-900">
              <strong>📋 Select Required Documents for Finalization:</strong>
              <p className="text-sm mt-2 mb-3">
                Check which documents are required for this inspection to be finalized. The system will automatically finalize when all required documents are uploaded and the status is "Completed".
              </p>
              <div className="space-y-2 mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={requiredDocs.inspection_report}
                    onCheckedChange={(checked) => setRequiredDocs(prev => ({ ...prev, inspection_report: checked }))}
                  />
                  <span className="text-sm font-medium">Inspection Report (Required)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={requiredDocs.test_reports}
                    onCheckedChange={(checked) => setRequiredDocs(prev => ({ ...prev, test_reports: checked }))}
                  />
                  <span className="text-sm font-medium">Test Reports / MTCs</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={requiredDocs.release_note}
                    onCheckedChange={(checked) => setRequiredDocs(prev => ({ ...prev, release_note: checked }))}
                  />
                  <span className="text-sm font-medium">IRC / Release Note</span>
                </label>
              </div>
            </AlertDescription>
          </Alert>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Multiple Reports Supported:</strong> You can upload flash reports, interim reports, and a final report.
              <br />
              <strong className="inline-block mt-1">⭐ "Final" checkbox:</strong> Only mark as final if you want the inspection to auto-finalize. You can upload reports without marking as final.
              <br />
              <strong className="inline-block mt-1">🔍 AI Analysis:</strong> Inspection reports will be automatically analyzed for non-conformances and findings.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold flex items-center gap-2">
                Inspection Reports {requiredDocs.inspection_report && <span className="text-red-600">*</span>}
                {requiredDocs.inspection_report && (
                  <Badge className="bg-red-100 text-red-800 text-xs">Required</Badge>
                )}
              </Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                onChange={(e) => handleFileChange(e, setInspectionReportFiles, "Flash")}
                className="hidden"
                id="inspection-reports"
                disabled={!canUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('inspection-reports').click()}
                disabled={!canUpload}
              >
                <Upload className="w-4 h-4 mr-2" />
                Add Files
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Upload flash, interim, or final inspection reports. Optional: Mark as 'Final' when ready to finalize.
            </p>
            {inspectionReportFiles.length > 0 && (
              <FileList
                files={inspectionReportFiles}
                setter={setInspectionReportFiles}
                allowFinal={true}
                allowDate={true}
                label="Inspection Report"
              />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold flex items-center gap-2">
                Test Reports / MTCs {requiredDocs.test_reports && <span className="text-red-600">*</span>}
                {requiredDocs.test_reports ? (
                  <Badge className="bg-red-100 text-red-800 text-xs">Required</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600 text-xs">Optional</Badge>
                )}
              </Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                onChange={(e) => handleFileChange(e, setTestReportFiles)}
                className="hidden"
                id="test-reports"
                disabled={!canUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('test-reports').click()}
                disabled={!canUpload}
              >
                <Upload className="w-4 h-4 mr-2" />
                Add Files
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Upload test records and Material Test Certificates (MTCs).
            </p>
            {testReportFiles.length > 0 && (
              <FileList
                files={testReportFiles}
                setter={setTestReportFiles}
                label="Test Report"
              />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold flex items-center gap-2">
                IRC / Release Notes {requiredDocs.release_note && <span className="text-red-600">*</span>}
                {requiredDocs.release_note ? (
                  <Badge className="bg-red-100 text-red-800 text-xs">Required</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600 text-xs">Optional</Badge>
                )}
              </Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                onChange={(e) => handleFileChange(e, setReleaseNoteFiles)}
                className="hidden"
                id="release-notes"
                disabled={!canUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('release-notes').click()}
                disabled={!canUpload}
              >
                <Upload className="w-4 h-4 mr-2" />
                Add Files
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              {requiredDocs.release_note
                ? "Required for this inspection. Mark one as 'Final IRC/Release Note' when ready."
                : "Optional IRC/release notes for this inspection."}
            </p>
            {releaseNoteFiles.length > 0 && (
              <FileList
                files={releaseNoteFiles}
                setter={setReleaseNoteFiles}
                allowFinal={requiredDocs.release_note}
                label="Release Note"
              />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Additional Documents
              </Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                onChange={(e) => handleFileChange(e, setAdditionalFiles)}
                className="hidden"
                id="additional-files"
                disabled={!canUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('additional-files').click()}
                disabled={!canUpload}
              >
                <Upload className="w-4 h-4 mr-2" />
                Add Files
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Optional supporting documents, photos, or other files.
            </p>
            {additionalFiles.length > 0 && (
              <FileList
                files={additionalFiles}
                setter={setAdditionalFiles}
                label="Document"
              />
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span className="text-sm font-medium">
                  {processingFindings ? "Analyzing inspection reports for findings..." : "Uploading reports..."}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-gray-600">{Math.round(progress)}% complete</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !canUpload}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {processingFindings ? "Analyzing..." : "Uploading..."}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Upload Reports
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}