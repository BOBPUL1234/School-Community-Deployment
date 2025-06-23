const { connectDB } = require('./db'); // 또는 본인 경로로 수정


async function clearAllDataBeforeDeploy() {
    const db = await connectDB();

    try {
        // 순서 중요!
        await db.execute("DELETE FROM likes");
        await db.execute("DELETE FROM bookmarks");
        await db.execute("DELETE FROM comments");
        await db.execute("DELETE FROM posts");
        console.log("✅ 데이터 초기화 완료!");
    } catch (err) {
        console.error("❌ 초기화 오류:", err);
    } finally {
        await db.end();
    }
}

clearAllDataBeforeDeploy();