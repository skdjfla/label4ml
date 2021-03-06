// (C) 2018 netqon.com all rights reserved.

const electron = require('electron')
const { app, BrowserWindow, Menu, ipcMain, globalShortcut, crashReporter } = electron;
const utils = require('./utils')
const uuidgen = require('uuid/v4');
const main_utils = require('./main_utils')
const Store = require('electron-store')
const store = new Store()
const fs = require('fs')
const path = require('path')
const urllib = require('url')

/* app */

app.on('ready', function () {

    createMainWindow()

    const menu = Menu.buildFromTemplate(get_menu_template())
    Menu.setApplicationMenu(menu)
})

app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    if (mainWindow === null) {
        createMainWindow() //点击dock的图标，能够打开主窗口
    }
})

app.on('will-quit', () => {
    // Unregister all shortcuts.
    globalShortcut.unregisterAll()
})


/* menu */
function lg(cn, en) {
    return app.getLocale() == 'zh-CN' ? cn : en;
}

function get_menu_template() {
    //locale在app ready之前，无法返回正确的值

    const menuTemplate = [
        {
            label: lg('文件', 'File'),
            submenu: [
                {
                    label: lg('新增方案', 'New solution'),
                    accelerator: 'CmdOrCtrl+N',
                    click() {
                        main_utils.notify_all_windows('open-new-solution', {})
                    }
                },
                { type: 'separator' },
                {
                    label: lg('保存模块', 'Save Module'),
                    accelerator: 'CmdOrCtrl+S',
                    click() {
                        main_utils.notify_all_windows('menu-save-module', {})
                    }
                },
                {
                    label: lg('运行模块', 'Run Module'),
                    accelerator: 'CmdOrCtrl+R',
                    click() {
                        main_utils.notify_all_windows('menu-play-module', {})
                    }
                }
            ]
        },
        {
            label: lg('编辑', 'Edit'),
            submenu: [
                { role: 'undo', label: lg('撤销', 'Undo') },
                { role: 'redo', label: lg('恢复', 'Redo') },
                { type: 'separator' },
                { role: 'cut', label: lg('剪切', 'Cut') },
                { role: 'copy', label: lg('复制', 'Copy') },
                { role: 'paste', label: lg('粘贴', 'Paste') },
                { role: 'selectall', label: lg('全选', 'Select All') }
            ]
        },
        {
            label: lg('查看', 'View'),
            submenu: [
                // { role: 'reload', label: lg('刷新', 'Reload') },
                // {role: 'forcereload'},
                // {role: 'toggledevtools'},
                // {type: 'separator'},
                { role: 'zoomin', label: lg('放大', 'Zoom In') },
                { role: 'zoomout', label: lg('缩小', 'Zoom Out') },
                { role: 'resetzoom', label: lg('重置缩放', 'Reset Zoom') },
                { type: 'separator' },
                { role: 'togglefullscreen', label: lg('切换全屏', 'Toggle Fun Screen') }
            ]
        },
        {
            role: 'window',
            label: lg('窗口', 'Window'),
            submenu: [
                { role: 'minimize', label: lg('最小化', 'Minimize') },
                { role: 'close', label: lg('关闭', 'Close') }
            ]
        },
        {
            role: 'help',
            label: lg('帮助', 'Help'),
            submenu: [
                {
                    label: lg('反馈', 'Feedback'),
                    click() {
                        require('electron').shell.openExternal('https://github.com/fateleak/spidernest')
                    }
                },
                {
                    label: lg('检查更新', "Check for updates"),
                    click() {
                        openCheckUpdateWindow()
                    }
                },
                { type: 'separator' },
                {
                    label: lg('了解更多', 'Learn More'),
                    click() {
                        require('electron').shell.openExternal('http://spidernest.netqon.com')
                    }
                }
            ]
        }
    ]


    if (utils.is_mac()) {
        menuTemplate.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about', label: lg('关于 spidernest', 'About spidernest') },
                { type: 'separator' },
                {
                    label: lg('偏好设置', 'Preferences'),
                    accelerator: 'CommandOrControl+,',
                    click() {
                        createSettingWindow()
                    }
                },
                { role: 'services', label: lg('服务', 'Services'), submenu: [] },
                { type: 'separator' },
                { role: 'hide', label: lg('隐藏 spidernest', 'Hide spidernest') },
                { role: 'hideothers', label: lg('隐藏其它', 'Hide Others') },
                { role: 'unhide', label: lg('显示全部', 'Show All') },
                { type: 'separator' },
                { role: 'quit', lable: lg('退出', 'Quit') }
            ]
        })

        // mac's Window menu
        menuTemplate[4].submenu = [
            { role: 'close', label: lg('关闭', 'Close') },
            { role: 'minimize', label: lg('最小化', 'Minimize') },
            { role: 'zoom', label: lg('缩放', 'Zoom') },
            { type: 'separator' },
            { role: 'front', label: lg('全部置于顶层', 'Bring All to Front') }
        ]
    } else {
        //For Win32, add settings and Exit
        menuTemplate[0].submenu.push(
            {
                label: lg('设置', 'Settings'),
                click() {
                    createSettingWindow()
                },
                accelerator: 'Ctrl+,'

            }
        )

        menuTemplate[0].submenu.push(
            { type: 'separator' }
        )
        menuTemplate[0].submenu.push(
            {
                role: 'quit',
                label: lg('退出', 'Exit'),
                accelerator: 'Ctrl+q'
            }
        )

        menuTemplate[4].submenu.unshift(
            {
                role: 'about',
                label: lg('关于 spidernest', 'About spidernest'),
                click() {
                    openAboutWindow()
                }
            }
        )
    }

    if (utils.is_dev) {
        menuTemplate.push({
            label: 'Dev',
            submenu: [
                { role: 'forcereload' },
                { role: 'toggledevtools' },
                {
                    label: 'test crash',
                    click() {
                        process.crash()
                    }
                },
                {
                    label: 'relaunch',
                    click() {
                        app.relaunch()
                        app.exit(0)
                    }
                }
            ]
        })
    }

    return menuTemplate
}

