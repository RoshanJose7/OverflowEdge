import { prompt } from "enquirer";
import { writeFileSync } from "fs";
import { createClient } from "redis";
import { ExportToCsv } from "export-to-csv";
import { Builder, By, WebDriver, until } from "selenium-webdriver";

type Question = {
  question: string;
  url: string;
  totalViews: string;
  totalVotes: string;
  totalAnswers: string;
  askedOn: string;
};

// Initialize the Redis Database, Selenium Web driver
async function Init(url: string) {
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
  const client = createClient();

  console.log("\nStarting Firefox...");
  // Selenium Web Driver for the Firefox Browser
  const driver = await new Builder().forBrowser("firefox").build();

  console.log("Conneecting to Redis...");
  // Listen for connections errors, if any
  client.on("error", (err) => console.error("Redis Client error", err));
  await client.connect();

  console.log("\n\nQuestions fetched!");

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
    questions = [...questionsForPage, ...questions];
  }

  console.log("\n\nQuestions fetched!");

  // Store all questions in Redis
  await client.set("questions", JSON.stringify(questions));
  exporttoCSV(
    JSON.parse(await client.get("questions")),
    askFileName["fileName"]
  );
  await driver.quit();
}

// Store all JSON data and export to a CSV file
async function exporttoCSV(questions: any[], fileName: string) {
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
  const csvData = new ExportToCsv(options).generateCsv(questions, true);
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
      By.css(".question-summary")
    );

    // extract each question from the Questions ID div
    const requests = QuestionSummaryDivs.map(async (questionSummaryDiv) => {
      const question = await (
        await questionSummaryDiv.findElement(By.css(".summary > h3 > a"))
      ).getText();

      const url = await (
        await questionSummaryDiv.findElement(By.css(".summary > h3 > a"))
      ).getAttribute("href");

      const totalViews = (
        await (
          await questionSummaryDiv.findElement(
            By.css(".statscontainer > .views")
          )
        ).getText()
      ).split("")[0];

      const totalVotes = await (
        await questionSummaryDiv.findElement(
          By.css(
            ".statscontainer > .stats > .vote > .votes > .vote-count-post > strong"
          )
        )
      ).getText();

      const totalAnswers = await (
        await questionSummaryDiv.findElement(
          By.css(".statscontainer > .stats > .status > strong")
        )
      ).getText();

      const askedOn = await (
        await questionSummaryDiv.findElement(
          By.css(
            ".summary > .ai-start > .started > .user-info > .user-action-time > .relativetime"
          )
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

    return Promise.all(requests);
  } catch (e) {
    console.error(e);
  }
}

Init("https://stackoverflow.com/questions");
