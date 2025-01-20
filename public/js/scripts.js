// socket.ioの接続設定
const socket = io();

// 名前の登録
let username = '';
document.getElementById("username-button").addEventListener("click", function () {
    username = document.getElementById("username-input").value;
    if (username) {
        alert('名前が登録されました');
    } else {
        alert('名前を入力してください');
    }
});

// メッセージ送信ボタンのクリックイベント
document.getElementById("send-message").addEventListener("click", function () {
    const message = document.getElementById("message-input").value;

    // メッセージが空でないかチェック
    if (message.trim() !== "" && username !== "") {
        // メッセージをサーバーに送信
        socket.emit("chat-message", { username, message });

        // 入力フィールドをクリア
        document.getElementById("message-input").value = "";
    } else {
        alert('名前とメッセージを入力してください');
    }
});

// Enterキーでメッセージ送信
document.getElementById("message-input").addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        document.getElementById("send-message").click();
    }
});

// サーバーからメッセージを受信
socket.on("chat-message", (data) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message");
    messageElement.innerHTML = `<span class="username">${data.username}:</span> ${data.message}`;
    document.getElementById("chat-messages").appendChild(messageElement);

    // チャット欄を自動スクロール
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// 動画の同期
const videoPlayer = document.getElementById('video-player');

// 動画の再生をサーバーに通知
videoPlayer.addEventListener('play', () => {
    socket.emit('video-play');
});

videoPlayer.addEventListener('pause', () => {
    socket.emit('video-pause');
});

videoPlayer.addEventListener('seeked', () => {
    socket.emit('video-seek', videoPlayer.currentTime);
});

// サーバーに初期状態の同期をリクエスト
socket.emit('request-video-state');

// クライアントが接続した際に動画状態を取得
socket.on('set-video-state', (state) => {
    if (Math.abs(videoPlayer.currentTime - state.currentTime) > 0.1) {
        videoPlayer.currentTime = state.currentTime;
    }
    if (state.isPlaying && videoPlayer.paused) {
        videoPlayer.play();
    } else if (!state.isPlaying && !videoPlayer.paused) {
        videoPlayer.pause();
    }
});

// サーバーから再生の同期を受け取る
socket.on('video-play', () => {
    if (videoPlayer.paused) {
        videoPlayer.play();
    }
});

socket.on('video-pause', () => {
    if (!videoPlayer.paused) {
        videoPlayer.pause();
    }
});

socket.on('video-seek', (time) => {
    if (Math.abs(videoPlayer.currentTime - time) > 0.1) {
        videoPlayer.currentTime = time;
    }
});

// スタンプ選択リストの表示/非表示
document.getElementById('sticker-btn').addEventListener('click', function () {
    const stickerList = document.getElementById('sticker-list');
    if (stickerList.style.display === 'none' || stickerList.style.display === '') {
        stickerList.style.display = 'block';
    } else {
        stickerList.style.display = 'none';
    }
});

// スタンプをクリックしたときにサーバーに情報を送信
function addSticker(stickerUrl) {
    const videoContainer = document.getElementById('video-container');

    // スタンプ画像を作成
    const sticker = document.createElement('img');
    sticker.src = stickerUrl;
    sticker.style.position = 'absolute';
    sticker.style.left = `${Math.random() * 90}%`;
    sticker.style.top = `${Math.random() * 90}%`;
    sticker.style.width = '50px';
    sticker.style.height = '50px';
    sticker.style.zIndex = '10';

    // 動画上にスタンプを追加
    videoContainer.appendChild(sticker);

    socket.emit("sticker-message", {
        stickerUrl,
        left: sticker.style.left,
        top: sticker.style.top
    });

    // スタンプリストを隠す
    document.getElementById('sticker-list').style.display = 'none';

    // 3秒後にスタンプを消す
    setTimeout(() => {
        sticker.remove();
    }, 3000);
}

// サーバーからスタンプメッセージを受信
socket.on("sticker-message", (data) => {
    const videoContainer = document.getElementById('video-container');

    const sticker = document.createElement('img');
    sticker.src = data.stickerUrl;
    sticker.style.position = 'absolute';
    sticker.style.left = data.left;
    sticker.style.top = data.top;
    sticker.style.width = '50px';
    sticker.style.height = '50px';
    sticker.style.zIndex = '10';

    videoContainer.appendChild(sticker);

    setTimeout(() => {
        sticker.remove();
    }, 3000);
});

  

// 動画クリックで拡大表示
const popup = document.getElementById('popup');
const popupCanvas = document.getElementById('popup-canvas');
const popupClose = document.getElementById('popup-close');
const popupCtx = popupCanvas.getContext('2d');
const zoomSlider = document.getElementById('zoom-slider');
const zoomValue = document.getElementById('zoom-value'); // 拡大倍率を表示する要素
const zoomRangeSlider = document.getElementById('zoom-range-slider');
const zoomRangeValue = document.getElementById('zoom-range-value'); // 拡大範囲倍率を表示する要素

let zoomArea = null; // 拡大する領域の情報
let isZooming = false; // 拡大表示中かどうか

// 拡大範囲倍率スライダーの値をリアルタイムで更新
zoomRangeSlider.addEventListener('input', () => {
    zoomRangeValue.textContent = zoomRangeSlider.value; // 拡大範囲倍率を表示
    if (zoomArea) {
        zoomArea.size = parseFloat(zoomRangeSlider.value) * 100; // 拡大範囲のサイズを変更
        popupCanvas.width = zoomArea.size * zoomArea.scale;
        popupCanvas.height = zoomArea.size * zoomArea.scale;
        drawZoomArea();
    }
});

// 拡大倍率スライダーの値をリアルタイムで更新
zoomSlider.addEventListener('input', () => {
    zoomValue.textContent = zoomSlider.value + 'x'; // 倍率を表示
    if (zoomArea) {
        zoomArea.scale = parseFloat(zoomSlider.value); // 倍率を更新
        popupCanvas.width = zoomArea.size * zoomArea.scale;
        popupCanvas.height = zoomArea.size * zoomArea.scale;
        drawZoomArea();
    }
});

// 動画クリックで拡大/縮小表示
videoPlayer.addEventListener('click', (e) => {
    e.preventDefault(); // 動画の停止を防止

    const rect = videoPlayer.getBoundingClientRect();
    const videoWidth = videoPlayer.videoWidth;
    const videoHeight = videoPlayer.videoHeight;

    // クリック位置を実際の動画解像度に変換
    const scaleX = videoWidth / rect.width;
    const scaleY = videoHeight / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const zoomSize = parseFloat(zoomRangeSlider.value) * 100; // 拡大範囲倍率スライダーの値を適用
    const scale = parseFloat(zoomSlider.value); // 拡大倍率スライダーの値を適用

    // 拡大エリア情報を保存
    zoomArea = {
        x: Math.max(0, x - zoomSize / 2), // 左端を超えないように制限
        y: Math.max(0, y - zoomSize / 2), // 上端を超えないように制限
        size: zoomSize,
        scale: scale
    };

    // 拡大エリアが動画サイズを超えないように調整
    zoomArea.x = Math.min(zoomArea.x, videoWidth - zoomSize);
    zoomArea.y = Math.min(zoomArea.y, videoHeight - zoomSize);

    // ポップアップ表示
    popup.style.display = 'block';
    popupCanvas.width = zoomSize * scale;
    popupCanvas.height = zoomSize * scale;
    isZooming = true;

    drawZoomArea();
});

// ポップアップを閉じる
popupClose.addEventListener('click', () => {
    popup.style.display = 'none';
    isZooming = false;
});

// 拡大/縮小エリアを描画する関数
function drawZoomArea() {
    if (!isZooming || !zoomArea) return;

    const { x, y, size, scale } = zoomArea;

    popupCtx.clearRect(0, 0, popupCanvas.width, popupCanvas.height); // クリア
    popupCtx.drawImage(
        videoPlayer,
        x, y, size, size,
        0, 0, size * scale, size * scale
    );

    requestAnimationFrame(drawZoomArea);
}