// ---------- Main Window ---------

let mainWindow

function createMainWindow() {
    if (mainWindow == null) {

        // Create the browser window.
        let main_win_option = {
            width: 1450,
            height: 700
        }

        mainWindow = new BrowserWindow(main_win_option)

        mainWindow.loadURL(urllib.format({
            pathname: path.join(__dirname, 'index.html'),
            protocol: 'file:',
            slashes: true
        }))

        mainWindow.webContents.on('new-window', function (event, url) {
            event.preventDefault();
            electron.shell.openExternal(url)
        })

        mainWindow.on('closed', function () {
            mainWindow = null
            // if (utils.is_mac()) {
            //     app.dock.hide() //dock图标随主窗口关闭
            // }
        })

        if (utils.is_mac()) {
            app.dock.show() // dock图标随主窗口
        }
    } else {
        mainWindow.show()
    }


}

ipcMain.on('open-main-window', function (e, data) {
    createMainWindow()
})


/* ABOUT */
let aboutWindow;//win32

function openAboutWindow() {
    if (aboutWindow != null) {
        aboutWindow.show()
    } else {
        aboutWindow = new BrowserWindow({
            webPreferences: { webSecurity: false },
            width: 300,
            height: 500
        })

        aboutWindow.loadURL(urllib.format({
            pathname: path.join(__dirname, 'about.html'),
            protocol: 'file:',
            slashes: true
        }))

        aboutWindow.setResizable(true)
        if (utils.is_win()) {
            // no menu for checkupdate win in windows
            aboutWindow.setMenu(null)
        }

        aboutWindow.on('closed', function () {
            aboutWindow = null
        })
    }

}