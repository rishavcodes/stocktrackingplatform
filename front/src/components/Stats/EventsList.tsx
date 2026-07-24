"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { motion } from "framer-motion";

export default function EventsList({ data }: { data: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card>
        <CardHeader className="flex items-center gap-2 font-semibold">
          <Calendar />
          Events
        </CardHeader>

        <CardContent className="space-y-6 max-h-80 overflow-y-auto">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Upcoming</h3>
            {data.upcomingevents.map((event: any) => (
              <div
                key={event._id}
                className="flex justify-between items-center py-2 border-b text-gray-700"
              >
                <p>{event.title}</p>
                <p className="text-sm text-gray-500">
                  {new Date(event.schedule).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Past</h3>
            {data.pastevents.map((event: any) => (
              <div
                key={event._id}
                className="flex justify-between items-center py-2 border-b text-gray-700"
              >
                <p>{event.title}</p>
                <p className="text-sm text-gray-500">
                  {new Date(event.schedule).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
