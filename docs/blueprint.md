# **App Name**: Reels 08小隊 - 影片Comment

## Core Features:

- PIN 登入: 使用者以 4–6 位數 PIN 碼登入系統。提供繁體中文錯誤訊息（例如：「PIN 錯誤，請重試」）。含防暴力破解機制：連續錯誤 5 次即暫時鎖定帳號（15 分鐘）。使用 Firebase Authentication（Custom Claims）與 Firestore 安全儲存 PIN 雜湊值（salted hash）。
- 影片上傳與管理: Admin 可上傳、刪除影片並指派至特定員工帳號。上傳支援 `.mp4`, `.mov`, `.avi` 格式，最大上限 1GB。上傳影片會自動產生縮圖（由 Cloud Run/Functions 觸發）。所有影片皆顯示上傳時間、指派對象與版本狀態。檔案儲存於 Firebase Storage（分層結構：`videos/{videoId}/versions/{versionId}/`）。
- 時間軸評論: 使用者可於播放過程中新增評論，系統自動記錄時間點（timecode）。評論項目顯示：時間戳記（例：`00:01:23`）、內容文字、評論者名稱。點擊評論可立即跳轉至對應影片時間。支援依「評論者、時間範圍、版本」過濾。前端介面以繁體中文顯示操作與提示。
- 版本控制（v01 → v02 → v03…）: 支援影片多版本上傳：員工在完成工作後可上傳新版本（自動編號為下一版號）。系統使用 Cloud Function + Firestore Transaction 保證版本號「原子遞增」，避免多人同時上傳衝突。Admin 審核流程：1. 影片上傳 → 狀態為 `pending_review` 2. Admin 審核並可選擇：核可（`approved`），要求修改（`needs_changes`），拒絕（`rejected`）。若核可，可設定為正式版本 (`activeVersion`)。系統自動記錄審核歷程（版本狀態、審核人、時間）。Admin 可於版本面板比較兩個版本（v02 vs v01），進行視覺對照。可自動冷存舊版本（例如保留最近 5 版，其餘歸檔）。
- 註解工具: Admin 可於影片畫面上直接標註：自由畫筆（線條、文字框），插入參考圖片（支援拖曳、旋轉、縮放；Shift 等比縮放）。註解結果儲存在 Firebase Storage，並於評論區顯示預覽。員工端僅能觀看註解（唯讀模式）。
- AI 註解建議（AI-assisted Annotations）: 透過 Gemini 多模態 AI 模型 分析影片內容（影像 + 音訊），自動產生「註解草稿建議」。建議內容包括可能需修改的畫面或關鍵畫格（例如燈光不一致、字幕錯誤）。Admin 於審閱介面可「接受 / 修改 / 忽略」AI 建議。所有 AI 分析皆經 Cloud Function 處理，確保影片資料安全，並可選擇是否上傳至 AI 模型。AI 模組使用 Genkit 框架進行模型串接與安全封裝。
- 安全驗證: 所有高權限操作（核可版本、刪除影片、設定正式版本）皆由 Cloud Functions 執行。透過 Firebase Authentication 的 Custom Claims 判定使用者角色（Admin / Employee）。Firestore / Storage Security Rules 嚴格限制：Employee 僅能存取自己被指派影片與版本資料。版本狀態更新、正式版本切換僅能由 Admin 透過 Cloud Function 觸發。每次操作皆寫入 `auditLogs`，包含執行者、動作、時間、對象。

## Style Guidelines:

- Primary color: `#90AFC5`（柔和藍）— 穩重、專業的影片審閱氛圍。
- Background color: `#F0F4F7`（淺灰）— 清爽乾淨的畫面背景，凸顯影片主體。
- Accent color: `#A2D4AB`（淺綠）— 用於「核可」「成功」類操作，帶來柔和正向感。
- 字體：PT Sans（搭配 Noto Sans TC 作為中文字型 fallback）。風格：現代人文無襯線，閱讀性高，適合繁體中文介面。
- 介面採直覺式設計，重點分區明確：中央為影片播放器。右側為評論／註解／版本資訊面板。左側（或頂部）為導航列（影片清單、搜尋、篩選）。響應式布局：在桌機、平板、筆電皆保持良好比例與間距。主要操作按鈕（如「新增評論」「提交新版本」）使用顯著配色與繁體中文標籤。
- 動畫設計以輕量過渡為主：新增評論 → 「滑入」動畫。按鈕互動 → 柔和「脈動」效果。頁面切換 → 使用淡入淡出，避免干擾專注力。動畫目的：提升操作回饋感而非花俏展示。