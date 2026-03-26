import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import VendorAlerts from "../VendorAlerts";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, AlertCircle, Mail, Users, FileText, AlertTriangle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, parseISO, isPast, isFuture, differenceInDays, startOfDay, isBefore, isEqual, isValid } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import ItemsTable from "./ItemsTable";
import ActivitiesTable from "./ActivitiesTable";

// Helper function to safely format dates
const formatDate = (dateString, formatStr = "MMMM d, yyyy") => {
  if (!dateString) return null;
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    if (isValid(date)) {
      return format(date, formatStr);
    }
    return null;
  } catch (error) {
    console.error("Date formatting error:", error);
    return null;
  }
};

const generateEmailBody = (inspection, includeInspector = false) => {
  return `Dear ${inspection.tpi_agency || 'TPI Agency'},

Please find the inspection notification details below:

${inspection.document_url ? `📎 NOTIFICATION DOCUMENT: ${inspection.document_url}\n(Please download and attach this PDF to your records)\n` : ''}

NOTIFICATION INFORMATION:
- PO Number: ${inspection.po_number || 'N/A'}
- Notification Number: ${inspection.notification_number || 'N/A'}
- Revision: ${inspection.notification_revision || 'N/A'}
- Receipt Date: ${formatDate(inspection.notification_receipt_date) || 'N/A'}

SUPPLIER INFORMATION:
- Supplier Name: ${inspection.supplier_name || 'N/A'}
- Sub-Supplier/Manufacturer: ${inspection.subsupplier_name || 'N/A'}
- Country: ${inspection.country || 'N/A'}

INSPECTION DETAILS:
- Location: ${inspection.inspection_location || 'N/A'}
- Start Date: ${formatDate(inspection.start_date) || 'N/A'}
${inspection.end_date ? `- End Date: ${formatDate(inspection.end_date) || 'N/A'}` : ''}
${inspection.all_inspection_dates ? `- All Inspection Dates: ${inspection.all_inspection_dates}` : ''}
- Time: ${inspection.inspection_time || 'Full Day'}
- PO Description: ${inspection.po_description || 'N/A'}

VENDOR CONTACT INFORMATION:
- Contact Name: ${inspection.vendor_contact_name || 'N/A'}
- Phone: ${inspection.vendor_contact_phone || 'N/A'}
- Email: ${inspection.vendor_contact_email || 'N/A'}

${includeInspector && inspection.assigned_inspector_name ? `
ASSIGNED INSPECTOR:
- Inspector Name: ${inspection.assigned_inspector_name}
- Inspector Phone: ${inspection.assigned_inspector_phone || 'N/A'}
- Inspector Email: ${inspection.assigned_inspector_email || 'N/A'}
` : ''}

${inspection.inspection_activities && inspection.inspection_activities.length > 0 ? `INSPECTION ACTIVITIES:\n${inspection.inspection_activities.map(activity => `- ${activity.date ? (formatDate(activity.date, "yyyy-MM-dd") || activity.date) + ': ' : ''}${activity.activity || ''}`).join('\n')}\n\n` : ''}
${inspection.items_being_offered ? `ITEMS BEING OFFERED FOR INSPECTION:\n${inspection.items_being_offered.map(item => `- ${item.item_number || ''}: ${item.description || ''} (Qty: ${item.quantity || ''})`).join('\n')}\n\n` : ''}
${inspection.requirements ? `REQUIREMENTS:\n${inspection.requirements}\n\n` : ''}
${inspection.notes ? `NOTES:\n${inspection.notes}\n\n` : ''}

${inspection.document_url ? `\n📄 Notification Document URL:\n${inspection.document_url}\n\n` : ''}

Please review and confirm receipt.

Best regards`;
};

