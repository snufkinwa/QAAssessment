// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");
const readline = require("readline");
const fs = require("fs").promises;

//Save scraped articles tp JSON
const ARTICLES_FILE = "scraped_articles.json";

//Make date more human-friendly
function formatTime(isoString) {
  const date = new Date(isoString);
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

//Main function to scrape and validate HN articles
async function sortHackerNewsArticles() {
  //launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  //Navigate to url
  await page.goto("https://news.ycombinator.com/newest");

  //Array to store scraped articles and counter for pagination
  let articles = [];
  let pageIndex = 1;

  //Loop until we collet 100 articles
  while (articles.length < 100) {
    console.log(`Scraping page ${pageIndex}...`);
    await page.waitForSelector(".athing");

    //Scrape titles and timestamp
    const newArticles = await page.$$eval(".athing", (rows) =>
      rows.map((row) => {
        const titleElement = row.querySelector(".titleline > a");
        const timeElement = row.nextElementSibling.querySelector(".age");
        return {
          title: titleElement.textContent?.trim() || "",
          time: timeElement ? timeElement.getAttribute("title") : "",
        };
      })
    );

    //Add to array
    articles.push(...newArticles);

    //There is 30 articles on the page, if there isn't break, if there is 100 in JSON break
    if (newArticles.length < 30 || articles.length >= 100) break;

    //Locate "more" link to load next page of articles
    const moreLink = await page.$("a.morelink");
    if (!moreLink) break;

    await moreLink.click();
    await page.waitForTimeout(2000);
    pageIndex++;
  }

  //Trim and format collected articles to ensure 100 articles EXACTLY
  articles = articles.slice(0, 100).map((article, index) => ({
    index: index + 1,
    title: article.title,
    time: formatTime(article.time),
  }));

  // Save formatted articles to file
  await fs.writeFile(ARTICLES_FILE, JSON.stringify(articles, null, 2));

  console.log(
    "Articles saved to file. You can now recheck sorting without re-scraping."
  );

  await validateSorting(articles);

  console.log("Taking a screenshot for debugging...");
  await page.screenshot({ path: "debug-screenshot.png", fullPage: true });

  //Keep browser open until users presses ENTER after manual review
  await keepBrowserOpenUntilUserInput();
  await browser.close();
}

async function validateSorting(articles) {
  console.log("Validating article sorting...");
  let isSorted = true;
  //Loop through article and compart timestamps
  for (let i = 0; i < articles.length - 1; i++) {
    const currentTime = new Date(articles[i].time).getTime();
    const nextTime = new Date(articles[i + 1].time).getTime();
    if (currentTime < nextTime) {
      isSorted = false;
      console.log(`Sorting issue at index ${i}:`);
      console.log(`${i + 1}: ${articles[i].title} (${articles[i].time})`);
      console.log(
        `${i + 2}: ${articles[i + 1].title} (${articles[i + 1].time})`
      );
      break;
    }
  }
  //Log if articles are correctly sorted or not
  if (isSorted) {
    console.log("PASS: Articles are correctly sorted from newest to oldest.");
  } else {
    console.log(
      "FAIL: Articles are NOT correctly sorted from newest to oldest."
    );
  }
}

//Keep browser open until user presses Enter in terminal
async function keepBrowserOpenUntilUserInput() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Press Enter to close the browser: ", () => {
      rl.close();
      resolve();
    });
  });
}

(async () => {
  await sortHackerNewsArticles();
})();
