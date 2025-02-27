const { app, BrowserWindow, ipcMain, Tray, Menu, shell } = require("electron");
const path = require("path");
const { fetchNews } = require("./newsFetcher");
const { translateText } = require("./translator");

let mainWindow;
let tray;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 450,
        height: 650,
        transparent: true,  // ✅ 투명 배경
        frame: false,       // ✅ 창 테두리 제거
        resizable: false,   // ✅ 크기 조절 불가능
        alwaysOnTop: false, // ❌ 항상 최상위 X (다른 창보다 아래 유지)
        skipTaskbar: true,  // ✅ 작업 표시줄에서 숨기기
        fullscreenable: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile("index.html");
    mainWindow.setPosition(200, 50);

    // ✅ 바탕화면 위젯처럼 고정
    mainWindow.setAlwaysOnTop(false, "screen-saver"); // 바탕화면보다 위, 다른 창보다 아래
    mainWindow.setVisibleOnAllWorkspaces(true);  // 모든 데스크톱에서 표시
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

    // 트레이 아이콘 클릭하면 위젯 토글
    tray.on("click", () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
        }
    });

    // 앱이 닫혀도 트레이에서 실행되도록 설정
    mainWindow.on("close", (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit();
    });

    console.log("isQuiting 상태:", app.isQuiting);
});

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

ipcMain.handle('open-link', (event, url) => {
    console.log(`🔗 open-link 호출: ${url}`); // URL 확인
    if (url) {
        shell.openExternal(url);
    } else {
        console.error("❌ URL이 정의되지 않음!");
    }
});