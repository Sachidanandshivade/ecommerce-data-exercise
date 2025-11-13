import { createReadStream } from 'fs';
import { mkdir, rm } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(__dirname, 'ecommerce.db');

const sqlite = sqlite3.verbose();

const openDatabase = (filePath) =>
  new Promise((resolve, reject) => {
    const db = new sqlite.Database(filePath, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(db);
      }
    });
  });

const closeDatabase = (db) =>
  new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

const runQuery = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) {
        reject(error);
      } else {
        resolve(this);
      }
    });
  });

const execQuery = (db, sql) =>
  new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

const loadCsv = (fileName, converters = {}) =>
  new Promise((resolve, reject) => {
    const filePath = path.join(DATA_DIR, fileName);
    const rows = [];

    const stream = createReadStream(filePath).pipe(
      csv({
        mapHeaders: ({ header }) => header.trim(),
        mapValues: ({ value }) => (typeof value === 'string' ? value.trim() : value),
      })
    );

    stream
      .on('data', (rawRow) => {
        try {
          const convertedRow = Object.fromEntries(
            Object.entries(rawRow).map(([key, value]) => {
              const converter = converters[key];
              return [key, converter ? converter(value) : value];
            })
          );
          rows.push(convertedRow);
        } catch (error) {
          stream.destroy(
            new Error(
              `Failed to convert row in ${fileName}: ${error instanceof Error ? error.message : String(error)}`
            )
          );
        }
      })
      .on('end', () => resolve(rows))
      .on('error', (error) => reject(error));
  });

const toInteger = (value, fieldName) => {
  const result = Number.parseInt(value, 10);
  if (Number.isNaN(result)) {
    throw new Error(`Invalid integer value for ${fieldName}: "${value}"`);
  }
  return result;
};

const toFloat = (value, fieldName) => {
  const result = Number.parseFloat(value);
  if (Number.isNaN(result)) {
    throw new Error(`Invalid numeric value for ${fieldName}: "${value}"`);
  }
  return result;
};

const createTables = async (db) => {
  const dropStatements = [
    'DROP TABLE IF EXISTS payments;',
    'DROP TABLE IF EXISTS order_items;',
    'DROP TABLE IF EXISTS orders;',
    'DROP TABLE IF EXISTS products;',
    'DROP TABLE IF EXISTS customers;',
  ];

  const createStatements = [
    `CREATE TABLE IF NOT EXISTS customers (
      customer_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      signup_date TEXT NOT NULL,
      country TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS products (
      product_id INTEGER PRIMARY KEY,
      product_name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      stock_quantity INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS orders (
      order_id INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      order_date TEXT NOT NULL,
      total_amount REAL NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS order_items (
      order_item_id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS payments (
      payment_id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE ON UPDATE CASCADE
    );`,
  ];

  for (const statement of dropStatements) {
    await runQuery(db, statement);
  }

  for (const statement of createStatements) {
    await runQuery(db, statement);
  }
};

const insertData = async (db, tableName, columns, rows) => {
  if (!rows.length) {
    console.warn(`No rows to insert for ${tableName}. Skipping.`);
    return;
  }

  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

  await runQuery(db, 'BEGIN TRANSACTION');

  try {
    for (const row of rows) {
      const values = columns.map((column) => row[column]);
      await runQuery(db, sql, values);
    }
    await runQuery(db, 'COMMIT');
  } catch (error) {
    await runQuery(db, 'ROLLBACK');
    throw error;
  }
};

const main = async () => {
  let db;

  try {
    console.log('Preparing ecommerce database setup...');
    await mkdir(DATA_DIR, { recursive: true });
    await rm(DB_PATH, { force: true });

    db = await openDatabase(DB_PATH);
    await execQuery(db, 'PRAGMA foreign_keys = ON;');

    console.log('Creating tables...');
    await createTables(db);
    console.log('Tables created successfully.');

    console.log('Loading CSV data...');
    const [customers, products, orders, orderItems, payments] = await Promise.all([
      loadCsv('customers.csv', {
        customer_id: (value) => toInteger(value, 'customer_id'),
        name: (value) => value,
        email: (value) => value,
        signup_date: (value) => value,
        country: (value) => value,
      }),
      loadCsv('products.csv', {
        product_id: (value) => toInteger(value, 'product_id'),
        product_name: (value) => value,
        category: (value) => value,
        price: (value) => toFloat(value, 'price'),
        stock_quantity: (value) => toInteger(value, 'stock_quantity'),
      }),
      loadCsv('orders.csv', {
        order_id: (value) => toInteger(value, 'order_id'),
        customer_id: (value) => toInteger(value, 'customer_id'),
        order_date: (value) => value,
        total_amount: (value) => toFloat(value, 'total_amount'),
      }),
      loadCsv('order_items.csv', {
        order_item_id: (value) => toInteger(value, 'order_item_id'),
        order_id: (value) => toInteger(value, 'order_id'),
        product_id: (value) => toInteger(value, 'product_id'),
        quantity: (value) => toInteger(value, 'quantity'),
        unit_price: (value) => toFloat(value, 'unit_price'),
      }),
      loadCsv('payments.csv', {
        payment_id: (value) => toInteger(value, 'payment_id'),
        order_id: (value) => toInteger(value, 'order_id'),
        payment_method: (value) => value,
        payment_status: (value) => value,
        payment_date: (value) => value,
      }),
    ]);
    console.log('CSV data loaded.');

    console.log('Inserting customers...');
    await insertData(
      db,
      'customers',
      ['customer_id', 'name', 'email', 'signup_date', 'country'],
      customers
    );

    console.log('Inserting products...');
    await insertData(
      db,
      'products',
      ['product_id', 'product_name', 'category', 'price', 'stock_quantity'],
      products
    );

    console.log('Inserting orders...');
    await insertData(
      db,
      'orders',
      ['order_id', 'customer_id', 'order_date', 'total_amount'],
      orders
    );

    console.log('Inserting order items...');
    await insertData(
      db,
      'order_items',
      ['order_item_id', 'order_id', 'product_id', 'quantity', 'unit_price'],
      orderItems
    );

    console.log('Inserting payments...');
    await insertData(
      db,
      'payments',
      ['payment_id', 'order_id', 'payment_method', 'payment_status', 'payment_date'],
      payments
    );

    console.log('Database population completed successfully.');
  } catch (error) {
    console.error('Failed to set up ecommerce database:', error);
    process.exitCode = 1;
  } finally {
    if (db) {
      try {
        await closeDatabase(db);
        console.log(`Closed database connection at ${DB_PATH}.`);
      } catch (error) {
        console.error('Error closing database connection:', error);
      }
    }
  }
};

main();

