import Logo from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 text-white lg:flex">
        <Logo inverted />
        <div className="max-w-md space-y-4">
          <h2 className="text-4xl font-bold leading-tight">
            Organize your work, one task at a time.
          </h2>
          <p className="text-indigo-100">
            Plan, track and finish your tasks with a simple, focused workspace.
          </p>
        </div>
        <p className="text-sm text-indigo-200">TaskFlow &middot; Task Management System</p>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 sm:px-6 dark:bg-zinc-950">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
