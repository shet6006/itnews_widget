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

        displayNews(articles);

    } catch (error) {
        console.error("❌ 뉴스 로딩 실패:", error);
        newsList.innerHTML = "<li>뉴스를 불러올 수 없습니다.</li>";
    }
}

function displayNews(articles) {
    const newsList = document.getElementById("news-list");
    newsList.innerHTML = ""; // 기존 내용 초기화

    articles.forEach(article => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <h3><a href="${article.url}" class="external-link">${article.title}</a></h3>
            <p>${article.source}</p>
        `;
        newsList.appendChild(card);
    });

    // 외부 링크 클릭 시 기본 브라우저에서 열기
    const links = document.querySelectorAll(".external-link");
    links.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault(); // 기본 동작 방지
            const url = link.getAttribute("href");

            // URL이 정의되어 있는지 확인
            if (!url) {
                console.error("❌ URL이 정의되지 않음!");
                return;
            }

            console.log(`링크 URL: ${url}`); // URL 확인

            // openLink 호출
            if (window.electron && window.electron.openLink) {
                console.log(`🌍 외부 링크 열기: ${url}`);
                window.electron.openLink(url); // 기본 브라우저에서 열기
            } else {
                console.error("❌ window.electron.openLink가 정의되지 않음!");
            }
        });
    });
}

// 번역 버튼 클릭 시 이벤트 리스너 추가
document.getElementById("translate-btn").addEventListener("click", async () => {
    const articles = await window.electron.translateNews(); // 번역 요청
    displayNews(articles); // 번역된 뉴스 표시
});

console.log(window.electron); // 이 부분을 추가하여 확인

window.onload = loadNews;
