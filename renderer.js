async function loadNews() {
    console.log("🔍 뉴스 로딩 시작...");

    const newsList = document.getElementById("news-list");
    if (!newsList) {
        console.error("❌ `news-list` 요소를 찾을 수 없음!");
        return;
    }

    newsList.innerHTML = "<li>불러오는 중...</li>";

    try {
        const articles = await window.electron.getNews(); // 🔥 require() 대신 사용
        console.log("✅ 가져온 뉴스 데이터:", articles);

        if (!articles || articles.length === 0) {
            newsList.innerHTML = "<li>뉴스를 불러올 수 없습니다.</li>";
            return;
        }

        newsList.innerHTML = articles.map(article => 
            `<li><a href="${article.url}" target="_blank">${article.title} (${article.source})</a></li>`
        ).join("");

    } catch (error) {
        console.error("❌ 뉴스 로딩 실패:", error);
        newsList.innerHTML = "<li>뉴스를 불러올 수 없습니다.</li>";
    }
}

window.onload = loadNews;
