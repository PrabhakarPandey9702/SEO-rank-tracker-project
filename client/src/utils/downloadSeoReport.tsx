
import { jsPDF } from "jspdf";

interface AnalysisData {
    url: string;
    overallScore: number;
    createdAt: string;
    loadTime: number;
    pageSize: number;
    wordCount: number;

    categories: {
        seo: number;
        performance: number;
        accessibility: number;
        bestPractices: number;
    };

    metaData: {
        title: string;
        description: string;
        canonical: string;
        robots: string;
        viewport: string;
        charset: string;
    };

    headings: {
        h1: number;
        h2: number;
        h3: number;
        h4: number;
        h5: number;
        h6: number;
        h1Texts: string[];
    };

    links: {
        internal: number;
        external: number;
        total: number;
    };

    images: {
        total: number;
        missingAlt: number;
        withAlt: number;
    };

    keywords: {
        word: string;
        count: number;
        density: number;
    }[];

    issues: {
        severity: string;
        category: string;
        message: string;
        recommendation: string;
    }[];
}

export const downloadSeoReport = (analysis: AnalysisData) => {

    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let y = 20;

    const addText = (text: string) => {

        const lines = doc.splitTextToSize(
            text || "Not available",
            pageWidth - 30
        );

        if (y + lines.length * 6 > pageHeight - 20) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        doc.text(lines, 15, y);

        y += lines.length * 6 + 3;
    };

    const addHeading = (heading: string) => {

        if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
        }

        y += 5;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");

        doc.text(heading, 15, y);

        y += 10;
    };

    // Header
    doc.setFillColor(20, 25, 40);
    doc.rect(0, 0, pageWidth, 42, "F");

    doc.setTextColor(255, 255, 255);

    doc.setFontSize(23);
    doc.setFont("helvetica", "bold");
    doc.text("RANK PILOT", 15, 20);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("AI-Powered SEO Audit Report", 15, 30);

    doc.setTextColor(30, 30, 30);

    y = 55;

    // Website information
    addHeading("Website Information");

    addText(`Website: ${analysis.url}`);

    addText(
        `Analysis Date: ${new Date(analysis.createdAt).toLocaleString()}`
    );

    // Overall score
    addHeading("Overall SEO Score");

    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 150, 100);

    doc.text(`${analysis.overallScore}/100`, 15, y);

    y += 15;

    doc.setTextColor(30, 30, 30);

    // Category scores
    addHeading("Category Scores");

    addText(`SEO: ${analysis.categories.seo}/100`);
    addText(`Performance: ${analysis.categories.performance}/100`);
    addText(`Accessibility: ${analysis.categories.accessibility}/100`);
    addText(`Best Practices: ${analysis.categories.bestPractices}/100`);

    // Performance
    addHeading("Website Performance");

    addText(`Load Time: ${analysis.loadTime} ms`);
    addText(`Page Size: ${analysis.pageSize} characters`);
    addText(`Word Count: ${analysis.wordCount}`);

    // Metadata
    addHeading("Meta Tags Analysis");

    addText(`Title: ${analysis.metaData.title}`);
    addText(`Description: ${analysis.metaData.description}`);
    addText(`Canonical: ${analysis.metaData.canonical}`);
    addText(`Robots: ${analysis.metaData.robots}`);
    addText(`Viewport: ${analysis.metaData.viewport}`);
    addText(`Charset: ${analysis.metaData.charset}`);

    // Headings
    addHeading("Heading Structure");

    Object.entries({
        H1: analysis.headings.h1,
        H2: analysis.headings.h2,
        H3: analysis.headings.h3,
        H4: analysis.headings.h4,
        H5: analysis.headings.h5,
        H6: analysis.headings.h6
    }).forEach(([tag, count]) => {
        addText(`${tag}: ${count}`);
    });

    // Links
    addHeading("Links Analysis");

    addText(`Internal Links: ${analysis.links.internal}`);
    addText(`External Links: ${analysis.links.external}`);
    addText(`Total Links: ${analysis.links.total}`);

    // Images
    addHeading("Images Analysis");

    addText(`Total Images: ${analysis.images.total}`);
    addText(`Images with Alt: ${analysis.images.withAlt}`);
    addText(`Images Missing Alt: ${analysis.images.missingAlt}`);

    // Keywords
    addHeading("Keyword Analysis");

    analysis.keywords.forEach((keyword, index) => {
        addText(
            `${index + 1}. ${keyword.word} | Count: ${keyword.count} | Density: ${keyword.density}%`
        );
    });

    // Issues
    addHeading("SEO Issues");

    if (analysis.issues.length === 0) {
        addText("No SEO issues found.");
    }

    analysis.issues.forEach((issue, index) => {

        addText(`${index + 1}. ${issue.category}`);

        addText(`Severity: ${issue.severity}`);

        addText(`Issue: ${issue.message}`);

        addText(`Recommendation: ${issue.recommendation}`);
    });

    // Footer
   const totalPages = doc.internal.pages.length - 1;

    for (let i = 1; i <= totalPages; i++) {

        doc.setPage(i);

        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);

        doc.text(
            `Rank Pilot | Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" }
        );
    }

    const hostname = new URL(analysis.url).hostname;

    doc.save(`RankPilot_SEO_Report_${hostname}.pdf`);
};