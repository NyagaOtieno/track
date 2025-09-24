import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

dotenv.config(); // Load environment variables from .env
const app = express();
const prisma = new PrismaClient();

// Middleware to parse JSON
app.use(cors());
app.use(bodyParser.json());

// JWT middleware for authentication
const authenticate = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Bearer token
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach the user to the request object
    next();
  } catch (error) {
    return res.status(403).json({ error: "Forbidden - Invalid token" });
  }
};

// Register route (for creating a new user)
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login route (for user authentication)
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected route (requires authentication)
app.get("/api/protected", authenticate, (req, res) => {
  res.status(200).json({ message: "This is a protected route!", user: req.user });
});

// Bus creation route (only accessible by authenticated users)
app.post("/api/buses", authenticate, async (req, res) => {
  const { name, plateNumber, capacity, route, driverId, assistantId } = req.body;
  try {
    const bus = await prisma.bus.create({
      data: {
        name,
        plateNumber,
        capacity,
        route,
        driverId,
        assistantId,
      },
    });
    res.status(201).json({ bus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bus list route (only accessible by authenticated users)
app.get("/api/buses", authenticate, async (req, res) => {
  try {
    const buses = await prisma.bus.findMany();
    res.status(200).json({ buses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Server setup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  console.log("Prisma Client disconnected");
  process.exit(0);
});
