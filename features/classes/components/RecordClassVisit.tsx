"use client";

import { useEffect } from "react";

import { recordClassVisit } from "@/lib/recent-classes";

export default function RecordClassVisit({ classId }: { classId: string }) {
  useEffect(() => {
    recordClassVisit(classId);
  }, [classId]);

  return null;
}
