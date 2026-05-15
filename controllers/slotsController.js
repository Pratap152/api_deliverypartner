const { getWeekNumber } = require("../helpers/getWeekNumber");
const fcmService = require("../helpers/fcmService");

const prisma=require("../config/prisma");




exports.getWeeklySlots = async (req, res) => {
  try {
    let { weekNumber, year } = req.query;
    const riderId = req.rider.id;

    // Get rider location
    const riderLocation = await prisma.riderLocation.findUnique({
      where: { riderId }
    });

    if (!riderLocation || !riderLocation.city || !riderLocation.pincode) {
      return res.status(400).json({
        success: false,
        message: "Rider location not set"
      });
    }

  
    const city = await prisma.city.findFirst({
      where: { name: riderLocation.city }
    });

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found"
      });
    }

    //  Convert pincode 
    const pincode = await prisma.pincode.findFirst({
      where: {
        code: riderLocation.pincode,
        cityId: city.id
      }
    });

    if (!pincode) {
      return res.status(404).json({
        success: false,
        message: "Pincode not found"
      });
    }

    const today = new Date();

    if (!weekNumber) {
      weekNumber = getWeekNumber(today);
    }

    if (!year) {
      year = today.getFullYear();
    }

    const weekDocs = await prisma.weeklySlot.findMany({
      where: {
        cityId: city.id,
        pincodeId: pincode.id,
        weekNumber: Number(weekNumber),
        year: Number(year),
        isDeleted: false
      },
      include: {
        slots: {
          orderBy: [
            { date: "asc" },
            { startTime: "asc" }
          ]
        }
      }
    });

    if (!weekDocs.length) {
      return res.json({
        success: true,
        message: "No slots found for this week",
        weekNumber,
        year,
        count: 0,
        data: []
      });
    }

    const weekly = weekDocs[0];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const grouped = {};

    weekly.slots.forEach(slot => {
      const dateKey = slot.date;

      if (!grouped[dateKey]) {
        const currentDate = new Date(dateKey);

        grouped[dateKey] = {
          date: dateKey,
          dayName: dayNames[currentDate.getDay()],
          weekNumber: weekly.weekNumber,
          year: weekly.year,
          cityId: weekly.cityId,
          pincodeId: weekly.pincodeId,
          slots: []
        };
      }

      grouped[dateKey].slots.push(slot);
    });

    return res.json({
      success: true,
      message: "Weekly slots fetched",
      weekNumber: Number(weekNumber),
      year: Number(year),
      count: Object.keys(grouped).length,
      data: Object.values(grouped)
    });

  } catch (err) {
    console.error("Get Weekly Slots Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getDailySlotsWithStatus = async (req, res) => {
  try {
    const riderId = req.rider?.id;
    const { date, cityId, pincodeId, status = "all" } = req.query;

    if (!date || !cityId || !pincodeId) {
      return res.status(400).json({
        success: false,
        message: "date, cityId and pincodeId are required"
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format (YYYY-MM-DD required)"
      });
    }

    // Resolve city (ID or name)
    let city;
    if (cityId.length > 20) {
      city = await prisma.city.findUnique({
        where: { id: cityId }
      });
    } else {
      city = await prisma.city.findFirst({
        where: { name: cityId }
      });
    }

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found"
      });
    }

    // Resolve pincode (ID or code)
    let pincode;
    if (pincodeId.length > 20) {
      pincode = await prisma.pincode.findUnique({
        where: { id: pincodeId }
      });
    } else {
      pincode = await prisma.pincode.findFirst({
        where: {
          code: pincodeId,
          cityId: city.id
        }
      });
    }

    if (!pincode) {
      return res.status(404).json({
        success: false,
        message: "Pincode not found for this city"
      });
    }

    // Fetch slots
