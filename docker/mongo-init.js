// MongoDB birinchi marta ishga tushganda ishlaydi.
// Application user yaratamiz va indexlarni e'lon qilamiz.

const dbName = process.env.MONGO_INITDB_DATABASE || 'nazoratchi';

db = db.getSiblingDB(dbName);

// Application user (root emas) — bot shu user bilan ulanadi.
// Production da bu username/passwordni .env dan o'zgartiring.
db.createUser({
  user: 'nazoratchi_app',
  pwd: 'nazoratchi_app_dev_password',
  roles: [{ role: 'readWrite', db: dbName }],
});

print(`[mongo-init] '${dbName}' database tayyorlandi`);
