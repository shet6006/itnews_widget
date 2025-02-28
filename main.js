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

app.whenReady().then(async () => {
    store = await initializeStore();
    let autoLaunchEnabled = store.get("autoLaunch", false); // 기본값 false

    let windowBounds = store.get("windowBounds", { width: 450, height: 650 });

    mainWindow = new BrowserWindow({
        width: windowBounds.width,
        height: windowBounds.height,
        x: windowBounds.x || 200,
        y: windowBounds.y || 10,
        transparent: true,
        skipTaskbar: true, // ✅ 작업 표시줄에서 숨기기
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

    // ✅ 트레이 아이콘 추가
    tray = new Tray(path.join(__dirname, "icon.png"));

    function updateTrayMenu() {
        autoLaunchEnabled = store.get("autoLaunch", false);
        const contextMenu = Menu.buildFromTemplate([
            {
                label: "위젯 열기/숨기기",
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
                label: `Windows 시작 시 실행 ${autoLaunchEnabled ? "✔" : ""}`, // 체크 표시
                click: async () => {
                    autoLaunchEnabled = !autoLaunchEnabled;
                    await setAutoLaunch(autoLaunchEnabled);
                    updateTrayMenu(); // 메뉴 업데이트
                }
            },
            { type: "separator" },
            {
                label: "종료",
                click: () => {
                    app.isQuiting = true;
                    app.quit();
                }
            }
        ]);

        tray.setContextMenu(contextMenu);
    }

    updateTrayMenu(); // 최초 실행 시 트레이 메뉴 설정

    tray.setToolTip("개발자 IT 뉴스 위젯");

    // ✅ 트레이 아이콘 클릭하면 위젯 보이기/숨기기
    tray.on("click", () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
        }
    });

    async function getStoredNews() {
        const lastFetchDate = store.get("lastFetchDate", null);
        const today = new Date().toISOString().split("T")[0];

        if (lastFetchDate === today) {
            console.log("✅ 오늘의 뉴스는 이미 크롤링됨.");
            return store.get("newsData", []);
        } else {
            console.log("🔄 새로운 뉴스 크롤링 실행...");
            const news = await fetchNews();
            store.set("newsData", news);
            store.set("lastFetchDate", today);
            return news;
        }
    }

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
