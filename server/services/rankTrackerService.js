import { getJson } from "serpapi";

const RESULTS_PER_PAGE = 10;
const MAX_PAGES = 5;

// Normalize a domain or URL
const normalizeDomain = (value) => {
  if (!value) return "";

  try {
    const url = new URL(
      value.includes("://") ? value : `https://${value}`
    );

    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return value
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(":")[0];
  }
};

// Check whether a result belongs to the target website
const isTargetDomain = (resultDomain, targetDomain) => {
  return (
    resultDomain === targetDomain ||
    resultDomain.endsWith(`.${targetDomain}`)
  );
};

// Get Google results through SerpApi
const getGoogleResults = async (keyword, start = 0) => {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "SERPAPI_API_KEY is missing from your backend .env file."
    );
  }

  const response = await getJson({
    engine: "google",
    api_key: apiKey,
    q: keyword,
    google_domain: "google.com",
    gl: "in",
    hl: "en",
    num: RESULTS_PER_PAGE,
    start,
  });

  if (response.error) {
    throw new Error(`SerpApi error: ${response.error}`);
  }

  return response.organic_results || [];
};

// Main rank-tracking function
 export const rankTracker = async (keyword, targetDomain) => {
  try {
    if (!keyword || !targetDomain) {
      throw new Error("Keyword and target domain are required.");
    }

    const cleanTarget = normalizeDomain(targetDomain);

    if (!cleanTarget) {
      throw new Error("Invalid target domain.");
    }

    console.log(`Searching with SerpApi: ${keyword}`);
    console.log(`Target domain: ${cleanTarget}`);

    let allResults = [];
    let foundResult = null;

    // Search up to five Google result pages
    for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
      const start = pageIndex * RESULTS_PER_PAGE;

      console.log(
        `Fetching page ${pageIndex + 1} through SerpApi...`
      );

      const pageResults = await getGoogleResults(keyword, start);

      if (pageResults.length === 0) {
        console.log("No more organic results found.");
        break;
      }

      const normalizedResults = pageResults
        .filter((result) => result.link)
        .map((result, index) => {
        const domain = normalizeDomain(result.link);

    return {
      url: result.link,
      domain,
      title: result.title || "",
      snippet: result.snippet || "",
      position: result.position ?? start + index + 1,
    };
  });

      allResults.push(...normalizedResults);

      // Find the target website
      foundResult = normalizedResults.find((result) =>
        isTargetDomain(result.domain, cleanTarget)
      );

      if (foundResult) {
        break;
      }
    }

    // Collect competitors, excluding the target website
    const competitorMap = new Map();

    for (const result of allResults) {
      if (
        !result.domain ||
        isTargetDomain(result.domain, cleanTarget)
      ) {
        continue;
      }

      if (!competitorMap.has(result.domain)) {
        competitorMap.set(result.domain, {
          domain: result.domain,
          url: result.url,
          title: result.title,
          position: result.position,
        });
      }
    }

    const competitors = Array.from(competitorMap.values()).slice(
      0,
      10
    );

    // Return the target website's ranking
    const position = foundResult ? foundResult.position : null;

    const page = position
      ? Math.ceil(position / RESULTS_PER_PAGE)
      : null;

    const data = {
      keyword,
      targetDomain: cleanTarget,
      position,
      page,
      title: foundResult?.title || "",
      snippet: foundResult?.snippet || "",
      competitors,
      totalResultsScanned: allResults.length,
    };

    console.log("Rank tracking result:", data);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Rank tracker error:", error.message);

    return {
      success: false,
      error: error.message,
    };
  }
};

