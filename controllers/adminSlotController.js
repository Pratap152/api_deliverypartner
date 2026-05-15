const prisma = require("../config/prisma");
 


function createDate(year, month, day, hour = 0, minute = 0) {

  return new Date(year, month, day, hour, minute, 0, 0);

}
 


function formatDateYYYYMMDD(date) {

  const y = date.getFullYear();

  const m = String(date.getMonth() + 1).padStart(2, "0");

  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;

}
 


function getISOWeekStartDate(year, weekNumber) {

  const jan4 = new Date(year, 0, 4);
 
  const dayOfWeek = jan4.getDay() === 0 ? 7 : jan4.getDay();
 
  const week1Monday = new Date(jan4);

  week1Monday.setDate(jan4.getDate() - (dayOfWeek - 1));
 
  const targetMonday = new Date(week1Monday);

  targetMonday.setDate(week1Monday.getDate() + (weekNumber - 1) * 7);
 
  return createDate(

    targetMonday.getFullYear(),

    targetMonday.getMonth(),

    targetMonday.getDate()

  );

}
 
exports.createWeeklySlots = async (req, res) => {
  try {
    const { weekNumber, year, cityId, pincodeId, slotTemplate } = req.body;

    //Validation
    if (!weekNumber || !year || !cityId || !pincodeId || !slotTemplate?.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    //Validate city + pincode relation
    const pincode = await prisma.pincode.findFirst({
      where: {
        id: pincodeId,
        cityId: cityId,
        isActive: true
      }
    });

    if (!pincode) {
      return res.status(404).json({
        message: "Invalid city or pincode"
      });
    }

    // Prevent duplicate week for same pincode
    const existing = await prisma.weeklySlot.findFirst({
      where: {
        weekNumber,
        year,
        pincodeId
      }
    });

    if (existing) {
      return res.status(400).json({
        message: "Weekly slots already exist for this pincode"
      });
    }

    const weekStartDate = getISOWeekStartDate(year, weekNumber);

    const weeklySlot = await prisma.$transaction(async (tx) => {

      // Create parent
      const parent = await tx.weeklySlot.create({
        data: {
          weekNumber,
          year,
          cityId,
          pincodeId
        }
      });

      const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
      const slotsToCreate = [];

      for (let i = 0; i < 7; i++) {
        const baseDate = new Date(weekStartDate);
        baseDate.setDate(weekStartDate.getDate() + i);

        const normalizedDate = createDate(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate()
        );

        for (const tpl of slotTemplate) {
          const [sh, sm] = tpl.startTime.split(":").map(Number);
          const [eh, em] = tpl.endTime.split(":").map(Number);

          const slotStartAt = createDate(
            normalizedDate.getFullYear(),
            normalizedDate.getMonth(),
            normalizedDate.getDate(),
            sh,
            sm
          );

          const slotEndAt = createDate(
            normalizedDate.getFullYear(),
            normalizedDate.getMonth(),
            normalizedDate.getDate(),
            eh,
            em
          );

          slotsToCreate.push({
            weeklySlotId: parent.id,
            date: formatDateYYYYMMDD(normalizedDate),

            slotKey: `${days[i]}_${tpl.startTime.replace(":", "")}_${tpl.endTime.replace(":", "")}`,

            dayOfWeek: days[i],
            dayNumber: i + 1,

            startTime: tpl.startTime,
            endTime: tpl.endTime,

            durationMinutes: tpl.durationMinutes,

            slotStartAt,
            slotEndAt,

            maxRiders: tpl.maxRiders,

            isPeakSlot: tpl.isPeakSlot ?? false,
            incentiveText: tpl.incentiveText ?? "",
            incentiveAmount: tpl.incentiveAmount ?? 0,
            priority: tpl.priority ?? 0
          });
        }
      }

      await tx.slot.createMany({ data: slotsToCreate });

      return parent;
    });

    return res.status(201).json({
      message: "Weekly slots created successfully",
      weeklySlotId: weeklySlot.id
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};