import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/layout/AppShell";
import TasksView from "./TasksView";

export const metadata: Metadata = { title: "Tasks · NexTask" };

export default function TasksPage() {
  // TasksView reads filters from the URL (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense fallback={<Spinner />}>
      <TasksView />
    </Suspense>
  );
}
