const { app, BrowserWindow, ipcMain, Tray, Menu, shell, dialog } = require("electron");
const path = require("path");
const { fetchNews } = require("./newsFetcher");
const { translateText } = require("./translator");

let mainWindow;
let tray;

// 📌 electron-store & auto-launch 동적 import
async function initializeStore() {
    const { default: Store } = await import("electron-store");
    return new Store();
}

async function initializeAutoLaunch() {
    const { default: AutoLaunch } = await import("electron-auto-launch");
    return new AutoLaunch({ name: "ITNewsWidget", path: process.execPath });
}

app.whenReady().then(async () => {
    const store = await initializeStore();
    const autoLauncher = await initializeAutoLaunch();

    let windowBounds = store.get("windowBounds", { width: 450, height: 650 });

    mainWindow = new BrowserWindow({
        width: windowBounds.width,
        height: windowBounds.height,
        x: windowBounds.x || 200,
        y: windowBounds.y || 10,
        transparent: true,
        skipTaskbar: true,  // ✅ 작업 표시줄에서 숨기기
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
    tray = new Tray(path.join(__dirname, "icon.png")); // 아이콘 이미지 설정
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
            label: "종료",
            click: () => {
                app.isQuiting = true; // 종료 플래그 설정
                app.quit(); // 애플리케이션 종료
            }
        }
    ]);

    tray.setToolTip("개발자 IT 뉴스 위젯");
    tray.setContextMenu(contextMenu);

    // ✅ 트레이 아이콘 클릭하면 위젯 보이기/숨기기
    tray.on("click", () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
        }
    });

    // ✅ 첫 실행 시 사용자에게 시작 프로그램 등록 여부 확인
    const autoLaunchStatus = store.get("autoLaunch", null);

    if (autoLaunchStatus === null) {
        // ✅ 사용자에게 시작 프로그램 등록 여부 묻기
        const choice = dialog.showMessageBoxSync({
            type: "question",
            buttons: ["예", "아니요"],
            title: "시작 프로그램 등록",
            message: "이 앱을 Windows 시작 시 자동 실행하도록 설정할까요?"
        });

        if (choice === 0) { // "예" 선택 시
            await autoLauncher.enable();
            store.set("autoLaunch", true);
            console.log("🚀 자동 실행 활성화됨.");
        } else {
            store.set("autoLaunch", false);
            console.log("⛔ 자동 실행 거부됨.");
        }
    } else if (autoLaunchStatus) {
        // ✅ 사용자가 이전에 "예"를 선택했다면 자동 실행 유지
        autoLauncher.enable();
    } else {
        // ✅ 사용자가 이전에 "아니요"를 선택했다면 자동 실행 설정하지 않음
        autoLauncher.disable();
    }

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
