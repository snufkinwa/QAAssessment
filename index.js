import fetch from "node-fetch";
import { writeFile } from "fs/promises";

const ARTICLES_FILE = "articles.json";
const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

async function fetchItem(id) {
  const response = await fetch(`${HN_API_BASE}/item/${id}.json`);
  return response.json();
}

function formatTime(timestamp) {
  const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return formatter.format(date);
}

async function validateNewArticles() {
  console.log("Fetching newest stories from HN API...");

  // Fetch newest stories IDs
  const response = await fetch(`${HN_API_BASE}/newstories.json`);
  const storyIds = await response.json();

  // Get first 100 stories
  const first100Ids = storyIds.slice(0, 100);

  console.log("Fetching details for 100 newest stories...");

  // Fetch all stories in parallel
  const articles = await Promise.all(
    first100Ids.map(async (id, index) => {
      const story = await fetchItem(id);
      return {
        index: index + 1,
        id: story.id,
        title: story.title,
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        time: formatTime(story.time),
        timestamp: story.time,
      };
    })
  );

  // Save articles to file
  await writeFile(ARTICLES_FILE, JSON.stringify(articles, null, 2));
  console.log(`Saved ${articles.length} articles to ${ARTICLES_FILE}`);

  // Validate sorting
  console.log("\nValidating article sorting...");

  if (articles.length !== 100) {
    console.log(
      `FAIL: Expected exactly 100 articles, but found ${articles.length}`
    );
    return;
  }

  let issues = [];
  for (let i = 0; i < articles.length - 1; i++) {
    const current = articles[i];
    const next = articles[i + 1];

    if (current.timestamp < next.timestamp) {
      issues.push({
        index: i + 1,
        current,
        next,
      });
    }
  }

  if (issues.length === 0) {
    console.log(
      "PASS: All 100 articles are correctly sorted from newest to oldest."
    );
  } else {
    console.log(`FAIL: Found ${issues.length} sorting issues in the articles.`);
    console.log("\nDetailed sorting issues:");
    issues.forEach((issue) => {
      console.log(
        `\nIssue between articles ${issue.index} and ${issue.index + 1}:`
      );
      console.log(`Article ${issue.index}: "${issue.current.title}"`);
      console.log(`Time: ${issue.current.time}`);
      console.log(`Article ${issue.index + 1}: "${issue.next.title}"`);
      console.log(`Time: ${issue.next.time}`);
    });
  }
}

try {
  await validateNewArticles();
} catch (error) {
  console.error("An error occurred:", error);
  process.exit(1);
}
