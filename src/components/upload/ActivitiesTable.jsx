import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";

export default function ActivitiesTable({ value, onChange }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);

  // Parse activities - handle both array and string formats
  const parseActivities = (val) => {
    if (!val) return [];
    
    // If it's already an array, return it
    if (Array.isArray(val)) return val;
    
    // If it's a string, try to parse as JSON
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // If JSON parse fails, return empty array (old text format not supported)
        return [];
      }
    }
    
    return [];
  };

  const activities = parseActivities(value);

  const handleAdd = () => {
    setEditingIndex(activities.length);
    setEditingActivity({ 
      date: '', 
      time: '', 
      itp_step: '', 
      activity: '', 
      supplier: '', 
      contractor: '', 
      company_tpa: '', 
      remarks: '' 
    });
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditingActivity({ ...activities[index] });
  };

  const handleSave = () => {
    const newActivities = [...activities];
    if (editingIndex === activities.length) {
      newActivities.push(editingActivity);
    } else {
      newActivities[editingIndex] = editingActivity;
    }
    onChange(newActivities); // Pass array directly
    setEditingIndex(null);
    setEditingActivity(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditingActivity(null);
  };

  const handleDelete = (index) => {
    const newActivities = activities.filter((_, i) => i !== index);
    onChange(newActivities); // Pass array directly
  };

  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[120px] font-semibold">Date</TableHead>
              <TableHead className="w-[100px] font-semibold">Time</TableHead>
              <TableHead className="w-[100px] font-semibold">ITP Step</TableHead>
              <TableHead className="w-[200px] font-semibold">Inspection Activity</TableHead>
              <TableHead className="w-[100px] font-semibold">Supplier</TableHead>
              <TableHead className="w-[100px] font-semibold">Contractor</TableHead>
              <TableHead className="w-[120px] font-semibold">Company (TPA)</TableHead>
              <TableHead className="w-[200px] font-semibold">Remarks</TableHead>
              <TableHead className="w-[100px] font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.length === 0 && editingIndex === null ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No activities added yet. Click "Add Activity" to begin.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {activities.map((activity, index) => (
                  <TableRow key={index}>
                    {editingIndex === index ? (
                      <>
                        <TableCell>
                          <Input
                            type="date"
                            value={editingActivity.date}
                            onChange={(e) => setEditingActivity({ ...editingActivity, date: e.target.value })}
                            className="h-9 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={editingActivity.time}
                            onChange={(e) => setEditingActivity({ ...editingActivity, time: e.target.value })}
                            className="h-9 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editingActivity.itp_step}
                            onChange={(e) => setEditingActivity({ ...editingActivity, itp_step: e.target.value })}
                            placeholder="e.g., 4.2"
                            className="h-9 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={editingActivity.activity}
                            onChange={(e) => setEditingActivity({ ...editingActivity, activity: e.target.value })}
                            placeholder="Activity description"
                            rows={2}
                            className="text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editingActivity.supplier}
                            onChange={(e) => setEditingActivity({ ...editingActivity, supplier: e.target.value })}
                            placeholder="W/H/R"
                            className="h-9 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editingActivity.contractor}
                            onChange={(e) => setEditingActivity({ ...editingActivity, contractor: e.target.value })}
                            placeholder="W/H/R"
                            className="h-9 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editingActivity.company_tpa}
                            onChange={(e) => setEditingActivity({ ...editingActivity, company_tpa: e.target.value })}
                            placeholder="RW-10%"
                            className="h-9 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={editingActivity.remarks}
                            onChange={(e) => setEditingActivity({ ...editingActivity, remarks: e.target.value })}
                            placeholder="Remarks"
                            rows={2}
                            className="text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              onClick={handleSave}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={handleCancel}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{activity.date}</TableCell>
                        <TableCell>{activity.time}</TableCell>
                        <TableCell>{activity.itp_step}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{activity.activity}</TableCell>
                        <TableCell>{activity.supplier}</TableCell>
                        <TableCell>{activity.contractor}</TableCell>
                        <TableCell>{activity.company_tpa}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{activity.remarks}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => handleEdit(index)}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(index)}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
                {editingIndex === activities.length && (
                  <TableRow className="bg-blue-50">
                    <TableCell>
                      <Input
                        type="date"
                        value={editingActivity.date}
                        onChange={(e) => setEditingActivity({ ...editingActivity, date: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={editingActivity.time}
                        onChange={(e) => setEditingActivity({ ...editingActivity, time: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editingActivity.itp_step}
                        onChange={(e) => setEditingActivity({ ...editingActivity, itp_step: e.target.value })}
                        placeholder="e.g., 4.2"
                        className="h-9 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={editingActivity.activity}
                        onChange={(e) => setEditingActivity({ ...editingActivity, activity: e.target.value })}
                        placeholder="Activity description"
                        rows={2}
                        className="text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editingActivity.supplier}
                        onChange={(e) => setEditingActivity({ ...editingActivity, supplier: e.target.value })}
                        placeholder="W/H/R"
                        className="h-9 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editingActivity.contractor}
                        onChange={(e) => setEditingActivity({ ...editingActivity, contractor: e.target.value })}
                        placeholder="W/H/R"
                        className="h-9 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editingActivity.company_tpa}
                        onChange={(e) => setEditingActivity({ ...editingActivity, company_tpa: e.target.value })}
                        placeholder="RW-10%"
                        className="h-9 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={editingActivity.remarks}
                        onChange={(e) => setEditingActivity({ ...editingActivity, remarks: e.target.value })}
                        placeholder="Remarks"
                        rows={2}
                        className="text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          onClick={handleSave}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={handleCancel}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <Button
        onClick={handleAdd}
        variant="outline"
        className="w-full"
        disabled={editingIndex !== null}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Activity
      </Button>
    </div>
  );
}