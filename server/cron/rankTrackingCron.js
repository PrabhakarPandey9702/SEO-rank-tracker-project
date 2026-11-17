import cron from "node-cron";
import { keywordTracking } from "../services/keywordTrackingService.js";
import KeywordTracking from "../models/keywordTracking.js";

export function startRankTrackingCron() {

    cron.schedule(
        "0 6 * * *",
        async () => {

            console.log(
                "[CRON] Starting daily rank tracking..."
            );

            try {

                const activeTracking =
                    await KeywordTracking.find({
                        active: true
                    });

                console.log(
                    `[CRON] Found ${activeTracking.length} active keywords`
                );

                for (const tracking of activeTracking) {

                    try {

                        tracking.status = "checking";
                        await tracking.save();

                        await keywordTracking(tracking);

                        // Delay between checks
                        await new Promise((resolve) =>
                            setTimeout(
                                resolve,
                                10000 +
                                Math.random() * 5000
                            )
                        );

                    } catch (error) {

                        console.error(
                            `[CRON] Failed for keyword "${tracking.keyword}":`,
                            error.message
                        );

                        tracking.status = "failed";
                        await tracking.save().catch(() => {});
                    }
                }

                console.log(
                    "[CRON] Daily rank tracking completed."
                );

            } catch (error) {

                console.error(
                    "[CRON] Rank tracking cron error:",
                    error.message
                );
            }
        },
        {
            timezone: "Asia/Kolkata"
        }
    );

    console.log(
        "[CRON] Rank tracking cron job scheduled for 6:00 AM IST"
    );
}