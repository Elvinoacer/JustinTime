"use client";

export default function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="ml-4 rounded bg-gray-800 px-4 py-2 text-white hover:bg-gray-900"
    >
      Print / Save PDF
    </button>
  );
}
