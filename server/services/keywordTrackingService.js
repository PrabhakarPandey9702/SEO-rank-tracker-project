import KeywordTracking from "../models/keywordTracking.js";
import { rankTracker } from "./rankTrackerService.js";

export async function keywordTracking(tracking) {
    try {
        if (!tracking?._id) {
            return {
                success: false,
                error: "Keyword tracking ID is required",
            };
        }

        let result;

        // Try the rank check up to two times
        for (let attempt = 1; attempt <= 2; attempt++) {
            result = await rankTracker(
                tracking.keyword,
                tracking.domain
            );

            // Stop retrying when the rank check succeeds
            // and returns at least one organic result
            if (
                result?.success &&
                result?.data &&
                result.data.totalResultsScanned > 0
            ) {
                break;
            }

            if (attempt < 2) {
                console.log(
                    `Rank check attempt ${attempt} failed or returned no results. Retrying...`
                );

                await new Promise((resolve) =>
                    setTimeout(resolve, 3000)
                );
            }
        }

        // Reload the latest document from MongoDB
        const currentTracking = await KeywordTracking.findById(
            tracking._id
        );

        if (!currentTracking) {
            console.log(
                "Keyword tracking no longer exists:",
                tracking._id
            );

            return {
                success: false,
                error: "Keyword tracking no longer exists",
            };
        }

        // Check the result returned by rankTracker
        if (
            !result?.success ||
            !result?.data ||
            result.data.totalResultsScanned <= 0
        ) {
            currentTracking.status = "failed";

            await currentTracking.save();

            return {
                success: false,
                error:
                    result?.error ||
                    "No organic search results were returned",
            };
        }

        const data = result.data;

        // Normalize the position: null means not found
        const newPosition = Number.isInteger(data.position)
            && data.position > 0
                ? data.position
                : null;

        const newPage = newPosition
            ? Math.ceil(newPosition / 10)
            : null;

        // Previous ranking position
        const previousPosition = currentTracking.currentPosition;

        // Update current ranking information
        currentTracking.currentPosition = newPosition;
        currentTracking.currentPage = newPage;

        currentTracking.competitors = Array.isArray(
            data.competitors
        )
            ? data.competitors
            : [];

        currentTracking.lastChecked = new Date();

        // A successful API request can still mean the domain
        // was not found in the results that were checked.
        currentTracking.status = newPosition
            ? "completed"
            : "not_found";

        // Calculate position change
        // Positive = ranking improved
        // Negative = ranking declined
        if (
            previousPosition != null &&
            newPosition != null
        ) {
            currentTracking.positionChange =
                previousPosition - newPosition;
        } else {
            currentTracking.positionChange = 0;
        }

        // Update best position only when a valid position exists
        if (
            newPosition != null &&
            (
                currentTracking.bestPosition == null ||
                newPosition < currentTracking.bestPosition
            )
        ) {
            currentTracking.bestPosition = newPosition;
        }

        // Use the current date for today's history entry
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!Array.isArray(currentTracking.rankHistory)) {
            currentTracking.rankHistory = [];
        }

        const historyEntry = {
            date: today,
            position: newPosition,
            page: newPage,
            title: data.title || "",
            snippet: data.snippet || "",
        };

        // Update today's entry if it exists; otherwise add one
        const historyIndex =
            currentTracking.rankHistory.findIndex((entry) => {
                const entryDate = new Date(entry.date);

                return (
                    !Number.isNaN(entryDate.getTime()) &&
                    entryDate.toDateString() ===
                        today.toDateString()
                );
            });

        if (historyIndex >= 0) {
            currentTracking.rankHistory[historyIndex] =
                historyEntry;
        } else {
            currentTracking.rankHistory.push(historyEntry);
        }

        await currentTracking.save();

        console.log("Keyword tracking updated:", {
            keyword: currentTracking.keyword,
            domain: currentTracking.domain,
            position: newPosition,
            page: newPage,
            status: currentTracking.status,
            positionChange: currentTracking.positionChange,
            competitorsCount:
                currentTracking.competitors.length,
        });

        return {
            success: true,
            data,
        };
    } catch (err) {
        console.error(
            "Rank update error:",
            err.message
        );

        // Update failure status if the document still exists
        try {
            const currentTracking =
                await KeywordTracking.findById(tracking?._id);

            if (currentTracking) {
                currentTracking.status = "failed";
                await currentTracking.save();
            }
        } catch (saveError) {
            console.error(
                "Failed to update tracking status:",
                saveError.message
            );
        }

        return {
            success: false,
            error: err.message,
        };
    }
}