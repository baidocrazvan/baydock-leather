-- Create tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  confirmation_token VARCHAR(100),
  confirmation_token_expires TIMESTAMP,
  reset_token VARCHAR(100),
  reset_token_expires TIMESTAMP,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE shipping_methods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  base_price NUMERIC(6,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  min_days INTEGER,
  max_days INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  detailed_description TEXT,
  price NUMERIC(6,2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  size_options JSONB,
  stock INTEGER CHECK (stock >= 0) NOT NULL, -- CHECK constraint because stock cannot be negative --
  images TEXT[] NOT NULL,
  thumbnail TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE carts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER CHECK (quantity > 0),
  selected_size VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pending_carts (
  user_email VARCHAR(100) PRIMARY KEY,
  cart_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  subtotal NUMERIC(6,2),
  total_price NUMERIC(6,2),
  shipping_address_id INTEGER REFERENCES shipping_addresses(id),
  billing_address_id INTEGER REFERENCES shipping_addresses(id),
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  payment_method VARCHAR(10) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card')),
  shipping_method_id INTEGER REFERENCES shipping_methods(id),
  shipping_cost NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price NUMERIC(6,2) NOT NULL,
  selected_size VARCHAR(20)
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

CREATE INDEX idx_users_confirmation_token ON users(confirmation_token);
CREATE INDEX idx_users_email_created ON users(email, created_at);
CREATE INDEX idx_pending_carts_created ON pending_carts(created_at);
CREATE INDEX idx_users_reset_token ON users(reset_token);

-- INSERT statements
-- Demo accounts
INSERT INTO users (first_name, last_name, email, password, is_confirmed, role) 
VALUES 
  ('Admin', 'Demo', 'admin@demo.com', '$2b$10$1BOpsKA9YApfqyuyA8cnsO2wYoBEvOUKI5b673OxjUErnVRet71M2', true, 'admin'),
  ('User', 'Demo', 'user@demo.com', '$2b$10$M1x8DhfU2Vlf4Ituhf3Mm.LvaCFwjrLaMMbGjgvuO.7iclPjo3ip.', true, 'user'),
  ('Carl', 'Johnson', 'carl.johnson@example.com', '$2a$10$exampleHash1234567890ABCDEFGHIJKLMNOPQR', true, 'user'),
  ('Ema', 'Watson', 'emma.w@example.com', '$2a$10$exampleHash1234567890ABCDEFGHIJKLMNOPQR', true, 'user');

-- Demo Products
INSERT INTO products (name, description, detailed_description, price, category, thumbnail, images, stock, is_active)
VALUES
  (
  'BROWN CLASSIC BL01',
  'Classic dark brown belt with a gold-accented buckle.',
  'Who says bold can’t also be classy? This classic dark brown leather belt is created for the ones who don’t compromise. Utmost style and luxury, fit for every occasion.',
  54.99,
  'belts',
  '/images/products/belt1-1.png',
  ARRAY['/images/products/belt-sizing.png'],
  100,
  true
  ),
  (
  'BROWN CLASSIC BL02',
  'Classic dark brown belt with silver-accent buckle.',
  'This cognac brown leather belt is a throwback to the classics. Beautiful simplicity and complete utility. Leather thickness: 3.6mm-3.8mm / Buckle width: 4.5-5cm.',
  54.99,
  'belts',
  '/images/products/belt3-1.png',
  ARRAY['/images/products/belt-sizing.png'],
  100,
  true
  ),
  (
  'BROWN CLASSIC BL03',
  'Dark brown belt with round gold accent buckle.',
  'They say not all that glitters is gold, but this is close enough. Leather thickness: 3.6mm-3.8mm / Buckle width: 4.5-5cm.',
  54.99,
  'belts',
  '/images/products/belt5-1.png',
  ARRAY['/images/products/belt-sizing.png'],
  100,
  true
  ),
  (
  'BLACK CLASSIC BL01',
  'Classic dyed black leather belt with silver rectangular buckle ',
  'Who says bold can’t also be classy? This classic black leather belt is created for the ones who don’t compromise. Utmost style and luxury, fit for every occasion. Leather thickness: 3.6mm-3.8mm / Buckle width: 4.5-5cm.',
  54.99,
  'belts',
  '/images/products/belt4-1.png',
  ARRAY['/images/products/belt-sizing.png'],
  100,
  true
  ),
  (
  'BLACK CLASSIC BL02',
  'Classic black-dyed belt with a silver accent buckle.',
  'Who says bold can’t also be classy? This classic black leather belt is created for the ones who don’t compromise. Utmost style and luxury, fit for every occasion. Leather thickness: 3.6mm-3.8mm / Buckle width: 4.5-5cm.',
  54.99,
  'belts',
  '/images/products/belt2-1.png',
  ARRAY['/images/products/belt-sizing.png'],
  100,
  true
  ),
  (
  'BROWN BIFOLD WL01',
  'Dark brown textured bifold wallet.',
  'Crafted from the finest quality genuine leather, this wallet has a soft and pleasant to the touch texture. The natural leather offers a unique and distinctive look, and the dark brown is a classic and versatile color choice that will go perfectly with any style of dress.',
  40,
  'wallets',
  '/images/products/wallet1-1.png',
  ARRAY[
    '/images/products/wallet1-2.png',
    '/images/products/wallet1-3.png',
    '/images/products/wallet1-4.png',
    '/images/products/wallet1-5.png'
  ],
  100,
  true
  ),
  (
  'BROWN TRIFOLD WL02',
  'Dark brown trifold biker wallet.',
  'Are you feeling brave? Or maybe dangerous? Keep your belongings close to you with this meticulously crafted biker wallet. Comes with a chain so that you can be sure it’ll never fall off when riding.',
  55,
  'wallets',
  '/images/products/wallet2-1.png',
  ARRAY[
    '/images/products/wallet2-2.png',
    '/images/products/wallet2-3.png',
    '/images/products/wallet2-4.png',
    '/images/products/wallet2-5.png'
  ],
  100,
  true
  ),
  (
  'BROWN BACKPACK BPL01',
  'Leather backpack designed for urban environments.',
  'With simple and minimalist design, this backpack is suitable for everyone. It has a interior section and enough storage space to carry an essential accessories for work and daily activities. Leather webbing straps are adjustable. Height x Width x Depth: 35cm/25cm/13.5cm',
  145,
  'bags',
  '/images/products/bag1-1.png',
  ARRAY[
    '/images/products/wallet1-2.png',
    '/images/products/wallet1-3.png',
    '/images/products/wallet1-4.png',
    '/images/products/wallet1-5.png'
  ],
  100,
  true
  ),
  (
  'BLACK WSL01',
  'Carefully crafted black color watch strap.',
  'Edges are hand burnished and stitches are sewn with black thread. This black color watch strap comes with silver color buckle. Available in a variety of widths.',
  25,
  'watchstraps',
  '/images/products/watchstrap1-1.png',
  ARRAY['/images/products/watchstrap-sizing.png'],
  100,
  true
  ),
  (
  'BROWN WSL01',
  'Carefully crafted brown color watch strap.',
  'Edges are hand burnished and stitches are sewn with brown thread. This black color watch strap comes with silver color buckle. Available in a variety of widths.',
  25,
  'watchstraps',
  '/images/products/watchstrap2-1.png',
  ARRAY['/images/products/watchstrap-sizing.png'],
  100,
  true
  ),
  (
  'BROWN WSL02',
  'Carefully crafted reddish-brown color watch strap.',
  'Edges are hand burnished and stitches are sewn with black thread. This color of watch strap comes with silver color buckle. Available in a variety of widths.',
  25,
  'watchstraps',
  '/images/products/watchstrap3-1.png',
  ARRAY['/images/products/watchstrap-sizing.png'],
  100,
  true
  ),
  (
  'BROWN WSL03',
  'Carefully crafted dark brown color watch strap.',
  'Edges are hand burnished and stitches are sewn with brown thread. This color of watch strap comes with silver color buckle. Available in a variety of widths.',
  25,
  'watchstraps',
  '/images/products/watchstrap4-1.png',
  ARRAY['/images/products/watchstrap-sizing.png'],
  100,
  true
  ),
  (
  'BROWN CARDHOLDER ML01',
  'Modern minimalist card holder',
  'Its slim profile does not include any buttons or rivets, making it sleek, simple, minimalist, and reliable. This wallet can hold up to 10 cards in the main compartment and features a pocket on the back for easy access to your cards or cash.  Size: 90 x 60 mm.',
  35,
  'minimalist',
  '/images/products/minimalist1-1.png',
  ARRAY[
  '/images/products/minimalist1-2.png',
  '/images/products/minimalist1-3.png'
  ],
  100,
  true
  ),
  (
  'BROWN CARDHOLDER ML02',
  'Modern minimalist card holder',
  'Its slim profile includes only one button, making it sleek, simple, minimalist, and reliable. This wallet can hold up to 7 cards in the main compartment and features enough space for easy access to your cards or cash.  Size: 90 x 60 mm.',
  35,
  'minimalist',
  '/images/products/minimalist2-1.png',
  ARRAY[
  '/images/products/minimalist2-2.png',
  '/images/products/minimalist2-3.png',
  '/images/products/minimalist2-4.png'
  ],
  100,
  true
  ),
  (
  'TOBACCO POUCH AL01',
  'Distressed leather tobacco pouch.',
  'A stylish and practical solution for carrying your preferred tobacco blends. The interior is lined to preserve freshness, keeping your tobacco secure and ready for your enjoyment. The distressed leather not only exudes a rugged charm but also ensures the pouch ages gracefully, developing a unique patina over time. This makes each pouch as distinctive as the flavors you appreciate. Measurements: 16cm / 9cm.',
  40,
  'accessories',
  '/images/products/accessory1-1.png',
  ARRAY[
  '/images/products/minimalist1-2.png',
  '/images/products/minimalist1-3.png'
  ],
  100,
  true
  ),
  (
  'GLASSES CASE AL02',
  'Luxury leather sunglass case. ',
  'A secure nest for most eyeglasses, sunglasses, prescription glasses.Soft suede lining all over the interior. Completely scratch proof for lenses. Fits all Aviator and Wayfarer sunglasses frames. Gets better with use, developing a unique patina over time.',
  50,
  'accessories',
  '/images/products/accessory2-1.png',
  ARRAY['/images/products/minimalist2-2.png'],
  100,
  true
  );
  

-- Shipping methods
INSERT INTO shipping_methods (id, name, description, base_price, is_active, min_days, max_days, created_at)
VALUES
  (1, 'Cargus', 'Courier Delivery', 19.99, true, 1, 2, NOW()),
  (2, 'Posta Romana', 'Standard Delivery', 10, true, 3, 7, NOW());

-- Demo Addresses
INSERT INTO shipping_addresses (user_id, first_name, last_name, address, city, county, country, postal_code, phone_number, is_shipping, is_billing, is_active)
VALUES
  -- Demo Admin's addresses
  (1, 'Admin', 'Demo', 'Str Principala, nr. 49', 'Oradea', 'Bihor', 'Romania', '10456', '+4077198832', true, true, true),
  -- Demo User's addresses
  (2, 'User', 'Demo', 'Str Nufarului, nr. 50', 'Oradea', 'Bihor', 'Romania', '10654', '+4077132922', true, false, true),
  (2, 'User', 'Demo', 'Str. Ioan Slavici, nr. 3', 'Sanmartin', 'Bihor', 'Romania', '417495', '+4077132922', false, true, true),
  
  -- John Smith's addresses
  (3, 'Carl', 'Johnson', 'Str. Grove, nr. 7', 'Cluj-Napoca', 'Cluj', 'Romania', '20654', '+0447323922', true, false, true),
  (3, 'Carl', 'Johson', 'Str. Facliei nr. 7', 'Brasov', 'Brasov', 'Romania', '30654', '+0447323922', false, true, true),
  
  -- Emma Johnson's addresses
  (4, 'Emma', 'Watson', 'Str. Republicii, Bl. R3', 'Iasi', 'Iasi', 'Romania', '75008', '+40123456789', true, true, true),
  (4, 'Emma', 'Johnson', 'Str. Foisorului, nr. 44', 'Domnesti', 'Ilfov', 'Romania', '800008', '+40123456789', false, false, false);

-- Demo Orders
INSERT INTO orders (user_id, subtotal, total_price, status, shipping_address_id, billing_address_id, payment_method, shipping_method_id, shipping_cost, created_at)
VALUES
  -- Demo User's order
  (2, 149.98, 149.98, 'Pending', 2, 2, 'cash', 1, 0, NOW()),
  
  -- Carl's order
  (3, 195.98, 195.98, 'Processing', 4, 5, 'cash', 1, 0, NOW() - INTERVAL '2 days'),
  
  -- Emma's order
  (4, 80.00, 99.99, 'Shipped', 6, 6, 'cash', 1, 19.99, NOW() - INTERVAL '1 day');

-- Demo Order Items
INSERT INTO order_items (order_id, product_id, quantity, price, selected_size)
VALUES
  -- Demo User's items (belt + wallet)
  (1, 1, 1, 54.99, '100cm'),
  (1, 6, 1, 40.00, null),
  
  -- Carl's items (backpack + watch strap)
  (2, 8, 1, 145.00, null),
  (2, 10, 2, 25.00, '22mm'),
  
  -- Emma's items (2 minimalist wallets)
  (3, 13, 1, 35.00, null),
  (3, 14, 1, 35.00, null);

