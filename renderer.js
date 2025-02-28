async function loadNews() {
    console.log("🔍 뉴스 로딩 시작...");
    const newsList = document.getElementById("news-list");

    if (!newsList) {
        console.error("❌ `news-list` 요소를 찾을 수 없음!");
        return;
    }

    newsList.innerHTML = "<li>불러오는 중...</li>";

    try {
        const articles = await window.electron.getNews();
        console.log("✅ 가져온 뉴스 데이터:", articles);

        if (!articles || articles.length === 0) {
            newsList.innerHTML = "<li>뉴스를 불러올 수 없습니다.</li>";
            return;
        }

        displayNews(articles);
    } catch (error) {
        console.error("❌ 뉴스 로딩 실패:", error);
        newsList.innerHTML = "<li>뉴스를 불러올 수 없습니다.</li>";
    }
}

function displayNews(articles) {
    const newsList = document.getElementById("news-list");
    newsList.innerHTML = "";

    articles.forEach(article => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <h3><a href="${article.url}" target="_blank" class="external-link">${article.title}</a></h3>
            <p>${article.source}</p>
        `;
        newsList.appendChild(card);
    });

    document.querySelectorAll(".external-link").forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const url = link.getAttribute("href");
            window.electron.openLink(url);
        });
    });
}

document.getElementById("translate-btn").addEventListener("click", async () => {
    const articles = await window.electron.translateNews();
    displayNews(articles);
});

window.onload = loadNews;
