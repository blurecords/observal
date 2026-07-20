"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
