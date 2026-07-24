import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Grid3X3, List, Download, Filter } from "lucide-react";

interface TableHeaderProps {
  filteredData: any[];
  type?: string;
  services: any[];
  selectedPlan: string;
  setSelectedPlan: (plan: string) => void;
  viewMode: "cards" | "list";
  setViewMode: (mode: "cards" | "list") => void;
  dateFilter: { from: string; to: string };
  setDateFilter: (filter: { from: string; to: string }) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  isMobile: boolean;
  clearDateFilters: () => void;
  onExport: () => void;
}

export function TableHeader({
  filteredData,
  type,
  services,
  selectedPlan,
  setSelectedPlan,
  viewMode,
  setViewMode,
  dateFilter,
  setDateFilter,
  showFilters,
  setShowFilters,
  isMobile,
  clearDateFilters,
  onExport
}: TableHeaderProps) {
  
  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilter({ ...dateFilter, from: e.target.value });
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilter({ ...dateFilter, to: e.target.value });
  };

  // View-mode toggle — extracted so the mobile single-row header and the
  // desktop controls block can both render it without duplicating markup.
  const viewToggle = (
    <div className="flex border border-slate-300 dark:border-slate-600 rounded-lg p-0.5 sm:p-1 h-fit">
      <button
        onClick={() => setViewMode("cards")}
        className={`p-1 sm:p-2 rounded-md transition-all ${
          viewMode === "cards"
            ? "bg-blue-500 text-white shadow-sm"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        }`}
        title="Cards View"
        aria-label="Cards view"
      >
        <Grid3X3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
      <button
        onClick={() => setViewMode("list")}
        className={`p-1 sm:p-2 rounded-md transition-all ${
          viewMode === "list"
            ? "bg-blue-500 text-white shadow-sm"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        }`}
        title="List View"
        aria-label="List view"
      >
        <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </div>
  );

  return (
    <CardHeader className="p-3 sm:p-6">
      {/* ── Mobile single-row header ──────────────────────────────────────
          One compact row: count text + Filter, Excel and View-toggle as
          icon-only buttons. The expanded date / plan filters slide in
          below when the user taps Filter. Keeps the whole header under
          ~40px so the table is visible above the fold. */}
      {isMobile ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="bg-blue-100 dark:bg-blue-900 p-1 rounded-md flex-shrink-0">
                <PieChart className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                  {filteredData?.length} {type === "open" ? "Open" : "Closed"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`relative h-8 w-8 inline-flex items-center justify-center rounded-md border transition-colors ${
                  showFilters || dateFilter.from || dateFilter.to || selectedPlan !== "all"
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                }`}
                title="Filters"
                aria-label="Filters"
              >
                <Filter className="w-3.5 h-3.5" />
                {(dateFilter.from || dateFilter.to || selectedPlan !== "all") && !showFilters && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
              <button
                onClick={onExport}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-green-500 hover:bg-green-600 text-white"
                title="Export to Excel"
                aria-label="Export to Excel"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              {viewToggle}
            </div>
          </div>

          {/* Filters drawer — only visible when toggled open on mobile.
              Plan select sits on its own line, then From / To dates share
              a row so the inputs stay readable without a horizontal scroll. */}
          {showFilters && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="w-full text-xs h-8">
                  <SelectValue placeholder="Filter by Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service._id} value={service._id}>
                      {service.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor="from-date-m" className="text-[10px] text-slate-500 dark:text-slate-400">
                    From
                  </Label>
                  <Input
                    id="from-date-m"
                    type="date"
                    value={dateFilter.from}
                    onChange={handleFromDateChange}
                    className="w-full text-xs h-8"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="to-date-m" className="text-[10px] text-slate-500 dark:text-slate-400">
                    To
                  </Label>
                  <Input
                    id="to-date-m"
                    type="date"
                    value={dateFilter.to}
                    onChange={handleToDateChange}
                    className="w-full text-xs h-8"
                  />
                </div>
                <Button
                  onClick={clearDateFilters}
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                >
                  Clear
                </Button>
              </div>
              {(dateFilter.from || dateFilter.to) && (
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Showing trades from {dateFilter.from || "the beginning"} to {dateFilter.to || "now"}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // ── Desktop header — unchanged layout ─────────────────────────────
        <>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  {filteredData?.length} Recommendations
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {type === "open" ? "Active trades" : "Trade history"}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 w-full lg:w-auto">
              <div className="sm:mt-5">{viewToggle}</div>

              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-600 dark:text-slate-400">Plan</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger className="w-full sm:w-[160px] text-sm h-9">
                    <SelectValue placeholder="Filter by Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service._id} value={service._id}>
                        {service.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="from-date" className="text-xs text-slate-600 dark:text-slate-400">
                  From Date
                </Label>
                <Input
                  id="from-date"
                  type="date"
                  value={dateFilter.from}
                  onChange={handleFromDateChange}
                  className="w-full sm:w-[140px] text-sm h-9"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="to-date" className="text-xs text-slate-600 dark:text-slate-400">
                  To Date
                </Label>
                <Input
                  id="to-date"
                  type="date"
                  value={dateFilter.to}
                  onChange={handleToDateChange}
                  className="w-full sm:w-[140px] text-sm h-9"
                />
              </div>

              <Button onClick={clearDateFilters} variant="outline" size="sm" className="h-9 sm:mt-5">
                Clear
              </Button>

              <Button
                onClick={onExport}
                size="sm"
                className="flex bg-green-500 hover:bg-green-600 items-center gap-2 text-white h-9 sm:mt-5"
              >
                <Download className="w-4 h-4" />
                Excel
              </Button>
            </div>
          </div>

          {(dateFilter.from || dateFilter.to) && (
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Showing trades from {dateFilter.from || "the beginning"} to {dateFilter.to || "now"}
            </div>
          )}
        </>
      )}
    </CardHeader>
  );
}