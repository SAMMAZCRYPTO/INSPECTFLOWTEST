import React from "react";
import { motion } from "framer-motion";

export default function StatsCard({ title, value, icon: Icon, color, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl p-6 elevation-2 hover:elevation-3 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">
            {title}
          </p>
          <h3 className="text-4xl font-bold text-gray-900 mb-1">{value}</h3>
          {trend && (
            <p className="text-sm text-gray-500">{trend}</p>
          )}
        </div>
        <div
          className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center elevation-1`}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </motion.div>
  );
}