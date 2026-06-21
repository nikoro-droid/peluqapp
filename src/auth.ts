import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { db } from "./db";
import type { JwtPayload, Rol } from "./types";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const jwtSecret = process.env.JWT_SECRET ?? "dev-secret-change-me";
const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? "8h";

function signToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: jwtExpiresIn as SignOptions["expiresIn"] };
  return jwt.sign(payload, jwtSecret, options);
}

function isJwtPayload(value: unknown): value is JwtPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<JwtPayload>;
  return (candidate.rol === "superadmin" || candidate.rol === "negocio") && typeof candidate.email === "string";
}

export function login(req: Request, res: Response): void {
  const { email, password } = req.body as { email?: string; password?: string };
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    res.status(400).json({ error: "email_y_password_requeridos" });
    return;
  }

  const superEmail = process.env.SUPERADMIN_EMAIL;
  const superPassword = process.env.SUPERADMIN_PASSWORD;
  if (superEmail && superPassword && normalizedEmail === superEmail.trim().toLowerCase() && password === superPassword) {
    res.json({ token: signToken({ rol: "superadmin", email: normalizedEmail }), rol: "superadmin" satisfies Rol, nombre: "Superadmin" });
    return;
  }

  const negocio = db.getNegocioByEmail(normalizedEmail);
  if (!negocio || !bcrypt.compareSync(password, negocio.password_hash)) {
    res.status(401).json({ error: "credenciales_invalidas" });
    return;
  }

  res.json({ token: signToken({ rol: "negocio", email: negocio.email, negocio_id: negocio.id }), rol: "negocio" satisfies Rol, negocio_id: negocio.id, nombre: negocio.nombre });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "token_requerido" });
    return;
  }
  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (!isJwtPayload(decoded)) {
      res.status(401).json({ error: "token_invalido" });
      return;
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "token_invalido" });
  }
}

export function requireSuperadmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.rol !== "superadmin") {
      res.status(403).json({ error: "requiere_superadmin" });
      return;
    }
    next();
  });
}

export function requireNegocio(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.rol !== "negocio" || typeof req.user.negocio_id !== "number") {
      res.status(403).json({ error: "requiere_negocio" });
      return;
    }
    next();
  });
}
