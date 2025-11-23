import React from "react";

export default function Calculadora() {
  return (
    <div className="w-full h-screen">
      <iframe
        src="https://excel.cloud.microsoft/"
        className="w-full h-full border-0"
        title="Excel Online"
      />
    </div>
  );
}