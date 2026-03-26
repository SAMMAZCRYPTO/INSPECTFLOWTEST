import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Award, TrendingUp } from "lucide-react";
import TPIKPIs from "../components/tpi/TPIKPIs";
import { Badge } from "@/components/ui/badge";

export default function TPIPerformance() {
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // NEW: Single query to materialized view (replaces 3 queries + aggregation)
  const { data: tpiPerformance = [], isLoading } = useQuery({
    queryKey: ["tpi_performance_dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tpi_performance_dashboard')
        .select('*')
        .order('avg_overall_score', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    initialData: [],
  });

  // For backward compatibility, also fetch raw agencies for TPIKPIs component
  const { data: agencies = [] } = useQuery({
    queryKey: ["tpiAgencies"],
    queryFn: () => base44.entities.TPIAgency.list(),
    initialData: [],
  });

  // Fetch inspections and reviews for selected agency details
  const { data: inspections = [] } = useQuery({
    queryKey: ["inspections"],
    queryFn: () => base44.entities.Inspection.list("-created_at"),
    initialData: [],
    enabled: !!selectedAgency, // Only fetch when agency selected
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => base44.entities.InspectionReview.list(),
    initialData: [],
    enabled: !!selectedAgency, // Only fetch when agency selected
  });

  // Auto-select first agency
  useEffect(() => {
    if (tpiPerformance.length > 0 && !selectedAgency) {
      // Find the corresponding agency object
      const firstAgency = agencies.find(a => a.id === tpiPerformance[0].agency_id);
      if (firstAgency) {
        setSelectedAgency(firstAgency);
      }
    }
  }, [tpiPerformance, agencies, selectedAgency]);

  // NEW: Performance stats are pre-aggregated in the view!
  const agencyStats = React.useMemo(() => {
    return tpiPerformance.map(perfData => {
      const agency = agencies.find(a => a.id === perfData.agency_id) || {
        id: perfData.agency_id,
        name: perfData.agency_name,
        manager_name: perfData.manager_name,
      };

      return {
        agency,
        totalInspections: perfData.total_inspections || 0,
        reviewedInspections: perfData.total_inspections || 0, // Approx
        avgScore: perfData.avg_overall_score || 0,
      };
    });
  }, [tpiPerformance, agencies]);

  const getScoreColor = (score) => {
    if (score >= 85) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 70) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading TPI performance data...</p>
        </div>
      </div>
    );
  }

  if (tpiPerformance.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">No TPI Agencies Found</p>
          <p className="text-sm text-gray-600 mt-1">Add TPI agencies to track their performance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          TPI Performance Evaluation
        </h1>
        <p className="text-gray-600">
          Monitor and evaluate Third-Party Inspection agency performance based on KPIs
        </p>
      </div>

      {/* Agency Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agencyStats.map(({ agency, totalInspections, reviewedInspections, avgScore }) => (
          <Card
            key={agency.id}
            className={`p-4 cursor-pointer transition-all duration-200 hover:elevation-3 ${selectedAgency?.id === agency.id
                ? "elevation-3 border-2 border-indigo-600"
                : "elevation-1"
              }`}
            onClick={() => setSelectedAgency(agency)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedAgency?.id === agency.id ? "bg-indigo-100" : "bg-gray-100"
                  }`}>
                  <Building2 className={`w-6 h-6 ${selectedAgency?.id === agency.id ? "text-indigo-600" : "text-gray-600"
                    }`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{agency.name}</h3>
                  <p className="text-xs text-gray-500">{agency.manager_name || "No manager"}</p>
                </div>
              </div>
              {avgScore > 0 && (
                <Badge className={`${getScoreColor(avgScore)} border font-medium`}>
                  {avgScore.toFixed(0)}%
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
              <div>
                <p className="text-xs text-gray-600">Inspections</p>
                <p className="text-lg font-bold text-gray-900">{totalInspections}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Reviews</p>
                <p className="text-lg font-bold text-gray-900">{reviewedInspections}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Performance Tabs */}
      {selectedAgency && (
        <Tabs defaultValue="kpis" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="kpis" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              KPI Dashboard
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Evaluation Matrix
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kpis" className="mt-6">
            <TPIKPIs
              tpiAgency={selectedAgency}
              inspections={inspections}
              reviews={reviews}
            />
          </TabsContent>

          <TabsContent value="evaluation" className="mt-6">
            <Card className="p-6 elevation-2">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Performance Evaluation Matrix</h3>
                <p className="text-sm text-gray-600">
                  Comprehensive scoring based on {selectedAgency.name}'s performance across all KPI categories
                </p>
              </div>

              <TPIKPIs
                tpiAgency={selectedAgency}
                inspections={inspections}
                reviews={reviews}
              />

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Scoring Methodology</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>85-100%:</strong> Excellent - Exceeds expectations</li>
                  <li>• <strong>70-84%:</strong> Good - Meets expectations with room for improvement</li>
                  <li>• <strong>Below 70%:</strong> Needs Improvement - Requires corrective action</li>
                  <li>• Weighted scoring ensures critical KPIs have appropriate impact</li>
                  <li>• Regular reviews recommended for continuous improvement</li>
                </ul>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}