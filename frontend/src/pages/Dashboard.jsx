import { useEffect, useState } from "react";

export default function Dashboard() {
    const [findings, setFindings] = useState([]);
    const [filter, setFilter] = useState("ALL");

    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetch(`${API_URL}/api/findings`)
            .then(res => res.json())
            .then(data => setFindings(data.findings))
            .catch(error => console.error("Fetch error:", error));
    }, []);

    const filtered = filter === "ALL"
        ? findings
        : findings.filter(f => f.severity === filter);

    const severityColor = (severity) => {
        switch (severity) {
            case "CRITICAL": return "bg-red-500 text-white";
            case "WARNING": return "bg-yellow-400 text-black";
            case "SUGGESTION": return "bg-blue-500 text-white";
            default: return "bg-gray-300 text-black";
        }
    };

    return (
        <div className="p-5 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-5">Security Findings Dashboard</h1>

            {/* Filter buttons */}
            <div className="flex gap-3 mb-5">
                {["ALL", "CRITICAL", "WARNING", "SUGGESTION"].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-4 py-2 rounded-full border ${
                            filter === s ? "bg-black text-white" : "bg-white"
                        }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-4">
                {filtered.map((f, i) => (
                    <div key={i} className="p-4 rounded-xl border shadow">
            <span className={`px-3 py-1 rounded ${severityColor(f.severity)}`}>
              {f.severity}
            </span>
                        <p className="mt-2 text-sm"><strong>Line:</strong> {f.line_number}</p>
                        <p className="mt-1">{f.message}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
