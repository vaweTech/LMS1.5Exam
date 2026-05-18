"use client";

import { useCallback, useRef, useState } from "react";
import { MATH_SYMBOL_GROUPS, insertAtCursor } from "@/lib/mathSymbols";

export const MATH_TEXT_CLASS =
  "font-normal text-[15px] leading-relaxed whitespace-pre-wrap break-words " +
  "[font-family:system-ui,'Segoe_UI',Roboto,Arial,'Noto_Sans','Noto_Sans_Math',sans-serif]";

export default function MathQuestionField({
  value = "",
  onChange,
  placeholder = "Enter question text…",
  label,
  minRows = 3,
  className = "",
  showPreview = true,
  hint,
}) {
  const textareaRef = useRef(null);
  const [expandedGroup, setExpandedGroup] = useState("Greek");

  const applyInsert = useCallback(
    (symbol) => {
      const el = textareaRef.current;
      const result = insertAtCursor(el, symbol);
      if (!result) {
        onChange?.((value || "") + symbol);
        return;
      }
      onChange?.(result.next);
      requestAnimationFrame(() => {
        if (!el) return;
        el.focus();
        el.setSelectionRange(result.caret, result.caret);
      });
    },
    [onChange, value]
  );

  const activeSymbols =
    MATH_SYMBOL_GROUPS.find((g) => g.label === expandedGroup)?.symbols || [];

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? (
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </label>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-slate-50/90 px-2 py-1.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 px-0.5">
            Math and symbols
          </p>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {MATH_SYMBOL_GROUPS.map((g) => (
              <button
                key={g.label}
                type="button"
                onClick={() => setExpandedGroup(g.label)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  expandedGroup === g.label
                    ? "bg-[#00448a] text-white border-[#00448a]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#00448a]/40"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {activeSymbols.map((sym) => (
              <button
                key={sym}
                type="button"
                title={`Insert ${sym}`}
                onClick={() => applyInsert(sym)}
                className="min-w-[2rem] h-8 px-1.5 rounded-md border border-gray-200 bg-white text-base hover:bg-[#00448a]/10 hover:border-[#00448a]/30 transition-colors"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          rows={minRows}
          spellCheck
          lang="en"
          className={`w-full ${MATH_TEXT_CLASS} border-0 rounded-none px-3 py-2 focus:ring-2 focus:ring-[#00448a]/20 focus:outline-none resize-y min-h-[72px]`}
        />
      </div>

      {hint === "" ? null : hint ? (
        <p className="text-[11px] text-gray-500">{hint}</p>
      ) : (
        <p className="text-[11px] text-gray-500">
          Supports squares (x²), roots (√), cubes (x³), Greek letters (α, β), and more. Multi-line
          text is preserved.
        </p>
      )}

      {showPreview && String(value || "").trim() ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-3 py-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Preview
          </p>
          <div className={`${MATH_TEXT_CLASS} text-gray-800`}>{value}</div>
        </div>
      ) : null}
    </div>
  );
}