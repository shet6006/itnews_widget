const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// ✅ Windows에서 Chrome 실행 파일 찾기
function findChromeWin() {
    const chromePaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe"),
        "C:\\Program Files\\Chromium\\Application\\chrome.exe"
    ];

    for (const chromePath of chromePaths) {
        if (fs.existsSync(chromePath)) {
            console.log(`✅ Found Chrome at: ${chromePath}`);
            return chromePath;
        }
    }

    console.warn("❌ Chrome not found in default paths.");
    return null;
}

// ✅ Puppeteer 실행 시 Chrome 경로 적용
async function launchBrowser() {
    let executablePath = findChromeWin();

    // Chrome이 없으면 Puppeteer 기본 브라우저 사용
    if (!executablePath) {
        try {
            executablePath = puppeteer.executablePath();
        } catch (error) {
            console.error("❌ Puppeteer Chrome not found.");
            return null;
        }
    }

    const browser = await puppeteer.launch({
        headless: "new",
        executablePath,
    });

    return browser;
}

// ✅ Hacker News 크롤링
async function fetchHackerNews() {
    try {
        console.log("🔍 Starting Hacker News crawling...");
        const browser = await launchBrowser();
        if (!browser) return [];

        const page = await browser.newPage();
        await page.goto("https://news.ycombinator.com/", { waitUntil: "networkidle2" });

        let articles = await page.evaluate(() => {
            return [...document.querySelectorAll(".title a")]
                .slice(0, 3)
                .map(element => ({
                    title: element.innerText.trim(),
                    url: element.href,
                    source: "Hacker News"
                }));
        });

        await browser.close();
        console.log("✅ Hacker News crawling completed:", articles);
        return articles;
    } catch (error) {
        console.error("❌ Failed to crawl Hacker News:", error);
        return [];
    }
}

// ✅ Dev.to 크롤링
async function fetchDevTo() {
    try {
        console.log("🔍 Starting Dev.to crawling...");
        const browser = await launchBrowser();
        if (!browser) return [];

        const page = await browser.newPage();
        await page.goto("https://dev.to/", { waitUntil: "networkidle2" });

        let articles = await page.evaluate(() => {
            return [...document.querySelectorAll(".crayons-story__title a")]
                .slice(0, 3)
                .map(element => ({
                    title: element.innerText.trim(),
                    url: element.href,
                    source: "Dev.to"
                }));
        });

        await browser.close();
        console.log("✅ Dev.to crawling completed:", articles);
        return articles;
    } catch (error) {
        console.error("❌ Failed to crawl Dev.to:", error);
        return [];
    }
}

// ✅ Velog 크롤링
async function fetchVelog() {
    try {
        console.log("🔍 Starting Velog crawling...");
        const browser = await launchBrowser();
        if (!browser) return [];

        const page = await browser.newPage();
        await page.goto("https://velog.io/", { waitUntil: "networkidle2" });

        let articles = await page.evaluate(() => {
            return [...document.querySelectorAll(".PostCard_block__FTMsy")]
                .slice(0, 3)
                .map(postElement => {
                    let linkElement = postElement.querySelectorAll("a")[1];
                    let url = linkElement ? linkElement.getAttribute("href") : "#";
                    let titleElement = linkElement?.querySelector("h4");
                    let title = titleElement ? titleElement.innerText.trim() : "No Title";

                    if (!url.startsWith("https")) {
                        url = "https://velog.io" + url;
                    }

                    return { title, url, source: "Velog" };
                });
        });

        await browser.close();
        console.log("✅ Velog crawling completed:", articles);
        return articles;
    } catch (error) {
        console.error("❌ Failed to crawl Velog:", error);
        return [];
    }
}

// ✅ AWS 블로그 크롤링
async function fetchAWS() {
    try {
        console.log("🔍 Starting AWS crawling...");
        const browser = await launchBrowser();
        if (!browser) return [];

        const page = await browser.newPage();
        await page.goto("https://aws.amazon.com/ko/blogs/aws/page/2/", { waitUntil: "networkidle2" });

        let articles = await page.evaluate(() => {
            return [...document.querySelectorAll(".blog-post")]
                .slice(0, 3)
                .map(post => {
                    const titleElement = post.querySelector("h2");
                    const urlElement = post.querySelector("a");

                    return {
                        title: titleElement ? titleElement.textContent.trim() : "No Title",
                        url: urlElement ? urlElement.href : "No Link",
                        source: "AWS"
                    };
                });
        });

        await browser.close();
        console.log("✅ AWS crawling completed:", articles);
        return articles;
    } catch (error) {
        console.error("❌ Failed to crawl AWS:", error);
        return [];
    }
}

// ✅ 4개 사이트 뉴스 통합 크롤링
async function fetchNews() {
    console.log("🔍 Starting news crawling...");

    const results = await Promise.allSettled([
        fetchHackerNews(),
        fetchDevTo(),
        fetchVelog(),
        fetchAWS()
    ]);

    const allNews = results
        .filter(result => result.status === "fulfilled")
        .flatMap(result => result.value);

    console.log("📰 Final crawled news:", allNews);
    return allNews;
}

// ✅ 중복 실행 방지를 위해 자동 실행 코드 제거
module.exports = { fetchNews };
