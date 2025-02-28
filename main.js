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
        const today = new Date().toISOString().split("T")[0]; // 현재 날짜 (YYYY-MM-DD)

        // 오늘의 뉴스가 이미 크롤링되었는지 확인
        if (lastFetchDate === today) {
            console.log("✅ 오늘의 뉴스는 이미 크롤링됨.");
            return store.get("newsData", []); // 오늘의 뉴스가 이미 크롤링되었으면 저장된 뉴스 데이터 반환
        } else {
            console.log("🔄 새로운 뉴스 크롤링 실행...");
            try {
                const news = await fetchNews(); // 새로운 뉴스 크롤링
                store.set("newsData", news); // 크롤링한 뉴스 저장
                store.set("lastFetchDate", today); // 오늘 날짜를 마지막 크롤링 날짜로 저장
                return news; // 새로운 뉴스 반환
            } catch (error) {
                console.error("뉴스 크롤링 중 오류 발생:", error);
                return []; // 오류 발생 시 빈 배열 반환
            }
        }
    }
    
    // ✅ 앱 실행 시 9시 갱신 예약
    const now = new Date();
    const hours = now.getHours();

    // 9시가 지나면 크롤링 수행
    if (hours >= 9) {
        console.log("🔄 9시가 지났으므로 새로운 뉴스 크롤링 실행...");
        await getStoredNews(); // 9시가 지나면 크롤링 수행
    }

    scheduleDailyUpdate(); // 크롤링 스케줄 시작

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

// ✅ 9시가 지나면 자동으로 뉴스 크롤링
function scheduleDailyUpdate() {
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(9, 0, 0, 0); // 아침 9시 설정

    let delay = targetTime - now; // 현재 시간과 9시 차이 계산
    if (delay < 0) {
        delay += 24 * 60 * 60 * 1000; // 이미 9시가 지났다면, 내일 9시로 설정
    }

    setTimeout(async () => {
        console.log("뉴스 자동 갱신 시작...");
        await getStoredNews(); // 9시에 뉴스 갱신
        scheduleDailyUpdate(); // 다음 9시 예약
    }, delay);
}
