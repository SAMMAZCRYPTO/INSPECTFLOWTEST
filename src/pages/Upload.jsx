import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Sparkles, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import UploadZone from "../components/upload/UploadZone";
import ReviewForm from "../components/upload/ReviewForm";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Upload() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [extractedDataList, setExtractedDataList] = useState([]);
  const [processingStatus, setProcessingStatus] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [currentEditingIndex, setCurrentEditingIndex] = useState(null);
  const [duplicateDialog, setDuplicateDialog] = useState(null);

  const { data: existingInspections } = useQuery({
    queryKey: ["inspections"],
    queryFn: () => base44.entities.Inspection.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Inspection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Inspection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
    },
  });

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
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
      po_number: {
        type: "string",
        description: "Purchase Order number or PO number"
      },
      notification_number: {
        type: "string",
        description: "Inspection notification number or reference number"
      },
      notification_revision: {
        type: "string",
        description: "Notification revision number or version"
      },
      notification_receipt_date: {
        type: "string",
        format: "date",
        description: "Inspection notification receipt date in YYYY-MM-DD format (usually found on top left of PDF)"
      },
      supplier_name: {
        type: "string",
        description: "Name of supplier where the purchase order (PO) is issued"
      },
      subsupplier_name: {
        type: "string",
        "description": "Name of the manufacturer or sub-supplier (sometimes same as supplier)"
      },
      country: {
        type: "string",
        description: "Country where inspection will take place"
      },
      inspection_location: {
        type: "string",
        description: "Location or address where the inspection will take place (place of witness)"
      },
      start_date: {
        type: "string",
        format: "date",
        description: "The EARLIEST inspection date mentioned in the entire document in YYYY-MM-DD format"
      },
      end_date: {
        type: "string",
        format: "date",
        description: "The LATEST inspection date mentioned in the entire document in YYYY-MM-DD format if there are multiple dates, otherwise leave empty"
      },
      all_inspection_dates: {
        type: "string",
        description: "CRITICAL: List ALL inspection dates found anywhere in the document including in tables, schedules, or text. Format as comma-separated dates in YYYY-MM-DD format (e.g., '2024-10-30, 2024-11-14, 2024-11-15, 2024-11-16'). DO NOT miss any dates."
      },
      inspection_activities: {
        type: "string",
        description: "CRITICAL: Extract ALL inspection activities, tests, or interventions mentioned in any tables or schedules. For each activity include: date, time, ITP step number, activity description, and any remarks. Format as a detailed list or table structure."
      },
      inspection_time: {
        type: "string",
        description: "Time of inspection if applicable (e.g., 09:00, 14:30)"
      },
      po_description: {
        type: "string",
        description: "Purchase Order description or details"
      },
      inspection_type: {
        type: "string",
        description: "Type of inspection (e.g., Building, Fire Safety, Health, Electrical)"
      },
      inspector_name: {
        type: "string",
        description: "Name of the assigned inspector or manufacturer contact person name"
      },
      contact_phone: {
        type: "string",
        description: "Contact phone number or manufacturer telephone"
      },
      contact_email: {
        type: "string",
        description: "Contact email address or manufacturer email address"
      },
      requirements: {
        type: "string",
        description: "Requirements or checklist items for the inspection"
      },
      notes: {
        type: "string",
        description: "Additional notes or comments"
      }
    }
  };

  const checkForDuplicate = (extractedData) => {
    if (!extractedData.po_number || !extractedData.notification_number) {
      return null;
    }

    const duplicate = existingInspections.find(
      (inspection) =>
        inspection.po_number === extractedData.po_number &&
        inspection.notification_number === extractedData.notification_number
    );

    return duplicate;
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
        // Check if Word file and show error
        if (isWordFile) {
          throw new Error("Word files are not supported. Please convert your .docx file to PDF first (File > Save As > PDF in Word), then upload the PDF version.");
        }

        // Update status: uploading
        setProcessingStatus(prev => prev.map((s, idx) => 
          idx === i ? { ...s, status: 'uploading', progress: 30 } : s
        ));

        // Upload file
        const { file_url } = await base44.integrations.Core.UploadFile({
          file: file,
        });

        // Update status: extracting
        setProcessingStatus(prev => prev.map((s, idx) => 
          idx === i ? { ...s, status: 'extracting', progress: 60 } : s
        ));

        // Use ExtractDataFromUploadedFile for PDF and images
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: inspectionSchema,
        });

        if (result.status === "success" && result.output) {
          const extractedData = result.output;
          
          // Check for duplicates
          const duplicate = checkForDuplicate(extractedData);
          
          const dataToAdd = {
            ...extractedData,
            document_url: file_url,
            status: "scheduled",
            fileName: file.name,
            isDuplicate: !!duplicate,
            duplicateRecord: duplicate,
          };
          
          results.push(dataToAdd);
          
          // Update status: success (with warning if duplicate)
          setProcessingStatus(prev => prev.map((s, idx) => 
            idx === i ? { 
              ...s, 
              status: duplicate ? 'warning' : 'success', 
              progress: 100,
              warning: duplicate ? `Duplicate found: PO ${extractedData.po_number}, Notification ${extractedData.notification_number}` : null
            } : s
          ));
        } else {
          throw new Error(result.details || "Failed to extract data from the document");
        }
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
        const errorMsg = err.message || err.toString() || "Processing failed";
        
        // Update status: error
        setProcessingStatus(prev => prev.map((s, idx) => 
          idx === i ? { ...s, status: 'error', progress: 0, error: errorMsg } : s
        ));
      }
    }

    setExtractedDataList(results);
    setIsProcessing(false);

    if (results.length === 0) {
      const errorDetails = processingStatus
        .filter(s => s.status === 'error' && s.error)
        .map(s => `${s.fileName}: ${s.error}`)
        .join('; ');
      
      setError(`Failed to process files. ${errorDetails || 'Please check the file formats and try again.'}`);
      setFiles([]);
    } else if (results.length < selectedFiles.length) {
      setError(`Successfully processed ${results.length} of ${selectedFiles.length} files. Some files could not be processed.`);
    }

    // Check if any duplicates were found
    const duplicatesFound = results.filter(r => r.isDuplicate).length;
    if (duplicatesFound > 0) {
      setError(`⚠️ ${duplicatesFound} duplicate notification${duplicatesFound > 1 ? 's' : ''} detected. Please review before saving.`);
    }
  };

  const handleSave = async (data, index) => {
    const itemData = extractedDataList[index];
    
    // If it's a duplicate, show confirmation dialog
    if (itemData.isDuplicate) {
      setDuplicateDialog({
        data,
        index,
        existing: itemData.duplicateRecord,
      });
      return;
    }

    await createMutation.mutateAsync(data);
    
    // Remove this item from the list
    setExtractedDataList(prev => prev.filter((_, idx) => idx !== index));
    setCurrentEditingIndex(null);
    
    // If all done, navigate back
    if (extractedDataList.length === 1) {
      navigate(createPageUrl("Dashboard"));
    }
  };

  const handleDuplicateConfirm = async (action) => {
    if (!duplicateDialog) return;

    const { data, index, existing } = duplicateDialog;

    if (action === 'update') {
      // Update existing record
      await updateMutation.mutateAsync({
        id: existing.id,
        data: data,
      });
    } else if (action === 'create') {
      // Create new record anyway
      await createMutation.mutateAsync(data);
    }

    // Remove this item from the list
    setExtractedDataList(prev => prev.filter((_, idx) => idx !== index));
    setCurrentEditingIndex(null);
    setDuplicateDialog(null);
    
    // If all done, navigate back
    if (extractedDataList.length === 1) {
      navigate(createPageUrl("Dashboard"));
    }
  };

  const handleSaveAll = async () => {
    // Check if there are any duplicates
    const hasDuplicates = extractedDataList.some(item => item.isDuplicate);
    
    if (hasDuplicates) {
      setError("❌ Cannot save all: Some notifications are duplicates. Please review each one individually.");
      return;
    }

    for (const data of extractedDataList) {
      await createMutation.mutateAsync(data);
    }
    navigate(createPageUrl("Dashboard"));
  };

  const handleCancel = () => {
    setFiles([]);
    setExtractedDataList([]);
    setProcessingStatus([]);
    setError(null);
    setCurrentEditingIndex(null);
  };

  const handleEdit = (index) => {
    setCurrentEditingIndex(index);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          onClick={() => navigate(createPageUrl("Dashboard"))}
          variant="outline"
          size="icon"
          className="elevation-1 hover:elevation-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Upload Notifications
          </h1>
          <p className="text-gray-600">
            Upload multiple inspection notifications and let AI extract the information
          </p>
        </div>
      </div>

      {error && (
        <Alert variant={extractedDataList.length > 0 ? "default" : "destructive"} className="mb-6">
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
                className="mt-8 bg-white rounded-2xl p-8 elevation-2"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
                  Processing Your Notifications
                </h3>
                <p className="text-gray-600 mb-6 text-center">
                  Our AI is extracting information from {files.length} file{files.length > 1 ? 's' : ''}...
                </p>
                
                <div className="space-y-4">
                  {processingStatus.map((status, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {status.status === 'success' && (
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                          )}
                          {status.status === 'warning' && (
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                          )}
                          {status.status === 'error' && (
                            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                          )}
                          {(status.status === 'uploading' || status.status === 'extracting') && (
                            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {status.fileName}
                          </span>
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
                      {status.error && (
                        <p className="text-xs text-red-600 mt-2">{status.error}</p>
                      )}
                      {status.warning && (
                        <p className="text-xs text-amber-600 mt-2">{status.warning}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-indigo-600 mt-6">
                  <Sparkles className="w-4 h-4" />
                  <span>Using advanced AI technology</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : currentEditingIndex !== null ? (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-indigo-900">
                Reviewing {currentEditingIndex + 1} of {extractedDataList.length} notifications
              </p>
            </div>
            {extractedDataList[currentEditingIndex].isDuplicate && (
              <Alert className="mb-4 bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900">
                  <strong>Duplicate Detected:</strong> A notification with PO #{extractedDataList[currentEditingIndex].po_number} and Notification #{extractedDataList[currentEditingIndex].notification_number} already exists in the system.
                </AlertDescription>
              </Alert>
            )}
            <ReviewForm
              extractedData={extractedDataList[currentEditingIndex]}
              onSave={(data) => handleSave(data, currentEditingIndex)}
              onCancel={() => setCurrentEditingIndex(null)}
              isSaving={createMutation.isPending || updateMutation.isPending}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl p-8 elevation-2"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Review Extracted Notifications
                </h3>
                <p className="text-gray-600">
                  {extractedDataList.length} notification{extractedDataList.length > 1 ? 's' : ''} ready to save
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAll}
                  disabled={createMutation.isPending || extractedDataList.some(item => item.isDuplicate)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {createMutation.isPending ? "Saving..." : "Save All"}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {extractedDataList.map((data, idx) => (
                <div
                  key={idx}
                  className={`border-2 rounded-xl p-4 transition-colors ${
                    data.isDuplicate 
                      ? 'border-amber-300 bg-amber-50' 
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {data.isDuplicate && (
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-semibold text-amber-900">Duplicate Notification</span>
                        </div>
                      )}
                      <h4 className="font-bold text-gray-900 mb-2">
                        {data.notification_number || data.fileName || `Notification ${idx + 1}`}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        {data.po_number && (
                          <div>
                            <span className="text-gray-500">PO:</span>{" "}
                            <span className="text-gray-900">{data.po_number}</span>
                          </div>
                        )}
                        {data.supplier_name && (
                          <div>
                            <span className="text-gray-500">Supplier:</span>{" "}
                            <span className="text-gray-900">{data.supplier_name}</span>
                          </div>
                        )}
                        {data.country && (
                          <div>
                            <span className="text-gray-500">Country:</span>{" "}
                            <span className="text-gray-900">{data.country}</span>
                          </div>
                        )}
                        {data.all_inspection_dates && (
                          <div className="col-span-2 md:col-span-3">
                            <span className="text-gray-500">All Dates:</span>{" "}
                            <span className="text-gray-900">{data.all_inspection_dates}</span>
                          </div>
                        )}
                        {data.inspection_location && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Location:</span>{" "}
                            <span className="text-gray-900">{data.inspection_location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleEdit(idx)}
                      variant="outline"
                      size="sm"
                    >
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Duplicate Confirmation Dialog */}
      <Dialog open={!!duplicateDialog} onOpenChange={() => setDuplicateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Duplicate Notification Found
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-4">
              <p>A notification with the same PO and Notification number already exists:</p>
              {duplicateDialog?.existing && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                  <div><strong>PO:</strong> {duplicateDialog.existing.po_number}</div>
                  <div><strong>Notification:</strong> {duplicateDialog.existing.notification_number}</div>
                  <div><strong>Supplier:</strong> {duplicateDialog.existing.supplier_name}</div>
                  <div><strong>Country:</strong> {duplicateDialog.existing.country}</div>
                </div>
              )}
              <p className="text-sm font-medium">What would you like to do?</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDuplicateDialog(null)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDuplicateConfirm('create')}
              className="w-full sm:w-auto"
            >
              Create Anyway
            </Button>
            <Button
              onClick={() => handleDuplicateConfirm('update')}
              className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"
            >
              Update Existing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Cards */}
      {extractedDataList.length === 0 && !isProcessing && (
        <div className="grid md:grid-cols-4 gap-6 mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 elevation-1"
          >
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">📄</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Multiple Uploads</h3>
            <p className="text-sm text-gray-600">
              Upload multiple notifications at once
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 elevation-1"
          >
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">AI Extraction</h3>
            <p className="text-sm text-gray-600">
              Extracts all key information automatically
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 elevation-1"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">📅</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Calendar View</h3>
            <p className="text-sm text-gray-600">
              See date ranges in calendar format
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 elevation-1"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Excel Export</h3>
            <p className="text-sm text-gray-600">
              Export all data to Excel spreadsheet
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}