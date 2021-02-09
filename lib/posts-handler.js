'use strict';

// pugのモジュールを読み込む
const pug = require('pug');
// handler-util.jsを読み込む
const util = require('./handler-util');
// 投稿内容を保存するための配列
const contents = [];

// /postsのパスにアクセスがあった場合、その内容を実行する関数
function handle(req, res){
    switch(req.method){
        // GETメソッドの場合
        case 'GET':
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });
            // posts.pugを描画し、レスポンスに書き出す
            res.end(pug.renderFile('./views/posts.pug', {contents: contents}));
            break;
        // POSTメソッドの場合
        case 'POST':
            let body = [];
            req.on('data', (chunk) => {
                // 投稿された値をbody配列に格納
                body.push(chunk);
            }).on('end', () => {
                // body配列の要素を連結
                body = Buffer.concat(body).toString();
                // データを受け取り、URIエンコードをデコード
                const decoded = decodeURIComponent(body);
                // contentというキーのvalueを取得
                const content = decoded.split('content=')[1];
                // 投稿内容を保存
                contents.push(content);
                // 投稿内容をログ出力
                console.info('投稿された内容: ' + content);
                // 投稿フォームにリダイレクト
                handleRedirectPosts(req, res);
            });
            break;
        default:
            // 対応されてないメソッドの場合
            util.handleBadRequest(req, res);
            break;
    }
}

// 投稿が完了したら、トップページにリダイレクトする関数
function handleRedirectPosts(req, res) {
    res.writeHead(303, {
      'Location': '/posts'
    });
    res.end();
}

module.exports = {
  handle
}