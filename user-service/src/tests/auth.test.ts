import { describe, expect, test, beforeEach, afterEach, jest } from "@jest/globals";
import AuthController from "../controllers/auth.controller";
import { prisma } from "../db";
import argon2 from "argon2";

describe("register user", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("should register a new user", async () => {
        const req: any = {
            body: {
                name: "Test User",
                email: "test@user.com",
                password: "testUser@123",
                role: "user"
            }
        };

        const json = jest.fn();
        const status = jest.fn().mockReturnValue({ json });
        const res: any = { status };

        // mock prisma and argon2
        const findFirstSpy = jest.spyOn(prisma.user as any, "findFirst").mockResolvedValue(null);
        const hashed = "hashed-password";
        const hashSpy = jest.spyOn(argon2, "hash").mockResolvedValue(hashed as any);

        const createdUser = { id: "abc123", name: req.body.name, email: req.body.email, password: hashed };
        const createSpy = jest.spyOn(prisma.user as any, "create").mockResolvedValue(createdUser as any);

        await AuthController.register(req, res);

        expect(findFirstSpy).toHaveBeenCalledWith({ where: { email: req.body.email } });
        expect(hashSpy).toHaveBeenCalledWith(req.body.password);
        expect(createSpy).toHaveBeenCalledWith({ data: { name: req.body.name, email: req.body.email, role: req.body.role, password: hashed } });
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, data: { id: createdUser.id, name: createdUser.name, email: createdUser.email } }));
    });
});

describe("login user", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("should login an existing user", async () => {
        const req: any = {
            body: {
                email: "test@user.com",
                password: "testUser@123"
            }
        };

        const json = jest.fn();
        const status = jest.fn().mockReturnValue({ json });
        const cookie = jest.fn();
        const res: any = { status, cookie };

        // mock prisma and argon2
        const existingUser = { id: "abc123", name: "Test User", email: req.body.email, password: "hashed-password" };
        const findFirstSpy = jest.spyOn(prisma.user as any, "findFirst").mockResolvedValue(existingUser);
        const verifySpy = jest.spyOn(argon2, "verify").mockResolvedValue(true as any);
        const signSpy = jest.spyOn(require("jsonwebtoken"), "sign").mockReturnValue("jwt-token");

        await AuthController.login(req, res);

        expect(findFirstSpy).toHaveBeenCalledWith({ where: { email: req.body.email } });
        expect(verifySpy).toHaveBeenCalledWith(existingUser.password, req.body.password);
        expect(signSpy).toHaveBeenCalledWith(
            { userId: existingUser.id },
            expect.any(String),
            { expiresIn: '24h' }
        );
        expect(cookie).toHaveBeenCalledWith("jwt_token", "jwt-token", expect.any(Object));
    });

    test("should return error if user not found", async () => {
        const req: any = {
            body: {
                email: "nonexistent@user.com",
                password: "testUser@123"
            }
        };

        const json = jest.fn();
        const status = jest.fn().mockReturnValue({ json });
        const res: any = { status };

        const findFirstSpy = jest.spyOn(prisma.user as any, "findFirst").mockResolvedValue(null);

        await AuthController.login(req, res);

        expect(findFirstSpy).toHaveBeenCalledWith({ where: { email: req.body.email } });
        expect(status).toHaveBeenCalledWith(500);
    });

    test("should return error if password is invalid", async () => {
        const req: any = {
            body: {
                email: "test@user.com",
                password: "wrongPassword"
            }
        };

        const json = jest.fn();
        const status = jest.fn().mockReturnValue({ json });
        const res: any = { status };

        const existingUser = { id: "abc123", name: "Test User", email: req.body.email, password: "hashed-password" };
        const findFirstSpy = jest.spyOn(prisma.user as any, "findFirst").mockResolvedValue(existingUser);
        const verifySpy = jest.spyOn(argon2, "verify").mockResolvedValue(false as any);

        await AuthController.login(req, res);

        expect(findFirstSpy).toHaveBeenCalledWith({ where: { email: req.body.email } });
        expect(verifySpy).toHaveBeenCalledWith(existingUser.password, req.body.password);
        expect(status).toHaveBeenCalledWith(500);
    });
});