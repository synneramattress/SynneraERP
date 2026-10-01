"use client";
import { T, useLanguage } from "@/i18n";

import { useEffect, useMemo, useState } from "react";
import { Filter, Search, X, Check, ArrowUpDown } from "lucide-react";

export interface FilterSortOption {
  value: string;
  label: string;
}

export interface FilterSortGroup {
  key: string;
  label: string;
  options: FilterSortOption[];
}

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  filterGroups?: FilterSortGroup[];
  values?: Record<string, string>;
  onApply?: (values: Record<string, string>) => void;
  sortOptions?: FilterSortOption[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
}

export default function SearchFilterBar({
  search,
  onSearchChange,
  placeholder,
  filterGroups = [],
  values = {},
  onApply,
  sortOptions = [],
  sortValue = "",
  onSortChange,
}: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(values);
  const [draftSort, setDraftSort] = useState(sortValue);

  useEffect(() => {
    setDraft(values);
    setDraftSort(sortValue);
  }, [values, sortValue]);

  const activeCount = useMemo(
    () =>
      Object.values(values).filter((v) => v && v !== "all" && v !== "ALL").length +
      (sortValue ? 1 : 0),
    [values, sortValue]
  );

  const apply = () => {
    onApply?.(draft);
    onSortChange?.(draftSort);
    setOpen(false);
  };

  const clear = () => {
    const cleared: Record<string, string> = {};
    filterGroups.forEach((g) => {
      cleared[g.key] = g.options[0]?.value ?? "all";
    });
    setDraft(cleared);
    setDraftSort("");
    onApply?.(cleared);
    onSortChange?.("");
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t(placeholder)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/20"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {(filterGroups.length > 0 || sortOptions.length > 0) && (
          <button
            type="button"
            aria-label="Filter and sort"
            onClick={() => setOpen(true)}
            className="relative shrink-0 h-[42px] w-[42px] rounded-xl border border-slate-200 bg-white text-[#330066] flex items-center justify-center shadow-sm hover:bg-slate-50"
          >
            <Filter className="w-4.5 h-4.5" />
            {activeCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-4 h-4 px-1 rounded-full bg-[#330066] text-white text-[9px] leading-4 text-center">
                {activeCount}
              </span>
            )}
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[80]">
          <button className="absolute inset-0 bg-black/30" aria-label="Close filter" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto bg-white rounded-t-2xl shadow-2xl p-4 sm:max-w-lg sm:left-1/2 sm:-translate-x-1/2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900"><T>Filter & Sort</T></h2>
                {activeCount > 0 && <p className="text-xs text-slate-500 mt-0.5">{activeCount} {t(activeCount === 1 ? "option" : "options")} {t("applied")}</p>}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {filterGroups.map((group) => (
              <section key={group.key} className="mb-5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{t(group.label)}</h3>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((option) => {
                    const selected = (draft[group.key] ?? group.options[0]?.value) === option.value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setDraft((d) => ({ ...d, [group.key]: option.value }))}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${selected ? "bg-[#330066] text-white border-[#330066]" : "bg-white text-slate-600 border-slate-200"}`}
                      >
                        {selected && <Check className="inline w-3 h-3 mr-1" />}
                        {t(option.label)}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}

            {sortOptions.length > 0 && (
              <section className="mb-5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" /> Sort By
                </h3>
                <div className="space-y-1">
                  {sortOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => setDraftSort(option.value)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left hover:bg-slate-50"
                    >
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${draftSort === option.value ? "border-[#330066]" : "border-slate-300"}`}>
                        {draftSort === option.value && <span className="w-2 h-2 rounded-full bg-[#330066]" />}
                      </span>
                      {t(option.label)}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={clear} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"><T>Clear All</T></button>
              <button type="button" onClick={apply} className="flex-1 py-2.5 rounded-xl bg-[#330066] text-white text-sm font-semibold"><T>Apply</T></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}