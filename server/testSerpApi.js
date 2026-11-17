import "dotenv/config";
import { getJson } from "serpapi";

const testSerpApi = async () => {
  try {
    const response = await getJson({
      engine: "google",
      api_key: process.env.SERPAPI_API_KEY,
      q: "python tutorial",
      google_domain: "google.com",
      gl: "in",
      hl: "en",
      num: 10,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    console.log("Search successful!");

    console.log(
      JSON.stringify(response.organic_results?.slice(0, 5), null, 2)
    );
  } catch (error) {
    console.error("SerpApi test failed:", error.message);
  }
};

testSerpApi();