E-commerce Data Pipeline Exercise

A complete Node.js data pipeline that generates synthetic e-commerce data, loads it into a SQLite database, and performs complex SQL analysis with formatted reporting.



🚀 Features :


Synthetic Data Generation: Creates realistic e-commerce data using Faker.js

Database Ingestion: Loads CSV data into SQLite with proper relationships and foreign keys

SQL Analysis: Complex queries joining 4+ tables with aggregations

Formatted Output: Beautiful console tables for data visualization

Complete Workflow: End-to-end pipeline from data generation to insights


📁 Project Structure :



text
ecommerce-data-exercise/
├── data/                 # Generated CSV files
│   ├── customers.csv
│   ├── products.csv
│   ├── orders.csv
│   ├── order_items.csv
│   └── payments.csv
├── generate-data.js      # Synthetic data generation (50+ records each)
├── create-database.js    # SQLite database creation & data ingestion
├── run-queries.js        # SQL analysis & formatted reporting
├── main.js              # Complete workflow runner
├── package.json         # Project dependencies
├── ecommerce.db         # SQLite database (generated)
└── README.md           # Project documentation



🛠️** Quick Start:**


Prerequisites
Node.js (v14 or higher)

npm

Installation & Setup
Clone the repository

bash
git clone https://github.com/Sachidanandshivade/ecommerce-data-exercise.git
cd ecommerce-data-exercise
Install dependencies

bash
npm install
Run the complete pipeline

bash
npm start
Individual Scripts
bash
# Generate synthetic data only
npm run generate-data

# Create database and load data
npm run create-db

# Run SQL queries and analysis
npm run run-queries



**📊 Data Model**


The database schema includes 5 related tables:

customers (customer_id, name, email, signup_date, country)

products (product_id, product_name, category, price, stock_quantity)

orders (order_id, customer_id, order_date, total_amount)

order_items (order_item_id, order_id, product_id, quantity, unit_price)

payments (payment_id, order_id, payment_method, payment_status, payment_date)




**🔍 Analysis & Insights**




The pipeline generates comprehensive reports including:

📈 Business Intelligence
Customer Order Details: Complete order breakdown with products and payments

Top Customers: Ranking by total spending and order frequency

Product Performance: Best-selling products by revenue and quantity

Sales Trends: Monthly revenue and average order value analysis

Payment Analytics: Transaction success rates by payment method

Geographic Distribution: Customer and revenue distribution by country




**📋 Sample Queries**


Complex SQL joins across multiple tables:

sql
-- Customer orders with products and payments
SELECT c.name, o.order_date, p.product_name, oi.quantity, pay.payment_status
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
JOIN payments pay ON o.order_id = pay.order_id;



**🛠️ Technical Stack**


Runtime: Node.js

Database: SQLite3

Data Generation: Faker.js (@faker-js/faker)

Data Processing: CSV-parser

Development: Cursor IDE



**📋 Generated Data Specifications**


Customers: 50 unique customer profiles

Products: 30 products across 6 categories

Orders: 100+ order transactions
