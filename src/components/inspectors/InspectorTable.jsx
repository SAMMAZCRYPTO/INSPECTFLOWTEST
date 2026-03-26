import React, { useState } from "react";
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
import { Edit, Trash2, ExternalLink, FileText, Download, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
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

const statusColors = {
  active: "bg-green-100 text-green-800 border-green-200",
  inactive: "bg-red-100 text-red-800 border-red-200",
  on_leave: "bg-amber-100 text-amber-800 border-amber-200",
};

export default function InspectorTable({ inspectors, onEdit, onDelete }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inspectorToDelete, setInspectorToDelete] = useState(null);

  const handleDeleteClick = (e, inspector) => {
    e.stopPropagation();
    setInspectorToDelete(inspector);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (inspectorToDelete && onDelete) {
      onDelete(inspectorToDelete.id);
    }
    setDeleteDialogOpen(false);
    setInspectorToDelete(null);
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

    const rows = inspectors.map((inspector) => {
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

  return (
    <>
      <Card className="elevation-2">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Inspector Directory
            </h2>
          </div>
          <Button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 elevation-1 hover:elevation-2"
            disabled={inspectors.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader className="sticky top-0 z-10 bg-gray-100">
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold border border-gray-300 bg-gray-100 min-w-[180px]">
                  Full Name
                </TableHead>
                <TableHead className="font-bold border border-gray-300 bg-gray-100 min-w-[200px]">
                  Email
                </TableHead>
                <TableHead className="font-bold border border-gray-300 bg-gray-100 min-w-[140px]">
                  Phone
                </TableHead>
                <TableHead className="font-bold border border-gray-300 bg-gray-100 min-w-[150px]">
                  Company/Agency
                </TableHead>
                <TableHead className="font-bold border border-gray-300 bg-gray-100 min-w-[150px]">
                  Specialization
                </TableHead>
                <TableHead className="font-bold border border-gray-300 bg-gray-100 min-w-[140px]">
                  Certification #
                </TableHead>
                <TableHead className="font-bold border border-gray-300 bg-gray-100 min-w-[100px]">
                  Experience
                </TableHead>
                <TableHead className="font-bold border border-gray-300 bg-gray-100 min-w-[120px]">
                  Status
                </TableHead>
                <TableHead className="font-bold border border-gray-300 bg-gray-100 min-w-[100px]">
                  Documents
                </TableHead>
                <TableHead className="font-bold border border-gray-300 bg-gray-100 min-w-[140px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspectors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500 border border-gray-300">
                    No inspectors found. Add your first inspector to get started.
                  </TableCell>
                </TableRow>
              ) : (
                inspectors.map((inspector, idx) => (
                  <TableRow
                    key={inspector.id}
                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                    onClick={() => onEdit(inspector)}
                  >
                    <TableCell className="border border-gray-300 font-medium">
                      {inspector.full_name || "-"}
                    </TableCell>
                    <TableCell className="border border-gray-300">
                      <a
                        href={`mailto:${inspector.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {inspector.email || "-"}
                      </a>
                    </TableCell>
                    <TableCell className="border border-gray-300">
                      {inspector.phone || "-"}
                    </TableCell>
                    <TableCell className="border border-gray-300">
                      {inspector.company || "-"}
                    </TableCell>
                    <TableCell className="border border-gray-300">
                      {inspector.specialization || "-"}
                    </TableCell>
                    <TableCell className="border border-gray-300">
                      {inspector.certification_number || "-"}
                    </TableCell>
                    <TableCell className="border border-gray-300 text-center">
                      {inspector.years_of_experience ? `${inspector.years_of_experience} yrs` : "-"}
                    </TableCell>
                    <TableCell className="border border-gray-300">
                      <Badge className={`${statusColors[inspector.status]} border font-medium`}>
                        {inspector.status?.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="border border-gray-300">
                      <div className="flex gap-1">
                        {inspector.cv_url && (
                          <a
                            href={inspector.cv_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="View CV"
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                              <FileText className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        {inspector.qualification_url && (
                          <a
                            href={inspector.qualification_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="View Certificate"
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        {!inspector.cv_url && !inspector.qualification_url && "-"}
                      </div>
                    </TableCell>
                    <TableCell className="border border-gray-300">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(inspector);
                          }}
                          title="Edit Inspector"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => handleDeleteClick(e, inspector)}
                          title="Delete Inspector"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-3 border-t bg-gray-50 text-xs text-gray-600 sticky bottom-0">
          <div className="flex items-center justify-between">
            <span>
              Showing {inspectors.length} inspector{inspectors.length !== 1 ? "s" : ""}
            </span>
            <span>
              💡 Tip: Click row to edit • Click <FileText className="w-3 h-3 inline" /> to view CV • Click <ExternalLink className="w-3 h-3 inline" /> to view certificate
            </span>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inspector</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inspector?
              {inspectorToDelete && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">
                    {inspectorToDelete.full_name}
                  </p>
                  {inspectorToDelete.email && (
                    <p className="text-sm text-gray-600">{inspectorToDelete.email}</p>
                  )}
                  {inspectorToDelete.company && (
                    <p className="text-sm text-gray-600">{inspectorToDelete.company}</p>
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
    </>
  );
}