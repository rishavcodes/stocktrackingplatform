"use client";

export default function FundsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Funds</h1>
        <p className="text-muted-foreground mt-1">
          View your fund balance and margin
        </p>
      </div>
      <div className="bg-white dark:bg-black rounded-xl border shadow-sm p-6">
        <p className="text-muted-foreground text-sm">Fund balance and margin details will appear here.</p>
      </div>
    </div>
  );
}
