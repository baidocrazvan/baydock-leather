import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../../app.js';
import passport from 'passport';
import db from '../../db.js';
import bcrypt from 'bcryptjs';

// Mock the database and bcrypt
vi.mock('../../db.js');
vi.mock('bcryptjs');
vi.mock("../../middleware/middleware.js", () => ({
    authenticate: (req, res, next) => {
      req.user = {
        id: 1,
        first_name: "Johnny",
        last_name: "Test",
        email: "test@example.com",
        role: "admin"
      };
      req.isAuthenticated = () => true;
      next();
    },
    isAdmin: (req, res, next) => next(),
    redirectIfAuthenticated: (req, res, next) => next(),
}));

describe('Auth Routes', () => {
  let testSession;

  beforeEach(() => {
    // Create a new session for each test
    testSession = request.agent(app);
    vi.clearAllMocks();
    
  });

  // Test data
  const mockUser = {
    id: 1,
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    password: 'hashedpassword',
    role: 'user',
  };

  describe('GET Routes', () => {
    it('should render the login page', async () => {
      const res = await testSession
        .get('/auth/login')
        .expect(200)
        .expect('Content-Type', /html/);

      expect(res.text).toContain('Login'); // Check if the login page is rendered
    });

    it('should render the register page', async () => {
      const res = await testSession
        .get('/auth/register')
        .expect(200)
        .expect('Content-Type', /html/);

      expect(res.text).toContain('Register'); // Check if the register page is rendered
    });
  });

  describe('POST /register', () => {
    it('should register a new user', async () => {
      // Mock database responses
      db.query
        .mockResolvedValueOnce({ rows: [] }) // No existing user
        .mockResolvedValueOnce({ rows: [mockUser] }); // Successful insert

      // Mock bcrypt hash
      bcrypt.hash.mockImplementation((password, saltRounds, callback) => {
        // Simulate successful hashing
        callback(null, 'hashedpassword'); 
      });

      const res = await testSession
        .post('/auth/register')
        .type('form')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'Password123',
          cpassword: 'Password123',
        })
        .expect(302) // Redirect
        .expect('Location', '/');

      // Verify database was called correctly
      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO users (first_name, last_name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        ['Test', 'User', 'test@example.com', 'hashedpassword', 'user']
      );
    });

    it('should reject mismatched passwords', async () => {
      const res = await testSession
        .post('/auth/register')
        .type('form')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'Password123',
          cpassword: 'DifferentPassword',
        })
        .expect(302) // Redirect
        .expect('Location', '/auth/register');

      // Verify no database calls were made
      // Expect only one call, the session query
      expect(db.query).toHaveBeenCalled(1);
      // Verify it's a session query
      expect(db.query.mock.calls[0][0]).toContain('INSERT INTO "session"');
    });

    it('should reject an existing email', async () => {
      // Mock database response for existing user
      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      const res = await testSession
        .post('/auth/register')
        .type('form')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'Password123',
          cpassword: 'Password123',
        })
        .expect(302) // Redirect
        .expect('Location', '/auth/register');

      // Verify database was called to check for existing user
      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );

      // Verify no insert was made
      expect(db.query).not.toHaveBeenCalledWith(
        'INSERT INTO users (first_name, last_name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING *'
      );
    });
  });

  describe('POST /login', () => {
    
    // Mock user data
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedpassword',
      first_name: 'Test',
      last_name: 'User'
    };
  
    it('should login with valid credentials', async () => {
      // Mock the database response for Passport
      db.query.mockImplementation(async (query, params) => {
        if (query.includes('SELECT * FROM users WHERE email')) {
          return { rows: [mockUser] };
        }
        return { rows: [] };
      });
  
      // Mock bcrypt.compare to return true
      bcrypt.compare.mockImplementation((password, hash, callback) => {
        callback(null, true);
      });
  
      const res = await testSession
        .post('/auth/login')
        .type('form')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        })
        .expect(302)
        .expect('Location', '/');
  
      // Verify session was established
      expect(res.headers['set-cookie']).toBeDefined();
    });
  
    it('should reject invalid credentials', async () => {
      // Mock the database response
      db.query.mockResolvedValue({ rows: [mockUser] });
  
      // Mock bcrypt.compare to return false
      bcrypt.compare.mockImplementation((password, hash, callback) => {
        callback(null, false);
      });
  
      const res = await testSession
        .post('/auth/login')
        .type('form')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(302)
        .expect('Location', '/auth/login');
    });
  });
  
});

