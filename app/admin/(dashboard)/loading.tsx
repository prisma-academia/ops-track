import SpinnerEllipsis from "@/components/spinner-ellipsis";

export default function AdminDashboardLoading() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <SpinnerEllipsis />
    </div>
  );
}
