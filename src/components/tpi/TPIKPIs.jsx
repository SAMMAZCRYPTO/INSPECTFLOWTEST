import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, FileCheck, Star, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

export default function TPIKPIs({ tpiAgency, inspections, reviews }) {
  const kpiData = useMemo(() => {
    // Filter inspections for this TPI agency
    const agencyInspections = inspections.filter(i => i.tpi_agency === tpiAgency.name);
    
    if (agencyInspections.length === 0) {
      return { overallScore: 0, kpis: [], totalInspections: 0, reviewedInspections: 0 };
    }

    // Get reviews for these inspections
    const agencyReviews = reviews.filter(r => 
      agencyInspections.some(i => i.id === r.inspection_id)
    );

    const totalInspections = agencyInspections.length;
    const completedInspections = agencyInspections.filter(i => i.status === 'completed' || i.status === 'finalized').length;
    const finalizedInspections = agencyInspections.filter(i => i.status === 'finalized').length;
    const reviewedInspections = agencyReviews.length;

    // KPI Calculations
    const kpis = [];

    // 1. TIMELINESS CATEGORY
    // On-Time Report Delivery
    const reportsWithDates = agencyInspections.filter(i => 
      i.status === 'finalized' && i.start_date && i.inspection_reports?.length > 0
    );
    let onTimeDeliveryScore = 0;
    if (reportsWithDates.length > 0) {
      const onTimeCount = reportsWithDates.filter(i => {
        const inspectionDate = new Date(i.start_date);
        const reportDate = new Date(i.inspection_reports[i.inspection_reports.length - 1]?.uploaded_date);
        const daysDiff = (reportDate - inspectionDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7; // Within 7 days
      }).length;
      onTimeDeliveryScore = (onTimeCount / reportsWithDates.length) * 100;
    }
    kpis.push({
      category: "Timeliness",
      name: "On-Time Report Delivery",
      description: "Reports submitted within 7 days",
      target: "≥85%",
      actual: onTimeDeliveryScore.toFixed(1) + "%",
      score: onTimeDeliveryScore,
      weight: 15,
      status: onTimeDeliveryScore >= 85 ? "good" : onTimeDeliveryScore >= 70 ? "warning" : "poor"
    });

    // Finalization Rate
    const finalizationRate = totalInspections > 0 ? (finalizedInspections / totalInspections) * 100 : 0;
    kpis.push({
      category: "Timeliness",
      name: "Inspection Finalization Rate",
      description: "Inspections reaching finalized status",
      target: "≥90%",
      actual: finalizationRate.toFixed(1) + "%",
      score: finalizationRate,
      weight: 10,
      status: finalizationRate >= 90 ? "good" : finalizationRate >= 75 ? "warning" : "poor"
    });

    // 2. TECHNICAL QUALITY CATEGORY
    // Specification Compliance (from reviews)
    let avgSpecCompliance = 0;
    if (agencyReviews.length > 0) {
      const reviewsWithSpec = agencyReviews.filter(r => r.specification_compliance_score != null);
      if (reviewsWithSpec.length > 0) {
        avgSpecCompliance = reviewsWithSpec.reduce((sum, r) => sum + r.specification_compliance_score, 0) / reviewsWithSpec.length;
      }
    }
    kpis.push({
      category: "Technical Quality",
      name: "Specification Compliance Score",
      description: "Average audit score for compliance",
      target: "≥85/100",
      actual: avgSpecCompliance.toFixed(1) + "/100",
      score: avgSpecCompliance,
      weight: 20,
      status: avgSpecCompliance >= 85 ? "good" : avgSpecCompliance >= 70 ? "warning" : "poor"
    });

    // NCR Accuracy (Missed NCRs)
    let ncrAccuracy = 100;
    if (agencyReviews.length > 0) {
      const avgMissedNCRs = agencyReviews.reduce((sum, r) => sum + (r.missed_ncr_count || 0), 0) / agencyReviews.length;
      ncrAccuracy = Math.max(0, 100 - (avgMissedNCRs * 10)); // Penalty of 10 points per missed NCR
    }
    kpis.push({
      category: "Technical Quality",
      name: "NCR Detection Accuracy",
      description: "Effectiveness in identifying non-conformances",
      target: "≥90%",
      actual: ncrAccuracy.toFixed(1) + "%",
      score: ncrAccuracy,
      weight: 15,
      status: ncrAccuracy >= 90 ? "good" : ncrAccuracy >= 75 ? "warning" : "poor"
    });

    // 3. DOCUMENTATION QUALITY CATEGORY
    // Report Quality Score
    let avgReportQuality = 0;
    if (agencyReviews.length > 0) {
      const reviewsWithQuality = agencyReviews.filter(r => r.report_quality_score != null);
      if (reviewsWithQuality.length > 0) {
        avgReportQuality = reviewsWithQuality.reduce((sum, r) => sum + r.report_quality_score, 0) / reviewsWithQuality.length;
      }
    }
    kpis.push({
      category: "Documentation Quality",
      name: "Report Quality Score",
      description: "Average quality rating of reports",
      target: "≥85/100",
      actual: avgReportQuality.toFixed(1) + "/100",
      score: avgReportQuality,
      weight: 15,
      status: avgReportQuality >= 85 ? "good" : avgReportQuality >= 70 ? "warning" : "poor"
    });

    // First-Time Acceptance Rate
    let ftaRate = 0;
    if (agencyReviews.length > 0) {
      const ftaCount = agencyReviews.filter(r => r.first_time_acceptance === true).length;
      ftaRate = (ftaCount / agencyReviews.length) * 100;
    }
    kpis.push({
      category: "Documentation Quality",
      name: "First-Time Acceptance Rate",
      description: "Reports accepted without rework",
      target: "≥80%",
      actual: ftaRate.toFixed(1) + "%",
      score: ftaRate,
      weight: 10,
      status: ftaRate >= 80 ? "good" : ftaRate >= 65 ? "warning" : "poor"
    });

    // 4. GOVERNANCE & COMPLIANCE CATEGORY
    // ITP Hold Point Compliance
    let itpCompliance = 0;
    if (agencyReviews.length > 0) {
      const complianceCount = agencyReviews.filter(r => r.itp_hold_point_compliance === true).length;
      itpCompliance = (complianceCount / agencyReviews.length) * 100;
    }
    kpis.push({
      category: "Governance & Compliance",
      name: "ITP Hold Point Compliance",
      description: "Adherence to ITP requirements",
      target: "100%",
      actual: itpCompliance.toFixed(1) + "%",
      score: itpCompliance,
      weight: 10,
      status: itpCompliance >= 95 ? "good" : itpCompliance >= 85 ? "warning" : "poor"
    });

    // 5. CLIENT SATISFACTION CATEGORY
    // Client Rating
    let avgClientRating = 0;
    if (agencyReviews.length > 0) {
      const reviewsWithRating = agencyReviews.filter(r => r.client_rating != null);
      if (reviewsWithRating.length > 0) {
        avgClientRating = reviewsWithRating.reduce((sum, r) => sum + r.client_rating, 0) / reviewsWithRating.length;
      }
    }
    const clientRatingScore = (avgClientRating / 5) * 100;
    kpis.push({
      category: "Client Satisfaction",
      name: "Client Feedback Rating",
      description: "Average client satisfaction score",
      target: "≥4.0/5.0",
      actual: avgClientRating.toFixed(1) + "/5.0",
      score: clientRatingScore,
      weight: 10,
      status: avgClientRating >= 4.0 ? "good" : avgClientRating >= 3.5 ? "warning" : "poor"
    });

    // 6. VALUE ADDITION CATEGORY
    // Value-Added Observations
    let avgValueObs = 0;
    if (agencyReviews.length > 0) {
      const totalValueObs = agencyReviews.reduce((sum, r) => sum + (r.value_added_observations || 0), 0);
      avgValueObs = totalValueObs / agencyReviews.length;
    }
    const valueObsScore = Math.min(100, avgValueObs * 20); // 5+ observations = 100%
    kpis.push({
      category: "Value Addition",
      name: "Value-Added Observations",
      description: "Average proactive insights per inspection",
      target: "≥3",
      actual: avgValueObs.toFixed(1),
      score: valueObsScore,
      weight: 5,
      status: avgValueObs >= 3 ? "good" : avgValueObs >= 2 ? "warning" : "poor"
    });

    // Calculate Overall Score
    const totalWeight = kpis.reduce((sum, kpi) => sum + kpi.weight, 0);
    const overallScore = kpis.reduce((sum, kpi) => sum + (kpi.score * kpi.weight), 0) / totalWeight;

    return {
      overallScore,
      kpis,
      totalInspections,
      reviewedInspections,
      completedInspections,
      finalizedInspections
    };
  }, [tpiAgency, inspections, reviews]);

  const getScoreColor = (score) => {
    if (score >= 85) return "text-green-600 bg-green-50";
    if (score >= 70) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getStatusBadge = (status) => {
    const configs = {
      good: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
      warning: { color: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertCircle },
      poor: { color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle }
    };
    const config = configs[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status === 'good' ? 'Excellent' : status === 'warning' ? 'Needs Improvement' : 'Critical'}
      </Badge>
    );
  };

  if (kpiData.totalInspections === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">No Data Available</p>
          <p className="text-sm mt-1">This TPI agency has no inspections assigned yet.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 elevation-1">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getScoreColor(kpiData.overallScore)}`}>
              <Star className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Overall Score</p>
              <p className="text-2xl font-bold">{kpiData.overallScore.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 elevation-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Reviews</p>
              <p className="text-2xl font-bold">{kpiData.reviewedInspections}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 elevation-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Inspections</p>
              <p className="text-2xl font-bold">{kpiData.totalInspections}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 elevation-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Finalized</p>
              <p className="text-2xl font-bold">{kpiData.finalizedInspections}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* KPI Table */}
      <Card className="elevation-2">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-gray-900">Performance Metrics</h3>
          <p className="text-sm text-gray-600 mt-1">Detailed breakdown of KPI scores</p>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Category</TableHead>
              <TableHead>KPI</TableHead>
              <TableHead className="w-[100px]">Target</TableHead>
              <TableHead className="w-[100px]">Actual</TableHead>
              <TableHead className="w-[80px]">Score</TableHead>
              <TableHead className="w-[80px]">Weight</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kpiData.kpis.map((kpi, idx) => (
              <TableRow key={idx} className="hover:bg-gray-50">
                <TableCell className="font-medium text-gray-900">{kpi.category}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{kpi.name}</p>
                    <p className="text-xs text-gray-500">{kpi.description}</p>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{kpi.target}</TableCell>
                <TableCell className="font-bold">{kpi.actual}</TableCell>
                <TableCell>
                  <span className={`font-bold text-lg ${getScoreColor(kpi.score)}`}>
                    {kpi.score.toFixed(0)}
                  </span>
                </TableCell>
                <TableCell className="text-gray-600">{kpi.weight}%</TableCell>
                <TableCell>{getStatusBadge(kpi.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="p-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Overall Performance Score</p>
              <p className="text-xs text-gray-600">Weighted average of all KPIs</p>
            </div>
            <div className={`text-3xl font-bold px-6 py-2 rounded-lg ${getScoreColor(kpiData.overallScore)}`}>
              {kpiData.overallScore.toFixed(1)}%
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}