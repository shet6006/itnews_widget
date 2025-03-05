const { app, BrowserWindow, ipcMain, Tray, Menu, shell } = require("electron");
const path = require("path");
const { fetchNews } = require("./newsFetcher");
const { translateText } = require("./translator");

let mainWindow;
let tray;
let store;

// 📌 electron-store & auto-launch 동적 import
async function initializeStore() {
    const { default: Store } = await import("electron-store");
    return new Store();
}

async function setAutoLaunch(enable) {
    app.setLoginItemSettings({
        openAtLogin: enable,
        path: app.getPath('exe'),
    });
    store.set("autoLaunch", enable);
}

// // lastFetchDate 초기화
// function resetLastFetchDate() {
//     store.set("lastFetchDate", null); // 또는 store.set("lastFetchDate", "");로 설정 가능
//     console.log("lastFetchDate has been reset.");
// }

app.whenReady().then(async () => {
    
    ipcMain.handle("get-news", async () => {
        return await getStoredNews();
    });

    ipcMain.handle("translate-news", async () => {
        let articles = await getStoredNews();
        for (let article of articles) {
            article.title = await translateText(article.title, "ko");
        }
        return articles;
    });

    ipcMain.handle("open-link", (event, url) => {
        if (url) {
            shell.openExternal(url);
        }
    });
    store = await initializeStore();
    // resetLastFetchDate(); // 앱 시작 시 lastFetchDate 초기화

    let autoLaunchEnabled = store.get("autoLaunch", false); // 기본값 false

    let windowBounds = store.get("windowBounds", { width: 450, height: 650 });

    mainWindow = new BrowserWindow({
        width: windowBounds.width,
        height: windowBounds.height,
        x: windowBounds.x || 200,
        y: windowBounds.y || 10,
        transparent: true,
        skipTaskbar: true, // ✅ Hide from taskbar
        frame: false,
        resizable: false,
        fullscreenable: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile("index.html");

    // ✅ Add tray icon
    tray = new Tray(path.join(__dirname, "icon.png"));

    function updateTrayMenu() {
        autoLaunchEnabled = store.get("autoLaunch", false);
        const contextMenu = Menu.buildFromTemplate([
            {
                label: "Show/Hide Widget",
                click: () => {
                    if (mainWindow.isVisible()) {
                        mainWindow.hide();
                    } else {
                        mainWindow.show();
                    }
                }
            },
            { type: "separator" },
            {
                label: `Run at Windows startup ${autoLaunchEnabled ? "✔" : ""}`, // Check mark
                click: async () => {
                    autoLaunchEnabled = !autoLaunchEnabled;
                    await setAutoLaunch(autoLaunchEnabled);
                    updateTrayMenu(); // Update menu
                }
            },
            { type: "separator" },
            {
                label: "Exit",
                click: () => {
                    app.isQuiting = true;
                    app.quit();
                }
            }
        ]);

        tray.setContextMenu(contextMenu);
    }

    updateTrayMenu(); // Set tray menu on first run

    tray.setToolTip("Developer IT News Widget");

    // ✅ Click tray icon to show/hide widget
    tray.on("click", () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
        }
    });

    async function getStoredNews() {
        const lastFetchDate = store.get("lastFetchDate", null);
        const newsData = store.get("newsData", []);
    
        const today = new Date().toISOString().split("T")[0];
    
        if (lastFetchDate === today && newsData.length > 0) {
            console.log("✅ Today's news has already been crawled.");
            return newsData; 
        } else {
            console.log("🔄 New news crawling in progress...");
            try {
                const news = await fetchNews(); // 새로운 뉴스 크롤링
                if (news.length > 0) { // 뉴스가 정상적으로 크롤링된 경우만 저장
                    store.set("newsData", news);
                    store.set("lastFetchDate", today);
                } else {
                    console.warn("⚠️ Crawled news is empty. Keeping old data.");
                }
                return news.length > 0 ? news : newsData; // 새 뉴스가 없으면 기존 데이터 반환
            } catch (error) {
                console.error("Error occurred during news crawling:", error);
                return newsData; // 오류 발생 시 기존 데이터 반환
            }
        }
    }
    
    
    
    // ✅ Schedule update at 9 AM
    const now = new Date();
    const hours = now.getHours();

    // Perform crawling if it's past 9 AM
    if (hours >= 9) {
        console.log("🔄 It's past 9 AM, starting new news crawling...");
        await getStoredNews(); // Perform crawling if past 9 AM
    }

    scheduleDailyUpdate(); // Start crawling schedule

    mainWindow.on("move", () => {
        let bounds = mainWindow.getBounds();
        store.set("windowBounds", bounds);
    });

    mainWindow.on("close", (event) => {
        let bounds = mainWindow.getBounds();
        store.set("windowBounds", bounds);
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit();
    });
});

// ✅ Automatically crawl news after 9 AM
function scheduleDailyUpdate() {
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(9, 0, 0, 0); // Set to 9 AM

    let delay = targetTime - now; // Calculate delay until 9 AM
    if (delay < 0) {
        delay += 24 * 60 * 60 * 1000; // If past 9 AM, set for next day
    }

    setTimeout(async () => {
        console.log("Starting automatic news update...");
        await getStoredNews(); // Update news at 9 AM
        scheduleDailyUpdate(); // Schedule next 9 AM
    }, delay);
}