const slots = await prisma.slot.findMany({
  where: {
    date: date,
    weeklySlot: {
      is: {
        city: {
          id: city.id
        },
        pincode: {
          id: pincode.id
        }
      }
    }
  },
  include: riderId
    ? {
        slotBookings: {
          where: { riderId }
        }
      }
    : {},
  orderBy: { startTime: "asc" }
});
    if (!slots.length) {
      return res.json({
        success: true,
        message: "No slots found",
        date,
        count: 0,
        data: []
      });
    }

    //  Enrich response
    let enriched = slots.map(slot => {
      const booking = slot.slotBookings?.[0];

      return {
        slotId: slot.slotId,
        startTime: slot.startTime,
        endTime: slot.endTime,

        isAvailable: slot.isAvailable,

        isBooked: booking?.status === "BOOKED",
        isCancelled: booking?.status === "CANCELLED_BY_RIDER",

        bookingId: booking?.id || null,
        bookingStatus: booking?.status || "NOT_BOOKED"
      };
    });

    //  Filters
    if (status === "booked") {
      enriched = enriched.filter(s => s.bookingStatus === "BOOKED");
    }

    if (status === "cancelled") {
      enriched = enriched.filter(
        s => s.bookingStatus === "CANCELLED_BY_RIDER"
      );
    }

    if (status === "available") {
      enriched = enriched.filter(
        s =>
          s.isAvailable &&
          (
            s.bookingStatus === "NOT_BOOKED" ||
            s.bookingStatus === "CANCELLED_BY_RIDER"
          )
      );
    }

    return res.status(200).json({
      success: true,
      message: "Daily slots fetched",
      date,
      count: enriched.length,
      data: enriched
    });

  } catch (err) {
    console.error("Daily Slots Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};


exports.getDailySlots = async (req, res) => {
  try {
    const { date } = req.query;
    const riderId = req.rider.id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required (YYYY-MM-DD)"
      });
    }

    //Get rider location (string values)
    const riderLocation = await prisma.riderLocation.findUnique({
      where: { riderId }
    });

    if (!riderLocation || !riderLocation.city || !riderLocation.pincode) {
      return res.status(400).json({
        success: false,
        message: "Rider location not set"
      });
    }

    // Convert city name 
    const city = await prisma.city.findFirst({
      where: { name: riderLocation.city }
    });

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found"
      });
    }

    // Convert pincode
    const pincode = await prisma.pincode.findFirst({
      where: {
        code: riderLocation.pincode,
        cityId: city.id
      }
    });

    if (!pincode) {
      return res.status(404).json({
        success: false,
        message: "Pincode not found"
      });
    }

    const slots = await prisma.slot.findMany({
      where: {
        date,
        weeklySlot: {
          cityId: city.id,
          pincodeId: pincode.id,
          isDeleted: false
        }
      },
      include: {
        weeklySlot: true
      },
      orderBy: {
        startTime: "asc"
      }
    });

    if (!slots.length) {
      return res.json({
        success: true,
        message: "No slots found for this date",
        date,
        count: 0,
        data: []
      });
    }

    return res.json({
      success: true,
      message: "Daily slots fetched",
      date,
      weekNumber: slots[0].weeklySlot.weekNumber,
      year: slots[0].weeklySlot.year,
      count: slots.length,
      data: slots
    });

  } catch (err) {
    console.error("Get Daily Slots Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


exports.bookSlot = async (req, res) => {
  try {
    const riderId = req.rider.id;
    const { date, slotIds } = req.body;

    if (!date || !Array.isArray(slotIds) || slotIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "date and slotIds[] are required"
      });
    }

    const rider = await prisma.rider.findUnique({
      where: { id: riderId }
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }

    if (!rider.isFullyRegistered) {
      return res.status(403).json({
        success: false,
        message: "Complete onboarding before booking slots"
      });
    }

    // Get rider location (city + pincode)
    const riderLocation = await prisma.riderLocation.findUnique({
      where: { riderId }
    });
    // console.log(riderLocation)

    if (!riderLocation || !riderLocation.city || !riderLocation.pincode) {
      return res.status(400).json({
        success: false,
        message: "Rider location not set"
      });
    }

    // filter by city + pincode
    const slots = await prisma.slot.findMany({
      where: {
        slotId: { in: slotIds },
        date: date,
        status: "ACTIVE",
        weeklySlot: {
          city: {
            name: riderLocation.city
          },
          pincode: {
            code: riderLocation.pincode
          },
          isDeleted: false
        }
      },
      include: {
        weeklySlot: true
      }
    });

    // console.log(slots)

    if (slots.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No slots found for this date"
      });
    }

    const validSlots = [];
    const failed = [];

    for (const slotId of slotIds) {
      const slot = slots.find(s => s.slotId === slotId);

      if (!slot) {
        failed.push({ slotId, reason: "Slot not found for your location" }); 
        continue;
      }

      if (slot.bookedRiders >= slot.maxRiders) {
        failed.push({ slotId, reason: "Slot is full" });
        continue;
      }

      const alreadyBooked = await prisma.slotBooking.findUnique({
        where: {
          riderId_date_slotId: {
            riderId,
            date,
            slotId: slot.slotId
          }
        }
      });

      if (alreadyBooked?.status === "BOOKED") {
        failed.push({ slotId, reason: "Already booked" });
        continue;
      }

      validSlots.push(slot);
    }

    if (validSlots.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid slots to book",
        failed
      });
    }

    const jsDate = new Date(date);
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    const dayOfWeek = days[jsDate.getUTCDay()];
    const dayNumber = jsDate.getUTCDay() === 0 ? 7 : jsDate.getUTCDay();

    const createdBookings = [];

    await prisma.$transaction(async (tx) => {
      for (const slot of validSlots) {

        const slotKey =
          `${dayOfWeek}_${slot.startTime.replace(":", "")}_${slot.endTime.replace(":", "")}`;

        const booking = await tx.slotBooking.upsert({
          where: {
            riderId_date_slotId: {
              riderId,
              date,
              slotId: slot.slotId
            }
          },
          update: {
            status: "BOOKED",
            bookedFrom: "APP",
            cancellationReason: ""
          },
          create: {
            riderId,
            daySlotId: slot.weeklySlotId,
            slotId: slot.slotId,
            slotKey,
            date,
            dayOfWeek,
            dayNumber,
            weekNumber: slot.weeklySlot.weekNumber,
            year: slot.weeklySlot.year,

            // now storing pincode instead of zone
            city: slot.weeklySlot.city,
            zone: slot.weeklySlot.pincode, // reuse field

            startTime: slot.startTime,
            endTime: slot.endTime,
            slotStartAt: slot.slotStartAt,
            slotEndAt: slot.slotEndAt,
            totalMinutes: slot.durationMinutes,
            isPeakSlot: slot.isPeakSlot,
            incentiveText: slot.incentiveText,

            status: "BOOKED",
            bookedFrom: "APP"
          }
        });

        createdBookings.push(booking);

        await tx.slot.update({
          where: { slotId: slot.slotId },
          data: {
            bookedRiders: { increment: 1 }
          }
        });

        await tx.slotRider.upsert({
          where: {
            slotId_riderId: {
              slotId: slot.slotId,
              riderId
            }
          },
          update: {
            status: "BOOKED"
          },
          create: {
            slotId: slot.slotId,
            riderId,
            status: "BOOKED"
          }
        });
      }
    });

    if (rider.fcmToken) {
      await fcmService.sendToDevice({
        token: rider.fcmToken,
        title: "Slot Booked",
        body:
          createdBookings.length > 1
            ? `${createdBookings.length} slots booked successfully`
            : "Slot booked successfully",
        data: { type: "SLOT_BOOKED" }
      });
    }

    return res.json({
      success: true,
      message: "Slots booked successfully",
      bookedCount: createdBookings.length,
      failedCount: failed.length,
      booked: createdBookings,
      failed
    });

  } catch (err) {
    console.error("Slot Booking Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.cancelSlot = async (req, res) => {
  try {
    const riderId = req.rider.id;
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "bookingId is required",
      });
    }


    const booking = await prisma.slotBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }



    if (booking.riderId !== riderId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized cancel attempt",
      });
    }

    if (booking.status !== "BOOKED") {
      return res.status(400).json({
        success: false,
        message: "Slot already cancelled or completed",
      });
    }


    const result = await prisma.$transaction(async (tx) => {
      
      // Update SlotBooking
      const updatedBooking = await tx.slotBooking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED_BY_RIDER",
          cancellationReason: "Rider cancelled",
        },
      });

      await tx.slot.update({
        where: { slotId: booking.slotId },
        data: {
          bookedRiders: {
            decrement: 1,
          },
        },
      });

      await tx.slotRider.updateMany({
        where: {
          slotId: booking.slotId,
          riderId: riderId,
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      return updatedBooking;
    });


    const rider = await prisma.rider.findUnique({
      where: { id: riderId }, 
      select: { fcmToken: true },
    });

    if (rider?.fcmToken) {
      await fcmService.sendToDevice({
        token: rider.fcmToken,
        title: "Slot Cancelled",
        body: `Your slot ${booking.startTime}-${booking.endTime} on ${booking.date} was cancelled`,
        data: {
          type: "SLOT_CANCELLED",
          bookingId: booking.id,
          slotId: booking.slotId,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
        },
      });
    }

    return res.json({
      success: true,
      message: "Slot cancelled successfully",
      data: result,
    });

  } catch (err) {
    console.error("Cancel Slot Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


exports.getCurrentSlot = async (req, res) => {
  try {
    const riderId = req.rider.id;

    // Get rider with location
    const rider = await prisma.rider.findUnique({
      where: { id: riderId },
      include: { location: true }
    });

    if (!rider || !rider.location?.city ) {
      return res.status(400).json({
        success: false,
        message: "Rider location not configured"
      });
    }

    const { city, area } = rider.location;

    //  Resolve city
    const cityData = await prisma.city.findFirst({
      where: { name: city }
    });

    if (!cityData) {
      return res.status(404).json({
        success: false,
        message: "City not found"
      });
    }
    const pincodeData = await prisma.pincode.findFirst({
  where: {
    code: rider.location.pincode,
    cityId: cityData.id
  }
});

    if (!pincodeData) {
      return res.status(404).json({
        success: false,
        message: "Pincode not found for this area"
      });
    }

    //  Time calculation (IST)
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    const today = now.toISOString().split("T")[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Fetch slots (FIXED QUERY)
    const slots = await prisma.slot.findMany({
      where: {
        date: today,
        status: "ACTIVE",
        weeklySlot: {
          is: {
            city: {
              id: cityData.id
            },
            pincode: {
              id: pincodeData.id
            }
          }
        }
      },
      include: { weeklySlot: true },
      orderBy: { slotStartAt: "asc" }
    });

    if (!slots.length) {
      return res.json({
        success: true,
        message: "No slots created for today",
        data: null
      });
    }

    // Find current / next slot
    let currentSlot = null;
    let nextSlot = null;

    for (const slot of slots) {
      const [sh, sm] = slot.startTime.split(":").map(Number);
      const [eh, em] = slot.endTime.split(":").map(Number);

      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;

      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        if (slot.bookedRiders < slot.maxRiders) {
          currentSlot = slot;
          break;
        }
      }

      if (!nextSlot && startMinutes > currentMinutes) {
        if (slot.bookedRiders < slot.maxRiders) {
          nextSlot = slot;
        }
      }
    }

    const selectedSlot = currentSlot || nextSlot;

    if (!selectedSlot) {
      return res.json({
        success: true,
        message: "No available slots for today",
        data: null
      });
    }

    // Delay calculation
    let delayMinutes = 0;

    if (currentSlot) {
      const [sh, sm] = selectedSlot.startTime.split(":").map(Number);
      const slotStartMinutes = sh * 60 + sm;
      delayMinutes = Math.max(0, currentMinutes - slotStartMinutes);
    }

    // Check booking
    const booking = await prisma.slotBooking.findUnique({
      where: {
        riderId_date_slotId: {
          riderId,
          date: today,
          slotId: selectedSlot.slotId
        }
      }
    });

    // Final response
    return res.json({
      success: true,
      message: currentSlot
        ? "Current slot available"
        : "Current slot full, showing next slot",
      date: today,
      data: {
        daySlotId: selectedSlot.weeklySlotId,
        slot: {
          slotId: selectedSlot.slotId,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          durationInHours: selectedSlot.durationMinutes / 60,
          bookedRiders: selectedSlot.bookedRiders,
          maxRiders: selectedSlot.maxRiders,
          isPeakSlot: selectedSlot.isPeakSlot,
          status: selectedSlot.status
        },
        isBooked: booking?.status === "BOOKED",
        delayMinutes: currentSlot ? delayMinutes : 0
      }
    });

  } catch (err) {
    console.error("Current Slot Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};

exports.getSlotHistory = async (req, res) => {
  try {
    const riderId = req.rider.id;
    let { weekNumber, year } = req.query;

    if (!weekNumber) {
      return res.status(400).json({
        success: false,
        message: "weekNumber is required"
      });
    }

    const currentYear = new Date().getFullYear();
    year = Number(year) || currentYear;
    weekNumber = Number(weekNumber);

    const bookings = await prisma.slotBooking.findMany({
      where: { riderId, weekNumber, year },
      orderBy: [{ date: "asc" }, { startTime: "asc" }]
    });

    const now = new Date();

    // GET ALL ORDERS FOR THESE BOOKINGS
    const bookingIds = bookings.map(b => b.id);

    if (!bookingIds.length) {
      return res.json({
        success: true,
        message: "No slots found",
        weekNumber,
        year,
        summary: {
          totalSlots: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
          booked: 0
        },
        days: []
      });
    }

    const orders = await prisma.OrderSlotInfo.findMany({
      where: {
        slotBookingId: { in: bookingIds }
      },
      select: {
        slotBookingId: true,
        Order: {
          select: {
            orderStatus: true
          }
        }
      }
    });
    console.log("Orders : " ,orders)

    //MAP bookingId -> completedOrdersCount
    const orderMap = {};

    orders.forEach(o => {
      const bookingId = o.slotBookingId;
      if (!orderMap[bookingId]) orderMap[bookingId] = 0;

      if (o.Order?.orderStatus === "DELIVERED") {
        console.log("--increse--")
        orderMap[bookingId]++;
      }
    });

    // DERIVE STATUS
    const enrichedBookings = bookings.map(b => {
      let derivedStatus = b.status;

      const slotEnd = new Date(b.slotEndAt);
      const completedOrders = orderMap[b.id] || 0;

      if (b.status === "CANCELLED_BY_RIDER") {
        derivedStatus = "CANCELLED";
      } else if (slotEnd > now) {
        derivedStatus = "BOOKED";
      } else {
        if (completedOrders >= 1) {
          derivedStatus = "COMPLETED";
        } else {
          derivedStatus = "MISSED";
        }
      }

      return {
        ...b,
        completedOrders,
        derivedStatus
      };
    });


    const summary = {
      totalSlots: enrichedBookings.length,

      completed: enrichedBookings.filter(b => b.derivedStatus === "COMPLETED").length,

      cancelled: enrichedBookings.filter(b => b.derivedStatus === "CANCELLED").length,

      noShow: enrichedBookings.filter(b => b.derivedStatus === "MISSED").length,

      booked: enrichedBookings.filter(b => b.derivedStatus === "BOOKED").length
    };

    function getISOWeekStart(week, year) {
      const jan4 = new Date(year, 0, 4);
      const day = jan4.getDay() || 7;

      const monday = new Date(jan4);
      monday.setDate(jan4.getDate() - (day - 1));
      monday.setHours(0, 0, 0, 0);

      const target = new Date(monday);
      target.setDate(monday.getDate() + (week - 1) * 7);

      return target;
    }

    const weekStart = getISOWeekStart(weekNumber, year);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(d.toISOString().slice(0, 10));
    }

    const daysMap = {};

    weekDates.forEach(date => {
      daysMap[date] = {
        date,
        totalSlots: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        booked: 0,
        slots: []
      };
    });

    enrichedBookings.forEach(b => {
      const dateKey = b.date;
      if (!daysMap[dateKey]) return;

      daysMap[dateKey].slots.push(b);
      daysMap[dateKey].totalSlots++;

      if (b.derivedStatus === "COMPLETED") daysMap[dateKey].completed++;
      if (b.derivedStatus === "CANCELLED") daysMap[dateKey].cancelled++;
      if (b.derivedStatus === "MISSED") daysMap[dateKey].noShow++;
      if (b.derivedStatus === "BOOKED") daysMap[dateKey].booked++;
    });

    return res.json({
      success: true,
      message: "Weekly slot history fetched",
      weekNumber,
      year,
      summary,
      days: Object.values(daysMap)
    });

  } catch (err) {
    console.error("Slot History Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


exports.getCurrentAndNextSlot = async (req, res) => {
  try {
    const riderId = req.rider.id;

    const now = new Date();

 
    let todaySlots = await prisma.slotBooking.findMany({
      where: {
        riderId,
        status: "BOOKED",
        slotEndAt: { gte: now }
      },
      include: { slot: true },
      orderBy: { slotStartAt: "asc" }
    });

    
    const allSlots = todaySlots;

    if (allSlots.length === 0) {
      return res.json({
        success: true,
        message: "No booked slots found",
        currentSlot: null,
        nextSlot: null
      });
    }

    let currentSlot = null;
    let nextSlot = null;

    for (let slot of allSlots) {
      const slotStart = slot.slotStartAt;
      const slotEnd = slot.slotEndAt;

      if (now >= slotStart && now <= slotEnd) {
        currentSlot = slot;
      }

      if (slotStart > now && !nextSlot) {
        nextSlot = slot;
      }
    }

    return res.json({
      success: true,
      message: "Current & next slot fetched",
      currentSlot,
      nextSlot
    });

  } catch (err) {
    console.error("Current/Next Slot Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



exports.getSlotCapacity = async (req, res) => {
  try {
    const { slotId } = req.params;

    if (!slotId) {
      return res.status(400).json({
        success: false,
        message: "slotId is required"
      });
    }

    const slot = await prisma.slot.findUnique({
      where: {
        slotId: slotId   
      },
      include: {
        riderBookings: {
          where: {
            status: "BOOKED"
          }
        }
      }
    });

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Slot not found"
      });
    }

    const bookedRidersCount = slot.riderBookings.length;
    const availableRiders = Math.max(
      0,
      slot.maxRiders - bookedRidersCount
    );

    return res.status(200).json({
      success: true,
      message: "Slot capacity fetched successfully",
      data: {
        slotId: slot.slotId,   
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxRiders: slot.maxRiders,
        bookedRidersCount,
        availableRiders,
        isFull: availableRiders === 0,
        canBook: availableRiders > 0
      }
    });

  } catch (error) {
    console.error("Slot Capacity Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};


