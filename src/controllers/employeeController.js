// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Employee Controller
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const prisma = require("../config/db");
const { AppError } = require("../middleware/errorHandler");

// @desc    Get all employees (with filters)
// @route   GET /api/employees
const getEmployees = async (req, res, next) => {
  try {
    const { companyId, departmentId, role, isActive, search } = req.query;

    const where = {};
    if (companyId) where.companyId = companyId;
    if (departmentId) where.departmentId = departmentId;
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === "true";
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employeeCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
const getEmployee = async (req, res, next) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        department: true,
        attendance: { orderBy: { date: "desc" }, take: 30 },
        payrolls: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 },
        leaveBalances: { orderBy: { year: "desc" }, take: 1 },
      },
    });
    if (!employee) throw new AppError("Employee not found", 404);
    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// @desc    Create employee (onboarding)
// @route   POST /api/employees
const createEmployee = async (req, res, next) => {
  try {
    const employee = await prisma.employee.create({
      data: req.body,
      include: { company: { select: { name: true } }, department: { select: { name: true } } },
    });
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
const updateEmployee = async (req, res, next) => {
  try {
    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
const deleteEmployee = async (req, res, next) => {
  try {
    await prisma.employee.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Employee deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee };
