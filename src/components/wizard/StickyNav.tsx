"use client";

import { T } from "@/i18n";

type Props = {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: React.ReactNode;
  backLabel?: React.ReactNode;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  hideNext?: boolean;
};

export function StickyNav({
  onBack,
  onNext,
  nextLabel,
  backLabel,
  nextDisabled,
  backDisabled,
  hideNext,
}: Props) {
  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-slate-200 px-4 py-3 safe-area-pb">
      <div className="max-w-lg mx-auto flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={backDisabled}
          className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 font-bold text-slate-800 bg-white disabled:opacity-40"
        >
          {backLabel || <T>Back</T>}
        </button>
        {!hideNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="flex-1 py-3.5 rounded-2xl bg-[#330066] text-white font-bold disabled:opacity-40"
          >
            {nextLabel || <T>Next</T>}
          </button>
        )}
      </div>
    </div>
  );
}
