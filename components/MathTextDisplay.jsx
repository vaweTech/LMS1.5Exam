"use client";

import { MATH_TEXT_CLASS } from "@/components/MathQuestionField";

/** Renders stored question/option text with Unicode math symbols preserved. */
export default function MathTextDisplay({ children, className = "", inline = false }) {
  if (children == null || children === "") return null;
  const Tag = inline ? "span" : "div";
  return (
    <Tag className={`${MATH_TEXT_CLASS} text-gray-800 ${className}`.trim()}>{children}</Tag>
  );
}
