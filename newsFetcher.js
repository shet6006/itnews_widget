const puppeteer = require("puppeteer");

async function fetchHackerNews() {
    try {
        console.log("🔍 Hacker News 크롤링 시작...");

        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.goto("https://news.ycombinator.com/", { waitUntil: "networkidle2" });

        let articles = await page.evaluate(() => {
            let results = [];
            document.querySelectorAll(".title a").forEach((element, index) => {
                if (index < 3) {
                    let title = element.innerText.trim();
                    let url = element.href;
                    results.push({ title, url, source: "Hacker News" });
                }
            });
            return results;
        });

        await browser.close();
        console.log("✅ Hacker News 크롤링 완료:", articles);
        return articles;
    } catch (error) {
        console.error("❌ Hacker News 크롤링 실패:", error);
        return [];
    }
}

async function fetchDevTo() {
    try {
        console.log("🔍 Dev.to 크롤링 시작...");

        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.goto("https://dev.to/", { waitUntil: "networkidle2" });

        let articles = await page.evaluate(() => {
            let results = [];
            document.querySelectorAll(".crayons-story__title a").forEach((element, index) => {
                if (index < 3) {
                    let title = element.innerText.trim();
                    let url = element.href;
                    results.push({ title, url, source: "Dev.to" });
                }
            });
            return results;
        });

        await browser.close();
        console.log("✅ Dev.to 크롤링 완료:", articles);
        return articles;
    } catch (error) {
        console.error("❌ Dev.to 크롤링 실패:", error);
        return [];
    }
}

// ✅ Velog
async function fetchVelog() {
    try {
        console.log("🔍 Velog 크롤링 시작...");

        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();

        await page.goto("https://velog.io/", { waitUntil: "networkidle2" });

        let articles = await page.evaluate(() => {
            let postElements = document.querySelectorAll(".PostCard_block__FTMsy"); // ✅ 게시글 카드 하나씩 선택
            let results = [];

            postElements.forEach((postElement, index) => {
                if (index < 3) {  // ✅ 최신 3개 게시글만 가져오기

                    let linkElement = postElement.querySelectorAll("a")[1]; // ✅ 두 번째 <a> 태그 선택
                    let url = linkElement ? linkElement.getAttribute("href") : "#";

                    let titleElement = linkElement.querySelector("h4"); // ✅ 두 번째 <a> 태그 내부의 <h4> 가져오기
                    let title = titleElement ? titleElement.innerText.trim() : "제목 없음";

                    if (!url.startsWith("https")) {
                        url = "https://velog.io" + url; // ✅ 상대경로를 절대경로로 변환
                    }

                    results.push({ title, url, source: "Velog" });
                }
            });
            return results;
        });

        await browser.close();
        console.log("✅ Velog 크롤링 완료:", articles);
        return articles;
    } catch (error) {
        console.error("❌ Velog 크롤링 실패:", error);
        return [];
    }
}

async function fetchAWS() {
    try {
        console.log("🔍 AWS 크롤링 시작...");

        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();

        await page.goto("https://aws.amazon.com/ko/blogs/aws/page/2/", { waitUntil: "networkidle2" });

        // ✅ Puppeteer에서 `document.querySelectorAll`을 실행할 때는 `page.evaluate()`를 사용해야 함
        const articles = await page.evaluate(() => {
            return [...document.querySelectorAll(".blog-post")]
                .slice(0, 3)  // ✅ 앞에서 3개만 선택
                .map(post => {
                    const titleElement = post.querySelector("h2"); // h2 태그 가져오기
                    const urlElement = post.querySelector("a");   // 첫 번째 a 태그 가져오기

                    return {
                        title: titleElement ? titleElement.textContent.trim() : "No Title",
                        url: urlElement ? urlElement.href : "No Link",
                        source: "AWS"
                    };
                });
        });

        console.log(articles);

        await browser.close(); // ✅ 브라우저 닫기
        return articles; // ✅ 크롤링된 데이터 반환
    } catch (error) {
        console.error("❌ AWS 크롤링 실패:", error);
        return [];
    }
}

// 3개 사이트 뉴스 통합 크롤링
async function fetchNews() {
    const hackerNews = await fetchHackerNews();
    const devTo = await fetchDevTo();
    const velog = await fetchVelog();
    const AWS = await fetchAWS();

    const allNews = [...hackerNews, ...devTo, ...velog, ...AWS];
    console.log("📰 최종 크롤링된 뉴스:", allNews);
    return allNews;
}

// ✅ 중복 실행 방지를 위해 자동 실행 코드 제거
module.exports = { fetchNews };
