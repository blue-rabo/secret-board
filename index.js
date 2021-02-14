'use strict';

// httpのモジュールを読み込む
const http = require('http');
// http-authのモジュールを読み込む
const auth = require('http-auth');
// router.jsを読み込む
const router = require('./lib/router');
// ファイルの情報を利用したBasic認証
const basic = auth.basic({
    realm: 'Enter username and password.',
    file: './users.htpasswd'
});

// サーバーを作成
const server = http.createServer(basic, (req, res) => {
    // 処理を振り分ける
    router.route(req, res);
// サーバエラーのエラーログを出力
}).on('error', (e) => {
    console.error(`Server Error`, e);
// クライアントエラーのエラーログを出力
}).on('clientError', (e) => {
    console.error(`Client Error`, e);
});

// httpが起動するポートを設定
const port = process.env.PORT || 8000;
// サーバーを起動
server.listen(port, () => {
	// ログを出力
    console.info(`Listening on ${port}`);
});