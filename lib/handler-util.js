'use strict';

// ログアウト関数
function handleLogout(req, res){
    res.writeHead(401, {
        'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end('ログアウトしました');
}

// 404-Not Foundを返す関数
function handleNotFound(req, res){
    res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end('ページが見つかりません');
}

// 400-Bad Requestを返す関数
function handleBadRequest(req, res){
    res.writeHead(400, {
        'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end('未対応のメソッドです');
}

module.exports = {
    handleLogout,
    handleNotFound,
    handleBadRequest
};