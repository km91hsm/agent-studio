// 좁은 preload: 렌더러는 보고 함수 하나만 받는다(데몬 토큰·포트·경로 미노출, SECURITY §7)
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("s6", {
  report: (payload) => ipcRenderer.invoke("s6:report", payload),
});
