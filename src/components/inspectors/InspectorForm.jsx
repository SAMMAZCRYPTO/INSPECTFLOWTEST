import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Upload, FileText, Loader2, CheckCircle, Sparkles, UserPlus, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function InspectorForm({ inspector, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    full_name: inspector?.full_name || "",
    email: inspector?.email || "",
    phone: inspector?.phone || "",
    specialization: inspector?.specialization || "",
    certification_number: inspector?.certification_number || "",
    years_of_experience: inspector?.years_of_experience || "",
    company: inspector?.company || "",
    address: inspector?.address || "",
    cv_url: inspector?.cv_url || "",
    qualification_url: inspector?.qualification_url || "",
    status: inspector?.status || "active",
    notes: inspector?.notes || "",
    is_invited: inspector?.is_invited || false,
  });

  const [createUserAccount, setCreateUserAccount] = useState(!inspector);
  const [isInviting, setIsInviting] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [qualificationFile, setQualificationFile] = useState(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [uploadingQualification, setUploadingQualification] = useState(false);
  const [extractingData, setExtractingData] = useState(false);

  // Fetch TPI Agencies
  const { data: agencies = [] } = useQuery({
    queryKey: ["tpiagencies"],
    queryFn: () => base44.entities.TPIAgency.list(),
    initialData: [],
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const cvExtractionSchema = {
    type: "object",
    properties: {
      full_name: {
        type: "string",
        description: "Full name of the person"
      },
      email: {
        type: "string",
        description: "Email address"
      },
      phone: {
        type: "string",
        description: "Phone number or mobile number"
      },
      specialization: {
        type: "string",
        description: "Area of specialization, expertise, or job title"
      },
      certification_number: {
        type: "string",
        description: "Any certification number, license number, or professional registration number"
      },
      years_of_experience: {
        type: "number",
        description: "Total years of professional experience"
      },
      company: {
        type: "string",
        description: "Current company name or last company worked at"
      },
      address: {
        type: "string",
        description: "Full address or location"
      }
    }
  };

  const handleCvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCvFile(file);
    setUploadingCv(true);
    setExtractingData(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: file,
      });
      
      setFormData((prev) => ({ ...prev, cv_url: file_url }));

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: cvExtractionSchema,
      });

      if (result.status === "success" && result.output) {
        const extractedData = result.output;
        setFormData((prev) => ({
          ...prev,
          full_name: extractedData.full_name || prev.full_name,
          email: extractedData.email || prev.email,
          phone: extractedData.phone || prev.phone,
          specialization: extractedData.specialization || prev.specialization,
          certification_number: extractedData.certification_number || prev.certification_number,
          years_of_experience: extractedData.years_of_experience || prev.years_of_experience,
          company: extractedData.company || prev.company,
          address: extractedData.address || prev.address,
        }));
        toast.success("CV data extracted successfully!");
      }
    } catch (error) {
      console.error("Error uploading/extracting CV:", error);
      toast.error("Failed to process CV. Please enter details manually.");
    } finally {
      setUploadingCv(false);
      setExtractingData(false);
    }
  };

  const handleQualificationUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setQualificationFile(file);
    setUploadingQualification(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: file,
      });
      setFormData((prev) => ({ ...prev, qualification_url: file_url }));
      toast.success("Qualification uploaded successfully!");
    } catch (error) {
      console.error("Error uploading qualification:", error);
      toast.error("Failed to upload qualification.");
    } finally {
      setUploadingQualification(false);
    }
  };

  const handleInvite = async () => {
    if (!formData.email) {
      toast.error("Please enter an email address first");
      return;
    }

    setIsInviting(true);
    try {
      // Send invitation email
      await base44.integrations.Core.SendEmail({
        to: formData.email,
        subject: "Invitation to InspectFlow",
        body: `Hello ${formData.full_name},\n\nYou have been invited to join InspectFlow as an inspector.\n\nPlease register/login at: ${window.location.origin}\n\nBest regards,\nInspectFlow Team`
      });

      // Update inspector record if it exists (inspector object passed prop)
      if (inspector?.id) {
        await base44.entities.Inspector.update(inspector.id, { is_invited: true });
        setFormData(prev => ({ ...prev, is_invited: true }));
      } else {
        // If creating new, just update local state so it saves with true
        setFormData(prev => ({ ...prev, is_invited: true }));
      }

      toast.success(`Invitation sent to ${formData.email}`);
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to send invitation email");
    } finally {
      setIsInviting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validate required fields
    if (!formData.full_name || !formData.email) {
      toast.error("Please fill in all required fields (Name and Email)");
      return;
    }

    console.log("Submitting inspector form with data:", formData);
    
    // Prepare data with proper types
    const submitData = {
      ...formData,
      years_of_experience: formData.years_of_experience ? Number(formData.years_of_experience) : undefined,
    };
    
    try {
      // Call onSave which will handle the mutation - await it
      await onSave(submitData);
      console.log("Inspector saved successfully");
      
      // Then, create/update user account if checkbox is selected
      if (!inspector && createUserAccount && formData.email) {
        try {
          const users = await base44.entities.User.list();
          const userExists = users.find(u => u.email === formData.email);
          
          if (!userExists) {
            await base44.entities.User.create({
              email: formData.email,
              full_name: formData.full_name,
              inspection_role: "inspector",
              company_affiliation: formData.company,
              phone: formData.phone,
            });
            toast.success("User account created with inspector access.");
          } else {
            await base44.entities.User.update(userExists.id, {
              inspection_role: "inspector",
              company_affiliation: formData.company,
              phone: formData.phone,
            });
            toast.success("User account updated with inspector access.");
          }
        } catch (userError) {
          console.error("Error with user account:", userError);
          toast.info("Inspector profile saved. User account may need manual update.");
        }
      }
    } catch (error) {
      console.error("Error saving inspector:", error);
      toast.error("Failed to save inspector: " + (error.message || "Unknown error"));
      // Prevent form from continuing if there was an error
      throw error;
    }
  };

  const activeAgencies = agencies.filter(a => a.status === "active");

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Create User Account Option (for new inspectors only) */}
      {!inspector && (
        <Alert className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Checkbox
              id="create_user_account"
              checked={createUserAccount}
              onCheckedChange={setCreateUserAccount}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="create_user_account" className="text-sm font-semibold text-blue-900 cursor-pointer flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Create User Account with Inspector Access
              </label>
              <p className="text-xs text-blue-800 mt-1">
                This will create a login account for this inspector, allowing them to access their dashboard and view inspections assigned to them.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* CV Upload */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border-2 border-indigo-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <Label className="text-lg font-bold text-gray-900">
              Upload CV/Resume
            </Label>
            <p className="text-sm text-gray-600">
              AI will automatically extract and fill in the details
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Input
            id="cv_upload"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleCvUpload}
            className="hidden"
            disabled={uploadingCv}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById("cv_upload").click()}
            disabled={uploadingCv || extractingData}
            className="w-full h-12 border-2 border-indigo-300 hover:bg-indigo-50"
          >
            {extractingData ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Extracting information from CV...
              </>
            ) : uploadingCv ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading CV...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                {formData.cv_url ? "Replace CV & Re-extract Data" : "Choose CV File"}
              </>
            )}
          </Button>
          
          {formData.cv_url && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <div className="flex items-center justify-between">
                  <span className="font-medium">CV uploaded successfully!</span>
                  <a
                    href={formData.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-700 hover:text-green-800 underline text-sm"
                  >
                    View CV
                  </a>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="full_name" className="text-base font-semibold">
            Full Name *
          </Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => handleChange("full_name", e.target.value)}
            placeholder="John Smith"
            required
            className="h-11"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-semibold">
            Email Address *
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="john.smith@example.com"
            required
            className="h-11"
            autoComplete="off"
            name="inspector-email"
          />
          {/* Invite Button */}
          {formData.email && (
            <div className="mt-2">
              <Button
                type="button"
                variant={formData.is_invited ? "outline" : "default"}
                size="sm"
                onClick={handleInvite}
                disabled={isInviting}
                className={formData.is_invited ? "text-green-600 border-green-200 bg-green-50" : "bg-blue-600 hover:bg-blue-700"}
              >
                {isInviting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Sending Invite...
                  </>
                ) : formData.is_invited ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-2" />
                    Invitation Sent
                  </>
                ) : (
                  <>
                    <Mail className="w-3 h-3 mr-2" />
                    Invite to Register
                  </>
                )}
              </Button>
              {formData.is_invited && (
                 <Button
                   type="button"
                   variant="ghost"
                   size="sm"
                   onClick={handleInvite}
                   disabled={isInviting}
                   className="ml-2 text-gray-500 text-xs"
                 >
                   Resend
                 </Button>
              )}
            </div>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-base font-semibold">
            Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="h-11"
          />
        </div>

        {/* Specialization */}
        <div className="space-y-2">
          <Label htmlFor="specialization" className="text-base font-semibold">
            Specialization
          </Label>
          <Input
            id="specialization"
            value={formData.specialization}
            onChange={(e) => handleChange("specialization", e.target.value)}
            placeholder="e.g., Mechanical, Electrical, Civil"
            className="h-11"
          />
        </div>

        {/* Certification Number */}
        <div className="space-y-2">
          <Label htmlFor="certification_number" className="text-base font-semibold">
            Certification/License Number
          </Label>
          <Input
            id="certification_number"
            value={formData.certification_number}
            onChange={(e) => handleChange("certification_number", e.target.value)}
            placeholder="Certification or license number"
            className="h-11"
          />
        </div>

        {/* Years of Experience */}
        <div className="space-y-2">
          <Label htmlFor="years_of_experience" className="text-base font-semibold">
            Years of Experience
          </Label>
          <Input
            id="years_of_experience"
            type="number"
            min="0"
            value={formData.years_of_experience}
            onChange={(e) => handleChange("years_of_experience", e.target.value)}
            placeholder="10"
            className="h-11"
          />
        </div>

        {/* Company/Agency */}
        <div className="space-y-2">
          <Label htmlFor="company" className="text-base font-semibold">
            Company/Agency
          </Label>
          <Select value={formData.company} onValueChange={(value) => handleChange("company", value)}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select Agency" />
            </SelectTrigger>
            <SelectContent>
              {activeAgencies.length === 0 ? (
                <SelectItem value={null} disabled>
                  No agencies available
                </SelectItem>
              ) : (
                activeAgencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.name}>
                    {agency.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Manage agencies from the TPI Agencies page
          </p>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status" className="text-base font-semibold">
            Status
          </Label>
          <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Address */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="address" className="text-base font-semibold">
            Address
          </Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Full address"
            className="h-11"
          />
        </div>

        {/* Qualification Upload */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="qualification_upload" className="text-base font-semibold">
            Qualifications/Certificates
          </Label>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                id="qualification_upload"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleQualificationUpload}
                className="hidden"
                disabled={uploadingQualification}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("qualification_upload").click()}
                disabled={uploadingQualification}
                className="w-full h-11"
              >
                {uploadingQualification ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {formData.qualification_url ? "Replace Certificate" : "Upload Certificate"}
                  </>
                )}
              </Button>
            </div>
            {formData.qualification_url && (
              <a
                href={formData.qualification_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                <span className="flex-1 truncate">Certificate uploaded successfully</span>
                <FileText className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="notes" className="text-base font-semibold">
            Additional Notes
          </Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Any additional information about the inspector..."
            rows={4}
            className="resize-none"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end pt-6 border-t">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          disabled={isSaving}
          className="px-6"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="px-6 bg-indigo-600 hover:bg-indigo-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Inspector"}
        </Button>
      </div>
    </motion.form>
  );
}