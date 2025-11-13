import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { faker } from '@faker-js/faker';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const RECORD_MIN = 50;
const RECORD_MAX = 100;

const randomCount = () => faker.number.int({ min: RECORD_MIN, max: RECORD_MAX });

const formatDate = (date) => date.toISOString().split('T')[0];

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const convertToCsv = (records, headers) => {
  const headerLine = headers.join(',');
  const rows = records.map((record) =>
    headers.map((header) => escapeCsvValue(record[header])).join(',')
  );

  return [headerLine, ...rows].join('\n');
};

const generateCustomers = (count) =>
  Array.from({ length: count }, (_, idx) => {
    const signupDate = faker.date.past({ years: 2 });

    return {
      customer_id: idx + 1,
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      signup_date: formatDate(signupDate),
      country: faker.location.country(),
    };
  });

const generateProducts = (count) => {
  const categories = [
    'Electronics',
    'Home & Kitchen',
    'Books',
    'Clothing',
    'Sports & Outdoors',
    'Beauty',
    'Toys',
    'Automotive',
  ];

  return Array.from({ length: count }, (_, idx) => {
    const priceValue = Number(
      faker.commerce.price({ min: 10, max: 500, dec: 2 })
    );

    return {
      product_id: idx + 1,
      product_name: faker.commerce.productName(),
      category: faker.helpers.arrayElement(categories),
      price: priceValue.toFixed(2),
      stock_quantity: faker.number.int({ min: 0, max: 500 }),
    };
  });
};

const generateOrders = (count, customerCount) => {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);

  return Array.from({ length: count }, (_, idx) => {
    const orderDate = faker.date.between({
      from: startDate,
      to: new Date(),
    });

    return {
      order_id: idx + 1,
      customer_id: faker.number.int({ min: 1, max: customerCount }),
      order_date: orderDate.toISOString(),
      total_amount: 0,
    };
  });
};

const generateOrderItems = (orders, products, targetCount) => {
  const orderItems = [];
  const safeTargetCount = Math.max(targetCount, orders.length);
  let nextOrderItemId = 1;

  const addOrderItem = (order) => {
    const product = faker.helpers.arrayElement(products);
    const quantity = faker.number.int({ min: 1, max: 5 });
    const unitPrice = Number(product.price);

    const orderItem = {
      order_item_id: nextOrderItemId++,
      order_id: order.order_id,
      product_id: product.product_id,
      quantity,
      unit_price: unitPrice.toFixed(2),
    };

    orderItems.push(orderItem);
    order.total_amount += quantity * unitPrice;
  };

  for (const order of orders) {
    if (orderItems.length >= safeTargetCount) {
      break;
    }
    addOrderItem(order);
  }

  while (orderItems.length < safeTargetCount) {
    const order = faker.helpers.arrayElement(orders);
    addOrderItem(order);
  }

  for (const order of orders) {
    order.total_amount = order.total_amount.toFixed(2);
  }

  return orderItems;
};

const generatePayments = (orders) => {
  const paymentMethods = [
    'Credit Card',
    'Debit Card',
    'PayPal',
    'Bank Transfer',
    'Gift Card',
  ];
  const paymentStatuses = ['Completed', 'Pending', 'Failed'];

  return orders.map((order, idx) => {
    const status = faker.helpers.arrayElement(paymentStatuses);
    const orderDate = new Date(order.order_date);
    const paymentDate =
      status === 'Pending'
        ? orderDate
        : faker.date.between({
            from: orderDate,
            to: new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          });

    return {
      payment_id: idx + 1,
      order_id: order.order_id,
      payment_method: faker.helpers.arrayElement(paymentMethods),
      payment_status: status,
      payment_date: paymentDate.toISOString(),
    };
  });
};

const writeCsvFile = async (fileName, headers, records) => {
  const csvContent = convertToCsv(records, headers);
  const filePath = path.join(DATA_DIR, fileName);

  await writeFile(filePath, csvContent, 'utf8');
  console.log(`Created ${filePath}`);
};

const generateAndSaveData = async () => {
  const customerCount = randomCount();
  const productCount = randomCount();
  const orderCount = randomCount();
  const orderItemCount = Math.max(randomCount(), orderCount);

  const customers = generateCustomers(customerCount);
  const products = generateProducts(productCount);
  const orders = generateOrders(orderCount, customerCount);
  const orderItems = generateOrderItems(orders, products, orderItemCount);
  const payments = generatePayments(orders);

  const datasets = [
    {
      fileName: 'customers.csv',
      headers: [
        'customer_id',
        'name',
        'email',
        'signup_date',
        'country',
      ],
      records: customers,
    },
    {
      fileName: 'products.csv',
      headers: [
        'product_id',
        'product_name',
        'category',
        'price',
        'stock_quantity',
      ],
      records: products,
    },
    {
      fileName: 'orders.csv',
      headers: [
        'order_id',
        'customer_id',
        'order_date',
        'total_amount',
      ],
      records: orders,
    },
    {
      fileName: 'order_items.csv',
      headers: [
        'order_item_id',
        'order_id',
        'product_id',
        'quantity',
        'unit_price',
      ],
      records: orderItems,
    },
    {
      fileName: 'payments.csv',
      headers: [
        'payment_id',
        'order_id',
        'payment_method',
        'payment_status',
        'payment_date',
      ],
      records: payments,
    },
  ];

  await mkdir(DATA_DIR, { recursive: true });

  for (const dataset of datasets) {
    await writeCsvFile(dataset.fileName, dataset.headers, dataset.records);
  }

  console.log('Synthetic ecommerce data generated successfully.');
};

const main = async () => {
  try {
    await generateAndSaveData();
  } catch (error) {
    console.error('Failed to generate synthetic data:', error);
    process.exitCode = 1;
  }
};

main();

