// db.js
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'community'
};

async function connectDB() {
    return await mysql.createConnection(dbConfig);
}

module.exports = { connectDB };