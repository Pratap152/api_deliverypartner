const prisma = require("../config/prisma");

exports.createProgram = async (req, res) => {
  try {
    const {
      name,
      description,
      programType,
      joiningBonusType,
      trackingType,
      ruleType,
      validFrom,
      validTill,
      validityDays,
      cityIds,
      pincodeIds
    } = req.body;


    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Program name is required"
      });
    }

 

    if (!programType) {
      return res.status(400).json({
        success: false,
        message: "programType is required"
      });
    }

    if (
      programType === "JOINING_BONUS" &&
      !joiningBonusType
    ) {
      return res.status(400).json({
        success: false,
        message: "joiningBonusType is required"
      });
    }



    if (!trackingType) {
      return res.status(400).json({
        success: false,
        message: "trackingType is required"
      });
    }

    if (!ruleType) {
      return res.status(400).json({
        success: false,
        message: "ruleType is required"
      });
    }


    if (!validFrom || !validTill) {
      return res.status(400).json({
        success: false,
        message: "validFrom and validTill are required"
      });
    }

    const startDate = new Date(validFrom);
    const endDate = new Date(validTill);

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message:
          "validFrom cannot be greater than validTill"
      });
    }


    if (!validityDays || validityDays <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "validityDays must be greater than 0"
      });
    }


    if (
      !Array.isArray(cityIds) ||
      cityIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "cityIds must be a non-empty array"
      });
    }

    const cities = await prisma.city.findMany({
      where: {
        id: {
          in: cityIds
        }
      }
    });

    if (cities.length !== cityIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some cityIds are invalid"
      });
    }



    if (
      !Array.isArray(pincodeIds) ||
      pincodeIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "pincodeIds must be a non-empty array"
      });
    }

    const pincodes = await prisma.pincode.findMany({
      where: {
        id: {
          in: pincodeIds
        }
      }
    });

    if (pincodes.length !== pincodeIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "Some pincodeIds are invalid"
      });
    }



    const existingProgram =
      await prisma.program.findFirst({
        where: {
          name,
          programType,
          pincodeIds: {
            hasSome: pincodeIds
          },
          isActive: true
        }
      });

    if (existingProgram) {
      return res.status(400).json({
        success: false,
        message:
          "Program already exists for selected pincodes"
      });
    }



    const program = await prisma.program.create({
      data: {
        name: name.trim(),
        description,
        programType,
        joiningBonusType,
        trackingType,
        ruleType,
        validFrom: startDate,
        validTill: endDate,
        validityDays,
        cityId: cityIds,
        pincodeIds
      }
    });

    return res.status(201).json({
      success: true,
      message: "Program created successfully",
      data: program
    });

  } catch (error) {
    console.error("Create Program Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

exports.createProgramTask = async (req, res) => {
  try {
    const {
      programId,
      dayNumber,
      taskType,
      minOrders,
      minAcceptanceRate,
      minPeakSlots,
      minEarnings,
      rewardAmount
    } = req.body;

  

    if (!programId) {
      return res.status(400).json({
        success: false,
        message: "programId is required"
      });
    }

    if (!dayNumber || dayNumber < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid dayNumber is required"
      });
    }

    if (!taskType) {
      return res.status(400).json({
        success: false,
        message: "taskType is required"
      });
    }

    if (!rewardAmount || rewardAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid rewardAmount is required"
      });
    }



    if (taskType === "ORDERS" && !minOrders) {
      return res.status(400).json({
        success: false,
        message: "minOrders is required for ORDERS task"
      });
    }

    if (
      taskType === "ACCEPTANCE_RATE" &&
      !minAcceptanceRate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "minAcceptanceRate is required for ACCEPTANCE_RATE task"
      });
    }

    if (taskType === "PEAK_SLOTS" && !minPeakSlots) {
      return res.status(400).json({
        success: false,
        message:
          "minPeakSlots is required for PEAK_SLOTS task"
      });
    }

    if (taskType === "EARNINGS" && !minEarnings) {
      return res.status(400).json({
        success: false,
        message: "minEarnings is required for EARNINGS task"
      });
    }



    const program = await prisma.program.findUnique({
      where: {
        id: programId
      }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found"
      });
    }


    if (program.joiningBonusType !== "TASK_BASED") {
      return res.status(400).json({
        success: false,
        message:
          "Tasks can only be created for TASK_BASED programs"
      });
    }

  

    if (
      program.validityDays &&
      dayNumber > program.validityDays
    ) {
      return res.status(400).json({
        success: false,
        message: `Day ${dayNumber} exceeds program validity of ${program.validityDays} days`
      });
    }


    const existingTask =
      await prisma.programTask.findFirst({
        where: {
          programId,
          dayNumber,
          taskType
        }
      });

    if (existingTask) {
      return res.status(400).json({
        success: false,
        message: `Task already exists for Day ${dayNumber} with type ${taskType}`
      });
    }

    const task = await prisma.programTask.create({
      data: {
        programId,
        dayNumber,
        taskType,

        minOrders:
          taskType === "ORDERS"
            ? Number(minOrders)
            : null,

        minAcceptanceRate:
          taskType === "ACCEPTANCE_RATE"
            ? Number(minAcceptanceRate)
            : null,

        minPeakSlots:
          taskType === "PEAK_SLOTS"
            ? Number(minPeakSlots)
            : null,

        minEarnings:
          taskType === "EARNINGS"
            ? Number(minEarnings)
            : null,

        rewardAmount: Number(rewardAmount)
      }
    });

    return res.status(201).json({
      success: true,
      message: "Program task created successfully",
      data: task
    });

  } catch (error) {
    console.error("Create Program Task Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getProgramTasks = async (req, res) => {
  try {
    const { programId } = req.query;

    if (!programId) {
      return res.status(400).json({
        success: false,
        message: "programId is required"
      });
    }

    const tasks = await prisma.programTask.findMany({
      where: { programId },
      orderBy: { dayNumber: "asc" }
    });

    if (!tasks.length) {
      return res.json({
        success: true,
        message: "No tasks found",
        count: 0,
        data: []
      });
    }

    return res.json({
      success: true,
      message: "Program tasks fetched",
      count: tasks.length,
      data: tasks
    });

  } catch (error) {
    console.error("Get Program Tasks Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};




exports.getAllPrograms = async (req, res) => {
  try {
    const { isActive, programType } = req.query;

    if (!isActive || !programType) {
      return res.status(400).json({
        success: false,
        message: "isActive and programType is required"
      });
    }

    const programs = await prisma.program.findMany({
      where: {
        ...(isActive !== undefined && { isActive: isActive === "true" }),
        ...(programType && { programType })
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({
      success: true,
      count: programs.length,
      data: programs
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getProgramById = async (req, res) => {
  try {
    const { programId } = req.params;

    if (!programId) {
      return res.status(400).json({
        success: false,
        message: "programId is required"
      });
    }

    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        tasks: true,
        slabs: true,
        rules: true
      }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found"
      });
    }

    return res.json({ success: true, data: program });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};




exports.updateProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const { name, validFrom, validTill, cityId, pincodeIds } = req.body;

    // ----------------------------
    // FETCH PROGRAM
    // ----------------------------
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: { tasks: true }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found"
      });
    }

    const now = new Date();

    
    if (now >= program.validFrom) {
      return res.status(400).json({
        success: false,
        message: "Cannot update active or started program"
      });
    }

    
    const newValidFrom = validFrom ? new Date(validFrom) : program.validFrom;
    const newValidTill = validTill ? new Date(validTill) : program.validTill;

    
    if (newValidFrom >= newValidTill) {
      return res.status(400).json({
        success: false,
        message: "validFrom must be less than validTill"
      });
    }

    
    if (program.validityDays && program.tasks.length > 0) {
      const maxDay = Math.max(...program.tasks.map(t => t.dayNumber || 0));

      if (maxDay > program.validityDays) {
        return res.status(400).json({
          success: false,
          message: `Existing tasks exceed program validityDays (${program.validityDays})`
        });
      }
    }

    if (cityId && cityId.length === 0) {
      return res.status(400).json({
        success: false,
        message: "cityId cannot be empty"
      });
    }

    if (pincodeIds && pincodeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "pincodeIds cannot be empty"
      });
    }

    
    const conflict = await prisma.program.findFirst({
      where: {
        id: { not: programId },
        isActive: true,
        cityId: { hasSome: cityId || program.cityId },
        pincodeIds: { hasSome: pincodeIds || program.pincodeIds },
        OR: [
          {
            validFrom: { lte: newValidTill },
            validTill: { gte: newValidFrom }
          }
        ]
      }
    });

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: "Another program exists with overlapping dates for same city/pincode"
      });
    }

    
    const updated = await prisma.program.update({
      where: { id: programId },
      data: {
        name: name ?? undefined,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validTill: validTill ? new Date(validTill) : undefined,
        cityId: cityId ?? undefined,
        pincodeIds: pincodeIds ?? undefined
      }
    });

    return res.json({
      success: true,
      message: "Program updated successfully",
      data: updated
    });

  } catch (err) {
    console.error("Update Program Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};




exports.toggleProgramStatus = async (req, res) => {
  try {
    const { programId } = req.params;
    const { isActive } = req.body;


    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false"
      });
    }

    
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: { tasks: true }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found"
      });
    }

    
    if (program.isActive === isActive) {
      return res.status(400).json({
        success: false,
        message: `Program already ${isActive ? "active" : "inactive"}`
      });
    }

    const now = new Date();

  
    if (isActive) {
      
      if (now > program.validTill) {
        return res.status(400).json({
          success: false,
          message: "Cannot activate expired program"
        });
      }

      if (program.validFrom >= program.validTill) {
        return res.status(400).json({
          success: false,
          message: "Invalid program date range"
        });
      }

      if (!program.tasks || program.tasks.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot activate program without tasks"
        });
      }

      
      if (!program.validityDays) {
        return res.status(400).json({
          success: false,
          message: "validityDays is required"
        });
      }

     
      const conflict = await prisma.program.findFirst({
        where: {
          id: { not: programId },
          isActive: true,
          cityId: { hasSome: program.cityId },
          pincodeIds: { hasSome: program.pincodeIds },
          validFrom: { lte: program.validTill },
          validTill: { gte: program.validFrom }
        }
      });

      if (conflict) {
        return res.status(400).json({
          success: false,
          message: "Another active program overlaps in same location & date"
        });
      }
    }

    
    if (!isActive) {
      //  Optional: block if already started
      if (now >= program.validFrom && now <= program.validTill) {
        return res.status(400).json({
          success: false,
          message: "Cannot deactivate running program"
        });
      }
    }

    const updated = await prisma.program.update({
      where: { id: programId },
      data: { isActive }
    });

    return res.json({
      success: true,
      message: `Program ${isActive ? "activated" : "deactivated"} successfully`,
      data: updated
    });

  } catch (err) {
    console.error("Toggle Program Status Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



exports.getTasks = async (req, res) => {
  try {
    const { programId } = req.params;

    if (!programId) {
      return res.status(400).json({
        success: false,
        message: "programId is required"
      });
    }

    
    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: {
        id: true,
        validityDays: true,
        isActive: true
      }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found"
      });
    }

    
    const tasks = await prisma.programTask.findMany({
      where: { programId },
      orderBy: { dayNumber: "asc" }
    });

  

    
    if (!tasks.length) {
      return res.status(200).json({
        success: true,
        message: "No tasks found for this program",
        count: 0,
        data: []
      });
    }

    
    const invalidTasks = tasks.filter(
      t => program.validityDays && t.dayNumber > program.validityDays
    );

    if (invalidTasks.length > 0) {
      console.warn("⚠️ Invalid tasks found (dayNumber > validityDays)", invalidTasks);
    }

    
    const daySet = new Set();
    const duplicateDays = [];

    tasks.forEach(t => {
      if (daySet.has(t.dayNumber)) {
        duplicateDays.push(t.dayNumber);
      } else {
        daySet.add(t.dayNumber);
      }
    });

    if (duplicateDays.length > 0) {
      console.warn(" Duplicate day tasks found:", duplicateDays);
    }

    // ----------------------------
    // RESPONSE
    // ----------------------------
    return res.status(200).json({
      success: true,
      count: tasks.length,
      programMeta: {
        validityDays: program.validityDays,
        isActive: program.isActive
      },
      data: tasks
    });

  } catch (error) {
    console.error("Get Tasks Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};




exports.updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const {
      dayNumber,
      taskType,
      minOrders,
      minAcceptanceRate,
      minPeakSlots,
      minEarnings,
      rewardAmount
    } = req.body;

    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "taskId is required"
      });
    }

    
    const task = await prisma.programTask.findUnique({
      where: { id: taskId },
      include: { program: true }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    const program = task.program;

  
    if (new Date() >= program.validFrom) {
      return res.status(400).json({
        success: false,
        message: "Cannot update task after program started"
      });
    }

   
    if (dayNumber !== undefined) {
      if (dayNumber < 1) {
        return res.status(400).json({
          success: false,
          message: "dayNumber must be >= 1"
        });
      }

      if (program.validityDays && dayNumber > program.validityDays) {
        return res.status(400).json({
          success: false,
          message: `dayNumber cannot exceed program validityDays (${program.validityDays})`
        });
      }

      // Duplicate check
      const duplicate = await prisma.programTask.findFirst({
        where: {
          programId: program.id,
          dayNumber,
          NOT: { id: taskId }
        }
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Task already exists for Day ${dayNumber}`
        });
      }
    }

    
    if (rewardAmount !== undefined && rewardAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "rewardAmount must be greater than 0"
      });
    }

   
    if (taskType) {
      const allowedTypes = ["ORDERS", "ACCEPTANCE_RATE", "PEAK_SLOTS", "EARNINGS"];

      if (!allowedTypes.includes(taskType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid taskType"
        });
      }
    }

    // At least one condition check
    const hasCondition =
      minOrders !== undefined ||
      minAcceptanceRate !== undefined ||
      minPeakSlots !== undefined ||
      minEarnings !== undefined;

    if (!hasCondition) {
      return res.status(400).json({
        success: false,
        message: "At least one condition must be provided"
      });
    }

    
    const updateData = {};

    if (dayNumber !== undefined) updateData.dayNumber = dayNumber;
    if (taskType !== undefined) updateData.taskType = taskType;
    if (minOrders !== undefined) updateData.minOrders = minOrders;
    if (minAcceptanceRate !== undefined) updateData.minAcceptanceRate = minAcceptanceRate;
    if (minPeakSlots !== undefined) updateData.minPeakSlots = minPeakSlots;
    if (minEarnings !== undefined) updateData.minEarnings = minEarnings;
    if (rewardAmount !== undefined) updateData.rewardAmount = rewardAmount;

    // ----------------------------
    // UPDATE TASK
    // ----------------------------
    const updated = await prisma.programTask.update({
      where: { id: taskId },
      data: updateData
    });

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: updated
    });

  } catch (error) {
    console.error("Update Task Error:", error);

    // Prisma unique constraint
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Duplicate day task not allowed"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// DELETE /api/admin/tasks/:taskId  Delete Task
exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "taskId is required"
      });
    }

    
    const task = await prisma.programTask.findUnique({
      where: { id: taskId },
      include: { program: true }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    const program = task.program;

    
    if (new Date() >= program.validFrom) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete task after program started"
      });
    }

    
    const taskProgress = await prisma.programTaskProgress.findFirst({
      where: {
        taskId: taskId
      }
    });

    if (taskProgress) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete task, riders already started this task"
      });
    }

   
    const programProgress = await prisma.programProgress.findFirst({
      where: {
        programId: program.id
      }
    });

    if (programProgress) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete task, program already in progress"
      });
    }

    
    await prisma.programTask.delete({
      where: { id: taskId }
    });

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully"
    });

  } catch (error) {
    console.error("Delete Task Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



exports.getProgramRiders = async (req, res) => {
  try {
    const { programId } = req.params;

    let { page = 1, limit = 10, status } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (!programId) {
      return res.status(400).json({
        success: false,
        message: "programId is required"
      });
    }

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination values"
      });
    }

    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: {
        id: true,
        name: true,
        isActive: true,
        validFrom: true,
        validTill: true
      }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found"
      });
    }

   
    const whereClause = {
      programId
    };

    if (status) {
      const allowedStatus = ["ACTIVE", "COMPLETED", "EXPIRED"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status filter"
        });
      }
      whereClause.status = status;
    }

    const [total, enrollments] = await Promise.all([
      prisma.programEnrollment.count({ where: whereClause }),

      prisma.programEnrollment.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { enrolledAt: "desc" },
        include: {
          rider: {
            select: {
              id: true,
              phoneNumber: true,
              isOnline: true,
              isFullyRegistered: true
            }
          }
        }
      })
    ]);

    
    if (!enrollments.length) {
      return res.status(200).json({
        success: true,
        message: "No riders found for this program",
        count: 0,
        data: []
      });
    }

    return res.status(200).json({
      success: true,
      count: total,
      page,
      limit,
      programMeta: {
        name: program.name,
        isActive: program.isActive,
        validFrom: program.validFrom,
        validTill: program.validTill
      },
      data: enrollments
    });

  } catch (error) {
    console.error("Get Program Riders Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


exports.getRiderProgress = async (req, res) => {
  try {
    const { programId, riderId } = req.params;

    
    if (!programId || !riderId) {
      return res.status(400).json({
        success: false,
        message: "programId and riderId are required"
      });
    }

    
    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: {
        id: true,
        name: true,
        validityDays: true,
        validFrom: true,
        validTill: true
      }
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found"
      });
    }

   
    const enrollment = await prisma.programEnrollment.findUnique({
      where: {
        riderId_programId: {
          riderId,
          programId
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Rider not enrolled in this program"
      });
    }

    const tasks = await prisma.programTask.findMany({
      where: { programId },
      orderBy: { dayNumber: "asc" }
    });

    const taskProgress = await prisma.programTaskProgress.findMany({
      where: { programId, riderId }
    });

    // Map progress by taskId
    const progressMap = {};
    taskProgress.forEach(p => {
      progressMap[p.taskId] = p;
    });

    
    const taskStatus = tasks.map(task => {
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

        // PROGRESS
        isCompleted: progress?.isCompleted || false,
        progressValue: progress?.progressValue || 0,
        completedAt: progress?.completedAt || null
      };
    });

    
    const overall = await prisma.programProgress.findFirst({
      where: { programId, riderId }
    });

    
    const completedTasks = taskStatus.filter(t => t.isCompleted).length;
    const totalTasks = taskStatus.length;

    const totalRewardEarned = taskStatus
      .filter(t => t.isCompleted)
      .reduce((sum, t) => sum + t.rewardAmount, 0);

    return res.status(200).json({
      success: true,
      data: {
        program: {
          id: program.id,
          name: program.name,
          validityDays: program.validityDays,
          validFrom: program.validFrom,
          validTill: program.validTill
        },
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
        tasks: taskStatus,
        overallProgress: overall || null
      }
    });

  } catch (error) {
    console.error("Get Rider Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};