'use strict';

// sequelizeのモジュールを読み込む
const Sequelize = require('sequelize')
// postgresの設定を渡す
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost/secret_board',
  {
    logging: false,
    operatorsAliases: false 
  });

// データモデルをPostオブジェクトとして定義
const Post = sequelize.define('Post', {
    // 固有のidを定義
    id: {
      type: Sequelize.INTEGER,  // データの型
      autoIncrement: true,      // 自動的に増加するよう設定
      primaryKey: true          // 主キーに設定
    },
    // 投稿内容
    content: {
      type: Sequelize.TEXT
    },
    // 投稿者情報
    postedBy: {
      type: Sequelize.STRING
    },
    // トラッキングCookieの内容
    trackingCookie: {
      type: Sequelize.STRING
    }
  }, {
    // 定義したデータを保存する領域の名前をPostに固定
    freezeTableName: true,
    // 作成日時、更新日時を自動的に設定
    timestamps: true
});

// PostオブジェクトをDBに適用して同期を取るよう設定
Post.sync();

module.exports = Post;