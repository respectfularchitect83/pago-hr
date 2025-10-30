
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, createUser, findUserByEmail, findUserByEmployeeId, validatePassword } from '../models/user';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user
    const user = await createUser({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      role: role || 'employee'
    });

    // Generate token
    const jwtPayload = { id: user.id, role: user.role };
    const jwtSecret = process.env.JWT_SECRET!;
    let token: string;
    const expiresIn = process.env.JWT_EXPIRES_IN;
    if (expiresIn) {
      const expiresInNum = Number(expiresIn);
      if (!isNaN(expiresInNum)) {
        token = jwt.sign(jwtPayload, jwtSecret, { expiresIn: expiresInNum });
      } else if (/^\d+[smhd]$/.test(expiresIn)) {
        token = jwt.sign(jwtPayload, jwtSecret, { expiresIn: expiresIn as unknown as import('ms').StringValue });
      } else {
        token = jwt.sign(jwtPayload, jwtSecret);
      }
    } else {
      token = jwt.sign(jwtPayload, jwtSecret);
    }

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        photoUrl: user.photo_url,
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // Debug: log the login request body
    console.log('LOGIN REQUEST BODY:', req.body);
    const { email, employeeId, password } = req.body;

    if (!email && !employeeId) {
      return res.status(400).json({ error: 'Email or employee ID is required' });
    }

    // Find user by email first, then by employee ID if provided
    let user: User | null = null;
    if (email) {
      user = await findUserByEmail(email);
    }
    if (!user && employeeId) {
      user = await findUserByEmployeeId(employeeId);
    }
    console.log('USER FROM DB:', user);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate password
    const isValid = await validatePassword(user, password);
    console.log('PASSWORD VALID:', isValid);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const loginPayload = { id: user.id, role: user.role };
    const loginSecret = process.env.JWT_SECRET!;
    let token: string;
    const loginExpiresIn = process.env.JWT_EXPIRES_IN;
    if (loginExpiresIn) {
      const loginExpiresInNum = Number(loginExpiresIn);
      if (!isNaN(loginExpiresInNum)) {
        token = jwt.sign(loginPayload, loginSecret, { expiresIn: loginExpiresInNum });
      } else if (/^\d+[smhd]$/.test(loginExpiresIn)) {
        token = jwt.sign(loginPayload, loginSecret, { expiresIn: loginExpiresIn as unknown as import('ms').StringValue });
      } else {
        token = jwt.sign(loginPayload, loginSecret);
      }
    } else {
      token = jwt.sign(loginPayload, loginSecret);
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        employeeId: user.employee_id,
        department: user.department,
        position: user.position,
        photoUrl: user.photo_url,
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const user = req.user;
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      employeeId: user.employee_id,
      department: user.department,
      position: user.position,
      joinDate: user.join_date,
      photoUrl: user.photo_url,
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Error fetching profile' });
  }
};
