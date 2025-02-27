const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { fetchNews } = require("./newsFetcher");
const { translateText } = require("./translator");

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 350,
        height: 500,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
    });

    mainWindow.loadFile("index.html");

    ipcMain.handle("get-news", async () => {
        return await fetchNews();
    });

    ipcMain.handle("translate-news", async () => {
        let articles = await fetchNews();
        for (let article of articles) {
            article.title = await translateText(article.title, "ko"); // 영어 → 한국어 번역
        }
        return articles;
    });

    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit();
    });
});
