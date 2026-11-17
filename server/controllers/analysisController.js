import Analysis from "../models/Analysis.js";
import { analyzeSeoData } from "../services/geminiService.js";
import { scrapeUrl } from "../services/scraperService.js";

// Analyze a URL
export const analyzeURL = async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: "URL is required"
            });
        }

        // Validate URL format
        let validUrl;

        try {
            validUrl = new URL(
                url.startsWith("http")
                    ? url
                    : `https://${url}`
            );
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Invalid URL format"
            });
        }

        // Create analysis record
        const analysis = await Analysis.create({
            userId: req.userId,
            url: validUrl.href,
            status: "processing"
        });

        // Send immediate response
        res.json({
            success: true,
            message: "Analysis started",
            analysisId: analysis._id
        });

        // Run scraping and AI analysis in background
        try {

            // Step 1: Scrape website
            const scrapeResult = await scrapeUrl(validUrl.href);

            if (!scrapeResult?.success) {
                console.error(
                    "Scraping failed:",
                    scrapeResult?.error || "Unknown scraping error"
                );

                analysis.status = "failed";
                await analysis.save();
                return;
            }

            // Step 2: Analyze with Gemini
            const aiResult = await analyzeSeoData(
                scrapeResult.data
            );

            if (!aiResult?.success) {
                console.error(
                    "Gemini analysis failed:",
                    aiResult?.error || "Unknown AI error"
                );

                analysis.status = "failed";
                await analysis.save();
                return;
            }

            // Step 3: Save results
            analysis.overallScore =
                aiResult.data.overallScore || 0;

            analysis.categories =
                aiResult.data.categories || {};

            analysis.metaData =
                scrapeResult.data.metaData || {};

            analysis.headings =
                scrapeResult.data.headings || {};

            analysis.links =
                scrapeResult.data.links || {};

            analysis.images =
                scrapeResult.data.images || {};

            analysis.keywords =
                aiResult.data.keywords || [];

            analysis.issues =
                aiResult.data.issues || [];

            analysis.loadTime =
                scrapeResult.data.loadTime || 0;

            analysis.pageSize =
                scrapeResult.data.pageSize || 0;

            analysis.wordCount =
                scrapeResult.data.wordCount || 0;

            analysis.status = "completed";

            await analysis.save();

            console.log(
                `SEO analysis completed: ${validUrl.href}`
            );

        } catch (bgError) {

            console.error(
                "Background analysis error:",
                bgError.message
            );

            try {
                analysis.status = "failed";
                await analysis.save();
            } catch (saveError) {
                console.error(
                    "Failed to save failed status:",
                    saveError.message
                );
            }
        }

    } catch (error) {

        console.error(
            "Analysis URL error:",
            error.message
        );

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }
};


// Get analysis by ID
export const getAnalysis = async (req, res) => {
    try {

        const analysis = await Analysis.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: "Analysis not found"
            });
        }

        res.json({
            success: true,
            analysis
        });

    } catch (error) {

        console.error(
            "Get analysis error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// Get all analyses for user
export const getAnalyses = async (req, res) => {
    try {

        const page =
            parseInt(req.query.page) || 1;

        const limit =
            parseInt(req.query.limit) || 10;

        const skip =
            (page - 1) * limit;

        const analyses = await Analysis.find({
            userId: req.userId
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("-issues -keywords");

        const total =
            await Analysis.countDocuments({
                userId: req.userId
            });

        res.json({
            success: true,
            analyses,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {

        console.error(
            "Get analyses error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// Delete analysis
export const deleteAnalysis = async (req, res) => {
    try {

        const analysis =
            await Analysis.findOneAndDelete({
                _id: req.params.id,
                userId: req.userId
            });

        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: "Analysis not found"
            });
        }

        res.json({
            success: true,
            message: "Analysis deleted"
        });

    } catch (error) {

        console.error(
            "Delete analysis error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

export const getAnalysisComparison = async (req, res) => {
    try {

        const currentAnalysis = await Analysis.findOne({
            _id: req.params.id,
            userId: req.userId,
            status: "completed"
        });

        if (!currentAnalysis) {
            return res.status(404).json({
                success: false,
                message: "Analysis not found"
            });
        }

        const getDomain = (url) => {
            try {
                return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
            } catch {
                return "";
            }
        };

        const currentDomain = getDomain(currentAnalysis.url);

        const previousAnalyses = await Analysis.find({
            userId: req.userId,
            status: "completed",
            _id: { $ne: currentAnalysis._id },
            createdAt: { $lt: currentAnalysis.createdAt }
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .select("url overallScore categories createdAt");

        const previousAnalysis = previousAnalyses.find(
            item => getDomain(item.url) === currentDomain
        );

        if (!previousAnalysis) {
            return res.json({
                success: true,
                hasPrevious: false,
                message: "No previous analysis found."
            });
        }

        const difference = (current, previous) =>
            (current ?? 0) - (previous ?? 0);

        const current = currentAnalysis.categories;
        const previous = previousAnalysis.categories;

        return res.json({
            success: true,
            hasPrevious: true,

            comparison: {

                overallScore: {
                    current: currentAnalysis.overallScore,
                    previous: previousAnalysis.overallScore,
                    difference: difference(
                        currentAnalysis.overallScore,
                        previousAnalysis.overallScore
                    )
                },

                categories: {

                    seo: {
                        current: current.seo,
                        previous: previous.seo,
                        difference: difference(current.seo, previous.seo)
                    },

                    performance: {
                        current: current.performance,
                        previous: previous.performance,
                        difference: difference(
                            current.performance,
                            previous.performance
                        )
                    },

                    accessibility: {
                        current: current.accessibility,
                        previous: previous.accessibility,
                        difference: difference(
                            current.accessibility,
                            previous.accessibility
                        )
                    },

                    bestPractices: {
                        current: current.bestPractices,
                        previous: previous.bestPractices,
                        difference: difference(
                            current.bestPractices,
                            previous.bestPractices
                        )
                    }
                },

                previousDate: previousAnalysis.createdAt
            }
        });

    } catch (error) {

        console.error("Analysis comparison error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to compare analyses"
        });
    }
};