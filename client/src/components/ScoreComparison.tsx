import { useEffect, useState } from "react";
import {
    TrendingUp,
    TrendingDown,
    Minus
} from "lucide-react";

import { useApp } from "../context/AppContext";

interface ScoreData {
    current: number;
    previous: number;
    difference: number;
}

interface ComparisonData {
    overallScore: ScoreData;

    categories: {
        seo: ScoreData;
        performance: ScoreData;
        accessibility: ScoreData;
        bestPractices: ScoreData;
    };

    previousDate: string;
}

interface Props {
    analysisId: string;
}

export default function ScoreComparison({ analysisId }: Props) {

    const { api } = useApp();

    const [comparison, setComparison] =
        useState<ComparisonData | null>(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    useEffect(() => {

        let cancelled = false;

        const fetchComparison = async () => {

            try {

                const res = await api.get(
                    `/api/analysis/${analysisId}/comparison`
                );

                if (cancelled) return;

                if (res.data.success && res.data.hasPrevious) {
                    setComparison(res.data.comparison);
                } else {
                    setComparison(null);
                }

            } catch (err) {

                console.error("Comparison error:", err);

                if (!cancelled) {
                    setError("Unable to load score comparison.");
                }

            } finally {

                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchComparison();

        return () => {
            cancelled = true;
        };

    }, [analysisId, api]);

    if (loading) {
        return (
            <div className="bg-card border border-border rounded-2xl p-6 mt-6">
                Loading score comparison...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-card border border-border rounded-2xl p-6 mt-6">
                {error}
            </div>
        );
    }

    if (!comparison) {
        return (
            <div className="bg-card border border-border rounded-2xl p-6 mt-6">

                <h2 className="text-lg font-semibold mb-2">
                    Historical Score Comparison
                </h2>

                <p className="text-sm text-muted-foreground">
                    No previous analysis found for this website.
                    Analyze this website again later to track SEO improvements.
                </p>

            </div>
        );
    }

    const rows = [
        {
            label: "Overall Score",
            data: comparison.overallScore
        },
        {
            label: "SEO",
            data: comparison.categories.seo
        },
        {
            label: "Performance",
            data: comparison.categories.performance
        },
        {
            label: "Accessibility",
            data: comparison.categories.accessibility
        },
        {
            label: "Best Practices",
            data: comparison.categories.bestPractices
        }
    ];

    const getChangeStyle = (value: number) => {

        if (value > 0) {
            return "text-green-500";
        }

        if (value < 0) {
            return "text-red-500";
        }

        return "text-muted-foreground";
    };

    const getChangeIcon = (value: number) => {

        if (value > 0) {
            return <TrendingUp size={16} />;
        }

        if (value < 0) {
            return <TrendingDown size={16} />;
        }

        return <Minus size={16} />;
    };

    return (

        <div className="bg-card border border-border rounded-2xl p-6 mt-6">

            <div className="mb-6">

                <h2 className="text-lg font-semibold text-foreground">
                    Historical Score Comparison
                </h2>

                <p className="text-sm text-muted-foreground mt-1">
                    Previous analysis vs current analysis
                </p>

            </div>

            <div className="overflow-x-auto">

                <table className="w-full text-sm">

                    <thead>

                        <tr className="border-b border-border text-muted-foreground">

                            <th className="text-left py-3">Metric</th>

                            <th className="text-center py-3">Previous</th>

                            <th className="text-center py-3">Current</th>

                            <th className="text-center py-3">Change</th>

                        </tr>

                    </thead>

                    <tbody>

                        {rows.map((row) => (

                            <tr
                                key={row.label}
                                className="border-b border-border last:border-0"
                            >

                                <td className="py-4 font-medium">
                                    {row.label}
                                </td>

                                <td className="text-center py-4">
                                    {row.data.previous}
                                </td>

                                <td className="text-center py-4 font-semibold">
                                    {row.data.current}
                                </td>

                                <td className="text-center py-4">

                                    <span
                                        className={`inline-flex items-center justify-center gap-1 font-semibold ${getChangeStyle(row.data.difference)}`}
                                    >

                                        {getChangeIcon(row.data.difference)}

                                        {row.data.difference > 0 ? "+" : ""}
                                        {row.data.difference}

                                    </span>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

            <p className="text-xs text-muted-foreground mt-5">

                Previous analysis:
                {" "}
                {new Date(
                    comparison.previousDate
                ).toLocaleString()}

            </p>

        </div>

    );
}