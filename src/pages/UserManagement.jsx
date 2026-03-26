import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Search, Shield, Edit, Mail, UserX, FolderGit2, Plus, Trash2, UserCog, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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

const roleColors = {
  admin: "bg-red-100 text-red-800 border-red-200",
  inspection_engineer: "bg-blue-100 text-blue-800 border-blue-200",
  qc_manager: "bg-green-100 text-green-800 border-green-200",
  inspector: "bg-purple-100 text-purple-800 border-purple-200",
  inspection_agency: "bg-amber-100 text-amber-800 border-amber-200",
};

const roleLabels = {
  admin: "Admin",
  inspection_engineer: "Inspection Engineer",
  qc_manager: "QC Manager",
  inspector: "Inspector",
  inspection_agency: "Inspection Agency",
};

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [deactivatingUser, setDeactivatingUser] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editFormData, setEditFormData] = useState({
    inspection_role: "",
    company_affiliation: "",
    phone: "",
    department: "",
    project_ids: [],
  });

  const [projectFormData, setProjectFormData] = useState({
    name: "",
    code: "",
    description: "",
    status: "active",
  });

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("-created_at"),
    initialData: [],
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ["tpiagencies"],
    queryFn: () => base44.entities.TPIAgency.list(),
    initialData: [],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
    initialData: [],
  });

  const { data: inspectors = [] } = useQuery({
    queryKey: ["inspectors"],
    queryFn: () => base44.entities.Inspector.list(),
    initialData: [],
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(null);
      toast.success("User role updated successfully");
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.User.update(id, {
      inspection_role: null,
      user_status: "deactivated",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeactivatingUser(null);
      toast.success("User deactivated successfully");
    },
  });

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditFormData({
      inspection_role: user.inspection_role || "",
      company_affiliation: user.company_affiliation || "",
      phone: user.phone || "",
      department: user.department || "",
      project_ids: user.project_ids || [],
    });
  };

  const handleSave = () => {
    updateUserMutation.mutate({
      id: editingUser.id,
      data: editFormData,
    });
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.inspection_role?.toLowerCase().includes(query) ||
      user.company_affiliation?.toLowerCase().includes(query)
    );
  });

  const roleStats = {
    total: users.length,
    admin: users.filter((u) => u.inspection_role === "admin" || u.role === "admin").length,
    inspection_engineer: users.filter((u) => u.inspection_role === "inspection_engineer").length,
    qc_manager: users.filter((u) => u.inspection_role === "qc_manager").length,
    inspector: users.filter((u) => u.inspection_role === "inspector").length,
    inspection_agency: users.filter((u) => u.inspection_role === "inspection_agency").length,
    unassigned: users.filter((u) => !u.inspection_role && u.role !== "admin").length,
  };

  const createProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsAddingProject(false);
      toast.success("Project created successfully");
    },
    onError: () => {
      toast.error("Failed to create project");
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditingProject(null);
      toast.success("Project updated successfully");
    },
    onError: () => {
      toast.error("Failed to update project");
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeletingProject(null);
      toast.success("Project deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete project");
    }
  });

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">
          Assign roles and permissions to users in the system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 elevation-1">
          <p className="text-sm text-gray-500 mb-1">Total Users</p>
          <p className="text-2xl font-bold text-gray-900">{roleStats.total}</p>
        </Card>
        <Card className="p-4 elevation-1">
          <p className="text-sm text-gray-500 mb-1">Admins</p>
          <p className="text-2xl font-bold text-red-600">{roleStats.admin}</p>
        </Card>
        <Card className="p-4 elevation-1">
          <p className="text-sm text-gray-500 mb-1">Engineers</p>
          <p className="text-2xl font-bold text-blue-600">{roleStats.inspection_engineer}</p>
        </Card>
        <Card className="p-4 elevation-1">
          <p className="text-sm text-gray-500 mb-1">QC Managers</p>
          <p className="text-2xl font-bold text-green-600">{roleStats.qc_manager}</p>
        </Card>
        <Card className="p-4 elevation-1">
          <p className="text-sm text-gray-500 mb-1">Inspectors</p>
          <p className="text-2xl font-bold text-purple-600">{roleStats.inspector}</p>
        </Card>
        <Card className="p-4 elevation-1">
          <p className="text-sm text-gray-500 mb-1">Agencies</p>
          <p className="text-2xl font-bold text-amber-600">{roleStats.inspection_agency}</p>
        </Card>
      </div>

      {/* Tabs for Users and Projects */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="inspectors">
            <UserCog className="w-4 h-4 mr-2" />
            Inspectors
          </TabsTrigger>
          <TabsTrigger value="projects">
            <FolderGit2 className="w-4 h-4 mr-2" />
            Projects
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6 space-y-6">
          {/* Unassigned Users Alert */}
          {roleStats.unassigned > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <p className="text-sm font-medium text-amber-900">
                  <strong>{roleStats.unassigned}</strong> user{roleStats.unassigned > 1 ? 's' : ''} without assigned roles
                </p>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="bg-white rounded-2xl p-6 elevation-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by name, email, role, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base border-2 focus:border-indigo-600 rounded-xl"
              />
            </div>
          </div>

          {/* Users Table */}
          <Card className="elevation-2">
            <div className="p-6 border-b flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">All Users</h2>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchQuery ? "No users found matching your search" : "No users yet"}
                </p>
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filteredUsers.map((user, idx) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 truncate">
                            {user.full_name}
                          </h3>
                          {user.inspection_role || user.role === "admin" ? (
                            <Badge className={`${roleColors[user.inspection_role || user.role]} border font-medium`}>
                              {roleLabels[user.inspection_role || user.role] || user.inspection_role || user.role}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 border-gray-300">
                              No Role Assigned
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                          <Mail className="w-4 h-4" />
                          <span>{user.email}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          {user.company_affiliation && (
                            <div>
                              <span className="text-gray-500">Company:</span>{" "}
                              <span className="text-gray-900 font-medium">{user.company_affiliation}</span>
                            </div>
                          )}
                          {user.phone && (
                            <div>
                              <span className="text-gray-500">Phone:</span>{" "}
                              <span className="text-gray-900 font-medium">{user.phone}</span>
                            </div>
                          )}
                          {user.department && (
                            <div>
                              <span className="text-gray-500">Department:</span>{" "}
                              <span className="text-gray-900 font-medium">{user.department}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          onClick={() => handleEdit(user)}
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Role
                        </Button>
                        <Button
                          onClick={() => setDeactivatingUser(user)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Deactivate
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-6 space-y-6">
          {/* Add Project Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => setIsAddingProject(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </div>

          {/* Projects Table */}
          <Card className="elevation-2">
            <div className="p-6 border-b flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <FolderGit2 className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">All Projects</h2>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-12">
                <FolderGit2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No projects yet</p>
                <Button
                  onClick={() => setIsAddingProject(true)}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Project
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {projects.map((project, idx) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 truncate">
                            {project.name}
                          </h3>
                          <Badge className={`border font-medium ${project.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                            project.status === 'completed' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              'bg-gray-100 text-gray-600 border-gray-300'
                            }`}>
                            {project.status === 'active' ? 'Active' :
                              project.status === 'completed' ? 'Completed' : 'Archived'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded">{project.code}</span>
                        </div>
                        {project.description && (
                          <p className="text-sm text-gray-700 mb-2">{project.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          onClick={() => setEditingProject(project)}
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => setDeletingProject(project)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Inspectors Tab */}
        <TabsContent value="inspectors" className="mt-6 space-y-6">
          <Card className="elevation-2">
            <div className="p-6 border-b flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <UserCog className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Inspector Management</h2>
            </div>

            {inspectors.length === 0 ? (
              <div className="text-center py-12">
                <UserCog className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No inspectors found</p>
                <p className="text-sm text-gray-500">Inspectors will appear here when users with Inspector role are created</p>
              </div>
            ) : (
              <div className="divide-y">
                {inspectors.map((inspector, idx) => (
                  <motion.div
                    key={inspector.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {inspector.full_name}
                          </h3>
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200 border font-medium">
                            Inspector
                          </Badge>
                          {inspector.tpi_agency_id ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 border">
                              ✓ Linked
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 border">
                              ⚠ Not Linked
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          <Mail className="w-4 h-4 inline mr-1" />
                          {inspector.email}
                        </div>
                        {inspector.company && (
                          <p className="text-sm text-gray-700 mb-2">
                            <Building2 className="w-4 h-4 inline mr-1" />
                            {inspector.company}
                          </p>
                        )}
                      </div>
                      <div className="min-w-[250px]">
                        <Label className="text-sm font-medium mb-2 block">TPI Agency</Label>
                        <Select
                          value={inspector.tpi_agency_id || "none"}
                          onValueChange={async (value) => {
                            try {
                              await base44.entities.Inspector.update(inspector.id, {
                                tpi_agency_id: value === "none" ? null : value
                              });
                              queryClient.invalidateQueries({ queryKey: ["inspectors"] });
                              toast.success(`Inspector linked to agency`);
                            } catch (error) {
                              console.error("Error updating inspector:", error);
                              toast.error("Failed to update inspector");
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select TPI Agency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {agencies.map((agency) => (
                              <SelectItem key={agency.id} value={agency.id}>
                                {agency.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!inspector.tpi_agency_id && (
                          <p className="text-xs text-amber-600 mt-1">
                            ⚠ Inspector not linked to any agency
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User Access & Role</DialogTitle>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-6 py-4">
              {/* User Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-1">{editingUser.full_name}</h4>
                <p className="text-sm text-gray-600">{editingUser.email}</p>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="inspection_role" className="text-base font-semibold">
                  Inspection Role *
                </Label>
                <Select
                  value={editFormData.inspection_role}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, inspection_role: value })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span>Admin - Full Access</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="inspection_engineer">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span>Inspection Engineer - Own Notifications</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="qc_manager">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>QC Manager - Project Oversight</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="inspector">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <span>Inspector - Profile Management</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="inspection_agency">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span>Inspection Agency - Inspector Management</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  This determines what the user can access in the system
                </p>
              </div>

              {/* Company Affiliation */}
              <div className="space-y-2">
                <Label htmlFor="company_affiliation" className="text-base font-semibold">
                  Company Affiliation
                </Label>
                <Select
                  value={editFormData.company_affiliation}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, company_affiliation: value })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select Company/Agency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {agencies.map((agency) => (
                      <SelectItem key={agency.id} value={agency.name}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  For inspectors and agencies - links them to a TPI agency
                </p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, phone: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                  className="h-11"
                />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={editFormData.department}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, department: e.target.value })
                  }
                  placeholder="e.g., Quality Control, Engineering"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Assigned Projects</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                  {projects.map((project) => (
                    <label key={project.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={(editFormData.project_ids || []).includes(project.id)}
                        onChange={(e) => {
                          const currentIds = editFormData.project_ids || [];
                          let newIds;
                          if (e.target.checked) {
                            newIds = [...currentIds, project.id];
                          } else {
                            newIds = currentIds.filter(id => id !== project.id);
                          }
                          setEditFormData({ ...editFormData, project_ids: newIds });
                        }}
                      />
                      <span className="text-sm text-gray-700">{project.name}</span>
                    </label>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No projects available</p>
                  )}
                </div>
              </div>

              {/* Role Descriptions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-semibold text-blue-900 mb-2">Role Permissions:</h5>
                <div className="space-y-2 text-sm text-blue-800">
                  <p><strong>Admin:</strong> Full access to everything</p>
                  <p><strong>Inspection Engineer:</strong> Upload & manage own notifications</p>
                  <p><strong>QC Manager:</strong> View & edit all notifications (oversight)</p>
                  <p><strong>Inspector:</strong> Manage profile, upload CV & certificates</p>
                  <p><strong>Inspection Agency:</strong> Manage inspector credentials</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setDeactivatingUser(editingUser)}
                  disabled={updateUserMutation.isPending}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Deactivate User
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setEditingUser(null)}
                    disabled={updateUserMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateUserMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate User Dialog */}
      <AlertDialog open={!!deactivatingUser} onOpenChange={() => setDeactivatingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{deactivatingUser?.full_name}</strong>?
              This will remove their inspection role and access to the system.
              <br /><br />
              <strong>Note:</strong> Base44 does not allow permanent user deletion. The user account will remain but will be marked as deactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deactivateUserMutation.mutate({ id: deactivatingUser.id });
                setEditingUser(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Deactivate User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Project Dialog */}
      <Dialog open={isAddingProject || !!editingProject} onOpenChange={() => {
        setIsAddingProject(false);
        setEditingProject(null);
        setProjectFormData({ name: "", code: "", description: "", status: "active" });
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Add New Project"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="project_name">Project Name *</Label>
              <Input
                id="project_name"
                value={editingProject ? editingProject.name : projectFormData.name}
                onChange={(e) => {
                  if (editingProject) {
                    setEditingProject({ ...editingProject, name: e.target.value });
                  } else {
                    setProjectFormData({ ...projectFormData, name: e.target.value });
                  }
                }}
                placeholder="e.g., Tank Storage Facility Construction"
                className="h-11"
              />
            </div>

            {/* Project Code */}
            <div className="space-y-2">
              <Label htmlFor="project_code">Project Code *</Label>
              <Input
                id="project_code"
                value={editingProject ? editingProject.code : projectFormData.code}
                onChange={(e) => {
                  if (editingProject) {
                    setEditingProject({ ...editingProject, code: e.target.value });
                  } else {
                    setProjectFormData({ ...projectFormData, code: e.target.value });
                  }
                }}
                placeholder="e.g., PRJ-2025-001"
                className="h-11 font-mono"
              />
              <p className="text-xs text-gray-500">Unique identifier for this project</p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="project_description">Description</Label>
              <Textarea
                id="project_description"
                value={editingProject ? (editingProject.description || "") : projectFormData.description}
                onChange={(e) => {
                  if (editingProject) {
                    setEditingProject({ ...editingProject, description: e.target.value });
                  } else {
                    setProjectFormData({ ...projectFormData, description: e.target.value });
                  }
                }}
                placeholder="Brief description of the project..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="project_status">Status *</Label>
              <Select
                value={editingProject ? editingProject.status : projectFormData.status}
                onValueChange={(value) => {
                  if (editingProject) {
                    setEditingProject({ ...editingProject, status: value });
                  } else {
                    setProjectFormData({ ...projectFormData, status: value });
                  }
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>Active</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>Completed</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="archived">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-500" />
                      <span>Archived</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingProject(false);
                setEditingProject(null);
                setProjectFormData({ name: "", code: "", description: "", status: "active" });
              }}
              disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingProject) {
                  updateProjectMutation.mutate({
                    id: editingProject.id,
                    data: {
                      name: editingProject.name,
                      code: editingProject.code,
                      description: editingProject.description,
                      status: editingProject.status,
                    }
                  });
                } else {
                  createProjectMutation.mutate(projectFormData);
                }
              }}
              disabled={
                createProjectMutation.isPending ||
                updateProjectMutation.isPending ||
                !(editingProject ? editingProject.name && editingProject.code : projectFormData.name && projectFormData.code)
              }
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {(createProjectMutation.isPending || updateProjectMutation.isPending)
                ? "Saving..."
                : editingProject ? "Update Project" : "Create Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <AlertDialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingProject?.name}</strong>?
              This action cannot be undone and will remove all project associations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProjectMutation.mutate(deletingProject.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}