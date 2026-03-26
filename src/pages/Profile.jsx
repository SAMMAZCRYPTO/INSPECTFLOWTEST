import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserCircle, Upload, FileText, Award, Save, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Fetch inspector profile if user is an inspector
  const { data: inspectorProfile } = useQuery({
    queryKey: ["inspectorProfile", user?.email],
    queryFn: async () => {
      const inspectors = await base44.entities.Inspector.list();
      return inspectors.find(i => i.email === user?.email);
    },
    enabled: !!user && user.inspection_role === "inspector",
    initialData: null,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      if (inspectorProfile) {
        return await base44.entities.Inspector.update(inspectorProfile.id, data);
      } else {
        return await base44.entities.Inspector.create({
          ...data,
          email: user.email,
          full_name: user.full_name,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspectorProfile"] });
      toast.success("Profile updated successfully");
    },
  });

  const handleFileUpload = async (file, field) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await updateProfileMutation.mutateAsync({ [field]: file_url });
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (user.inspection_role !== "inspector") {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert>
          <AlertDescription>
            Profile management is only available for inspectors.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">
          Manage your inspector profile, upload CV and certificates
        </p>
      </div>

      {/* User Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-8 elevation-2"
      >
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
            <UserCircle className="w-12 h-12 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{user.full_name}</h2>
            <p className="text-gray-600 mb-2">{user.email}</p>
            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
              Inspector
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* CV Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-8 elevation-2"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">CV / Resume</h3>
            <p className="text-sm text-gray-600">Upload your curriculum vitae</p>
          </div>
        </div>

        {inspectorProfile?.cv_url ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">CV uploaded</span>
              </div>
              <a
                href={inspectorProfile.cv_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-700 hover:text-green-800 underline"
              >
                View CV
              </a>
            </div>
          </div>
        ) : (
          <Alert className="mb-4">
            <AlertDescription>No CV uploaded yet</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Input
            id="cv_upload"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, "cv_url");
            }}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById("cv_upload").click()}
            disabled={uploading}
            className="w-full h-12 border-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                {inspectorProfile?.cv_url ? "Replace CV" : "Upload CV"}
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Certificates Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-8 elevation-2"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Qualifications / Certificates</h3>
            <p className="text-sm text-gray-600">Upload your certifications and qualifications</p>
          </div>
        </div>

        {inspectorProfile?.qualification_url ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Certificate uploaded</span>
              </div>
              <a
                href={inspectorProfile.qualification_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-700 hover:text-green-800 underline"
              >
                View Certificate
              </a>
            </div>
          </div>
        ) : (
          <Alert className="mb-4">
            <AlertDescription>No certificates uploaded yet</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Input
            id="qualification_upload"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, "qualification_url");
            }}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById("qualification_upload").click()}
            disabled={uploading}
            className="w-full h-12 border-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                {inspectorProfile?.qualification_url ? "Replace Certificate" : "Upload Certificate"}
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Additional Information */}
      {inspectorProfile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-8 elevation-2"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">Inspector Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {inspectorProfile.company && (
              <div>
                <Label className="text-sm text-gray-500">Company</Label>
                <p className="text-base font-medium text-gray-900">{inspectorProfile.company}</p>
              </div>
            )}
            {inspectorProfile.specialization && (
              <div>
                <Label className="text-sm text-gray-500">Specialization</Label>
                <p className="text-base font-medium text-gray-900">{inspectorProfile.specialization}</p>
              </div>
            )}
            {inspectorProfile.certification_number && (
              <div>
                <Label className="text-sm text-gray-500">Certification Number</Label>
                <p className="text-base font-medium text-gray-900">{inspectorProfile.certification_number}</p>
              </div>
            )}
            {inspectorProfile.years_of_experience && (
              <div>
                <Label className="text-sm text-gray-500">Years of Experience</Label>
                <p className="text-base font-medium text-gray-900">{inspectorProfile.years_of_experience} years</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}