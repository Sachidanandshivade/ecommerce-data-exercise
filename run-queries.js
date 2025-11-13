import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

const runAll = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
      } else {
        resolve(rows);
      }
    });
  });

const printTable = (title, rows) => {
  console.log(`\n=== ${title} ===`);
  if (!rows.length) {
    console.log('No results.');
    return;
  }
  console.table(rows);
};

const main = async () => {
  let db;

  try {
    console.log('Connecting to ecommerce database...');
    db = await openDatabase(DB_PATH);
    await runAll(db, 'PRAGMA foreign_keys = ON;');

    const detailedOrdersQuery = `
      SELECT
        c.name AS customer_name,
        c.country,
        DATE(o.order_date) AS order_date,
        ROUND(o.total_amount, 2) AS order_total_amount,
        GROUP_CONCAT(
          p.product_name || ' (qty: ' || oi.quantity || ')',
          '; '
        ) AS products_ordered,
        COALESCE(pay.payment_status, 'Unknown') AS payment_status
      FROM orders o
      INNER JOIN customers c ON c.customer_id = o.customer_id
      INNER JOIN order_items oi ON oi.order_id = o.order_id
      INNER JOIN products p ON p.product_id = oi.product_id
      LEFT JOIN payments pay ON pay.order_id = o.order_id
      GROUP BY o.order_id, c.customer_id, pay.payment_status
      ORDER BY o.order_date DESC
      LIMIT 25;
    `;

    const topCustomersQuery = `
      SELECT
        c.customer_id,
        c.name AS customer_name,
        c.country,
        ROUND(SUM(o.total_amount), 2) AS total_spent,
        COUNT(DISTINCT o.order_id) AS order_count
      FROM customers c
      INNER JOIN orders o ON o.customer_id = c.customer_id
      GROUP BY c.customer_id
      ORDER BY total_spent DESC
      LIMIT 10;
    `;

    const popularProductsQuery = `
      SELECT
        p.product_id,
        p.product_name,
        p.category,
        SUM(oi.quantity) AS total_quantity_sold,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS total_revenue
      FROM products p
      INNER JOIN order_items oi ON oi.product_id = p.product_id
      GROUP BY p.product_id
      ORDER BY total_quantity_sold DESC
      LIMIT 10;
    `;

    const monthlyRevenueQuery = `
      SELECT
        STRFTIME('%Y-%m', order_date) AS month,
        ROUND(SUM(total_amount), 2) AS total_revenue,
        COUNT(*) AS total_orders
      FROM orders
      GROUP BY month
      ORDER BY month DESC;
    `;

    console.log('Running analytics queries...');
    const [detailedOrders, topCustomers, popularProducts, monthlyRevenue] = await Promise.all([
      runAll(db, detailedOrdersQuery),
      runAll(db, topCustomersQuery),
      runAll(db, popularProductsQuery),
      runAll(db, monthlyRevenueQuery),
    ]);

    printTable('Recent Orders With Details', detailedOrders);
    printTable('Top 10 Customers by Total Spending', topCustomers);
    printTable('Most Popular Products by Quantity Sold', popularProducts);
    printTable('Monthly Sales Revenue', monthlyRevenue);

    console.log('\nFinished executing analytics queries.');
  } catch (error) {
    console.error('Failed to run analytics queries:', error);
    process.exitCode = 1;
  } finally {
    if (db) {
      try {
        await closeDatabase(db);
        console.log('Closed database connection.');
      } catch (error) {
        console.error('Error closing database connection:', error);
      }
    }
  }
};

main();

