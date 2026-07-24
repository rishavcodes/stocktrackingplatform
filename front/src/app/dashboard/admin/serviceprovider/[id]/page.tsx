"use client";
import { SuperUserApprovalDetailsPage } from "@/components";
import { useState, useEffect } from "react";
import { use } from "react";

export default function ServiceproviderapprovalDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  return (
    <div>
      <SuperUserApprovalDetailsPage id={id} />
    </div>
  );
}
