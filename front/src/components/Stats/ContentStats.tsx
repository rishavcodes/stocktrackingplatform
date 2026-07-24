"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { FileText, Video, Mic } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

export default function ContentStats({ data }: { data: any }) {
  const content = [
    { label: "Articles", value: data.articles, icon: <FileText className="text-blue-500" /> },
    { label: "Videos", value: data.videos, icon: <Video className="text-red-500" /> },
    { label: "Podcasts", value: data.podcasts, icon: <Mic className="text-purple-500" /> },
  ];

  return (
    <motion.div
      className="grid md:grid-cols-3 gap-6 mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      {content.map((item, i) => (
        <Card key={i}>
          <CardHeader className="flex items-center gap-2">
            {item.icon}
            {item.label}
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{item.value}</p>
            <Progress value={(item.value / 10) * 100} className="mt-2" />
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
}
