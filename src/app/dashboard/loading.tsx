export default function DashboardLoading() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3 border-b border-border/70 pb-4">
        <div className="skeleton size-10 rounded-xl" />
        <div className="space-y-2">
          <div className="skeleton h-3 w-20 rounded-full" />
          <div className="skeleton h-3 w-32 rounded-full" />
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <div className="skeleton h-6 w-40 rounded-full" />
        <div className="skeleton h-52 rounded-3xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-36 rounded-3xl" />
          <div className="skeleton h-36 rounded-3xl" />
        </div>
        <div className="skeleton h-20 rounded-3xl" />
      </div>
    </div>
  );
}
