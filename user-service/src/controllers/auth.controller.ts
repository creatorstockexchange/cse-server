import type { Request, Response } from "express";
import type authSchema from "../schema/auth.schema.js";

import * as z from "zod";
import { prisma } from "../db.js";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import Send from "../utils/response.utils.js";
import { JWT_SECRET } from "../config.js";
import AuthRequest from "../types/authRequest.type.js";

class AuthController {
    static login = async (req: Request, res: Response) => {
        const { email, password } = req.body as z.infer<typeof authSchema.login>;
        try {
            const user = await prisma.user.findFirst({
                where: {
                    email
                }
            })

            if(!user) {
                return Send.error(res, null, "User not found.");
            }

            const isPasswordValid = await argon2.verify(user.password, password);
            if(!isPasswordValid) {
                return Send.error(res, null, "Invalid credentials.");
            }

            const token = jwt.sign(
                { userId: user.id },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.cookie("jwt_token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 60 * 60 * 1000,
                sameSite: "strict"
            })

            return Send.success(res, {
                id: user.id,
                name: user.name,
                email: user.email,
                token
            });

        } catch(error) {

        }
    }

    static register = async (req: Request, res: Response) => {
        const { name, email, password, role } = req.body as z.infer<typeof authSchema.register>;
        try {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email
                }
            });

            if(existingUser) {
                return Send.error(res, null, "Email already in use.");
            }

            const hashedPassword = await argon2.hash(password);

            const newUser = await prisma.user.create({
                data: {
                    name,
                    email,
                    role: role,
                    password: hashedPassword
                }
            });

            return Send.success(res, {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            });

        } catch(error) {
            return Send.error(res, null, "Registration failed.");
        }
    }

    static logout = (req: AuthRequest, res: Response) => {
        try {
            res.clearCookie("jwt_token", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict"
            })
        } catch (error) {
            return Send.error(res, null, "Logout failed.");
        }
    }
}

export default AuthController;