
# Web Scraper

Backend Internship assignment for Growth School.
A NodeJS based Web Scraper that scrapes all the newest Questions from StackOverflow and exports it into a CSV file.


## Features

- Uses Redis as an In-memory Database for faster storage and retrieval of data.
- Stores the :
    - Question title,
    - Unique Question Link,
    - \# of views of the Question,
    - \# of upvotes of the Question,
    - \# of answers to the Question,
    - Date on which the Question was asked.
- Uses Selenium Web Driver for Web Scraping.
- Fetch all data concurrently with ES6 Promises.

## External Packages

| Package             | Description                                                                |
| ----------------- | ------------------------------------------------------------------ |
| redis | Client for redis database |
| enquirer | Library to prompt input from user |
| export-to-csv | Data converter from JSON to CSV |
| selenium-webdriver | Web Driver for Selenium JavaScript |

## Run Locally

Clone the project

```bash
  git clone https://github.com/RoshanJose7/webscraper-node.git
```

Go to the project directory

```bash
  cd webscraper-node
```

Install dependencies

```bash
  npm install
```

Start the server

```bash
  npm run start:dev
```

Build server

```bash
  npm run build
```

Start the production server

```bash
  npm run start
```
## License

[MIT](https://choosealicense.com/licenses/mit/)

