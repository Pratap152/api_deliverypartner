const prisma = require("../config/prisma");

// Helper
const getStartOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfDay = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

//Get Available Programs
exports.getAvailablePrograms = async (req, res) => {
  try {
    const riderId = req.rider.id;
    const now = new Date();

    // ----------------------------
    // GET RIDER LOCATION
    // ----------------------------
    const location = await prisma.riderLocation.findUnique({
      where: { riderId }
    });

    if (!location?.city || !location?.pincode) {
      return res.status(400).json({
        success: false,
        message: "Rider location not set"
      });
    }

    // ----------------------------
    // FETCH PROGRAMS
    // ----------------------------
    const programs = await prisma.program.findMany({
      where: {
        isActive: true,
        programType: "JOINING_BONUS",
      },
      orderBy: { priority: "desc" },
      include: {
        tasks: {
        //   take: 2, //preview only (performance)
          orderBy: { dayNumber: "asc" }
        }
      }
    });

    // ----------------------------
    // GET ENROLLMENTS
    // ----------------------------
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        riderId,
        programId: {
          in: programs.map(p => p.id)
        }
      }
    });

    const enrollmentMap = {};
    enrollments.forEach(e => {
      enrollmentMap[e.programId] = e;
    });

    // ----------------------------
    // FINAL RESPONSE
    // ----------------------------
    const response = programs.map(program => {
      const enrollment = enrollmentMap[program.id];

      return {
        id: program.id,
        name: program.name,
        validityDays: program.validityDays,
        rewardPreview: program.tasks.reduce(
          (sum, t) => sum + t.rewardAmount,
          0
        ),

        isEnrolled: !!enrollment,
        enrollmentStatus: enrollment?.status || null,

        tasksPreview: program.tasks
      };
    });

    return res.status(200).json({
      success: true,
      count: response.length,
      data: response
    });

  } catch (error) {
    console.error("Get Available Programs Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// Get Program Details
exports.getProgramDetails = async (req, res) => {
  try {
    const { programId } = req.params;

    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        tasks: { orderBy: { dayNumber: "asc" } }
      }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found"
      });
    }

    res.json({ success: true, data: program });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// Join Program (SAFE)
exports.joinProgram = async (req, res) => {
  try {
    const riderId = req.rider.id;
    const { programId } = req.params;

    const program = await prisma.program.findUnique({
      where: { id: programId }
    });

    if (!program || !program.isActive) {
      return res.status(400).json({
        success: false,
        message: "Program not active"
      });
    }

    const now = new Date();

    if (program.validFrom > now || program.validTill < now) {
      return res.status(400).json({
        success: false,
        message: "Program expired or not started"
      });
    }

    // Prevent duplicate join
    const existing = await prisma.programEnrollment.findUnique({
      where: {
        riderId_programId: {
          riderId,
          programId
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Already joined"
      });
    }

    const expiresAt = new Date(now);
    if (program.validityDays) {
      expiresAt.setDate(expiresAt.getDate() + program.validityDays);
    }

    await prisma.programEnrollment.create({
      data: {
        riderId,
        programId,
        expiresAt
      }
    });

    res.json({
      success: true,
      message: "Program joined successfully"
    });

  } catch (err) {
    console.error(err);

    // Unique constraint safe
    if (err.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Already joined"
      });
    }

    res.status(500).json({ success: false });
  }
};


//  My Programs
exports.getMyPrograms = async (req, res) => {
  try {
    const riderId = req.rider.id;

    const programs = await prisma.programEnrollment.findMany({
      where: { riderId },
      include: {
        program: true
      },
      orderBy: { enrolledAt: "desc" }
    });

    res.json({
      success: true,
      count: programs.length,
      data: programs
    });

  } catch {
    res.status(500).json({ success: false });
  }
};


//Get My Progress
exports.getMyProgramProgress = async (req, res) => {
  try {
    const riderId = req.rider.id;
    const now = new Date();

    // ----------------------------
    // GET ACTIVE ENROLLMENT
    // ----------------------------
    let enrollment = await prisma.programEnrollment.findFirst({
      where: {
        riderId,
        status: "ACTIVE"
      },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            validityDays: true,
            validFrom: true,
            validTill: true,
            isActive: true
          }
        }
      },
      orderBy: { enrolledAt: "desc" }
    });

    // ----------------------------
    // NO ACTIVE PROGRAM
    // ----------------------------
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "No active joining bonus program found"
      });
    }

    // ----------------------------
    // HANDLE EXPIRY
    // ----------------------------
    if (enrollment.expiresAt < now) {
      await prisma.programEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "EXPIRED" }
      });

      enrollment.status = "EXPIRED";
    }

    const programId = enrollment.program.id;

    console.log(programId)

    // ----------------------------
    // GET TASKS
    // ----------------------------
    const tasks = await prisma.programTask.findMany({
      where: { programId },
      orderBy: { dayNumber: "asc" }
    });

    // ----------------------------
    // GET TASK PROGRESS
    // ----------------------------
    const progressList = await prisma.programTaskProgress.findMany({
      where: { riderId, programId }
    });

    // Map progress
    const progressMap = {};
    progressList.forEach(p => {
      progressMap[p.taskId] = p;
    });

    // ----------------------------
    // BUILD TASK RESPONSE
    // ----------------------------
    const tasksData = tasks.map(task => {
      const progress = progressMap[task.id];

      return {
        taskId: task.id,
        dayNumber: task.dayNumber,
        taskType: task.taskType,

        conditions: {
          minOrders: task.minOrders,
          minAcceptanceRate: task.minAcceptanceRate,
          minPeakSlots: task.minPeakSlots,
          minEarnings: task.minEarnings
        },

        rewardAmount: task.rewardAmount,

        // Progress
        isCompleted: progress?.isCompleted || false,
        progressValue: progress?.progressValue || 0,
        completedAt: progress?.completedAt || null
      };
    });

    // ----------------------------
    // SUMMARY
    // ----------------------------
    const totalTasks = tasksData.length;
    const completedTasks = tasksData.filter(t => t.isCompleted).length;

    const totalRewardEarned = tasksData
      .filter(t => t.isCompleted)
      .reduce((sum, t) => sum + t.rewardAmount, 0);

    // ----------------------------
    // RESPONSE
    // ----------------------------
    return res.status(200).json({
      success: true,
      data: {
        program: enrollment.program,
        enrollment: {
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt,
          expiresAt: enrollment.expiresAt
        },
        summary: {
          totalTasks,
          completedTasks,
          pendingTasks: totalTasks - completedTasks,
          totalRewardEarned
        },
        tasks: tasksData
      }
    });

  } catch (error) {
    console.error("Get My Program Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


//  Get Today Task 
exports.getTodayTask = async (req, res) => {
  try {
    const riderId = req.rider.id;
    const { programId } = req.params;

    const enrollment = await prisma.programEnrollment.findUnique({
      where: {
        riderId_programId: { riderId, programId }
      }
    });

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: "Not enrolled"
      });
    }

    const start = new Date(enrollment.enrolledAt);
    const today = new Date();

    const dayNumber = Math.floor(
      (today - start) / (1000 * 60 * 60 * 24)
    ) + 1;

    const task = await prisma.programTask.findFirst({
      where: {
        programId,
        dayNumber
      }
    });

    res.json({
      success: true,
      dayNumber,
      data: task || null
    });

  } catch {
    res.status(500).json({ success: false });
  }
};


