'use strict';

// httpのモジュールを読み込む
const http = require('http');
// // child_processのモジュールを読み込む
// const cp = require('child_process');

// httpサーバを作成
const server = http.createServer((req, res) => {
    // リクエストからパスを取得
    const path = req.url;
    console.log(path);
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8'
    });
    // OSのechoコマンドの実行結果をレスポンスとして返す
    // res.end(cp.execSync(`echo ${path}`));
    // OSコマンドを実行しないように修正
    res.end(path);
});

// httpが起動するポートを設定
const port = 8000;
// サーバーを起動
server.listen(port, () => {
    // ログを出力
    console.info(`Listening on ${port}`);
});