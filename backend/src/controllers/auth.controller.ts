import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { JwtPayload } from '../utils/jwt';

/* ---------- REGISTER ---------- */
export const register = async (req: Request, res: Response) => {
  const { email, password, name, role, bio, avatarUrl } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ message: 'email, password, name, role are required' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ message: 'Email already registered' });

  // Limit to one account per role
  const existingRole = await prisma.user.findFirst({ where: { role } });
  if (existingRole) {
    return res.status(400).json({ message: `A user with the ${role} role already exists.` });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role, bio, avatarUrl },
  });

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });

  return res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
    },
  });
};

/* ---------- LOGIN ---------- */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ message: 'Invalid credentials' });

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
    },
  });
};

/* ---------- GET ME ---------- */
export const getMe = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      _count: { select: { posts: true, comments: true } },
    },
  });
  return res.json(user);
};

/* ---------- UPDATE PROFILE ---------- */
export const updateProfile = async (req: Request, res: Response) => {
  const { name, bio, avatarUrl } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { name, bio, avatarUrl },
    select: {
      id: true, email: true, name: true, role: true,
      avatarUrl: true, bio: true, createdAt: true,
    },
  });
  return res.json(user);
};

/* ---------- GET USER BY ID ---------- */
export const getUserById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, role: true,
      avatarUrl: true, bio: true, createdAt: true,
      _count: { select: { posts: true, comments: true } },
    },
  });
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json(user);
};

/* ---------- LIST ALL USERS ---------- */
export const listUsers = async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, avatarUrl: true, email: true },
  });
  return res.json(users);
};
