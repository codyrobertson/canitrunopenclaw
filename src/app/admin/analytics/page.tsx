import { BarChart3, TrendingUp, Eye, MousePointer, ExternalLink } from "lucide-react";
import { getViewCount, getTopPages, getTopReferrers, getViewsByDay, getAffiliateClickStats } from "@/lib/queries";

export default async function AnalyticsPage() {
  const todayViews = await getViewCount(1);
  const weekViews = await getViewCount(7);
  const monthViews = await getViewCount(30);
  const topPages = await getTopPages();
  const topReferrers = await getTopReferrers();
  const viewsByDay = await getViewsByDay();
  const affiliateClicks = await getAffiliateClickStats();

  const maxDayViews = Math.max(...viewsByDay.map((d) => d.views), 1);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy flex items-center gap-2">
          <BarChart3 size={24} className="text-ocean-600" />
          Analytics
        </h1>
        <p className="mt-1 text-sm text-navy-light">
          Privacy-friendly page view tracking. No cookies, no personal data.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-ocean-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-navy-light mb-2">
            <Eye size={16} className="text-ocean-600" />
            Today
          </div>
          <div className="text-3xl font-bold text-navy">
            {todayViews.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-ocean-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-navy-light mb-2">
            <TrendingUp size={16} className="text-ocean-600" />
            Last 7 Days
          </div>
          <div className="text-3xl font-bold text-navy">
            {weekViews.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-ocean-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-navy-light mb-2">
            <BarChart3 size={16} className="text-ocean-600" />
            Last 30 Days
          </div>
          <div className="text-3xl font-bold text-navy">
            {monthViews.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Views by day chart */}
      <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-6 mb-8">
        <h2 className="font-heading text-lg font-semibold text-navy mb-4">
          Views by Day (Last 30 Days)
        </h2>
        {viewsByDay.length === 0 ? (
          <p className="text-sm text-navy-light text-center py-8">
            No page view data yet. Views will appear as visitors browse the
            site.
          </p>
        ) : (
          <div className="flex items-end gap-[2px] sm:gap-1 h-40 sm:h-48">
            {viewsByDay.map((day) => {
              const heightPercent = (day.views / maxDayViews) * 100;
              return (
                <div
                  key={day.day}
                  className="flex-1 min-w-0 group relative"
                  title={`${day.day}: ${day.views} views`}
                >
                  <div
                    className="bg-ocean-500 hover:bg-ocean-600 rounded-t transition-colors w-full"
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                    <div className="bg-navy text-white text-[10px] rounded px-2 py-1 whitespace-nowrap">
                      {day.day}: {day.views}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {viewsByDay.length > 0 && (
          <div className="flex justify-between mt-2 text-[10px] text-navy-light">
            <span>{viewsByDay[0]?.day}</span>
            <span>{viewsByDay[viewsByDay.length - 1]?.day}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top pages */}
        <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold text-navy mb-4 flex items-center gap-2">
            <Eye size={18} className="text-ocean-600" />
            Top Pages
          </h2>
          {topPages.length === 0 ? (
            <p className="text-sm text-navy-light text-center py-4">
              No data yet.
            </p>
          ) : (
            <div className="space-y-2">
              {topPages.map((page, i) => {
                const maxPageViews = topPages[0]?.views ?? 1;
                const widthPercent = (page.views / maxPageViews) * 100;
                return (
                  <div key={page.path} className="flex items-center gap-3">
                    <span className="text-xs text-navy-light w-5 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm text-navy truncate">
                          {page.path}
                        </span>
                        <span className="text-xs font-medium text-navy-light shrink-0">
                          {page.views}
                        </span>
                      </div>
                      <div className="h-1.5 bg-ocean-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-ocean-500 rounded-full"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top referrers */}
        <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold text-navy mb-4 flex items-center gap-2">
            <ExternalLink size={18} className="text-ocean-600" />
            Top Referrers
          </h2>
          {topReferrers.length === 0 ? (
            <p className="text-sm text-navy-light text-center py-4">
              No referrer data yet.
            </p>
          ) : (
            <div className="space-y-2">
              {topReferrers.map((ref, i) => {
                let displayUrl = ref.referrer;
                try {
                  const parsed = new URL(ref.referrer);
                  displayUrl = parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
                } catch {
                  // Keep original string
                }
                const maxRefViews = topReferrers[0]?.views ?? 1;
                const widthPercent = (ref.views / maxRefViews) * 100;
                return (
                  <div key={`${ref.referrer}-${i}`} className="flex items-center gap-3">
                    <span className="text-xs text-navy-light w-5 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm text-navy truncate">
                          {displayUrl}
                        </span>
                        <span className="text-xs font-medium text-navy-light shrink-0">
                          {ref.views}
                        </span>
                      </div>
                      <div className="h-1.5 bg-ocean-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-ocean-400 rounded-full"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Affiliate click stats */}
      <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-6">
        <h2 className="font-heading text-lg font-semibold text-navy mb-4 flex items-center gap-2">
          <MousePointer size={18} className="text-ocean-600" />
          Affiliate Clicks (Last 30 Days)
        </h2>
        {affiliateClicks.length === 0 ? (
          <p className="text-sm text-navy-light text-center py-4">
            No affiliate clicks recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-ocean-100">
                  <th className="text-left px-4 py-2 font-medium text-navy-light">
                    Device
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-navy-light">
                    Network
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-navy-light">
                    Clicks
                  </th>
                </tr>
              </thead>
              <tbody>
                {affiliateClicks.map((click, i) => (
                  <tr
                    key={`${click.device_name}-${click.network}-${i}`}
                    className="border-b border-ocean-50"
                  >
                    <td className="px-4 py-2 text-navy">{click.device_name}</td>
                    <td className="px-4 py-2 text-navy-light">
                      {click.label ?? click.network}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-navy">
                      {click.clicks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
