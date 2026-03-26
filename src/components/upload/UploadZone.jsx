import React, { useState } from "react";
import { Upload, FileText, Image, CheckCircle, File, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UploadZone({ onFileSelect, dragActive, files }) {
  const fileInputRef = React.useRef(null);

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
    if (['jpg', 'jpeg', 'png'].includes(ext)) return <Image className="w-5 h-5 text-green-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div
      className={`relative border-3 border-dashed rounded-3xl p-12 transition-all duration-300 ${
        dragActive
          ? "border-indigo-600 bg-indigo-50"
          : "border-gray-300 bg-white hover:border-indigo-400 hover:bg-gray-50"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={onFileSelect}
        className="hidden"
        multiple
      />

      <AnimatePresence mode="wait">
        {files && files.length > 0 ? (
          <motion.div
            key="uploaded"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {files.length} File{files.length > 1 ? 's' : ''} Uploaded
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-2 mt-4">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-left"
                >
                  {getFileIcon(file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-indigo-100 rounded-full flex items-center justify-center">
              <Upload className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Drop your notifications here
            </h3>
            <p className="text-gray-600 mb-6">
              or click to browse from your device
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all duration-200 elevation-2 hover:elevation-3 ripple"
            >
              Choose Files
            </button>
            <div className="flex items-center justify-center gap-6 mt-8">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FileText className="w-5 h-5" />
                <span>PDF</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Image className="w-5 h-5" />
                <span>JPG, PNG</span>
              </div>
            </div>
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>📄 Word Files:</strong> Please convert your .docx files to PDF first (File → Save As → PDF in Word), then upload the PDF version.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}