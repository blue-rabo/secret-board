'use strict';

// pugのモジュールを読み込む
const pug = require('pug');
// cookiesのモジュールとして読み込む
const Cookies = require('cookies');
// moment-timezoneのモジュールを読み込む
const moment = require('moment-timezone');
// crypto(暗号化)モジュールを読み込む
const crypto = require('crypto');
// handler-util.jsを読み込む
const util = require('./handler-util');
// post.jsを読み込む
const Post = require('./post');
// Cookieのkeyを定義
const trackingIdKey = 'tracking_id';

// ワンタイムトークンをサーバ上に保存しておくための連想配列の宣言
const oneTimeTokenMap = new Map();

// /postsのパスにアクセスがあった場合、その内容を実行する関数
function handle(req, res){
    // cookiesオブジェクトを生成
    const cookies = new Cookies(req, res);
    // Cokkieの値(トラッキングID)を指定
    const trackingId = addTrackingCookie(cookies, req.user);
    switch(req.method){
        // GETメソッドの場合
        case 'GET':
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });
            // DBから全データを新しい投稿から順に表示するよう取得する
            Post.findAll({order:[['id', 'DESC']]}).then((posts) => {
                posts.forEach((post) => {
                    // +を空白に置換
                    post.content = post.content.replace(/\+/g, ' ');
                    // 日付を日本語化
                    post.formattedCreatedAt = moment(post.createdAt).tz('Asia/Tokyo').format('YYYY年MM月DD日 HH時mm分ss秒');
                });
                // ランダムな16進数の文字列でワンタイムトークンを生成
                const oneTimeToken = crypto.randomBytes(8).toString('hex');
                // キーはユーザー名、値はトークンをして格納
                oneTimeTokenMap.set(req.user, oneTimeToken);
                // posts.pugを描画し、レスポンスに書き出す
                res.end(pug.renderFile('./views/posts.pug', {
                    // DB情報
                    posts: posts,
                    // アクセスしているユーザ情報
                    user: req.user,
                    // ワンタイムトークン
                    oneTimeToken: oneTimeToken
                }));
                // 閲覧情報のログを出力
                console.info(
                    `閲覧されました: user:${req.user},` +
                    ` trackindId:${trackingId},` +
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
                // リクエストデータを投稿内容とワンタイムトークンに分けて取得
                const dataArray = decoded.split('&');
                // 投稿内容からcontentというキーのvalueを取得
                const content = dataArray[0] ? dataArray[0].split('content=')[1] : '';
                // ワンタイムトークンからoneTimeTokenというキーのvalueを取得
                const requestedOneTimeToken = dataArray[1] ? dataArray[1].split('oneTimeToken=')[1] : '';
                // 連想配列に格納されているワンタイムトークンとリクエストされたワンタイムトークンが同一か否かを判定
                if (oneTimeTokenMap.get(req.user) === requestedOneTimeToken) {
                    console.info('投稿されました: ' + content);
                    // DB上にデータを作成し、投稿内容を保存
                    Post.create({
                        // 投稿内容
                        content: content,
                        // トラッキングID　
                        trackingCookie: trackingId,
                        // アクセスしているユーザ情報
                        postedBy: req.user
                    }).then(() => {
                        // 使用したワンタイムトークンを削除
                        oneTimeTokenMap.delete(req.user);
                         // 投稿フォームにリダイレクト
                         handleRedirectPosts(req, res);
                    });
                } else {
                    // 対応されてないメソッドの場合
                    util.handleBadRequest(req, res);
                }
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

/**
 * Cookieに含まれているトラッキングIDに異常がなければその値を返し、
 * 存在しない場合や異常なものである場合には、再度作成しCookieに付与してその値を返す
 * @param {Cookies} cookies
 * @param {String} userName
 * @return {String} トラッキングID
 */
function addTrackingCookie(cookies, userName) {
    // リクエストトラッキングIDを取得
    const requestedTrackingId = cookies.get(trackingIdKey);
    // リクエストトラッキングIDが有効かどうかを判定
    if (isValidTrackingId(requestedTrackingId, userName)) {
        return requestedTrackingId;
    // 不正だった場合
    } else {
        // トラッキングIDを生成
        const originalId = parseInt(crypto.randomBytes(8).toString('hex'), 16)
        // 日付を取得
        const tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
        // トラッキングIDを生成
        const trackingId = originalId + '_' + createValidHash(originalId, userName);
        cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
        return trackingId;
    }
}

// リクエストトラッキングIDが有効かどうかを判定する関数
function isValidTrackingId(trackingId, userName) {
    // トラッキングIDがなかった場合
    if (!trackingId) {
        return false;
    }
    // トラッキングIDを解析
    const splitted = trackingId.split('_');
    // 元のトラッキングID
    const originalId = splitted[0];
    // 元のトラッキングID + ユーザ名
    const requestedHash = splitted[1];
    // 作成したハッシュ値と送られてきたハッシュ値が同じ値であるかどうかを判定
    return createValidHash(originalId, userName) === requestedHash;
}

// 秘密鍵となる文字列を宣言
// Node.js の REPL において「require('crypto').randomBytes(256).toString('hex');」を実行することで生成
const secretKey =
    `0a6c1d8ee82d1c2e85d0bb9c3b063df07d08872d9d42e8d4da27fa5f
    40ff4aad25db1849b12bf2d1f37d6697287ba3f7ef0c5bc65559b439e
    05cd2558114905a69eaf6e2bd991563ecceb3e0bb6630261ee6262e9d
    129a1e641ac4ba85cf27ba6a91aefb91ed4739ba789538d969aaac803
    af3fd66a142c1e7a8e5f2d4140b66b737746f186031535f28a0b5ebcf
    c8ffd63af81fcad1f254a0ddf0ef15b5da0ebc0587b90d9ce7b5bf025
    c4eba090d36f415a501e497735fdeb623b04199f8342bd41566a9bc9a
    989a0ce1be6073c891da58bd47dc2bd8d540f2bbaa0215d6a300705c8
    18aa9e44ca0b66577b179846e455d2a40edf7e803cc8c51bc653672dc`

// 作成したハッシュ値と送られてきたハッシュ値が同じ値であるかどうかを判定する関数
function createValidHash(originalId, userName) {
    // SHA1アルゴリズムを宣言
    const sha1sum = crypto.createHash('sha1');
    // ハッシュ化したい文字列を設定
    sha1sum.update(originalId + userName + secretKey);
    // 16進数の文字列データに変換
    return sha1sum.digest('hex');
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