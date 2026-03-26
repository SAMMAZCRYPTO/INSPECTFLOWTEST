import React, { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  FileSpreadsheet,
  ExternalLink,
  GripVertical,
  ChevronDown,
  Trash2,
  Mail,
  FileText,
  MapPin,
  FileCheck,
  RefreshCw,
  AlertTriangle,
  FileWarning,
  Clock,
} from "lucide-react";
import CheckInButton from "../dashboard/CheckInButton";
import { format, parseISO, isValid } from "date-fns";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import InspectionReviewDialog from "@/components/inspectors/InspectionReviewDialog";

// Helper function to safely format dates
const formatDate = (dateString, formatStr = "MMM d, yyyy") => {
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

const statusColors = {
  received: "bg-gray-100 text-gray-800 border-gray-200",
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  finalized: "bg-purple-100 text-purple-800 border-purple-200",
};

const TPI_AGENCIES = {
  "TUVR": "tuvr@inspection.com",
  "TUV SUD": "tuvsud@inspection.com",
  "Fulkrum": "fulkrum@inspection.com"
};

const DEFAULT_COLUMNS = [
  { id: "po_number", label: "PO #", field: "po_number", width: 120, minWidth: 100 },
  { id: "notification_number", label: "Notification #", field: "notification_number", width: 160, minWidth: 160 },
  { id: "notification_revision", label: "Revision #", field: "notification_revision", width: 130, minWidth: 130 },
  { id: "notification_receipt_date", label: "Receipt Date", field: "notification_receipt_date", width: 150, minWidth: 150 },
  { id: "supplier_name", label: "Supplier Name", field: "supplier_name", width: 180, minWidth: 150 },
  { id: "subsupplier_name", label: "Sub-Supplier Name", field: "subsupplier_name", width: 180, minWidth: 170 },
  { id: "country", label: "Country", field: "country", width: 120, minWidth: 100 },
  { id: "inspection_location", label: "Location", field: "inspection_location", width: 200, minWidth: 110 },
  { id: "date", label: "Date", field: "start_date", width: 150, minWidth: 100 },
  { id: "inspection_time", label: "Time", field: "inspection_time", width: 100, minWidth: 90 },
  { id: "po_description", label: "PO Description", field: "po_description", width: 250, minWidth: 150 },
  { id: "vendor_contact_name", label: "Vendor Contact", field: "vendor_contact_name", width: 150, minWidth: 140 },
  { id: "vendor_contact_phone", label: "Vendor Phone", field: "vendor_contact_phone", width: 130, minWidth: 120 },
  { id: "vendor_contact_email", label: "Vendor Email", field: "vendor_contact_email", width: 180, minWidth: 140 },
  { id: "tpi_agency", label: "TPI Agency", field: "tpi_agency", width: 130, minWidth: 120 },
  { id: "assigned_inspector_name", label: "Inspector Name", field: "assigned_inspector_name", width: 150, minWidth: 140 },
  { id: "assigned_inspector_phone", label: "Inspector Phone", field: "assigned_inspector_phone", width: 140, minWidth: 130 },
  { id: "assigned_inspector_email", label: "Inspector Email", field: "assigned_inspector_email", width: 180, minWidth: 150 },
  { id: "status", label: "Status", field: "status", width: 120, minWidth: 100 },
];

const generateEmailLink = (inspection) => {
  const tpiAgencyName = inspection.tpi_agency;
  const recipientEmail = tpiAgencyName && TPI_AGENCIES[tpiAgencyName]
    ? TPI_AGENCIES[tpiAgencyName]
    : "";

  const subject = `Inspection Notification - PO ${inspection.po_number || 'N/A'} - ${inspection.notification_number || 'N/A'}`;

  const body = `Dear ${inspection.tpi_agency || 'TPI Agency'},

Please find the inspection notification details below:

NOTIFICATION INFORMATION:
- PO Number: ${inspection.po_number || 'N/A'}
- Notification Number: ${inspection.notification_number || 'N/A'}
- Revision: ${inspection.notification_revision || 'N/A'}
- Receipt Date: ${formatDate(inspection.notification_receipt_date, "MMMM d, yyyy") || 'N/A'}

SUPPLIER INFORMATION:
- Supplier Name: ${inspection.supplier_name || 'N/A'}
- Sub-Supplier/Manufacturer: ${inspection.subsupplier_name || 'N/A'}
- Country: ${inspection.country || 'N/A'}

INSPECTION DETAILS:
- Location: ${inspection.inspection_location || 'N/A'}
- Start Date: ${formatDate(inspection.start_date, "MMMM d, yyyy") || 'N/A'}
${inspection.end_date ? `- End Date: ${formatDate(inspection.end_date, "MMMM d, yyyy") || 'N/A'}` : ''}
${inspection.all_inspection_dates ? `- All Inspection Dates: ${inspection.all_inspection_dates}` : ''}
- Time: ${inspection.inspection_time || 'Full Day'}
- PO Description: ${inspection.po_description || 'N/A'}

VENDOR CONTACT INFORMATION:
- Contact Name: ${inspection.vendor_contact_name || 'N/A'}
- Phone: ${inspection.vendor_contact_phone || 'N/A'}
- Email: ${inspection.vendor_contact_email || 'N/A'}

ASSIGNED INSPECTOR:
- Inspector Name: ${inspection.assigned_inspector_name || 'Not assigned'}
- Inspector Phone: ${inspection.assigned_inspector_phone || 'N/A'}
- Inspector Email: ${inspection.assigned_inspector_email || 'N/A'}

${inspection.inspection_activities ? `\nINSPECTION ACTIVITIES:\n${inspection.inspection_activities}\n` : ''}
${inspection.requirements ? `\nREQUIREMENTS:\n${inspection.requirements}\n` : ''}
${inspection.notes ? `\nNOTES:\n${inspection.notes}\n` : ''}
${inspection.document_url ? `\nDocument URL: ${inspection.document_url}` : ''}

Please review and confirm receipt.

Best regards`;

  const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return mailtoLink;
};

export default function InspectionTable({ inspections, onEdit, onDelete, onViewReports, onViewLocation, onCheckIn, onCheckOut, activeAttendance, currentUser, onReplaceReport }) {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [columnFilters, setColumnFilters] = useState({});
  const [resizingColumn, setResizingColumn] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inspectionToDelete, setInspectionToDelete] = useState(null);
  const [reviewInspection, setReviewInspection] = useState(null);
  const tableRef = useRef(null);

  const isAdminOrQC = currentUser?.role === 'admin' || currentUser?.inspection_role === 'qc_manager' || currentUser?.inspection_role === 'admin';

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setColumns(items);
  };

  const handleMouseDown = (e, columnId) => {
    e.preventDefault();
    const column = columns.find(c => c.id === columnId);
    setResizingColumn({
      columnId,
      startX: e.clientX,
      startWidth: column.width,
      minWidth: column.minWidth,
    });
  };

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (resizingColumn) {
        const delta = e.clientX - resizingColumn.startX;
        const newWidth = Math.max(resizingColumn.minWidth, resizingColumn.startWidth + delta);

        setColumns(prev =>
          prev.map(col =>
            col.id === resizingColumn.columnId
              ? { ...col, width: newWidth }
              : col
          )
        );
      }
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    if (resizingColumn) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingColumn]);

  const formatDateRange = (startDate, endDate) => {
    if (!startDate) return "-";

    const start = formatDate(startDate);
    if (!start) return "-";

    if (endDate && startDate !== endDate) {
      const end = formatDate(endDate);
      if (end) {
        return `${start} - ${end}`;
      }
    }

    return start;
  };

  const getUniqueValues = (columnId, field) => {
    const values = new Set();
    inspections.forEach((inspection) => {
      let value;
      if (columnId === "date") {
        value = formatDateRange(inspection.start_date, inspection.end_date);
      } else if (columnId === "notification_receipt_date") {
        value = formatDate(inspection.notification_receipt_date);
      } else if (columnId === "inspection_time") {
        value = inspection.inspection_time || "Full Day";
      } else if (columnId === "status") {
        value = inspection.status;
      } else if (columnId === "tpi_agency") {
        value = inspection.tpi_agency;
      } else {
        value = inspection[field];
      }
      if (value) values.add(value);
    });
    return Array.from(values).sort();
  };

  const toggleFilterValue = (columnId, value) => {
    setColumnFilters(prev => {
      const currentFilters = prev[columnId] || [];
      const newFilters = currentFilters.includes(value)
        ? currentFilters.filter(v => v !== value)
        : [...currentFilters, value];

      if (newFilters.length === 0) {
        const { [columnId]: removed, ...rest } = prev;
        return rest;
      }

      return { ...prev, [columnId]: newFilters };
    });
  };

  const clearColumnFilter = (columnId) => {
    setColumnFilters(prev => {
      const { [columnId]: removed, ...rest } = prev;
      return rest;
    });
  };

  const filteredInspections = inspections.filter((inspection) => {
    return Object.entries(columnFilters).every(([columnId, filterValues]) => {
      if (!filterValues || filterValues.length === 0) return true;

      const column = columns.find(c => c.id === columnId);
      let value;

      if (columnId === "date") {
        value = formatDateRange(inspection.start_date, inspection.end_date);
      } else if (columnId === "notification_receipt_date") {
        value = formatDate(inspection.notification_receipt_date);
      } else if (columnId === "inspection_time") {
        value = inspection.inspection_time || "Full Day";
      } else if (columnId === "status") {
        value = inspection.status;
      } else if (columnId === "tpi_agency") {
        value = inspection.tpi_agency;
      } else {
        value = inspection[column.field];
      }

      return filterValues.includes(value);
    });
  });

  const toggleRowExpansion = (id) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDeleteClick = (e, inspection) => {
    e.stopPropagation();
    setInspectionToDelete(inspection);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (inspectionToDelete && onDelete) {
      onDelete(inspectionToDelete.id);
    }
    setDeleteDialogOpen(false);
    setInspectionToDelete(null);
  };

  const exportToExcel = () => {
    const headers = columns.map(col => col.label);
    headers.push("Requirements", "Notes");

    const rows = filteredInspections.map((inspection) => {
      const row = columns.map(col => {
        if (col.id === "date") {
          return formatDateRange(inspection.start_date, inspection.end_date) || "";
        }
        if (col.id === "notification_receipt_date") {
          return formatDate(inspection.notification_receipt_date, "yyyy-MM-dd") || "";
        }
        if (col.id === "inspection_time") {
          return inspection.inspection_time || "Full Day";
        }
        return inspection[col.field] || "";
      });

      row.push(inspection.requirements || "", inspection.notes || "");
      return row;
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
    link.setAttribute("download", `inspections_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCellValue = (inspection, columnId, field) => {
    if (columnId === "date") {
      return formatDateRange(inspection.start_date, inspection.end_date);
    }
    if (columnId === "notification_receipt_date") {
      return formatDate(inspection.notification_receipt_date) || "-";
    }
    if (columnId === "inspection_time") {
      return inspection.inspection_time || "Full Day";
    }
    if (columnId === "tpi_agency") {
      return inspection.tpi_agency || "-";
    }

    // Week 3: Add performance indicators to notification number
    if (columnId === "notification_number") {
      return (
        <div className="flex flex-col gap-1">
          <div className="font-medium">{inspection.notification_number || "-"}</div>

          {/* Performance Indicators (using Week 1 computed columns) */}
          {(inspection.ncr_count > 0 || inspection.findings_count > 0 || inspection.has_pending_reports) && (
            <div className="flex gap-1 flex-wrap">
              {inspection.ncr_count > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  <AlertTriangle className="w-3 h-3" />
                  {inspection.ncr_count} NCR{inspection.ncr_count > 1 ? 's' : ''}
                </span>
              )}
              {inspection.findings_count > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <FileWarning className="w-3 h-3" />
                  {inspection.findings_count} Finding{inspection.findings_count > 1 ? 's' : ''}
                </span>
              )}
              {inspection.has_pending_reports && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  <Clock className="w-3 h-3" />
                  Pending
                </span>
              )}
            </div>
          )}
        </div>
      );
    }
    if (columnId === "status") {
      return (
        <div className="flex flex-col gap-1">
          <Badge className={`${statusColors[inspection.status]} border font-medium w-fit`}>
            {inspection.status?.replace("_", " ")}
          </Badge>
          {(inspection.last_checkin_time || inspection.last_checkout_time) && (
            <div className="flex gap-1 text-xs">
              {inspection.last_checkin_time && (
                <span className="flex items-center gap-1 text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  In: {new Date(inspection.last_checkin_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              )}
              {inspection.last_checkout_time && (
                <span className="flex items-center gap-1 text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                  Out: {new Date(inspection.last_checkout_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              )}
            </div>
          )}
        </div>
      );
    }
    return inspection[field] || "-";
  };

  return (
    <>
      <Card className="elevation-2">
        <div className="p-4 md:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Inspection Data Sheet
            </h2>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 elevation-1 hover:elevation-2 w-full md:w-auto"
              disabled={filteredInspections.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export to Excel
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[calc(100vh-300px)]" ref={tableRef}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Table className="border-collapse">
              <TableHeader className="sticky top-0 z-20 bg-gray-100">
                <Droppable droppableId="columns" direction="horizontal">
                  {(provided) => (
                    <TableRow
                      className="bg-gray-100"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {columns.map((column, index) => (
                        <Draggable key={column.id} draggableId={column.id} index={index}>
                          {(provided, snapshot) => (
                            <TableHead
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`font-bold border border-gray-300 relative bg-gray-100 ${snapshot.isDragging ? "bg-gray-200" : ""
                                }`}
                              style={{
                                ...provided.draggableProps.style,
                                width: column.width,
                                minWidth: column.minWidth,
                                maxWidth: column.width,
                                padding: "8px 4px",
                              }}
                            >
                              <div className="flex items-center gap-1 pr-2">
                                <span {...provided.dragHandleProps} className="cursor-move flex-shrink-0">
                                  <GripVertical className="w-4 h-4 text-gray-400" />
                                </span>
                                <span className="whitespace-nowrap flex-1 min-w-0 overflow-hidden text-ellipsis">
                                  {column.label}
                                </span>

                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      className={`flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors ml-auto ${columnFilters[column.id]?.length > 0 ? "text-blue-600 bg-blue-50" : "text-gray-500"
                                        }`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-72 p-0" align="start">
                                    <div className="p-3 border-b">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold">Filter: {column.label}</span>
                                        {columnFilters[column.id]?.length > 0 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs"
                                            onClick={() => clearColumnFilter(column.id)}
                                          >
                                            Clear
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto p-2">
                                      {getUniqueValues(column.id, column.field).map((value) => (
                                        <label
                                          key={value}
                                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                                        >
                                          <Checkbox
                                            checked={columnFilters[column.id]?.includes(value) ?? false}
                                            onCheckedChange={() => toggleFilterValue(column.id, value)}
                                          />
                                          <span className="text-sm flex-1 truncate">
                                            {column.id === "status" ? value?.replace("_", " ") : value}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 group"
                                onMouseDown={(e) => handleMouseDown(e, column.id)}
                              >
                                <div className="w-1 h-full group-hover:bg-blue-500" />
                              </div>
                            </TableHead>
                          )}
                        </Draggable>
                      ))}
                      <TableHead className="font-bold border border-gray-300 bg-gray-100" style={{ width: 180, minWidth: 180 }}>
                        Actions
                      </TableHead>
                      {provided.placeholder}
                    </TableRow>
                  )}
                </Droppable>
              </TableHeader>
              <TableBody>
                {filteredInspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="text-center py-8 text-gray-500 border border-gray-300">
                      No inspections found. {inspections.length > 0 ? "Try adjusting your filters." : "Upload your first notification to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInspections.map((inspection, idx) => (
                    <TableRow
                      key={inspection.id}
                      className={`hover:bg-blue-50 cursor-pointer transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      onClick={() => onEdit && onEdit(inspection)}
                    >
                      {columns.map((column) => {
                        const isExpanded = expandedRows.has(inspection.id);
                        const cellValue = getCellValue(inspection, column.id, column.field);

                        return (
                          <TableCell
                            key={column.id}
                            className={`border border-gray-300 ${column.id === "po_number" || column.id === "notification_number"
                              ? "font-medium"
                              : ""
                              }`}
                            style={{
                              width: column.width,
                              minWidth: column.minWidth,
                              maxWidth: column.width,
                              whiteSpace: isExpanded ? "normal" : "nowrap",
                              overflow: isExpanded ? "visible" : "hidden",
                              textOverflow: isExpanded ? "clip" : "ellipsis",
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(inspection.id);
                            }}
                            title={typeof cellValue === 'string' ? cellValue : ''}
                          >
                            {cellValue}
                          </TableCell>
                        );
                      })}
                      <TableCell className="border border-gray-300" style={{ width: 180, minWidth: 180 }}>
                        <div className="flex gap-1">
                          {/* Check-In Button for Inspectors - Only visible to Inspectors */}
                          {currentUser?.inspection_role === 'inspector' && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <CheckInButton
                                inspection={inspection}
                                currentUser={currentUser}
                                activeAttendance={activeAttendance}
                                onCheckIn={onCheckIn}
                                onCheckOut={onCheckOut}
                                compact={true}
                              />
                            </div>
                          )}

                          {/* View Location Button */}
                          {onViewLocation && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewLocation(inspection);
                              }}
                              title="View Location & Attendance"
                            >
                              <MapPin className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Review/Rate Button - Only for Admin/QC & Completed/Finalized Inspections */}
                          {isAdminOrQC && (inspection.status === 'completed' || inspection.status === 'finalized') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReviewInspection(inspection);
                              }}
                              title="Rate Inspector Performance"
                            >
                              <FileCheck className="w-4 h-4" />
                            </Button>
                          )}

                          {onViewReports && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewReports(inspection);
                              }}
                              title="View Reports"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Replace Report Button - For Inspectors */}
                          {currentUser?.inspection_role === 'inspector' && onReplaceReport && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReplaceReport(inspection);
                              }}
                              title="Replace Inspection Report"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}

                          {inspection.tpi_agency && (
                            <a
                              href={generateEmailLink(inspection)}
                              onClick={(e) => e.stopPropagation()}
                              title={`Notify ${inspection.tpi_agency} via Email`}
                            >
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                <Mail className="w-4 h-4" />
                              </Button>
                            </a>
                          )}
                          {inspection.document_url && (
                            <a
                              href={inspection.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="View Document"
                            >
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </a>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => handleDeleteClick(e, inspection)}
                              title="Delete Inspection"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DragDropContext>
        </div>

        <div className="p-3 border-t bg-gray-50 text-xs text-gray-600 sticky bottom-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
            <span>
              Showing {filteredInspections.length} of {inspections.length} inspections
              {Object.keys(columnFilters).length > 0 && " (filtered)"}
            </span>
            <span className="hidden sm:inline">
              💡 Tip: Click <MapPin className="w-3 h-3 inline" /> for location • Click <FileText className="w-3 h-3 inline" /> to view reports • Click <Mail className="w-3 h-3 inline" /> to notify TPI • Double-click cells to expand
            </span>
          </div>
        </div>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inspection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inspection notification?
              {inspectionToDelete && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">
                    {inspectionToDelete.notification_number || "Notification"}
                  </p>
                  {inspectionToDelete.po_number && (
                    <p className="text-sm text-gray-600">PO: {inspectionToDelete.po_number}</p>
                  )}
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

      {reviewInspection && (
        <InspectionReviewDialog
          inspection={reviewInspection}
          isOpen={!!reviewInspection}
          onClose={() => setReviewInspection(null)}
          onSaved={() => setReviewInspection(null)}
        />
      )}
    </>
  );
}