import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

dotenv.config(); 
const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// JWT authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; 
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (error) {
    return res.status(403).json({ error: "Forbidden - Invalid token" });
  }
};

// -------------------- AUTH ROUTES --------------------
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, password: hashedPassword, role } });
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------- PROTECTED ROUTE --------------------
app.get("/api/protected", authenticate, (req, res) => {
  res.status(200).json({ message: "This is a protected route!", user: req.user });
});

// -------------------- BUS ROUTES --------------------
app.post("/api/buses", authenticate, async (req, res) => {
  const { name, plateNumber, capacity, route, driverId, assistantId } = req.body;
  try {
    const bus = await prisma.bus.create({ data: { name, plateNumber, capacity, route, driverId, assistantId } });
    res.status(201).json({ bus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/buses", authenticate, async (req, res) => {
  try {
    const buses = await prisma.bus.findMany({ include: { driver: true, assistant: true, students: true } });
    res.status(200).json({ buses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/buses/:busId", authenticate, async (req, res) => {
  const { busId } = req.params;
  const { name, plateNumber, capacity, route, driverId, assistantId } = req.body;
  try {
    const updatedBus = await prisma.bus.update({ where: { id: Number(busId) }, data: { name, plateNumber, capacity, route, driverId, assistantId } });
    res.json({ updatedBus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/buses/:busId", authenticate, async (req, res) => {
  const { busId } = req.params;
  try {
    await prisma.bus.delete({ where: { id: Number(busId) } });
    res.json({ message: "Bus deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------- PARENT/STUDENT ROUTES --------------------
app.post("/api/parents", authenticate, async (req, res) => {
  const { parentName, parentPhone, parentEmail, studentName, grade, latitude, longitude, busId } = req.body;
  if (!parentName || !parentPhone || !studentName || !grade || !latitude || !longitude || !busId)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    let parent = await prisma.parent.findUnique({ where: { phone: parentPhone } });
    if (!parent) {
      parent = await prisma.parent.create({ data: { name: parentName, phone: parentPhone, email: parentEmail || null } });
    }

    const student = await prisma.student.create({
      data: { name: studentName, grade, latitude, longitude, busId, parentId: parent.id },
      include: { parent: true, bus: true },
    });

    res.status(201).json({ student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update parent
app.put("/api/parents/:parentId", authenticate, async (req, res) => {
  const { parentId } = req.params;
  const { name, phone, email } = req.body;
  try {
    const updatedParent = await prisma.parent.update({ where: { id: Number(parentId) }, data: { name, phone, email } });
    res.json({ updatedParent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete parent
app.delete("/api/parents/:parentId", authenticate, async (req, res) => {
  const { parentId } = req.params;
  try {
    await prisma.parent.delete({ where: { id: Number(parentId) } });
    res.json({ message: "Parent deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update student
app.put("/api/students/:studentId", authenticate, async (req, res) => {
  const { studentId } = req.params;
  const { name, grade, latitude, longitude, busId, parentId } = req.body;
  try {
    const updatedStudent = await prisma.student.update({ where: { id: Number(studentId) }, data: { name, grade, latitude, longitude, busId, parentId } });
    res.json({ updatedStudent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete student
app.delete("/api/students/:studentId", authenticate, async (req, res) => {
  const { studentId } = req.params;
  try {
    await prisma.student.delete({ where: { id: Number(studentId) } });
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------- MANIFEST ROUTES --------------------
const getTodayRange = () => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  return { todayStart, todayEnd };
};

app.post("/api/manifests/checkin", authenticate, async (req, res) => {
  const { studentId, busId, assistantId, latitude, longitude } = req.body;
  try {
    const { todayStart, todayEnd } = getTodayRange();
    const existing = await prisma.manifest.findFirst({ where: { studentId, status: "CHECKED_IN", date: { gte: todayStart, lte: todayEnd } } });
    if (existing) return res.status(400).json({ error: "Student already checked in today" });

    const manifest = await prisma.manifest.create({ data: { studentId, busId, assistantId, status: "CHECKED_IN", latitude, longitude } });
    res.status(201).json({ manifest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/manifests/checkout", authenticate, async (req, res) => {
  const { studentId, busId, assistantId, latitude, longitude } = req.body;
  try {
    const { todayStart, todayEnd } = getTodayRange();
    const existing = await prisma.manifest.findFirst({ where: { studentId, status: "CHECKED_OUT", date: { gte: todayStart, lte: todayEnd } } });
    if (existing) return res.status(400).json({ error: "Student already checked out today" });

    const manifest = await prisma.manifest.create({ data: { studentId, busId, assistantId, status: "CHECKED_OUT", latitude, longitude } });
    res.status(201).json({ manifest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/manifests/bus/:busId", authenticate, async (req, res) => {
  const { busId } = req.params;
  try {
    const manifests = await prisma.manifest.findMany({ where: { busId: Number(busId) }, include: { student: true, assistant: true }, orderBy: { date: "desc" } });
    res.json({ manifests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/manifests/student/:studentId", authenticate, async (req, res) => {
  const { studentId } = req.params;
  try {
    const manifests = await prisma.manifest.findMany({ where: { studentId: Number(studentId) }, include: { bus: true, assistant: true }, orderBy: { date: "desc" } });
    res.json({ manifests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------- SERVER --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  console.log("Prisma Client disconnected");
  process.exit(0);
});
