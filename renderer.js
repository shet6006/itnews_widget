async function loadNews() {
    console.log("🔍 Loading news...");
    const newsList = document.getElementById("news-list");

    if (!newsList) {
        console.error("❌ Unable to find `news-list` element!");
        return;
    }

    newsList.innerHTML = "<li>Loading...</li>";

    try {
        const articles = await window.electron.getNews();
        console.log("✅ Fetched news data:", articles);

        if (!articles || articles.length === 0) {
            newsList.innerHTML = "<li>Unable to load news.</li>";
            return;
        }

        displayNews(articles);
    } catch (error) {
        console.error("❌ Failed to load news:", error);
        newsList.innerHTML = "<li>Unable to load news.</li>";
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

document.getElementById("refresh-btn").addEventListener("click", async () => {
    const articles = await window.electron.fetchNews();
    displayNews(articles);
});

window.onload = loadNews;
