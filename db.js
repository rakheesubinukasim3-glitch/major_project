const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function connect() {
    if (db) return db;
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    db = client.db(); // uses DB name from URI or defaults
    console.log('✅ Connected to MongoDB:', process.env.MONGO_URI);

    // Create indexes for data integrity
    await db.collection('students').createIndex({ studentId: 1 }, { unique: true });
    await db.collection('attendance').createIndex({ studentId: 1, date: 1, period: 1 }, { unique: true });
    await db.collection('fines').createIndex({ studentId: 1, date: 1 }, { unique: true });
    await db.collection('admins').createIndex({ email: 1 }, { unique: true });
    await db.collection('faculties').createIndex({ email: 1 }, { unique: true });

    return db;
}

function getDb() {
    if (!db) throw new Error('Database not connected. Call connect() first.');
    return db;
}

module.exports = { connect, getDb };
