import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ArrowRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye } from "lucide-react";

export default function VendorAlerts({ supplierName, subsupplierName, currentProjectId, currentInspectionId }) {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const checkHistory = async () => {
      if (!supplierName && !subsupplierName) return;
      
      setLoading(true);
      try {
        // Fetch ALL inspections to check history across ALL projects
        const allInspections = await base44.entities.Inspection.list("-created_at");
        const allProjects = await base44.entities.Project.list();
        
        const historyFindings = [];
        
        allInspections.forEach(insp => {
          // Skip current inspection
          if (insp.id === currentInspectionId) return;
          
          // Check if vendor matches
          const vendorMatch = 
            (supplierName && insp.supplier_name?.toLowerCase().includes(supplierName.toLowerCase())) ||
            (subsupplierName && insp.subsupplier_name?.toLowerCase().includes(subsupplierName.toLowerCase()));
            
          if (vendorMatch && insp.inspection_reports) {
            insp.inspection_reports.forEach(report => {
              if (report.findings && report.findings.length > 0) {
                report.findings.forEach(finding => {
                  const project = allProjects.find(p => p.id === insp.project_id);
                  historyFindings.push({
                    ...finding,
                    inspection_id: insp.id,
                    po_number: insp.po_number,
                    project_name: project?.name || "Unknown Project",
                    report_date: report.report_date || report.uploaded_date,
                    report_url: report.url,
                    vendor: insp.supplier_name
                  });
                });
              }
            });
          }
        });
        
        setFindings(historyFindings);
      } catch (err) {
        console.error("Error checking vendor history:", err);
      } finally {
        setLoading(false);
      }
    };
    
    checkHistory();
  }, [supplierName, subsupplierName, currentInspectionId]);

  if (loading || findings.length === 0) return null;

  const criticalCount = findings.filter(f => f.severity?.toLowerCase().includes('critical') || f.severity?.toLowerCase().includes('major')).length;

  return (
    <>
      <Alert className="mb-6 border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900 flex items-center justify-between w-full">
          <div>
            <strong>Vendor Alert:</strong> This vendor has {findings.length} past finding(s) recorded across other projects.
            {criticalCount > 0 && (
              <span className="block text-sm mt-1 text-red-700 font-medium">
                ⚠️ Including {criticalCount} Critical/Major issues.
              </span>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setDialogOpen(true)}
            className="bg-white hover:bg-amber-100 border-amber-300 text-amber-800"
          >
            <History className="w-4 h-4 mr-2" />
            View History
          </Button>
        </AlertDescription>
      </Alert>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vendor Finding History: {supplierName}</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.map((finding, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Badge variant="outline" className={
                        finding.severity?.toLowerCase().includes('critical') || finding.severity?.toLowerCase().includes('major')
                          ? "bg-red-100 text-red-800 border-red-200" 
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }>
                        {finding.severity || "Finding"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-gray-900 font-medium">{finding.type}</p>
                      <p className="text-sm text-gray-600">{finding.description}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{finding.project_name}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{finding.po_number}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(finding.report_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {finding.report_url && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8"
                          onClick={() => window.open(finding.report_url, '_blank')}
                          title="View Report"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}