import { prompt } from "enquirer";
import { writeFileSync } from "fs";
import { createClient } from "redis";
import { ExportToCsv } from "export-to-csv";
import { Builder, By, WebDriver, until } from "selenium-webdriver";

const REDIS_URL = "redis://default:ostello123@localhost:6379";

type Question = {
  question: string;
  url: string;
  totalViews: string;
  totalVotes: string;
  totalAnswers: string;
  askedOn: string;
};

// Initialize the Redis Database, Selenium Web driver
async function main(url: string) {
  // generate questions to be to the user for input at run time
  const askQuestionsLimit = await prompt({
    type: "input",
    name: "questionLimit",
    message: "How many pages of StackOverflow do you wanna scrape?",
  });

  const askFileName = await prompt({
    type: "input",
    name: "fileName",
    message:
      "What CSV file name do you want the data to be exported to? (include file extension) : ",
  });

  // global scraped stackoverflow questions array
  let questions: Question[] = [];

  // client for the redis in-memory database
  // const client = createClient({ url: REDIS_URL });

  console.log("\nStarting Firefox...");
  // Selenium Web Driver for the Firefox Browser
  const driver = await new Builder().forBrowser("firefox").build();

  // console.log("Connecting to Redis...");
  // // Listen for connections errors, if any
  // client.on("error", (err) => console.error("Redis Client error", err));
  // await client.connect();

  // console.log("\n\nQuestions fetched!");

  // loop up to the total limit
  for (
    let i = 1;
    i <= Number.parseInt(askQuestionsLimit["questionLimit"]);
    i++
  ) {
    console.log("Fetching from Page " + i);

    // navigate to respective page using variable i as page number
    await driver.get(url + `?tab=newest&page=${i}`);

    // call get questions function
    // webdriver and questions array is passed
    const questionsForPage = await GetQuestionsFromPage(driver);
    console.log("questionsForPage: ", questionsForPage);

    questions = [...questions, ...questionsForPage];
  }

  console.log("\n\nQuestions fetched!");
  console.log("questions: ", questions);

  // // Store all questions in Redis
  // await client.set("questions", JSON.stringify(questions));
  //
  // console.log(await client.get("questions"));

  await driver.quit();
  await exportToCSV(questions, askFileName["fileName"]);
}

// Store all JSON data and export to a CSV file
async function exportToCSV(questions: Question[], fileName: string) {
  const options = {
    fieldSeparator: ",",
    quoteStrings: '"',
    decimalSeparator: ".",
    showLabels: true,
    showTitle: true,
    title: "Stackoverflow Questions",
    useTextFile: false,
    useBom: true,
    useKeysAsHeaders: true,
  };

  // generating CSV data
  const csvData = new ExportToCsv(options).generateCsv(JSON.stringify(questions), true);
  writeFileSync(fileName, csvData, {
    encoding: "utf-8",
  });

  console.log("Exported to " + fileName);
}

// Gather all required data from current page
async function GetQuestionsFromPage(driver: WebDriver): Promise<Question[]> {
  try {
    // wait for the Questions div to load dynamically
    await driver.wait(until.elementLocated(By.id("questions")));
    const QuestionsDiv = await driver.findElement(By.id("questions"));

    const QuestionSummaryDivs = await QuestionsDiv.findElements(
      By.css(".js-post-summary")
    );

    // extract each question from the Questions ID div
    const requests = QuestionSummaryDivs.map(async (questionSummaryDiv, idx) => {
      const question = await (
        await questionSummaryDiv.findElement(By.css(".s-post-summary--content > h3 > a"))
      ).getText();

      const url = await (
        await questionSummaryDiv.findElement(By.css(".s-post-summary--content > h3 > a"))
      ).getAttribute("href");

      const totalViews = await (
          await questionSummaryDiv.findElement(
            By.css(".s-post-summary--stats > div:nth-child(3) > span:first-child")
          )
        ).getText();

      const totalVotes = await (
        await questionSummaryDiv.findElement(
            By.css(".s-post-summary--stats > div:nth-child(1) > span:first-child")
        )
      ).getText();

      const totalAnswers = await (
        await questionSummaryDiv.findElement(
            By.css(".s-post-summary--stats > div:nth-child(2) > span:first-child")
        )
      ).getText();

      const askedOn = await (
        await questionSummaryDiv.findElement(
          By.xpath(`/html/body/div[3]/div[2]/div[1]/div[3]/div[${idx + 1}]/div[2]/div[2]/div[2]/time/span`)
        )
      ).getText();

      return {
        question,
        url,
        totalViews,
        totalVotes,
        totalAnswers,
        askedOn,
      };
    });

    return await Promise.all(requests);
  } catch (e) {
    console.error(e);
  }
}

main("https://stackoverflow.com/questions");
