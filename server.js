const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

// 静的ファイルを提供
app.use(express.static( __dirname + "/docs"));

// 動画の状態管理
let videoState = {
    isPlaying: false,
    currentTime: 0,
    lastUpdateTime: Date.now()
};

//位置情報の管理
let locationData = [];

// 動画の再生時間を計算する関数
function calculateCurrentTime() {
    if (videoState.isPlaying) {
        const now = Date.now();
        const elapsedTime = (now - videoState.lastUpdateTime) / 1000; // 経過時間（秒）
        videoState.currentTime += elapsedTime;
        videoState.lastUpdateTime = now;
    }
}

// クライアントが接続した際の処理
io.on("connection", (socket) => {
    console.log("A user connected");

    // クライアントから初期同期リクエストを受信
    socket.on("request-video-state", () => {
        calculateCurrentTime();
        socket.emit("set-video-state", videoState);
    });

    // 再生イベントを受信
    socket.on("video-play", () => {
        calculateCurrentTime();
        videoState.isPlaying = true;
        videoState.lastUpdateTime = Date.now();
        io.emit("video-play");
    });

    // 停止イベントを受信
    socket.on("video-pause", () => {
        calculateCurrentTime();
        videoState.isPlaying = false;
        io.emit("video-pause");
    });

    // シークイベントを受信
    socket.on("video-seek", (time) => {
        videoState.currentTime = time;
        videoState.lastUpdateTime = Date.now();
        io.emit("video-seek", time);
    });

    // 位置情報を受信
    socket.on("send-location", (location) => {
        locationData.push(location); // 位置情報を保存
        io.emit("receive-location", locationData); // 位置情報を全クライアントに送信
    });

    // メッセージを受信
    socket.on("chat-message", (data) => {
        io.emit("chat-message", data);
    });

    // スタンプメッセージを受信したら他の全クライアントに送信
    socket.on('sticker-message', (data) => {
        console.log('Sticker received:', data);
        socket.broadcast.emit('sticker-message', data);
    });


    // 切断時
    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

// サーバーを起動
server.listen(3100, () => {
    console.log("Server is running on http://localhost:3100");
});


  