// Helper to extract notification number from string
const parseNotificationNumber = (notificationStr) => {
  if (!notificationStr) return null;
  const match = notificationStr.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

// Helper to extract revision number
const parseRevisionNumber = (revisionStr) => {
  if (!revisionStr) return 0;
  const num = parseInt(revisionStr, 10);
  return isNaN(num) ? 0 : num;
};

export default function ReviewForm({ extractedData, onSave, onCancel, isSaving, currentProjectId, currentUser, showPdf = false }) {
  const [formData, setFormData] = useState({
    project_id: extractedData.project_id || currentProjectId || "",
    po_number: extractedData.po_number || "",
    notification_number: extractedData.notification_number || "",
    notification_revision: extractedData.notification_revision || "",
    notification_receipt_date: extractedData.notification_receipt_date || "",
    supplier_name: extractedData.supplier_name || "",
    subsupplier_name: extractedData.subsupplier_name || "",
    country: extractedData.country || "",
    inspection_location: extractedData.inspection_location || "",
    start_date: extractedData.start_date || "",
    end_date: extractedData.end_date || "",
    all_inspection_dates: extractedData.all_inspection_dates || "",
    inspection_activities: extractedData.inspection_activities || [],
    inspection_time: extractedData.inspection_time || "",
    po_description: extractedData.po_description || "",
    inspection_type: extractedData.inspection_type || "",
    vendor_contact_name: extractedData.vendor_contact_name || extractedData.inspector_name || "",
    vendor_contact_phone: extractedData.vendor_contact_phone || extractedData.contact_phone || "",
    vendor_contact_email: extractedData.vendor_contact_email || extractedData.contact_email || "",
    tpi_agency: extractedData.tpi_agency || "",
    assigned_inspector_id: extractedData.assigned_inspector_id || "",
    assigned_inspector_name: extractedData.assigned_inspector_name || "",
    assigned_inspector_email: extractedData.assigned_inspector_email || "",
    assigned_inspector_phone: extractedData.assigned_inspector_phone || "",
    items_being_offered: extractedData.items_being_offered || [],
    status: extractedData.status || "received",
    notes: extractedData.notes || "",
    document_url: extractedData.document_url || "",
  });

  const [multiAgencyDialogOpen, setMultiAgencyDialogOpen] = useState(false);
  const [pdfViewerMode, setPdfViewerMode] = useState('google'); // 'google' or 'native'
  const [selectedAgencies, setSelectedAgencies] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [proceedAnyway, setProceedAnyway] = useState(false);

  // Fetch all inspectors
  const { data: inspectors = [] } = useQuery({
    queryKey: ["inspectors"],
    queryFn: () => base44.entities.Inspector.list(),
    initialData: [],
  });

  // Fetch TPI agencies
  const { data: agencies = [] } = useQuery({
    queryKey: ["tpiagencies"],
    queryFn: () => base44.entities.TPIAgency.list(),
    initialData: [],
  });

  // Fetch existing inspections for validation
  const { data: existingInspections = [] } = useQuery({
    queryKey: ["inspections"],
    queryFn: () => base44.entities.Inspection.list(),
    initialData: [],
  });







  // Filter inspectors based on selected TPI agency
  const availableInspectors = inspectors.filter(inspector => {
    if (!formData.tpi_agency) return false;
    return inspector.company === formData.tpi_agency && inspector.status === "active";
  });

  // Auto-update status to "scheduled" when both TPI agency and inspector are assigned
  useEffect(() => {
    if (formData.tpi_agency && formData.assigned_inspector_id) {
      if (formData.status === "received") {
        setFormData(prev => ({ ...prev, status: "scheduled" }));
      }
    }
  }, [formData.tpi_agency, formData.assigned_inspector_id, formData.status]);

  // Validation checks
  useEffect(() => {
    const warnings = [];
    const today = startOfDay(new Date());

    if (formData.start_date) {
      try {
        const startDate = startOfDay(parseISO(formData.start_date));

        if (isBefore(startDate, today)) {
          const daysElapsed = differenceInDays(today, startDate);
          warnings.push({
            type: 'error',
            message: `⚠️ Inspection start date has passed (${daysElapsed} day${daysElapsed > 1 ? 's' : ''} ago). This notification may be outdated.`
          });
        }
      } catch (e) {
        warnings.push({
          type: 'warning',
          message: `Could not parse Start Date: ${formData.start_date}. Please ensure it's a valid date.`
        });
      }
    }

    if (formData.all_inspection_dates) {
      const dates = formData.all_inspection_dates.split(/[,\n]/).map(d => d.trim()).filter(d => d);
      let allPast = true;
      let somePast = false;
      let pastCount = 0;

      dates.forEach(dateStr => {
        try {
          const date = startOfDay(parseISO(dateStr));
          if (isBefore(date, today)) {
            somePast = true;
            pastCount++;
          } else {
            allPast = false;
          }
        } catch (e) {
          // Invalid date format, skip
        }
      });

      if (allPast && dates.length > 0) {
        warnings.push({
          type: 'error',
          message: '🚨 ALL inspection dates have passed! This event is outdated.'
        });
      } else if (somePast && pastCount > 0) {
        warnings.push({
          type: 'warning',
          message: `⏰ ${pastCount} inspection date${pastCount > 1 ? 's have' : ' has'} already passed. Please verify the schedule.`
        });
      }
    }

    if (formData.po_number && formData.notification_number) {
      const currentNotifNum = parseNotificationNumber(formData.notification_number);

      if (currentNotifNum && currentNotifNum > 1) {
        const samePoInspections = existingInspections.filter(
          insp => insp.po_number === formData.po_number
        );

        if (samePoInspections.length === 0) {
          warnings.push({
            type: 'error',
            message: `❌ Notification #${currentNotifNum} detected, but no previous notifications found for PO ${formData.po_number}. Expected notifications 1-${currentNotifNum - 1} to exist first.`
          });
        } else {
          const existingNumbers = samePoInspections
            .map(insp => parseNotificationNumber(insp.notification_number))
            .filter(num => num !== null)
            .sort((a, b) => a - b);

          const expectedPrevious = currentNotifNum - 1;
          if (!existingNumbers.includes(expectedPrevious)) {
            warnings.push({
              type: 'error',
              message: `⚠️ Missing notification #${expectedPrevious} for PO ${formData.po_number}. Notifications should be received in sequential order.`
            });
          }
        }
      }
    }

    if (formData.po_number && formData.notification_number && formData.notification_revision) {
      const currentRevision = parseRevisionNumber(formData.notification_revision);
      const currentNotificationRaw = formData.notification_number;

      if (currentRevision > 0) {
        const revisionsForThisNotification = existingInspections.filter(
          insp => insp.po_number === formData.po_number && insp.notification_number === currentNotificationRaw
        );

        if (revisionsForThisNotification.length === 0) {
          warnings.push({
            type: 'error',
            message: `❌ Revision ${currentRevision} detected, but Revision 0 for notification ${currentNotificationRaw} does not exist. Please upload Revision 0 first.`
          });
        } else {
          const highestExistingRevision = Math.max(...revisionsForThisNotification.map(insp => parseRevisionNumber(insp.notification_revision || "0")));

          if (currentRevision <= highestExistingRevision) {
            warnings.push({
              type: 'error',
              message: `❌ Revision ${currentRevision} is not newer than the highest existing revision (${highestExistingRevision}) for notification ${currentNotificationRaw}.`
            });
          } else if (currentRevision !== highestExistingRevision + 1) {
            warnings.push({
              type: 'warning',
              message: `⚠️ Expected Revision ${highestExistingRevision + 1}, but received Revision ${currentRevision}. There may be missing revisions.`
            });
          }

          warnings.push({
            type: 'info',
            message: `📝 This is a REVISED notification (Revision ${currentRevision}). It will amend the existing notification ${currentNotificationRaw} (highest existing Revision ${highestExistingRevision}).`
          });
        }
      }
    }

    setValidationWarnings(warnings);
  }, [formData.po_number, formData.notification_number, formData.notification_revision, formData.start_date, formData.all_inspection_dates, existingInspections]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleInspectorChange = (inspectorId) => {
    const selectedInspector = inspectors.find(i => i.id === inspectorId);
    if (selectedInspector) {
      setFormData(prev => ({
        ...prev,
        assigned_inspector_id: inspectorId,
        assigned_inspector_name: selectedInspector.full_name,
        assigned_inspector_email: selectedInspector.email,
        assigned_inspector_phone: selectedInspector.phone,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        assigned_inspector_id: "",
        assigned_inspector_name: "",
        assigned_inspector_email: "",
        assigned_inspector_phone: "",
      }));
    }
  };

  const handleSave = () => {
    const hasErrors = validationWarnings.some(w => w.type === 'error');

    if (hasErrors && !proceedAnyway) {
      toast.error("Please review validation errors or check 'Proceed Anyway' to continue");
      return;
    }

    onSave(formData);
  };

  const handleSendToSingleAgency = () => {
    if (!formData.tpi_agency) {
      toast.error("Please select a TPI Agency first");
      return;
    }

    const agency = agencies.find(a => a.name === formData.tpi_agency);
    if (!agency || !agency.email) {
      toast.error("Selected agency does not have an email address");
      return;
    }

    const subject = `Inspection Notification Request - PO ${formData.po_number || 'N/A'} - ${formData.notification_number || 'N/A'}`;
    const body = generateEmailBody(formData, false);
    const mailtoLink = `mailto:${agency.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoLink;

    if (formData.document_url) {
      toast.success(`Email opened! Remember to download and attach the PDF from the link in the email body.`, {
        duration: 5000,
      });
    } else {
      toast.success(`Opening email to ${formData.tpi_agency}`);
    }
  };

  const handleSendToMultipleAgencies = () => {
    if (selectedAgencies.length === 0) {
      toast.error("Please select at least one agency");
      return;
    }

    // Get all emails for selected agencies
    const selectedAgencyEmails = selectedAgencies
      .map(agencyName => {
        const agency = agencies.find(a => a.name === agencyName);
        return agency?.email;
      })
      .filter(email => email);

    if (selectedAgencyEmails.length === 0) {
      toast.error("No valid email addresses found for selected agencies");
      return;
    }

    // Create one email with all agencies in BCC
    const subject = `Inspection Notification Request - PO ${formData.po_number || 'N/A'} - ${formData.notification_number || 'N/A'}`;
    const body = generateEmailBody(formData, false);

    // Use BCC to hide recipients from each other
    const bccEmails = selectedAgencyEmails.join(',');
    const mailtoLink = `mailto:?bcc=${encodeURIComponent(bccEmails)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoLink;

    if (formData.document_url) {
      toast.success(`Email opened with ${selectedAgencies.length} agencies in BCC. Remember to attach the PDF!`, {
        duration: 5000,
      });
    } else {
      toast.success(`Opening email to ${selectedAgencies.length} agencies (BCC)`);
    }
    setMultiAgencyDialogOpen(false);
  };

  const handleNotifyAgencyAndInspector = () => {
    if (!formData.tpi_agency || !formData.assigned_inspector_id) {
      toast.error("Please assign both TPI Agency and Inspector first");
      return;
    }

    const agency = agencies.find(a => a.name === formData.tpi_agency);
    if (!agency || !agency.email) {
      toast.error("Selected agency does not have an email address");
      return;
    }

    const subject = `Inspector Assigned - PO ${formData.po_number || 'N/A'} - ${formData.notification_number || 'N/A'}`;
    const body = generateEmailBody(formData, true);

    const toEmail = agency.email;
    const ccEmail = formData.assigned_inspector_email || '';

    let mailtoLink = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (ccEmail) {
      mailtoLink += `&cc=${encodeURIComponent(ccEmail)}`;
    }

    window.location.href = mailtoLink;

    if (formData.document_url) {
      toast.success(`Email opened to ${formData.tpi_agency} (CC: ${formData.assigned_inspector_name}). Don't forget to attach the PDF!`, {
        duration: 5000,
      });
    } else {
      toast.success(`Notifying ${formData.tpi_agency} with ${formData.assigned_inspector_name} in CC`);
    }
  };

  const toggleAgencySelection = (agencyName) => {
    setSelectedAgencies(prev => {
      if (prev.includes(agencyName)) {
        return prev.filter(name => name !== agencyName);
      } else {
        return [...prev, agencyName];
      }
    });
  };

  const activeAgencies = agencies.filter(a => a.status === "active");

  const hasErrors = validationWarnings.some(w => w.type === 'error');

  const formContent = (
    <div className="h-full">
      {(formData.supplier_name || formData.subsupplier_name) && (
        <VendorAlerts
          supplierName={formData.supplier_name}
          subsupplierName={formData.subsupplier_name}
          currentProjectId={formData.project_id}
          currentInspectionId={extractedData.id}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Review Extracted Information
          </h2>
          <p className="text-gray-600">
            Please verify and edit the information extracted from your notification.
          </p>
        </div>
        <div className="flex gap-2">
          {formData.tpi_agency && formData.assigned_inspector_id ? (
            <Button
              type="button"
              onClick={handleNotifyAgencyAndInspector}
              className="bg-green-600 hover:bg-green-700 elevation-1"
            >
              <Mail className="w-4 h-4 mr-2" />
              Notify Agency & Inspector
            </Button>
          ) : (
            <>
              <Button
                type="button"
                onClick={() => setMultiAgencyDialogOpen(true)}
                variant="outline"
                className="elevation-1"
              >
                <Users className="w-4 h-4 mr-2" />
                Send to Multiple
              </Button>
              {formData.tpi_agency && (
                <Button
                  type="button"
                  onClick={handleSendToSingleAgency}
                  className="bg-blue-600 hover:bg-blue-700 elevation-1"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send to {formData.tpi_agency}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {validationWarnings.length > 0 && (
        <div className="space-y-3 mb-6">
          {validationWarnings.map((warning, idx) => (
            <Alert
              key={idx}
              className={
                warning.type === 'error' ? 'bg-red-50 border-red-200' :
                  warning.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                    'bg-blue-50 border-blue-200'
              }
            >
              {warning.type === 'error' ? <AlertTriangle className="h-4 w-4 text-red-600" /> :
                warning.type === 'warning' ? <AlertCircle className="h-4 w-4 text-amber-600" /> :
                  <AlertCircle className="h-4 w-4 text-blue-600" />}
              <AlertDescription className={
                warning.type === 'error' ? 'text-red-900' :
                  warning.type === 'warning' ? 'text-amber-900' :
                    'text-blue-900'
              }>
                {warning.message}
              </AlertDescription>
            </Alert>
          ))}

          {hasErrors && (
            <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 rounded-lg border-2 border-gray-300">
              <Checkbox
                checked={proceedAnyway}
                onCheckedChange={setProceedAnyway}
              />
              <span className="text-sm font-medium text-gray-900">
                I understand the risks and want to proceed anyway
              </span>
            </label>
          )}
        </div>
      )}

      {formData.document_url && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <FileText className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>📎 Notification PDF Available:</strong> The document link is included in email body.
            <a
              href={formData.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline ml-2 font-medium hover:text-amber-700"
            >
              View/Download PDF
            </a>
            <br />
            <span className="text-sm">Note: Please manually download and attach this PDF to your emails (email clients don't support automatic attachments).</span>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-2">
          <Label htmlFor="po_number" className="text-base font-semibold">
            PO # *
          </Label>
          <Input
            id="po_number"
            value={formData.po_number}
            onChange={(e) => handleChange("po_number", e.target.value)}
            placeholder="Purchase Order number"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notification_number" className="text-base font-semibold">
            Notification Number *
          </Label>
          <Input
            id="notification_number"
            value={formData.notification_number}
            onChange={(e) => handleChange("notification_number", e.target.value)}
            placeholder="Inspection notification #"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notification_revision" className="text-base font-semibold">
            Notification Revision #
          </Label>
          <Input
            id="notification_revision"
            value={formData.notification_revision}
            onChange={(e) => handleChange("notification_revision", e.target.value)}
            placeholder="Revision number"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notification_receipt_date" className="text-base font-semibold">
            Notification Receipt Date
          </Label>
          <Input
            id="notification_receipt_date"
            type="date"
            value={formData.notification_receipt_date}
            onChange={(e) => handleChange("notification_receipt_date", e.target.value)}
            className="h-11"
          />
          <p className="text-xs text-gray-500">
            Found on top left of PDF
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier_name" className="text-base font-semibold">
            Supplier Name
          </Label>
          <Input
            id="supplier_name"
            value={formData.supplier_name}
            onChange={(e) => handleChange("supplier_name", e.target.value)}
            placeholder="Name of supplier where PO is issued"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subsupplier_name" className="text-base font-semibold">
            Sub-Supplier Name
          </Label>
          <Input
            id="subsupplier_name"
            value={formData.subsupplier_name}
            onChange={(e) => handleChange("subsupplier_name", e.target.value)}
            placeholder="Name of manufacturer (sometimes same as supplier)"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country" className="text-base font-semibold">
            Country
          </Label>
          <Input
            id="country"
            value={formData.country}
            onChange={(e) => handleChange("country", e.target.value)}
            placeholder="Country where inspection takes place"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="po_description" className="text-base font-semibold">
            PO Description
          </Label>
          <Input
            id="po_description"
            value={formData.po_description}
            onChange={(e) => handleChange("po_description", e.target.value)}
            placeholder="Purchase Order description"
            className="h-11"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="inspection_location" className="text-base font-semibold">
            Inspection Location (Place of Witness) *
          </Label>
          <Input
            id="inspection_location"
            value={formData.inspection_location}
            onChange={(e) => handleChange("inspection_location", e.target.value)}
            placeholder="Full address or location"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_date" className="text-base font-semibold">
            Start Date (Earliest) *
          </Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange("start_date", e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date" className="text-base font-semibold">
            End Date (Latest)
          </Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => handleChange("end_date", e.target.value)}
            className="h-11"
          />
          <p className="text-xs text-gray-500">
            Leave empty if inspection is only on start date
          </p>
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="all_inspection_dates" className="text-base font-semibold">
            All Inspection Dates
          </Label>
          <Input
            id="all_inspection_dates"
            value={formData.all_inspection_dates}
            onChange={(e) => handleChange("all_inspection_dates", e.target.value)}
            placeholder="e.g., 2024-10-30, 2024-11-14, 2024-11-15, 2024-11-16"
            className="h-11"
          />
          <p className="text-xs text-gray-500">
            Comma-separated list of ALL inspection dates found in the notification
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="inspection_time" className="text-base font-semibold">
            Inspection Time
          </Label>
          <Input
            id="inspection_time"
            type="text"
            value={formData.inspection_time}
            onChange={(e) => handleChange("inspection_time", e.target.value)}
            placeholder="e.g. 10:00 AM"
            className="h-11"
          />
          <p className="text-xs text-gray-500">
            If applicable
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="inspection_type">Inspection Type</Label>
          <Input
            id="inspection_type"
            value={formData.inspection_type}
            onChange={(e) => handleChange("inspection_type", e.target.value)}
            placeholder="e.g., Building, Fire Safety"
          />
        </div>

        {/* Vendor Contact Information Section */}
        <div className="md:col-span-2 mt-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">
            Vendor/Manufacturer Contact Information
          </h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vendor_contact_name">Vendor Contact Name</Label>
          <Input
            id="vendor_contact_name"
            value={formData.vendor_contact_name}
            onChange={(e) => handleChange("vendor_contact_name", e.target.value)}
            placeholder="Vendor/Manufacturer contact person"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vendor_contact_phone">Vendor Contact Phone</Label>
          <Input
            id="vendor_contact_phone"
            value={formData.vendor_contact_phone}
            onChange={(e) => handleChange("vendor_contact_phone", e.target.value)}
            placeholder="Vendor telephone"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="vendor_contact_email">Vendor Contact Email</Label>
          <Input
            id="vendor_contact_email"
            type="email"
            value={formData.vendor_contact_email}
            onChange={(e) => handleChange("vendor_contact_email", e.target.value)}
            placeholder="Vendor email address"
          />
        </div>

        {/* Inspector Assignment Section */}
        <div className="md:col-span-2 mt-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">
            Inspector Assignment
          </h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tpi_agency" className="text-base font-semibold">
            TPI Agency *
          </Label>
          <Select value={formData.tpi_agency} onValueChange={(value) => handleChange("tpi_agency", value)}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select TPI Agency" />
            </SelectTrigger>
            <SelectContent>
              {activeAgencies.length === 0 ? (
                <SelectItem value={null} disabled>No agencies available</SelectItem>
              ) : (
                activeAgencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.name}>
                    {agency.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Select agency first to see available inspectors
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assigned_inspector" className="text-base font-semibold">
            Assign Inspector
          </Label>
          <Select
            value={formData.assigned_inspector_id}
            onValueChange={handleInspectorChange}
            disabled={!formData.tpi_agency}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder={
                !formData.tpi_agency
                  ? "Select TPI Agency first"
                  : availableInspectors.length === 0
                    ? "No inspectors available for this agency"
                    : "Select Inspector"
              } />
            </SelectTrigger>
            <SelectContent>
              {availableInspectors.map((inspector) => (
                <SelectItem key={inspector.id} value={inspector.id}>
                  {inspector.full_name} {inspector.specialization && `(${inspector.specialization})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Only shows active inspectors from selected agency
          </p>
        </div>

        {formData.assigned_inspector_name && (
          <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-green-900 mb-2">✓ Inspector Assigned</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-green-700 font-medium">Name:</span>{" "}
                <span className="text-green-900">{formData.assigned_inspector_name}</span>
              </div>
              {formData.assigned_inspector_email && (
                <div>
                  <span className="text-green-700 font-medium">Email:</span>{" "}
                  <span className="text-green-900">{formData.assigned_inspector_email}</span>
                </div>
              )}
              {formData.assigned_inspector_phone && (
                <div>
                  <span className="text-green-700 font-medium">Phone:</span>{" "}
                  <span className="text-green-900">{formData.assigned_inspector_phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="finalized">Finalized</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            {formData.status === "scheduled" && "✓ Auto-set when Agency & Inspector assigned"}
          </p>
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="inspection_activities" className="text-base font-semibold">
            Inspection Activities & Schedule *
          </Label>
          <ActivitiesTable
            value={formData.inspection_activities}
            onChange={(value) => handleChange("inspection_activities", value)}
          />
          <p className="text-xs text-gray-500">
            Structured inspection schedule with dates, times, ITP steps, activities, intervention points (Supplier/Contractor/TPA), and remarks
          </p>
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="items_being_offered" className="text-base font-semibold">
            Items Being Offered for Inspection *
          </Label>
          <ItemsTable
            value={formData.items_being_offered}
            onChange={(value) => handleChange("items_being_offered", value)}
          />
          <p className="text-xs text-gray-500">
            Items extracted from the notification - includes item numbers, descriptions, and quantities
          </p>
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Any additional notes or comments"
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-6 border-t">
        <Button
          onClick={onCancel}
          variant="outline"
          disabled={isSaving}
          className="px-6"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || (hasErrors && !proceedAnyway)}
          className="px-6 bg-indigo-600 hover:bg-indigo-700 ripple"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Inspection"}
        </Button>
      </div>

      {/* Multi-Agency Selection Dialog */}
      <Dialog open={multiAgencyDialogOpen} onOpenChange={setMultiAgencyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send to Multiple TPI Agencies</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-2">
              Select agencies to send this inspection notification to:
            </p>
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                <strong>Note:</strong> All selected agencies will be added to BCC (blind carbon copy) in a single email draft.
              </AlertDescription>
            </Alert>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {activeAgencies.map((agency) => (
                <label
                  key={agency.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedAgencies.includes(agency.name)}
                    onCheckedChange={() => toggleAgencySelection(agency.name)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{agency.name}</p>
                    {agency.email && (
                      <p className="text-sm text-gray-500">{agency.email}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
            {formData.document_url && (
              <Alert className="mt-4 bg-amber-50 border-amber-200">
                <FileText className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-900">
                  <strong>Remember:</strong> Download and manually attach the PDF to the email.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMultiAgencyDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendToMultipleAgencies}
              disabled={selectedAgencies.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send to {selectedAgencies.length} Agencies (BCC)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (showPdf && formData.document_url) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-0 elevation-2 overflow-hidden h-[80vh]"
      >
        <div className="flex h-full">
          <div className="w-1/2 border-r bg-gray-100 relative group">
            <div className="absolute top-4 right-4 z-10 flex bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border p-1 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant={pdfViewerMode === 'google' ? 'secondary' : 'ghost'}
                onClick={() => setPdfViewerMode('google')}
                className="h-8 text-xs"
                title="Use Google Docs Viewer"
              >
                Google Viewer
              </Button>
              <Button
                size="sm"
                variant={pdfViewerMode === 'native' ? 'secondary' : 'ghost'}
                onClick={() => setPdfViewerMode('native')}
                className="h-8 text-xs"
                title="Use Browser Native Viewer"
              >
                Native Viewer
              </Button>
            </div>
            {pdfViewerMode === 'google' ? (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(formData.document_url)}&embedded=true`}
                className="w-full h-full"
                title="Notification Document"
                frameBorder="0"
              />
            ) : (
              <object
                data={formData.document_url}
                type="application/pdf"
                className="w-full h-full"
              >
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Unable to display PDF directly.</p>
                  <a
                    href={formData.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    Open PDF in new tab
                  </a>
                </div>
              </object>
            )}
          </div>
          <div className="w-1/2 overflow-y-auto p-8">
            {formContent}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-8 elevation-2"
    >
      {formContent}
    </motion.div>
  );
}