'use strict';

// pugのモジュールを読み込む
const pug = require('pug');
// cookiesのモジュールとして読み込む
const Cookies = require('cookies');
// handler-util.jsを読み込む
const util = require('./handler-util');
// post.jsを読み込む
const Post = require('./post');
// Cookieのkeyを定義
const trackingIdKey = 'tracking-id';

// /postsのパスにアクセスがあった場合、その内容を実行する関数
function handle(req, res){
    // cookiesオブジェクトを生成
    const cookies = new Cookies(req, res);
    // Cokkieの値(トラッキングID)を指定
    addTrackingCookie(cookies);
    switch(req.method){
        // GETメソッドの場合
        case 'GET':
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });
            // DBから全データを新しい投稿から順に表示するよう取得する
            Post.findAll({order:[['id', 'DESC']]}).then((posts) => {
                // 改行を反映
                posts.forEach((post) => {
                    post.content = post.content.replace(/\n/g, '<br>');
                });
                // posts.pugを描画し、レスポンスに書き出す
                res.end(pug.renderFile('./views/posts.pug', {
                    // DB情報
                    posts: posts,
                    // アクセスしているユーザ情報
                    user: req.user
                }));
                // 閲覧情報のログを出力
                console.info(
                    `閲覧されました: user:${req.user},` +
                    ` trackindId:${cookies.get(trackingIdKey)},` +
                    ` remoteAddress:${req.connection.remoteAddress}` +
                    ` userAgent:${req.headers['user-agent']}`
                );
            });
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

                // DB上にデータを作成し、投稿内容を保存
                Post.create({
                    content: content,
                    trackingCookie: cookies.get(trackingIdKey),
                    postedBy: req.user
                }).then(() => {
                    // 投稿フォームにリダイレクト
                    handleRedirectPosts(req, res);
                });
            });
            break;
        default:
            // 対応されてないメソッドの場合
            util.handleBadRequest(req, res);
            break;
    }
}

// 削除ボタンが押下された場合、対象のデータをDBから削除する関数
function handleDelete(req, res){
    switch(req.method){
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
                // idというキーのvalueを取得
                const id = decoded.split('id=')[1];

                // 投稿idを取得し、該当の行をDB上から削除
                Post.findByPk(id).then((post) =>{
                    // 削除をしたのが投稿を行ったユーザ本人であることを判定
                    if(req.user === post.postedBy || req.user === 'admin'){
                        // 削除を実行
                        post.destroy().then(() => {
                            // 削除時のログ出力
                            console.info(
                                `削除されました: user: ${req.user}, ` +
                                `remoteAddress: ${req.connection.remoteAddress}, ` +
                                `userAgent: ${req.headers['user-agent']} `
                            );
                            // 投稿フォームにリダイレクト
                            handleRedirectPosts(req, res);
                        });
                    }
                });
            });
            break;
        default:
            // 対応されてないメソッドの場合
            util.handleBadRequest(req, res);
            break;
    }
}

// 24時間有効のCookieの値(トラッキングID)を設定する関数
function addTrackingCookie(cookies){
    // Cookieの値(トラッキングID)が存在しない場合
    if(!cookies.get(trackingIdKey)){
        // ランダムな整数値を生成してトラッキングIDとする
        const trackingId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        // 24時間後の時刻を取得
        const tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
        // 生成したトラッキングIDのCookieと、その有効期限を指定
        cookies.set(trackingIdKey, trackingId, {expires: tomorrow});
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
  handle,
  handleDelete
}