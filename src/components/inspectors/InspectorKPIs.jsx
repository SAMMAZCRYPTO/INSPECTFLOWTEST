import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { differenceInHours, differenceInMinutes, parseISO, isValid } from "date-fns";
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, Clock, FileCheck, ShieldCheck } from "lucide-react";

export default function InspectorKPIs({ inspections, attendance, reviews }) {
  
  const kpiData = useMemo(() => {
    // 1. TIMELINESS
    let onTimeAttendanceCount = 0;
    let validAttendanceCount = 0;
    
    let submissionTimeSum = 0;
    let submissionCount = 0;

    // 2. TECHNICAL QUALITY
    let totalNCRs = 0;
    let totalInspectionsWithFindings = 0;
    
    // 3. AGGREGATED REVIEW DATA
    let totalMissedNCRs = 0;
    let complianceScoreSum = 0;
    let reportQualitySum = 0;
    let firstTimeAcceptanceCount = 0;
    let clientRatingSum = 0;
    let itpComplianceCount = 0;
    let valueAddedObsSum = 0;
    let reviewCount = 0;

    // Calculate Timeliness from Attendance & Inspections
    inspections.forEach(insp => {
      // Attendance
      const att = attendance.find(a => a.inspection_id === insp.id && a.status === 'checked_in');
      if (att && insp.start_date) {
        validAttendanceCount++;
        const startTime = parseISO(`${insp.start_date}T${insp.inspection_time ? convertTo24Hour(insp.inspection_time) : '09:00:00'}`);
        const checkInTime = parseISO(att.check_in_time);
        
        if (isValid(startTime) && isValid(checkInTime)) {
             const diffMinutes = differenceInMinutes(checkInTime, startTime);
             // On time if checked in before or within 30 mins after start
             if (diffMinutes <= 30) { 
                 onTimeAttendanceCount++;
             }
        }
      }

      // Submission Time
      const finalReport = insp.inspection_reports?.find(r => r.is_final_report) || insp.inspection_reports?.[0];
      if (finalReport && finalReport.uploaded_date && insp.end_date) {
        const endTime = parseISO(`${insp.end_date || insp.start_date}T18:00:00`); // Assume 6 PM end
        const uploadTime = parseISO(finalReport.uploaded_date);
        if (isValid(endTime) && isValid(uploadTime)) {
            const hours = differenceInHours(uploadTime, endTime);
            if (hours > 0) { // Only count positive hours (late), if negative/zero it's instant/early = 0 hours late
                submissionTimeSum += hours;
            }
            submissionCount++;
        }
      }

      // NCR Detection (from Inspection entity directly)
      const ncrs = insp.inspection_reports?.reduce((acc, rep) => {
          return acc + (rep.findings?.filter(f => f.type?.toLowerCase().includes('ncr') || f.severity?.toLowerCase().includes('major'))?.length || 0);
      }, 0) || 0;
      totalNCRs += ncrs;
      if (insp.inspection_reports?.length > 0) totalInspectionsWithFindings++;
    });

    // Calculate Review Metrics
    reviews.forEach(rev => {
        reviewCount++;
        totalMissedNCRs += (rev.missed_ncr_count || 0);
        complianceScoreSum += (rev.specification_compliance_score || 0);
        reportQualitySum += (rev.report_quality_score || 0);
        if (rev.first_time_acceptance) firstTimeAcceptanceCount++;
        clientRatingSum += (rev.client_rating || 0);
        if (rev.itp_hold_point_compliance) itpComplianceCount++;
        valueAddedObsSum += (rev.value_added_observations || 0);
    });

    // --- KPI CALCULATIONS ---
    
    // Timeliness
    const attendanceScore = validAttendanceCount ? (onTimeAttendanceCount / validAttendanceCount) * 100 : 100;
    const avgSubmissionTime = submissionCount ? (submissionTimeSum / submissionCount) : 0;
    
    // Quality
    const ncrEffectiveness = totalInspectionsWithFindings ? (totalNCRs / totalInspectionsWithFindings).toFixed(1) : 0;
    const missedNcrRate = totalNCRs + totalMissedNCRs > 0 ? (totalMissedNCRs / (totalNCRs + totalMissedNCRs)) * 100 : 0;
    const avgCompliance = reviewCount ? (complianceScoreSum / reviewCount) : 100;

    // Documentation
    const avgReportQuality = reviewCount ? (reportQualitySum / reviewCount) : 100;
    const firstTimeAcceptanceRate = reviewCount ? (firstTimeAcceptanceCount / reviewCount) * 100 : 100;

    // Communication
    const avgClientRating = reviewCount ? (clientRatingSum / reviewCount) : 5;

    // Governance
    const itpComplianceRate = reviewCount ? (itpComplianceCount / reviewCount) * 100 : 100;

    // Value
    const avgValueAdded = reviewCount ? (valueAddedObsSum / reviewCount).toFixed(1) : 0;

    return [
      {
        category: "Timeliness",
        name: "On-time Inspection Attendance",
        description: "Attendance as per approved schedule",
        target: "≥ 98%",
        actual: `${attendanceScore.toFixed(1)}%`,
        score: attendanceScore,
        weight: 10,
        status: attendanceScore >= 98 ? "success" : attendanceScore >= 90 ? "warning" : "error"
      },
      {
        category: "Timeliness",
        name: "Report Submission Time",
        description: "Hours taken to submit report",
        target: "≤ 24-48 hrs",
        actual: `${avgSubmissionTime.toFixed(1)} hrs`,
        score: Math.max(0, 100 - (avgSubmissionTime * 2)), // Rough scoring logic
        weight: 10,
        status: avgSubmissionTime <= 48 ? "success" : "warning"
      },
      {
        category: "Technical Quality",
        name: "NCR Detection Effectiveness",
        description: "Valid NCRs raised per inspection",
        target: "Project Based",
        actual: ncrEffectiveness,
        score: 100, // Hard to score without specific target
        weight: 10,
        status: "neutral"
      },
      {
        category: "Technical Quality",
        name: "Missed NCR Rate",
        description: "NCRs identified later by client",
        target: "≤ 2%",
        actual: `${missedNcrRate.toFixed(1)}%`,
        score: Math.max(0, 100 - (missedNcrRate * 10)),
        weight: 10,
        status: missedNcrRate <= 2 ? "success" : "error"
      },
      {
        category: "Technical Quality",
        name: "Specification Compliance",
        description: "Adherence to ITP, IEC, API Specs",
        target: "100%",
        actual: `${avgCompliance.toFixed(1)}%`,
        score: avgCompliance,
        weight: 10,
        status: avgCompliance === 100 ? "success" : "warning"
      },
      {
        category: "Documentation",
        name: "Report Quality",
        description: "Clarity, completeness, photo evidence",
        target: "≥ 90%",
        actual: `${avgReportQuality.toFixed(1)}%`,
        score: avgReportQuality,
        weight: 10,
        status: avgReportQuality >= 90 ? "success" : "warning"
      },
      {
        category: "Documentation",
        name: "First-time Report Acceptance",
        description: "Reports accepted without rework",
        target: "≥ 95%",
        actual: `${firstTimeAcceptanceRate.toFixed(1)}%`,
        score: firstTimeAcceptanceRate,
        weight: 10,
        status: firstTimeAcceptanceRate >= 95 ? "success" : "warning"
      },
      {
        category: "Communication",
        name: "Client Feedback",
        description: "Feedback from client/PMC",
        target: "≥ 4/5",
        actual: `${avgClientRating.toFixed(1)}/5`,
        score: (avgClientRating / 5) * 100,
        weight: 10,
        status: avgClientRating >= 4 ? "success" : "warning"
      },
      {
        category: "Governance",
        name: "ITP Hold Point Compliance",
        description: "No hold points skipped",
        target: "100%",
        actual: `${itpComplianceRate.toFixed(1)}%`,
        score: itpComplianceRate,
        weight: 10,
        status: itpComplianceRate === 100 ? "success" : "error"
      },
      {
        category: "Value Addition",
        name: "Value-added Observations",
        description: "Improvement suggestions beyond checklist",
        target: "≥ 2",
        actual: avgValueAdded,
        score: Math.min(100, (avgValueAdded / 2) * 100),
        weight: 10,
        status: avgValueAdded >= 2 ? "success" : "warning"
      }
    ];
  }, [inspections, attendance, reviews]);

  const overallScore = kpiData.reduce((acc, item) => acc + (item.score * (item.weight / 100)), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Overall Performance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-bold text-indigo-600">{overallScore.toFixed(1)}%</div>
              <TrendingUp className={`w-6 h-6 ${overallScore >= 90 ? 'text-green-500' : 'text-amber-500'}`} />
            </div>
            <Progress value={overallScore} className="mt-3 h-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-700">{reviews.length}</div>
            <p className="text-xs text-gray-500 mt-1">Manual evaluations completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Inspections Evaluated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-700">{inspections.length}</div>
            <p className="text-xs text-gray-500 mt-1">Total assignments processed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Key Performance Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>KPI Name</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiData.map((kpi, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium text-gray-500 text-xs uppercase">{kpi.category}</TableCell>
                  <TableCell className="font-semibold">{kpi.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-gray-500 text-sm">{kpi.description}</TableCell>
                  <TableCell className="text-gray-600">{kpi.target}</TableCell>
                  <TableCell className="font-bold">{kpi.actual}</TableCell>
                  <TableCell>
                    {kpi.status === 'success' && <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Excellent</Badge>}
                    {kpi.status === 'warning' && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Needs Work</Badge>}
                    {kpi.status === 'error' && <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Critical</Badge>}
                    {kpi.status === 'neutral' && <Badge variant="outline">Info</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to parse time strings like "10:00 AM" to "10:00:00"
function convertTo24Hour(timeStr) {
    if (!timeStr) return "09:00:00";
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') {
        hours = '00';
    }
    if (modifier === 'PM') {
        hours = parseInt(hours, 10) + 12;
    }
    return `${hours}:${minutes}:00`;
}