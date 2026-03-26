import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export default function InspectionReviewDialog({ inspection, isOpen, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    report_quality_score: 90,
    timeliness_score: 90,
    communication_score: 90,
    overall_score: 90,
    missed_ncr_count: 0,
    false_ncr_count: 0,
    strengths: "",
    areas_for_improvement: "",
    additional_comments: ""
  });

  useEffect(() => {
    if (isOpen && inspection) {
      fetchReview();
    }
  }, [isOpen, inspection]);

  const fetchReview = async () => {
    try {
      setLoading(true);
      // Try to find existing review for this inspection
      const reviews = await base44.entities.InspectionReview.list();
      const existingReview = reviews.find(r => r.inspection_id === inspection.id);

      if (existingReview) {
        setFormData({
          report_quality_score: existingReview.report_quality_score || 90,
          timeliness_score: existingReview.timeliness_score || 90,
          communication_score: existingReview.communication_score || 90,
          overall_score: existingReview.overall_score || 90,
          missed_ncr_count: existingReview.missed_ncr_count || 0,
          false_ncr_count: existingReview.false_ncr_count || 0,
          strengths: existingReview.strengths || "",
          areas_for_improvement: existingReview.areas_for_improvement || "",
          additional_comments: existingReview.additional_comments || ""
        });
      } else {
        // Reset to defaults
        setFormData({
          report_quality_score: 90,
          timeliness_score: 90,
          communication_score: 90,
          overall_score: 90,
          missed_ncr_count: 0,
          false_ncr_count: 0,
          strengths: "",
          areas_for_improvement: "",
          additional_comments: ""
        });
      }
    } catch (error) {
      console.error("Error fetching review:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!inspection.assigned_inspector_id) {
      toast.error("No inspector assigned to this inspection.");
      return;
    }

    setLoading(true);
    try {
      const reviews = await base44.entities.InspectionReview.list();
      const existingReview = reviews.find(r => r.inspection_id === inspection.id);

      const dataToSave = {
        ...formData,
        inspection_id: inspection.id,
        inspector_id: inspection.assigned_inspector_id
      };

      if (existingReview) {
        await base44.entities.InspectionReview.update(existingReview.id, dataToSave);
        toast.success("Review updated successfully");
      } else {
        await base44.entities.InspectionReview.create(dataToSave);
        toast.success("Review created successfully");
      }
      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      console.error("Error saving review:", error);
      toast.error("Failed to save review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evaluate Inspection Performance</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">Technical Quality</h3>

            <div className="space-y-2">
              <Label>Missed NCRs (Count)</Label>
              <Input
                type="number"
                min="0"
                value={formData.missed_ncr_count}
                onChange={(e) => setFormData({ ...formData, missed_ncr_count: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500">Target: ≤ 2% rate</p>
            </div>

            <div className="space-y-2">
              <Label>Timeliness Score (0-100)</Label>
              <Input
                type="number"
                min="0" max="100"
                value={formData.timeliness_score}
                onChange={(e) => setFormData({ ...formData, timeliness_score: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500">On-time completion & submission</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">Documentation</h3>

            <div className="space-y-2">
              <Label>Report Quality Score (0-100)</Label>
              <Input
                type="number"
                min="0" max="100"
                value={formData.report_quality_score}
                onChange={(e) => setFormData({ ...formData, report_quality_score: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500">Target: ≥ 90%</p>
            </div>

            <div className="space-y-2">
              <Label>Overall Score (0-100)</Label>
              <Input
                type="number"
                min="0" max="100"
                value={formData.overall_score}
                onChange={(e) => setFormData({ ...formData, overall_score: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500">Weighted average of all scores</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">Performance Metrics</h3>

            <div className="space-y-2">
              <Label>Communication Score (0-100)</Label>
              <Input
                type="number"
                min="0" max="100"
                value={formData.communication_score}
                onChange={(e) => setFormData({ ...formData, communication_score: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500">Responsiveness & clarity</p>
            </div>

            <div className="space-y-2">
              <Label>False NCR Count</Label>
              <Input
                type="number"
                min="0"
                value={formData.false_ncr_count}
                onChange={(e) => setFormData({ ...formData, false_ncr_count: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500">False positive findings</p>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">Feedback</h3>

            <div className="space-y-2">
              <Label>Strengths</Label>
              <Textarea
                value={formData.strengths}
                onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                placeholder="What did the inspector do well?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Areas for Improvement</Label>
              <Textarea
                value={formData.areas_for_improvement}
                onChange={(e) => setFormData({ ...formData, areas_for_improvement: e.target.value })}
                placeholder="What could be improved?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Comments</Label>
              <Textarea
                value={formData.additional_comments}
                onChange={(e) => setFormData({ ...formData, additional_comments: e.target.value })}
                placeholder="Any other notes..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}