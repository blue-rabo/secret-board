'use strict';

// posts-handler.jsを読み込む
const postsHandler = require('./posts-handler');
// handler-util.jsを読み込む
const util = require('./handler-util');

// リクエストの振り分け処理をする関数
function route(req, res){
  switch(req.url){
    // 投稿とリダイレクト
    case '/posts':
        postsHandler.handle(req, res);
        break;
    // ログアウト
    case '/logout':
        util.handleLogout(req, res);
        break;
    default:
        // 見つからない場合
        util.handleNotFound(req, res);
        break;
  }
}

module.exports = {
  route
}