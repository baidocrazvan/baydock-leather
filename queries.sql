-- User table --
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name NOT NULL,
  last_name NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(6,2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  stock INTEGER CHECK (stock >= 0) NOT NULL, -- CHECK constraint because stock cannot be negative --
  images TEXT[] NOT NULL,
  thumbnail TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE carts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  total_price NUMERIC(6,2),
  shipping_address_id INTEGER REFERENCES shipping_addresses(id),
  billing_address_id INTEGER REFERENCES shipping_addresses(id),
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  payment_method VARCHAR(10) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price NUMERIC(6,2) NOT NULL
);

CREATE TABLE shipping_addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- For soft delete --
  is_shipping BOOLEAN DEFAULT false,
  is_billing BOOLEAN DEFAULT false,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  county VARCHAR(100),
  country VARCHAR(255) NOT NULL DEFAULT 'Romania',
  postal_code VARCHAR(20) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP -- For soft delete --
);

-- Session table from connect-pg-simple docs --
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "IDX_session_expire" ON "session" ("expire");