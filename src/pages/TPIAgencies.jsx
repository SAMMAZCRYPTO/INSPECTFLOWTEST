import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Building2, Edit, Trash2, Mail, Phone, User } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function TPIAgencies() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    manager_name: "",
    manager_email: "",
    manager_phone: "",
    status: "active",
  });

  const queryClient = useQueryClient();

  const { data: agencies, isLoading } = useQuery({
    queryKey: ["tpiagencies"],
    queryFn: () => base44.entities.TPIAgency.list("-created_at"),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TPIAgency.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tpiagencies"] });
      handleCloseForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TPIAgency.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tpiagencies"] });
      handleCloseForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TPIAgency.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tpiagencies"] });
    },
  });

  const handleOpenForm = (agency = null) => {
    if (agency) {
      setEditingAgency(agency);
      setFormData({
        name: agency.name || "",
        email: agency.email || "",
        phone: agency.phone || "",
        address: agency.address || "",
        manager_name: agency.manager_name || "",
        manager_email: agency.manager_email || "",
        manager_phone: agency.manager_phone || "",
        status: agency.status || "active",
      });
    } else {
      setEditingAgency(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        manager_name: "",
        manager_email: "",
        manager_phone: "",
        status: "active",
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAgency(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      manager_name: "",
      manager_email: "",
      manager_phone: "",
      status: "active",
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingAgency) {
      updateMutation.mutate({ id: editingAgency.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this agency?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            TPI Agencies
          </h1>
          <p className="text-gray-600">
            Manage Third Party Inspection agencies (Admin Only)
          </p>
        </div>
        <Button
          onClick={() => handleOpenForm()}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Agency
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading agencies...</p>
        </div>
      ) : agencies.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center elevation-2">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No agencies yet
          </h3>
          <p className="text-gray-600 mb-6">
            Add your first TPI agency to get started
          </p>
          <Button
            onClick={() => handleOpenForm()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Agency
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agencies.map((agency) => (
            <motion.div
              key={agency.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 elevation-2 hover:elevation-3 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {agency.name}
                  </h3>
                  <Badge
                    className={
                      agency.status === "active"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-red-100 text-red-800 border-red-200"
                    }
                  >
                    {agency.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {agency.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-700 truncate">{agency.email}</p>
                  </div>
                )}
                {agency.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{agency.phone}</p>
                  </div>
                )}
                {agency.address && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Address:</span> {agency.address}
                  </p>
                )}
              </div>

              {/* Manager Details Section */}
              {(agency.manager_name || agency.manager_email || agency.manager_phone) && (
                <div className="bg-indigo-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">
                      Manager Details
                    </p>
                  </div>
                  <div className="space-y-2">
                    {agency.manager_name && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Name:</span> {agency.manager_name}
                      </p>
                    )}
                    {agency.manager_email && (
                      <p className="text-sm text-gray-700 truncate">
                        <span className="font-medium">Email:</span> {agency.manager_email}
                      </p>
                    )}
                    {agency.manager_phone && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Phone:</span> {agency.manager_phone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => handleOpenForm(agency)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  size="sm"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={() => handleDelete(agency.id)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgency ? "Edit Agency" : "Add New Agency"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Agency Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Agency Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agency Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., TUVR, TUV SUD, Fulkrum"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="agency@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Full address"
                  />
                </div>
              </div>
            </div>

            {/* Manager Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Manager Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="manager_name">Manager Name</Label>
                  <Input
                    id="manager_name"
                    value={formData.manager_name}
                    onChange={(e) =>
                      setFormData({ ...formData, manager_name: e.target.value })
                    }
                    placeholder="Manager's full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manager_email">Manager Email</Label>
                  <Input
                    id="manager_email"
                    type="email"
                    value={formData.manager_email}
                    onChange={(e) =>
                      setFormData({ ...formData, manager_email: e.target.value })
                    }
                    placeholder="manager@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manager_phone">Manager Phone</Label>
                  <Input
                    id="manager_phone"
                    value={formData.manager_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, manager_phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : "Save Agency"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}